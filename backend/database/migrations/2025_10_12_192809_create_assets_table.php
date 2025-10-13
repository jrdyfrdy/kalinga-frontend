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
        Schema::create('assets', function (Blueprint $table) {
            $table->id();
            $table->string('asset_id')->unique();
            $table->string('name');
            $table->string('category'); // Vehicle, Equipment, Medical Supplies
            $table->string('type')->nullable(); // Ambulance, Fire Truck, etc.
            $table->enum('status', ['available', 'deployed', 'maintenance', 'damaged'])->default('available');
            $table->string('location')->nullable();
            $table->integer('quantity')->default(1);
            $table->date('last_maintenance')->nullable();
            $table->date('next_maintenance')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assets');
    }
};
