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
        Schema::create('supply_items', function (Blueprint $table) {
            $table->id();
            $table->string('supply_id')->unique();
            $table->string('name');
            $table->string('category'); // Medical, Food, Water, Shelter
            $table->integer('quantity')->default(0);
            $table->string('unit'); // boxes, liters, pieces
            $table->enum('status', ['in-stock', 'low-stock', 'out-of-stock', 'in-transit'])->default('in-stock');
            $table->string('location')->nullable(); // warehouse location
            $table->date('expiry_date')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('supply_items');
    }
};
