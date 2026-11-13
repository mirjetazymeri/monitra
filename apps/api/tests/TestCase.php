<?php

namespace Tests;

use App\Services\Monitoring\DnsResolver;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Http;
use Tests\Support\FakeDnsResolver;

abstract class TestCase extends BaseTestCase
{
    protected FakeDnsResolver $dns;

    protected function setUp(): void
    {
        parent::setUp();

        // Tests never touch real DNS or the network.
        $this->dns = new FakeDnsResolver;
        $this->app->instance(DnsResolver::class, $this->dns);
        Http::preventStrayRequests();
    }
}
