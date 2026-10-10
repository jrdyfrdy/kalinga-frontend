<?php

namespace App\Http\Controllers\Api;

use App\Events\NotificationCreated;
use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class NotificationController extends Controller
{
    /**
     * GET /api/notifications — the authenticated user's notifications.
     * (User uses Laravel's Notifiable trait, whose notifications() relation
     * targets a different, polymorphic schema, so query the table directly.)
     */
    public function index(Request $request)
    {
        $notifications = Notification::where('user_id', $request->user()->id)
            ->latest()
            ->limit(min(max((int) $request->input('limit', 100), 1), 500))
            ->get();

        return response()->json($notifications);
    }

    /**
     * POST /api/notifications (admin)
     * Accepts either a direct notification { user_id, title, description }
     * or a broadcast from the admin console { title, message, type, role? }.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id'     => 'nullable|integer|exists:users,id',
            'role'        => ['nullable', Rule::in(['patient', 'responder', 'logistics', 'admin', 'hospital_admin', 'dispatcher', 'procurement', 'all'])],
            'title'       => 'required|string|max:255',
            'description' => 'required_without:message|nullable|string|max:5000',
            'message'     => 'required_without:description|nullable|string|max:5000',
            'type'        => 'nullable|string|in:info,warning,emergency,update,alert',
        ]);

        $body = $validated['description'] ?? $validated['message'];
        $type = $validated['type'] ?? 'info';

        if (!empty($validated['user_id'])) {
            $recipients = collect([(int) $validated['user_id']]);
        } else {
            $recipients = User::query()
                ->where('is_active', true)
                ->when(($validated['role'] ?? 'all') !== 'all', fn ($q) => $q->where('role', $validated['role']))
                ->pluck('id');
        }

        $created = $recipients->map(function ($userId) use ($validated, $body, $type) {
            $notification = Notification::create([
                'user_id'     => $userId,
                'title'       => $validated['title'],
                'description' => $body,
                'type'        => $type,
            ]);
            $this->pushRealtime($notification);
            return $notification;
        });

        if (!empty($validated['user_id'])) {
            return response()->json($created->first(), 201);
        }

        return response()->json([
            'message'    => 'Broadcast sent',
            'recipients' => $created->count(),
            'title'      => $validated['title'],
            'type'       => $type,
        ], 201);
    }

    /** PATCH /api/notifications/{id}/read */
    public function markAsRead(Request $request, $id)
    {
        $notification = Notification::where('user_id', $request->user()->id)->findOrFail($id);
        if (!$notification->read_at) {
            $notification->update(['read_at' => now()]);
        }

        return response()->json($notification);
    }

    /** POST /api/notifications/mark-all-read */
    public function markAllAsRead(Request $request)
    {
        $updated = Notification::where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['updated' => $updated]);
    }

    private function pushRealtime(Notification $notification): void
    {
        try {
            event(new NotificationCreated($notification));
        } catch (\Throwable $e) {
            // Realtime is best-effort; the notification is already stored.
            Log::warning('NotificationCreated broadcast failed', ['error' => $e->getMessage()]);
        }
    }
}
