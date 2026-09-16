<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\Order;
use App\Models\Provider;
use App\Models\UnifiedPackage;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function __invoke()
    {
        return ApiResponse::success('Dashboard stats fetched successfully', [
            'customers' => User::query()->where('role', 'customer')->count(),
            'resellers' => User::query()->where('role', 'reseller')->count(),
            'orders' => Order::query()->count(),
            'completedOrders' => Order::query()->where('status', 'completed')->count(),
            'activePackages' => UnifiedPackage::query()->where('is_enabled', true)->count(),
            'providers' => Provider::query()->count(),
            'revenueUsd' => (string) (Order::query()
                ->whereIn('status', ['completed', 'paid'])
                ->select(DB::raw('COALESCE(SUM(CAST(price AS DECIMAL)), 0) as total'))
                ->value('total') ?? '0'),
        ]);
    }
}
