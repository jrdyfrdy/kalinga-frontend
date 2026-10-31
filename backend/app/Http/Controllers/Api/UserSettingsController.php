<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Per-user preferences (stored in users.settings JSON), password change and
 * session/device management for the patient and responder Settings pages.
 */
class UserSettingsController extends Controller
{
    private const DEFAULTS = [
        'other_notifications'  => ['lab_results_availability' => true],
        'alert_settings'       => [
            'New_incident_alerts' => true,
            'critical_alerts'     => true,
            'messages'            => true,
        ],
        'notification_tone'    => ['tone' => 'soft'],
        'appointment_settings' => ['appointment_reminders' => [], 'cancellation_notifications' => true],
        'mute'                 => ['muted' => false, 'muted_until' => null, 'permanent' => false],
    ];

    private function section(Request $request, string $key): array
    {
        $settings = $request->user()->settings;
        if (is_string($settings)) {
            $settings = json_decode($settings, true) ?: [];
        }

        return array_merge(self::DEFAULTS[$key], (array) (($settings ?? [])[$key] ?? []));
    }

    private function saveSection(Request $request, string $key, array $values): array
    {
        $user = $request->user();
        $settings = $user->settings;
        if (is_string($settings)) {
            $settings = json_decode($settings, true) ?: [];
        }
        $settings = (array) ($settings ?? []);
        $settings[$key] = array_merge(self::DEFAULTS[$key], $values);

        $user->forceFill(['settings' => $settings])->save();

        return $settings[$key];
    }

    /** Only keep boolean flags (or whitelisted scalars) from a settings payload. */
    private function flags(Request $request): array
    {
        return collect($request->all())
            ->filter(fn ($v, $k) => is_string($k) && strlen($k) <= 64 && (is_bool($v) || in_array($v, [0, 1, '0', '1'], true)))
            ->map(fn ($v) => (bool) $v)
            ->all();
    }

    public function getOtherNotifications(Request $request)
    {
        return response()->json($this->section($request, 'other_notifications'));
    }

    public function saveOtherNotifications(Request $request)
    {
        return response()->json($this->saveSection($request, 'other_notifications', $this->flags($request)));
    }

    public function getAlertSettings(Request $request)
    {
        return response()->json($this->section($request, 'alert_settings'));
    }

    public function saveAlertSettings(Request $request)
    {
        return response()->json($this->saveSection($request, 'alert_settings', $this->flags($request)));
    }

    public function getNotificationTone(Request $request)
    {
        return response()->json($this->section($request, 'notification_tone'));
    }

    public function saveNotificationTone(Request $request)
    {
        $validated = $request->validate(['tone' => 'required|string|in:soft,standard,loud,urgent,silent,default']);

        return response()->json($this->saveSection($request, 'notification_tone', $validated));
    }

    public function getAppointmentSettings(Request $request)
    {
        return response()->json($this->section($request, 'appointment_settings'));
    }

    public function saveAppointmentSettings(Request $request)
    {
        $validated = $request->validate([
            'appointment_reminders'      => 'nullable|array|max:10',
            'appointment_reminders.*'    => 'string|max:50',
            'cancellation_notifications' => 'nullable|boolean',
        ]);

        return response()->json($this->saveSection($request, 'appointment_settings', [
            'appointment_reminders'      => array_values($validated['appointment_reminders'] ?? []),
            'cancellation_notifications' => (bool) ($validated['cancellation_notifications'] ?? true),
        ]));
    }

    public function getMute(Request $request)
    {
        $mute = $this->section($request, 'mute');
        if (!$mute['permanent'] && $mute['muted_until'] && now()->greaterThan($mute['muted_until'])) {
            $mute = self::DEFAULTS['mute'];
        }

        return response()->json($mute);
    }

    /** POST /notifications/mute { duration, unit: minutes|hours|days|permanent } */
    public function mute(Request $request)
    {
        $validated = $request->validate([
            'duration' => 'nullable|integer|min:1|max:10080',
            'unit'     => 'required|string|in:minutes,minute,hours,hour,days,day,permanent',
        ]);

        if ($validated['unit'] === 'permanent') {
            return response()->json($this->saveSection($request, 'mute', ['muted' => true, 'permanent' => true, 'muted_until' => null]));
        }

        $amount = (int) ($validated['duration'] ?? 1);
        $until = match (rtrim($validated['unit'], 's')) {
            'minute' => now()->addMinutes($amount),
            'hour'   => now()->addHours($amount),
            default  => now()->addDays($amount),
        };

        return response()->json($this->saveSection($request, 'mute', [
            'muted' => true, 'permanent' => false, 'muted_until' => $until->toIso8601String(),
        ]));
    }

    public function unmute(Request $request)
    {
        return response()->json($this->saveSection($request, 'mute', self::DEFAULTS['mute']));
    }

    /** POST /change-password { current_password, new_password, new_password_confirmation } */
    public function changePassword(Request $request)
    {
        $validated = $request->validate([
            'current_password' => 'required|string',
            'new_password'     => 'required|string|min:8|confirmed|different:current_password',
        ]);

        $user = $request->user();
        if (!Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        $user->forceFill(['password' => Hash::make($validated['new_password'])])->save();

        // Sign out every other session; keep the one making this request.
        $currentId = $user->currentAccessToken()?->id;
        $user->tokens()->when($currentId, fn ($q) => $q->where('id', '!=', $currentId))->delete();

        return response()->json(['message' => 'Password changed successfully.']);
    }

    /** GET /devices — active sessions (Sanctum tokens) for the current user. */
    public function devices(Request $request)
    {
        $user = $request->user();
        $currentId = $user->currentAccessToken()?->id;

        $devices = $user->tokens()
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->orderByDesc('last_used_at')
            ->orderByDesc('created_at')
            ->get()
            ->map(function (PersonalAccessToken $token) use ($currentId) {
                [$name, $type] = self::describeUserAgent($token->user_agent ?? null);

                return [
                    'id'                => $token->id,
                    'device_name'       => $name,
                    'device_type'       => $type,
                    'ip_address'        => $token->ip_address ?? null,
                    'location'          => $token->ip_address ?? 'Unknown location',
                    'last_active'       => optional($token->last_used_at ?? $token->created_at)->toIso8601String(),
                    'created_at'        => optional($token->created_at)->toIso8601String(),
                    'is_current'        => $token->id === $currentId,
                    'is_current_device' => $token->id === $currentId,
                ];
            });

        return response()->json($devices);
    }

    /** POST /devices/{id}/logout — revoke another session. */
    public function logoutDevice(Request $request, $id)
    {
        $user = $request->user();
        if ((int) $id === (int) $user->currentAccessToken()?->id) {
            return response()->json(['message' => 'Use Log out to end the current session.'], 422);
        }

        $deleted = $user->tokens()->where('id', (int) $id)->delete();
        if (!$deleted) {
            return response()->json(['message' => 'Session not found.'], 404);
        }

        return response()->json(['message' => 'Device logged out.']);
    }

    /** @return array{0: string, 1: string} [name, desktop|mobile|tablet] */
    public static function describeUserAgent(?string $ua): array
    {
        $ua = (string) $ua;
        if ($ua === '') {
            return ['Unknown device', 'desktop'];
        }

        $os = match (true) {
            str_contains($ua, 'iPad') => 'iPad',
            str_contains($ua, 'iPhone') => 'iPhone',
            str_contains($ua, 'Android') => 'Android',
            str_contains($ua, 'Windows') => 'Windows',
            str_contains($ua, 'Mac OS X') || str_contains($ua, 'Macintosh') => 'macOS',
            str_contains($ua, 'Linux') => 'Linux',
            default => 'Unknown OS',
        };
        $browser = match (true) {
            str_contains($ua, 'Edg/') => 'Edge',
            str_contains($ua, 'OPR/') => 'Opera',
            str_contains($ua, 'Chrome/') => 'Chrome',
            str_contains($ua, 'Firefox/') => 'Firefox',
            str_contains($ua, 'Safari/') => 'Safari',
            default => 'Browser',
        };
        $type = match (true) {
            str_contains($ua, 'iPad') || (str_contains($ua, 'Android') && !str_contains($ua, 'Mobile')) => 'tablet',
            str_contains($ua, 'Mobile') || str_contains($ua, 'iPhone') => 'mobile',
            default => 'desktop',
        };

        return ["{$browser} on {$os}", $type];
    }
}
