<?php

return [
    'stripe' => [
        'secret' => env('STRIPE_SECRET_KEY'),
        'public' => env('STRIPE_PUBLIC_KEY'),
    ],
    'razorpay' => [
        'key_id' => env('RAZORPAY_KEY_ID'),
        'key_secret' => env('RAZORPAY_KEY_SECRET'),
    ],
];
