import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, MailX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Unsubscribe() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [unsubscribed, setUnsubscribed] = useState(false);
  const [reason, setReason] = useState("");

  // Get token from URL
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setLocation("/");
    }
  }, [token, setLocation]);

  const handleSubmitFeedback = () => {
    // In a real implementation, this would send feedback to the backend
    toast({
      title: "Thank you for your feedback",
      description: "We're sorry to see you go. Your feedback helps us improve.",
    });
    setTimeout(() => {
      setLocation("/");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Helmet>
        <title>Unsubscribe - eSIM Global</title>
      </Helmet>

      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            {unsubscribed ? (
              <CheckCircle className="h-16 w-16 text-green-500" />
            ) : (
              <MailX className="h-16 w-16 text-muted-foreground" />
            )}
          </div>
          <CardTitle className="text-center text-2xl" data-testid="text-title">
            {unsubscribed ? "You've been unsubscribed" : "Unsubscribe from emails"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!unsubscribed ? (
            <>
              <p className="text-center text-muted-foreground">
                You will no longer receive marketing emails from us.
              </p>
              <Button
                className="w-full"
                onClick={() => setUnsubscribed(true)}
                data-testid="button-confirm-unsubscribe"
              >
                Confirm Unsubscribe
              </Button>
            </>
          ) : (
            <>
              <div className="text-center text-muted-foreground">
                <p className="mb-4">You have successfully unsubscribed from our mailing list.</p>
                <p className="text-sm">You can resubscribe at any time from your account settings.</p>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <Label htmlFor="reason">Help us improve (optional)</Label>
                <Textarea
                  id="reason"
                  placeholder="Tell us why you're unsubscribing..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  data-testid="textarea-feedback"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setLocation("/")}
                    className="flex-1"
                    data-testid="button-go-home"
                  >
                    Go to Homepage
                  </Button>
                  <Button
                    onClick={handleSubmitFeedback}
                    className="flex-1"
                    disabled={!reason.trim()}
                    data-testid="button-submit-feedback"
                  >
                    Submit Feedback
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
