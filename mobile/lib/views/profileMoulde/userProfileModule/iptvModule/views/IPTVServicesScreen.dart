import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/utills/UserService.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import 'package:esimconnect/views/authModule/view/loginScreen.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart' hide Trans;
import 'package:sizer/sizer.dart';
import 'package:url_launcher/url_launcher.dart';

class IPTVServicesScreen extends StatefulWidget {
  const IPTVServicesScreen({super.key});

  @override
  State<IPTVServicesScreen> createState() => _IPTVServicesScreenState();
}

class _IPTVServicesScreenState extends State<IPTVServicesScreen> {
  final ApiService _apiService = ApiService();
  final UserService _userService = UserService.to;
  final TextEditingController _macController = TextEditingController();
  final TextEditingController _noteController = TextEditingController();

  bool _isLoading = true;
  bool _isCreating = false;
  String? _error;
  String _actionMode = 'buy';
  String _deviceType = 'm3u';
  String _subscriptionTerm = '1';
  String _renewalTerm = '1';
  String? _selectedPackageId;
  String? _selectedRenewOrderId;
  bool _autoRenew = true;
  String _selectedPaymentMethod = 'wallet';
  Map<String, dynamic> _settings = <String, dynamic>{};
  Map<String, dynamic> _content = <String, dynamic>{};
  List<Map<String, dynamic>> _packages = <Map<String, dynamic>>[];
  List<Map<String, dynamic>> _orders = <Map<String, dynamic>>[];

  bool get _isLoggedIn =>
      _userService.currentUserData?.data?.token?.isNotEmpty == true;

  static const List<Map<String, String>> _deviceTypes = <Map<String, String>>[
    {'value': 'm3u', 'label': 'M3U'},
    {'value': 'mag', 'label': 'MAG'},
    {'value': 'protocol', 'label': 'Protocol'},
  ];

  static const List<Map<String, String>> _standardTerms = <Map<String, String>>[
    {'value': 'free_1h', 'label': 'Free 1 Hour'},
    {'value': 'free_2h', 'label': 'Free 2 Hours'},
    {'value': 'free_3h', 'label': 'Free 3 Hours'},
    {'value': 'free_4h', 'label': 'Free 4 Hours'},
    {'value': 'free_5h', 'label': 'Free 5 Hours'},
    {'value': 'free_6h', 'label': 'Free 6 Hours'},
    {'value': 'free_1d', 'label': 'Free 24 Hours'},
    {'value': 'free_48h', 'label': 'Free 48 Hours'},
    {'value': '1', 'label': '1 Month'},
    {'value': '3', 'label': '3 Months'},
    {'value': '6', 'label': '6 Months'},
    {'value': '12', 'label': '12 Months'},
  ];

  static const List<Map<String, String>> _iotvTerms = <Map<String, String>>[
    {'value': 'free_1d', 'label': 'Free 24 Hours'},
    {'value': 'free_48h', 'label': 'Free 48 Hours'},
    {'value': '1', 'label': '1 Month'},
    {'value': '3', 'label': '3 Months'},
    {'value': '6', 'label': '6 Months'},
    {'value': '12', 'label': '12 Months'},
  ];

  bool get _isIotvProvider =>
      (_settings['activeProvider']?.toString().toLowerCase() ?? '') == 'iotv';

  bool get _canCreateMobileTrial =>
      _settings['demoEnabled'] == true && _settings['allowMobileTrial'] != false;

  List<Map<String, String>> get _subscriptionTerms {
    final terms = _isIotvProvider ? _iotvTerms : _standardTerms;
    if (_canCreateMobileTrial) return terms;
    return terms
        .where((term) => !(term['value']?.startsWith('free_') ?? false))
        .toList();
  }

  List<Map<String, String>> get _trialTerms => _subscriptionTerms
      .where((term) => term['value']?.startsWith('free_') ?? false)
      .toList();

  List<Map<String, String>> get _paidTerms => _subscriptionTerms
      .where((term) => !(term['value']?.startsWith('free_') ?? false))
      .toList();

  String get _defaultTrialTerm {
    final trials = _trialTerms;
    if (trials.isNotEmpty) return trials.first['value'] ?? 'free_1d';
    return _isIotvProvider ? 'free_1d' : 'free_1h';
  }

  String get _defaultPaidTerm {
    final paid = _paidTerms;
    if (paid.any((term) => term['value'] == '1')) return '1';
    return paid.isNotEmpty ? (paid.first['value'] ?? '1') : '1';
  }

  bool get _hasRenewableOrders => _orders.isNotEmpty;

  bool _isFreeTerm(String? value) => value?.startsWith('free_') ?? false;

  Map<String, dynamic>? get _selectedPackage {
    for (final package in _packages) {
      if (package['id']?.toString() == _selectedPackageId) return package;
    }
    return _packages.isNotEmpty ? _packages.first : null;
  }

  Map<String, dynamic>? get _selectedRenewOrder {
    if (_selectedRenewOrderId == null) {
      return _orders.isNotEmpty ? _orders.first : null;
    }
    for (final order in _orders) {
      if (order['id']?.toString() == _selectedRenewOrderId) return order;
    }
    return _orders.isNotEmpty ? _orders.first : null;
  }

  String _orderSubscriptionValue(Map<String, dynamic>? order) {
    if (order == null) return _defaultPaidTerm;
    final raw = order['subscriptionTerm']?.toString();
    if (raw != null && raw.isNotEmpty && raw != 'null') {
      if (_isFreeTerm(raw)) return _defaultPaidTerm;
      if (_paidTerms.any((term) => term['value'] == raw)) return raw;
    }

    final months = int.tryParse(order['subscriptionMonths']?.toString() ?? '');
    if (months != null && months > 0 && months != 99) {
      final value = months.toString();
      if (_paidTerms.any((term) => term['value'] == value)) return value;
    }

    return _defaultPaidTerm;
  }

  bool _orderIsTrial(Map<String, dynamic>? order) {
    if (order == null) return false;
    final term = order['subscriptionTerm']?.toString();
    final termType = order['subscriptionTermType']?.toString();
    final label = _termLabel(order).toLowerCase();
    return _isFreeTerm(term) ||
        termType == 'hours' ||
        label.contains('free') ||
        label.contains('trial') ||
        label.contains('demo');
  }

  void _syncRenewDefaultsFromOrder([Map<String, dynamic>? order]) {
    final selectedOrder = order ?? _selectedRenewOrder;
    final packageId = selectedOrder?['packageId']?.toString();
    if (packageId != null &&
        packageId.isNotEmpty &&
        _packages.any((item) => item['id']?.toString() == packageId)) {
      _selectedPackageId = packageId;
    }
    _renewalTerm = _orderIsTrial(selectedOrder)
        ? _defaultPaidTerm
        : _orderSubscriptionValue(selectedOrder);
    _subscriptionTerm = _renewalTerm;
    _autoRenew = true;
  }

  void _setActionMode(String mode) {
    setState(() {
      _actionMode = mode;
      _autoRenew = true;
      if (mode == 'trial') {
        _subscriptionTerm = _defaultTrialTerm;
        _renewalTerm = _defaultPaidTerm;
      } else if (mode == 'renew') {
        if (_orders.isNotEmpty) {
          _selectedRenewOrderId ??= _orders.first['id']?.toString();
        }
        _syncRenewDefaultsFromOrder();
      } else {
        _subscriptionTerm = _defaultPaidTerm;
        _renewalTerm = _subscriptionTerm;
      }
    });
  }

  List<String> get _paymentPriorityLabels {
    final enabled = <String>{
      if (_settings['paymentWalletEnabled'] != false) 'wallet',
      if (_settings['paymentUsdtEnabled'] != false) 'usdt',
      if (_settings['paymentPaypalEnabled'] != false) 'paypal',
      if (_settings['paymentCardEnabled'] != false) 'card',
    };
    final rawPriority = (_settings['paymentPriority'] as List?)?.map((item) => item.toString()).toList() ??
        <String>['wallet', 'usdt', 'paypal', 'card'];
    final labels = <String, String>{
      'wallet': 'Wallet Balance',
      'usdt': 'USDT',
      'paypal': 'PayPal',
      'card': 'Credit Card',
    };
    return rawPriority
        .where(enabled.contains)
        .map((method) => labels[method] ?? method)
        .toList();
  }

  List<String> get _paymentAvailableLabels {
    final enabled = <String>{
      if (_settings['paymentWalletEnabled'] != false) 'wallet',
      if (_settings['paymentPaypalEnabled'] != false) 'paypal',
      if (_settings['paymentCardEnabled'] != false) 'card',
      if (_settings['paymentUsdtEnabled'] != false) 'usdt',
    };
    final labels = <String, String>{
      'wallet': 'Wallet',
      'paypal': 'PayPal',
      'card': 'Credit Card',
      'usdt': 'USDT',
    };
    return <String>['wallet', 'paypal', 'card', 'usdt']
        .where(enabled.contains)
        .map((method) => labels[method] ?? method)
        .toList();
  }

  String get _paymentAvailableText {
    final labels = _paymentAvailableLabels;
    if (labels.isEmpty) return '';
    return '${'Payments Available'.tr()}\n${labels.join(' - ')}';
  }

  List<Map<String, String>> get _paymentMethods {
    final enabled = <String>{
      if (_settings['paymentWalletEnabled'] != false) 'wallet',
      if (_settings['paymentUsdtEnabled'] != false) 'usdt',
      if (_settings['paymentPaypalEnabled'] != false) 'paypal',
      if (_settings['paymentCardEnabled'] != false) 'card',
    };
    final rawPriority =
        (_settings['paymentPriority'] as List?)
            ?.map((item) => item.toString())
            .toList() ??
        <String>['wallet', 'usdt', 'paypal', 'card'];
    final ordered = <String>[
      if (enabled.contains('wallet')) 'wallet',
      ...rawPriority.where((method) => method != 'wallet' && enabled.contains(method)),
      ...enabled.where((method) => method != 'wallet' && !rawPriority.contains(method)),
    ];
    final labels = <String, String>{
      'wallet': 'Wallet Balance',
      'usdt': 'USDT',
      'paypal': 'PayPal',
      'card': 'Credit Card',
    };
    return ordered
        .map((method) => <String, String>{
              'value': method,
              'label': labels[method] ?? method,
            })
        .toList();
  }

  double _numberValue(dynamic value) {
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '') ?? 0;
  }

  bool _containsKeyDeep(Map<String, dynamic> source, String key) {
    if (source.containsKey(key)) return true;
    for (final value in source.values) {
      if (value is Map && _containsKeyDeep(Map<String, dynamic>.from(value), key)) {
        return true;
      }
    }
    return false;
  }

  dynamic _valueByKeyDeep(Map<String, dynamic> source, String key) {
    if (source.containsKey(key)) return source[key];
    for (final value in source.values) {
      if (value is Map) {
        final nested = Map<String, dynamic>.from(value);
        if (_containsKeyDeep(nested, key)) {
          return _valueByKeyDeep(nested, key);
        }
      }
    }
    return null;
  }

  double _trialPrice() {
    final package = _selectedPackage ?? <String, dynamic>{};
    final term = _subscriptionTerm;
    final keys = term == 'free_48h'
        ? <String>[
            'free_48h',
            'trial48hPrice',
            'free48hPrice',
            'demo48hPrice',
            'trialPrice48h',
          ]
        : term == 'free_1d'
            ? <String>[
                'free_1d',
                'trial24hPrice',
                'free24hPrice',
                'demo24hPrice',
                'trialPrice24h',
              ]
            : <String>[
                'trialPrice',
                'demoPrice',
                'freeTrialPrice',
              ];

    for (final source in <Map<String, dynamic>>[package, _settings]) {
      for (final key in keys) {
        final price = _numberValue(_valueByKeyDeep(source, key));
        if (price > 0) return price;
        if (_containsKeyDeep(source, key) && price == 0) return 0;
      }
    }
    return 0;
  }

  double _subscriptionPrice() {
    if (_actionMode == 'trial') return _trialPrice();
    final package = _selectedPackage ?? <String, dynamic>{};
    final term = _subscriptionTerm;
    final month = int.tryParse(term) ?? 1;
    final keys = <String>[
      'price${month}Month',
      'price${month}Months',
      '${month}MonthPrice',
      '${month}MonthsPrice',
      'month${month}Price',
      'months${month}Price',
      'subscription${month}MonthPrice',
      'subscription${month}MonthsPrice',
      'price_$term',
      'price$term',
      if (term == '1') ...<String>[
        'monthlyPrice',
        'oneMonthPrice',
        'oneMonth',
      ],
      'price',
      'amount',
      'cost',
    ];

    for (final source in <Map<String, dynamic>>[package, _settings]) {
      for (final key in keys) {
        final price = _numberValue(_valueByKeyDeep(source, key));
        if (price > 0) return price;
        if (_containsKeyDeep(source, key) && price == 0) return 0;
      }
    }
    return 0;
  }

  String _moneyText(double amount) {
    final symbol =
        (_selectedPackage?['currencySymbol'] ??
                _selectedPackage?['currency'] ??
                _settings['currencySymbol'] ??
                '\$')
            .toString();
    return '$symbol${amount.toStringAsFixed(2)}';
  }

  String _walletBalanceText() {
    final balance =
        _userService.currentUserData?.data?.walletBalance?.toString() ?? '0.00';
    final parsed = double.tryParse(balance);
    final currency =
        (_settings['currencyCode'] ?? _settings['currency'] ?? 'USD')
            .toString();
    return '$currency ${(parsed ?? 0).toStringAsFixed(2)}';
  }

  double _walletBalanceAmount() {
    final balance =
        _userService.currentUserData?.data?.walletBalance?.toString() ?? '0';
    return double.tryParse(balance) ?? 0;
  }

  String _selectedTrialLabel() {
    for (final term in _trialTerms) {
      if (term['value'] == _subscriptionTerm) {
        return term['label'] ?? 'Trial';
      }
    }
    return 'Trial';
  }

  String _selectedSubscriptionLabel() {
    final terms = _actionMode == 'trial' ? _trialTerms : _paidTerms;
    for (final term in terms) {
      if (term['value'] == _subscriptionTerm) {
        return term['label'] ?? 'Subscription';
      }
    }
    return _actionMode == 'renew' ? 'Renew Subscription' : 'Subscription';
  }

  void _openPaymentPage() {
    debugPrint('IPTV payment tapped: action=$_actionMode package=$_selectedPackageId term=$_subscriptionTerm');
    if (_selectedPackageId == null || _selectedPackageId!.isEmpty) {
      _showMessage('Select Available Subscription first.');
      return;
    }
    if (_actionMode == 'renew' && !_hasRenewableOrders) {
      _showMessage('No IPTV subscription is available to renew.');
      return;
    }
    if (_deviceType == 'mag' && _macController.text.trim().isEmpty) {
      _showMessage('MAC address is required for MAG devices.');
      return;
    }

    final methods = _paymentMethods;
    final initialPaymentMethod = methods.isNotEmpty
        ? methods.first['value'] ?? 'wallet'
        : 'wallet';
    final price = _subscriptionPrice();

    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => IPTVTrialPaymentScreen(
          title: _actionMode == 'trial'
              ? 'Trial Payment'
              : _actionMode == 'renew'
                  ? 'Renew Payment'
                  : 'Payment',
          packageName: 'Available Subscription',
          trialLabel: _selectedSubscriptionLabel(),
          priceLabel: _actionMode == 'trial' ? 'Trial Price' : 'Package Price',
          priceAmount: price,
          priceText: _moneyText(price),
          isFree: price <= 0,
          freeMessage: _actionMode == 'trial'
              ? 'Trial Price Is 0.00. Nothing Will Be Charged.'
              : 'Package Price Is 0.00. Nothing Will Be Charged.',
          confirmLabel: _actionMode == 'trial'
              ? 'Confirm Trial'
              : _actionMode == 'renew'
                  ? 'Confirm Renew'
                  : 'Confirm Payment',
          paymentMethods: methods,
          initialPaymentMethod: initialPaymentMethod,
          walletBalanceAmount: _walletBalanceAmount(),
          walletBalanceText: _walletBalanceText(),
          onConfirm: (paymentMethod) async {
            _selectedPaymentMethod = paymentMethod;
            return _createSubscription(
              openSubscriptionsPage: false,
              rethrowErrors: true,
            );
          },
        ),
      ),
    );
  }

  void _openTrialPaymentSection() => _openPaymentPage();

  @override
  void initState() {
    super.initState();
    if (!_isLoggedIn) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Get.offAll(() => LoginScreen());
      });
      return;
    }
    _loadData();
  }

  @override
  void dispose() {
    _macController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final catalogResponse = await _apiService.get('iptv/catalog?platform=mobile');
      final orderResponse = await _apiService.get('iptv/orders');

      final catalog = catalogResponse is Map<String, dynamic>
          ? (catalogResponse['data'] as Map<String, dynamic>? ??
              <String, dynamic>{})
          : <String, dynamic>{};
      final settings =
          (catalog['settings'] as Map?)?.cast<String, dynamic>() ??
              <String, dynamic>{};
      final content =
          (catalog['content'] as Map?)?.cast<String, dynamic>() ??
              <String, dynamic>{};
      final packages = ((catalog['packages'] as List?) ?? const [])
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();
      final orders = orderResponse is Map<String, dynamic>
          ? (((orderResponse['data'] as List?) ?? const [])
              .map((item) => Map<String, dynamic>.from(item as Map))
              .toList())
          : <Map<String, dynamic>>[];

      if (!mounted) return;
      setState(() {
        _settings = settings;
        _content = content;
        _packages = packages;
        _orders = orders;
        if (_selectedPackageId == null && packages.isNotEmpty) {
          _selectedPackageId = packages.first['id']?.toString();
        }
        if (_selectedRenewOrderId == null && orders.isNotEmpty) {
          _selectedRenewOrderId = orders.first['id']?.toString();
        }
        if (!_hasRenewableOrders && _actionMode == 'renew') {
          _actionMode = 'buy';
        }
        if (_actionMode == 'trial' &&
            !_trialTerms.any((term) => term['value'] == _subscriptionTerm)) {
          _subscriptionTerm = _defaultTrialTerm;
        } else if (_actionMode == 'renew') {
          _syncRenewDefaultsFromOrder();
        } else if (!_paidTerms.any((term) => term['value'] == _subscriptionTerm)) {
          _subscriptionTerm = _defaultPaidTerm;
        }
        if (!_paidTerms.any((term) => term['value'] == _renewalTerm)) {
          _renewalTerm = _defaultPaidTerm;
        }
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<Map<String, dynamic>> _createSubscription({
    bool openSubscriptionsPage = true,
    bool rethrowErrors = false,
  }) async {
    if (_actionMode == 'trial' && _trialTerms.isEmpty) {
      _showMessage('Trial is not available right now.');
      return <String, dynamic>{'orders': _orders, 'settings': _settings};
    }
    if (_actionMode == 'renew' && !_hasRenewableOrders) {
      _showMessage('No IPTV subscription is available to renew.');
      return <String, dynamic>{'orders': _orders, 'settings': _settings};
    }
    if (_selectedPackageId == null || _selectedPackageId!.isEmpty) {
      _showMessage('Select Available Subscription first.');
      return <String, dynamic>{'orders': _orders, 'settings': _settings};
    }
    if (_deviceType == 'mag' && _macController.text.trim().isEmpty) {
      _showMessage('MAC address is required for MAG devices.');
      return <String, dynamic>{'orders': _orders, 'settings': _settings};
    }
    if (_subscriptionPrice() > 0 && _selectedPaymentMethod != 'wallet') {
      final message =
          'Please complete the selected payment before creating the IPTV subscription.';
      _showMessage(message);
      if (rethrowErrors) throw Exception(message);
      return <String, dynamic>{'orders': _orders, 'settings': _settings};
    }
    if (_subscriptionPrice() > 0 &&
        _selectedPaymentMethod == 'wallet' &&
        _walletBalanceAmount() < _subscriptionPrice()) {
      final message = 'Insufficient wallet balance.';
      _showMessage(message);
      if (rethrowErrors) throw Exception(message);
      return <String, dynamic>{'orders': _orders, 'settings': _settings};
    }

    FocusScope.of(context).unfocus();
    final previousOrderIds = _orders
        .map((order) => order['id']?.toString() ?? '')
        .where((id) => id.isNotEmpty)
        .toSet();
    setState(() {
      _isCreating = true;
    });

    try {
      final createResponse = await _apiService.post(
        'iptv/orders',
        data: <String, dynamic>{
          'action': _actionMode,
          if (_actionMode == 'renew' && _selectedRenewOrderId != null)
            'renewOrderId': _selectedRenewOrderId,
          'deviceType': _deviceType,
          'packageId': _selectedPackageId,
          'subscriptionTerm': _subscriptionTerm,
          'autoRenew': _autoRenew,
          'renewalTerm': _renewalTerm,
          'paymentMethod': _selectedPaymentMethod,
          'amount': _subscriptionPrice(),
          'currency': (_settings['currencyCode'] ?? _settings['currency'] ?? 'USD')
              .toString(),
          'clientPlatform': 'mobile',
          'macAddress': _macController.text.trim(),
          'note': _noteController.text.trim(),
        },
      );

      if (createResponse is Map && createResponse['success'] == false) {
        throw Exception(
          createResponse['message']?.toString() ??
              'IPTV order was not created.',
        );
      }

      final createdOrderId = _extractCreatedOrderId(createResponse);
      _macController.clear();
      _noteController.clear();
      await _loadData();
      final hasCreatedOrder = createdOrderId == null
          ? _orders.any((order) {
              final id = order['id']?.toString() ?? '';
              return id.isNotEmpty && !previousOrderIds.contains(id);
            })
          : _orders.any((order) => order['id']?.toString() == createdOrderId);

      if (!hasCreatedOrder) {
        throw Exception(
          'Payment was confirmed, but the IPTV order was not found in the order list. Please check backend order creation.',
        );
      }

      _showMessage('IPTV subscription created successfully.');
      if (mounted && openSubscriptionsPage) {
        _openMySubscriptionsPage();
      }
    } catch (e) {
      _showMessage(e.toString());
      if (rethrowErrors) rethrow;
    } finally {
      if (mounted) {
        setState(() {
          _isCreating = false;
        });
      }
    }
    return <String, dynamic>{'orders': _orders, 'settings': _settings};
  }

  String? _extractCreatedOrderId(dynamic response) {
    if (response is! Map) return null;
    final direct = response['id'] ?? response['orderId'] ?? response['iptvOrderId'];
    if (direct != null && direct.toString().isNotEmpty) return direct.toString();
    final data = response['data'];
    if (data is Map) {
      final value = data['id'] ?? data['orderId'] ?? data['iptvOrderId'];
      if (value != null && value.toString().isNotEmpty) {
        return value.toString();
      }
      final order = data['order'];
      if (order is Map && order['id'] != null) return order['id'].toString();
    }
    return null;
  }

  void _openMySubscriptionsPage() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => MyIPTVSubscriptionsScreen(
          orders: _orders,
          settings: _settings,
        ),
      ),
    );
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  String _termLabel(Map<String, dynamic> order) {
    final label = order['subscriptionLabel']?.toString();
    if (label != null && label.isNotEmpty) return label;
    final termType = order['subscriptionTermType']?.toString();
    final hours = int.tryParse(order['subscriptionHours']?.toString() ?? '');
    if (termType == 'hours' && hours != null) {
      if (hours == 24) return 'Free 1 Day';
      return 'Free $hours Hour${hours == 1 ? '' : 's'}';
    }
    final months =
        int.tryParse(order['subscriptionMonths']?.toString() ?? '') ?? 0;
    return months == 99 ? 'Demo' : '$months Months';
  }

  String _expiresAt(Map<String, dynamic> order) {
    final value = order['expiresAt']?.toString();
    if (value == null || value.isEmpty) return 'Not available';
    final parsed = DateTime.tryParse(value);
    if (parsed == null) return value;
    return DateFormat('MMM d, yyyy h:mm a').format(parsed.toLocal());
  }

  Future<void> _copy(String value) async {
    await Clipboard.setData(ClipboardData(text: value));
    _showMessage('Copied.');
  }

  Future<void> _copyM3uDownloadLink(Map<String, dynamic> order) async {
    final id = order['id']?.toString() ?? '';
    if (id.isEmpty) return;
    await Clipboard.setData(
      ClipboardData(text: 'iptv/orders/$id/m3u-download'),
    );
    _showMessage('M3U download link copied.');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.scaffoldbackgroudColor,
      appBar: AppBar(
        backgroundColor: AppColors.scaffoldbackgroudColor,
        elevation: 0,
        title: Text('IPTV Services'.tr()),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: ListView(
                padding: EdgeInsets.all(5.w),
                children: <Widget>[
                  if (_error != null)
                    _infoBox(_error!, Colors.redAccent.withOpacity(0.15)),
                  _buildSpecialMessages(),
                  _buildCreateCard(),
                  SizedBox(height: 4.w),
                  _buildContentCatalog(),
                  SizedBox(height: 4.w),
                  _buildOrders(),
                ],
              ),
            ),
    );
  }

  Widget _buildCreateCard() {
    final enabled = _settings['enabled'] == true;

    return Container(
      padding: EdgeInsets.all(4.w),
      decoration: _cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            'IPTV Subscriptions'.tr(),
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: AppColors.textColor,
                  fontWeight: FontWeight.normal,
                ),
          ),
          SizedBox(height: 2.w),
          if (!enabled)
            _infoBox(
              'IPTV ordering is not enabled yet.'.tr(),
              Colors.orange.withOpacity(0.15),
            ),
          if (_settings['demoEnabled'] == true && !_canCreateMobileTrial)
            _infoBox(
              'Free IPTV trials are not available in the mobile app right now.'.tr(),
              Colors.orange.withOpacity(0.15),
            ),
          _actionSelector(),
          SizedBox(height: 3.w),
          _label('Device Type'.tr()),
          _dropdown(
            value: _deviceType,
            items: _deviceTypes,
            onChanged: (value) => setState(() => _deviceType = value ?? 'm3u'),
          ),
          SizedBox(height: 3.w),
          if (_actionMode == 'renew' && _hasRenewableOrders) ...<Widget>[
            _label('Renew Subscription'.tr()),
            _renewOrderDropdown(),
            SizedBox(height: 3.w),
          ],
          _label('Available Subscriptions'.tr()),
          _packageDropdown(),
          SizedBox(height: 3.w),
          _label(_actionMode == 'trial' ? 'Trial'.tr() : 'Subscription'.tr()),
          _dropdown(
            value: _subscriptionTerm,
            items: _actionMode == 'trial' ? _trialTerms : _paidTerms,
            onChanged: (value) => setState(() {
              _subscriptionTerm = value ??
                  (_actionMode == 'trial' ? _defaultTrialTerm : _defaultPaidTerm);
              if (_actionMode != 'trial') {
                _renewalTerm = _subscriptionTerm;
              }
            }),
          ),
          if (_actionMode == 'trial') ...<Widget>[
            SizedBox(height: 3.w),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _isCreating ? null : _openTrialPaymentSection,
                icon: const Icon(Icons.play_circle_fill_rounded),
                label: Text('Try Now'.tr()),
              ),
            ),
          ],
          SizedBox(height: 3.w),
          _autoRenewSwitch(),
          if (_autoRenew) ...<Widget>[
            SizedBox(height: 3.w),
            _label('Auto Renew To'.tr()),
            _dropdown(
              value: _renewalTerm,
              items: _paidTerms,
              onChanged: (value) => setState(
                () => _renewalTerm = value ?? _defaultPaidTerm,
              ),
            ),
            if (_actionMode == 'trial') ...<Widget>[
              SizedBox(height: 2.w),
              _infoBox(
                'Trial subscriptions will automatically renew to a 1 Month subscription by default.'.tr(),
                Colors.blueGrey.withOpacity(0.18),
              ),
            ],
          ],
          if (_deviceType == 'mag') ...<Widget>[
            SizedBox(height: 3.w),
            _label('MAC Address'.tr()),
            TextField(
              controller: _macController,
              style: TextStyle(color: AppColors.textColor),
              decoration: _inputDecoration('00:1A:79:XX:XX:XX'),
            ),
          ],
          SizedBox(height: 3.w),
          _label('Note'.tr()),
          TextField(
            controller: _noteController,
            style: TextStyle(color: AppColors.textColor),
            maxLines: 2,
            decoration: _inputDecoration('Optional note'.tr()),
          ),
          if (_paymentAvailableText.isNotEmpty) ...<Widget>[
            SizedBox(height: 3.w),
            _infoBox(
              _paymentAvailableText,
              Colors.blueGrey.withOpacity(0.18),
            ),
          ],
          SizedBox(height: 4.w),
          if (_actionMode != 'trial')
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: enabled && !_isCreating
                    ? _openPaymentPage
                    : null,
                icon: _isCreating
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.tv),
                label: Text(
                  (_actionMode == 'trial'
                          ? 'Confirm Trial'
                          : _actionMode == 'renew'
                              ? 'Renew IPTV'
                              : 'Buy IPTV')
                      .tr(),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _actionSelector() {
    final actions = <Map<String, dynamic>>[
      <String, dynamic>{
        'value': 'buy',
        'label': 'Buy',
        'enabled': true,
      },
      <String, dynamic>{
        'value': 'trial',
        'label': 'Trial',
        'enabled': _trialTerms.isNotEmpty,
      },
      <String, dynamic>{
        'value': 'renew',
        'label': 'Renew',
        'enabled': _hasRenewableOrders,
      },
      <String, dynamic>{
        'value': 'my_package',
        'label': 'Package',
        'enabled': true,
      },
    ];

    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.scaffoldbackgroudColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.appBorder),
      ),
      child: Row(
        children: actions.map((action) {
          return _actionButton(
            action['value'].toString(),
            action['label'].toString(),
            enabled: action['enabled'] == true,
          );
        }).toList(),
      ),
    );
  }

  Widget _actionButton(
    String value,
    String label, {
    required bool enabled,
  }) {
    final selected = _actionMode == value;
    return Expanded(
      child: Opacity(
        opacity: enabled ? 1 : 0.42,
        child: GestureDetector(
          onTap: enabled
              ? () {
                  if (value == 'my_package') {
                    _openMySubscriptionsPage();
                    return;
                  }
                  _setActionMode(value);
                }
              : null,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 12),
            decoration: BoxDecoration(
              color: selected ? AppColors.primaryColor : Colors.transparent,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              label,
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 14.sp,
                fontWeight: FontWeight.normal,
                color: selected ? Colors.white : AppColors.textGreyColor,
              ),
            ).tr(),
          ),
        ),
      ),
    );
  }

  Widget _renewOrderDropdown() {
    return DropdownButtonFormField<String>(
      value: _selectedRenewOrderId,
      isExpanded: true,
      decoration: _inputDecoration('Select subscription'.tr()),
      dropdownColor: AppColors.scaffoldbackgroudColor,
      items: _orders
          .map(
            (order) => DropdownMenuItem<String>(
              value: order['id']?.toString(),
              child: Text(
                'Available Subscription - ${_termLabel(order)}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          )
          .toList(),
      selectedItemBuilder: (context) => _orders
          .map(
            (order) => LayoutBuilder(
              builder: (context, constraints) => SizedBox(
                width: constraints.maxWidth,
                child: Text(
                  'Available Subscription - ${_termLabel(order)}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  softWrap: false,
                ),
              ),
            ),
          )
          .toList(),
      onChanged: (value) {
        if (value == null) return;
        setState(() {
          _selectedRenewOrderId = value;
          _syncRenewDefaultsFromOrder();
        });
      },
    );
  }

  Widget _autoRenewSwitch() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.scaffoldbackgroudColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.appBorder),
      ),
      child: Row(
        children: <Widget>[
          Expanded(
            child: Text(
              'Auto Renew',
              style: TextStyle(
                color: AppColors.textColor,
                fontSize: 14.sp,
                fontWeight: FontWeight.normal,
              ),
            ).tr(),
          ),
          Switch(
            value: _autoRenew,
            onChanged: (value) => setState(() => _autoRenew = value),
          ),
        ],
      ),
    );
  }

  Widget _buildOrders() {
    if (_orders.isEmpty) {
      return _infoBox(
        'No IPTV subscriptions yet.'.tr(),
        Colors.blueGrey.withOpacity(0.18),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(
          'My IPTV'.tr(),
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: AppColors.textColor,
                fontWeight: FontWeight.normal,
              ),
        ),
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            onPressed: _openMySubscriptionsPage,
            icon: const Icon(Icons.subscriptions_rounded),
            label: Text('My IPTV Subscriptions'.tr()),
          ),
        ),
        SizedBox(height: 3.w),
        ..._orders.map(_orderCard),
      ],
    );
  }

  Widget _buildSpecialMessages() {
    final promotionEnabled = _settings['specialPromotionEnabled'] == true;
    final offerEnabled = _settings['specialOfferEnabled'] == true;
    if (!promotionEnabled && !offerEnabled) return const SizedBox.shrink();

    return Column(
      children: <Widget>[
        if (promotionEnabled)
          _specialMessageCard(
            _settings['specialPromotionTitle']?.toString().isNotEmpty == true
                ? _settings['specialPromotionTitle'].toString()
                : 'Special Promotion'.tr(),
            _settings['specialPromotionBody']?.toString() ?? '',
            Icons.local_offer,
          ),
        if (offerEnabled)
          _specialMessageCard(
            _settings['specialOfferTitle']?.toString().isNotEmpty == true
                ? _settings['specialOfferTitle'].toString()
                : 'Special Offer'.tr(),
            _settings['specialOfferBody']?.toString() ?? '',
            Icons.card_giftcard,
          ),
      ],
    );
  }

  Widget _specialMessageCard(String title, String body, IconData icon) {
    return Container(
      width: double.infinity,
      margin: EdgeInsets.only(bottom: 3.w),
      padding: EdgeInsets.all(4.w),
      decoration: _cardDecoration(),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Icon(icon, color: AppColors.primaryColor),
          SizedBox(width: 3.w),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  title,
                  style: TextStyle(
                    color: AppColors.textColor,
                    fontWeight: FontWeight.normal,
                  ),
                ),
                if (body.isNotEmpty) ...<Widget>[
                  SizedBox(height: 1.w),
                  Text(
                    body,
                    style: TextStyle(color: AppColors.textColor.withOpacity(0.72)),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContentCatalog() {
    final countries = ((_content['countries'] as List?) ?? const [])
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();
    final channels = ((_content['channels'] as List?) ?? const [])
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();
    final movies = ((_content['movies'] as List?) ?? const [])
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();

    if (countries.isEmpty && channels.isEmpty && movies.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(
          'Countries, Channels & Movies'.tr(),
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: AppColors.textColor,
                fontWeight: FontWeight.normal,
              ),
        ),
        SizedBox(height: 3.w),
        _contentSection(
          icon: Icons.public,
          title: 'Countries'.tr(),
          children: countries
              .map(
                (country) => _contentRow(
                  title: country['name']?.toString() ?? '',
                  subtitle:
                      '${country['channelCount'] ?? 0} channels - ${country['movieCount'] ?? 0} movies',
                  trailing: country['code']?.toString(),
                ),
              )
              .toList(),
        ),
        SizedBox(height: 3.w),
        _contentSection(
          icon: Icons.live_tv,
          title: 'Channel List'.tr(),
          children: channels
              .take(10)
              .map(
                (channel) => _contentRow(
                  title: channel['name']?.toString() ?? '',
                  subtitle:
                      '${channel['countryCode'] ?? ''} - ${channel['category'] ?? ''} - ${channel['language'] ?? ''}',
                  trailing: channel['quality']?.toString(),
                ),
              )
              .toList(),
        ),
        SizedBox(height: 3.w),
        _contentSection(
          icon: Icons.movie,
          title: 'Movie Details'.tr(),
          children: movies
              .map(
                (movie) => _contentRow(
                  title: movie['title']?.toString() ?? '',
                  subtitle:
                      '${movie['genre'] ?? ''} - ${movie['year'] ?? ''} - ${movie['runtimeMinutes'] ?? ''} min - ${movie['rating'] ?? ''}',
                  trailing: movie['quality']?.toString(),
                ),
              )
              .toList(),
        ),
      ],
    );
  }

  Widget _contentSection({
    required IconData icon,
    required String title,
    required List<Widget> children,
  }) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(4.w),
      decoration: _cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Icon(icon, color: AppColors.primaryColor),
              SizedBox(width: 2.w),
              Text(
                title,
                style: TextStyle(
                  color: AppColors.textColor,
                  fontWeight: FontWeight.normal,
                ),
              ),
            ],
          ),
          SizedBox(height: 2.w),
          ...children,
        ],
      ),
    );
  }

  Widget _contentRow({
    required String title,
    required String subtitle,
    String? trailing,
  }) {
    return Container(
      margin: EdgeInsets.only(top: 2.w),
      padding: EdgeInsets.all(3.w),
      decoration: BoxDecoration(
        color: AppColors.scaffoldbackgroudColor.withOpacity(0.5),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: <Widget>[
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  title,
                  style: TextStyle(
                    color: AppColors.textColor,
                    fontWeight: FontWeight.normal,
                  ),
                ),
                SizedBox(height: 0.5.w),
                Text(
                  subtitle,
                  style: TextStyle(
                    color: AppColors.textColor.withOpacity(0.68),
                    fontSize: 14.sp,
                  ),
                ),
              ],
            ),
          ),
          if (trailing != null && trailing.isNotEmpty)
            Chip(label: Text(trailing)),
        ],
      ),
    );
  }

  Widget _orderCard(Map<String, dynamic> order) {
    final credentials = <String>[
      order['m3uUrl']?.toString() ?? '',
      order['portalUrl']?.toString() ?? '',
      order['protocolCode']?.toString() ?? '',
    ].firstWhere((value) => value.isNotEmpty, orElse: () => '');

    return InkWell(
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => IPTVSubscriptionDetailsScreen(
            order: order,
            settings: _settings,
          ),
        ),
      ),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        margin: EdgeInsets.only(bottom: 3.w),
        padding: EdgeInsets.all(4.w),
        decoration: _cardDecoration(),
        child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Expanded(
                child: Text(
                  'Available Subscription',
                  style: TextStyle(
                    color: AppColors.textColor,
                    fontWeight: FontWeight.normal,
                  ),
                ),
              ),
              Chip(label: Text((order['status'] ?? 'active').toString())),
            ],
          ),
          Text(
            '${(order['deviceType'] ?? 'm3u').toString().toUpperCase()} - ${_termLabel(order)}',
            style: TextStyle(color: AppColors.textColor),
          ),
          SizedBox(height: 1.w),
          Text(
            'Expires ${_expiresAt(order)}',
            style: TextStyle(color: AppColors.textColor.withOpacity(0.75)),
          ),
          if (credentials.isNotEmpty) ...<Widget>[
            SizedBox(height: 3.w),
            Row(
              children: <Widget>[
                Expanded(
                  child: Text(
                    credentials,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: AppColors.textColor),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.copy),
                  onPressed: () => _copy(credentials),
                ),
              ],
            ),
          ],
          if ((order['m3uUrl']?.toString() ?? '').isNotEmpty) ...<Widget>[
            SizedBox(height: 3.w),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => _copyM3uDownloadLink(order),
                icon: const Icon(Icons.download),
                label: Text('Download M3U'.tr()),
              ),
            ),
          ],
        ],
      ),
      ),
    );
  }

  Widget _packageDropdown() {
    if (_packages.isEmpty) {
      return _infoBox(
        'No available subscriptions right now.'.tr(),
        Colors.blueGrey.withOpacity(0.18),
      );
    }

    return Column(
      children: _packages.asMap().entries.map((entry) {
        final index = entry.key;
        final item = entry.value;
        final id = item['id']?.toString();
        final selected = id == _selectedPackageId;
        final label = _packages.length == 1
            ? 'Available Subscription'
            : 'Available Subscription ${index + 1}';

        return InkWell(
          onTap: () => setState(() => _selectedPackageId = id),
          borderRadius: BorderRadius.circular(14),
          child: Container(
            width: double.infinity,
            margin: EdgeInsets.only(bottom: 2.w),
            padding: EdgeInsets.all(4.w),
            decoration: BoxDecoration(
              color: selected
                  ? AppColors.primaryColor.withOpacity(0.16)
                  : AppColors.scaffoldbackgroudColor,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: selected ? AppColors.primaryColor : AppColors.appBorder,
              ),
            ),
            child: Row(
              children: <Widget>[
                Icon(
                  selected
                      ? Icons.check_circle_rounded
                      : Icons.live_tv_rounded,
                  color: selected
                      ? AppColors.primaryColor
                      : AppColors.textGreyColor,
                ),
                SizedBox(width: 3.w),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        label,
                        style: TextStyle(
                          color: AppColors.textColor,
                          fontSize: 14.sp,
                          fontWeight: FontWeight.normal,
                        ),
                      ),
                      SizedBox(height: 0.8.w),
                      Text(
                        selected
                            ? 'Selected'.tr()
                            : 'Tap to choose this subscription'.tr(),
                        style: TextStyle(
                          color: AppColors.textGreyColor,
                          fontSize: 14.sp,
                          fontWeight: FontWeight.normal,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _dropdown({
    required String value,
    required List<Map<String, String>> items,
    required ValueChanged<String?> onChanged,
  }) {
    if (items.isEmpty) {
      return _infoBox('No options available right now.'.tr(), Colors.orange.withOpacity(0.15));
    }
    final selectedValue = items.any((item) => item['value'] == value) ? value : null;
    return DropdownButtonFormField<String>(
      value: selectedValue,
      isExpanded: true,
      decoration: _inputDecoration(''),
      dropdownColor: AppColors.scaffoldbackgroudColor,
      items: items
          .map(
            (item) => DropdownMenuItem<String>(
              value: item['value'],
              child: Text(item['label'] ?? ''),
            ),
          )
          .toList(),
      onChanged: onChanged,
    );
  }

  Widget _label(String text) {
    return Padding(
      padding: EdgeInsets.only(bottom: 1.w),
      child: Text(
        text,
        style: TextStyle(
          color: AppColors.textColor,
          fontWeight: FontWeight.normal,
        ),
      ),
    );
  }

  Widget _infoBox(String message, Color color) {
    return Container(
      width: double.infinity,
      margin: EdgeInsets.only(bottom: 3.w),
      padding: EdgeInsets.all(3.w),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(message, style: TextStyle(color: AppColors.textColor)),
    );
  }

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      filled: true,
      fillColor: AppColors.appBackground,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
    );
  }

  BoxDecoration _cardDecoration() {
    return BoxDecoration(
      color: AppColors.appBackground,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: AppColors.primaryColor.withOpacity(0.16)),
    );
  }
}

class MyIPTVSubscriptionsScreen extends StatelessWidget {
  final List<Map<String, dynamic>> orders;
  final Map<String, dynamic> settings;

  const MyIPTVSubscriptionsScreen({
    super.key,
    required this.orders,
    required this.settings,
  });

  String _termLabel(Map<String, dynamic> order) {
    final label = order['subscriptionLabel']?.toString();
    if (label != null && label.isNotEmpty) return label;
    final termType = order['subscriptionTermType']?.toString();
    final hours = int.tryParse(order['subscriptionHours']?.toString() ?? '');
    if (termType == 'hours' && hours != null) {
      if (hours == 24) return 'Free 24 Hours';
      if (hours == 48) return 'Free 48 Hours';
      return 'Free $hours Hour${hours == 1 ? '' : 's'}';
    }
    final months =
        int.tryParse(order['subscriptionMonths']?.toString() ?? '') ?? 0;
    if (months == 99) return 'Demo';
    return months <= 1 ? '1 Month' : '$months Months';
  }

  String _expiresAt(Map<String, dynamic> order) {
    final value = order['expiresAt']?.toString();
    if (value == null || value.isEmpty) return 'Not available';
    final parsed = DateTime.tryParse(value);
    if (parsed == null) return value;
    return DateFormat('MMM d, yyyy h:mm a').format(parsed.toLocal());
  }

  String _createdAt(Map<String, dynamic> order) {
    final value = order['createdAt']?.toString();
    if (value == null || value.isEmpty) return '';
    final parsed = DateTime.tryParse(value);
    if (parsed == null) return value;
    return DateFormat('dd MMM yyyy, h:mm a').format(parsed.toLocal());
  }

  String _orderNumber(Map<String, dynamic> order, int index) {
    final value = order['displayOrderId'] ??
        order['orderNumber'] ??
        order['orderNo'] ??
        order['id'];
    final text = value?.toString() ?? '';
    if (text.isEmpty) return '${index + 1}';
    return text.length > 12 ? text.substring(0, 12) : text;
  }

  String _priceText(Map<String, dynamic> order) {
    final value = order['total'] ??
        order['price'] ??
        order['amount'] ??
        order['paidAmount'] ??
        order['subtotal'];
    final number = double.tryParse(value?.toString() ?? '');
    final currency = (order['currencyCode'] ??
            order['currency'] ??
            settings['currencyCode'] ??
            'USD')
        .toString();
    if (number == null) return '$currency 0.00';
    return '$currency ${number.toStringAsFixed(2)}';
  }

  String _subscriptionId(Map<String, dynamic> order, int index) {
    final value = order['subscriptionId'] ?? order['providerOrderId'] ?? order['id'];
    final text = value?.toString() ?? '';
    if (text.isEmpty) return '${index + 1}';
    return text.length > 18 ? text.substring(0, 18) : text;
  }

  void _openDetails(BuildContext context, Map<String, dynamic> order) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => IPTVSubscriptionDetailsScreen(
          order: order,
          settings: settings,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.scaffoldbackgroudColor,
      appBar: AppBar(
        backgroundColor: AppColors.scaffoldbackgroudColor,
        elevation: 0,
        title: Text('My IPTV Subscriptions'.tr()),
      ),
      body: orders.isEmpty
          ? Center(
              child: Padding(
                padding: EdgeInsets.all(6.w),
                child: Text(
                  'No IPTV subscriptions yet.'.tr(),
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: AppColors.textColor,
                    fontSize: 14.sp,
                    fontWeight: FontWeight.normal,
                  ),
                ),
              ),
            )
          : ListView.separated(
              padding: EdgeInsets.all(5.w),
              itemCount: orders.length,
              separatorBuilder: (_, __) => SizedBox(height: 3.w),
              itemBuilder: (context, index) {
                final order = orders[index];
                return _subscriptionLogCard(context, order, index);
              },
            ),
    );
  }

  Widget _subscriptionLogCard(
    BuildContext context,
    Map<String, dynamic> order,
    int index,
  ) {
    final status = (order['status'] ?? 'active').toString();
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: Colors.black.withOpacity(0.18),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: Column(
          children: <Widget>[
            Container(
              padding: EdgeInsets.symmetric(horizontal: 4.w, vertical: 3.w),
              color: AppColors.primaryColor,
              child: Row(
                children: <Widget>[
                  const Icon(Icons.receipt_long_rounded, color: Colors.white),
                  SizedBox(width: 3.w),
                  Expanded(
                    child: Text(
                      '${'Order #'.tr()} ${_orderNumber(order, index)}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 14.sp,
                        fontWeight: FontWeight.normal,
                      ),
                    ),
                  ),
                  Text(
                    _createdAt(order),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 14.sp,
                      fontWeight: FontWeight.normal,
                    ),
                  ),
                ],
              ),
            ),
            _logRow(
              icon: Icons.inventory_2_outlined,
              label: 'Package'.tr(),
              value: _termLabel(order),
            ),
            _logRow(
              icon: Icons.attach_money_rounded,
              label: 'Price'.tr(),
              value: _priceText(order),
            ),
            _logRow(
              icon: Icons.confirmation_number_outlined,
              label: 'Subscription ID'.tr(),
              value: _subscriptionId(order, index),
            ),
            _logRow(
              icon: Icons.event_available_rounded,
              label: 'Expires'.tr(),
              value: _expiresAt(order),
            ),
            Container(
              padding: EdgeInsets.all(3.w),
              child: Wrap(
                spacing: 3.w,
                runSpacing: 2.w,
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: <Widget>[
                  _statusPill(status),
                  _reviewPill(),
                  SizedBox(
                    width: 28.w,
                    child: OutlinedButton(
                      onPressed: () => _openDetails(context, order),
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(color: AppColors.primaryColor),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: Text(
                        'View'.tr(),
                        style: TextStyle(
                          color: AppColors.primaryColor,
                          fontSize: 14.sp,
                          fontWeight: FontWeight.normal,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _logRow({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return IntrinsicHeight(
      child: Row(
        children: <Widget>[
          Expanded(
            child: Container(
              padding: EdgeInsets.symmetric(horizontal: 4.w, vertical: 3.5.w),
              decoration: BoxDecoration(
                border: Border(
                  right: BorderSide(color: AppColors.appBorder),
                  bottom: BorderSide(color: AppColors.appBorder),
                ),
              ),
              child: Row(
                children: <Widget>[
                  Icon(icon, color: AppColors.primaryColor),
                  SizedBox(width: 3.w),
                  Expanded(
                    child: Text(
                      label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: Colors.black87,
                        fontSize: 14.sp,
                        fontWeight: FontWeight.normal,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          Expanded(
            child: Container(
              padding: EdgeInsets.symmetric(horizontal: 4.w, vertical: 3.5.w),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(color: AppColors.appBorder),
                ),
              ),
              alignment: Alignment.centerLeft,
              child: Text(
                value,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: Colors.black54,
                  fontSize: 14.sp,
                  fontWeight: FontWeight.normal,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _statusPill(String status) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 4.w, vertical: 2.w),
      decoration: BoxDecoration(
        color: Colors.green.withOpacity(0.08),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.green),
      ),
      child: Row(
        children: <Widget>[
          const Icon(Icons.power_rounded, color: Colors.green, size: 18),
          SizedBox(width: 2.w),
          Text(
            status,
            style: TextStyle(
              color: Colors.green,
              fontSize: 14.sp,
              fontWeight: FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }

  Widget _reviewPill() {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 4.w, vertical: 2.w),
      decoration: BoxDecoration(
        color: Colors.orange.withOpacity(0.08),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.orange),
      ),
      child: Row(
        children: <Widget>[
          const Icon(Icons.star_rounded, color: Colors.orange, size: 18),
          SizedBox(width: 2.w),
          Text(
            'Review'.tr(),
            style: TextStyle(
              color: Colors.orange,
              fontSize: 14.sp,
              fontWeight: FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }
}

class IPTVSubscriptionDetailsScreen extends StatelessWidget {
  final Map<String, dynamic> order;
  final Map<String, dynamic> settings;

  const IPTVSubscriptionDetailsScreen({
    super.key,
    required this.order,
    required this.settings,
  });

  String _valueFrom(
    Map<String, dynamic> source,
    List<String> keys, {
    bool deep = true,
  }) {
    for (final key in keys) {
      final value = _findValue(source, key, deep: deep);
      if (value != null && value.toString().isNotEmpty) {
        return value.toString();
      }
    }
    return '';
  }

  dynamic _findValue(
    Map<String, dynamic> source,
    String key, {
    bool deep = true,
  }) {
    if (source.containsKey(key)) return source[key];
    if (!deep) return null;
    for (final value in source.values) {
      if (value is Map) {
        final found = _findValue(
          Map<String, dynamic>.from(value),
          key,
          deep: deep,
        );
        if (found != null) return found;
      }
    }
    return null;
  }

  String get _username => _valueFrom(order, const <String>[
        'username',
        'userName',
        'iptvUsername',
        'm3uUsername',
        'xtreamUsername',
      ]);

  String get _password => _valueFrom(order, const <String>[
        'password',
        'iptvPassword',
        'm3uPassword',
        'xtreamPassword',
      ]);

  String get _m3uLink {
    final link = _valueFrom(order, const <String>[
      'm3uUrl',
      'm3uDownloadUrl',
      'm3uLink',
      'playlistUrl',
      'playlist',
    ]);
    if (link.isNotEmpty) return link;
    final id = order['id']?.toString() ?? '';
    return id.isEmpty ? '' : 'iptv/orders/$id/m3u-download';
  }

  String get _androidAppUrl {
    final orderUrl = _valueFrom(order, const <String>[
      'androidApkUrl',
      'androidAppUrl',
      'androidDownloadUrl',
      'apkUrl',
      'apkDownloadUrl',
      'playerApkUrl',
      'appDownloadUrl',
    ]);
    if (orderUrl.isNotEmpty) return orderUrl;
    return _valueFrom(settings, const <String>[
      'androidApkUrl',
      'androidAppUrl',
      'androidDownloadUrl',
      'apkUrl',
      'apkDownloadUrl',
      'playerApkUrl',
      'iptvApkUrl',
      'mobileApkUrl',
      'appDownloadUrl',
    ]);
  }

  String get _iosAppUrl {
    final orderUrl = _valueFrom(order, const <String>[
      'iosAppUrl',
      'iosDownloadUrl',
      'iosStoreUrl',
      'appStoreUrl',
      'iphoneAppUrl',
    ]);
    if (orderUrl.isNotEmpty) return orderUrl;
    return _valueFrom(settings, const <String>[
      'iosAppUrl',
      'iosDownloadUrl',
      'iosStoreUrl',
      'appStoreUrl',
      'iphoneAppUrl',
      'iptvIosUrl',
    ]);
  }

  String get _instructions {
    final text = _valueFrom(order, const <String>[
      'instructions',
      'setupInstructions',
      'howToUse',
    ]);
    if (text.isNotEmpty) return text;
    return _valueFrom(settings, const <String>[
      'instructions',
      'setupInstructions',
      'apkInstructions',
      'howToUse',
    ]);
  }

  String _termLabel() {
    final label = order['subscriptionLabel']?.toString();
    if (label != null && label.isNotEmpty) return label;
    final termType = order['subscriptionTermType']?.toString();
    final hours = int.tryParse(order['subscriptionHours']?.toString() ?? '');
    if (termType == 'hours' && hours != null) {
      if (hours == 24) return 'Free 24 Hours';
      if (hours == 48) return 'Free 48 Hours';
      return 'Free $hours Hour${hours == 1 ? '' : 's'}';
    }
    final months =
        int.tryParse(order['subscriptionMonths']?.toString() ?? '') ?? 0;
    if (months == 99) return 'Demo';
    return months <= 1 ? '1 Month' : '$months Months';
  }

  String _expiresAt() {
    final value = order['expiresAt']?.toString();
    if (value == null || value.isEmpty) return 'Not available';
    final parsed = DateTime.tryParse(value);
    if (parsed == null) return value;
    return DateFormat('MMM d, yyyy h:mm a').format(parsed.toLocal());
  }

  Future<void> _copy(BuildContext context, String value) async {
    if (value.isEmpty) return;
    await Clipboard.setData(ClipboardData(text: value));
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Copied.'.tr())),
    );
  }

  Future<void> _openOrCopy(BuildContext context, String value) async {
    if (value.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Download link is not configured yet.'.tr())),
      );
      return;
    }
    final uri = Uri.tryParse(value);
    if (uri != null && uri.hasScheme && uri.host.isNotEmpty) {
      final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (opened) return;
    }
    await _copy(context, value);
  }

  @override
  Widget build(BuildContext context) {
    final status = (order['status'] ?? 'active').toString();
    final device = (order['deviceType'] ?? 'm3u').toString().toUpperCase();

    return Scaffold(
      backgroundColor: AppColors.scaffoldbackgroudColor,
      appBar: AppBar(
        backgroundColor: AppColors.scaffoldbackgroudColor,
        elevation: 0,
        title: Text('IPTV Subscription Details'.tr()),
      ),
      body: ListView(
        padding: EdgeInsets.all(5.w),
        children: <Widget>[
          _section(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  'Available Subscription',
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: AppColors.textColor,
                    fontSize: 14.sp,
                    fontWeight: FontWeight.normal,
                  ),
                ),
                SizedBox(height: 2.w),
                Wrap(
                  spacing: 2.w,
                  runSpacing: 2.w,
                  children: <Widget>[
                    _pill(status),
                    _pill(device),
                    _pill(_termLabel()),
                  ],
                ),
                SizedBox(height: 3.w),
                Text(
                  '${'Expires'.tr()} ${_expiresAt()}',
                  style: TextStyle(
                    color: AppColors.textGreyColor,
                    fontWeight: FontWeight.normal,
                  ),
                ),
              ],
            ),
          ),
          SizedBox(height: 3.w),
          _section(
            title: 'Login Details'.tr(),
            child: Column(
              children: <Widget>[
                _credentialRow(context, 'Username'.tr(), _username),
                SizedBox(height: 2.w),
                _credentialRow(context, 'Password'.tr(), _password),
              ],
            ),
          ),
          SizedBox(height: 3.w),
          _section(
            title: 'How To Use It'.tr(),
            child: _instructions.isNotEmpty
                ? Text(
                    _instructions,
                    style: TextStyle(
                      color: AppColors.textColor,
                      height: 1.4,
                      fontWeight: FontWeight.normal,
                    ),
                  )
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      _instructionLine('Download And Install Our IPTV APK.'),
                      _instructionLine('Open The App And Choose M3U Or Xtream Login.'),
                      _instructionLine('Enter The Username And Password, Or Use The M3U File.'),
                      _instructionLine('Keep Auto Renew Enabled For Uninterrupted Service.'),
                    ],
                  ),
          ),
          SizedBox(height: 3.w),
          _section(
            title: 'Download the APP'.tr(),
            child: Column(
              children: <Widget>[
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => _openOrCopy(context, _androidAppUrl),
                    icon: const Icon(Icons.android_rounded),
                    label: Text('Watch Now on Android'.tr()),
                  ),
                ),
                SizedBox(height: 2.w),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => _openOrCopy(context, _iosAppUrl),
                    icon: const Icon(Icons.phone_iphone_rounded),
                    label: Text('Watch Now on iOS'.tr()),
                  ),
                ),
                SizedBox(height: 2.w),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => _openOrCopy(context, _m3uLink),
                    icon: const Icon(Icons.download_rounded),
                    label: Text('Download M3U'.tr()),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _section({String? title, required Widget child}) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(4.w),
      decoration: BoxDecoration(
        color: AppColors.appBackground,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.primaryColor.withOpacity(0.18)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          if (title != null) ...<Widget>[
            Text(
              title,
              style: TextStyle(
                color: AppColors.textColor,
                fontSize: 14.sp,
                fontWeight: FontWeight.normal,
              ),
            ),
            SizedBox(height: 3.w),
          ],
          child,
        ],
      ),
    );
  }

  Widget _pill(String text) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 3.w, vertical: 1.5.w),
      decoration: BoxDecoration(
        color: AppColors.primaryColor.withOpacity(0.16),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: AppColors.textColor,
          fontSize: 14.sp,
          fontWeight: FontWeight.normal,
        ),
      ),
    );
  }

  Widget _credentialRow(BuildContext context, String label, String value) {
    final displayValue = value.isEmpty ? 'Not available'.tr() : value;
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 3.w, vertical: 2.5.w),
      decoration: BoxDecoration(
        color: AppColors.scaffoldbackgroudColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.appBorder),
      ),
      child: Row(
        children: <Widget>[
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  label,
                  style: TextStyle(
                    color: AppColors.textGreyColor,
                    fontSize: 14.sp,
                    fontWeight: FontWeight.normal,
                  ),
                ),
                SizedBox(height: 0.8.w),
                Text(
                  displayValue,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: AppColors.textColor,
                    fontWeight: FontWeight.normal,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: value.isEmpty ? null : () => _copy(context, value),
            icon: const Icon(Icons.copy_rounded),
          ),
        ],
      ),
    );
  }

  Widget _instructionLine(String text) {
    return Padding(
      padding: EdgeInsets.only(bottom: 2.w),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Icon(Icons.check_circle_rounded, color: AppColors.primaryColor, size: 18),
          SizedBox(width: 2.w),
          Expanded(
            child: Text(
              text.tr(),
              style: TextStyle(
                color: AppColors.textColor,
                height: 1.35,
                fontWeight: FontWeight.normal,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class IPTVTrialPaymentScreen extends StatefulWidget {
  final String title;
  final String packageName;
  final String trialLabel;
  final String priceLabel;
  final double priceAmount;
  final String priceText;
  final bool isFree;
  final String freeMessage;
  final String confirmLabel;
  final List<Map<String, String>> paymentMethods;
  final String initialPaymentMethod;
  final double walletBalanceAmount;
  final String walletBalanceText;
  final Future<Map<String, dynamic>> Function(String paymentMethod) onConfirm;

  const IPTVTrialPaymentScreen({
    super.key,
    required this.title,
    required this.packageName,
    required this.trialLabel,
    required this.priceLabel,
    required this.priceAmount,
    required this.priceText,
    required this.isFree,
    required this.freeMessage,
    required this.confirmLabel,
    required this.paymentMethods,
    required this.initialPaymentMethod,
    required this.walletBalanceAmount,
    required this.walletBalanceText,
    required this.onConfirm,
  });

  @override
  State<IPTVTrialPaymentScreen> createState() => _IPTVTrialPaymentScreenState();
}

class _IPTVTrialPaymentScreenState extends State<IPTVTrialPaymentScreen> {
  late String _selectedPaymentMethod;
  bool _isSubmitting = false;

  List<Map<String, String>> get _paymentMethods {
    if (widget.paymentMethods.isNotEmpty) return widget.paymentMethods;
    return const <Map<String, String>>[
      <String, String>{'value': 'wallet', 'label': 'Wallet Balance'},
    ];
  }

  @override
  void initState() {
    super.initState();
    _selectedPaymentMethod = widget.initialPaymentMethod;
  }

  Future<void> _confirm() async {
    if (widget.priceAmount > 0 && _selectedPaymentMethod != 'wallet') {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'This payment method must complete gateway payment before the IPTV subscription can be created.'
                .tr(),
          ),
        ),
      );
      return;
    }
    if (widget.priceAmount > 0 &&
        _selectedPaymentMethod == 'wallet' &&
        widget.walletBalanceAmount < widget.priceAmount) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Insufficient wallet balance.'.tr())),
      );
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      final result = await widget.onConfirm(_selectedPaymentMethod);
      if (!mounted) return;
      final orders = ((result['orders'] as List?) ?? const [])
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();
      final settings =
          (result['settings'] as Map?)?.cast<String, dynamic>() ??
              <String, dynamic>{};
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => MyIPTVSubscriptionsScreen(
            orders: orders,
            settings: settings,
          ),
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  IconData _paymentIcon(String value, String label) {
    final text = '$value $label'.toLowerCase();
    if (text.contains('wallet')) return Icons.account_balance_wallet_rounded;
    if (text.contains('card') || text.contains('credit')) {
      return Icons.credit_card_rounded;
    }
    if (text.contains('paypal')) return Icons.payments_rounded;
    if (text.contains('crypto') || text.contains('usdt')) {
      return Icons.currency_exchange_rounded;
    }
    return Icons.payments_rounded;
  }

  String _paymentSubtitle(String value, String label) {
    final text = '$value $label'.toLowerCase();
    if (text.contains('wallet')) {
      return '${'Available'.tr()}: ${widget.walletBalanceText}';
    }
    if (text.contains('paypal')) return 'Pay with PayPal'.tr();
    if (text.contains('card') || text.contains('credit')) {
      return 'Pay with Credit Card'.tr();
    }
    if (text.contains('crypto') || text.contains('usdt')) {
      return 'Pay with Crypto'.tr();
    }
    return 'Payment method'.tr();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.scaffoldbackgroudColor,
      appBar: AppBar(
        backgroundColor: AppColors.scaffoldbackgroudColor,
        elevation: 0,
        title: Text(widget.title.tr()),
      ),
      body: ListView(
        padding: EdgeInsets.all(5.w),
        children: <Widget>[
          Container(
            padding: EdgeInsets.all(4.w),
            decoration: BoxDecoration(
              color: AppColors.appBackground,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.primaryColor.withOpacity(0.16)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  widget.packageName,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: AppColors.textColor,
                    fontSize: 14.sp,
                    fontWeight: FontWeight.normal,
                  ),
                ),
                SizedBox(height: 2.w),
                Text(
                  widget.trialLabel,
                  style: TextStyle(
                    color: AppColors.textGreyColor,
                    fontSize: 14.sp,
                    fontWeight: FontWeight.normal,
                  ),
                ).tr(),
                SizedBox(height: 4.w),
                Container(
                  width: double.infinity,
                  padding: EdgeInsets.all(3.w),
                  decoration: BoxDecoration(
                    color: AppColors.appSurfaceAlt,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.appBorder),
                  ),
                  child: Text(
                    widget.isFree
                        ? widget.freeMessage.tr()
                        : '${widget.priceLabel.tr()}: ${widget.priceText}',
                    style: TextStyle(
                      color: AppColors.textColor,
                      fontWeight: FontWeight.normal,
                    ),
                  ),
                ),
                SizedBox(height: 4.w),
                Text(
                  'Payment Method',
                  style: TextStyle(
                    color: AppColors.textColor,
                    fontSize: 14.sp,
                    fontWeight: FontWeight.normal,
                  ),
                ).tr(),
                SizedBox(height: 2.w),
                ..._paymentMethods.map(_paymentMethodTile),
                SizedBox(height: 4.w),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _isSubmitting ? null : _confirm,
                    icon: _isSubmitting
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.check_circle_rounded),
                    label: Text(widget.confirmLabel.tr()),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _paymentMethodTile(Map<String, String> method) {
    final value = method['value'] ?? 'wallet';
    final label = method['label'] ?? value;
    final selected = _selectedPaymentMethod == value;
    return InkWell(
      onTap: () => setState(() => _selectedPaymentMethod = value),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        margin: EdgeInsets.only(bottom: 2.w),
        padding: EdgeInsets.symmetric(horizontal: 3.w, vertical: 3.2.w),
        decoration: BoxDecoration(
          color: selected
              ? AppColors.primaryColor.withOpacity(0.14)
              : AppColors.scaffoldbackgroudColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? AppColors.primaryColor : AppColors.appBorder,
          ),
        ),
        child: Row(
          children: <Widget>[
            Icon(
              _paymentIcon(value, label),
              color: selected ? AppColors.primaryColor : AppColors.textGreyColor,
              size: 28,
            ),
            SizedBox(width: 3.w),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    label,
                    style: TextStyle(
                      color: AppColors.textColor,
                      fontSize: 14.sp,
                      fontWeight: FontWeight.normal,
                    ),
                  ).tr(),
                  SizedBox(height: 0.8.w),
                  Text(
                    _paymentSubtitle(value, label),
                    style: TextStyle(
                      color: AppColors.textGreyColor,
                      fontSize: 14.sp,
                      fontWeight: FontWeight.normal,
                    ),
                  ),
                ],
              ),
            ),
            Radio<String>(
              value: value,
              groupValue: _selectedPaymentMethod,
              onChanged: (next) {
                if (next == null) return;
                setState(() => _selectedPaymentMethod = next);
              },
            ),
          ],
        ),
      ),
    );
  }
}
