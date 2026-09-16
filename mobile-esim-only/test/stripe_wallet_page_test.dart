import 'package:esimconnect/utills/payments/stripe_wallet_page.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('checkout escapes display text and script configuration', () {
    final html = buildStripeWalletPage(
      publicKey: 'pk_test_example',
      clientSecret: 'pi_example_secret_</script>',
      returnUrl: 'https://example.com/return',
      amountLabel: '<25 & USD>',
      dark: true,
    );
    expect(html, contains('&lt;25 &amp; USD&gt;'));
    expect(html, isNot(contains('pi_example_secret_</script>')));
    expect(html, contains(r'pi_example_secret_\u003c/script>'));
    expect(html, contains('type="submit" disabled'));
  });
}
