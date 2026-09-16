<?php

namespace App\Http\Controllers\Api;

use App\Support\ApiResponse;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class HealthController extends Controller
{
    public function __invoke()
    {
        DB::select('select 1');

        return ApiResponse::success('Laravel API healthy', [
            'database' => 'ok',
            'service' => 'ayasim-laravel',
        ]);
    }
}
