import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/iptvModule/views/IPTVServicesScreen.dart';
import 'package:esimconnect/widgets/customElevatedButton.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:sizer/sizer.dart';

class EntertainmentScreen extends StatelessWidget {
  const EntertainmentScreen({super.key});

  @override
  Widget build(BuildContext context) {
    AppColors.applyTheme(Theme.of(context).brightness == Brightness.dark);

    return SafeArea(
      child: Scaffold(
        backgroundColor: AppColors.scaffoldbackgroudColor,
        appBar: AppBar(title: const Text('Entertainment').tr()),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _menuCard(
              context: context,
              icon: Icons.live_tv_rounded,
              title: 'IPTV Subscriptions',
              subtitle: 'View your purchased IPTV subscriptions.',
              onTap: () => Get.to(() => const PurchasedIptvSubscriptionsScreen()),
            ),
          ],
        ),
      ),
    );
  }

  Widget _menuCard({
    required BuildContext context,
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.appSurface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.appBorder),
        ),
        child: Row(
          children: [
            Container(
              height: 12.w,
              width: 12.w,
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
                          fontSize: 14.sp,
                          fontWeight: FontWeight.normal,
                          color: AppColors.appTextPrimary,
                        ),
                  ).tr(),
                  SizedBox(height: 0.6.h),
                  Text(
                    subtitle,
                    style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                          fontSize: 14.sp,
                          color: AppColors.appTextSecondary,
                        ),
                  ).tr(),
                ],
              ),
            ),
            Icon(Icons.chevron_right_rounded, color: AppColors.appTextSecondary),
          ],
        ),
      ),
    );
  }
}

class PurchasedIptvSubscriptionsScreen extends StatefulWidget {
  const PurchasedIptvSubscriptionsScreen({super.key});

  @override
  State<PurchasedIptvSubscriptionsScreen> createState() =>
      _PurchasedIptvSubscriptionsScreenState();
}

class _PurchasedIptvSubscriptionsScreenState
    extends State<PurchasedIptvSubscriptionsScreen> {
  final ApiService _apiService = ApiService();
  late Future<Map<String, dynamic>> _subscriptionsFuture;

  @override
  void initState() {
    super.initState();
    _subscriptionsFuture = _loadSubscriptions();
  }

  Future<Map<String, dynamic>> _loadSubscriptions() async {
    final catalogResponse = await _apiService.get('iptv/catalog?platform=mobile');
    final orderResponse = await _apiService.get('iptv/orders');

    final catalog = catalogResponse is Map
        ? Map<String, dynamic>.from(
            (catalogResponse['data'] as Map?) ?? <String, dynamic>{},
          )
        : <String, dynamic>{};
    final settings = (catalog['settings'] as Map?)?.cast<String, dynamic>() ??
        <String, dynamic>{};
    final orders = orderResponse is Map
        ? (((orderResponse['data'] as List?) ?? const [])
            .whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .toList())
        : <Map<String, dynamic>>[];

    return <String, dynamic>{'orders': orders, 'settings': settings};
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Map<String, dynamic>>(
      future: _subscriptionsFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return Scaffold(
            backgroundColor: AppColors.scaffoldbackgroudColor,
            appBar: AppBar(title: const Text('IPTV Subscriptions').tr()),
            body: Center(
              child: CircularProgressIndicator(color: AppColors.primaryColor),
            ),
          );
        }

        if (snapshot.hasError) {
          return Scaffold(
            backgroundColor: AppColors.scaffoldbackgroudColor,
            appBar: AppBar(title: const Text('IPTV Subscriptions').tr()),
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.error_outline, color: Colors.red.shade400, size: 44),
                    const SizedBox(height: 12),
                    Text(
                      'Unable to load IPTV subscriptions.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: AppColors.appTextPrimary,
                        fontWeight: FontWeight.normal,
                      ),
                    ).tr(),
                    const SizedBox(height: 12),
                    ElevatedButton.icon(
                      onPressed: () {
                        setState(() {
                          _subscriptionsFuture = _loadSubscriptions();
                        });
                      },
                      icon: const Icon(Icons.refresh_rounded),
                      label: const Text('Retry').tr(),
                    ),
                  ],
                ),
              ),
            ),
          );
        }

        final data = snapshot.data ?? <String, dynamic>{};
        final orders = ((data['orders'] as List?) ?? const [])
            .whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .toList();
        final settings =
            (data['settings'] as Map?)?.cast<String, dynamic>() ??
                <String, dynamic>{};

        return MyIPTVSubscriptionsScreen(
          orders: orders,
          settings: settings,
        );
      },
    );
  }
}

class IptvSubscriptionScreen extends StatefulWidget {
  const IptvSubscriptionScreen({super.key});

  @override
  State<IptvSubscriptionScreen> createState() => _IptvSubscriptionScreenState();
}

class _IptvSubscriptionScreenState extends State<IptvSubscriptionScreen> {
  String _mode = 'buy';
  String _packageTerm = '1_month';
  String _renewalTerm = '1_month';
  bool _autoRenew = true;
  bool _cancelAtPeriodEnd = false;

  String _packageLabel(String term) {
    switch (term) {
      case 'trial_24h':
        return 'Trial 24 Hours';
      case 'trial_48h':
        return 'Trial 48 Hours';
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

  void _submit() {
    final action = _mode == 'trial'
        ? 'Start IPTV Trial'
        : _mode == 'renew'
            ? 'Renew IPTV'
            : 'Buy New IPTV';
    final renewalText = _autoRenew
        ? ' Auto renews to ${_packageLabel(_renewalTerm)}.'
        : '';
    Get.snackbar(
      action,
      '${_packageLabel(_packageTerm)} package selected.$renewalText',
      snackPosition: SnackPosition.BOTTOM,
    );
  }

  void _setMode(String mode) {
    setState(() {
      _mode = mode;
      _autoRenew = true;
      _cancelAtPeriodEnd = false;
      if (mode == 'trial') {
        _packageTerm = 'trial_24h';
        _renewalTerm = '1_month';
      } else if (mode == 'renew') {
        _packageTerm = _renewalTerm;
      } else {
        _packageTerm = '1_month';
        _renewalTerm = _packageTerm;
      }
    });
  }

  void _cancelRenewal() {
    setState(() {
      _autoRenew = false;
      _cancelAtPeriodEnd = true;
    });
    Get.snackbar(
      'Cancellation scheduled',
      'The IPTV plan will stay active until the remaining subscription dates expire.',
      snackPosition: SnackPosition.BOTTOM,
    );
  }

  @override
  Widget build(BuildContext context) {
    AppColors.applyTheme(Theme.of(context).brightness == Brightness.dark);

    return SafeArea(
      child: Scaffold(
        backgroundColor: AppColors.scaffoldbackgroudColor,
        appBar: AppBar(title: const Text('IPTV Subscriptions').tr()),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _sectionCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Buy New, Trial or Renew',
                    style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                          fontSize: 14.sp,
                          fontWeight: FontWeight.normal,
                          color: AppColors.appTextPrimary,
                        ),
                  ).tr(),
                  SizedBox(height: 1.4.h),
                  _modeSelector(),
                  SizedBox(height: 2.h),
                  _packageDropdown(),
                  SizedBox(height: 2.h),
                  _autoRenewSwitch(),
                  if (_autoRenew) ...[
                    SizedBox(height: 2.h),
                    _renewalDropdown(),
                  ],
                  if (_mode == 'renew') ...[
                    SizedBox(height: 1.4.h),
                    _cancelRenewalPanel(),
                  ],
                  SizedBox(height: 2.h),
                  CustomElevatedButton(
                    onPressed: _submit,
                    text: _mode == 'trial'
                        ? 'Start Trial'
                        : _mode == 'renew'
                            ? 'Renew IPTV Subscription'
                            : 'Buy IPTV Subscription',
                    height: 48,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _sectionCard({required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.appSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.appBorder),
      ),
      child: child,
    );
  }

  Widget _modeSelector() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.scaffoldbackgroudColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.appBorder),
      ),
      child: Row(
        children: [
          _modeButton('buy', 'Buy New'),
          _modeButton('trial', 'Trial'),
          _modeButton('renew', 'Renew'),
        ],
      ),
    );
  }

  Widget _modeButton(String value, String label) {
    final selected = _mode == value;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          _setMode(value);
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: selected ? AppColors.primaryColor : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontWeight: FontWeight.normal,
              color: selected ? Colors.white : AppColors.appTextSecondary,
            ),
          ).tr(),
        ),
      ),
    );
  }

  Widget _packageDropdown() {
    final isTrial = _mode == 'trial';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          isTrial ? 'Trial' : 'Package',
          style: TextStyle(
            fontSize: 14.sp,
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
              value: _packageTerm,
              dropdownColor: AppColors.appSurface,
              items: isTrial
                  ? const [
                      DropdownMenuItem(
                        value: 'trial_24h',
                        child: Text('Trial 24 Hours'),
                      ),
                      DropdownMenuItem(
                        value: 'trial_48h',
                        child: Text('Trial 48 Hours'),
                      ),
                    ]
                  : const [
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
                  if (_mode != 'trial') _renewalTerm = value;
                });
              },
            ),
          ),
        ),
      ],
    );
  }

  Widget _autoRenewSwitch() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.scaffoldbackgroudColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.appBorder),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              'Auto Renew',
              style: TextStyle(
                fontSize: 14.sp,
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
                if (value) _cancelAtPeriodEnd = false;
              });
            },
          ),
        ],
      ),
    );
  }

  Widget _renewalDropdown() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Auto Renew To',
          style: TextStyle(
            fontSize: 14.sp,
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
              value: _renewalTerm,
              dropdownColor: AppColors.appSurface,
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
                  _renewalTerm = value;
                });
              },
            ),
          ),
        ),
        if (_mode == 'trial') ...[
          SizedBox(height: 1.h),
          Text(
            'Trial will automatically renew to 1 Month by default.',
            style: TextStyle(
              color: AppColors.appTextSecondary,
              fontSize: 14.sp,
            ),
          ).tr(),
        ],
      ],
    );
  }

  Widget _cancelRenewalPanel() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.scaffoldbackgroudColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.appBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _cancelAtPeriodEnd
                ? 'Cancellation scheduled. The plan remains active until it expires.'
                : 'Canceling stops future renewal only. Remaining dates stay active until the plan expires.',
            style: TextStyle(
              color: AppColors.appTextSecondary,
              fontSize: 14.sp,
            ),
          ).tr(),
          SizedBox(height: 1.2.h),
          OutlinedButton.icon(
            onPressed: _cancelRenewal,
            icon: const Icon(Icons.event_busy_rounded),
            label: const Text('Cancel Renewal').tr(),
          ),
        ],
      ),
    );
  }
}
