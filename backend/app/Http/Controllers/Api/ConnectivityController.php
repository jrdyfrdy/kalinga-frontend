<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DatabaseConnectionManager;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

/**
 * GET /api/admin/connectivity/status — live health of the services the app
 * depends on (replaces the static data in ConnectivityMonitoring.jsx).
 */
class ConnectivityController extends Controller
{
    public function status()
    {
        $services = [
            $this->probe('Primary database', fn () => DB::select('select 1')),
            $this->probeHttp('Node API', rtrim((string) config('services.node_api.url', 'http://localhost:5000'), '/') . '/health'),
            $this->probeSocket('Realtime (Reverb)', $this->reverbHost(), (int) config('reverb.apps.apps.0.options.port', 8080)),
            $this->probeHttp('Forecasting service', rtrim((string) config('services.forecasting.base_url', ''), '/') . '/health'),
        ];

        $onlineUsers = 0;
        try {
            $onlineUsers = DB::table('users')
                ->join('responders', 'responders.user_id', '=', 'users.id')
                ->where('responders.status', 'Available')
                ->count();
        } catch (\Throwable) {
            // responders table may be unavailable on a degraded connection
        }

        $failover = null;
        try {
            $failover = DatabaseConnectionManager::getConnectionStatus();
        } catch (\Throwable) {
            $failover = null;
        }

        return response()->json([
            'checked_at'           => now()->toIso8601String(),
            'services'             => array_values(array_filter($services)),
            'available_responders' => $onlineUsers,
            'database_failover'    => $failover,
        ]);
    }

    private function reverbHost(): string
    {
        $host = (string) config('reverb.apps.apps.0.options.host', 'localhost');

        return preg_replace('#^https?://#', '', $host) ?: 'localhost';
    }

    private function probe(string $name, callable $check): array
    {
        $start = microtime(true);
        try {
            $check();
            return $this->result($name, 'online', $start);
        } catch (\Throwable $e) {
            return $this->result($name, 'offline', $start, $e->getMessage());
        }
    }

    private function probeHttp(string $name, string $url): ?array
    {
        if (!preg_match('#^https?://[^/]+#', $url)) {
            return null; // not configured
        }

        $start = microtime(true);
        try {
            $response = Http::timeout(3)->acceptJson()->get($url);
            return $this->result($name, $response->successful() ? 'online' : 'degraded', $start, $response->successful() ? null : 'HTTP ' . $response->status());
        } catch (\Throwable $e) {
            return $this->result($name, 'offline', $start, $e->getMessage());
        }
    }

    private function probeSocket(string $name, string $host, int $port): array
    {
        $start = microtime(true);
        $fp = @stream_socket_client("tcp://{$host}:{$port}", $errno, $errstr, 2);
        if ($fp) {
            fclose($fp);
            return $this->result($name, 'online', $start);
        }

        return $this->result($name, 'offline', $start, $errstr ?: 'connection failed');
    }

    private function result(string $name, string $status, float $start, ?string $error = null): array
    {
        return [
            'name'       => $name,
            'status'     => $status,
            'latency_ms' => (int) round((microtime(true) - $start) * 1000),
            'error'      => $error ? mb_substr($error, 0, 200) : null,
        ];
    }
}
