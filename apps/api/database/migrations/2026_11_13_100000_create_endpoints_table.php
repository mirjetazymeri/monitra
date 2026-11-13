<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('endpoints', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 120);
            $table->string('url', 2048);
            $table->unsignedSmallInteger('expected_status')->default(200);
            $table->unsignedInteger('check_interval')->default(300); // seconds
            $table->boolean('is_enabled')->default(true);
            // Demo endpoints hold simulated history and are never checked live.
            $table->boolean('is_demo')->default(false);
            // Denormalised result of the latest check: pending | up | down.
            $table->string('current_status', 16)->default('pending');
            $table->timestamp('last_checked_at')->nullable();
            $table->timestamp('next_check_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['is_enabled', 'is_demo', 'next_check_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('endpoints');
    }
};
