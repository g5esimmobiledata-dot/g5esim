// ignore_for_file: unnecessary_brace_in_string_interps, unnecessary_string_interpolations

import 'dart:convert';
import 'dart:developer';
import 'dart:io';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/utills/country_flag_fallback.dart';
import 'package:esimconnect/views/packageModule/packagesList/view/PaymentScreen.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_paypal/flutter_paypal.dart';
import 'package:get/get.dart';
import 'package:intl_phone_field/intl_phone_field.dart';
import 'package:sizer/sizer.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/utills/config.dart';
import 'package:esimconnect/utills/global.dart' as global;
import 'package:esimconnect/utills/services/ApiService.dart';
import 'package:esimconnect/utills/UserService.dart';
import '../../../navbarModule/bloc/navbar_bloc.dart';
import '../../../navbarModule/views/bottomNavBarScreen.dart';
import '../../../paypalscreens/successScreen.dart';
import 'package:esimconnect/views/packageModule/packagesList/bloc/offers_bloc/offers_bloc.dart';
import 'package:esimconnect/views/packageModule/packagesList/bloc/offers_bloc/offers_event.dart';
import 'package:esimconnect/views/packageModule/packagesList/bloc/offers_bloc/offers_model.dart';
import '../bloc/order_bloc/order_now_bloc.dart';
import '../bloc/order_bloc/package_datail_event.dart';
import '../bloc/payment_initial_bloc/bloc/payment_initiate_bloc.dart';
import '../bloc/payment_initial_bloc/bloc/payment_initiate_event.dart';
import '../bloc/payment_initial_bloc/model/paymentinitiateModel.dart';
import '../bloc/payment_verify_bloc/bloc/payment_verify_bloc.dart';
import '../bloc/payment_verify_bloc/bloc/payment_verify_event.dart';
import '../bloc/payment_verify_bloc/model/paymentverifyModel.dart';
import '../bloc/razorpay_error_bloc/razorpay_error_bloc.dart';
import '../bloc/razorpay_error_bloc/razorpay_error_event.dart';
import '../model/GatewayListModel.dart';
import '../model/ordernowModel.dart';
import 'GPaymentUtils.dart';
import 'package:uuid/uuid.dart';

final uuid = const Uuid();

enum OfferType { voucher, referral, giftCard }

const String _walletPaymentMethod = 'wallet';
const String _gatewayPaymentMethod = 'gateway';
const String _iapPaymentMethod = 'GpayInAppPurchase';
const String _iapProviderKey = 'gpayinapppurchase';

class Checkoutscreen extends StatefulWidget {
  final dynamic packageListInfo;
  final bool isTopUp;
  final String? iccid;
  final bool? isShowDestination;
  final String? countryname;
  final String? flagemoji;
  final String? countrycode;

  const Checkoutscreen({
    super.key,
    required this.packageListInfo,
    this.isTopUp = false,
    this.iccid,
    this.isShowDestination = true,
    this.countryname,
    this.flagemoji,
    this.countrycode,
  });

  @override
  State<Checkoutscreen> createState() => _CheckoutscreenState();
}

class _CheckoutscreenState extends State<Checkoutscreen> {
  // Controllers
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _codeController = TextEditingController();
  // State variables
  bool _isLoading = false;
  bool _isLoadingGateways = false;
  bool gatewaysLoaded = false;
  bool _isVerified = false;
  String _discount = "";
  String _formattedRupees = "";
  String? _voucherID;
  String? _giftcardID;
  String? _type;
  OfferType? _selectedOffer;
  GatewayItem? selectedGateway;
  List<GatewayItem> _availableGateways = [];
  final _userService = UserService.to;
  late GPaymentUtils _gpaymentUtils;
  String? verifiedEsimOrderId;
  String? selectedPaymentMethod;
  bool isInAppBillingAvailable = false;
  bool _isConfirmingPayment = false;
  bool _isRefreshingWalletBalance = false;
  bool _paymentMethodManuallySelected = false;
  String? _gatewayLoadError;
  String _guestAccessToken = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initializeCheckoutData();
    });
  }

  Future<void> _initializeCheckoutData() async {
    try {
      _initializePrice();
    } catch (error) {
      log('Checkout price initialization failed: $error');
      _formattedRupees = "0.00";
    }

    try {
      _initializeGoogleBilling();
    } catch (error) {
      log('Google billing initialization skipped: $error');
    }

    await _refreshWalletBalance();
    await _loadGateways();
  }

  void _initializePrice() {
    final price = widget.packageListInfo?.price?.toString() ?? "0";
    final rupees = double.tryParse(price) ?? 0;
    _formattedRupees = rupees.toStringAsFixed(2);
    log('''
        💰 Price $price -> $_formattedRupees
          emojiflag ${widget.flagemoji}
          packageid ${widget.packageListInfo?.id ?? 'unknown'}
      ''');
  }

  void _initializeGoogleBilling() {
    log('🔹 _initializeGoogleBilling');
    _gpaymentUtils = GPaymentUtils(
      onMessage: (message) {
        global.showToastMessage(message: message);
        setState(() => _isLoading = false);
      },
      onPurchaseVerified: (purchaseDetails) {
        final Map<String, dynamic> decoded = jsonDecode(
          purchaseDetails.verificationData.localVerificationData,
        );
        log("decoded: ${jsonEncode(decoded)}");
        final _esim_order_id = verifiedEsimOrderId;
        final _gateway_order_id = decoded["payment_order_id"] ?? '';
        if (!kIsWeb && Platform.isIOS) {
          log(
            "IOS Data: ${purchaseDetails.verificationData.serverVerificationData}",
          );

          context.read<PaymentVerifybloc>().add(
            PaymentVerifyEvent(
              isTopup: widget.isTopUp,
              iccid: widget.iccid,
              esim_order_id: _esim_order_id,
              gateway_order_id: _gateway_order_id,
              receiptData:
                  purchaseDetails.verificationData.serverVerificationData,
              voucherId: _voucherID,
              referalId: 0,
              giftCardId: _giftcardID,
              promoType: _type,
              promoCode: _codeController.text,
              packageId: widget.packageListInfo.id.toString(),
            ),
          );
        } else if (!kIsWeb && Platform.isAndroid) {
          //ANDROID VERIFICATION
          context.read<PaymentVerifybloc>().add(
            PaymentVerifyEvent(
              isTopup: widget.isTopUp,
              iccid: widget.iccid,
              esim_order_id: _esim_order_id,
              gateway_order_id: _gateway_order_id,
              purchaseToken: decoded["purchaseToken"],
              googleorderid: decoded["productId"],
              voucherId: _voucherID,
              referalId: 0,
              giftCardId: _giftcardID,
              promoType: _type,
              promoCode: _codeController.text,
              packageId: widget.packageListInfo.id.toString(),
            ),
          );
        }
      },
      onPurchasedError: (purchaseDetails) {
        final Map<String, dynamic> errorData = {
          'status': purchaseDetails.status.toString(),
          'error': {
            'source': purchaseDetails.error?.source,
            'code': purchaseDetails.error?.code,
            'message': purchaseDetails.error?.message,
            'details': purchaseDetails.error?.details,
          },
        };
        final String jsonError = jsonEncode(errorData);
        context.read<RazorpayErrorBloc>().add(
          RazorpayEvent(
            esimOrderId: verifiedEsimOrderId ?? '',
            code: jsonError,
          ),
        );
      },

      onPurchasePending: () {
        global.showToastMessage(message: 'Payment is pending...');
        setState(() => _isLoading = true);
      },
    );

    _gpaymentUtils.initialize();
  }

  Future<void> _loadGateways() async {
    if (_isLoadingGateways) return;

    setState(() {
      _isLoadingGateways = true;
      _gatewayLoadError = null;
    });

    try {
      final model = await _loadGatewayModelWithFallbacks();

      if (!mounted) return;
      setState(() {
        _isLoadingGateways = false;
        gatewaysLoaded = true;
        _availableGateways = _dedupeGateways(model.data ?? []);
        isInAppBillingAvailable = model.inAppPurchase ?? false;
        log(
          'Loaded payment gateways: ${_availableGateways.map((gateway) => '${gateway.displayName ?? gateway.provider}:${gateway.id}').join(', ')}',
        );
        log('🔹 InAppBilling API: $isInAppBillingAvailable');

        if (isInAppBillingAvailable) {
          _availableGateways.add(
            GatewayItem(
              id: _iapPaymentMethod,
              provider: _iapPaymentMethod,
              displayName: 'Google Pay / In-App Purchase',
            ),
          );
        }

        _selectDefaultPaymentMethod();
      });
    } catch (error) {
      log('Gateway load failed: $error');
      if (!mounted) return;
      setState(() {
        _isLoadingGateways = false;
        gatewaysLoaded = true;
        _gatewayLoadError = error.toString();
      });
    }
  }

  Future<GatewayListModel> _loadGatewayModelWithFallbacks() async {
    final attempts = [
      {'scope': true, 'currency': true},
      {'scope': false, 'currency': true},
      {'scope': true, 'currency': false},
      {'scope': false, 'currency': false},
    ];

    GatewayListModel? lastModel;
    Object? lastError;

    for (final attempt in attempts) {
      try {
        final model = await _fetchGatewayModel(
          includeCheckoutScope: attempt['scope'] ?? false,
          includeCurrency: attempt['currency'] ?? false,
        );
        lastModel = model;

        if ((model.data ?? []).isNotEmpty || model.inAppPurchase == true) {
          return model;
        }
      } catch (error) {
        lastError = error;
        log('Gateway load attempt failed: $error');
      }
    }

    if (lastModel != null) return lastModel;
    throw lastError ?? Exception('Unable to load payment gateways');
  }

  Future<GatewayListModel> _fetchGatewayModel({
    required bool includeCheckoutScope,
    bool includeCurrency = true,
  }) async {
    final query = <String, dynamic>{};
    if (includeCurrency) {
      query['currency'] = _checkoutCurrencyCode;
    }
    if (includeCheckoutScope) {
      query['scope'] = 'checkout';
    }

    final response = await context.read<ApiService>().get(
      ApiEndPoints.GATEWAYLIST,
      query: query,
    );
    return GatewayListModel.fromJson(Map<String, dynamic>.from(response));
  }

  String get _checkoutCurrencyCode {
    final rawCurrency = global.activeCurrencyname?.toString().trim();
    if (rawCurrency == null ||
        rawCurrency.isEmpty ||
        rawCurrency.toLowerCase() == 'null') {
      return 'USD';
    }
    return rawCurrency.toUpperCase();
  }

  List<GatewayItem> _dedupeGateways(List<GatewayItem> gateways) {
    final seen = <String>{};
    final unique = <GatewayItem>[];

    for (final gateway in gateways) {
      final key = '${gateway.provider ?? ''}:${gateway.id ?? ''}';
      if (seen.add(key)) {
        unique.add(gateway);
      }
    }

    return unique;
  }

  bool get _isLoggedIn => _userService.currentUserData?.data?.token != null;

  double get _checkoutTotal => double.tryParse(_formattedRupees) ?? 0;

  double get _walletBalance =>
      double.tryParse(
        _userService.currentUserData?.data?.walletBalance ?? '0',
      ) ??
      0;

  bool get _isUsdCheckout => _checkoutCurrencyCode == 'USD';

  bool get _walletHasEnoughBalance =>
      !_isUsdCheckout || _walletBalance + 0.001 >= _checkoutTotal;

  bool get _walletPaymentEnabled =>
      !_isRefreshingWalletBalance && _walletHasEnoughBalance;

  String _formatAmount(num amount) => amount.toStringAsFixed(2);

  String _gatewayProvider(GatewayItem gateway) {
    return (gateway.provider ?? gateway.id ?? '').toLowerCase();
  }

  dynamic _tryRead(dynamic Function() reader) {
    try {
      return reader();
    } catch (_) {
      return null;
    }
  }

  String? _cleanText(dynamic value) {
    final text = value?.toString().trim();
    if (text == null || text.isEmpty || text.toLowerCase() == 'null') {
      return null;
    }
    return text;
  }

  dynamic _mapValue(dynamic value, String key) {
    if (value is Map) return value[key];
    return null;
  }

  dynamic get _packageDestination =>
      _tryRead(() => widget.packageListInfo?.destination);

  String? get _packageRegionName {
    final region = _tryRead(() => widget.packageListInfo?.region);
    return _cleanText(_tryRead(() => region?.name)) ??
        _cleanText(_mapValue(region, 'name')) ??
        _cleanText(region);
  }

  String? get _checkoutCountryCode {
    final destination = _packageDestination;
    return _cleanText(widget.countrycode) ??
        _cleanText(_tryRead(() => destination?.countryCode)) ??
        _cleanText(_tryRead(() => widget.packageListInfo?.countryCode)) ??
        _cleanText(_tryRead(() => widget.packageListInfo?.mycountryCode));
  }

  String? get _checkoutCountryName {
    final destination = _packageDestination;
    final packageType = _cleanText(
      _tryRead(() => widget.packageListInfo?.type),
    );
    return _cleanText(widget.countryname) ??
        _cleanText(_tryRead(() => destination?.name)) ??
        _cleanText(_tryRead(() => widget.packageListInfo?.countryName)) ??
        _packageRegionName ??
        (packageType?.toLowerCase() == 'global' ? tr('Global') : null);
  }

  String? get _checkoutFlagValue {
    final destination = _packageDestination;
    final region = _tryRead(() => widget.packageListInfo?.region);
    return _cleanText(widget.flagemoji) ??
        _cleanText(_tryRead(() => destination?.flagEmoji)) ??
        _cleanText(_tryRead(() => region?.image)) ??
        _cleanText(_mapValue(region, 'image'));
  }

  bool _gatewayRequiresLogin(GatewayItem gateway) {
    final provider = _gatewayProvider(gateway);
    return provider == 'nowpayments' || provider == 'cryptomus';
  }

  bool _isIapGateway(GatewayItem gateway) {
    return gateway.id == _iapPaymentMethod;
  }

  void _selectWalletPayment() {
    if (!_isLoggedIn) return;
    setState(() {
      _paymentMethodManuallySelected = true;
      selectedPaymentMethod = _walletPaymentMethod;
      selectedGateway = null;
    });
  }

  void _selectGatewayPayment(GatewayItem gateway) {
    if (!_isLoggedIn && _gatewayRequiresLogin(gateway)) {
      global.showToastMessage(message: tr('Login is required for this method'));
      return;
    }

    setState(() {
      _paymentMethodManuallySelected = true;
      selectedGateway = gateway;
      selectedPaymentMethod = _isIapGateway(gateway)
          ? _iapPaymentMethod
          : _gatewayPaymentMethod;
    });
  }

  void _selectDefaultPaymentMethod() {
    if (selectedPaymentMethod != null || selectedGateway != null) return;

    if (_isLoggedIn && _walletPaymentEnabled) {
      selectedPaymentMethod = _walletPaymentMethod;
      return;
    }

    GatewayItem? firstAvailableGateway;
    for (final gateway in _availableGateways) {
      if (_isLoggedIn || !_gatewayRequiresLogin(gateway)) {
        firstAvailableGateway = gateway;
        break;
      }
    }

    if (firstAvailableGateway != null) {
      selectedGateway = firstAvailableGateway;
      selectedPaymentMethod = _isIapGateway(firstAvailableGateway)
          ? _iapPaymentMethod
          : _gatewayPaymentMethod;
    }
  }

  void _startWalletPayment() {
    if (!_isLoggedIn) {
      global.showToastMessage(
        message: tr('Login is required to pay from wallet'),
      );
      return;
    }

    if (_isRefreshingWalletBalance) {
      global.showToastMessage(message: tr('Syncing wallet balance'));
      return;
    }

    if (!_walletHasEnoughBalance) {
      global.showToastMessage(message: tr('Insufficient wallet balance'));
      return;
    }

    context.read<PaymentInitiatebloc>().add(
      PaymentInitiateEvent(
        gatewayId: null,
        currency: _checkoutCurrencyCode,
        orderId: uuid.v4(),
        packageId: widget.packageListInfo.id.toString(),
        amount: _formattedRupees,
        voucherId: _voucherID,
        referalId: 0,
        giftCardId: _giftcardID,
        promoType: _type,
        promoCode: _codeController.text,
        paymentMethod: _walletPaymentMethod,
      ),
    );
  }

  Future<void> _refreshWalletBalance() async {
    if (!_isLoggedIn || _isRefreshingWalletBalance) return;

    setState(() => _isRefreshingWalletBalance = true);

    try {
      final response = await context.read<ApiService>().get(
        ApiEndPoints.USERPROFILE,
      );
      final data = response is Map ? response['data'] : null;
      final walletBalance = data is Map
          ? data['walletBalance']?.toString()
          : null;
      final currencyRate = data is Map ? data['currencyRate'] : null;

      if (currencyRate is Map) {
        final currencyCode = _cleanText(currencyRate['code']);
        final currencySymbol = _cleanText(currencyRate['symbol']);
        if (currencyCode != null) {
          global.activeCurrencyname = currencyCode.toUpperCase();
        }
        if (currencySymbol != null) {
          global.activeCurrencysymbol = currencySymbol;
        }
      }

      if (walletBalance != null && walletBalance.isNotEmpty) {
        await _userService.updateWalletBalance(walletBalance);
      }

      if (!mounted) return;
      setState(() {
        _isRefreshingWalletBalance = false;
        if (!_paymentMethodManuallySelected && _walletHasEnoughBalance) {
          selectedPaymentMethod = _walletPaymentMethod;
          selectedGateway = null;
        }
      });
    } catch (error) {
      log('Wallet balance refresh failed: $error');
      if (mounted) {
        setState(() => _isRefreshingWalletBalance = false);
      }
    }
  }

  void _startGatewayPayment(GatewayItem gateway) {
    if (_isIapGateway(gateway)) {
      _proceedWithPayment(_iapPaymentMethod);
      return;
    }

    if (!_isLoggedIn && _gatewayRequiresLogin(gateway)) {
      global.showToastMessage(message: tr('Login is required for this method'));
      return;
    }

    log('Gateway: ${gateway.displayName} and price is $_formattedRupees');

    context.read<PaymentInitiatebloc>().add(
      PaymentInitiateEvent(
        gatewayId: gateway.id.toString(),
        currency: _checkoutCurrencyCode,
        orderId: uuid.v4(),
        packageId: widget.packageListInfo.id.toString(),
        email: _isLoggedIn ? null : _emailController.text,
        phone: _isLoggedIn ? null : _phoneController.text,
        amount: _formattedRupees,
        voucherId: _isLoggedIn ? _voucherID : null,
        referalId: _isLoggedIn ? 0 : null,
        giftCardId: _isLoggedIn ? _giftcardID : null,
        promoType: _type,
        promoCode: _isLoggedIn ? _codeController.text : null,
      ),
    );
  }

  void _handlePayPressed() {
    if (!_isLoggedIn &&
        (_emailController.text.isEmpty || _phoneController.text.isEmpty)) {
      global.showToastMessage(
        message: tr('Please enter email and phone number'),
      );
      return;
    }

    if (selectedPaymentMethod == _walletPaymentMethod) {
      _startWalletPayment();
      return;
    }

    if (selectedGateway != null) {
      _startGatewayPayment(selectedGateway!);
      return;
    }

    global.showToastMessage(message: tr('Please select a payment method'));
  }

  Future<void> _confirmWalletPayment(Payment payment) async {
    final walletTransactionId = payment.walletTransactionId?.toString() ?? '';
    if (walletTransactionId.isEmpty) {
      global.showToastMessage(
        message: tr('Wallet transaction data is missing'),
      );
      return;
    }

    setState(() => _isConfirmingPayment = true);

    try {
      final response = await context.read<ApiService>().post(
        ApiEndPoints.CONFIRM_PAYMENT,
        data: {
          'provider': 'wallet',
          'providerType': 'wallet',
          'walletTransactionId': walletTransactionId,
          if (payment.orderId != null) 'orderId': payment.orderId,
          if (payment.packageOrderId != null)
            'packageOrderId': payment.packageOrderId,
          'metadata': payment.metadata ?? {},
        },
      );

      if (response is Map && response['success'] == true) {
        await _finishWalletPayment(
          payment,
          message: response['message']?.toString(),
        );
      } else {
        global.showToastMessage(
          message: response is Map && response['message'] != null
              ? response['message'].toString()
              : tr('Payment Failed'),
        );
      }
    } catch (error) {
      global.showToastMessage(message: error.toString());
    } finally {
      if (mounted) setState(() => _isConfirmingPayment = false);
    }
  }

  Future<void> _finishWalletPayment(Payment payment, {String? message}) async {
    final newBalance = payment.balance?.toString();
    if (newBalance != null && newBalance.isNotEmpty) {
      await _userService.updateWalletBalance(newBalance);
    }
    global.showToastMessage(message: message ?? tr('Wallet payment completed'));
    Get.off(() => BottomNavigationBarScreen(index: 3));
  }

  Future<void> _confirmExternalPayment(Payment payment) async {
    final provider = payment.provider?.toString() ?? '';
    if (provider.isEmpty) return;

    setState(() => _isConfirmingPayment = true);

    try {
      final payload = {
        'provider': provider,
        'providerType': provider,
        'paymentId':
            payment.paymentIntentId?.toString() ??
            payment.transactionId?.toString(),
        'orderId': payment.orderId?.toString(),
        'txRef': payment.txRef?.toString() ?? payment.orderId?.toString(),
        if (payment.packageOrderId != null)
          'packageOrderId': payment.packageOrderId.toString(),
        'gatewayId': selectedGateway?.id,
        'metadata': payment.metadata ?? {},
      };
      log('confirm-payment payload: $payload');

      final response = await context.read<ApiService>().post(
        ApiEndPoints.CONFIRM_PAYMENT,
        data: payload,
      );
      log('confirm-payment response: $response');

      if (response is Map && response['success'] == true) {
        global.showToastMessage(
          message: response['message']?.toString() ?? tr('Payment completed'),
        );
        Get.off(() => BottomNavigationBarScreen(index: 3));
      } else {
        global.showToastMessage(
          message: response is Map && response['message'] != null
              ? response['message'].toString()
              : tr('Payment is still pending'),
        );
      }
    } catch (error) {
      global.showToastMessage(message: error.toString());
    } finally {
      if (mounted) setState(() => _isConfirmingPayment = false);
    }
  }

  Future<void> _openAndConfirmExternalPayment({
    required Payment payment,
    required String url,
    required String provider,
  }) async {
    final result = await Get.to(
      () =>
          PaymentScreen(url: url, paymentMethod: provider, returnResult: true),
    );

    if (!mounted) return;

    if (!(result is Map && result['success'] == true)) {
      log(
        'Payment screen closed without confirmed success signal for $provider. Requesting backend confirmation as fallback.',
      );
    }
    await _confirmExternalPayment(payment);
  }

  String? _paymentRedirectUrl(Payment payment) {
    final paymentUrl = payment.paymentUrl?.toString();
    if (paymentUrl != null && paymentUrl.isNotEmpty && paymentUrl != 'null') {
      return paymentUrl;
    }

    final redirectUrl = payment.redirectUrl?.toString();
    if (redirectUrl != null &&
        redirectUrl.isNotEmpty &&
        redirectUrl != 'null') {
      return redirectUrl;
    }

    return null;
  }

  void _showCryptoPaymentSheet(Payment payment) {
    final providerName = payment.provider == 'cryptomus'
        ? 'Cryptomus'
        : 'NOWPayments';
    final qrCode = payment.qrCode?.toString();
    final qrBytes = qrCode != null && qrCode.contains(',')
        ? base64Decode(qrCode.split(',').last)
        : null;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.appSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(context).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppColors.primaryColor.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      Icons.currency_bitcoin,
                      color: AppColors.primaryColor,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          providerName,
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.normal,
                            color: AppColors.appTextPrimary,
                          ),
                        ),
                        Text(
                          payment.network?.toString() ?? tr('Crypto payment'),
                          style: TextStyle(
                            fontSize: 14,
                            color: AppColors.appTextSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              if (qrBytes != null)
                Center(
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Image.memory(qrBytes, width: 180, height: 180),
                  ),
                ),
              const SizedBox(height: 18),
              _buildCryptoDetailRow(
                'Amount',
                '${payment.payAmount ?? payment.amount ?? ''} ${payment.payCurrency ?? payment.currency ?? ''}',
              ),
              if (payment.payAddress?.toString().isNotEmpty == true)
                _buildCryptoDetailRow('Address', payment.payAddress.toString()),
              const SizedBox(height: 18),
              SizedBox(
                height: 50,
                child: ElevatedButton(
                  onPressed: _isConfirmingPayment
                      ? null
                      : () {
                          Navigator.pop(context);
                          _confirmExternalPayment(payment);
                        },
                  child: Text(
                    _isConfirmingPayment ? tr('Checking...') : tr("I've Paid"),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildCryptoDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              color: AppColors.appTextSecondary,
              fontSize: 13,
              fontWeight: FontWeight.normal,
            ),
          ).tr(),
          const SizedBox(height: 4),
          SelectableText(
            value,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.normal,
              color: AppColors.appTextPrimary,
            ),
          ),
        ],
      ),
    );
  }

  void _onOfferVerified(
    double discount,
    dynamic voucherId,
    dynamic giftCardId,
  ) {
    setState(() {
      _discount = discount.toString();
      _isVerified = true;
      _formattedRupees = (double.parse(_formattedRupees) - discount)
          .toStringAsFixed(2);
      _voucherID = voucherId.toString();
      _giftcardID = giftCardId.toString();
    });
  }

  void _resetOffer() {
    setState(() {
      _isVerified = false;
      _selectedOffer = null;
      _codeController.clear();
      _initializePrice();
    });
  }

  Widget _buildSectionCard({
    required String title,
    required Widget child,
    EdgeInsets padding = const EdgeInsets.all(16.0),
  }) {
    return Card(
      elevation: 0,
      color: AppColors.appSurface,
      shape: RoundedRectangleBorder(
        side: BorderSide(color: AppColors.appBorder),
        borderRadius: BorderRadius.circular(22),
      ),
      child: Padding(
        padding: padding,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                fontSize: 18.sp,
                fontWeight: FontWeight.normal,
                color: AppColors.appTextPrimary,
              ),
            ).tr(),
            const SizedBox(height: 16),
            child,
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, dynamic value, {Color? valueColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.bodyMedium!.copyWith(
            fontSize: 16.sp,
            fontWeight: FontWeight.normal,
            color: AppColors.appTextSecondary,
          ),
        ).tr(),
        Text(
          value,
          style: Theme.of(context).textTheme.bodyMedium!.copyWith(
            fontSize: 16.sp,
            fontWeight: FontWeight.normal,
            color: valueColor ?? AppColors.appTextPrimary,
          ),
        ),
      ],
    );
  }

  Widget _buildCountryInfo() {
    final hasDisplayInfo = _checkoutCountryName != null;

    if (!hasDisplayInfo) return const SizedBox();

    return Row(
      children: [
        // Flag/Emoji
        _buildFlagWidget(),
        const SizedBox(width: 16),
        // Country Info
        _buildCountryTextInfo(),
      ],
    );
  }

  Widget _buildFlagWidget() {
    final countryCode = _checkoutCountryCode;
    final flagValue = _checkoutFlagValue;

    if (looksLikeFlagImagePath(flagValue)) {
      final imageUrl = flagValue!.startsWith('http')
          ? flagValue
          : "$imageBaseUrl$flagValue";
      return CachedNetworkImage(
        imageUrl: imageUrl,
        width: 30.sp,
        height: 30.sp,
        errorWidget: (context, url, error) => buildCountryFlagOrEmoji(
          countryCode: countryCode,
          flagEmoji: flagValue,
          size: 30.sp,
          fallbackColor: AppColors.appTextSecondary,
        ),
      );
    }

    return buildCountryFlagOrEmoji(
      countryCode: countryCode,
      flagEmoji: flagValue,
      size: 30.sp,
      fallbackColor: AppColors.appTextSecondary,
    );
  }

  Widget _buildCountryTextInfo() {
    final countryName = _checkoutCountryName;
    if (countryName == null) return const SizedBox();

    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            countryName,
            style: Theme.of(context).textTheme.bodyMedium!.copyWith(
              fontSize: 16.sp,
              color: AppColors.appTextPrimary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '${tr("Coverage:")} $countryName',
            style: Theme.of(context).textTheme.bodyMedium!.copyWith(
              fontSize: 16.sp,
              color: AppColors.appTextSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPackageDetails() {
    return _buildSectionCard(
      title: 'Package detail',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildCountryInfo(),
          SizedBox(height: 5.w),
          _buildDetailRow('Data', widget.packageListInfo.dataAmount),
          Divider(color: AppColors.appBorder),
          _buildDetailRow(
            'Validity',
            "${widget.packageListInfo.validity} ${tr('day${widget.packageListInfo.validity != 1 ? 's' : ''}')}",
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentSummary() {
    return _buildSectionCard(
      title: 'Payment Summary',
      child: Column(
        children: [
          if (_isVerified) ...[
            Divider(color: AppColors.appBorder),
            _buildDetailRow(
              'Subtotal',
              '${global.activeCurrencysymbol} ${widget.packageListInfo.price}',
            ),
            Divider(color: AppColors.appBorder),
            _buildDetailRow(
              global.offerTitle(_selectedOffer),
              "- (${global.activeCurrencysymbol} $_discount)",
              valueColor: AppColors.primaryColor,
            ),
          ],
          Divider(color: AppColors.appBorder),
          _buildDetailRow(
            'Total',
            '${global.activeCurrencysymbol} $_formattedRupees',
            valueColor: AppColors.primaryColor,
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentMethodSection() {
    return _buildSectionCard(
      title: 'Payment Method',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_isLoadingGateways)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 14),
              child: Center(child: CircularProgressIndicator.adaptive()),
            ),
          if (_isLoggedIn) ...[
            _buildWalletPaymentTile(),
            const SizedBox(height: 12),
          ],
          if (!_isLoadingGateways && _availableGateways.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Text(
                'Other payment methods',
                style: TextStyle(
                  color: AppColors.appTextPrimary,
                  fontSize: 15,
                  fontWeight: FontWeight.normal,
                ),
              ).tr(),
            ),
          ],
          if (!_isLoadingGateways && _gatewayLoadError != null)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: Colors.orange.shade600),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Unable to load payment methods',
                      style: TextStyle(
                        color: AppColors.appTextSecondary,
                        fontSize: 15,
                        fontWeight: FontWeight.normal,
                      ),
                    ).tr(),
                  ),
                ],
              ),
            ),
          if (!_isLoadingGateways &&
              _gatewayLoadError == null &&
              _availableGateways.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.credit_card_off,
                        color: AppColors.appTextSecondary,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'No payment methods available',
                          style: TextStyle(
                            color: AppColors.appTextSecondary,
                            fontSize: 15,
                            fontWeight: FontWeight.normal,
                          ),
                        ).tr(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: _loadGateways,
                    icon: Icon(
                      Icons.refresh_rounded,
                      color: AppColors.primaryColor,
                    ),
                    label: Text(
                      tr('Retry payment methods'),
                      style: TextStyle(
                        color: AppColors.primaryColor,
                        fontWeight: FontWeight.normal,
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: AppColors.primaryColor),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ],
              ),
            )
          else
            ..._availableGateways.map(
              (gateway) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _buildGatewayPaymentTile(gateway),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildWalletPaymentTile() {
    final selected = selectedPaymentMethod == _walletPaymentMethod;
    final subtitle = _isRefreshingWalletBalance
        ? tr('Syncing wallet balance')
        : _isUsdCheckout && !_walletHasEnoughBalance
        ? '${tr("Insufficient balance")}: ${global.activeCurrencysymbol} ${_formatAmount(_walletBalance)}'
        : '${tr("Balance")}: ${global.activeCurrencysymbol} ${_formatAmount(_walletBalance)} $_checkoutCurrencyCode';

    return _buildPaymentOptionTile(
      title: tr('Pay using My Wallet Balance'),
      subtitle: subtitle,
      icon: Icons.account_balance_wallet_outlined,
      selected: selected,
      enabled: _walletPaymentEnabled,
      onTap: _selectWalletPayment,
      trailing: _isRefreshingWalletBalance
          ? const SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator.adaptive(strokeWidth: 2),
            )
          : !_walletHasEnoughBalance
          ? Icon(Icons.info_outline, color: Colors.orange.shade600)
          : null,
    );
  }

  Widget _buildGatewayPaymentTile(GatewayItem gateway) {
    final selected =
        selectedGateway?.id == gateway.id &&
        selectedPaymentMethod != _walletPaymentMethod;
    final provider = _gatewayProvider(gateway);
    final enabled = _isLoggedIn || !_gatewayRequiresLogin(gateway);

    return _buildPaymentOptionTile(
      title: _gatewayTitle(gateway),
      subtitle: enabled ? _gatewaySubtitle(provider) : tr('Login required'),
      icon: _gatewayIcon(provider),
      selected: selected,
      enabled: enabled,
      onTap: () => _selectGatewayPayment(gateway),
    );
  }

  Widget _buildPaymentOptionTile({
    required String title,
    required String subtitle,
    required IconData icon,
    required bool selected,
    required bool enabled,
    required VoidCallback onTap,
    Widget? trailing,
  }) {
    final borderColor = selected ? AppColors.primaryColor : AppColors.appBorder;
    final backgroundColor = selected
        ? AppColors.primaryColor.withOpacity(0.12)
        : AppColors.appSurfaceAlt;
    final iconColor = enabled
        ? AppColors.primaryColor
        : AppColors.appTextSecondary.withOpacity(0.65);

    return Material(
      color: backgroundColor,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: enabled ? onTap : null,
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: borderColor, width: selected ? 1.6 : 1),
          ),
          child: Row(
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: iconColor.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, color: iconColor, size: 25),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 16.2,
                        fontWeight: FontWeight.normal,
                        color: enabled
                            ? AppColors.appTextPrimary
                            : AppColors.appTextSecondary.withOpacity(0.62),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.normal,
                        color: enabled
                            ? AppColors.appTextSecondary
                            : AppColors.appTextSecondary.withOpacity(0.58),
                      ),
                    ),
                  ],
                ),
              ),
              trailing ??
                  Icon(
                    selected
                        ? Icons.check_circle_rounded
                        : Icons.radio_button_unchecked_rounded,
                    color: selected
                        ? AppColors.primaryColor
                        : AppColors.appTextSecondary,
                    size: 24,
                  ),
            ],
          ),
        ),
      ),
    );
  }

  String _gatewayTitle(GatewayItem gateway) {
    final displayName = gateway.displayName?.trim();
    if (displayName != null && displayName.isNotEmpty) return displayName;

    switch (_gatewayProvider(gateway)) {
      case 'stripe':
        return 'Credit Card';
      case 'paypal':
        return 'PayPal';
      case 'nowpayments':
        return 'Crypto';
      case 'cryptomus':
        return 'Crypto';
      case 'ayamerchant':
        return 'Merchant Account';
      case _iapProviderKey:
        return 'Google Pay / In-App Purchase';
      default:
        return 'Payment Gateway';
    }
  }

  String _gatewaySubtitle(String provider) {
    switch (provider) {
      case 'stripe':
        return tr('Credit or debit card');
      case 'paypal':
        return tr('Pay with PayPal');
      case 'nowpayments':
        return tr('Crypto payment');
      case 'cryptomus':
        return tr('Crypto payment');
      case 'ayamerchant':
        return tr('Merchant account payment');
      case 'paystack':
        return tr('Card or mobile money');
      case 'razorpay':
        return tr('Card, UPI, or wallet');
      case 'powertranz':
        return tr('Secure card payment');
      case _iapProviderKey:
        return tr('Native mobile checkout');
      default:
        return tr('Secure payment');
    }
  }

  IconData _gatewayIcon(String provider) {
    switch (provider) {
      case 'stripe':
      case 'paystack':
      case 'razorpay':
      case 'powertranz':
        return Icons.credit_card_rounded;
      case 'paypal':
        return Icons.payments_rounded;
      case 'nowpayments':
      case 'cryptomus':
        return Icons.currency_bitcoin;
      case 'ayamerchant':
        return Icons.storefront_rounded;
      case _iapProviderKey:
        return Icons.phone_iphone_rounded;
      default:
        return Icons.payments_outlined;
    }
  }

  Widget _buildContactDetails() {
    if (_userService.currentUserData?.data?.token != null) {
      return const SizedBox();
    }

    return _buildSectionCard(
      title: 'Contact Details',
      child: Column(
        children: [
          // Email Field
          TextFormField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            style: TextStyle(color: AppColors.appTextPrimary),
            decoration: _inputDecoration(
              hint: tr("Enter your email address"),
              icon: Icons.email_outlined,
            ),
          ),
          const SizedBox(height: 14),
          // Phone Field
          IntlPhoneField(
            controller: _phoneController,
            initialCountryCode: 'IN',
            style: TextStyle(color: AppColors.appTextPrimary),
            dropdownTextStyle: TextStyle(color: AppColors.appTextPrimary),
            decoration: _inputDecoration(
              hint: tr('Phone Number'),
              label: tr('Phone Number'),
              isPhone: true,
            ),
            disableLengthCheck: false,
            keyboardType: TextInputType.phone,
            validator: (phone) => phone?.number.isEmpty == true
                ? tr('Please enter phone number')
                : null,
          ),
        ],
      ),
    );
  }

  InputDecoration _inputDecoration({
    required String hint,
    IconData? icon,
    String? label,
    bool isPhone = false,
  }) {
    return InputDecoration(
      hintText: hint,
      labelText: label ?? hint,
      prefixIcon: icon != null
          ? Icon(icon, color: AppColors.primaryColor)
          : null,
      filled: true,
      fillColor: AppColors.appSurfaceAlt,
      hintStyle: TextStyle(color: AppColors.appTextSecondary),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(isPhone ? 3.w : 14),
        borderSide: BorderSide(color: AppColors.appBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderSide: BorderSide(color: AppColors.appBorder),
        borderRadius: BorderRadius.circular(isPhone ? 3.w : 14),
      ),
      focusedBorder: OutlineInputBorder(
        borderSide: BorderSide(color: AppColors.primaryColor, width: 1.2),
        borderRadius: BorderRadius.circular(isPhone ? 3.w : 14),
      ),
      labelStyle: Theme.of(context).textTheme.bodyMedium!.copyWith(
        fontSize: 15.sp,
        fontWeight: FontWeight.w400,
        color: AppColors.appTextSecondary,
      ),
    );
  }

  Widget _buildPayButton(BuildContext context) {
    return BlocConsumer<PaymentVerifybloc, ApiState<PaymentVerifyModel>>(
      listener: (context, state) {
        if (state is ApiFailure) {
          global.showToastMessage(message: state.error!);
        }
        if (state is ApiSuccess) {
          Get.find<BottomNavController>().navigateToTab(2);
          global.showToastMessage(message: state.data!.message!);
        }
      },
      builder: (context, state) {
        return ElevatedButton(
          onPressed: (_isLoading || _isLoadingGateways || _isConfirmingPayment)
              ? null
              : _handlePayPressed,
          style: ElevatedButton.styleFrom(
            minimumSize: const Size.fromHeight(54),
            backgroundColor: AppColors.primaryColor,
            foregroundColor: AppColors.appBackground,
            disabledBackgroundColor: AppColors.appSurfaceSoft,
            disabledForegroundColor: AppColors.appTextSecondary,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(18),
            ),
          ),
          child: (_isLoading || _isLoadingGateways || _isConfirmingPayment)
              ? const SizedBox(
                  height: 24,
                  width: 24,
                  child: CircularProgressIndicator(
                    color: Colors.white,
                    strokeWidth: 2,
                  ),
                )
              : Text(
                  'Pay',
                  style: TextStyle(
                    fontSize: 17.sp,
                    fontWeight: FontWeight.normal,
                  ),
                ).tr(
                  args: ["${global.activeCurrencysymbol} $_formattedRupees"],
                ),
        );
      },
    );
  }

  void _proceedWithPayment(String gatewayName) {
    setState(() {
      selectedPaymentMethod = gatewayName;
    });
    if (widget.isTopUp == true) {
      context.read<OrderNowBloc>().add(
        BuyNowEvent(
          isTopu: true,
          topUpiccid: widget.iccid,
          packageid: widget.packageListInfo.id.toString(),
          gatewayname: selectedPaymentMethod,
        ),
      );
    } else {
      context.read<OrderNowBloc>().add(
        BuyNowEvent(
          packageid: widget.packageListInfo.id.toString(),
          orderPrice: _formattedRupees.toString(),
          gatewayname: selectedPaymentMethod,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Scaffold(
        backgroundColor: AppColors.appBackground,
        appBar: AppBar(
          backgroundColor: AppColors.appBackground,
          foregroundColor: AppColors.appTextPrimary,
          surfaceTintColor: AppColors.appBackground,
          elevation: 0,
          title: const Text('Checkout Screen').tr(),
        ),
        body: MultiBlocListener(
          listeners: [
            BlocListener<PaymentInitiatebloc, ApiState<PaymentInitiateModel>>(
              listener: (context, state) async {
                if (state is ApiLoading) {
                  setState(() => _isLoading = true);
                  log('🎯 Loading payment initiate...');
                } else if (state is ApiFailure) {
                  setState(() => _isLoading = false);
                  global.showToastMessage(message: state.error!);
                } else if (state is ApiSuccess<PaymentInitiateModel>) {
                  setState(() => _isLoading = false);
                  if (state.data.success == true) {
                    String? _email, _phone;
                    _email = _emailController.text;
                    _phone = _phoneController.text;
                    final payment = state.data.payment;
                    final provider = payment?.provider;
                    final serverTotal = state.data.pricing?.total;

                    _guestAccessToken =
                        payment?.guestAccessToken?.toString() ?? '';

                    if (serverTotal != null) {
                      setState(() {
                        _formattedRupees = serverTotal.toStringAsFixed(2);
                      });
                    }

                    if (provider == _walletPaymentMethod && payment != null) {
                      await _confirmWalletPayment(payment);
                      return;
                    }

                    if (payment == null || provider == null) {
                      global.showToastMessage(
                        message: tr('Payment details are not available'),
                      );
                      return;
                    }

                    //launch url
                    if (provider == 'stripe') {
                      final uri = Uri.parse("$imageBaseUrl/checkout").replace(
                        queryParameters: {
                          "providerType": "stripe",
                          "clientSecret":
                              state.data.payment?.clientSecret.toString() ?? "",
                          "email": _email,
                          "name": _phone,
                          "guestAccessToken":
                              state.data.payment?.guestAccessToken ?? "",
                        },
                      );
                      log('stripe uri: $uri');
                      final url = uri.toString();
                      await _openAndConfirmExternalPayment(
                        payment: payment,
                        url: url,
                        provider: 'stripe',
                      );
                    } else if (provider == 'razorpay') {
                      final uri = Uri.parse("$imageBaseUrl/checkout").replace(
                        queryParameters: {
                          "providerType": "razorpay",
                          "keyId":
                              state.data.payment?.publicKey.toString() ?? "",
                          "orderId":
                              state.data.payment?.orderId.toString() ?? "",
                          "amount": state.data.payment?.amount.toString() ?? 0,
                          "currency": state.data.payment?.currency ?? "INR",
                          "guestAccessToken":
                              state.data.payment?.guestAccessToken ?? "",
                        },
                      );

                      final url = uri.toString();
                      log('razorpay url: $url');
                      await _openAndConfirmExternalPayment(
                        payment: payment,
                        url: url,
                        provider: 'razorpay',
                      );
                    } else if (provider == 'paypal') {
                      _startPayment(
                        state.data.payment!.publicKey,
                        //  "AbkMnhOcacB2U51c91GLc3zmUL1nKnd9e_fppe84tHWYkULgjljtkaDaXIb6OLWDzOhgCjJJT8TKscuG",
                        state.data.payment!.clientSecret,
                        // "EMFFS4v0fvQBQDG8HIC-z01jl5WapeJN3t0wUhsZI3B4siKBAxKPStncyO7HDgp7S4wPStBgm1vUH-oG",
                        state.data.payment!.amount.toString(),
                        state.data.payment?.currency ?? "INR",
                        state.data.payment!.orderId.toString(),
                        state.data.payment!.mode.toString(),
                      );
                    } else if (provider == 'ayamerchant' ||
                        provider == 'paystack') {
                      final url = _paymentRedirectUrl(payment);
                      if (url == null) {
                        global.showToastMessage(
                          message: tr('Payment link is not available'),
                        );
                        return;
                      }
                      await _openAndConfirmExternalPayment(
                        payment: payment,
                        url: url,
                        provider: provider.toString(),
                      );
                    } else if (provider == 'nowpayments' ||
                        provider == 'cryptomus') {
                      final url = _paymentRedirectUrl(payment);
                      if (url != null) {
                        await _openAndConfirmExternalPayment(
                          payment: payment,
                          url: url,
                          provider: provider.toString(),
                        );
                      } else {
                        _showCryptoPaymentSheet(payment);
                      }
                    } else if (provider == 'free') {
                      global.showToastMessage(
                        message: tr('Order fully covered by promotions'),
                      );
                      Get.off(() => BottomNavigationBarScreen(index: 3));
                    } else {
                      global.showToastMessage(
                        message: tr('Unsupported payment provider'),
                      );
                    }
                  }
                }
              },
            ),
            BlocListener<OrderNowBloc, ApiState<OrderNowModel>>(
              listener: (context, state) {
                if (state is ApiLoading) {
                  setState(() => _isLoading = true);
                } else if (state is ApiFailure) {
                  setState(() => _isLoading = false);
                } else if (state is ApiSuccess<OrderNowModel>) {
                  setState(() {
                    _isLoading = false;
                    // Capture the order ID from your backend response
                    // verifiedEsimOrderId = state.data.data?.orderId?.toString();
                  });

                  final productId =
                      state.data.iap?.availableBrackets?.productId;
                  log('product sku id: $productId');
                  if (productId != null) {
                    Future.delayed(const Duration(milliseconds: 300));
                    _gpaymentUtils.buyConsumableProduct(productId);
                  }
                }
              },
            ),
          ],
          child: Column(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _buildPackageDetails(),
                      const SizedBox(height: 24),
                      _buildPaymentSummary(),
                      const SizedBox(height: 20),
                      _buildPaymentMethodSection(),
                      if (_userService.currentUserData?.data?.token ==
                          null) ...[
                        const SizedBox(height: 20),
                        _buildContactDetails(),
                      ],
                      const SizedBox(height: 20),
                      if (_userService.currentUserData?.data?.token != null)
                        _buildOfferSection(),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: EdgeInsets.symmetric(horizontal: 3.w, vertical: 3.w),
                child: _buildPayButton(context),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOfferSection() {
    return _buildSectionCard(
      title: 'Apply Offer',
      child: Column(
        children: [
          Row(
            children: [
              _buildOfferTypeOption(
                value: OfferType.voucher,
                title: "Voucher",
                icon: Icons.confirmation_num_outlined,
              ),
              _buildOfferTypeOption(
                value: OfferType.referral,
                title: "Referral",
                icon: Icons.group_outlined,
              ),
              _buildOfferTypeOption(
                value: OfferType.giftCard,
                title: "Gift Card",
                icon: Icons.card_giftcard_outlined,
              ),
            ],
          ),
          const SizedBox(height: 24),
          if (_isVerified)
            _buildAppliedOfferCard()
          else if (_selectedOffer != null)
            _buildOfferInputSection(),
        ],
      ),
    );
  }

  Widget _buildOfferTypeOption({
    required OfferType value,
    required String title,
    required IconData icon,
  }) {
    final isSelected = _selectedOffer == value;
    final isDisabled = _isVerified;

    return Expanded(
      child: GestureDetector(
        onTap: isDisabled
            ? null
            : () {
                setState(() {
                  _selectedOffer = value;
                  _codeController.clear();
                });
              },
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 6),
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: isSelected ? AppColors.primaryColor : AppColors.appBorder,
              width: 1.5,
            ),
            color: isSelected
                ? AppColors.primaryColor.withOpacity(0.12)
                : AppColors.appSurfaceAlt,
          ),
          child: Column(
            children: [
              Icon(
                icon,
                color: isSelected
                    ? AppColors.primaryColor
                    : AppColors.appTextSecondary,
              ),
              const SizedBox(height: 6),
              Text(
                title,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.normal,
                  color: isSelected
                      ? AppColors.primaryColor
                      : AppColors.appTextSecondary,
                ),
              ).tr(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOfferInputSection() {
    return BlocConsumer<OffersBloc, ApiState<OffersModel>>(
      listener: (context, state) {
        if (state is ApiSuccess) {
          _onOfferVerified(
            state.data!.discount ?? 0,
            state.data!.referrerId ?? '',
            state.data!.giftCardId ?? '',
          );
        } else if (state is ApiFailure) {
          global.showToastMessage(message: '${state.error}');
        }
      },
      builder: (context, state) {
        return Column(
          children: [
            TextFormField(
              controller: _codeController,
              textCapitalization: TextCapitalization.characters,
              decoration: InputDecoration(
                hintText: tr("Enter code"),
                prefixIcon: Icon(
                  global.offerIcon(_selectedOffer),
                  color: AppColors.primaryColor,
                ),
                filled: true,
                fillColor: AppColors.appSurfaceAlt,
                hintStyle: TextStyle(color: AppColors.appTextSecondary),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide(color: AppColors.appBorder),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide(color: AppColors.appBorder),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide(color: AppColors.primaryColor),
                ),
              ),
              style: TextStyle(color: AppColors.appTextPrimary),
              onChanged: (_) => setState(() {}),
            ),
            SizedBox(height: 2.h),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: _codeController.text.isEmpty ? null : _verifyOffer,
                child: const Text("Verify").tr(),
              ),
            ),
          ],
        );
      },
    );
  }

  void _verifyOffer() {
    if (_selectedOffer == null) return;

    final promoTypes = {
      OfferType.voucher: "voucher",
      OfferType.referral: "referral",
      OfferType.giftCard: "giftcard",
    };

    setState(() {
      final promoType = promoTypes[_selectedOffer]!;
      _type = promoType;
      log('🔖 Verifying $promoType with code: $promoType');
    });

    context.read<OffersBloc>().add(
      OffersEvent(
        type: promoTypes[_selectedOffer]!,
        totalAmount: double.parse(_formattedRupees),
        code: _codeController.text,
      ),
    );
  }

  Widget _buildAppliedOfferCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.primaryColor.withOpacity(0.8),
            AppColors.primaryColor.withOpacity(0.4),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: Icon(global.offerIcon(_selectedOffer), color: Colors.white),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  global.offerTitle(_selectedOffer),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.normal,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  "Code:",
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                ).tr(args: [_codeController.text.toUpperCase()]),
                Text(
                  "Discount:",
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                ).tr(args: [" ${global.activeCurrencysymbol} $_discount"]),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close, color: Colors.white),
            onPressed: _resetOffer,
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _emailController.dispose();
    _phoneController.dispose();
    _gpaymentUtils.dispose();
    _codeController.dispose();
    super.dispose();
  }

  ///paypal mehtods
  void _startPayment(
    String clientId,
    String clientSecret,
    String amount,
    String currency,
    String orderId,
    String paymentGatewaylive,
  ) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (BuildContext context) => UsePaypal(
          sandboxMode: paymentGatewaylive.toString() == "live" ? false : true,
          // clientId:
          //     "AbkMnhOcacB2U51c91GLc3zmUL1nKnd9e_fppe84tHWYkULgjljtkaDaXIb6OLWDzOhgCjJJT8TKscuG",
          // secretKey:
          //     "EMFFS4v0fvQBQDG8HIC-z01jl5WapeJN3t0wUhsZI3B4siKBAxKPStncyO7HDgp7S4wPStBgm1vUH-oG",
          clientId: clientId,
          secretKey: clientSecret,
          returnURL: "${imageBaseUrl}/return",
          cancelURL: "${imageBaseUrl}/cancel",
          transactions: [
            {
              "amount": {
                "total": "${amount}",
                "currency": currency,
                "details": {"subtotal": amount},
              },
              "description": "Payment for E-Sim Package",
              "item_list": {
                "items": [
                  {
                    "name": "E-Sim Package",
                    "quantity": 1,
                    "price": amount,
                    "currency": currency,
                  },
                ],
                // "shipping_address": {
                //   "recipient_name": "John Doe",
                //   "line1": "123 Main Street",
                //   "city": "San Francisco",
                //   "country_code": "US",
                //   "postal_code": "94102",
                //   "phone": "+1234567890",
                //   "state": "CA",
                // },
              },
            },
          ],
          note: "Contact us for any questions on your order.",
          onSuccess: (Map params) async {
            print("✅ onSuccess: $params");

            // ✅ Add 500ms delay to let widget complete dispose
            await Future.delayed(const Duration(seconds: 1));

            if (mounted) {
              // WidgetsBinding.instance.addPostFrameCallback((_) {
              //   if (mounted) {
              //     Navigator.pop(context);
              //   }
              // });
              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (mounted) {
                  // ✅ Use Get.off() instead of Navigator

                  Get.off(
                    () => PaymentSuccessScreen(
                      paymentId: params['paymentId'].toString(),
                      packageId: widget.packageListInfo.id.toString(),
                      userId:
                          _userService.currentUserData?.data?.token == null ||
                              _userService.currentUserData?.data?.token
                                      .toString() ==
                                  "null"
                          ? ""
                          : _userService.currentUserData!.data!.id.toString(),
                      isGuest:
                          _userService.currentUserData?.data?.token == null ||
                          _userService.currentUserData?.data?.token
                                  .toString() ==
                              "null",
                      guestEmail:
                          _emailController.text.toString() == "" ||
                              _emailController.text.toString() == "null"
                          ? ""
                          : _emailController.text.toString(),
                      guestAccessToken: _guestAccessToken,
                    ),
                  );
                }
              });
              //Close PayPal screen

              // Navigate to your success screen
            }
            // Navigator.pop(context);

            // _showSuccessDialog(params);
          },
          onError: (error) {
            global.showToastMessage(message: tr("Payment Failed"));
            Get.off(() => BottomNavigationBarScreen(index: 0));
          },
          onCancel: (params) {
            global.showToastMessage(message: tr("Payment Failed"));
            Get.off(() => BottomNavigationBarScreen(index: 0));
          },
        ),
      ),
    );
  }
}
