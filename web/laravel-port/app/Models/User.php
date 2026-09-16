<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

class User extends BaseModel
{
    protected $table = 'users';

    protected $casts = [
        'is_from_google' => 'boolean',
        'notify_low_data' => 'boolean',
        'notify_expiring' => 'boolean',
        'reseller_store_active' => 'boolean',
        'is_blocked' => 'boolean',
        'is_deleted' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'password_set_at' => 'datetime',
        'last_password_login_at' => 'datetime',
    ];

    protected $hidden = [
        'hashed_password',
    ];

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class, 'user_id');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class, 'user_id');
    }
}
