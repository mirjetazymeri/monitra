<?php

namespace App\Http\Requests;

use App\Rules\PublicHttpUrl;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Validation for creating (POST) and updating (PUT/PATCH) endpoints.
 * On PATCH every field is optional, so a single attribute such as
 * `is_enabled` can be toggled.
 */
class EndpointRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Ownership of an existing endpoint is enforced by EndpointPolicy in the controller.
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('url'))) {
            $this->merge(['url' => trim($this->input('url'))]);
        }
        if (is_string($this->input('name'))) {
            $this->merge(['name' => trim($this->input('name'))]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $required = $this->isMethod('PATCH') ? 'sometimes' : 'required';

        return [
            'name' => [$required, 'string', 'min:2', 'max:120'],
            'url' => ['bail', $required, 'string', 'max:2048', 'url:http,https', new PublicHttpUrl],
            'expected_status' => [$required, 'integer', 'between:100,599'],
            'check_interval' => [$required, 'integer', Rule::in(config('monitra.intervals'))],
            'is_enabled' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Enforce the per-account endpoint quota on creation. Demo endpoints are
     * excluded because they never generate outbound traffic.
     *
     * @return array<int, \Closure>
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if (! $this->isMethod('POST')) {
                    return;
                }

                $limit = (int) config('monitra.max_endpoints_per_user');

                if ($this->user()->endpoints()->where('is_demo', false)->count() >= $limit) {
                    $validator->errors()->add('name', "You have reached the limit of {$limit} monitored endpoints.");
                }
            },
        ];
    }

    public function attributes(): array
    {
        return [
            'url' => 'URL',
            'expected_status' => 'expected status code',
            'check_interval' => 'check interval',
        ];
    }
}
