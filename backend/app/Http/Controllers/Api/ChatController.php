<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ChatController extends Controller
{
    /**
     * Get all conversations for the authenticated user
     */
    public function getConversations(Request $request)
    {
        $user = $request->user();
        
        $conversations = Conversation::with(['responder', 'patient', 'latestMessage'])
            ->where(function($query) use ($user) {
                $query->where('responder_id', $user->id)
                      ->orWhere('patient_id', $user->id);
            })
            ->orderBy('last_message_at', 'desc')
            ->get()
            ->map(function($conversation) use ($user) {
                $otherParticipant = $conversation->getOtherParticipant($user->id);
                
                return [
                    'id' => $conversation->id,
                    'status' => $conversation->status,
                    'last_message_at' => $conversation->last_message_at,
                    'unread_count' => $conversation->unreadCount($user->id),
                    'participant' => [
                        'id' => $otherParticipant->id,
                        'name' => $otherParticipant->name,
                        'role' => $otherParticipant->role,
                        'profile_image' => $otherParticipant->profile_image,
                    ],
                    'latest_message' => $conversation->latestMessage ? [
                        'message' => $conversation->latestMessage->message,
                        'created_at' => $conversation->latestMessage->created_at,
                        'is_sender' => $conversation->latestMessage->sender_id == $user->id,
                    ] : null,
                ];
            });

        return response()->json($conversations);
    }

    /**
     * Get or create a conversation between responder and patient
     */
    public function getOrCreateConversation(Request $request)
    {
        $request->validate([
            'responder_id' => 'required|exists:users,id',
            'patient_id' => 'required|exists:users,id',
        ]);

        $conversation = Conversation::firstOrCreate(
            [
                'responder_id' => $request->responder_id,
                'patient_id' => $request->patient_id,
            ],
            [
                'status' => 'active',
            ]
        );

        $conversation->load(['responder', 'patient']);

        return response()->json($conversation);
    }

    /**
     * Get messages for a specific conversation
     */
    public function getMessages(Request $request, $conversationId)
    {
        $user = $request->user();
        
        $conversation = Conversation::with(['messages.sender'])
            ->where(function($query) use ($user) {
                $query->where('responder_id', $user->id)
                      ->orWhere('patient_id', $user->id);
            })
            ->findOrFail($conversationId);

        // Mark messages as read
        $conversation->markAsRead($user->id);

        $messages = $conversation->messages->map(function($message) use ($user) {
            return [
                'id' => $message->id,
                'conversation_id' => $message->conversation_id,
                'sender_id' => $message->sender_id,
                'message' => $message->message,
                'message_type' => $message->message_type,
                'attachment_url' => $message->attachment_url,
                'is_read' => $message->is_read,
                'is_sender' => $message->sender_id == $user->id,
                'created_at' => $message->created_at,
                'sender' => [
                    'id' => $message->sender->id,
                    'name' => $message->sender->name,
                    'profile_image' => $message->sender->profile_image,
                ],
            ];
        });

        return response()->json($messages);
    }

    /**
     * Send a new message
     */
    public function sendMessage(Request $request, $conversationId)
    {
        $user = $request->user();
        
        $request->validate([
            'message' => 'required|string',
            'message_type' => 'nullable|in:text,image,file,location',
            'attachment_url' => 'nullable|string',
        ]);

        $conversation = Conversation::where(function($query) use ($user) {
                $query->where('responder_id', $user->id)
                      ->orWhere('patient_id', $user->id);
            })
            ->findOrFail($conversationId);

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $user->id,
            'message' => $request->message,
            'message_type' => $request->message_type ?? 'text',
            'attachment_url' => $request->attachment_url,
        ]);

        // Update conversation's last message timestamp
        $conversation->update([
            'last_message_at' => now(),
        ]);

        $message->load('sender');

        return response()->json([
            'id' => $message->id,
            'conversation_id' => $message->conversation_id,
            'sender_id' => $message->sender_id,
            'message' => $message->message,
            'message_type' => $message->message_type,
            'attachment_url' => $message->attachment_url,
            'is_read' => $message->is_read,
            'is_sender' => true,
            'created_at' => $message->created_at,
            'sender' => [
                'id' => $message->sender->id,
                'name' => $message->sender->name,
                'profile_image' => $message->sender->profile_image,
            ],
        ], 201);
    }

    /**
     * Get available responders for patients to start a chat
     */
    public function getAvailableResponders(Request $request)
    {
        $responders = User::where('role', 'responder')
            ->where('is_active', true)
            ->select('id', 'name', 'email', 'profile_image')
            ->get();

        return response()->json($responders);
    }

    /**
     * Get active patients for responders
     */
    public function getActivePatients(Request $request)
    {
        $user = $request->user();
        
        // Get patients who have conversations with this responder
        $patients = User::whereHas('conversations', function($query) use ($user) {
                $query->where('responder_id', $user->id);
            })
            ->where('role', 'patient')
            ->where('is_active', true)
            ->select('id', 'name', 'email', 'profile_image')
            ->get();

        return response()->json($patients);
    }

    /**
     * Mark conversation as read
     */
    public function markAsRead(Request $request, $conversationId)
    {
        $user = $request->user();
        
        $conversation = Conversation::where(function($query) use ($user) {
                $query->where('responder_id', $user->id)
                      ->orWhere('patient_id', $user->id);
            })
            ->findOrFail($conversationId);

        $conversation->markAsRead($user->id);

        return response()->json(['message' => 'Conversation marked as read']);
    }
}
