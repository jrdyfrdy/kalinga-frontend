<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Road blockade lifecycle event for useBlockades():
 * presence-blockades → .BlockadeCreated | .BlockadeUpdated | .BlockadeCleared
 * with payload { blockade, action }.
 */
class BlockadeChanged implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public const CREATED = 'BlockadeCreated';
    public const UPDATED = 'BlockadeUpdated';
    public const CLEARED = 'BlockadeCleared';

    public function __construct(public array $blockade, public string $eventName, public string $action)
    {
    }

    public function broadcastOn(): array
    {
        return [new PresenceChannel('blockades')];
    }

    public function broadcastAs(): string
    {
        return $this->eventName;
    }

    public function broadcastWith(): array
    {
        return ['blockade' => $this->blockade, 'action' => $this->action];
    }
}
