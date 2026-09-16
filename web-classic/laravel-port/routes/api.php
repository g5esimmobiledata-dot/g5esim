<?php

use App\Http\Controllers\Api\Admin\AuthController as AdminAuthController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\HealthController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);

Route::prefix('auth')->group(function (): void {
    Route::post('/send-otp', [AuthController::class, 'sendOtp']);
    Route::post('/app/send-otp', [AuthController::class, 'sendOtp']);
    Route::post('/verify-otp', [AuthController::class, 'verifyOtp']);
    Route::post('/app/verify-otp', [AuthController::class, 'verifyOtp']);
    Route::post('/check-email', [AuthController::class, 'checkEmail']);
    Route::post('/login-password', [AuthController::class, 'loginPassword']);
    Route::post('/app/login-password', [AuthController::class, 'loginPassword']);
    Route::post('/app/set-password', [AuthController::class, 'appSetPassword']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::middleware('auth.token')->group(function (): void {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/set-password', [AuthController::class, 'setPassword']);
        Route::post('/change-password', [AuthController::class, 'changePassword']);
    });
});

Route::prefix('destinations')->group(function (): void {
    Route::get('/', [CatalogController::class, 'destinations']);
    Route::get('/with-pricing', [CatalogController::class, 'destinationsWithPricing']);
    Route::get('/slug/{slug}', [CatalogController::class, 'destinationBySlug']);
});

Route::prefix('regions')->group(function (): void {
    Route::get('/', [CatalogController::class, 'regions']);
    Route::get('/with-pricing', [CatalogController::class, 'regionsWithPricing']);
    Route::get('/slug/{slug}', [CatalogController::class, 'regionBySlug']);
});

Route::prefix('packages')->group(function (): void {
    Route::get('/', [CatalogController::class, 'packages']);
    Route::get('/featured', [CatalogController::class, 'featuredPackages']);
    Route::get('/complete', [CatalogController::class, 'completePackages']);
    Route::get('/global', [CatalogController::class, 'globalPackages']);
    Route::get('/stats', [CatalogController::class, 'packageStats']);
    Route::get('/slug/{slug}', [CatalogController::class, 'packageBySlug']);
    Route::get('/{id}/reviews', [CatalogController::class, 'packageReviews']);
    Route::get('/{id}/review-stats', [CatalogController::class, 'packageReviewStats']);
    Route::get('/{id}', [CatalogController::class, 'packageById']);
});

Route::prefix('unified-packages')->group(function (): void {
    Route::get('/', [CatalogController::class, 'packages']);
    Route::get('/global', [CatalogController::class, 'globalPackages']);
    Route::get('/slug/{slug}', [CatalogController::class, 'packageBySlug']);
    Route::get('/{id}', [CatalogController::class, 'packageById']);
});

Route::prefix('admin')->group(function (): void {
    Route::post('/auth/login', [AdminAuthController::class, 'login']);
    Route::post('/auth/logout', [AdminAuthController::class, 'logout']);

    Route::middleware('auth.admin')->group(function (): void {
        Route::get('/auth/me', [AdminAuthController::class, 'me']);
        Route::get('/dashboard', DashboardController::class);
    });
});
