import 'dart:io';
import '../lib/utills/payments/stripe_wallet_page.dart';

void main(List<String> args) {
  File(args.single).writeAsStringSync(buildStripeWalletPage(
    publicKey: 'pk_test_example',
    clientSecret: 'pi_example_secret_example',
    returnUrl: 'https://example.com/mobile-wallet-topup-return',
    amountLabel: r'$25.00 USD',
    dark: true,
  ));
}
