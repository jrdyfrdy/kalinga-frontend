<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Password reset emails link to the SPA, not a Laravel view.
        ResetPassword::createUrlUsing(function ($user, string $token) {
            return rtrim(config('app.frontend_url'), '/')
                .'/reset-password?token='.$token.'&email='.urlencode($user->getEmailForPasswordReset());
        });

        DB::listen(function ($query) {
            if ($query->time > 5) {
                Log::info('DB Query Execution Time: ' . $query->time . 'ms', [
                    'sql' => $query->sql,
                    'bindings' => $query->bindings
                ]);
            }
        });
    }
}
