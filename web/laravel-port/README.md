# AyaSIM Laravel Port

This directory is a Laravel/PHP port starter for the existing Node.js eSIM marketplace.

The original app is large, so this port is structured to migrate it safely instead of overwriting the working Node project. It already includes:

- Laravel app skeleton for PHP 8.2+
- PostgreSQL configuration
- A migration bridge that imports the existing Drizzle SQL files from `database/sql/drizzle`
- JWT auth compatible with Bearer tokens
- OTP, password login, password reset, current-user endpoints
- Public catalog endpoints for destinations, regions, packages, reviews, and stats
- Core Eloquent models mapped to the existing database tables
- Provider client classes for Airalo, eSIM Access, and eSIM Go
- A scheduled `esim:sync-providers` command as the replacement point for Node background schedulers

## Install

Run these commands inside `laravel-port` on a server with PHP and Composer:

```bash
composer install --no-dev --optimize-autoloader
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan optimize
```

For development:

```bash
composer install
php artisan serve
```

## Environment Mapping

The Node `.env` used:

```txt
DATABASE_URL=postgresql://user:pass@host:5432/esimconnect
BASE_URL=http://ayasim.mobile
API_BASE_URL=http://ayasim.mobile
SMTP_HOST=...
SMTP_USER=...
SMTP_PASS=...
```

Laravel should use:

```txt
APP_URL=https://ayasim.mobile
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=esimconnect
DB_USERNAME=ayasim_app
DB_PASSWORD=...
MAIL_HOST=...
MAIL_USERNAME=...
MAIL_PASSWORD=...
```

You can also keep `DATABASE_URL` if your host supports it.

## cPanel Deployment

Use the `public` folder as the document root. Keep `.env`, `app`, `bootstrap`, `config`, `database`, `routes`, `storage`, and `vendor` outside public web access.

Typical cPanel layout:

```txt
/home/account/laravel-port
/home/account/public_html -> laravel-port/public
```

If you cannot point the document root to `public`, copy only the contents of `public` into `public_html` and adjust `index.php` paths to point back to the Laravel app directory.

## Scheduler

Laravel replaces the Node cron/scheduler services with Laravel Scheduler.

Add this cron entry in cPanel:

```bash
* * * * * cd /home/account/laravel-port && php artisan schedule:run >> /dev/null 2>&1
```

The scheduled task currently runs:

```bash
php artisan esim:sync-providers
```

The command fetches provider catalogues and updates provider `last_sync_at`. The next migration step is to port the Node package normalization logic into that command.

## Current API Coverage

Converted routes include:

- `GET /api/health`
- `POST /api/auth/send-otp`
- `POST /api/auth/app/send-otp`
- `POST /api/auth/verify-otp`
- `POST /api/auth/app/verify-otp`
- `POST /api/auth/check-email`
- `POST /api/auth/login-password`
- `POST /api/auth/app/login-password`
- `POST /api/auth/app/set-password`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/me`
- `POST /api/auth/set-password`
- `POST /api/auth/change-password`
- `GET /api/destinations`
- `GET /api/destinations/with-pricing`
- `GET /api/destinations/slug/{slug}`
- `GET /api/regions`
- `GET /api/regions/with-pricing`
- `GET /api/regions/slug/{slug}`
- `GET /api/packages`
- `GET /api/packages/featured`
- `GET /api/packages/complete`
- `GET /api/packages/global`
- `GET /api/packages/stats`
- `GET /api/packages/slug/{slug}`
- `GET /api/packages/{id}`
- `GET /api/packages/{id}/reviews`
- `GET /api/packages/{id}/review-stats`
- `GET /api/unified-packages`
- `GET /api/unified-packages/global`
- `GET /api/unified-packages/slug/{slug}`
- `GET /api/unified-packages/{id}`
- `POST /api/admin/auth/login`
- `GET /api/admin/auth/me`
- `POST /api/admin/auth/logout`
- `GET /api/admin/dashboard`

The remaining Node modules still need a deeper PHP rewrite:

- checkout/payment flows
- order placement and provider failover
- wallet, reseller, gift card, voucher modules
- admin CRUD modules
- support ticket messaging and realtime behavior
- package normalization/sync persistence
- file uploads and generated screenshots

## Security

Rotate the API, database, and SMTP secrets from the old `.env` before using this in production. They were exposed in chat/context and should be treated as compromised.
