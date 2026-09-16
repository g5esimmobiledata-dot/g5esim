<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

class Provider extends BaseModel
{
    protected $table = 'providers';

    protected $casts = [
        'enabled' => 'boolean',
        'is_preferred' => 'boolean',
        'last_sync_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function packages(): HasMany
    {
        return $this->hasMany(UnifiedPackage::class, 'provider_id');
    }
}
