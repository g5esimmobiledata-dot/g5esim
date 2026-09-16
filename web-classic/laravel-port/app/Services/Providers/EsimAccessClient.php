<?php

namespace App\Services\Providers;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class EsimAccessClient implements ProviderClientInterface
{
    public function slug(): string
    {
        return 'esim-access';
    }

    public function listPackages(array $filters = []): array
    {
        return $this->request('POST', '/api/v1/open/package/list', $filters ?: ['type' => 'BASE']);
    }

    public function createOrder(array $payload): array
    {
        return $this->request('POST', '/api/v1/open/esim/order', $payload);
    }

    public function getOrder(string $providerOrderId): array
    {
        return $this->request('POST', '/api/v1/open/esim/query', [
            'orderNo' => $providerOrderId,
            'pager' => [
                'pageNum' => 1,
                'pageSize' => 10,
            ],
        ]);
    }

    public function getUsage(string $iccid): array
    {
        return $this->request('POST', '/api/v1/open/esim/usage/query', [
            'iccid' => $iccid,
        ]);
    }

    private function request(string $method, string $endpoint, array $body = []): array
    {
        $accessCode = (string) config('esim.providers.esim_access.client_id');
        $secret = (string) config('esim.providers.esim_access.client_secret');
        $timestamp = (string) round(microtime(true) * 1000);
        $requestId = Str::replace('-', '', (string) Str::uuid());
        $bodyString = $body === [] ? '' : (string) json_encode($body, JSON_UNESCAPED_SLASHES);
        $signature = hash_hmac('sha256', $timestamp.$requestId.$accessCode.$bodyString, $secret);

        $pending = Http::baseUrl((string) config('esim.providers.esim_access.base_url'))
            ->acceptJson()
            ->withHeaders([
                'Content-Type' => 'application/json',
                'RT-AccessCode' => $accessCode,
                'RT-RequestID' => $requestId,
                'RT-Timestamp' => $timestamp,
                'RT-Signature' => strtolower($signature),
            ]);

        $response = strtoupper($method) === 'GET'
            ? $pending->get($endpoint, $body)
            : $pending->withBody($bodyString, 'application/json')->send($method, $endpoint);

        return $response->throw()->json();
    }
}
