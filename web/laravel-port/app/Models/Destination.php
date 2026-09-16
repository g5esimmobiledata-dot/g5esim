<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

class Destination extends BaseModel
{
    protected $table = 'destinations';

    protected $casts = [
        'is_territory' => 'boolean',
        'active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function packages(): HasMany
    {
        return $this->hasMany(UnifiedPackage::class, 'destination_id');
    }
}
