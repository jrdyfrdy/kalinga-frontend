<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_password_sends_a_link_to_the_spa_without_revealing_accounts(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'reset@kalinga.test']);

        $known = $this->postJson('/api/forgot-password', ['email' => 'reset@kalinga.test'])->assertOk();
        $unknown = $this->postJson('/api/forgot-password', ['email' => 'nobody@kalinga.test'])->assertOk();
        $this->assertSame($known->json('message'), $unknown->json('message'));

        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use ($user) {
            $url = $notification->toMail($user)->actionUrl;
            return str_starts_with($url, rtrim(config('app.frontend_url'), '/').'/reset-password?token=')
                && str_contains($url, 'email='.urlencode($user->email));
        });
    }

    public function test_reset_password_changes_the_password_and_revokes_tokens(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'reset2@kalinga.test']);
        $user->createToken('old-session');

        $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk();
        $token = null;
        Notification::assertSentTo($user, ResetPassword::class, function ($n) use (&$token) {
            $token = $n->token;
            return true;
        });

        $this->postJson('/api/reset-password', [
            'token' => 'wrong',
            'email' => $user->email,
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ])->assertStatus(422);

        $this->postJson('/api/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ])->assertOk();

        $this->assertTrue(Hash::check('newpassword123', $user->fresh()->password));
        $this->assertSame(0, $user->tokens()->count());
    }
}
