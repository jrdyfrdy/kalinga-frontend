<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Appointment;
use App\Models\Conversation;
use App\Models\Message;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasApiTokens;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'phone',
        'profile_image',
        'address',
        'barangay',
        'city',
        'zip_code',
        'id_type',
        'id_image_path',
        'verification_status',
        'is_active',
        'language', 
        'theme',      
        'availability', 
        'visibility', 
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Get all of the appointments for the User.
     */
    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    /**
     * Get conversations where user is a responder
     */
    public function responderConversations(): HasMany
    {
        return $this->hasMany(Conversation::class, 'responder_id');
    }

    /**
     * Get conversations where user is a patient
     */
    public function patientConversations(): HasMany
    {
        return $this->hasMany(Conversation::class, 'patient_id');
    }

    /**
     * Get all conversations (responder or patient)
     */
    public function conversations()
    {
        return Conversation::where('responder_id', $this->id)
            ->orWhere('patient_id', $this->id);
    }

    /**
     * Get sent messages
     */
    public function sentMessages(): HasMany
    {
        return $this->hasMany(Message::class, 'sender_id');
    }
}
