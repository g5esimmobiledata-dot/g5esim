import 'package:dio/dio.dart';
import 'dart:developer';
import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/utills/UserService.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import 'package:esimconnect/utills/services/UserModuleAccessService.dart';
import 'package:esimconnect/views/authModule/view/loginScreen.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/virtualNumberModule/views/OutboundCallScreen.dart';
import 'package:esimconnect/widgets/CustomElevatedButton.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:sizer/sizer.dart';

class VirtualNumberScreen extends StatefulWidget {
  final bool buyNewOnly;

  const VirtualNumberScreen({super.key, this.buyNewOnly = false});

  @override
  State<VirtualNumberScreen> createState() => _VirtualNumberScreenState();
}

class _VirtualNumberScreenState extends State<VirtualNumberScreen> {
  final ApiService _apiService = ApiService();
  final UserService _userService = UserService.to;
  final UserModuleAccessService _moduleAccess =
      Get.put(UserModuleAccessService(), permanent: true);

  final TextEditingController _countryController = TextEditingController(text: 'US');
  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _notesController = TextEditingController();
  final TextEditingController _recipientController = TextEditingController();
  final TextEditingController _messageController = TextEditingController();
  final TextEditingController _quantityController = TextEditingController(text: '1');
  final TextEditingController _reminderController = TextEditingController(text: '3');
  final TextEditingController _forwardingDestinationController = TextEditingController();

  Map<String, dynamic>? _dashboard;
  List<Map<String, dynamic>> _availableCountries = <Map<String, dynamic>>[];
  List<Map<String, dynamic>> _availableNumbers = <Map<String, dynamic>>[];
  bool _isLoading = true;
  bool _isLoadingSelection = false;
  bool _isApplying = false;
  bool _isSending = false;
  bool _isSavingSettings = false;
  bool _isPreparingVoiceSession = false;
  bool _useCompactList = false;
  bool _autoRenew = true;
  String _packageTerm = '1_month';
  String _paymentMethod = 'wallet';
  String _forwardingType = 'none';
  String? _selectedInventoryId;
  String? _error;
  String? _voiceSessionError;
  Map<String, dynamic>? _voiceSession;

  bool get _isLoggedIn =>
      _userService.currentUserData?.data?.token?.isNotEmpty == true;

  List<Map<String, dynamic>> get _numbers =>
      ((_dashboard?['numbers'] as List?) ?? const [])
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();

  Map<String, dynamic>? get _number =>
      _numbers.isNotEmpty ? _numbers.first : (_dashboard?['number'] as Map<String, dynamic>?);

  Map<String, dynamic>? get _application =>
      _dashboard?['application'] as Map<String, dynamic>?;
  List<dynamic> get _messages => (_dashboard?['messages'] as List?) ?? const [];
  Map<String, dynamic> get _pricingDefaults =>
      (_dashboard?['pricingDefaults'] as Map<String, dynamic>?) ?? <String, dynamic>{};
  Map<String, dynamic> get _applicationMetadata =>
      ((_application?['metadata'] as Map?)?.cast<String, dynamic>()) ?? <String, dynamic>{};
  Map<String, dynamic> get _activeSubscription =>
      ((_number?['subscription'] as Map?)?.cast<String, dynamic>()) ?? <String, dynamic>{};
  Map<String, dynamic> get _activeRouting =>
      ((_number?['routing'] as Map?)?.cast<String, dynamic>()) ?? <String, dynamic>{};
  Map<String, dynamic> get _activePricing =>
      ((_number?['pricing'] as Map?)?.cast<String, dynamic>()) ?? <String, dynamic>{};

  @override
  void initState() {
    super.initState();
    if (widget.buyNewOnly) {
      _countryController.clear();
    }
    if (!_isLoggedIn) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Get.offAll(() => LoginScreen());
      });
      return;
    }
    _moduleAccess.load().then((_) {
      if (mounted) setState(() {});
    });
    _loadDashboard();
  }

  @override
  void dispose() {
    _countryController.dispose();
    _searchController.dispose();
    _notesController.dispose();
    _recipientController.dispose();
    _messageController.dispose();
    _quantityController.dispose();
    _reminderController.dispose();
    _forwardingDestinationController.dispose();
    super.dispose();
  }

  void _syncStateFromDashboard() {
    final selectedNumber = _number;
    final applicationMeta = _applicationMetadata;
    final subscription = _activeSubscription;
    final routing = _activeRouting;

    _packageTerm = (subscription['packageTerm'] ?? applicationMeta['packageTerm'] ?? _packageTerm).toString();
    _paymentMethod = (applicationMeta['paymentMethod'] ?? _paymentMethod).toString();
    _autoRenew = (subscription['autoRenew'] ?? applicationMeta['autoRenew'] ?? true) == true;
    _reminderController.text =
        (subscription['reminderDays'] ?? applicationMeta['reminderDays'] ?? 3).toString();
    _forwardingType =
        (routing['type'] ?? applicationMeta['forwardingType'] ?? 'none').toString();
    _forwardingDestinationController.text =
        (routing['destination'] ?? applicationMeta['forwardingDestination'] ?? '').toString();
    _quantityController.text = (applicationMeta['requestQuantity'] ?? 1).toString();

    if (!widget.buyNewOnly &&
        selectedNumber != null &&
        _countryController.text.trim().isEmpty) {
      _countryController.text = (selectedNumber['countryCode'] ?? 'US').toString();
    }
  }

  Future<void> _loadDashboard() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await _apiService.get('vonage/dashboard');
      final data = response is Map<String, dynamic>
          ? (response['data'] as Map<String, dynamic>? ?? <String, dynamic>{})
          : <String, dynamic>{};

      if (!mounted) return;
      setState(() {
        _dashboard = data;
        if (!widget.buyNewOnly) {
          _countryController.text =
              (data['defaultCountry'] ?? _countryController.text).toString();
        }
        _syncStateFromDashboard();
      });

      if (_number == null || widget.buyNewOnly) {
        await _loadSelection(
          requireCountrySelection: widget.buyNewOnly && _number != null,
        );
      } else {
        _prepareVoiceSession(showMessage: false);
      }
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

  Future<void> _loadSelection({bool requireCountrySelection = false}) async {
    if (!mounted) return;

    setState(() {
      _isLoadingSelection = true;
    });

    try {
      final selectedCountry = _countryController.text.trim().toUpperCase();
      final query = <String, dynamic>{
        'search': _searchController.text.trim(),
        'page': 1,
        'limit': 100,
        'includeAll': true,
      };

      if (selectedCountry.isNotEmpty) {
        query['countryCode'] = selectedCountry;
      }

      final response = await _apiService.get(
        'vonage/selection',
        query: query,
      );

      final data = response is Map<String, dynamic>
          ? (response['data'] as Map<String, dynamic>? ?? <String, dynamic>{})
          : <String, dynamic>{};

      final numbers = _readAvailableNumbers(data);
      final countries = _readAvailableCountries(data, numbers);
      log(
        'eRoaming selection country keys: countries=${(data['countries'] as List?)?.length ?? 0}, '
        'availableCountries=${(data['availableCountries'] as List?)?.length ?? 0}, '
        'didCountries=${(data['didCountries'] as List?)?.length ?? 0}, '
        'inventoryCountries=${(data['inventoryCountries'] as List?)?.length ?? 0}, '
        'numbers=${numbers.length}, availableNumbers=${(data['availableNumbers'] as List?)?.length ?? 0}, '
        'items=${(data['items'] as List?)?.length ?? 0}, parsedCountries=${countries.length}',
      );

      if (!mounted) return;
      setState(() {
        _availableCountries = countries;
        if (requireCountrySelection && selectedCountry.isEmpty) {
          _availableNumbers = <Map<String, dynamic>>[];
          _selectedInventoryId = null;
          return;
        }

        _availableNumbers = numbers;
        final hasSelectedCountry = countries.any(
          (item) => _countryCodeFromItem(item) == selectedCountry,
        );
        if (!requireCountrySelection && !hasSelectedCountry && countries.isNotEmpty) {
          _countryController.text = countries.first['code'].toString();
        }
        final hasSelectedNumber = numbers.any(
          (item) => item['id'].toString() == _selectedInventoryId,
        );
        if (!hasSelectedNumber) {
          _selectedInventoryId = numbers.isNotEmpty ? numbers.first['id'].toString() : null;
        }
      });
    } catch (e) {
      if (!mounted) return;
      _showMessage(e.toString());
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingSelection = false;
        });
      }
    }
  }

  Future<void> _applyForNumber() async {
    FocusScope.of(context).unfocus();
    setState(() {
      _isApplying = true;
    });

    try {
      final quantity = int.tryParse(_quantityController.text.trim()) ?? 1;
      final inventoryId = quantity > 1 ? '' : (_selectedInventoryId ?? '');
      await _apiService.post(
        'vonage/apply',
        data: {
          'countryCode': _countryController.text.trim().toUpperCase(),
          'desiredNumber': inventoryId.isNotEmpty ? (_selectedNumber?['msisdn']?.toString() ?? '') : '',
          'inventoryId': inventoryId,
          'notes': _notesController.text.trim(),
          'quantity': quantity < 1 ? 1 : quantity,
          'packageTerm': _packageTerm,
          'paymentMethod': _paymentMethod,
          'autoRenew': _autoRenew,
          'reminderDays': int.tryParse(_reminderController.text.trim()) ?? 3,
          'forwardingType': _forwardingType,
          'forwardingDestination': _forwardingDestinationController.text.trim(),
        },
      );

      _notesController.clear();
      _searchController.clear();
      _selectedInventoryId = null;
      _showMessage('eRoaming Number request submitted. Wallet is used first when available, otherwise the next payment method is used.');
      await _loadDashboard();
    } catch (e) {
      _showMessage(e.toString());
    } finally {
      if (mounted) {
        setState(() {
          _isApplying = false;
        });
      }
    }
  }

  Future<void> _saveNumberSettings() async {
    final number = _number;
    final numberId = number?['id']?.toString();
    if (numberId == null || numberId.isEmpty) {
      _showMessage('No active number found to update.');
      return;
    }

    FocusScope.of(context).unfocus();
    setState(() {
      _isSavingSettings = true;
    });

    try {
      await _apiService.patch(
        'vonage/numbers/$numberId/settings',
        data: {
          'autoRenew': _autoRenew,
          'reminderDays': int.tryParse(_reminderController.text.trim()) ?? 3,
          'forwardingType': _forwardingType,
          'forwardingDestination': _forwardingDestinationController.text.trim(),
        },
      );
      _showMessage('eRoaming Number settings updated successfully.');
      await _loadDashboard();
    } catch (e) {
      _showMessage(e.toString());
    } finally {
      if (mounted) {
        setState(() {
          _isSavingSettings = false;
        });
      }
    }
  }

  Future<void> _prepareVoiceSession({bool showMessage = true}) async {
    if (_voiceSession != null || _isPreparingVoiceSession) return;

    setState(() {
      _isPreparingVoiceSession = true;
      _voiceSessionError = null;
    });

    try {
      final response = await _apiService.post(
        'voice/session',
        data: <String, dynamic>{},
      );
      final data = response is Map<String, dynamic>
          ? (response['data'] as Map<String, dynamic>? ?? <String, dynamic>{})
          : <String, dynamic>{};

      if (!mounted) return;
      setState(() {
        _voiceSession = data;
        _voiceSessionError = null;
      });
      if (showMessage) {
        _showMessage('eRoaming voice session prepared successfully.');
      }
    } catch (e) {
      if (!mounted) return;
      final message = _readableError(e);
      setState(() {
        _voiceSessionError = message;
      });
      _showMessage(message);
    } finally {
      if (mounted) {
        setState(() {
          _isPreparingVoiceSession = false;
        });
      }
    }
  }

  Future<void> _sendSms() async {
    FocusScope.of(context).unfocus();
    setState(() {
      _isSending = true;
    });

    try {
      final response = await _apiService.post(
        'vonage/messages/send',
        data: {
          'to': _recipientController.text.trim(),
          'text': _messageController.text.trim(),
        },
      );

      _messageController.clear();
      final responseData = response is Map<String, dynamic>
          ? (response['data'] as Map<String, dynamic>? ?? response)
          : <String, dynamic>{};
      final messageId = _smsValue(
        responseData,
        ['messageUuid', 'message_uuid', 'messageId', 'message_id', 'uuid', 'id'],
      );
      final status = _smsValue(
        responseData,
        ['status', 'deliveryStatus', 'delivery_status', 'messageStatus'],
      );
      final submittedText = status.isEmpty
          ? 'SMS submitted to eRoaming. Delivery is not confirmed yet.'
          : 'SMS submitted to eRoaming. Status: $status';
      _showMessage(
        messageId.isEmpty ? submittedText : '$submittedText ID: $messageId',
      );
      await _loadDashboard();
    } catch (e) {
      _showMessage(_readableError(e));
    } finally {
      if (mounted) {
        setState(() {
          _isSending = false;
        });
      }
    }
  }

  String _smsValue(Map<String, dynamic> data, List<String> keys) {
    for (final key in keys) {
      final value = data[key];
      if (value != null && value.toString().trim().isNotEmpty) {
        return value.toString();
      }
    }

    final nested = data['message'] ?? data['messages'] ?? data['sms'];
    if (nested is Map<String, dynamic>) {
      return _smsValue(nested, keys);
    }
    if (nested is List && nested.isNotEmpty && nested.first is Map) {
      return _smsValue(Map<String, dynamic>.from(nested.first as Map), keys);
    }
    return '';
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  String _readableError(Object error) {
    if (error is DioException) {
      return error.message ?? error.error?.toString() ?? 'Request failed';
    }
    return error.toString().replaceFirst('Exception: ', '');
  }

  void _openDialpad() {
    if (!_moduleAccess.enabled('module_dial_pad', fallback: false)) {
      _showMessage('Dial pad is not enabled for this account.');
      return;
    }
    _openDialpadAfterPreparingSession();
  }

  void _openBuyNewNumberPage() {
    Navigator.of(context, rootNavigator: true).push(
      MaterialPageRoute(
        builder: (_) => VirtualNumberScreen(
          key: UniqueKey(),
          buyNewOnly: true,
        ),
      ),
    );
  }

  Future<void> _openDialpadAfterPreparingSession() async {
    if (_voiceSession == null) {
      await _prepareVoiceSession(showMessage: false);
    }

    if (_voiceSession == null) {
      _showMessage(_voiceSessionError ?? 'Unable to connect eRoaming Number right now.');
      return;
    }

    Get.to(
      () => OutboundCallScreen(
        backendHint: (_voiceSession!['backend'] ?? 'voice').toString(),
        initialVoiceSession: _voiceSession,
      ),
    );
  }

  Map<String, dynamic>? get _selectedNumber {
    if (_selectedInventoryId == null) return null;
    for (final item in _availableNumbers) {
      if (item['id'].toString() == _selectedInventoryId) {
        return item;
      }
    }
    return null;
  }

  bool get _hasConnectionError {
    final error = (_error ?? '').toLowerCase();
    return error.contains('connection error') ||
        error.contains('no internet connection') ||
        error.contains('cannot connect to api server') ||
        error.contains('connection refused') ||
        error.contains('socketexception') ||
        error.contains('failed host lookup') ||
        error.contains('timed out');
  }

  bool get _isFeatureEnabled => _dashboard?['enabled'] == true;

  String _featureStateLabel() {
    if (_hasConnectionError) return 'Connection Error';
    return _isFeatureEnabled ? 'Enabled' : 'Disabled';
  }

  String _statusText() {
    if (_hasConnectionError) {
      return 'Cannot reach the backend right now';
    }
    if (_number != null) {
      return 'Active number: ${_number!['msisdn'] ?? '-'}';
    }
    if (_application != null) {
      return 'Application status: ${_application!['status'] ?? '-'}';
    }
    return 'No eRoaming Number yet';
  }

  String _packageLabel(String term) {
    switch (term) {
      case '3_months':
        return '3 Months';
      case '6_months':
        return '6 Months';
      case '9_months':
        return '9 Months';
      case '1_year':
        return '12 Months';
      default:
        return '1 Month';
    }
  }

  double _parseAmount(dynamic value) {
    return double.tryParse((value ?? '0').toString()) ?? 0;
  }

  String _moneyText(dynamic value) {
    return '\$${_parseAmount(value).toStringAsFixed(2)}';
  }

  List<Map<String, dynamic>> _readAvailableCountries(
    Map<String, dynamic> data,
    List<Map<String, dynamic>> numbers,
  ) {
    final countrySources = <dynamic>[
      data['countries'],
      data['availableCountries'],
      data['didCountries'],
      data['inventoryCountries'],
      data['countryOptions'],
      data['destinations'],
    ];

    for (final source in countrySources) {
      if (source is List && source.isNotEmpty) {
        return source
            .whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .where((item) => _countryCodeFromItem(item).isNotEmpty)
            .toList();
      }
    }

    final countsByCountry = <String, int>{};
    for (final number in numbers) {
      final code = _countryCodeFromItem(number);
      if (code.isEmpty) continue;
      countsByCountry[code] = (countsByCountry[code] ?? 0) + 1;
    }

    return countsByCountry.entries
        .map((entry) => {'code': entry.key, 'count': entry.value})
        .toList();
  }

  List<Map<String, dynamic>> _readAvailableNumbers(Map<String, dynamic> data) {
    final numberSources = <dynamic>[
      data['numbers'],
      data['availableNumbers'],
      data['dids'],
      data['didNumbers'],
      data['inventory'],
      data['items'],
      data['results'],
      data['data'],
      data['numbers'] is Map ? (data['numbers'] as Map)['data'] : null,
      data['availableNumbers'] is Map
          ? (data['availableNumbers'] as Map)['data']
          : null,
    ];

    for (final source in numberSources) {
      if (source is List && source.isNotEmpty) {
        return source
            .whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .toList();
      }
    }

    return <Map<String, dynamic>>[];
  }

  String _countryCodeFromItem(Map<String, dynamic> item) {
    return (item['code'] ??
            item['countryCode'] ??
            item['iso2'] ??
            item['iso'] ??
            item['country'] ??
            '')
        .toString()
        .trim()
        .toUpperCase();
  }

  int _countryAvailableCount(Map<String, dynamic> item) {
    final value =
        item['activeCount'] ??
        item['availableCount'] ??
        item['availableNumbers'] ??
        item['count'] ??
        0;
    return int.tryParse(value.toString()) ?? 0;
  }

  String _selectedPackagePriceText() {
    final selectedNumber = _selectedNumber;
    final pricingDefaults = _pricingDefaults;
    final isPremium = selectedNumber?['isPremium'] == true;

    dynamic configuredValue;
    switch (_packageTerm) {
      case '3_months':
        configuredValue = isPremium
            ? pricingDefaults['premiumThreeMonthPackagePrice']
            : pricingDefaults['standardThreeMonthPackagePrice'];
        break;
      case '6_months':
        configuredValue = isPremium
            ? pricingDefaults['premiumSixMonthPackagePrice']
            : pricingDefaults['standardSixMonthPackagePrice'];
        break;
      case '9_months':
        configuredValue = isPremium
            ? pricingDefaults['premiumNineMonthPackagePrice']
            : pricingDefaults['standardNineMonthPackagePrice'];
        break;
      case '1_year':
        configuredValue = isPremium
            ? pricingDefaults['premiumYearPackagePrice']
            : pricingDefaults['standardYearPackagePrice'];
        break;
      default:
        configuredValue = isPremium
            ? pricingDefaults['premiumMonthPackagePrice']
            : pricingDefaults['standardMonthPackagePrice'];
    }

    final configuredAmount = _parseAmount(configuredValue);
    if (configuredAmount > 0) return _moneyText(configuredValue);

    final monthly = _parseAmount(selectedNumber?['monthlyFee']);
    final multiplier = _packageTerm == '3_months'
        ? 3
        : _packageTerm == '6_months'
            ? 6
            : _packageTerm == '9_months'
                ? 9
                : _packageTerm == '1_year'
                    ? 12
                    : 1;
    return _moneyText(monthly * multiplier);
  }

  dynamic _firstPositiveAmount(List<dynamic> values) {
    for (final value in values) {
      if (_parseAmount(value) > 0) return value;
    }
    return null;
  }

  String _activeRenewalPriceText() {
    final subscription = _activeSubscription;
    final pricing = _activePricing;
    final pricingDefaults = _pricingDefaults;
    final packageTerm = (subscription['packageTerm'] ?? _packageTerm).toString();
    final isPremium =
        _number?['isPremium'] == true || pricing['isPremium'] == true;

    dynamic defaultPackagePrice;
    switch (packageTerm) {
      case '3_months':
        defaultPackagePrice = isPremium
            ? pricingDefaults['premiumThreeMonthPackagePrice']
            : pricingDefaults['standardThreeMonthPackagePrice'];
        break;
      case '6_months':
        defaultPackagePrice = isPremium
            ? pricingDefaults['premiumSixMonthPackagePrice']
            : pricingDefaults['standardSixMonthPackagePrice'];
        break;
      case '9_months':
        defaultPackagePrice = isPremium
            ? pricingDefaults['premiumNineMonthPackagePrice']
            : pricingDefaults['standardNineMonthPackagePrice'];
        break;
      case '1_year':
        defaultPackagePrice = isPremium
            ? pricingDefaults['premiumYearPackagePrice']
            : pricingDefaults['standardYearPackagePrice'];
        break;
      default:
        defaultPackagePrice = isPremium
            ? pricingDefaults['premiumMonthPackagePrice']
            : pricingDefaults['standardMonthPackagePrice'];
    }

    final price = _firstPositiveAmount([
      subscription['renewalPrice'],
      subscription['packagePrice'],
      pricing['renewalPrice'],
      pricing['packagePrice'],
      defaultPackagePrice,
      pricing['monthlyFee'],
      _number?['monthlyFee'],
    ]);

    return _moneyText(price);
  }

  Widget _infoCard({
    required IconData icon,
    required String title,
    required String subtitle,
    Widget? trailing,
    Widget? child,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.appSurface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.appBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 18,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                height: 11.w,
                width: 11.w,
                decoration: BoxDecoration(
                  color: AppColors.primaryColor.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, color: AppColors.primaryColor),
              ),
              SizedBox(width: 3.w),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                        fontSize: 16.sp,
                        fontWeight: FontWeight.normal,
                        color: AppColors.appTextPrimary,
                      ),
                    ).tr(),
                    SizedBox(height: 0.8.h),
                    Text(
                      subtitle,
                      style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                        fontSize: 12.5.sp,
                        color: AppColors.appTextSecondary,
                      ),
                    ).tr(),
                  ],
                ),
              ),
              if (trailing != null) ...[trailing],
            ],
          ),
          if (child != null) ...[
            SizedBox(height: 2.h),
            child,
          ],
        ],
      ),
    );
  }

  Widget _textField({
    required TextEditingController controller,
    required String label,
    String? hint,
    int maxLines = 1,
    TextInputType? keyboardType,
    int? maxLength,
    ValueChanged<String>? onChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.bodyMedium!.copyWith(
            fontSize: 13.sp,
            fontWeight: FontWeight.normal,
            color: AppColors.appTextPrimary,
          ),
        ).tr(),
        SizedBox(height: 0.7.h),
        TextField(
          controller: controller,
          maxLines: maxLines,
          maxLength: maxLength,
          keyboardType: keyboardType,
          onChanged: onChanged,
          decoration: InputDecoration(
            hintText: hint,
            filled: true,
            fillColor: AppColors.scaffoldbackgroudColor,
            counterText: '',
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
        ),
      ],
    );
  }

  Widget _simpleDropdown({
    required String label,
    required String value,
    required List<DropdownMenuItem<String>> items,
    required ValueChanged<String?>? onChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.bodyMedium!.copyWith(
            fontSize: 13.sp,
            fontWeight: FontWeight.normal,
            color: AppColors.appTextPrimary,
          ),
        ).tr(),
        SizedBox(height: 0.7.h),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: AppColors.scaffoldbackgroudColor,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.appBorder),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              isExpanded: true,
              value: value,
              items: items,
              onChanged: onChanged,
            ),
          ),
        ),
      ],
    );
  }

  Widget _countryDropdown({String label = 'Available Countries'}) {
    final selectedValue = _countryController.text.trim().toUpperCase();
    final items = <DropdownMenuItem<String>>[
      const DropdownMenuItem(value: '', child: Text('Select Country')),
      ..._availableCountries
        .map(
          (item) => DropdownMenuItem<String>(
            value: _countryCodeFromItem(item),
            child: Text('${_countryCodeFromItem(item)} (${_countryAvailableCount(item)})'),
          ),
        )
    ];

    return _simpleDropdown(
      label: label,
      value: items.any((item) => item.value == selectedValue)
          ? selectedValue
          : '',
      items: items,
      onChanged: _isLoadingSelection
          ? null
          : (value) {
              if (value == null || value.isEmpty) return;
              setState(() {
                _countryController.text = value;
                _selectedInventoryId = null;
                _availableNumbers = <Map<String, dynamic>>[];
              });
              _loadSelection();
            },
    );
  }

  Widget _viewModeToggle() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.scaffoldbackgroudColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.appBorder),
      ),
      child: Row(
        children: [
          Expanded(
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _useCompactList = false;
                });
              },
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: !_useCompactList ? AppColors.primaryColor : Colors.transparent,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.grid_view_rounded,
                      size: 18,
                      color: !_useCompactList ? Colors.white : AppColors.appTextSecondary,
                    ),
                    SizedBox(width: 2.w),
                    Text(
                      'Cards',
                      style: TextStyle(
                        fontWeight: FontWeight.normal,
                        color: !_useCompactList ? Colors.white : AppColors.appTextSecondary,
                      ),
                    ).tr(),
                  ],
                ),
              ),
            ),
          ),
          Expanded(
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _useCompactList = true;
                });
              },
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: _useCompactList ? AppColors.primaryColor : Colors.transparent,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.view_list_rounded,
                      size: 18,
                      color: _useCompactList ? Colors.white : AppColors.appTextSecondary,
                    ),
                    SizedBox(width: 2.w),
                    Text(
                      'Full List',
                      style: TextStyle(
                        fontWeight: FontWeight.normal,
                        color: _useCompactList ? Colors.white : AppColors.appTextSecondary,
                      ),
                    ).tr(),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _numberCardOption(Map<String, dynamic> item) {
    final isSelected = item['id'].toString() == _selectedInventoryId;
    final isPremium = item['isPremium'] == true;

    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedInventoryId = item['id'].toString();
        });
      },
      child: Container(
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primaryColor.withOpacity(0.08)
              : AppColors.scaffoldbackgroudColor,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? AppColors.primaryColor : AppColors.appBorder,
            width: isSelected ? 1.4 : 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    item['msisdn']?.toString() ?? '-',
                    style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                      fontSize: 16.sp,
                      fontWeight: FontWeight.normal,
                      color: AppColors.appTextPrimary,
                    ),
                  ),
                ),
                if (isPremium)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.amber.withOpacity(0.16),
                      borderRadius: BorderRadius.circular(100),
                    ),
                    child: Text(
                      'Premium',
                      style: TextStyle(
                        fontSize: 11.sp,
                        fontWeight: FontWeight.normal,
                        color: Colors.amber.shade800,
                      ),
                    ).tr(),
                  ),
                SizedBox(width: 2.w),
                Icon(
                  isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
                  color: isSelected ? AppColors.primaryColor : AppColors.appTextSecondary,
                ),
              ],
            ),
            SizedBox(height: 1.h),
            Text(
              'Setup ${item['setupFee']} • Monthly ${item['monthlyFee']}',
              style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                color: AppColors.appTextSecondary,
                fontSize: 12.5.sp,
              ),
            ),
            SizedBox(height: 0.5.h),
            Text(
              'Inbound ${item['inboundFee']} • Outbound ${item['outboundFee']}',
              style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                color: AppColors.appTextSecondary,
                fontSize: 12.5.sp,
              ),
            ),
            SizedBox(height: 0.5.h),
            Text(
              '${_packageLabel(_packageTerm)} plan preview ${_selectedInventoryId == item['id'].toString() ? _selectedPackagePriceText() : ''}',
              style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                color: AppColors.primaryColor,
                fontSize: 12.5.sp,
                fontWeight: FontWeight.normal,
              ),
            ),
            if ((item['notes'] ?? '').toString().trim().isNotEmpty) ...[
              SizedBox(height: 0.8.h),
              Text(
                item['notes'].toString(),
                style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                  color: AppColors.appTextSecondary,
                  fontSize: 12.5.sp,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _numberListOption(Map<String, dynamic> item) {
    final isSelected = item['id'].toString() == _selectedInventoryId;
    final isPremium = item['isPremium'] == true;

    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedInventoryId = item['id'].toString();
        });
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primaryColor.withOpacity(0.08) : AppColors.scaffoldbackgroudColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppColors.primaryColor : AppColors.appBorder,
            width: isSelected ? 1.3 : 1,
          ),
        ),
        child: Row(
          children: [
            Icon(
              isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
              color: isSelected ? AppColors.primaryColor : AppColors.appTextSecondary,
            ),
            SizedBox(width: 3.w),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          item['msisdn']?.toString() ?? '-',
                          style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                            fontSize: 16.sp,
                            fontWeight: FontWeight.normal,
                            color: AppColors.appTextPrimary,
                          ),
                        ),
                      ),
                      if (isPremium)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: Colors.amber.withOpacity(0.16),
                            borderRadius: BorderRadius.circular(100),
                          ),
                          child: Text(
                            'Premium',
                            style: TextStyle(
                              fontSize: 11.sp,
                              fontWeight: FontWeight.normal,
                              color: Colors.amber.shade800,
                            ),
                          ).tr(),
                        ),
                    ],
                  ),
                  SizedBox(height: 0.5.h),
                  Text(
                    '${item['countryCode'] ?? ''} • Setup ${item['setupFee']} • Monthly ${item['monthlyFee']}',
                    style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                      color: AppColors.appTextSecondary,
                      fontSize: 12.5.sp,
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

  Widget _numberSelectionList() {
    if (_availableNumbers.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.scaffoldbackgroudColor,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.appBorder),
        ),
        child: Text(
          'No available numbers found for this country right now.',
          style: Theme.of(context).textTheme.bodyMedium!.copyWith(
            color: AppColors.appTextSecondary,
          ),
        ).tr(),
      );
    }

    if (_useCompactList) {
      return Column(
        children: _availableNumbers.map(_numberListOption).toList(),
      );
    }

    return Column(
      children: _availableNumbers.map(_numberCardOption).toList(),
    );
  }

  Widget _buildApplicationCard({bool forceShow = false}) {
    final enabled = _isFeatureEnabled;
    final isBuyingAdditionalNumber = _number != null && forceShow;
    final hasSelectedCountry = _countryController.text.trim().isNotEmpty;

    if (_hasConnectionError) {
      return _infoCard(
        icon: Icons.cloud_off_rounded,
        title: 'Connection Error',
        subtitle: 'The mobile app could not reach the backend, so the eRoaming Number status cannot be loaded yet.',
        child: Text(
          'Check that the API base URL points to the right host for your emulator or phone, and make sure the backend server is running.',
          style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                color: AppColors.appTextSecondary,
              ),
        ),
      );
    }

    if (!enabled) {
      return _infoCard(
        icon: Icons.do_not_disturb_on_outlined,
        title: 'eRoaming Number Disabled',
        subtitle: 'This feature is currently disabled in admin settings.',
      );
    }

    if (_number != null && !forceShow) return const SizedBox.shrink();

    return _infoCard(
      icon: Icons.phone_android_rounded,
      title: _number == null ? 'Choose an eRoaming Number' : 'Buy New eRoaming Number',
      subtitle: 'Choose the number, package term, quantity, wallet-first payment, and forwarding rules before submitting the request.',
      child: Column(
        children: [
          if (_availableCountries.isNotEmpty) ...[
            _countryDropdown(
              label: isBuyingAdditionalNumber
                  ? 'Select Country for New eRoaming Number'
                  : 'Available Countries',
            ),
            SizedBox(height: 1.5.h),
          ] else
            _textField(
              controller: _countryController,
              label: isBuyingAdditionalNumber
                  ? 'Select Country for New eRoaming Number'
                  : 'Country Code',
              hint: 'US',
              maxLength: 2,
            ),
          if (isBuyingAdditionalNumber && !hasSelectedCountry) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.scaffoldbackgroudColor,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.appBorder),
              ),
              child: Text(
                'Select a country first to see available eRoaming Numbers.',
                style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                  color: AppColors.appTextSecondary,
                ),
              ).tr(),
            ),
          ] else ...[
          _textField(
            controller: _searchController,
            label: 'Search Number',
            hint: 'Search digits inside the number',
          ),
          SizedBox(height: 1.2.h),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: _isLoadingSelection ? null : _loadSelection,
              icon: _isLoadingSelection
                  ? SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppColors.primaryColor,
                      ),
                    )
                  : const Icon(Icons.search_rounded),
              label: const Text('Load Available Numbers').tr(),
            ),
          ),
          SizedBox(height: 1.h),
          if (_availableNumbers.isNotEmpty) ...[
            _viewModeToggle(),
            SizedBox(height: 1.4.h),
          ],
          _numberSelectionList(),
          SizedBox(height: 1.6.h),
          Row(
            children: [
              Expanded(
                child: _textField(
                  controller: _quantityController,
                  label: 'Quantity',
                  hint: '1',
                  keyboardType: TextInputType.number,
                ),
              ),
              SizedBox(width: 3.w),
              Expanded(
                child: _simpleDropdown(
                  label: 'Package Term',
                  value: _packageTerm,
                  items: const [
                    DropdownMenuItem(value: '1_month', child: Text('1 Month')),
                    DropdownMenuItem(value: '3_months', child: Text('3 Months')),
                    DropdownMenuItem(value: '6_months', child: Text('6 Months')),
                    DropdownMenuItem(value: '9_months', child: Text('9 Months')),
                    DropdownMenuItem(value: '1_year', child: Text('12 Months')),
                  ],
                  onChanged: (value) {
                    if (value == null) return;
                    setState(() {
                      _packageTerm = value;
                    });
                  },
                ),
              ),
            ],
          ),
          SizedBox(height: 1.4.h),
          _simpleDropdown(
            label: 'Payment Method',
            value: _paymentMethod,
            items: const [
              DropdownMenuItem(value: 'wallet', child: Text('Wallet Balance First')),
              DropdownMenuItem(value: 'other', child: Text('Other Payment Method')),
            ],
            onChanged: (value) {
              if (value == null) return;
              setState(() {
                _paymentMethod = value;
              });
            },
          ),
          SizedBox(height: 1.2.h),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.scaffoldbackgroudColor,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.appBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Auto Renew',
                        style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                          fontSize: 13.sp,
                          fontWeight: FontWeight.normal,
                          color: AppColors.appTextPrimary,
                        ),
                      ).tr(),
                    ),
                    Switch(
                      value: _autoRenew,
                      onChanged: (value) {
                        setState(() {
                          _autoRenew = value;
                        });
                      },
                    ),
                  ],
                ),
                Text(
                  'Renewal package preview ${_selectedPackagePriceText()}',
                  style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                    color: AppColors.primaryColor,
                    fontSize: 12.5.sp,
                    fontWeight: FontWeight.normal,
                  ),
                ).tr(),
              ],
            ),
          ),
          SizedBox(height: 1.4.h),
          _textField(
            controller: _reminderController,
            label: 'Reminder Days Before Renewal',
            hint: '3',
            keyboardType: TextInputType.number,
          ),
          SizedBox(height: 1.4.h),
          _simpleDropdown(
            label: 'Forward Number To',
            value: _forwardingType,
            items: const [
              DropdownMenuItem(value: 'none', child: Text('No Forwarding')),
              DropdownMenuItem(value: 'international', child: Text('International Number')),
              DropdownMenuItem(value: 'sip', child: Text('SIP')),
              DropdownMenuItem(value: 'voicemail', child: Text('Voice Mail')),
            ],
            onChanged: (value) {
              if (value == null) return;
              setState(() {
                _forwardingType = value;
              });
            },
          ),
          if (_forwardingType != 'none') ...[
            SizedBox(height: 1.4.h),
            _textField(
              controller: _forwardingDestinationController,
              label: _forwardingType == 'sip' ? 'SIP Destination' : 'Forwarding Destination',
              hint: _forwardingType == 'sip' ? 'sip:user@domain.com' : '+15551234567',
            ),
          ],
          SizedBox(height: 1.4.h),
          _textField(
            controller: _notesController,
            label: 'Notes',
            hint: 'Tell us how you want to use this number.',
            maxLines: 4,
          ),
          SizedBox(height: 2.h),
          SizedBox(
            width: double.infinity,
            child: CustomElevatedButton(
              onPressed: _isApplying || (_availableNumbers.isNotEmpty && _selectedInventoryId == null && (int.tryParse(_quantityController.text.trim()) ?? 1) <= 1)
                  ? null
                  : _applyForNumber,
              text: _isApplying ? '' : 'Submit Request',
              progressIndicator: const CircularProgressIndicator(
                strokeWidth: 2,
                color: Colors.white,
              ),
              height: 48,
            ),
          ),
          ],
        ],
      ),
    );
  }

  Widget _buildBuyNewNumberCard() {
    if (_number == null) return const SizedBox.shrink();

    return _infoCard(
      icon: Icons.add_call,
      title: 'Buy New eRoaming Number',
      subtitle: 'Add another eRoaming Number to your account.',
      child: SizedBox(
        width: double.infinity,
        height: 48,
        child: ElevatedButton.icon(
          onPressed: _openBuyNewNumberPage,
          icon: const Icon(Icons.add_call),
          label: const Text('Buy New eRoaming Number').tr(),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primaryColor,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
            elevation: 0,
          ),
        ),
      ),
    );
  }

  Widget _buildLatestApplicationCard() {
    if (_application == null || _number != null) return const SizedBox.shrink();

    return _infoCard(
      icon: Icons.assignment_outlined,
      title: 'Latest Application',
      subtitle: 'Your most recent eRoaming Number request waiting for payment or manual issuing.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Status: ${_application!['status'] ?? '-'}').tr(),
          SizedBox(height: 0.7.h),
          Text('Country: ${_application!['countryCode'] ?? '-'}').tr(),
          SizedBox(height: 0.7.h),
          Text('Preferred: ${_application!['desiredNumber'] ?? 'Selected available number'}').tr(),
          SizedBox(height: 0.7.h),
          Text('Quantity: ${_applicationMetadata['requestQuantity'] ?? 1}').tr(),
          SizedBox(height: 0.7.h),
          Text('Package: ${_packageLabel((_applicationMetadata['packageTerm'] ?? '1_month').toString())}').tr(),
          SizedBox(height: 0.7.h),
          Text('Payment: ${(_applicationMetadata['paymentMethod'] ?? 'wallet').toString()}').tr(),
          SizedBox(height: 0.7.h),
          Text('Auto Renew: ${(_applicationMetadata['autoRenew'] ?? true) == true ? 'Enabled' : 'Disabled'}').tr(),
          SizedBox(height: 0.7.h),
          Text('Forwarding: ${(_applicationMetadata['forwardingType'] ?? 'none').toString()}').tr(),
          SizedBox(height: 0.7.h),
          Text('Requested: ${_application!['createdAt'] ?? '-'}').tr(),
        ],
      ),
    );
  }

  Widget _buildAssignedNumberCard() {
    if (_number == null) return const SizedBox.shrink();

    final subscription = _activeSubscription;
    final routing = _activeRouting;

    return _infoCard(
      icon: Icons.sim_card_rounded,
      title: 'Your Number',
      subtitle: 'Your eRoaming Number is ready for Outgoing Calls and SMS and this your Subscription Management.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Number: ${_number!['msisdn'] ?? '-'}').tr(),
          SizedBox(height: 0.7.h),
          Text('Country: ${_number!['countryCode'] ?? '-'}').tr(),
          SizedBox(height: 0.7.h),
          Text('Status: ${_number!['status'] ?? '-'}').tr(),
          SizedBox(height: 0.7.h),
          Text('Package: ${_packageLabel((subscription['packageTerm'] ?? '1_month').toString())}').tr(),
          SizedBox(height: 0.7.h),
          Text('Renewal Price: ${_activeRenewalPriceText()}').tr(),
          SizedBox(height: 0.7.h),
          Text('Auto Renew: ${(_autoRenew ? 'Enabled' : 'Disabled')}').tr(),
          SizedBox(height: 0.7.h),
          Text('Forwarding: ${routing['type'] ?? 'none'} ${routing['destination'] != null ? '(${routing['destination']})' : ''}').tr(),
        ],
      ),
    );
  }

  Widget _buildSubscriptionSettingsCard() {
    if (_number == null) return const SizedBox.shrink();

    return _infoCard(
      icon: Icons.autorenew_rounded,
      title: 'Subscription Settings',
      subtitle: 'Control Auto Renew, Reminders, and Forwarding for your Active eRoaming Number.',
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Auto Renew',
                  style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                    fontSize: 13.sp,
                    fontWeight: FontWeight.normal,
                    color: AppColors.appTextPrimary,
                  ),
                ).tr(),
              ),
              Switch(
                value: _autoRenew,
                onChanged: (value) {
                  setState(() {
                    _autoRenew = value;
                  });
                },
              ),
            ],
          ),
          SizedBox(height: 1.2.h),
          _simpleDropdown(
            label: 'Renewal Term',
            value: _packageTerm,
            items: const [
              DropdownMenuItem(value: '1_month', child: Text('1 Month')),
              DropdownMenuItem(value: '3_months', child: Text('3 Months')),
              DropdownMenuItem(value: '6_months', child: Text('6 Months')),
              DropdownMenuItem(value: '9_months', child: Text('9 Months')),
              DropdownMenuItem(value: '1_year', child: Text('12 Months')),
            ],
            onChanged: (value) {
              if (value == null) return;
              setState(() {
                _packageTerm = value;
              });
            },
          ),
          SizedBox(height: 1.4.h),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.scaffoldbackgroudColor,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.appBorder),
            ),
            child: Text(
              'Renewal package preview ${_activeRenewalPriceText()}',
              style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                color: AppColors.primaryColor,
                fontSize: 12.5.sp,
                fontWeight: FontWeight.normal,
              ),
            ).tr(),
          ),
          SizedBox(height: 1.4.h),
          _textField(
            controller: _reminderController,
            label: 'Reminder Days Before Renewal',
            hint: '3',
            keyboardType: TextInputType.number,
          ),
          SizedBox(height: 1.4.h),
          _simpleDropdown(
            label: 'Forward Number To',
            value: _forwardingType,
            items: const [
              DropdownMenuItem(value: 'none', child: Text('No Forwarding')),
              DropdownMenuItem(value: 'international', child: Text('International Number')),
              DropdownMenuItem(value: 'sip', child: Text('SIP')),
              DropdownMenuItem(value: 'voicemail', child: Text('Voice Mail')),
            ],
            onChanged: (value) {
              if (value == null) return;
              setState(() {
                _forwardingType = value;
              });
            },
          ),
          if (_forwardingType != 'none') ...[
            SizedBox(height: 1.4.h),
            _textField(
              controller: _forwardingDestinationController,
              label: _forwardingType == 'sip' ? 'SIP Destination' : 'Forwarding Destination',
              hint: _forwardingType == 'sip' ? 'sip:user@domain.com' : '+15551234567',
            ),
          ],
          SizedBox(height: 2.h),
          SizedBox(
            width: double.infinity,
            child: CustomElevatedButton(
              onPressed: _isSavingSettings ? null : _saveNumberSettings,
              text: _isSavingSettings ? '' : 'Save Subscription Settings',
              progressIndicator: const CircularProgressIndicator(
                strokeWidth: 2,
                color: Colors.white,
              ),
              height: 48,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVoiceSessionCard() {
    final backend = (_voiceSession?['backend'] ?? 'vonage').toString();
    final isLinphone = backend == 'linphone';
    final tokenPreview = (_voiceSession?['token'] ?? '').toString();
    final tokenText = tokenPreview.isEmpty
        ? 'Not prepared yet'
        : '${tokenPreview.substring(0, tokenPreview.length > 28 ? 28 : tokenPreview.length)}...';

    return _infoCard(
      icon: Icons.call_rounded,
      title: isLinphone ? 'Linphone SIP Session' : 'Connect your eRoaming Number to Network',
      subtitle: isLinphone
          ? 'Prepare Linphone SIP login details for this signed-in user before native SIP registration is connected.'
          : 'Prepare a real eRoaming session token for this signed-in user before native calling is connected.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('User: ${(_voiceSession?['username'] ?? 'Not prepared').toString()}').tr(),
          SizedBox(height: 0.7.h),
          if (_voiceSessionError != null) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.orange.withOpacity(0.12),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.orange.withOpacity(0.35)),
              ),
              child: Text(
                _voiceSessionError!,
                style: Theme.of(context).textTheme.bodySmall!.copyWith(
                      color: AppColors.appTextPrimary,
                    ),
              ),
            ),
            SizedBox(height: 1.2.h),
          ],
          if (isLinphone) ...[
            Text('SIP Domain: ${(_voiceSession?['sipDomain'] ?? '-').toString()}').tr(),
            SizedBox(height: 0.7.h),
            Text('Transport: ${(_voiceSession?['sipTransport'] ?? '-').toString().toUpperCase()}').tr(),
            SizedBox(height: 0.7.h),
            Text('Voicemail: ${(_voiceSession?['voicemailExtension'] ?? '-').toString()}').tr(),
            SizedBox(height: 0.7.h),
            Text(
              'Linphone SIP details are ready. The next native step is SIP registration plus inbound call handling.',
              style: Theme.of(context).textTheme.bodySmall!.copyWith(
                    color: AppColors.appTextSecondary,
                  ),
            ).tr(),
          ] else ...[
            Text('Application ID: ${(_voiceSession?['applicationId'] ?? '-').toString()}').tr(),
            SizedBox(height: 0.7.h),
            Text('Token: $tokenText').tr(),
            SizedBox(height: 0.7.h),
            Text(
              (_voiceSession?['createdUser'] == true)
                  ? 'Existing Number it\'s Ready for Voice Connect.'
                  : 'Existing Number it\'s Ready for Voice Connect.',
              style: Theme.of(context).textTheme.bodySmall!.copyWith(
                    color: AppColors.appTextSecondary,
                  ),
            ).tr(),
          ],
          SizedBox(height: 2.h),
          SizedBox(
            width: double.infinity,
            child: CustomElevatedButton(
              onPressed: _isPreparingVoiceSession ? null : _prepareVoiceSession,
              text: _isPreparingVoiceSession ? '' : (isLinphone ? 'Prepare SIP Session' : 'Prepare Voice Session'),
              progressIndicator: const CircularProgressIndicator(
                strokeWidth: 2,
                color: Colors.white,
              ),
              height: 48,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOutboundCallCard() {
    if (_number == null) return const SizedBox.shrink();

    return _infoCard(
      icon: Icons.dialpad_rounded,
      title: 'Outbound Calls',
      subtitle: 'Open the dialpad and start an outbound call from your eRoaming Number.',
      child: SizedBox(
        width: double.infinity,
        child: CustomElevatedButton(
          onPressed: _isPreparingVoiceSession ? null : _openDialpad,
          text: _isPreparingVoiceSession ? '' : 'Open Dialpad',
          progressIndicator: const CircularProgressIndicator(
            strokeWidth: 2,
            color: Colors.white,
          ),
          height: 48,
        ),
      ),
    );
  }

  Widget _buildSendSmsCard() {
    if (_number == null) return const SizedBox.shrink();

    return _infoCard(
      icon: Icons.sms_outlined,
      title: 'Send SMS',
      subtitle: 'Send SMS from your Assigned eRoaming Number.',
      child: Column(
        children: [
          _textField(
            controller: _recipientController,
            label: 'Recipient Number',
            hint: '+15551234567',
            keyboardType: TextInputType.phone,
          ),
          SizedBox(height: 1.5.h),
          _textField(
            controller: _messageController,
            label: 'Message',
            maxLines: 4,
          ),
          SizedBox(height: 2.h),
          SizedBox(
            width: double.infinity,
            child: CustomElevatedButton(
              onPressed: _isSending ? null : _sendSms,
              text: _isSending ? '' : 'Send SMS',
              progressIndicator: const CircularProgressIndicator(
                strokeWidth: 2,
                color: Colors.white,
              ),
              height: 48,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessagesCard() {
    if (_number == null) return const SizedBox.shrink();

    return _infoCard(
      icon: Icons.forum_outlined,
      title: 'SMS History',
      subtitle: 'Inbound and outbound messages linked to your eRoaming Number.',
      child: _messages.isEmpty
          ? Text(
              'No SMS messages yet.',
              style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                color: AppColors.appTextSecondary,
              ),
            ).tr()
          : Column(
              children: _messages.map((message) {
                final item = message as Map<String, dynamic>;
                final direction = (item['direction'] ?? 'outbound').toString();
                final peer = direction == 'inbound'
                    ? 'From ${item['fromNumber'] ?? '-'}'
                    : 'To ${item['toNumber'] ?? '-'}';
                final status = _smsValue(item, [
                  'status',
                  'deliveryStatus',
                  'delivery_status',
                  'messageStatus',
                  'dlrStatus',
                  'dlr_status',
                ]);
                final messageId = _smsValue(item, [
                  'messageUuid',
                  'message_uuid',
                  'messageId',
                  'message_id',
                  'vonageMessageId',
                  'uuid',
                ]);

                return Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.scaffoldbackgroudColor,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.appBorder),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: direction == 'inbound'
                                  ? Colors.green.withOpacity(0.12)
                                  : AppColors.primaryColor.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(100),
                            ),
                            child: Text(
                              direction.toUpperCase(),
                              style: TextStyle(
                                fontSize: 11.sp,
                                fontWeight: FontWeight.normal,
                                color: direction == 'inbound'
                                    ? Colors.green.shade700
                                    : AppColors.primaryColor,
                              ),
                            ),
                          ),
                        ],
                      ),
                      SizedBox(height: 1.h),
                      Text(peer),
                      if (status.isNotEmpty) ...[
                        SizedBox(height: 0.5.h),
                        Text(
                          'Delivery status: $status',
                          style: TextStyle(
                            color: AppColors.appTextSecondary,
                            fontSize: 11.5.sp,
                          ),
                        ),
                      ],
                      if (messageId.isNotEmpty) ...[
                        SizedBox(height: 0.5.h),
                        Text(
                          'Message ID: $messageId',
                          style: TextStyle(
                            color: AppColors.appTextSecondary,
                            fontSize: 11.5.sp,
                          ),
                        ),
                      ],
                      SizedBox(height: 0.5.h),
                      Text('${item['createdAt'] ?? '-'}', style: TextStyle(color: AppColors.appTextSecondary, fontSize: 11.5.sp)),
                      SizedBox(height: 1.h),
                      Text((item['text'] ?? '').toString()),
                    ],
                  ),
                );
              }).toList(),
            ),
    );
  }

  @override
  Widget build(BuildContext context) {
    AppColors.applyTheme(Theme.of(context).brightness == Brightness.dark);

    if (widget.buyNewOnly) {
      return SafeArea(
        child: Scaffold(
          backgroundColor: AppColors.scaffoldbackgroudColor,
          appBar: AppBar(
            title: const Text('Buy New eRoaming Number').tr(),
          ),
          body: _isLoading
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
                  onRefresh: _loadDashboard,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _buildApplicationCard(forceShow: true),
                      SizedBox(height: 3.h),
                    ],
                  ),
                ),
        ),
      );
    }

    return SafeArea(
      child: Scaffold(
        backgroundColor: AppColors.scaffoldbackgroudColor,
        appBar: AppBar(
          title: const Text('eRoaming Number').tr(),
          actions: [
            IconButton(
              onPressed: _loadDashboard,
              icon: const Icon(Icons.refresh_rounded),
            ),
          ],
        ),
        body: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _loadDashboard,
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    _infoCard(
                      icon: Icons.phone_in_talk_outlined,
                      title: 'eRoaming Number',
                      subtitle: _statusText(),
                      trailing: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                        decoration: BoxDecoration(
                          color: _hasConnectionError
                              ? Colors.red.withOpacity(0.12)
                              : _isFeatureEnabled
                                  ? Colors.green.withOpacity(0.12)
                                  : Colors.orange.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(100),
                        ),
                        child: Text(
                          _featureStateLabel(),
                          style: TextStyle(
                            color: _hasConnectionError
                                ? Colors.red.shade700
                                : _isFeatureEnabled
                                    ? Colors.green.shade700
                                    : Colors.orange.shade800,
                            fontWeight: FontWeight.normal,
                            fontSize: 11.5.sp,
                          ),
                        ).tr(),
                      ),
                    ),
                    if (_error != null) ...[
                      SizedBox(height: 2.h),
                      Text(_error!, style: TextStyle(color: Colors.red.shade700)),
                    ],
                    SizedBox(height: 2.h),
                    _buildApplicationCard(),
                    if (_application != null && _number == null) SizedBox(height: 2.h),
                    _buildLatestApplicationCard(),
                    if (_number != null) ...[
                      SizedBox(height: 2.h),
                      _buildAssignedNumberCard(),
                      SizedBox(height: 2.h),
                      _buildSubscriptionSettingsCard(),
                      SizedBox(height: 2.h),
                      _buildBuyNewNumberCard(),
                      SizedBox(height: 2.h),
                      _buildOutboundCallCard(),
                      SizedBox(height: 2.h),
                      _buildSendSmsCard(),
                      SizedBox(height: 2.h),
                      _buildMessagesCard(),
                    ],
                    SizedBox(height: 3.h),
                  ],
                ),
              ),
      ),
    );
  }
}
