import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface Props {
  orderId: string;
  publicKey?: string;
  mode?: string;
  guestAccessToken?: string;
  purchaseType?: string;
  currency?: string;
}

export default function PaypalPayment({
  orderId,
  publicKey,
  mode = "sandbox",
  guestAccessToken,
  purchaseType,
  currency = "USD"
}: Props) {
  const [isScriptLoading, setIsScriptLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey) {
      setError("PayPal Client ID (publicKey) is missing");
      setIsScriptLoading(false);
      return;
    }

    const scriptId = "paypal-js-sdk";
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement;

    const loadButtons = () => {
      const paypal = (window as any).paypal;
      if (!paypal) {
        setError("PayPal SDK failed to load");
        setIsScriptLoading(false);
        return;
      }

      setIsScriptLoading(false);

      const container = document.getElementById("paypal-button-container");
      if (container) {
        container.innerHTML = ""; // Clear previous buttons
        paypal
          .Buttons({
            createOrder: () => orderId,
            onApprove: async (data: any) => {
              // Note: We DO NOT capture on the frontend because our backend 
              // verifyPaypal helper already handles capturing APPROVED orders.
              // This avoids the "unauthorized order" error when multiple captures are attempted.

              console.log("✅ PayPal approved", {
                paypalOrderId: data.orderID,
                payerID: data.payerID
              });

              const params = new URLSearchParams({
                providerType: "paypal",
                orderId: data.orderID, // This matching the backend expectation in PaymentProcessing.tsx
                payerID: data.payerID || "",
                redirect_status: "succeeded",
              });

              if (purchaseType === "giftcard") {
                params.append("purchaseType", "giftcard");
              }

              if (guestAccessToken) {
                params.append("guestAccessToken", guestAccessToken);
              }

              window.location.href = `${window.location.origin}/order/processing?${params.toString()}`;
            },
            onError: (err: any) => {
              console.error("❌ PayPal error", err);
              setError("PayPal checkout failed. Please try again.");
            },
          })
          .render("#paypal-button-container");
      }
    };

    // If script already exists, check if it's the right one
    if (existingScript) {
      const currentUrl = new URL(existingScript.src);
      const currentClientId = currentUrl.searchParams.get("client-id");

      if (currentClientId === publicKey) {
        if ((window as any).paypal) {
          loadButtons();
          return;
        } else {
          existingScript.onload = loadButtons;
          return;
        }
      } else {
        // Wrong client id, remove it
        existingScript.remove();
      }
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://www.paypal.com/sdk/js?client-id=${publicKey}&currency=${currency}`;
    script.async = true;
    script.onload = loadButtons;
    script.onerror = () => {
      setError("Failed to load PayPal script");
      setIsScriptLoading(false);
    };
    document.body.appendChild(script);

    return () => {
      // Clean up buttons on unmount but keep the script
      const container = document.getElementById("paypal-button-container");
      if (container) container.innerHTML = "";
    };
  }, [orderId, publicKey, mode, guestAccessToken, purchaseType, currency]);

  if (error) {
    return (
      <div className="p-4 border border-red-200 rounded-md bg-red-50 text-red-700 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="relative min-h-[150px]">
      {isScriptLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      )}
      <div id="paypal-button-container" className="w-full" />
    </div>
  );
}

