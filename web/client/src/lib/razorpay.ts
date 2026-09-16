let razorpayCheckoutPromise: Promise<void> | null = null;

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export function loadRazorpayCheckout() {
  if (window.Razorpay) {
    return Promise.resolve();
  }

  if (!razorpayCheckoutPromise) {
    razorpayCheckoutPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
      );

      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Razorpay checkout')), {
          once: true,
        });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay checkout'));
      document.body.appendChild(script);
    });
  }

  return razorpayCheckoutPromise;
}
