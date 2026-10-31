<?php

namespace App\Events;

use App\Models\Notification;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Pushes a newly created in-app notification to its recipient.
 * Frontend: useNotifications() listens on private-notifications.user.{id}
 * for ".NotificationReceived" and reads payload.notification.
 */
class NotificationCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(public Notification $notification)
    {
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('notifications.user.' . $this->notification->user_id)];
    }

    public function broadcastAs(): string
    {
        return 'NotificationReceived';
    }

    public function broadcastWith(): array
    {
        return ['notification' => $this->notification->toArray()];
    }
}
