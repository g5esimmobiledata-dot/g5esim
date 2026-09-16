interface Props {
  orderId: string;
  amount: number;
  currency: string;
  publicKey: string;
  email: string;
  guestAccessToken?: string;
  purchaseType?: string;
}

export default function RazorpayPayment({
  orderId,
  amount,
  currency,
  publicKey,
  email,
  guestAccessToken,
  purchaseType
}: Props) {
  const openRazorpay = () => {
    const options = {
      key: publicKey,
      amount,
      currency,
      order_id: orderId,
      name: "eSIM Connect",
      description: "Order Payment",
      prefill: { email },

      handler: async (response: any) => {
        console.log("✅ Razorpay success", response);

        const params = new URLSearchParams({
          providerType: "razorpay",
          orderId: response.razorpay_order_id,
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature,
          redirect_status: "succeeded",
        });


         // ✅ add only for gift card
        if (purchaseType === "giftcard") {
          params.append("purchaseType", "giftcard");
        }


        // ✅ FIX 2 — only append for guest
        if (guestAccessToken) {
          params.append("guestAccessToken", guestAccessToken);
        }

        window.location.href =
          `${window.location.origin}/order/processing?${params.toString()}`;
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  return (
    <button onClick={openRazorpay} className="btn-primary w-full">
      Pay with Razorpay
    </button>
  );
}

