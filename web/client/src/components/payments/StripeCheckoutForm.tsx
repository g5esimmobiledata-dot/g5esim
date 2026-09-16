import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useState } from 'react';
import { Button } from '../ui/button';

interface Props {
  guestAccessToken?: string; // 👈 IMPORTANT
  purchaseType?: string; 
}

export default function StripeCheckoutForm({ guestAccessToken, purchaseType }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.append("providerType", "stripe");
     if (purchaseType) {
      params.append("purchaseType", purchaseType);
    }



    if (guestAccessToken) {
      params.append("guestAccessToken", guestAccessToken);
    }

    const returnUrl = `${window.location.origin}/order/processing?${params.toString()}`;

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
      },
    });


    // const returnUrl =
    //   `${window.location.origin}/order/processing?providerType=stripe` +
    //   (guestAccessToken ? `&guestAccessToken=${guestAccessToken}` : '');

    // const result = await stripe.confirmPayment({
    //   elements,
    //   confirmParams: {
    //     return_url: returnUrl,
    //   },
    // });

    console.log('Stripe confirmPayment result:', result);

    if (result.error) {
      setError(result.error.message || 'Payment failed');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />

      {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}

      <Button
        type="submit"
        className=" bg-primary-gradient w-full mt-4"
        disabled={!stripe || loading}
      >
        {loading ? 'Processing...' : 'Pay with Stripe'}
      </Button>
    </form>
  );
}
