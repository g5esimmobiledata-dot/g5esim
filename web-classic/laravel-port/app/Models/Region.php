<?php

namespace App\Models;

use App\Casts\PostgresTextArray;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Region extends BaseModel
{
    protected $table = 'regions';

    protected $casts = [
        'countries' => PostgresTextArray::class,
        'active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function packages(): HasMany
    {
        return $this->hasMany(UnifiedPackage::class, 'region_id');
    }
}
