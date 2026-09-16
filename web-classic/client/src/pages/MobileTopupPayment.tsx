/**
 * MobileTopupPayment.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * A completely standalone, header/footer-free page designed to be opened inside
 * an Android WebView (or any mobile WebView) for eSIM top-up payments.
 *
 * URL format:
 *   /mobile-topup?iccid=xxx&orderId=xxx&topupId=xxx&gatewayId=xxx&token=xxx&callbackScheme=simfinity
 *
 * On success the page tries 3 layers of signalling back to the native app:
 *   1. window.SimfinityAndroid.onPaymentSuccess(json) – Android JavascriptInterface
 *   2. window.ReactNativeWebView.postMessage(json)    – React Native WebView bridge
 *   3. Redirect to  <callbackScheme>://payment-success?...  – deep-link / custom URL scheme
 *
 * On failure the same 3 layers are used with .onPaymentFailure / "payment-failed".
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader2, CheckCircle, XCircle, CreditCard, Smartphone, ShieldCheck } from 'lucide-react';
import { useSettingByKey } from '@/hooks/useSettings';
import { useTheme } from '@/contexts/ThemeContext';

// ─── helpers ────────────────────────────────────────────────────────────────

function getParam(name: string): string {
    return new URLSearchParams(window.location.search).get(name) ?? '';
}

/** Notify the native Android app via every available channel */
function notifyNative(eventType: 'success' | 'failure', payload: Record<string, unknown>) {
    const msg = JSON.stringify({ eventType, ...payload });
    const scheme = getParam('callbackScheme') || 'simfinity';

    // 1) Android JavascriptInterface
    try {
        if ((window as any).SimfinityAndroid) {
            if (eventType === 'success') {
                (window as any).SimfinityAndroid.onPaymentSuccess(msg);
            } else {
                (window as any).SimfinityAndroid.onPaymentFailure(msg);
            }
        }
    } catch (_) { }

    // 2) React Native WebView bridge
    try {
        if ((window as any).ReactNativeWebView) {
            (window as any).ReactNativeWebView.postMessage(msg);
        }
    } catch (_) { }

    // 3) Flutter / generic postMessage to parent
    try {
        window.parent?.postMessage(msg, '*');
        window.top?.postMessage(msg, '*');
    } catch (_) { }

    // 4) Deep-link redirect (works for both Android custom scheme & Universal Links)
    try {
        const path = eventType === 'success' ? 'payment-success' : 'payment-failed';
        const params = new URLSearchParams(payload as Record<string, string>).toString();
        window.location.href = `${scheme}://${path}?${params}`;
    } catch (_) { }
}

// ─── Stripe inner form ────────────────────────────────────────────────────────

function StripePaymentForm({
    amount,
    currency,
    orderId,
    iccid,
    providerType,
    onSuccess,
    onError,
}: {
    amount: number;
    currency: string;
    orderId: string;
    iccid: string;
    providerType: string;
    onSuccess: (data: any) => void;
    onError: (msg: string) => void;
}) {
    const stripe = useStripe();
    const elements = useElements();
    const [busy, setBusy] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setBusy(true);
        try {
            const { error, paymentIntent } = await stripe.confirmPayment({
                elements,
                redirect: 'if_required',
            });

            if (error) {
                onError(error.message ?? 'Payment failed');
                return;
            }

            if (paymentIntent?.status === 'succeeded') {
                // Call backend confirm
                const res = await fetch('/api/confirm-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        providerType: 'stripe',
                        paymentIntentId: paymentIntent.id,
                    }),
                });
                const data = await res.json();
                if (data.success) {
                    onSuccess(data);
                } else {
                    onError(data.message ?? 'Backend confirmation failed');
                }
            }
        } catch (err: any) {
            onError(err.message ?? 'Unexpected error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <PaymentElement />
            <button
                type="submit"
                disabled={!stripe || busy}
                className="w-full py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
                {busy ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing…
                    </>
                ) : (
                    <>
                        <CreditCard className="h-4 w-4" />
                        Pay {currency.toUpperCase()} {amount.toFixed(2)}
                    </>
                )}
            </button>
        </form>
    );
}

// ─── Razorpay handler ─────────────────────────────────────────────────────────

function RazorpayButton({
    rzpOrderId,
    amount,
    currency,
    publicKey,
    email,
    onSuccess,
    onError,
}: {
    rzpOrderId: string;
    amount: number;
    currency: string;
    publicKey: string;
    email?: string;
    onSuccess: (data: any) => void;
    onError: (msg: string) => void;
}) {
    const siteName = useSettingByKey('platform_name') || 'eSIM Connect';
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        // Ensure Razorpay SDK is injected
        if (!(window as any).Razorpay) {
            const s = document.createElement('script');
            s.src = 'https://checkout.razorpay.com/v1/checkout.js';
            document.head.appendChild(s);
        }
    }, []);

    const openRazorpay = () => {
        setBusy(true);
        const options = {
            key: publicKey,
            amount,
            currency,
            name: siteName,
            description: 'eSIM Top-Up',
            order_id: rzpOrderId,
            prefill: { email },
            handler: async (response: any) => {
                try {
                    const res = await fetch('/api/confirm-payment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            providerType: 'razorpay',
                            orderId: response.razorpay_order_id,
                            paymentId: response.razorpay_payment_id,
                            signature: response.razorpay_signature,
                        }),
                    });
                    const data = await res.json();
                    if (data.success) {
                        onSuccess(data);
                    } else {
                        onError(data.message ?? 'Verification failed');
                    }
                } catch (err: any) {
                    onError(err.message);
                } finally {
                    setBusy(false);
                }
            },
            modal: {
                ondismiss: () => setBusy(false),
            },
        };
        new (window as any).Razorpay(options).open();
    };

    return (
        <button
            onClick={openRazorpay}
            disabled={busy}
            className="w-full py-3 px-6 rounded-xl bg-[#3399cc] hover:bg-[#287aa3] disabled:opacity-50 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
        >
            {busy ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Opening Razorpay…
                </>
            ) : (
                <>
                    <CreditCard className="h-4 w-4" />
                    Pay with Razorpay
                </>
            )}
        </button>
    );
}

// ─── PayPal handler ───────────────────────────────────────────────────────────

function PayPalButton({
    ppOrderId,
    onSuccess,
    onError,
}: {
    ppOrderId: string;
    onSuccess: (data: any) => void;
    onError: (msg: string) => void;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [sdkReady, setSdkReady] = useState(!!(window as any).paypal);

    useEffect(() => {
        if ((window as any).paypal) {
            renderButtons();
            return;
        }
        const interval = setInterval(() => {
            if ((window as any).paypal) {
                setSdkReady(true);
                renderButtons();
                clearInterval(interval);
            }
        }, 500);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ppOrderId]);

    const renderButtons = () => {
        if (!containerRef.current) return;
        containerRef.current.innerHTML = '';
        (window as any).paypal
            .Buttons({
                createOrder: () => ppOrderId,
                onApprove: async (data: any) => {
                    try {
                        const res = await fetch('/api/confirm-payment', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({
                                providerType: 'paypal',
                                orderId: data.orderID,
                            }),
                        });
                        const result = await res.json();
                        if (result.success) {
                            onSuccess(result);
                        } else {
                            onError(result.message ?? 'PayPal verification failed');
                        }
                    } catch (err: any) {
                        onError(err.message);
                    }
                },
                onError: (err: any) => onError(err.message ?? 'PayPal error'),
            })
            .render(containerRef.current);
    };

    return (
        <div className="w-full min-h-[60px] flex items-center justify-center">
            {!sdkReady && <Loader2 className="h-6 w-6 animate-spin text-slate-400" />}
            <div ref={containerRef} className="w-full" />
        </div>
    );
}

// ─── Paystack handler (redirect-based) ───────────────────────────────────────

function PaystackButton({
    redirectUrl,
    reference,
    onInitiated,
}: {
    redirectUrl: string;
    reference: string;
    onInitiated: () => void;
}) {
    /**
     * For Paystack in a WebView the flow is:
     *   1. Open redirectUrl in the same WebView tab
     *   2. After payment, Paystack redirects back to our callback URL on the backend
     *   3. Backend verifies, then renders a HTML page that calls notifyNative via window.postMessage
     *      (the WebView intercepts the scheme URL)
     *
     * The callback URL is:  /api/payments/topup/paystack-callback?reference=ref&...original-params...
     */
    const params = new URLSearchParams(window.location.search);
    params.set('reference', reference);

    // Build the Paystack callback URL that includes all context
    const callbackBase = `${window.location.origin}/api/payments/topup/paystack-callback`;
    const callbackUrl = `${callbackBase}?${params.toString()}`;

    // The redirectUrl from Paystack init contains authorization_url.
    // We need to append our callback so Paystack knows where to go after payment.
    // NOTE: Paystack callback_url is set server-side in the init call.

    return (
        <div className="space-y-3 text-center">
            <p className="text-xs text-slate-500">
                You will be redirected to Paystack to complete your payment securely.
            </p>
            <button
                onClick={() => {
                    onInitiated();
                    window.location.href = redirectUrl;
                }}
                className="w-full py-3 px-6 rounded-xl bg-[#0aa5db] hover:bg-[#088ab8] text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
                <CreditCard className="h-4 w-4" />
                Continue to Paystack
            </button>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Status = 'loading' | 'select_gateway' | 'init_payment' | 'ready' | 'success' | 'error';

export default function MobileTopupPayment() {
    const { theme } = useTheme();
    const siteName = useSettingByKey('platform_name') || 'eSIM Connect';
    const lightLogo = useSettingByKey('logo');
    const darkLogo = useSettingByKey('dark_logo');
    const logo = theme === 'dark' ? (darkLogo || lightLogo) : lightLogo;

    const iccid = getParam('iccid');
    const orderId = getParam('orderId');
    const topupId = getParam('topupId');
    const packageId = getParam('packageId');
    const email = getParam('email');
    const token = getParam('token');
    const callbackScheme = getParam('callbackScheme') || 'simfinity';
    const preGatewayId = getParam('gatewayId'); // optional: pre-select a gateway

    const [status, setStatus] = useState<Status>('loading');
    const [error, setError] = useState('');
    const [gateways, setGateways] = useState<any[]>([]);
    const [selectedGateway, setSelectedGateway] = useState<any>(null);
    const [paymentConfig, setPaymentConfig] = useState<any>(null);
    const [stripePromise, setStripePromise] = useState<any>(null);
    const [successData, setSuccessData] = useState<any>(null);

    // Topup amount info for display
    const [topupInfo, setTopupInfo] = useState<{ amount: number; currency: string } | null>(null);

    // ── Step 1: load available gateways ────────────────────────────────────────
    useEffect(() => {
        if (!iccid || (!topupId && !packageId)) {
            setError('Missing required parameters (iccid, topupId/packageId)');
            setStatus('error');
            return;
        }

        const loadGateways = async () => {
            try {
                const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const res = await fetch('/api/payments/gateways', { headers });
                if (!res.ok) throw new Error('Failed to fetch gateways');
                const result = await res.json();
                const list: any[] = result.data || (Array.isArray(result) ? result : []);
                setGateways(list);

                // Auto-select if gatewayId is provided in URL
                if (preGatewayId) {
                    const found = list.find((g: any) => String(g.id) === String(preGatewayId));
                    if (found) {
                        setSelectedGateway(found);
                        setStatus('init_payment');
                        return;
                    }
                }

                setStatus(list.length > 0 ? 'select_gateway' : 'error');
                if (list.length === 0) setError('No payment gateways available');
            } catch (err: any) {
                setError(err.message || 'Failed to load payment gateways');
                setStatus('error');
            }
        };
        loadGateways();
    }, [iccid, orderId, topupId, packageId, preGatewayId, token]);

    // ── Step 2: init payment once gateway is selected ──────────────────────────
    useEffect(() => {
        if (status !== 'init_payment' || !selectedGateway) return;

        const initPayment = async () => {
            try {
                const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;

                // Paystack needs a callback URL that goes back to our backend
                const paystackCallbackUrl = `${window.location.origin}/api/payments/topup/paystack-callback?${new URLSearchParams({
                    iccid, orderId, topupId, packageId, callbackScheme,
                }).toString()}`;

                const res = await fetch('/api/payments/topup/init', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        gatewayId: selectedGateway.id,
                        packageId: packageId || topupId || orderId,
                        topupId,
                        iccid,
                        orderId,
                        email,
                        callbackUrl: paystackCallbackUrl
                    }),
                });

                const data = await res.json();
                if (!data?.success || !data?.payment) {
                    setError(data?.message || 'Failed to initialize payment');
                    setStatus('error');
                    return;
                }

                const cfg = data.payment;
                setTopupInfo({ amount: cfg.amount, currency: cfg.currency || 'USD' });
                setPaymentConfig(cfg);

                if (cfg.provider === 'stripe' && cfg.publicKey) {
                    setStripePromise(loadStripe(cfg.publicKey));
                }

                setStatus('ready');
            } catch (err: any) {
                setError(err.message || 'Payment initialization failed');
                setStatus('error');
            }
        };

        initPayment();
    }, [status, selectedGateway, iccid, orderId, topupId, packageId, email, token, callbackScheme]);

    // ── Handlers ───────────────────────────────────────────────────────────────

    const handleSuccess = (data: any) => {
        setSuccessData(data);
        setStatus('success');

        // Tell the Android app
        notifyNative('success', {
            iccid,
            orderId,
            topupId,
            message: 'Top-up successful',
            ...(data?.topup ? { topupRecordId: String(data.topup.id) } : {}),
        });
    };

    const handleError = (msg: string) => {
        setError(msg);
        setStatus('error');

        notifyNative('failure', {
            iccid,
            orderId,
            topupId,
            message: msg,
        });
    };

    // ── Render helpers ─────────────────────────────────────────────────────────

    const renderGatewayList = () => (
        <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Select a payment method
            </p>
            {gateways.map((gw: any) => (
                <button
                    key={gw.id}
                    onClick={() => {
                        setSelectedGateway(gw);
                        setStatus('init_payment');
                    }}
                    className="w-full flex items-center justify-between p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-emerald-500/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/5 transition-all group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-center transition-transform group-hover:scale-110">
                            {gw.provider === 'stripe' && <CreditCard className="w-5 h-5 text-indigo-500" />}
                            {gw.provider === 'razorpay' && <CreditCard className="w-5 h-5 text-blue-500" />}
                            {gw.provider === 'paypal' && <CreditCard className="w-5 h-5 text-blue-600" />}
                            {gw.provider === 'paystack' && <CreditCard className="w-5 h-5 text-emerald-500" />}
                        </div>
                        <div>
                            <span className="font-bold text-slate-800 dark:text-slate-100 block">
                                {gw.displayName || gw.provider}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Secure Gateway</span>
                        </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Loader2 className="w-4 h-4 text-emerald-500 animate-pulse" />
                    </div>
                </button>
            ))}
        </div>
    );

    const renderPaymentForm = () => {
        if (!paymentConfig) return null;

        const { provider } = paymentConfig;

        if (provider === 'stripe' && stripePromise && paymentConfig.clientSecret) {
            return (
                <Elements
                    key={paymentConfig.clientSecret}
                    stripe={stripePromise}
                    options={{
                        clientSecret: paymentConfig.clientSecret,
                        appearance: { theme: 'stripe' },
                    }}
                >
                    <StripePaymentForm
                        amount={paymentConfig.amount}
                        currency={paymentConfig.currency || 'USD'}
                        orderId={orderId}
                        iccid={iccid}
                        providerType="stripe"
                        onSuccess={handleSuccess}
                        onError={handleError}
                    />
                </Elements>
            );
        }

        if (provider === 'razorpay' && paymentConfig.orderId) {
            return (
                <RazorpayButton
                    rzpOrderId={paymentConfig.orderId}
                    amount={paymentConfig.amount}
                    currency={paymentConfig.currency || 'INR'}
                    publicKey={paymentConfig.publicKey}
                    onSuccess={handleSuccess}
                    onError={handleError}
                />
            );
        }

        if (provider === 'paypal' && paymentConfig.orderId) {
            return (
                <PayPalButton
                    ppOrderId={paymentConfig.orderId}
                    onSuccess={handleSuccess}
                    onError={handleError}
                />
            );
        }

        if (provider === 'paystack' && paymentConfig.redirectUrl) {
            return (
                <PaystackButton
                    redirectUrl={paymentConfig.redirectUrl}
                    reference={paymentConfig.orderId}
                    onInitiated={() => { }}
                />
            );
        }

        return (
            <p className="text-sm text-slate-500 text-center">
                Provider "{provider}" UI is not yet supported in mobile view. Please try on web.
            </p>
        );
    };

    // ── Full render ────────────────────────────────────────────────────────────

    return (
        <div
            className="min-h-screen flex flex-col"
            style={{
                background: 'radial-gradient(circle at top left, #1e293b 0%, #0f172a 100%)',
                fontFamily: "'Inter', system-ui, sans-serif",
            }}
        >
            {/* Header */}
            <div className="px-6 pt-12 pb-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-2xl opacity-40" />
                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center overflow-hidden border border-white/20 shadow-xl">
                            {logo ? (
                                <img src={logo} alt={siteName} className="w-full h-full object-contain p-1.5" />
                            ) : (
                                <Smartphone className="w-6 h-6 text-emerald-400" />
                            )}
                        </div>
                        <div>
                            <span className="font-extrabold text-xl tracking-tight block leading-tight">{siteName}</span>
                            <p className="text-emerald-400/80 text-[10px] font-bold uppercase tracking-widest mt-0.5">Secure Top-Up</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Card */}
            <div className="flex-1 px-4 pb-12">
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-7 space-y-7 border border-white/20 dark:border-slate-800/50">

                    {/* Amount badge */}
                    {topupInfo && (
                        <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 rounded-2xl p-5 flex items-center justify-between group transition-all hover:bg-emerald-500/10">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/70 dark:text-emerald-400/70 mb-1">Payment Amount</p>
                                <p className="text-3xl font-black text-slate-900 dark:text-white">
                                    <span className="text-lg font-medium mr-1 text-slate-500">{topupInfo.currency.toUpperCase()}</span>
                                    {topupInfo.amount.toFixed(2)}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">ICCID</p>
                                <p className="text-xs font-mono text-slate-500 dark:text-slate-400 tracking-tighter">
                                    ••••{iccid?.slice(-8)}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ── Status panels ── */}

                    {status === 'loading' && (
                        <div className="flex flex-col items-center py-10 gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                            <p className="text-sm text-slate-500">Loading payment options…</p>
                        </div>
                    )}

                    {status === 'init_payment' && (
                        <div className="flex flex-col items-center py-10 gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                            <p className="text-sm text-slate-500">Initializing payment…</p>
                        </div>
                    )}

                    {status === 'select_gateway' && renderGatewayList()}

                    {status === 'ready' && (
                        <div className="space-y-4">
                            {/* Back button */}
                            {!preGatewayId && (
                                <button
                                    onClick={() => {
                                        setPaymentConfig(null);
                                        setSelectedGateway(null);
                                        setStatus('select_gateway');
                                    }}
                                    className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                                >
                                    ← Change payment method
                                </button>
                            )}
                            {renderPaymentForm()}
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="flex flex-col items-center py-8 gap-4 text-center">
                            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                                <CheckCircle className="h-10 w-10 text-emerald-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                                    Top-Up Successful! 🎉
                                </h2>
                                <p className="text-sm text-slate-500 mt-1">
                                    Your data has been added to your eSIM. You can close this window.
                                </p>
                            </div>
                            <button
                                onClick={() => notifyNative('success', { iccid, orderId, topupId, message: 'close' })}
                                className="mt-2 py-2 px-6 rounded-xl bg-emerald-600 text-white text-sm font-semibold"
                            >
                                Close
                            </button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-col items-center py-8 gap-4 text-center">
                            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                                <XCircle className="h-10 w-10 text-red-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                                    Payment Failed
                                </h2>
                                <p className="text-sm text-red-500 mt-1 break-words">{error}</p>
                            </div>
                            <div className="flex gap-3 mt-2">
                                <button
                                    onClick={() => {
                                        setError('');
                                        setPaymentConfig(null);
                                        setSelectedGateway(null);
                                        setStatus('select_gateway');
                                    }}
                                    className="py-2 px-5 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium"
                                >
                                    Try Again
                                </button>
                                <button
                                    onClick={() => notifyNative('failure', { iccid, orderId, topupId, message: error })}
                                    className="py-2 px-5 rounded-xl bg-red-100 text-red-700 text-sm font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                </div>

                {/* Security note */}
                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center">
                    <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        Payments are securely processed. {siteName} never stores your card details.
                    </p>
                </div>
            </div>
        </div>
    );
}
