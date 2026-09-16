import 'dart:convert';

/// Stripe owns the card inputs. Never collect or send card details through Dart.
String buildStripeWalletPage({
  required String publicKey,
  required String clientSecret,
  required String returnUrl,
  required String amountLabel,
  required bool dark,
}) {
  String js(String value) => jsonEncode(value).replaceAll('<', r'\u003c');
  final amount = const HtmlEscape().convert(amountLabel);
  return '''<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<style>
:root{color-scheme:${dark ? 'dark' : 'light'};--bg:${dark ? '#070b1f' : '#f4f7fc'};--panel:${dark ? '#10162d' : '#ffffff'};--ink:${dark ? '#f7f8ff' : '#16213b'};--muted:${dark ? '#a9b2cd' : '#65718b'};--border:${dark ? '#28314f' : '#e0e7f1'};--accent:#4aa8ff}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:24px 20px 32px}main{max-width:480px;margin:auto}.eyebrow{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:700;letter-spacing:1.5px;color:var(--muted)}.mark{display:grid;place-items:center;width:28px;height:28px;border-radius:9px;background:#4aa8ff18;color:var(--accent)}h1{font-size:26px;letter-spacing:-.7px;line-height:1.2;margin:20px 0 8px}.intro{font-size:14px;line-height:1.6;color:var(--muted);margin:0 0 24px}.summary{padding:22px;border:1px solid var(--border);border-radius:20px;background:var(--panel);margin-bottom:18px}.summary-top{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--muted)}.badge{font-size:11px;color:var(--accent);background:#4aa8ff12;border:1px solid #4aa8ff35;border-radius:99px;padding:5px 9px}.amount{font-size:34px;font-weight:750;letter-spacing:-1px;margin:15px 0 18px}.summary-bottom{border-top:1px solid var(--border);padding-top:14px;display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--muted)}.summary-bottom strong{font-weight:600;color:var(--ink)}.payment-panel{border:1px solid var(--border);border-radius:20px;padding:22px;background:var(--panel)}.section-title{display:flex;justify-content:space-between;align-items:center;margin:0 0 18px;font-size:15px;font-weight:650}.stripe-label{font-size:11px;color:var(--muted);font-weight:400}.loading{padding:25px 8px;text-align:center;color:var(--muted);font-size:13px;line-height:1.7}.spinner{width:22px;height:22px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;margin:0 auto 12px;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}button{font:inherit;cursor:pointer}#submit{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:52px;border:0;border-radius:13px;margin-top:22px;background:var(--accent);color:#061426;font-size:15px;font-weight:700;transition:opacity .15s}#submit:disabled{opacity:.45;cursor:not-allowed}#error{color:${dark ? '#ffb7bc' : '#a52d3c'};background:${dark ? '#ff667712' : '#fff2f3'};border:1px solid #e8647533;border-radius:12px;padding:12px;font-size:13px;line-height:1.5;margin:16px 0 0}#retry{display:block;margin:12px auto 0;padding:10px 18px;border:1px solid var(--border);border-radius:10px;color:var(--ink);background:var(--panel);font-size:13px}.footnote{text-align:center;font-size:12px;line-height:1.6;color:var(--muted);margin:20px 8px 0}.footnote svg{vertical-align:-2px;margin-right:4px}#status{min-height:18px;text-align:center;font-size:12px;color:var(--muted);margin:12px 0 0}[hidden]{display:none!important}@media(prefers-reduced-motion:reduce){.spinner{animation:none}}
</style></head><body><main>
<div class="eyebrow"><span class="mark">G5</span> SECURE CHECKOUT</div>
<h1>Add funds to your wallet</h1><p class="intro">Review your top-up and enter your card details below.</p>
<section class="summary" aria-label="Top-up summary"><div class="summary-top"><span>Total to pay</span><span class="badge">Wallet top-up</span></div><div class="amount">$amount</div><div class="summary-bottom"><span>Payment method</span><strong>Credit or debit card</strong></div></section>
<section class="payment-panel"><h2 class="section-title">Card details <span class="stripe-label">Powered by Stripe</span></h2>
<div id="loading" class="loading" role="status"><div class="spinner"></div>Connecting securely to Stripe…</div>
<form id="payment-form"><div id="payment-element"></div><div id="error" role="alert" hidden></div><button id="submit" type="submit" disabled><span id="button-label">Loading secure payment…</span><span aria-hidden="true">&#8594;</span></button><p id="status" role="status" aria-live="polite"></p></form>
<button id="retry" type="button" hidden>Try connecting again</button></section>
<p class="footnote"><svg width="13" height="14" viewBox="0 0 16 18" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="2" y="7" width="12" height="9" rx="2"/><path d="M5 7V5a3 3 0 016 0v2"/></svg>Your card details are securely handled by Stripe.<br>Your wallet updates after payment is confirmed.</p>
</main><script>
(() => {
  const button = document.getElementById('submit');
  const buttonLabel = document.getElementById('button-label');
  const errorBox = document.getElementById('error');
  const retry = document.getElementById('retry');
  const loading = document.getElementById('loading');
  const status = document.getElementById('status');
  const amount = ${js(amountLabel)};
  let stripe, elements, paymentElement, timer;
  let ready = false, submitting = false, generation = 0;
  function showError(message, reconnect) {
    errorBox.textContent = message;
    errorBox.hidden = false;
    loading.hidden = true;
    status.textContent = '';
    retry.hidden = !reconnect;
    button.disabled = !ready || submitting;
    buttonLabel.textContent = ready ? 'Pay ' + amount : 'Payment unavailable';
  }
  function loadStripeScript() {
    if (window.Stripe) return Promise.resolve();
    return new Promise((resolve, reject) => {
      document.getElementById('stripe-script')?.remove();
      const script = document.createElement('script');
      script.id = 'stripe-script'; script.src = 'https://js.stripe.com/v3/';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Stripe could not be reached. Check your connection and try again.'));
      document.head.appendChild(script);
    });
  }
  async function initialize() {
    const attempt = ++generation;
    clearTimeout(timer);
    ready = false; button.disabled = true; errorBox.hidden = true;
    retry.hidden = true; loading.hidden = false;
    buttonLabel.textContent = 'Loading secure payment…';
    paymentElement?.destroy(); paymentElement = null;
    timer = setTimeout(() => {
      if (attempt !== generation || ready) return;
      ++generation;
      showError('The secure card form is taking too long to load. Check your connection and try again.', true);
    }, 20000);
    try {
      await loadStripeScript();
      if (attempt !== generation) return;
      stripe = Stripe(${js(publicKey)});
      elements = stripe.elements({clientSecret:${js(clientSecret)}, appearance:{theme:'${dark ? 'night' : 'stripe'}', variables:{colorPrimary:'#4aa8ff',colorBackground:'${dark ? '#10162d' : '#ffffff'}',colorText:'${dark ? '#f7f8ff' : '#16213b'}',colorDanger:'${dark ? '#ffb7bc' : '#a52d3c'}',borderRadius:'10px',fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'}}});
      paymentElement = elements.create('payment', {layout:'tabs'});
      paymentElement.on('ready', () => {
        if (attempt !== generation) return;
        clearTimeout(timer); ready = true; loading.hidden = true; errorBox.hidden = true;
        button.disabled = false; buttonLabel.textContent = 'Pay ' + amount;
      });
      paymentElement.on('loaderror', () => {
        if (attempt !== generation) return;
        clearTimeout(timer); ready = false;
        showError('The card form could not load. Try again or choose another payment method.', true);
      });
      paymentElement.mount('#payment-element');
    } catch (error) {
      if (attempt !== generation) return;
      clearTimeout(timer); ready = false;
      showError('Unable to load secure card payment. Check your connection or choose another payment method.', true);
    }
  }
  document.getElementById('payment-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!ready || submitting) return;
    submitting = true; button.disabled = true; errorBox.hidden = true; retry.hidden = true;
    buttonLabel.textContent = 'Processing securely…';
    status.textContent = 'Please keep this screen open.';
    try {
      const result = await stripe.confirmPayment({elements,confirmParams:{return_url:${js(returnUrl)}},redirect:'if_required'});
      if (result.error) {
        submitting = false;
        showError(result.error.message || 'Please check your card details and try again.', false);
        return;
      }
      if (result.paymentIntent && ['succeeded','processing','requires_capture'].includes(result.paymentIntent.status)) {
        status.textContent = 'Checking your payment with G5eSIM…';
        const url = new URL(${js(returnUrl)});
        url.searchParams.set('payment_intent',result.paymentIntent.id);
        url.searchParams.set('redirect_status',result.paymentIntent.status);
        window.location.href = url.toString();
        return;
      }
      submitting = false;
      showError('Payment needs another step. Please review your card details.', false);
    } catch (error) {
      submitting = false;
      showError('Payment could not be confirmed. Check your connection and payment status before trying again.', false);
    }
  });
  retry.addEventListener('click', initialize);
  initialize();
})();
</script></body></html>''';
}
