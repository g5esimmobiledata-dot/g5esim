<?php

namespace App\Services\Providers;

use InvalidArgumentException;

class ProviderFactory
{
    /** @var array<string, ProviderClientInterface> */
    private array $clients;

    public function __construct(
        AiraloClient $airalo,
        EsimAccessClient $esimAccess,
        EsimGoClient $esimGo,
    ) {
        $this->clients = [
            $airalo->slug() => $airalo,
            $esimAccess->slug() => $esimAccess,
            $esimGo->slug() => $esimGo,
        ];
    }

    public function client(string $slug): ProviderClientInterface
    {
        return $this->clients[$slug] ?? throw new InvalidArgumentException("Unsupported eSIM provider [{$slug}].");
    }

    /** @return array<string, ProviderClientInterface> */
    public function all(): array
    {
        return $this->clients;
    }
}
