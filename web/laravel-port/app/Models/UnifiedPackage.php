<?php

namespace App\Models;

use App\Casts\PostgresTextArray;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UnifiedPackage extends BaseModel
{
    protected $table = 'unified_packages';

    protected $casts = [
        'coverage' => PostgresTextArray::class,
        'is_unlimited' => 'boolean',
        'is_enabled' => 'boolean',
        'is_best_price' => 'boolean',
        'manual_override' => 'boolean',
        'is_popular' => 'boolean',
        'is_trending' => 'boolean',
        'is_recommended' => 'boolean',
        'is_best_value' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function destination(): BelongsTo
    {
        return $this->belongsTo(Destination::class, 'destination_id');
    }

    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class, 'region_id');
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(Provider::class, 'provider_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class, 'package_id');
    }
}
