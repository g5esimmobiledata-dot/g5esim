<?php

return [
    'jwt' => [
        'secret' => env('JWT_SECRET', env('APP_KEY')),
        'ttl_minutes' => (int) env('JWT_TTL_MINUTES', 43200),
    ],

    'providers' => [
        'airalo' => [
            'base_url' => env('AIRALO_BASE_URL', 'https://partners-api.airalo.com/v2'),
            'key' => env('AIRALO_API_KEY'),
            'secret' => env('AIRALO_API_SECRET'),
            'environment' => env('AIRALO_ENV', 'production'),
        ],
        'esim_access' => [
            'base_url' => env('ESIM_ACCESS_BASE_URL', 'https://api.esimaccess.com'),
            'client_id' => env('ESIM_ACCESS_CLIENT_ID'),
            'client_secret' => env('ESIM_ACCESS_CLIENT_SECRET'),
        ],
        'esim_go' => [
            'base_url' => env('ESIM_GO_BASE_URL', 'https://api.esim-go.com/v2.5'),
            'api_key' => env('ESIM_GO_API_KEY'),
        ],
        'maya' => [
            'base_url' => env('MAYA_BASE_URL', 'https://api.maya.net'),
            'api_key' => env('MAYA_API_KEY'),
            'api_secret' => env('MAYA_API_SECRET'),
        ],
    ],
];
