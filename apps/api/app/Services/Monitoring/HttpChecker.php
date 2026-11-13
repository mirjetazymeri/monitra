<?php

namespace App\Services\Monitoring;

use App\Enums\CheckErrorCategory;
use App\Models\Endpoint;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Performs a single, hardened HTTP GET against an endpoint.
 */
class HttpChecker
{
    /** cURL error numbers grouped into sanitised categories. */
    private const CURL_TIMEOUT = [28];

    private const CURL_DNS = [6];

    private const CURL_CONNECT = [7, 52, 55, 56];

    private const CURL_TLS = [35, 51, 53, 54, 58, 59, 60, 64, 66, 77, 80, 82, 83, 90, 91];

    private const CURL_TOO_LARGE = [63];

    public function __construct(private readonly DestinationGuard $guard) {}

    public function check(Endpoint $endpoint): CheckOutcome
    {
        $resolutionStarted = hrtime(true);

        try {
            $destination = $this->guard->resolve($endpoint->url);
        } catch (BlockedDestinationException $e) {
            // A DNS failure records how long the lookup took, so slow resolvers are visible.
            return $e->dnsFailure
                ? CheckOutcome::failure(CheckErrorCategory::DnsFailure, $this->elapsedMs($resolutionStarted))
                : CheckOutcome::failure(CheckErrorCategory::BlockedDestination);
        }

        $tooLarge = false;
        $started = hrtime(true);

        try {
            $response = Http::withOptions($this->transportOptions($destination, $tooLarge))
                ->withHeaders([
                    'User-Agent' => config('monitraz.user_agent'),
                    'Accept' => '*/*',
                ])
                ->connectTimeout(config('monitraz.connect_timeout'))
                ->timeout(config('monitraz.request_timeout'))
                ->withoutRedirecting()
                ->get($destination->url);
        } catch (Throwable $e) {
            $elapsed = $this->elapsedMs($started);

            if ($tooLarge) {
                return CheckOutcome::failure(CheckErrorCategory::ResponseTooLarge, $elapsed);
            }

            return CheckOutcome::failure($this->categorise($e), $elapsed);
        }

        // Defence in depth: the socket must have connected to the IP we validated.
        $connectedIp = (string) ($response->handlerStats()['primary_ip'] ?? '');
        if ($connectedIp !== '' && ! $this->sameIp($connectedIp, $destination->ip)) {
            return CheckOutcome::failure(CheckErrorCategory::BlockedDestination);
        }

        $status = $response->status();
        $elapsed = $this->responseTimeMs($response, $started);

        if ($status !== $endpoint->expected_status) {
            return CheckOutcome::failure(CheckErrorCategory::StatusMismatch, $elapsed, $status);
        }

        return new CheckOutcome(true, $status, $elapsed, null);
    }

    /**
     * Guzzle/cURL transport options. Public so the pinning behaviour is unit-testable.
     *
     * @return array<string, mixed>
     */
    public function transportOptions(ResolvedDestination $destination, bool &$tooLarge): array
    {
        $maxBytes = (int) config('monitraz.max_response_bytes');

        $options = [
            'allow_redirects' => false,
            'protocols' => ['http', 'https'],
            // Ignore HTTP(S)_PROXY environment variables: a proxy would bypass IP pinning.
            'proxy' => ['http' => null, 'https' => null],
            'verify' => true,
            'http_errors' => false,
            'idn_conversion' => false,
            // Abort as soon as the body exceeds the size limit (returning true aborts).
            'progress' => function (int $downloadTotal, int $downloaded) use ($maxBytes, &$tooLarge): bool {
                if ($downloadTotal > $maxBytes || $downloaded > $maxBytes) {
                    $tooLarge = true;
                }

                return $tooLarge;
            },
        ];

        if (! $destination->hostIsIp) {
            $address = str_contains($destination->ip, ':') ? '['.$destination->ip.']' : $destination->ip;
            // Pin the hostname to the validated address so cURL never performs its own DNS lookup.
            $options['curl'] = [CURLOPT_RESOLVE => ["{$destination->host}:{$destination->port}:{$address}"]];
        }

        return $options;
    }

    private function categorise(Throwable $e): CheckErrorCategory
    {
        $errno = $this->curlErrno($e);

        return match (true) {
            in_array($errno, self::CURL_TIMEOUT, true) => CheckErrorCategory::Timeout,
            in_array($errno, self::CURL_DNS, true) => CheckErrorCategory::DnsFailure,
            in_array($errno, self::CURL_CONNECT, true) => CheckErrorCategory::ConnectionFailed,
            in_array($errno, self::CURL_TLS, true) => CheckErrorCategory::TlsError,
            in_array($errno, self::CURL_TOO_LARGE, true) => CheckErrorCategory::ResponseTooLarge,
            default => CheckErrorCategory::UnexpectedError,
        };
    }

    private function curlErrno(Throwable $e): ?int
    {
        for ($current = $e; $current !== null; $current = $current->getPrevious()) {
            if (method_exists($current, 'getHandlerContext')) {
                $errno = $current->getHandlerContext()['errno'] ?? null;
                if (is_int($errno)) {
                    return $errno;
                }
            }

            if (preg_match('/cURL error (\d+)/', $current->getMessage(), $m)) {
                return (int) $m[1];
            }
        }

        return null;
    }

    private function responseTimeMs(Response $response, int $started): int
    {
        $total = $response->handlerStats()['total_time'] ?? null;

        return is_numeric($total) && $total > 0
            ? (int) round(((float) $total) * 1000)
            : $this->elapsedMs($started);
    }

    private function elapsedMs(int $started): int
    {
        return (int) round((hrtime(true) - $started) / 1_000_000);
    }

    private function sameIp(string $a, string $b): bool
    {
        return @inet_pton(trim($a, '[]')) === @inet_pton(trim($b, '[]'));
    }
}
