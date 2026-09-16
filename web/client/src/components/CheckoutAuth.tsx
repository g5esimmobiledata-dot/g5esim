import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CheckoutAuthProps {
  onAuthSuccess: () => void;
}

export function CheckoutAuth({ onAuthSuccess }: CheckoutAuthProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const sendOTPMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/auth/send-otp", { email });
    },
    onSuccess: () => {
      setStep("otp");
      toast({
        title: "OTP Sent!",
        description: `A 6-digit code has been sent to ${email}. In development, use code: 123456`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send OTP",
        variant: "destructive",
      });
    },
  });

  const verifyOTPMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/auth/verify-otp", { email, otp: otp });
    },
    onSuccess: () => {
      toast({
        title: "Welcome!",
        description: "You're now signed in. Completing your order...",
      });
      onAuthSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Invalid Code",
        description: error.message || "The OTP code is invalid or expired",
        variant: "destructive",
      });
    },
  });

  const handleSendOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    sendOTPMutation.mutate();
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter the 6-digit code",
        variant: "destructive",
      });
      return;
    }
    verifyOTPMutation.mutate();
  };

  return (
    <Card data-testid="checkout-auth-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Sign In to Complete Order
        </CardTitle>
        <CardDescription>
          {step === "email"
            ? "Enter your email address to receive a verification code"
            : "Enter the 6-digit code sent to your email"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === "email" ? (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                  data-testid="input-checkout-email"
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={sendOTPMutation.isPending}
              data-testid="button-send-otp"
            >
              {sendOTPMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Code...
                </>
              ) : (
                "Send Verification Code"
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <Input
                id="otp"
                type="text"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                required
                data-testid="input-checkout-otp"
              />
              <p className="text-sm text-muted-foreground">
                Code sent to {email}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep("email");
                  setOtp("");
                }}
                className="flex-1"
                data-testid="button-change-email"
              >
                Change Email
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={verifyOTPMutation.isPending}
                data-testid="button-verify-otp"
              >
                {verifyOTPMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Continue"
                )}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
