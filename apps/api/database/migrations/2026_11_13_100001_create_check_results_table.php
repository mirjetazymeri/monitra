<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('check_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('endpoint_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('status_code')->nullable();
            $table->unsignedInteger('response_time_ms')->nullable();
            $table->boolean('is_success');
            $table->string('error_category', 32)->nullable();
            // Simulated (seeded demo) results are flagged and never mixed with live checks.
            $table->boolean('is_simulated')->default(false);
            $table->timestamp('checked_at');

            $table->index(['endpoint_id', 'checked_at']);
            $table->index(['endpoint_id', 'is_success', 'checked_at']);
            $table->index('checked_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('check_results');
    }
};
