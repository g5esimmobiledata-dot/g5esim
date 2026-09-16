<?php

namespace App\Services\Providers;

interface ProviderClientInterface
{
    public function slug(): string;

    public function listPackages(array $filters = []): array;

    public function createOrder(array $payload): array;

    public function getOrder(string $providerOrderId): array;

    public function getUsage(string $iccid): array;
}
