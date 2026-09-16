// Run: dart run tool/stripe_wallet_fixture.dart <fixture.html>
//      node test/stripe_wallet_flow_test.cjs <fixture.html>
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(process.argv[2], 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

async function fixture(mode = 'success') {
  const nodes = new Map();
  const handlers = {};
  let calls = 0;
  let finishPayment;
  const payment = new Promise(resolve => { finishPayment = resolve; });
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, {hidden: false, disabled: false, textContent: '', addEventListener(event, fn) {this[event] = fn;}});
    return nodes.get(id);
  };
  const element = {on: (event, fn) => {handlers[event] = fn;}, mount() {}, destroy() {}};
  const stripe = {elements: () => ({create: () => element}), confirmPayment: () => {calls++; return payment;}};
  const window = {Stripe: () => stripe, location: {href: ''}};
  const context = {window, Stripe: window.Stripe, URL, document: {getElementById: node}, setTimeout: () => 1, clearTimeout() {}};
  if (mode === 'initError') context.Stripe = () => {throw Error('invalid configuration');};
  vm.runInNewContext(script, context);
  await new Promise(setImmediate);
  return {nodes, handlers, window, calls: () => calls, finishPayment, submit: () => node('payment-form').submit({preventDefault() {}})};
}

(async () => {
  let f = await fixture();
  await f.submit();
  assert.equal(f.calls(), 0, 'must not charge before Stripe is ready');
  assert.equal(f.nodes.get('submit').disabled, true);
  f.handlers.ready();
  assert.equal(f.nodes.get('submit').disabled, false);
  const pending = f.submit();
  await f.submit();
  assert.equal(f.calls(), 1, 'double taps must not submit twice');
  f.finishPayment({paymentIntent: {id: 'pi_verified', status: 'succeeded'}});
  await pending;
  const returned = new URL(f.window.location.href);
  assert.equal(returned.searchParams.get('payment_intent'), 'pi_verified');
  assert.equal(returned.searchParams.get('redirect_status'), 'succeeded');

  f = await fixture(); f.handlers.ready();
  const declined = f.submit();
  f.finishPayment({error: {message: 'Your card was declined.'}}); await declined;
  assert.equal(f.nodes.get('error').textContent, 'Your card was declined.');
  assert.equal(f.nodes.get('submit').disabled, false);
  assert.equal(f.window.location.href, '');

  f = await fixture(); f.handlers.loaderror();
  assert.equal(f.nodes.get('retry').hidden, false);
  assert.equal(f.nodes.get('submit').disabled, true);
  f = await fixture('initError');
  assert.equal(f.nodes.get('error').hidden, false);
  assert.equal(f.nodes.get('retry').hidden, false);
  console.log('PASS: readiness, duplicate-submit guard, success return, decline recovery, and initialization errors');
})().catch(error => {console.error(error); process.exitCode = 1;});
