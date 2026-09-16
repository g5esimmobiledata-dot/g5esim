<?php

namespace App\Console\Commands;

use App\Models\Provider;
use App\Services\Providers\ProviderFactory;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SyncProvidersCommand extends Command
{
    protected $signature = 'esim:sync-providers {--provider= : Provider slug to sync}';

    protected $description = 'Fetch provider catalogues. This command is the Laravel replacement point for the Node sync schedulers.';

    public function handle(ProviderFactory $factory): int
    {
        $requestedProvider = $this->option('provider');
        $providers = Provider::query()
            ->where('enabled', true)
            ->when($requestedProvider, fn ($query) => $query->where('slug', $requestedProvider))
            ->get();

        foreach ($providers as $provider) {
            try {
                $client = $factory->client($provider->slug);
                $catalogue = $client->listPackages();

                $provider->update(['last_sync_at' => now()]);

                Log::info('Provider catalogue fetched by Laravel port', [
                    'provider' => $provider->slug,
                    'items' => is_countable($catalogue) ? count($catalogue) : null,
                ]);

                $this->info("Fetched catalogue for {$provider->slug}.");
            } catch (\Throwable $exception) {
                Log::error('Provider sync failed in Laravel port', [
                    'provider' => $provider->slug,
                    'error' => $exception->getMessage(),
                ]);

                $this->error("Failed {$provider->slug}: {$exception->getMessage()}");
            }
        }

        return self::SUCCESS;
    }
}
