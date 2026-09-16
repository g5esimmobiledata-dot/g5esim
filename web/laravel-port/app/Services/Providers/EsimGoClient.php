<?php

namespace App\Services\Providers;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

class EsimGoClient implements ProviderClientInterface
{
    public function slug(): string
    {
        return 'esim-go';
    }

    public function listPackages(array $filters = []): array
    {
        return $this->http()->get('/catalogue', $filters)->throw()->json();
    }

    public function createOrder(array $payload): array
    {
        return $this->http()->post('/orders', $payload)->throw()->json();
    }

    public function getOrder(string $providerOrderId): array
    {
        return $this->http()->get("/orders/{$providerOrderId}")->throw()->json();
    }

    public function getUsage(string $iccid): array
    {
        return $this->http()->get("/esims/{$iccid}/usage")->throw()->json();
    }

    private function http(): PendingRequest
    {
        return Http::baseUrl((string) config('esim.providers.esim_go.base_url'))
            ->acceptJson()
            ->asJson()
            ->withHeaders([
                'X-API-Key' => (string) config('esim.providers.esim_go.api_key'),
            ]);
    }
}
