<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $directory = database_path('sql/drizzle');
        $files = glob($directory.'/*.sql') ?: [];
        sort($files, SORT_NATURAL);

        DB::unprepared('CREATE EXTENSION IF NOT EXISTS pgcrypto');

        foreach ($files as $file) {
            $sql = trim((string) file_get_contents($file));

            if ($sql === '') {
                continue;
            }

            DB::unprepared($this->cleanDrizzleSql($sql));
        }
    }

    public function down(): void
    {
        throw new RuntimeException('The imported Drizzle schema is not safely reversible. Restore from backup instead.');
    }

    private function cleanDrizzleSql(string $sql): string
    {
        return preg_replace('/--> statement-breakpoint\s*/', "\n", $sql) ?? $sql;
    }
};
