<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('esim:sync-providers')->hourly();
