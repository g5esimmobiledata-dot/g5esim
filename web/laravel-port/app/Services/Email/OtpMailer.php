<?php

namespace App\Services\Email;

use Illuminate\Support\Facades\Mail;

class OtpMailer
{
    public function send(string $email, string $code, string $purpose = 'login'): void
    {
        $label = $purpose === 'password_reset' ? 'password reset code' : 'verification code';
        $subject = $purpose === 'password_reset' ? 'Password Reset Code - AyaSIM' : 'Your AyaSIM Verification Code';
        $html = <<<HTML
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
          <h2 style="margin:0 0 12px">AyaSIM</h2>
          <p>Your {$label} is:</p>
          <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:16px 0">{$code}</p>
          <p>This code expires in 10 minutes.</p>
        </div>
        HTML;

        Mail::html($html, function ($message) use ($email, $subject): void {
            $message->to($email)->subject($subject);
        });
    }
}
