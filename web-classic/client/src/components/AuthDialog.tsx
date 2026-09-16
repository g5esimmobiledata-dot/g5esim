import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuthDialogContext } from "@/contexts/AuthDialogContext";
import { useRequestOTP, useVerifyOTP } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, ArrowLeft, CheckCircle2, Wifi } from "lucide-react";

type Step = "email" | "otp" | "success";

export function AuthDialog() {
  const context = useAuthDialogContext();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const { toast } = useToast();

  const requestOTP = useRequestOTP();
  const verifyOTP = useVerifyOTP();

  const isOpen = context?.isOpen ?? false;
  const dialogType = context?.dialogType ?? null;
  const close = context?.close ?? (() => {});
  const openSignIn = context?.openSignIn ?? (() => {});
  const openSignUp = context?.openSignUp ?? (() => {});

  const resetForm = () => {
    setStep("email");
    setEmail("");
    setOtp("");
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleClose = () => {
    resetForm();
    close();
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      await requestOTP.mutateAsync({ email });
      setStep("otp");
      toast({
        title: "Code sent!",
        description: "Check your email for the verification code.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send verification code",
        variant: "destructive",
      });
    }
  };

  const handleOTPSubmit = async (value: string) => {
    if (value.length !== 6) return;

    try {
      await verifyOTP.mutateAsync({ email, otp: value });
      setStep("success");
      toast({
        title: "Welcome!",
        description: "You have been signed in successfully.",
      });
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (error: any) {
      toast({
        title: "Invalid code",
        description: error.message || "Please check the code and try again",
        variant: "destructive",
      });
    }
  };

  if (!context) {
    return null;
  }

  const isSignUp = dialogType === "signup";
  const title = isSignUp ? "Create your account" : "Welcome back";
  const subtitle = isSignUp
    ? "Sign up to start using eSIM Connect"
    : "Sign in to your eSIM Connect account";

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
            <Wifi className="h-6 w-6 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold text-center">
            {step === "success" ? "You're in!" : title}
          </DialogTitle>
          <DialogDescription className="text-center">
            {step === "success"
              ? "Successfully authenticated"
              : step === "otp"
              ? `Enter the 6-digit code sent to ${email}`
              : subtitle}
          </DialogDescription>
        </DialogHeader>

        {step === "email" && (
          <form onSubmit={handleEmailSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  data-testid="input-auth-email"
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full gradient-primary"
              disabled={requestOTP.isPending}
              data-testid="button-auth-continue"
            >
              {requestOTP.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending code...
                </>
              ) : (
                "Continue with Email"
              )}
            </Button>
          </form>
        )}

        {step === "otp" && (
          <div className="space-y-4 pt-4">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={(value) => {
                  setOtp(value);
                  if (value.length === 6) {
                    handleOTPSubmit(value);
                  }
                }}
                disabled={verifyOTP.isPending}
                data-testid="input-auth-otp"
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            {verifyOTP.isPending && (
              <div className="flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}

            <div className="flex flex-col items-center gap-2 text-sm">
              <button
                type="button"
                onClick={() => setStep("email")}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                data-testid="button-auth-back"
              >
                <ArrowLeft className="h-4 w-4" />
                Change email
              </button>
              <button
                type="button"
                onClick={handleEmailSubmit}
                disabled={requestOTP.isPending}
                className="text-primary hover:text-primary/80 transition-colors"
                data-testid="button-auth-resend"
              >
                {requestOTP.isPending ? "Sending..." : "Resend code"}
              </button>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="flex flex-col items-center py-6">
            <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-accent" />
            </div>
            <p className="text-sm text-muted-foreground">Redirecting you now...</p>
          </div>
        )}

        {step === "email" && (
          <div className="text-center pt-4 border-t">
            {isSignUp ? (
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={openSignIn}
                  className="text-primary hover:underline font-medium"
                  data-testid="button-auth-switch-signin"
                >
                  Sign in
                </button>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={openSignUp}
                  className="text-primary hover:underline font-medium"
                  data-testid="button-auth-switch-signup"
                >
                  Sign up
                </button>
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
