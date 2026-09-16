import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/utills/config.dart';
import 'package:esimconnect/utills/global.dart' as global;
import 'package:esimconnect/utills/services/ApiService.dart';
import 'package:esimconnect/views/packageModule/packagesList/model/GatewayListModel.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:sizer/sizer.dart';
import 'package:url_launcher/url_launcher.dart';

enum _WalletTopUpMode { payment, voucher }

class WalletTopUpPage extends StatelessWidget {
  const WalletTopUpPage({
    super.key,
    required this.symbol,
    required this.onWalletChanged,
  });

  final String symbol;
  final VoidCallback onWalletChanged;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.scaffoldbackgroudColor,
      body: WalletTopUpSheet(
        symbol: symbol,
        onWalletChanged: onWalletChanged,
        showHandle: false,
        safeTop: true,
      ),
    );
  }
}

class WalletTopUpSheet extends StatefulWidget {
  const WalletTopUpSheet({
    super.key,
    required this.symbol,
    required this.onWalletChanged,
    this.showHandle = true,
    this.safeTop = false,
  });

  final String symbol;
  final VoidCallback onWalletChanged;
  final bool showHandle;
  final bool safeTop;

  @override
  State<WalletTopUpSheet> createState() => _WalletTopUpSheetState();
}

class _WalletTopUpSheetState extends State<WalletTopUpSheet> {
  final ApiService _api = ApiService();
  final TextEditingController _amountController = TextEditingController(
    text: '25',
  );
  final TextEditingController _voucherController = TextEditingController();

  _WalletTopUpMode _mode = _WalletTopUpMode.payment;
  List<GatewayItem> _gateways = [];
  GatewayItem? _selectedGateway;
  bool _isLoadingGateways = false;
  bool _isSubmitting = false;

  String get _currency =>
      (global.activeCurrencyname?.isNotEmpty == true
              ? global.activeCurrencyname
              : 'USD')!
          .toUpperCase();

  double get _amount =>
      double.tryParse(_amountController.text.trim().replaceAll(',', '')) ?? 0;

  Color get _fieldBackgroundColor =>
      AppColors.isDarkMode ? AppColors.appSurfaceAlt : const Color(0xFFF8FAFA);

  Color get _fieldTextColor =>
      AppColors.isDarkMode ? AppColors.appTextPrimary : const Color(0xFF101828);

  Color get _fieldMutedTextColor =>
      AppColors.isDarkMode ? AppColors.appTextSecondary : Colors.black54;

  Color get _fieldBorderColor =>
      AppColors.isDarkMode ? AppColors.appBorder : const Color(0xFFE1E8E6);

  @override
  void initState() {
    super.initState();
    _loadWalletGateways();
  }

  @override
  void dispose() {
    _amountController.dispose();
    _voucherController.dispose();
    super.dispose();
  }

  Future<void> _loadWalletGateways() async {
    setState(() => _isLoadingGateways = true);

    try {
      var gateways = await _fetchWalletGateways(scoped: true);
      if (gateways.isEmpty) {
        gateways = await _fetchWalletGateways(scoped: false);
      }

      if (!mounted) return;
      setState(() {
        _gateways = gateways;
        _selectedGateway = gateways.isNotEmpty ? gateways.first : null;
        _isLoadingGateways = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _isLoadingGateways = false);
      _showMessage(_errorMessage(error, tr('Failed to load payment methods')));
    }
  }

  Future<List<GatewayItem>> _fetchWalletGateways({required bool scoped}) async {
    final response = await _api.get(
      ApiEndPoints.GATEWAYLIST,
      query: scoped
          ? {'currency': _currency, 'scope': 'wallet'}
          : {'currency': _currency},
    );
    final model = GatewayListModel.fromJson(_mapFrom(response));
    return (model.data ?? [])
        .where((gateway) => gateway.id?.isNotEmpty == true)
        .toList();
  }

  Future<void> _redeemVoucher() async {
    final code = _voucherController.text.trim();
    if (code.isEmpty) {
      _showMessage(tr('Enter voucher code'));
      return;
    }

    FocusScope.of(context).unfocus();
    setState(() => _isSubmitting = true);

    try {
      final response = await _api.post(
        ApiEndPoints.WALLET_REDEEM_VOUCHER,
        data: {'code': code},
      );

      if (_isSuccess(response)) {
        _showMessage(_messageFrom(response, tr('Voucher redeemed')));
        widget.onWalletChanged();
        if (mounted) Navigator.of(context).pop();
      } else {
        _showMessage(
          _messageFrom(response, tr('Voucher could not be redeemed')),
        );
      }
    } catch (error) {
      _showMessage(_errorMessage(error, tr('Voucher could not be redeemed')));
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Future<void> _scanVoucherCode() async {
    final scannedValue = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const WalletVoucherQrScannerScreen()),
    );

    if (!mounted || scannedValue == null || scannedValue.trim().isEmpty) {
      return;
    }

    final code = _voucherCodeFromScan(scannedValue);
    if (code == null) {
      _showMessage(tr('No voucher code found in QR code'));
      return;
    }

    _voucherController.text = code;
    _voucherController.selection = TextSelection.collapsed(offset: code.length);
    await _redeemVoucher();
  }

  Future<void> _startGatewayTopUp() async {
    final gateway = _selectedGateway;
    if (gateway == null) {
      _showMessage(tr('Select a payment method'));
      return;
    }

    if (_amount < 1) {
      _showMessage(tr('Enter an amount of at least 1'));
      return;
    }

    FocusScope.of(context).unfocus();
    setState(() => _isSubmitting = true);

    try {
      final response = await _api.post(
        ApiEndPoints.WALLET_TOPUP_INIT,
        data: {
          'amount': _amount,
          'currency': _currency,
          'gatewayId': gateway.id,
          'returnUrl': '${socketbaseUrl}mobile-wallet-topup-return',
          'cancelUrl': '${socketbaseUrl}mobile-wallet-topup-cancel',
          'walletPath': '/mobile-wallet-topup-return',
        },
      );

      if (!_isSuccess(response)) {
        _showMessage(_messageFrom(response, tr('Top-up could not be started')));
        return;
      }

      final data = _mapFrom(_mapFrom(response)['data']);
      final payment = _mapFrom(data['payment']);
      final transactionId = (data['transactionId'] ?? '').toString();
      final provider = _normalizeProvider(
        payment['provider'] ?? gateway.provider ?? '',
      );

      final request = _buildPaymentRequest(
        provider: provider,
        payment: payment,
        transactionId: transactionId,
      );

      if (request == null) {
        _showMessage(tr('This payment method is not ready on mobile'));
        return;
      }

      if (!mounted) return;
      final completed = await Navigator.of(context).push<bool>(
        MaterialPageRoute(
          builder: (_) => WalletPaymentWebView(
            title: _providerTitle(provider),
            initialUrl: request.initialUrl,
            provider: provider,
            walletTransactionId: transactionId,
            providerPaymentId: request.providerPaymentId,
          ),
        ),
      );

      if (completed == true && mounted) {
        widget.onWalletChanged();
        Navigator.of(context).pop();
      }
    } catch (error) {
      _showMessage(_errorMessage(error, tr('Top-up could not be started')));
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  _WalletPaymentRequest? _buildPaymentRequest({
    required String provider,
    required Map<String, dynamic> payment,
    required String transactionId,
  }) {
    if (provider == 'stripe') {
      final clientSecret = (payment['clientSecret'] ?? '').toString();
      final publicKey = (payment['publicKey'] ?? '').toString();
      final paymentIntentId = (payment['paymentIntentId'] ?? '').toString();
      if (clientSecret.isEmpty ||
          publicKey.isEmpty ||
          paymentIntentId.isEmpty) {
        return null;
      }

      final returnUrl = Uri.parse('${socketbaseUrl}mobile-wallet-topup-return')
          .replace(
            queryParameters: {
              'walletProvider': provider,
              'walletTransactionId': transactionId,
              'payment_intent': paymentIntentId,
            },
          )
          .toString();

      return _WalletPaymentRequest(
        initialUrl: _htmlUrl(
          _buildStripeHtml(
            publicKey: publicKey,
            clientSecret: clientSecret,
            returnUrl: returnUrl,
            amount: _amount,
            currency: _currency,
          ),
        ),
        providerPaymentId: paymentIntentId,
      );
    }

    if (provider == 'paypal') {
      final approvalUrl = (payment['approvalUrl'] ?? '').toString();
      final orderId = (payment['orderId'] ?? '').toString();
      if (approvalUrl.isEmpty || orderId.isEmpty) {
        return null;
      }
      return _WalletPaymentRequest(
        initialUrl: approvalUrl,
        providerPaymentId: orderId,
      );
    }

    if (provider == 'ayamerchant') {
      final redirectUrl = (payment['redirectUrl'] ?? '').toString();
      final orderId = (payment['orderId'] ?? transactionId).toString();
      if (redirectUrl.isEmpty) return null;
      return _WalletPaymentRequest(
        initialUrl: redirectUrl,
        providerPaymentId: orderId,
      );
    }

    if (provider == 'paystack') {
      final redirectUrl =
          (payment['authorizationUrl'] ??
                  payment['authorization_url'] ??
                  payment['redirectUrl'] ??
                  payment['paymentUrl'] ??
                  '')
              .toString();
      final reference =
          (payment['reference'] ?? payment['orderId'] ?? transactionId)
              .toString();
      if (redirectUrl.isEmpty) return null;
      return _WalletPaymentRequest(
        initialUrl: redirectUrl,
        providerPaymentId: reference,
      );
    }

    if (provider == 'nowpayments' || provider == 'cryptomus') {
      final paymentId = (payment['paymentId'] ?? payment['orderId'] ?? '')
          .toString();
      final paymentUrl = (payment['paymentUrl'] ?? '').toString();
      return _WalletPaymentRequest(
        initialUrl: paymentUrl.isNotEmpty
            ? paymentUrl
            : _htmlUrl(_buildCryptoHtml(provider: provider, payment: payment)),
        providerPaymentId: paymentId,
      );
    }

    final redirectUrl =
        (payment['redirectUrl'] ??
                payment['paymentUrl'] ??
                payment['checkoutUrl'] ??
                payment['url'] ??
                '')
            .toString();
    final providerPaymentId =
        (payment['paymentId'] ??
                payment['orderId'] ??
                payment['reference'] ??
                transactionId)
            .toString();
    if (redirectUrl.isNotEmpty) {
      return _WalletPaymentRequest(
        initialUrl: redirectUrl,
        providerPaymentId: providerPaymentId,
      );
    }

    return null;
  }

  String _buildStripeHtml({
    required String publicKey,
    required String clientSecret,
    required String returnUrl,
    required double amount,
    required String currency,
  }) {
    final amountLabel =
        '${widget.symbol}${amount.toStringAsFixed(2)} $currency';
    return '''
<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script src="https://js.stripe.com/v3/"></script>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f5f7f8;
      color: #162b2a;
      padding: 18px;
    }
    .panel {
      background: #ffffff;
      border: 1px solid #e2e8e8;
      border-radius: 8px;
      padding: 18px;
      box-shadow: 0 10px 28px rgba(6, 64, 43, 0.08);
    }
    h1 { margin: 0 0 4px; font-size: 22px; line-height: 1.2; }
    .amount { color: #2b8e7f; font-weight: 700; margin-bottom: 18px; }
    button {
      width: 100%;
      min-height: 48px;
      border: 0;
      border-radius: 8px;
      margin-top: 18px;
      background: #06402b;
      color: #ffffff;
      font-size: 16px;
      font-weight: 700;
    }
    button:disabled { opacity: .65; }
    #error { color: #b42318; margin-top: 12px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="panel">
    <h1>${tr('Card Top-Up')}</h1>
    <div class="amount">$amountLabel</div>
    <form id="payment-form">
      <div id="payment-element"></div>
      <button id="submit">${tr('Pay Now')}</button>
      <div id="error"></div>
    </form>
  </div>
  <script>
    const stripe = Stripe(${jsonEncode(publicKey)});
    const elements = stripe.elements({ clientSecret: ${jsonEncode(clientSecret)} });
    elements.create("payment").mount("#payment-element");
    const form = document.getElementById("payment-form");
    const button = document.getElementById("submit");
    const errorBox = document.getElementById("error");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      button.disabled = true;
      errorBox.textContent = "";
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: ${jsonEncode(returnUrl)} },
        redirect: "if_required"
      });
      if (result.error) {
        errorBox.textContent = result.error.message || "Payment failed";
        button.disabled = false;
        return;
      }
      if (result.paymentIntent) {
        const url = new URL(${jsonEncode(returnUrl)});
        url.searchParams.set("payment_intent", result.paymentIntent.id);
        url.searchParams.set("redirect_status", result.paymentIntent.status);
        window.location.href = url.toString();
      }
    });
  </script>
</body>
</html>
''';
  }

  String _buildCryptoHtml({
    required String provider,
    required Map<String, dynamic> payment,
  }) {
    final payAmount = (payment['payAmount'] ?? '').toString();
    final payCurrency = (payment['payCurrency'] ?? '').toString().toUpperCase();
    final network = (payment['network'] ?? '').toString();
    final address = (payment['payAddress'] ?? '').toString();
    final qrCode = (payment['qrCode'] ?? '').toString();

    return '''
<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f5f7f8;
      color: #162b2a;
      padding: 18px;
    }
    .panel {
      background: #ffffff;
      border: 1px solid #e2e8e8;
      border-radius: 8px;
      padding: 18px;
      box-shadow: 0 10px 28px rgba(6, 64, 43, 0.08);
    }
    h1 { margin: 0 0 14px; font-size: 22px; line-height: 1.2; }
    .label { color: #64706f; font-size: 13px; margin-top: 14px; }
    .value {
      margin-top: 6px;
      padding: 12px;
      border-radius: 8px;
      background: #f1f5f4;
      font-size: 15px;
      font-weight: 700;
      word-break: break-word;
    }
    img { width: 172px; height: 172px; margin: 12px auto 2px; display: block; }
  </style>
</head>
<body>
  <div class="panel">
    <h1>${_providerTitle(provider)}</h1>
    ${qrCode.isNotEmpty ? '<img src="$qrCode" />' : ''}
    <div class="label">${tr('Amount')}</div>
    <div class="value">$payAmount $payCurrency</div>
    <div class="label">${tr('Network')}</div>
    <div class="value">$network</div>
    <div class="label">${tr('Address')}</div>
    <div class="value">$address</div>
  </div>
</body>
</html>
''';
  }

  String _htmlUrl(String html) {
    return Uri.dataFromString(
      html,
      mimeType: 'text/html',
      encoding: utf8,
    ).toString();
  }

  Map<String, dynamic> _mapFrom(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return Map<String, dynamic>.from(value);
    return {};
  }

  bool _isSuccess(dynamic response) {
    return response is Map && response['success'] == true;
  }

  String _messageFrom(dynamic response, String fallback) {
    if (response is Map && response['message'] != null) {
      return response['message'].toString();
    }
    return fallback;
  }

  String _errorMessage(Object error, String fallback) {
    if (error is DioException) {
      return error.message ?? fallback;
    }
    return fallback;
  }

  void _showMessage(String message) {
    global.showToastMessage(message: message);
  }

  void _setAmount(num value) {
    final text = value.toStringAsFixed(0);
    _amountController.text = text;
    _amountController.selection = TextSelection.collapsed(offset: text.length);
    setState(() {});
  }

  String? _voucherCodeFromScan(String value) {
    final scanned = value.trim();
    final uri = Uri.tryParse(scanned);
    final queryCode =
        uri?.queryParameters['code'] ??
        uri?.queryParameters['voucherCode'] ??
        uri?.queryParameters['voucher_code'] ??
        uri?.queryParameters['voucher'];
    final source = queryCode?.trim().isNotEmpty == true ? queryCode! : scanned;
    final match = RegExp(
      r'(\d{4})[-\s]?(\d{4})[-\s]?(\d{4})[-\s]?(\d{4})',
    ).firstMatch(source);

    if (match == null) return null;

    return '${match.group(1)}-${match.group(2)}-${match.group(3)}-${match.group(4)}';
  }

  String _normalizeProvider(dynamic provider) {
    final value = provider.toString().trim().toLowerCase();
    switch (value) {
      case 'aya merchant':
      case 'aya_merchant':
        return 'ayamerchant';
      case 'now payments':
      case 'now_payments':
        return 'nowpayments';
      default:
        return value;
    }
  }

  IconData _gatewayIcon(String? provider) {
    switch (_normalizeProvider(provider ?? '')) {
      case 'stripe':
        return Icons.credit_card_rounded;
      case 'paypal':
        return Icons.account_balance_wallet_outlined;
      case 'ayamerchant':
      case 'paystack':
        return Icons.payments_outlined;
      case 'nowpayments':
      case 'cryptomus':
        return Icons.currency_exchange_rounded;
      default:
        return Icons.payment_rounded;
    }
  }

  String _providerTitle(String provider) {
    switch (_normalizeProvider(provider)) {
      case 'stripe':
        return tr('Card Payment');
      case 'paypal':
        return tr('PayPal');
      case 'ayamerchant':
        return tr('AYAMERCHANT');
      case 'paystack':
        return tr('Paystack');
      case 'nowpayments':
        return tr('USDT');
      case 'cryptomus':
        return tr('Cryptomus');
      default:
        return provider.trim().isEmpty ? tr('Payment') : provider;
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomPadding = MediaQuery.of(context).viewInsets.bottom;

    return SafeArea(
      top: widget.safeTop,
      child: Padding(
        padding: EdgeInsets.only(
          left: 5.w,
          right: 5.w,
          top: 4.w,
          bottom: bottomPadding + 4.w,
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (widget.showHandle) ...[
                Center(
                  child: Container(
                    width: 13.w,
                    height: 0.9.w,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
                SizedBox(height: 4.w),
              ] else
                SizedBox(height: 2.w),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'Top-Up Wallet',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: AppColors.textColor,
                        fontSize: 18.sp,
                        fontWeight: FontWeight.normal,
                      ),
                    ).tr(),
                  ),
                  IconButton(
                    tooltip: tr('Close'),
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close_rounded),
                  ),
                ],
              ),
              SizedBox(height: 3.w),
              _buildModeSwitch(context),
              SizedBox(height: 4.w),
              if (_mode == _WalletTopUpMode.payment)
                _buildPaymentPanel(context)
              else
                _buildVoucherPanel(context),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildModeSwitch(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(0.8.w),
      decoration: BoxDecoration(
        color: _fieldBackgroundColor,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: _fieldBorderColor),
      ),
      child: Row(
        children: [
          _buildModeButton(
            context,
            icon: Icons.payment_rounded,
            label: tr('Payment'),
            mode: _WalletTopUpMode.payment,
          ),
          _buildModeButton(
            context,
            icon: Icons.confirmation_number_outlined,
            label: tr('Voucher'),
            mode: _WalletTopUpMode.voucher,
          ),
        ],
      ),
    );
  }

  Widget _buildModeButton(
    BuildContext context, {
    required IconData icon,
    required String label,
    required _WalletTopUpMode mode,
  }) {
    final selected = _mode == mode;

    return Expanded(
      child: Material(
        color: selected
            ? AppColors.primaryColor.withOpacity(0.16)
            : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
        child: InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: () => setState(() => _mode = mode),
          child: Padding(
            padding: EdgeInsets.symmetric(vertical: 2.8.w),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  icon,
                  size: 15.sp,
                  color: selected
                      ? AppColors.primaryColor
                      : _fieldMutedTextColor,
                ),
                SizedBox(width: 2.w),
                Text(
                  label,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: selected
                        ? AppColors.primaryColor
                        : _fieldMutedTextColor,
                    fontSize: 16.sp,
                    fontWeight: FontWeight.normal,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPaymentPanel(BuildContext context) {
    final canSubmit = !_isSubmitting && !_isLoadingGateways;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Amount',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: AppColors.textColor,
            fontSize: 16.sp,
            fontWeight: FontWeight.normal,
          ),
        ).tr(),
        SizedBox(height: 2.w),
        TextField(
          controller: _amountController,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          inputFormatters: [
            FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
          ],
          onChanged: (_) => setState(() {}),
          style: TextStyle(
            color: _fieldTextColor,
            fontSize: 28.sp,
            fontWeight: FontWeight.normal,
          ),
          decoration: InputDecoration(
            prefixText: '${widget.symbol} ',
            suffixText: _currency,
            prefixStyle: TextStyle(
              color: _fieldMutedTextColor,
              fontSize: 28.sp,
              fontWeight: FontWeight.normal,
            ),
            suffixStyle: TextStyle(
              color: _fieldMutedTextColor,
              fontSize: 16.sp,
              fontWeight: FontWeight.normal,
            ),
            filled: true,
            fillColor: _fieldBackgroundColor,
            contentPadding: EdgeInsets.symmetric(
              horizontal: 4.w,
              vertical: 3.8.w,
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: _fieldBorderColor),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: _fieldBorderColor),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: AppColors.primaryColor, width: 1.5),
            ),
          ),
        ),
        SizedBox(height: 3.w),
        Wrap(
          spacing: 2.w,
          runSpacing: 2.w,
          children: [10, 25, 50, 100]
              .map(
                (amount) => ActionChip(
                  label: Text('${widget.symbol}$amount'),
                  labelStyle: TextStyle(
                    color: _fieldTextColor,
                    fontSize: 16.sp,
                    fontWeight: FontWeight.normal,
                  ),
                  backgroundColor: AppColors.primaryColor.withOpacity(0.12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                    side: BorderSide(
                      color: AppColors.primaryColor.withOpacity(0.2),
                    ),
                  ),
                  onPressed: () => _setAmount(amount),
                ),
              )
              .toList(),
        ),
        SizedBox(height: 5.w),
        Text(
          'Payment Method',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: AppColors.textColor,
            fontSize: 16.sp,
            fontWeight: FontWeight.normal,
          ),
        ).tr(),
        SizedBox(height: 2.w),
        if (_isLoadingGateways)
          Padding(
            padding: EdgeInsets.symmetric(vertical: 6.w),
            child: const Center(child: CircularProgressIndicator.adaptive()),
          )
        else if (_gateways.isEmpty)
          _buildEmptyGateways(context)
        else
          Column(
            children: _gateways
                .map((gateway) => _buildGatewayTile(context, gateway))
                .toList(),
          ),
        SizedBox(height: 4.w),
        SizedBox(
          width: double.infinity,
          height: 48,
          child: Material(
            color: canSubmit
                ? AppColors.appAccentBlue
                : AppColors.appAccentBlue.withOpacity(0.5),
            borderRadius: BorderRadius.circular(6),
            child: InkWell(
              borderRadius: BorderRadius.circular(6),
              onTap: canSubmit ? _startGatewayTopUp : null,
              child: Center(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (_isSubmitting)
                      SizedBox(
                        height: 16,
                        width: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.whiteColor,
                        ),
                      )
                    else
                      Icon(
                        Icons.add_card_rounded,
                        color: Colors.white,
                        size: 17.sp,
                      ),
                    SizedBox(width: 2.w),
                    Text(
                      _isSubmitting ? tr('Processing') : tr('Continue Top-Up'),
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16.sp,
                        fontWeight: FontWeight.normal,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildVoucherPanel(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Voucher Code',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: AppColors.textColor,
            fontSize: 16.sp,
            fontWeight: FontWeight.normal,
          ),
        ).tr(),
        SizedBox(height: 2.w),
        TextField(
          controller: _voucherController,
          textCapitalization: TextCapitalization.characters,
          inputFormatters: [
            FilteringTextInputFormatter.allow(RegExp(r'[A-Za-z0-9-]')),
          ],
          style: TextStyle(
            color: _fieldTextColor,
            fontSize: 15.sp,
            fontWeight: FontWeight.normal,
          ),
          decoration: InputDecoration(
            hintText: tr('Enter code'),
            hintStyle: TextStyle(color: _fieldMutedTextColor),
            prefixIcon: Icon(
              Icons.confirmation_number_outlined,
              color: _fieldMutedTextColor,
            ),
            filled: true,
            fillColor: _fieldBackgroundColor,
            contentPadding: EdgeInsets.symmetric(
              horizontal: 4.w,
              vertical: 3.8.w,
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: _fieldBorderColor),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: _fieldBorderColor),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: AppColors.primaryColor, width: 1.5),
            ),
          ),
        ),
        SizedBox(height: 3.w),
        SizedBox(
          width: double.infinity,
          height: 48,
          child: OutlinedButton.icon(
            onPressed: _isSubmitting ? null : _scanVoucherCode,
            icon: const Icon(Icons.qr_code_scanner_rounded),
            label: Text(
              tr('Scan QR Code'),
              style: TextStyle(fontSize: 16.sp, fontWeight: FontWeight.normal),
            ),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.primaryColor,
              side: BorderSide(color: AppColors.primaryColor.withOpacity(0.55)),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
        ),
        SizedBox(height: 3.w),
        SizedBox(
          width: double.infinity,
          height: 48,
          child: ElevatedButton.icon(
            onPressed: _isSubmitting ? null : _redeemVoucher,
            icon: _isSubmitting
                ? SizedBox(
                    height: 16,
                    width: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppColors.whiteColor,
                    ),
                  )
                : const Icon(Icons.redeem_rounded),
            label: Text(
              _isSubmitting ? tr('Processing') : tr('Redeem Code'),
              style: TextStyle(fontSize: 16.sp, fontWeight: FontWeight.normal),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.secondaryColor,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildGatewayTile(BuildContext context, GatewayItem gateway) {
    final selected = gateway.id == _selectedGateway?.id;
    final provider = _normalizeProvider(gateway.provider ?? '');

    return Container(
      margin: EdgeInsets.only(bottom: 2.5.w),
      decoration: BoxDecoration(
        color: selected
            ? AppColors.primaryColor.withOpacity(0.14)
            : _fieldBackgroundColor,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: selected ? AppColors.primaryColor : _fieldBorderColor,
          width: selected ? 1.4 : 1,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: () => setState(() => _selectedGateway = gateway),
          child: Padding(
            padding: EdgeInsets.all(3.2.w),
            child: Row(
              children: [
                Container(
                  height: 11.w,
                  width: 11.w,
                  decoration: BoxDecoration(
                    color: AppColors.primaryColor.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    _gatewayIcon(provider),
                    color: AppColors.primaryColor,
                    size: 18.sp,
                  ),
                ),
                SizedBox(width: 3.w),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        gateway.displayName ?? _providerTitle(provider),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: _fieldTextColor,
                          fontSize: 12.5.sp,
                          fontWeight: FontWeight.normal,
                        ),
                      ),
                      SizedBox(height: 0.7.w),
                      Text(
                        _providerTitle(provider),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: _fieldMutedTextColor,
                          fontSize: 10.5.sp,
                          fontWeight: FontWeight.normal,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(
                  selected ? Icons.check_circle_rounded : Icons.circle_outlined,
                  color: selected
                      ? AppColors.primaryColor
                      : _fieldMutedTextColor,
                  size: 18.sp,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyGateways(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(4.w),
      decoration: BoxDecoration(
        color: _fieldBackgroundColor,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: _fieldBorderColor),
      ),
      child: Row(
        children: [
          Icon(Icons.credit_card_off_rounded, color: _fieldMutedTextColor),
          SizedBox(width: 3.w),
          Expanded(
            child: Text(
              'No payment methods available',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: _fieldMutedTextColor,
                fontSize: 16.sp,
                fontWeight: FontWeight.normal,
              ),
            ).tr(),
          ),
        ],
      ),
    );
  }
}

class _WalletPaymentRequest {
  const _WalletPaymentRequest({
    required this.initialUrl,
    required this.providerPaymentId,
  });

  final String initialUrl;
  final String providerPaymentId;
}

class WalletPaymentWebView extends StatefulWidget {
  const WalletPaymentWebView({
    super.key,
    required this.title,
    required this.initialUrl,
    required this.provider,
    required this.walletTransactionId,
    required this.providerPaymentId,
  });

  final String title;
  final String initialUrl;
  final String provider;
  final String walletTransactionId;
  final String providerPaymentId;

  @override
  State<WalletPaymentWebView> createState() => _WalletPaymentWebViewState();
}

class _WalletPaymentWebViewState extends State<WalletPaymentWebView> {
  final ApiService _api = ApiService();
  bool _isConfirming = false;

  Future<void> _confirmPayment([String? url]) async {
    if (_isConfirming) return;

    final providerPaymentId = _providerReferenceFromUrl(url);
    if (providerPaymentId.isEmpty && widget.walletTransactionId.isEmpty) {
      global.showToastMessage(message: tr('Payment reference is missing'));
      return;
    }

    setState(() => _isConfirming = true);

    try {
      final body = <String, dynamic>{
        'providerType': widget.provider,
        'walletTransactionId': widget.walletTransactionId,
      };

      switch (widget.provider) {
        case 'stripe':
          body['paymentIntentId'] = providerPaymentId;
          break;
        case 'paypal':
        case 'ayamerchant':
        case 'paystack':
          body['orderId'] = providerPaymentId;
          break;
        case 'nowpayments':
        case 'cryptomus':
          body['paymentId'] = providerPaymentId;
          break;
        default:
          body['providerPaymentId'] = providerPaymentId;
      }

      final response = await _api.post(
        ApiEndPoints.WALLET_TOPUP_CONFIRM,
        data: body,
      );

      if (response is Map && response['success'] == true) {
        global.showToastMessage(
          message: (response['message'] ?? tr('Wallet top-up completed'))
              .toString(),
        );
        if (mounted) Navigator.of(context).pop(true);
      } else {
        global.showToastMessage(
          message: response is Map && response['message'] != null
              ? response['message'].toString()
              : tr('Payment is not completed yet'),
        );
      }
    } catch (error) {
      global.showToastMessage(
        message: error is DioException
            ? (error.message ?? tr('Payment confirmation failed'))
            : tr('Payment confirmation failed'),
      );
    } finally {
      if (mounted) setState(() => _isConfirming = false);
    }
  }

  String _providerReferenceFromUrl(String? url) {
    final parsed = url == null ? null : Uri.tryParse(url);
    final query = parsed?.queryParameters ?? const <String, String>{};

    switch (widget.provider) {
      case 'stripe':
        return query['payment_intent'] ?? widget.providerPaymentId;
      case 'paypal':
        return query['token'] ?? query['orderId'] ?? widget.providerPaymentId;
      case 'ayamerchant':
        return query['orderId'] ?? widget.providerPaymentId;
      case 'paystack':
        return query['reference'] ??
            query['trxref'] ??
            widget.providerPaymentId;
      default:
        return query['paymentId'] ??
            query['providerPaymentId'] ??
            widget.providerPaymentId;
    }
  }

  bool _isReturnUrl(String url) {
    final value = url.toLowerCase();
    return value.contains('mobile-wallet-topup-return') ||
        value.contains('wallet-topup-return');
  }

  bool _isCancelUrl(String url) {
    final value = url.toLowerCase();
    return value.contains('mobile-wallet-topup-cancel') ||
        value.contains('wallet-topup-cancel');
  }

  Future<NavigationActionPolicy> _handleUrl(String url) async {
    if (_isReturnUrl(url)) {
      await _confirmPayment(url);
      return NavigationActionPolicy.CANCEL;
    }

    if (_isCancelUrl(url)) {
      global.showToastMessage(message: tr('Payment cancelled'));
      if (mounted) Navigator.of(context).pop(false);
      return NavigationActionPolicy.CANCEL;
    }

    if (url.startsWith('http') ||
        url.startsWith('https') ||
        url.startsWith('data:') ||
        url.startsWith('about:')) {
      return NavigationActionPolicy.ALLOW;
    }

    final uri = Uri.tryParse(url);
    if (uri != null) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
    return NavigationActionPolicy.CANCEL;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.scaffoldbackgroudColor,
      appBar: AppBar(
        title: Text(
          widget.title,
          style: const TextStyle(fontWeight: FontWeight.normal),
        ),
        actions: [
          IconButton(
            tooltip: tr('Check Payment'),
            onPressed: _isConfirming ? null : () => _confirmPayment(),
            icon: _isConfirming
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.check_circle_outline_rounded),
          ),
        ],
      ),
      body: InAppWebView(
        initialUrlRequest: URLRequest(url: WebUri(widget.initialUrl)),
        initialSettings: InAppWebViewSettings(
          cacheEnabled: true,
          javaScriptEnabled: true,
          javaScriptCanOpenWindowsAutomatically: true,
          useShouldOverrideUrlLoading: true,
          userAgent:
              'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36',
        ),
        shouldOverrideUrlLoading: (controller, navigationAction) async {
          final url = navigationAction.request.url.toString();
          return _handleUrl(url);
        },
        onLoadStop: (controller, url) async {
          final currentUrl = url.toString();
          if (_isReturnUrl(currentUrl) && !_isConfirming) {
            await _confirmPayment(currentUrl);
          }
        },
      ),
    );
  }
}

class WalletVoucherQrScannerScreen extends StatefulWidget {
  const WalletVoucherQrScannerScreen({super.key});

  @override
  State<WalletVoucherQrScannerScreen> createState() =>
      _WalletVoucherQrScannerScreenState();
}

class _WalletVoucherQrScannerScreenState
    extends State<WalletVoucherQrScannerScreen> {
  late final MobileScannerController _controller;
  bool _hasResult = false;

  @override
  void initState() {
    super.initState();
    _controller = MobileScannerController(
      detectionSpeed: DetectionSpeed.noDuplicates,
      formats: const [BarcodeFormat.qrCode],
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _handleDetect(BarcodeCapture capture) async {
    if (_hasResult) return;

    String? rawValue;
    for (final barcode in capture.barcodes) {
      final value = barcode.rawValue;
      if (value != null && value.trim().isNotEmpty) {
        rawValue = value;
        break;
      }
    }

    if (rawValue == null) return;

    _hasResult = true;
    await _controller.stop();
    if (mounted) Navigator.of(context).pop(rawValue);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text(
          tr('Scan Top-Up QR'),
          style: const TextStyle(fontWeight: FontWeight.normal),
        ),
        actions: [
          ValueListenableBuilder<MobileScannerState>(
            valueListenable: _controller,
            builder: (context, state, child) {
              final torchAvailable = state.torchState != TorchState.unavailable;
              final torchOn = state.torchState == TorchState.on;

              return IconButton(
                tooltip: tr('Flash'),
                onPressed: torchAvailable ? _controller.toggleTorch : null,
                icon: Icon(
                  torchOn ? Icons.flash_on_rounded : Icons.flash_off_rounded,
                ),
              );
            },
          ),
          IconButton(
            tooltip: tr('Switch Camera'),
            onPressed: () => _controller.switchCamera(),
            icon: const Icon(Icons.cameraswitch_rounded),
          ),
        ],
      ),
      body: Stack(
        fit: StackFit.expand,
        children: [
          MobileScanner(
            controller: _controller,
            fit: BoxFit.cover,
            onDetect: _handleDetect,
            placeholderBuilder: (context) => const Center(
              child: CircularProgressIndicator(color: Colors.white),
            ),
            errorBuilder: (context, error) => _ScannerMessage(
              icon: Icons.no_photography_outlined,
              title: tr('Camera unavailable'),
              message:
                  error.errorDetails?.message ??
                  tr('Allow camera access to scan wallet top-up QR codes.'),
            ),
          ),
          _ScannerOverlay(
            title: tr('Scan wallet voucher'),
            subtitle: tr('Place the QR code inside the frame'),
          ),
        ],
      ),
    );
  }
}

class _ScannerOverlay extends StatelessWidget {
  const _ScannerOverlay({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Container(
        color: Colors.black.withOpacity(0.22),
        child: Column(
          children: [
            const Spacer(),
            Container(
              width: 72.w,
              height: 72.w,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.white, width: 2),
              ),
              child: Stack(
                children: [
                  _ScannerCorner(alignment: Alignment.topLeft),
                  _ScannerCorner(alignment: Alignment.topRight),
                  _ScannerCorner(alignment: Alignment.bottomLeft),
                  _ScannerCorner(alignment: Alignment.bottomRight),
                  Center(
                    child: Container(
                      height: 2,
                      margin: EdgeInsets.symmetric(horizontal: 8.w),
                      color: AppColors.primaryColor,
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(height: 5.w),
            Container(
              width: double.infinity,
              margin: EdgeInsets.symmetric(horizontal: 6.w),
              padding: EdgeInsets.all(4.w),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.58),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                children: [
                  Text(
                    title,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Colors.white,
                      fontSize: 14.sp,
                      fontWeight: FontWeight.normal,
                    ),
                  ),
                  SizedBox(height: 1.w),
                  Text(
                    subtitle,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Colors.white.withOpacity(0.78),
                      fontSize: 11.5.sp,
                      fontWeight: FontWeight.normal,
                    ),
                  ),
                ],
              ),
            ),
            const Spacer(),
          ],
        ),
      ),
    );
  }
}

class _ScannerCorner extends StatelessWidget {
  const _ScannerCorner({required this.alignment});

  final Alignment alignment;

  @override
  Widget build(BuildContext context) {
    final isLeft = alignment.x < 0;
    final isTop = alignment.y < 0;

    return Align(
      alignment: alignment,
      child: Container(
        width: 12.w,
        height: 12.w,
        decoration: BoxDecoration(
          border: Border(
            top: isTop
                ? BorderSide(color: AppColors.primaryColor, width: 5)
                : BorderSide.none,
            bottom: !isTop
                ? BorderSide(color: AppColors.primaryColor, width: 5)
                : BorderSide.none,
            left: isLeft
                ? BorderSide(color: AppColors.primaryColor, width: 5)
                : BorderSide.none,
            right: !isLeft
                ? BorderSide(color: AppColors.primaryColor, width: 5)
                : BorderSide.none,
          ),
        ),
      ),
    );
  }
}

class _ScannerMessage extends StatelessWidget {
  const _ScannerMessage({
    required this.icon,
    required this.title,
    required this.message,
  });

  final IconData icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black,
      padding: EdgeInsets.all(8.w),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: Colors.white, size: 42.sp),
            SizedBox(height: 4.w),
            Text(
              title,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Colors.white,
                fontSize: 16.sp,
                fontWeight: FontWeight.normal,
              ),
            ),
            SizedBox(height: 2.w),
            Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Colors.white.withOpacity(0.72),
                fontSize: 11.5.sp,
                fontWeight: FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
