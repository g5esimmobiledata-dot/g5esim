<?php

namespace App\Http\Controllers\Api;

use App\Models\CurrencyRate;
use App\Models\Destination;
use App\Models\Region;
use App\Models\Review;
use App\Models\UnifiedPackage;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class CatalogController extends Controller
{
    public function destinations()
    {
        $destinations = Destination::query()
            ->where('active', true)
            ->orderBy('name')
            ->get();

        return ApiResponse::success('Destinations fetched successfully', $destinations);
    }

    public function destinationsWithPricing(Request $request)
    {
        $currency = strtoupper((string) $request->query('currency', 'USD'));
        $rate = $this->currencyRate($currency);

        $destinations = Destination::query()
            ->select('destinations.*')
            ->selectSub(function ($query) {
                $query->from('unified_packages')
                    ->selectRaw('MIN(CAST(retail_price AS DECIMAL))')
                    ->whereColumn('unified_packages.destination_id', 'destinations.id')
                    ->where('is_enabled', true);
            }, 'min_price')
            ->where('active', true)
            ->orderBy('name')
            ->get()
            ->map(function (Destination $destination) use ($currency, $rate) {
                $data = $destination->toArray();
                $minPrice = (float) ($destination->getAttribute('min_price') ?? 0);
                $data['min_price'] = number_format($minPrice * $rate, 2, '.', '');
                $data['currency'] = $currency;

                return $data;
            });

        return ApiResponse::success('Destinations with pricing fetched successfully', $destinations);
    }

    public function destinationBySlug(string $slug)
    {
        $destination = Destination::query()->where('slug', $slug)->first();

        if (! $destination) {
            return ApiResponse::error('Destination not found', 404, 'NOT_FOUND');
        }

        return ApiResponse::success('Destination fetched successfully', $destination);
    }

    public function regions()
    {
        $regions = Region::query()
            ->where('active', true)
            ->orderBy('name')
            ->get();

        return ApiResponse::success('Regions fetched successfully', $regions);
    }

    public function regionsWithPricing(Request $request)
    {
        $currency = strtoupper((string) $request->query('currency', 'USD'));
        $rate = $this->currencyRate($currency);

        $regions = Region::query()
            ->select('regions.*')
            ->selectSub(function ($query) {
                $query->from('unified_packages')
                    ->selectRaw('MIN(CAST(retail_price AS DECIMAL))')
                    ->whereColumn('unified_packages.region_id', 'regions.id')
                    ->where('is_enabled', true);
            }, 'min_price')
            ->where('active', true)
            ->orderBy('name')
            ->get()
            ->map(function (Region $region) use ($currency, $rate) {
                $data = $region->toArray();
                $minPrice = (float) ($region->getAttribute('min_price') ?? 0);
                $data['min_price'] = number_format($minPrice * $rate, 2, '.', '');
                $data['currency'] = $currency;

                return $data;
            });

        return ApiResponse::success('Regions with pricing fetched successfully', $regions);
    }

    public function regionBySlug(string $slug)
    {
        $region = Region::query()->where('slug', $slug)->first();

        if (! $region) {
            return ApiResponse::error('Region not found', 404, 'NOT_FOUND');
        }

        return ApiResponse::success('Region fetched successfully', $region);
    }

    public function packages(Request $request)
    {
        $query = UnifiedPackage::query()
            ->with(['destination', 'region', 'provider'])
            ->where('is_enabled', true);

        if ($destination = $request->query('destinationId')) {
            $query->where('destination_id', $destination);
        }

        if ($region = $request->query('regionId')) {
            $query->where('region_id', $region);
        }

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        $packages = $query
            ->orderByDesc('is_best_price')
            ->orderByRaw('CAST(retail_price AS DECIMAL) ASC')
            ->limit((int) $request->query('limit', 100))
            ->get();

        return ApiResponse::success('Packages fetched successfully', $packages);
    }

    public function featuredPackages()
    {
        $packages = UnifiedPackage::query()
            ->with(['destination', 'region'])
            ->where('is_enabled', true)
            ->where(function ($query) {
                $query->where('is_popular', true)
                    ->orWhere('is_recommended', true)
                    ->orWhere('is_best_value', true)
                    ->orWhere('is_best_price', true);
            })
            ->orderByDesc('sales_count')
            ->limit(12)
            ->get();

        return ApiResponse::success('Packages retrieved successfully', $packages);
    }

    public function completePackages()
    {
        $packages = UnifiedPackage::query()
            ->with('destination')
            ->where('is_enabled', true)
            ->where('voice_minutes', '>', 0)
            ->where('sms_count', '>', 0)
            ->where('data_mb', '>', 0)
            ->orderByDesc('sales_count')
            ->limit(8)
            ->get();

        return ApiResponse::success('Complete packages fetched successfully', $packages);
    }

    public function globalPackages()
    {
        $globalRegion = Region::query()
            ->whereIn(DB::raw('LOWER(slug)'), ['global', 'world'])
            ->orWhereRaw('LOWER(name) = ?', ['global'])
            ->first();

        $query = UnifiedPackage::query()
            ->where('is_enabled', true)
            ->orderByDesc('sales_count')
            ->orderByRaw('CAST(retail_price AS DECIMAL) ASC')
            ->limit(12);

        if ($globalRegion) {
            $query->where('region_id', $globalRegion->id);
        } else {
            $query->whereRaw('LOWER(type) = ?', ['global']);
        }

        return ApiResponse::success('Global packages fetched successfully', $query->get());
    }

    public function packageStats()
    {
        return ApiResponse::success('Package stats fetched successfully', [
            'totalPackages' => UnifiedPackage::query()->where('is_enabled', true)->count(),
            'totalDestinations' => Destination::query()->where('active', true)->count(),
        ]);
    }

    public function packageBySlug(string $slug)
    {
        $package = UnifiedPackage::query()
            ->with(['destination', 'region', 'provider'])
            ->where('slug', $slug)
            ->first();

        if (! $package) {
            return ApiResponse::error('Package not found', 404, 'NOT_FOUND');
        }

        return ApiResponse::success('Package fetched successfully', $package);
    }

    public function packageById(string $id)
    {
        $package = UnifiedPackage::query()
            ->with(['destination', 'region', 'provider'])
            ->find($id);

        if (! $package) {
            return ApiResponse::error('Package not found', 404, 'NOT_FOUND');
        }

        return ApiResponse::success('Package fetched successfully', $package);
    }

    public function packageReviews(Request $request, string $packageId)
    {
        $page = max(1, (int) $request->query('page', 1));
        $limit = 20;

        $query = Review::query()
            ->with('user:id,name,email')
            ->where('package_id', $packageId)
            ->where('is_approved', true);

        if ($rating = $request->query('rating')) {
            $query->where('rating', (int) $rating);
        }

        $total = (clone $query)->count();
        $reviews = $query
            ->latest('created_at')
            ->forPage($page, $limit)
            ->get();

        return ApiResponse::paginated('Reviews fetched successfully', [
            'reviews' => $reviews,
        ], [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
        ]);
    }

    public function packageReviewStats(string $packageId)
    {
        $stats = Review::query()
            ->select('rating', DB::raw('COUNT(*) as count'))
            ->where('package_id', $packageId)
            ->where('is_approved', true)
            ->groupBy('rating')
            ->get();

        $total = (int) $stats->sum('count');
        $weighted = $stats->sum(fn ($row) => ((int) $row->rating) * ((int) $row->count));
        $distribution = [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0];

        foreach ($stats as $row) {
            $distribution[(int) $row->rating] = (int) $row->count;
        }

        return ApiResponse::success('Review stats fetched successfully', [
            'average' => $total > 0 ? round($weighted / $total, 1) : 0,
            'total' => $total,
            'distribution' => $distribution,
        ]);
    }

    private function currencyRate(string $currency): float
    {
        if ($currency === 'USD') {
            return 1.0;
        }

        return (float) (CurrencyRate::query()
            ->where('code', $currency)
            ->where('is_enabled', true)
            ->value('conversion_rate') ?? 1.0);
    }
}
