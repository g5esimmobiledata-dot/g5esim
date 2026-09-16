<?php

namespace App\Services\Providers;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class AiraloClient implements ProviderClientInterface
{
    public function slug(): string
    {
        return 'airalo';
    }

    public function listPackages(array $filters = []): array
    {
        return $this->http()->get('/packages', $filters)->throw()->json();
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
        return $this->http()->get("/sims/{$iccid}/usage")->throw()->json();
    }

    private function http(): PendingRequest
    {
        return Http::baseUrl((string) config('esim.providers.airalo.base_url'))
            ->acceptJson()
            ->asJson()
            ->withToken($this->token());
    }

    private function token(): string
    {
        return Cache::remember('airalo_access_token', now()->addMinutes(50), function (): string {
            $response = Http::baseUrl((string) config('esim.providers.airalo.base_url'))
                ->asJson()
                ->post('/token', [
                    'client_id' => (string) config('esim.providers.airalo.key'),
                    'client_secret' => (string) config('esim.providers.airalo.secret'),
                    'grant_type' => 'client_credentials',
                ])
                ->throw()
                ->json();

            return (string) data_get($response, 'data.access_token');
        });
    }
}
