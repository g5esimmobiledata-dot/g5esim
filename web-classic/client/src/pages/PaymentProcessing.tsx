// import { useEffect, useState } from "react";
// import { useLocation } from "wouter";
// import { Helmet } from "react-helmet-async";
// import { Loader2, CheckCircle, XCircle } from "lucide-react";
// import { loadStripe } from "@stripe/stripe-js";
// import { Button } from "@/components/ui/button";
// import { apiRequest } from "@/lib/queryClient";
// import { SiteHeader } from "@/components/layout/SiteHeader";
// import { SiteFooter } from "@/components/layout/SiteFooter";

// const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || "");

// export default function PaymentProcessing() {
//   const [, setLocation] = useLocation();
//   const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
//   const [message, setMessage] = useState("Processing your payment...");

//   useEffect(() => {
//     const processPayment = async () => {
//       try {
//         const stripe = await stripePromise;
//         if (!stripe) {
//           setStatus("error");
//           setMessage("Payment system not available");
//           return;
//         }

//         // Get payment intent from URL query params
//         const urlParams = new URLSearchParams(window.location.search);
//         const paymentIntentId = urlParams.get("payment_intent");
//         const paymentIntentClientSecret = urlParams.get("payment_intent_client_secret");
//         const redirectStatus = urlParams.get("redirect_status");

//         if (!paymentIntentId) {
//           setStatus("error");
//           setMessage("Invalid payment session");
//           return;
//         }

//         if (redirectStatus !== "succeeded") {
//           setStatus("error");
//           setMessage("Payment was not successful. Please try again.");
//           return;
//         }

//         // Confirm the order on the backend
//         const res = await apiRequest("POST", "/api/guest/confirm-payment", {
//           paymentIntentId: paymentIntentId,
//         });
//         const data = await res.json();

//         if (data.success && data.guestAccessToken) {
//           setStatus("success");
//           setMessage("Payment successful! Redirecting to your order...");

//           // Redirect to order confirmation page
//           setTimeout(() => {
//             setLocation(`/order/${data.guestAccessToken}`);
//           }, 1500);
//         } else {
//           setStatus("error");
//           setMessage(data.message || "Failed to process order");
//         }
//       } catch (err: any) {
//         setStatus("error");
//         setMessage(err.message || "An error occurred while processing your payment");
//       }
//     };

//     processPayment();
//   }, [setLocation]);

//   return (
//     <div className="min-h-screen bg-background flex flex-col">
//       <Helmet>
//         <title>Processing Payment | </title>
//       </Helmet>
//       <SiteHeader />

//       <main className="flex-1 flex items-center justify-center pt-20">
//         <div className="text-center max-w-md mx-auto px-4">
//           {status === "processing" && (
//             <>
//               <Loader2 className="w-16 h-16 text-teal-500 animate-spin mx-auto mb-4" />
//               <h1 className="text-2xl font-bold text-foreground mb-2">Processing Payment</h1>
//               <p className="text-muted-foreground">{message}</p>
//             </>
//           )}

//           {status === "success" && (
//             <>
//               <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
//               <h1 className="text-2xl font-bold text-foreground mb-2">Payment Successful!</h1>
//               <p className="text-muted-foreground">{message}</p>
//             </>
//           )}

//           {status === "error" && (
//             <>
//               <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
//               <h1 className="text-2xl font-bold text-foreground mb-2">Payment Failed</h1>
//               <p className="text-muted-foreground mb-6">{message}</p>
//               <Button onClick={() => window.history.back()} data-testid="button-try-again">
//                 Try Again
//               </Button>
//             </>
//           )}
//         </div>
//       </main>

//       <SiteFooter />
//     </div>
//   );
// }

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

type Status = "processing" | "success" | "error";

export default function PaymentProcessing() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<Status>("processing");
  const [message, setMessage] = useState("Processing your payment...");

//   useEffect(() => {
//   const processPayment = async () => {
//     try {
//       const urlParams = new URLSearchParams(window.location.search);

//       const providerType = urlParams.get("providerType"); // stripe | razorpay | paypal | paystack
//       if (!providerType) throw new Error("Payment provider not found");

//       let providerBody: any = { providerType };

//       switch (providerType) {
//         case "stripe":
//           providerBody.paymentIntentId = urlParams.get("payment_intent");
//           break;

//         case "razorpay":
//           providerBody.orderId = urlParams.get("orderId");
//           providerBody.paymentId = urlParams.get("paymentId");
//           providerBody.signature = urlParams.get("signature");
//           break;

//         case "paypal":
//           providerBody.orderId = urlParams.get("orderId");
//           break;

//         case "paystack":
//           providerBody.orderId = urlParams.get("reference");
//           break;

//         default:
//           throw new Error("Unsupported payment provider");
//       }


    

//       // 🔐 Call backend adapter API
//       const res = await apiRequest(
//         "POST",
//         "/api/confirm-payment",
//         providerBody
//       );

//       const data = await res.json();

//       if (!data.success) {
//         throw new Error(data.message || "Payment verification failed");
//       }

//       setStatus("success");
//       setMessage("Payment successful! Redirecting...");

//       setTimeout(() => {
//         setLocation("/account/orders");
//       }, 2500);

//     } catch (err: any) {
//       console.error("Payment processing error:", err);
//       setStatus("error");
//       setMessage(err.message || "Payment processing failed");
//     }
//   };

//   processPayment();
// }, [setLocation]);



useEffect(() => {
  const processPayment = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);

      const providerType = urlParams.get("providerType");
      if (!providerType) throw new Error("Payment provider not found");
      const purchaseType = urlParams.get("purchaseType")
      const guestAccessToken = urlParams.get("guestAccessToken");

      let providerBody: any = { providerType };

      switch (providerType) {
        case "stripe":
          providerBody.paymentIntentId =
            urlParams.get("payment_intent");
          break;

        case "razorpay":
          providerBody.orderId = urlParams.get("orderId");
          providerBody.paymentId = urlParams.get("paymentId");
          providerBody.signature = urlParams.get("signature");
          break;

        case "paypal":
          providerBody.orderId = urlParams.get("orderId");
          break;

        case "paystack":
          providerBody.orderId = urlParams.get("reference");
          break;

        case "ayamerchant":
          providerBody.orderId =
            urlParams.get("orderId") ||
            urlParams.get("tx_ref") ||
            urlParams.get("txRef") ||
            urlParams.get("reference");
          providerBody.txRef = providerBody.orderId;
          providerBody.gatewayId = urlParams.get("gatewayId");
          break;

        default:
          throw new Error("Unsupported payment provider");
      }

      // 🔥 DECISION POINT
      const apiUrl = guestAccessToken
        ? "/api/guest/confirm-payment"
        : "/api/confirm-payment";

      if (guestAccessToken) {
        providerBody.guestAccessToken = guestAccessToken;
      }

      const res = await apiRequest("POST", apiUrl, providerBody);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || "Payment verification failed");
      }

      setStatus("success");
      setMessage("Payment successful! Redirecting...");

      setTimeout(() => {
         // 🎁 Gift Card Purchase
  if (purchaseType === "giftcard") {
    setLocation("/account/gift-cards");
    return;
  }

  // 👤 Guest Order
  if (guestAccessToken) {
    setLocation(`/order/${guestAccessToken}`);
    return;
  }

  // 📦 Normal eSIM order
  setLocation("/account/orders");
      }, 2000);

    } catch (err: any) {
      console.error("Payment processing error:", err);
      setStatus("error");
      setMessage(err.message || "Payment processing failed");
    }
  };

  processPayment();
}, [setLocation]);



  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Processing Payment | eSIMConnect</title>
      </Helmet>

      {/* <SiteHeader /> */}

      <main className="flex-1 flex items-center justify-center pt-20">
        <div className="text-center max-w-md mx-auto px-4">
          {status === "processing" && (
            <>
              <Loader2 className="w-16 h-16 text-teal-500 animate-spin mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Processing Payment</h1>
              <p className="text-muted-foreground">{message}</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
              <p className="text-muted-foreground">{message}</p>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Payment Failed</h1>
              <p className="text-muted-foreground mb-6">{message}</p>
              <Button onClick={() => window.history.back()}>Try Again</Button>
            </>
          )}
        </div>
      </main>

      {/* <SiteFooter /> */}
    </div>
  );
}
