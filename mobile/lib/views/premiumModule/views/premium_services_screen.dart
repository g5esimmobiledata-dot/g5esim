import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/utills/UserService.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/utills/services/UserModuleAccessService.dart';
import 'package:esimconnect/views/authModule/view/loginScreen.dart';
import 'package:esimconnect/views/premiumModule/views/premium_chat_screen.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/supportmodule/views/SupportCustomerScreen.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:sizer/sizer.dart';

enum _PremiumAccessState { active, locked, premium }

enum _PremiumServiceKind { chat, feature }

class _PremiumService {
  const _PremiumService({
    required this.title,
    required this.description,
    required this.category,
    required this.icon,
    required this.color,
    required this.moduleKeys,
    this.kind = _PremiumServiceKind.feature,
  });

  final String title;
  final String description;
  final String category;
  final IconData icon;
  final Color color;
  final List<String> moduleKeys;
  final _PremiumServiceKind kind;
}

class PremiumServicesScreen extends StatefulWidget {
  const PremiumServicesScreen({super.key});

  @override
  State<PremiumServicesScreen> createState() => _PremiumServicesScreenState();
}

class _PremiumServicesScreenState extends State<PremiumServicesScreen> {
  final UserModuleAccessService _moduleAccess = Get.put(
    UserModuleAccessService(),
    permanent: true,
  );
  final UserService _userService = UserService.to;

  late final List<_PremiumService> _services = [
    _PremiumService(
      title: 'Chat',
      description:
          'Premium in-app chat for account, package, and service help.',
      category: 'Communication',
      icon: Icons.chat_bubble_rounded,
      color: const Color(0xFF8D6BFF),
      kind: _PremiumServiceKind.chat,
      moduleKeys: const [
        'chat',
        'chat_module',
        'module_chat',
        'premium_chat',
        'sip_chat',
        'user_chat',
        'feature_chat',
        'allow_chat',
      ],
    ),
    _PremiumService(
      title: 'Voicemail',
      description: 'Let callers leave messages when you are unavailable.',
      category: 'Voice Features',
      icon: Icons.voicemail_rounded,
      color: const Color(0xFF4AA8FF),
      moduleKeys: const [
        'voicemail',
        'voice_mail',
        'module_voicemail',
        'module_voice_mail',
        'feature_voicemail',
        'allow_voicemail',
      ],
    ),
    _PremiumService(
      title: 'PBX',
      description: 'Business calling tools for extensions and call handling.',
      category: 'Voice Features',
      icon: Icons.account_tree_rounded,
      color: const Color(0xFF2DD4BF),
      moduleKeys: const ['pbx', 'module_pbx', 'feature_pbx', 'allow_pbx'],
    ),
    _PremiumService(
      title: 'Call Forward',
      description: 'Forward incoming calls to another destination.',
      category: 'Voice Features',
      icon: Icons.phone_forwarded_rounded,
      color: const Color(0xFF38BDF8),
      moduleKeys: const [
        'call_forward',
        'callforward',
        'call_forwarding',
        'module_call_forward',
        'module_callforward',
        'feature_call_forward',
        'allow_call_forward',
      ],
    ),
    _PremiumService(
      title: 'Do Not Disturb',
      description: 'Silence incoming calls when you do not want interruptions.',
      category: 'Voice Features',
      icon: Icons.do_not_disturb_on_rounded,
      color: const Color(0xFFF97316),
      moduleKeys: const [
        'dnd',
        'do_not_disturb',
        'donotdisturb',
        'module_dnd',
        'module_do_not_disturb',
        'feature_dnd',
        'allow_dnd',
      ],
    ),
    _PremiumService(
      title: 'Callback',
      description: 'Request a return call through your SIP account.',
      category: 'Voice Features',
      icon: Icons.settings_phone_rounded,
      color: const Color(0xFF22C55E),
      moduleKeys: const [
        'callback',
        'call_back',
        'module_callback',
        'module_call_back',
        'feature_callback',
        'allow_callback',
      ],
    ),
    _PremiumService(
      title: 'Conference Call',
      description: 'Host multi-party voice calls from your account.',
      category: 'Voice Features',
      icon: Icons.groups_rounded,
      color: const Color(0xFFEAB308),
      moduleKeys: const [
        'conference_call',
        'conference',
        'module_conference_call',
        'module_conference',
        'feature_conference_call',
        'allow_conference_call',
      ],
    ),
    _PremiumService(
      title: 'Clear / Hide Caller ID',
      description: 'Control whether your caller ID is shown on outgoing calls.',
      category: 'Voice Features',
      icon: Icons.visibility_off_rounded,
      color: const Color(0xFFEC4899),
      moduleKeys: const [
        'clear_hide_caller_id',
        'hide_caller_id',
        'clear_caller_id',
        'module_clear_hide_caller_id',
        'module_hide_caller_id',
        'feature_hide_caller_id',
        'allow_hide_caller_id',
      ],
    ),
    _PremiumService(
      title: 'Caller ID',
      description: 'Manage the caller ID used by your account.',
      category: 'Voice Features',
      icon: Icons.badge_rounded,
      color: const Color(0xFFA855F7),
      moduleKeys: const [
        'caller_id',
        'callerid',
        'module_caller_id',
        'module_callerid',
        'feature_caller_id',
        'allow_caller_id',
      ],
    ),
    _PremiumService(
      title: 'Call Recording',
      description: 'Record calls when recording is enabled for your account.',
      category: 'Voice Features',
      icon: Icons.fiber_manual_record_rounded,
      color: const Color(0xFFEF4444),
      moduleKeys: const [
        'call_recording',
        'recording',
        'module_call_recording',
        'module_recording',
        'feature_call_recording',
        'allow_call_recording',
      ],
    ),
    _PremiumService(
      title: 'Ring Group',
      description: 'Ring multiple extensions or destinations together.',
      category: 'Voice Features',
      icon: Icons.ring_volume_rounded,
      color: const Color(0xFF14B8A6),
      moduleKeys: const [
        'ring_group',
        'ringgroup',
        'module_ring_group',
        'module_ringgroup',
        'feature_ring_group',
        'allow_ring_group',
      ],
    ),
    _PremiumService(
      title: 'Trace Me',
      description: 'Follow-me calling rules for reaching you across numbers.',
      category: 'Voice Features',
      icon: Icons.route_rounded,
      color: const Color(0xFF64748B),
      moduleKeys: const [
        'trace_me',
        'traceme',
        'follow_me',
        'module_trace_me',
        'module_traceme',
        'feature_trace_me',
        'allow_trace_me',
      ],
    ),
    _PremiumService(
      title: 'Fax',
      description: 'Fax support when enabled for your account.',
      category: 'Voice Features',
      icon: Icons.fax_rounded,
      color: const Color(0xFF0EA5E9),
      moduleKeys: const ['fax', 'module_fax', 'feature_fax', 'allow_fax'],
    ),
    _PremiumService(
      title: 'DID Allocation',
      description:
          'Add a DID number so your account can receive inbound calls.',
      category: 'Numbers',
      icon: Icons.dialpad_rounded,
      color: const Color(0xFF10B981),
      moduleKeys: const [
        'did',
        'did_allocation',
        'module_did',
        'module_did_allocation',
      ],
    ),
    _PremiumService(
      title: 'Receive International Calls',
      description: 'Allow inbound calls to the assigned DID number.',
      category: 'Numbers',
      icon: Icons.public_rounded,
      color: const Color(0xFF60A5FA),
      moduleKeys: const [
        'receive_international_calls',
        'international_calls',
        'module_receive_international_calls',
        'module_international_calls',
      ],
    ),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _moduleAccess.load(force: true).then((_) {
        if (mounted) setState(() {});
      });
    });
  }

  bool get _isLoggedIn =>
      _userService.currentUserData?.data?.token?.trim().isNotEmpty == true;

  _PremiumAccessState _accessState(_PremiumService service) {
    if (!_moduleAccess.hasAny(service.moduleKeys)) {
      return _PremiumAccessState.premium;
    }
    return _moduleAccess.enabledAny(service.moduleKeys, fallback: false)
        ? _PremiumAccessState.active
        : _PremiumAccessState.locked;
  }

  Future<void> _refresh() async {
    await _moduleAccess.load(force: true);
  }

  void _openService(_PremiumService service) {
    if (!_isLoggedIn) {
      Get.offAll(() => LoginScreen());
      return;
    }

    final state = _accessState(service);
    if (service.kind == _PremiumServiceKind.chat &&
        state == _PremiumAccessState.active) {
      Get.to(() => const PremiumChatScreen());
      return;
    }

    if (state == _PremiumAccessState.active) {
      _showActiveService(service);
      return;
    }

    _showActivationSheet(service);
  }

  void _showActiveService(_PremiumService service) {
    Get.bottomSheet(
      _PremiumSheet(
        icon: service.icon,
        color: service.color,
        title: service.title,
        message:
            'This premium service is active for your account. Manage access from the G5 eSIM admin backend.',
        primaryText: 'Done',
        onPrimary: Get.back,
      ),
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
    );
  }

  void _showActivationSheet(_PremiumService service) {
    Get.bottomSheet(
      _PremiumSheet(
        icon: service.icon,
        color: service.color,
        title: service.title,
        message:
            'This is a premium service. It must be purchased or enabled for this account before it can be used.',
        primaryText: 'Contact Support',
        secondaryText: 'Close',
        onPrimary: () {
          Get.back();
          Get.to(() => SupportCustomerScreen());
        },
        onSecondary: Get.back,
      ),
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
    );
  }

  @override
  Widget build(BuildContext context) {
    AppColors.applyTheme(Theme.of(context).brightness == Brightness.dark);

    return SafeArea(
      child: Scaffold(
        backgroundColor: AppColors.scaffoldbackgroudColor,
        appBar: AppBar(title: const Text('Premium Services').tr()),
        body: Obx(() {
          final activeCount = _services
              .where(
                (service) =>
                    _accessState(service) == _PremiumAccessState.active,
              )
              .length;

          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: EdgeInsets.fromLTRB(4.w, 2.h, 4.w, 3.h),
              children: [
                _HeaderCard(
                  activeCount: activeCount,
                  totalCount: _services.length,
                  loading: _moduleAccess.isLoading.value,
                ),
                SizedBox(height: 2.5.h),
                ..._categoryWidgets(),
              ],
            ),
          );
        }),
      ),
    );
  }

  List<Widget> _categoryWidgets() {
    final categories = <String>{};
    for (final service in _services) {
      categories.add(service.category);
    }

    final widgets = <Widget>[];
    for (final category in categories) {
      final items = _services.where((service) => service.category == category);
      widgets.add(
        Padding(
          padding: EdgeInsets.only(bottom: 1.2.h),
          child: Text(
            tr(category),
            style: TextStyle(
              color: AppColors.appTextSecondary,
              fontSize: 14.sp,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      );
      for (final service in items) {
        widgets.add(
          Padding(
            padding: EdgeInsets.only(bottom: 1.4.h),
            child: _ServiceCard(
              service: service,
              state: _accessState(service),
              onTap: () => _openService(service),
            ),
          ),
        );
      }
      widgets.add(SizedBox(height: 1.h));
    }
    return widgets;
  }
}

class _HeaderCard extends StatelessWidget {
  const _HeaderCard({
    required this.activeCount,
    required this.totalCount,
    required this.loading,
  });

  final int activeCount;
  final int totalCount;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(5.w),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          colors: [Color(0xFF0B1026), Color(0xFF173B67), Color(0xFF2C244F)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 12.w,
                height: 12.w,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: const Icon(
                  Icons.workspace_premium_rounded,
                  color: Colors.white,
                ),
              ),
              SizedBox(width: 3.w),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      tr('PREMIUM'),
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 21.sp,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      tr('Services for your account'),
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.72),
                        fontSize: 13.sp,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          SizedBox(height: 3.h),
          Text(
            tr(
              'Buy and manage advanced voice, DID, and chat services in one place.',
            ),
            style: TextStyle(
              color: Colors.white.withOpacity(0.82),
              fontSize: 14.sp,
              height: 1.35,
            ),
          ),
          SizedBox(height: 2.h),
          Row(
            children: [
              _HeaderStat(
                label: 'Active',
                value: loading ? '...' : activeCount.toString(),
              ),
              SizedBox(width: 3.w),
              _HeaderStat(label: 'Offered', value: totalCount.toString()),
            ],
          ),
        ],
      ),
    );
  }
}

class _HeaderStat extends StatelessWidget {
  const _HeaderStat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 4.w, vertical: 1.5.h),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.1),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              tr(label),
              style: TextStyle(
                color: Colors.white.withOpacity(0.65),
                fontSize: 11.sp,
              ),
            ),
            SizedBox(height: 0.5.h),
            Text(
              value,
              style: TextStyle(
                color: Colors.white,
                fontSize: 17.sp,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ServiceCard extends StatelessWidget {
  const _ServiceCard({
    required this.service,
    required this.state,
    required this.onTap,
  });

  final _PremiumService service;
  final _PremiumAccessState state;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isActive = state == _PremiumAccessState.active;
    final statusLabel = isActive
        ? 'Active'
        : state == _PremiumAccessState.locked
        ? 'Locked'
        : 'Premium';
    final statusColor = isActive
        ? Colors.green
        : state == _PremiumAccessState.locked
        ? Colors.redAccent
        : AppColors.primaryColor;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: EdgeInsets.all(4.w),
          decoration: BoxDecoration(
            color: AppColors.appSurface,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppColors.appBorder),
          ),
          child: Row(
            children: [
              Container(
                width: 12.w,
                height: 12.w,
                decoration: BoxDecoration(
                  color: service.color.withOpacity(0.14),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(service.icon, color: service.color, size: 22.sp),
              ),
              SizedBox(width: 3.5.w),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            tr(service.title),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: AppColors.appTextPrimary,
                              fontSize: 15.sp,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 9,
                            vertical: 5,
                          ),
                          decoration: BoxDecoration(
                            color: statusColor.withOpacity(0.14),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            tr(statusLabel),
                            style: TextStyle(
                              color: statusColor,
                              fontSize: 10.5.sp,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 0.7.h),
                    Text(
                      tr(service.description),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: AppColors.appTextSecondary,
                        fontSize: 12.5.sp,
                        height: 1.25,
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(width: 2.w),
              Icon(
                Icons.chevron_right_rounded,
                color: AppColors.appTextSecondary,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PremiumSheet extends StatelessWidget {
  const _PremiumSheet({
    required this.icon,
    required this.color,
    required this.title,
    required this.message,
    required this.primaryText,
    required this.onPrimary,
    this.secondaryText,
    this.onSecondary,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String message;
  final String primaryText;
  final VoidCallback onPrimary;
  final String? secondaryText;
  final VoidCallback? onSecondary;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Container(
        width: double.infinity,
        margin: const EdgeInsets.all(12),
        padding: EdgeInsets.all(5.w),
        decoration: BoxDecoration(
          color: AppColors.appSurface,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: AppColors.appBorder),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 13.w,
              height: 13.w,
              decoration: BoxDecoration(
                color: color.withOpacity(0.14),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Icon(icon, color: color, size: 24.sp),
            ),
            SizedBox(height: 2.h),
            Text(
              tr(title),
              style: TextStyle(
                color: AppColors.appTextPrimary,
                fontSize: 18.sp,
                fontWeight: FontWeight.w700,
              ),
            ),
            SizedBox(height: 1.h),
            Text(
              tr(message),
              style: TextStyle(
                color: AppColors.appTextSecondary,
                fontSize: 13.sp,
                height: 1.35,
              ),
            ),
            SizedBox(height: 2.5.h),
            Row(
              children: [
                if (secondaryText != null) ...[
                  Expanded(
                    child: OutlinedButton(
                      onPressed: onSecondary,
                      child: Text(tr(secondaryText!)),
                    ),
                  ),
                  SizedBox(width: 3.w),
                ],
                Expanded(
                  child: ElevatedButton(
                    onPressed: onPrimary,
                    child: Text(tr(primaryText)),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
