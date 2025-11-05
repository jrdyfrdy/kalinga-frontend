<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('responder_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('patient_id')->constrained('users')->onDelete('cascade');
            $table->string('status')->default('active'); // active, archived, closed
            $table->timestamp('last_message_at')->nullable();
            $table->timestamps();

            // Indexes for better query performance
            $table->index('responder_id');
            $table->index('patient_id');
            $table->index('status');
            $table->index('last_message_at');
            
            // Ensure unique conversation between responder and patient
            $table->unique(['responder_id', 'patient_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('conversations');
    }
};
