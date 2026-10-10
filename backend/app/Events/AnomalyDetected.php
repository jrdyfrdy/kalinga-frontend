<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Broadcast when IntradayAnomalyService flags a critical consumption spike.
 */
class AnomalyDetected implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public string $detectedAt;

    public function __construct(
        public int|string|null $hospitalId,
        public int|string|null $resourceId,
        public string $severity,
    ) {
        $this->detectedAt = now()->toIso8601String();
    }

    public function broadcastOn(): array
    {
        return [new Channel('logistics')];
    }

    public function broadcastAs(): string
    {
        return 'anomaly.detected';
    }
}
