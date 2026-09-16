import 'dart:async';

import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import 'package:esimconnect/utills/services/VoiceBridgeService.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/supportmodule/bloc/tickets_bloc/ticket_bloc.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/supportmodule/bloc/tickets_bloc/ticket_event.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/supportmodule/model/FaqModel.dart'
    as faq_model;
import 'package:esimconnect/views/profileMoulde/userProfileModule/supportmodule/model/ticketModel.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/supportmodule/views/SupportChatScreen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:get/get.dart';
import 'package:sizer/sizer.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../../../utills/global.dart' as global;

class ConciergeScreen extends StatefulWidget {
  const ConciergeScreen({super.key});

  @override
  State<ConciergeScreen> createState() => _ConciergeScreenState();
}

class _ConciergeScreenState extends State<ConciergeScreen> {
  final ApiService _apiService = ApiService();
  final VoiceBridgeService _voiceBridge = VoiceBridgeService();
  Map<String, dynamic> _status = <String, dynamic>{};
  List<faq_model.Datum> _faqs = <faq_model.Datum>[];
  bool _loading = true;
  bool _processing = false;
  bool _sipEnabled = false;
  String _whatsAppNumber = '';
  String _hotlineNumber = '';
  String _sipAddress = '';
  String _sipLabel = 'SIP Call';
  Timer? _sipCallTimer;
  String _sipCallState = 'idle';
  String _sipCallError = '';
  DateTime? _sipConnectedAt;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<TicketsBloc>().add(const TicketEvent());
      _loadPremiumData();
    });
  }

  @override
  void dispose() {
    _sipCallTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadPremiumData() async {
    setState(() => _loading = true);
    try {
      final statusResponse = await _apiService.get('concierge/status');
      final settingsResponse = await _apiService.get(
        'public/settings',
        requiresAuth: false,
      );
      final faqResponse = await _apiService.get(ApiEndPoints.GET_FAQ);
      dynamic sipResponse;
      try {
        sipResponse = await _apiService.get('concierge/sip');
      } catch (_) {
        sipResponse = null;
      }

      final settings = _dataMap(settingsResponse);
      final sipSettings = _dataMap(sipResponse);
      final sipSource = sipSettings.isNotEmpty ? sipSettings : settings;
      final faqModel = faq_model.FaqModel.fromJson(
        faqResponse is Map<String, dynamic> ? faqResponse : <String, dynamic>{},
      );

      if (!mounted) return;
      setState(() {
        _status = _dataMap(statusResponse);
        _faqs = (faqModel.data ?? <faq_model.Datum>[])
            .where((item) => item.isActive != false)
            .take(4)
            .toList();
        _whatsAppNumber = _readSetting(settings, const [
          'concierge_whatsapp_number',
          'support_whatsapp_number',
          'whatsapp_number',
        ]);
        _hotlineNumber = _readSetting(settings, const [
          'concierge_hotline_number',
          'support_hotline_number',
          'support_phone',
          'phone',
        ], fallback: _whatsAppNumber);
        _sipAddress = _readSetting(sipSource, const [
          'uri',
          'sipUri',
          'concierge_sip_uri',
          'concierge_sip_address',
          'concierge_sip_extension',
          'support_sip_uri',
          'support_sip_address',
        ]);
        _sipLabel = _readSetting(sipSource, const [
          'label',
          'sipLabel',
          'concierge_sip_label',
          'support_sip_label',
        ], fallback: 'SIP Call');
        _sipEnabled = _parseBool(
          _readSetting(sipSource, const [
            'enabled',
            'sipEnabled',
            'concierge_sip_enabled',
            'support_sip_enabled',
          ], fallback: _sipAddress.trim().isNotEmpty ? 'true' : 'false'),
        );
      });
    } catch (e) {
      global.showToastMessage(message: e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Map<String, dynamic> _dataMap(dynamic response) {
    if (response is Map<String, dynamic>) {
      final data = response['data'];
      if (data is Map<String, dynamic>) return data;
      return response;
    }
    return <String, dynamic>{};
  }

  String _readSetting(
    Map<String, dynamic> source,
    List<String> keys, {
    String fallback = '',
  }) {
    for (final key in keys) {
      final value = source[key]?.toString().trim();
      if (value != null && value.isNotEmpty && value != 'null') return value;
    }
    return fallback;
  }

  bool _parseBool(dynamic value) {
    final text = value?.toString().toLowerCase().trim();
    return text == 'true' || text == '1' || text == 'yes' || text == 'active';
  }

  bool get _isPaid {
    return _status['status']?.toString().toLowerCase() == 'active' &&
        _status['pricingMode']?.toString().toLowerCase() == 'paid';
  }

  bool get _hasAccess => _parseBool(_status['hasAccess']);

  bool get _isFreeMode {
    return _status['pricingMode']?.toString().toLowerCase() == 'free';
  }

  bool get _premiumUnlocked => _hasAccess || _isFreeMode;

  bool get _aiReady {
    final aiBot = _status['aiBot'];
    if (aiBot is Map) return _parseBool(aiBot['ready']);
    return true;
  }

  String get _fee {
    final currency = _status['currency']?.toString().trim() ?? 'USD';
    final fee = _status['fee']?.toString().trim() ?? '0.00';
    return '$currency $fee';
  }

  String get _billingCycle {
    final value = _status['billingCycle']?.toString() ?? 'one_time';
    return value == 'monthly' ? 'Monthly' : 'One time';
  }

  String _normalizePhone(String value) {
    return value.replaceAll(RegExp(r'[^0-9+]'), '').replaceFirst('+', '');
  }

  Future<void> _openWhatsApp() async {
    if (!_premiumUnlocked) {
      global.showToastMessage(message: tr('Activate VIP Concierge first.'));
      return;
    }

    final number = _normalizePhone(_whatsAppNumber);
    if (number.isEmpty) {
      global.showToastMessage(message: tr('WhatsApp is not configured yet.'));
      return;
    }

    final message = Uri.encodeComponent('Hello, I need VIP Concierge support.');
    final uri = Uri.parse('whatsapp://send?phone=$number&text=$message');
    final webUri = Uri.parse('https://wa.me/$number?text=$message');

    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      await launchUrl(webUri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _callHotline() async {
    if (!_premiumUnlocked) {
      global.showToastMessage(message: tr('Activate VIP Concierge first.'));
      return;
    }

    final number = _normalizePhone(_hotlineNumber);
    if (number.isEmpty) {
      global.showToastMessage(message: tr('Hotline is not configured yet.'));
      return;
    }
    final uri = Uri.parse('tel:$number');
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      global.showToastMessage(message: tr('Can not open phone dialer.'));
    }
  }

  Future<void> _openSipCall() async {
    if (!_premiumUnlocked) {
      global.showToastMessage(message: tr('Activate VIP Concierge first.'));
      return;
    }

    final address = _sipAddress.trim();
    if (!_sipEnabled || address.isEmpty) {
      global.showToastMessage(
        message: tr('SIP calling is not configured yet.'),
      );
      return;
    }

    final uri = Uri.parse(
      address.toLowerCase().startsWith('sip:') ? address : 'sip:$address',
    );

    await _launchSipUri(uri);
  }

  Future<void> _launchSipUri(Uri uri) async {
    try {
      setState(() {
        _sipCallState = 'calling';
        _sipCallError = '';
        _sipConnectedAt = null;
      });
      _startSipCallWatcher();

      final response = await _apiService.get('concierge/sip');
      final data = response is Map<String, dynamic>
          ? (response['data'] as Map<String, dynamic>? ?? response)
          : <String, dynamic>{};
      final account = data['account'] is Map
          ? Map<String, dynamic>.from(data['account'] as Map)
          : <String, dynamic>{};
      final destinationUri = (data['uri'] ?? uri.toString()).toString();

      await _voiceBridge.startSipCall(
        destinationUri: destinationUri,
        account: account,
      );
      if (mounted && _sipCallState == 'calling') {
        setState(() => _sipCallState = 'dialing');
      }
    } catch (e) {
      _sipCallTimer?.cancel();
      if (mounted) {
        setState(() {
          _sipCallState = 'failed';
          _sipCallError = e.toString();
          _sipConnectedAt = null;
        });
      }
      global.showToastMessage(message: e.toString());
    }
  }

  void _startSipCallWatcher() {
    _sipCallTimer?.cancel();
    _sipCallTimer = Timer.periodic(const Duration(seconds: 1), (_) async {
      try {
        final state = await _voiceBridge.getCallState();
        if (!mounted) return;
        final backend = state['backend']?.toString();
        if (backend != 'linphone') return;

        final nativeState =
            state['state']?.toString().toLowerCase() ?? 'calling';
        setState(() {
          if (nativeState == 'active' && _sipConnectedAt == null) {
            _sipConnectedAt = DateTime.now();
          }
          _sipCallState = nativeState;
          if (nativeState == 'ended' || nativeState == 'failed') {
            _sipConnectedAt = null;
          }
        });

        if (nativeState == 'ended' || nativeState == 'failed') {
          _sipCallTimer?.cancel();
        }
      } catch (_) {
        // The call panel should not disappear because one status poll fails.
      }
    });
  }

  Future<void> _hangupSipCall() async {
    try {
      await _voiceBridge.endCurrentCall();
    } catch (e) {
      final message = e.toString().toLowerCase();
      if (!message.contains('null check operator used on a null value') &&
          !message.contains('terminated') &&
          !message.contains('already ended') &&
          !message.contains('no active call')) {
        global.showToastMessage(message: e.toString());
      }
    } finally {
      _sipCallTimer?.cancel();
      if (mounted) {
        setState(() {
          _sipCallState = 'ended';
          _sipConnectedAt = null;
        });
      }
    }
  }

  void _openTicket(Datum ticket) {
    Get.to(() => SupportChatScreen(ticketId: ticket.id));
  }

  Future<void> _cancelSubscription() async {
    final confirm = await Get.dialog<bool>(
      AlertDialog(
        title: Text(tr('Cancel Concierge?')),
        content: Text(tr('Your premium Concierge access will be cancelled.')),
        actions: [
          TextButton(
            onPressed: () => Get.back(result: false),
            child: Text(tr('No')),
          ),
          TextButton(
            onPressed: () => Get.back(result: true),
            child: Text(tr('Cancel')),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    await _runSubscriptionAction(
      endpoint: 'concierge/cancel',
      successMessage: tr('Concierge subscription cancelled'),
    );
  }

  Future<void> _renewSubscription() async {
    await _runSubscriptionAction(
      endpoint: 'concierge/renew',
      successMessage: tr('Concierge renewed successfully'),
    );
  }

  Future<void> _runSubscriptionAction({
    required String endpoint,
    required String successMessage,
  }) async {
    if (_processing) return;
    setState(() => _processing = true);
    try {
      final response = await _apiService.post(
        endpoint,
        data: {'paymentMethod': 'wallet'},
      );
      global.showToastMessage(
        message: response is Map && response['message'] != null
            ? response['message'].toString()
            : successMessage,
      );
      await _loadPremiumData();
    } catch (e) {
      global.showToastMessage(message: e.toString());
    } finally {
      if (mounted) setState(() => _processing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    AppColors.applyTheme(Theme.of(context).brightness == Brightness.dark);

    return SafeArea(
      child: Scaffold(
        backgroundColor: AppColors.scaffoldbackgroudColor,
        appBar: AppBar(title: const Text('VIP Concierge').tr()),
        body: RefreshIndicator(
          onRefresh: () async {
            context.read<TicketsBloc>().add(const TicketEvent());
            await _loadPremiumData();
          },
          child: BlocBuilder<TicketsBloc, ApiState<TicketsModel>>(
            builder: (context, state) {
              final tickets = state is ApiSuccess<TicketsModel>
                  ? state.data.data?.data ?? <Datum>[]
                  : <Datum>[];
              final activeTicket = _activeConciergeTicket(tickets);

              return ListView(
                padding: EdgeInsets.all(5.w),
                children: [
                  _membershipCard(),
                  SizedBox(height: 2.h),
                  _quickActions(activeTicket),
                  if (_sipCallState != 'idle') ...[
                    SizedBox(height: 2.h),
                    _sipCallPanel(),
                  ],
                  SizedBox(height: 2.h),
                  _subscriptionActions(),
                  SizedBox(height: 2.h),
                  _premiumFeatures(),
                  SizedBox(height: 2.h),
                  if (activeTicket != null) _ticketCard(context, activeTicket),
                  if (_faqs.isNotEmpty) ...[
                    SizedBox(height: 2.h),
                    _faqSection(context),
                  ],
                  if (_loading)
                    Padding(
                      padding: EdgeInsets.only(top: 3.h),
                      child: const Center(child: CircularProgressIndicator()),
                    ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  Datum? _activeConciergeTicket(List<Datum> tickets) {
    final openTickets = tickets.where((ticket) => !_isClosed(ticket.status));
    final conciergeTickets = openTickets.where((ticket) {
      final title = (ticket.title ?? '').toLowerCase();
      final description = (ticket.description ?? '').toLowerCase();
      return title.contains('concierge') || description.contains('concierge');
    }).toList();
    if (conciergeTickets.isNotEmpty) return conciergeTickets.first;
    return openTickets.isNotEmpty ? openTickets.first : null;
  }

  bool _isClosed(String? status) {
    final value = status?.toLowerCase().trim();
    return value == 'closed' || value == 'resolved';
  }

  Widget _membershipCard() {
    final paidColor = _premiumUnlocked ? Colors.green : Colors.orange;
    return Container(
      padding: EdgeInsets.all(5.w),
      decoration: BoxDecoration(
        color: AppColors.appSurface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.appBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.workspace_premium_rounded,
                color: paidColor,
                size: 28.sp,
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 7,
                ),
                decoration: BoxDecoration(
                  color: paidColor.withOpacity(0.14),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: paidColor.withOpacity(0.35)),
                ),
                child: Text(
                  _premiumUnlocked
                      ? (_isFreeMode ? 'INCLUDED' : 'ACTIVE')
                      : (_status['status']?.toString().toUpperCase() ??
                            'INACTIVE'),
                  style: TextStyle(
                    color: paidColor,
                    fontSize: 13.sp,
                    fontWeight: FontWeight.w700,
                  ),
                ).tr(),
              ),
            ],
          ),
          SizedBox(height: 2.h),
          Text(
            'VIP Concierge',
            style: TextStyle(
              color: AppColors.appTextPrimary,
              fontSize: 20.sp,
              fontWeight: FontWeight.w600,
            ),
          ).tr(),
          SizedBox(height: 1.h),
          Text(
            'WhatsApp, hotline, SIP calling, and priority concierge support.',
            style: TextStyle(
              color: AppColors.appTextSecondary,
              fontSize: 14.sp,
              height: 1.35,
            ),
          ).tr(),
          SizedBox(height: 2.h),
          Row(
            children: [
              _miniStat('Plan', _billingCycle),
              SizedBox(width: 3.w),
              _miniStat('Price', _fee),
            ],
          ),
        ],
      ),
    );
  }

  Widget _miniStat(String label, String value) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.appSurfaceAlt,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.appBorder),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              tr(label),
              style: TextStyle(
                color: AppColors.appTextSecondary,
                fontSize: 12.sp,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: TextStyle(
                color: AppColors.appTextPrimary,
                fontSize: 14.sp,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _quickActions(Datum? activeTicket) {
    return Row(
      children: [
        _actionTile(
          FontAwesomeIcons.whatsapp,
          'WhatsApp',
          _openWhatsApp,
          Colors.green,
          enabled: _premiumUnlocked,
        ),
        SizedBox(width: 3.w),
        _actionTile(
          Icons.phone_in_talk_rounded,
          '24h Call',
          _callHotline,
          AppColors.primaryColor,
          enabled: _premiumUnlocked,
        ),
        SizedBox(width: 3.w),
        _actionTile(
          Icons.dialer_sip_rounded,
          _sipLabel,
          _openSipCall,
          const Color(0xFF0EA5E9),
          enabled:
              _premiumUnlocked && _sipEnabled && _sipAddress.trim().isNotEmpty,
        ),
      ],
    );
  }

  Widget _sipCallPanel() {
    final connected = _sipCallState == 'active';
    final failed = _sipCallState == 'failed';
    final ended = _sipCallState == 'ended';
    final elapsed = _sipConnectedAt == null
        ? Duration.zero
        : DateTime.now().difference(_sipConnectedAt!);
    final title = connected
        ? 'Connected'
        : failed
        ? 'Call failed'
        : ended
        ? 'Call ended'
        : 'Calling Call Center';
    final subtitle = connected
        ? _formatCallDuration(elapsed)
        : failed && _sipCallError.isNotEmpty
        ? _sipCallError
        : ended
        ? 'The call has ended.'
        : 'Please wait while we connect you.';

    return Container(
      padding: EdgeInsets.all(4.w),
      decoration: BoxDecoration(
        color: AppColors.appSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: connected
              ? Colors.green.withOpacity(0.45)
              : failed
              ? Colors.red.withOpacity(0.45)
              : AppColors.appBorder,
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: connected
                  ? Colors.green.withOpacity(0.14)
                  : failed
                  ? Colors.red.withOpacity(0.12)
                  : AppColors.primaryColor.withOpacity(0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(
              connected
                  ? Icons.call_rounded
                  : failed
                  ? Icons.call_end_rounded
                  : Icons.phone_in_talk_rounded,
              color: connected
                  ? Colors.green
                  : failed
                  ? Colors.red
                  : AppColors.primaryColor,
            ),
          ),
          SizedBox(width: 3.w),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  tr(title),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: AppColors.appTextPrimary,
                    fontSize: 15.sp,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  tr(subtitle),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: AppColors.appTextSecondary,
                    fontSize: 12.sp,
                  ),
                ),
              ],
            ),
          ),
          if (!failed && !ended)
            IconButton(
              onPressed: _hangupSipCall,
              style: IconButton.styleFrom(
                backgroundColor: Colors.red,
                foregroundColor: Colors.white,
              ),
              icon: const Icon(Icons.call_end_rounded),
            )
          else
            IconButton(
              onPressed: () {
                setState(() {
                  _sipCallState = 'idle';
                  _sipCallError = '';
                  _sipConnectedAt = null;
                });
              },
              icon: const Icon(Icons.close_rounded),
            ),
        ],
      ),
    );
  }

  String _formatCallDuration(Duration duration) {
    final minutes = duration.inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = duration.inSeconds.remainder(60).toString().padLeft(2, '0');
    final hours = duration.inHours;
    if (hours > 0) {
      return '${hours.toString().padLeft(2, '0')}:$minutes:$seconds';
    }
    return '$minutes:$seconds';
  }

  Widget _actionTile(
    IconData icon,
    String label,
    VoidCallback onTap,
    Color color, {
    bool enabled = true,
  }) {
    return Expanded(
      child: InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          height: 86,
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: AppColors.appSurface,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: enabled
                  ? AppColors.appBorder
                  : Colors.orange.withOpacity(0.4),
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                color: enabled ? color : AppColors.appTextSecondary,
                size: 22.sp,
              ),
              const SizedBox(height: 8),
              Text(
                tr(enabled ? label : 'Locked'),
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: enabled
                      ? AppColors.appTextPrimary
                      : AppColors.appTextSecondary,
                  fontSize: 13.sp,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _subscriptionActions() {
    if (_isFreeMode) {
      return const SizedBox.shrink();
    }

    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: _processing || !_hasAccess ? null : _cancelSubscription,
            icon: const Icon(Icons.cancel_outlined),
            label: Text(tr('Cancel Subscription')),
          ),
        ),
        SizedBox(width: 3.w),
        Expanded(
          child: ElevatedButton.icon(
            onPressed: _processing ? null : _renewSubscription,
            icon: _processing
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.autorenew_rounded),
            label: Text(tr(_hasAccess ? 'Renew' : 'Activate')),
          ),
        ),
      ],
    );
  }

  Widget _premiumFeatures() {
    final features = <Map<String, dynamic>>[
      {'icon': FontAwesomeIcons.whatsapp, 'label': 'Direct WhatsApp support'},
      {'icon': Icons.phone_in_talk_rounded, 'label': '24 hours hotline'},
      {'icon': Icons.dialer_sip_rounded, 'label': 'Free SIP app calling'},
      {
        'icon': Icons.price_check_rounded,
        'label': 'Better price and package advice',
      },
    ];

    return Container(
      padding: EdgeInsets.all(4.w),
      decoration: BoxDecoration(
        color: AppColors.appSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.appBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Premium Features',
            style: TextStyle(color: AppColors.appTextPrimary, fontSize: 16.sp),
          ).tr(),
          SizedBox(height: 1.5.h),
          ...features.map(
            (feature) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                children: [
                  Icon(
                    feature['icon'] as IconData,
                    color: AppColors.primaryColor,
                    size: 18.sp,
                  ),
                  SizedBox(width: 3.w),
                  Expanded(
                    child: Text(
                      tr(feature['label'] as String),
                      style: TextStyle(
                        color: AppColors.appTextPrimary,
                        fontSize: 14.sp,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _ticketCard(BuildContext context, Datum ticket) {
    return InkWell(
      onTap: () => _openTicket(ticket),
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: EdgeInsets.all(4.w),
        decoration: BoxDecoration(
          color: AppColors.appSurfaceAlt,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.appBorder),
        ),
        child: Row(
          children: [
            Icon(
              Icons.confirmation_number_outlined,
              color: AppColors.primaryColor,
            ),
            SizedBox(width: 3.w),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    ticket.title ?? 'Concierge Request',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: AppColors.appTextPrimary,
                      fontSize: 15.sp,
                    ),
                  ).tr(),
                  SizedBox(height: 0.5.h),
                  Text(
                    ticket.status ?? 'open',
                    style: TextStyle(
                      color: AppColors.appTextSecondary,
                      fontSize: 13.sp,
                    ),
                  ).tr(),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right_rounded,
              color: AppColors.appTextSecondary,
            ),
          ],
        ),
      ),
    );
  }

  Widget _faqSection(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(4.w),
      decoration: BoxDecoration(
        color: AppColors.appSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.appBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'FAQ',
            style: TextStyle(color: AppColors.appTextPrimary, fontSize: 16.sp),
          ).tr(),
          SizedBox(height: 1.h),
          ..._faqs.map(
            (item) => ExpansionTile(
              tilePadding: EdgeInsets.zero,
              childrenPadding: EdgeInsets.zero,
              title: Text(
                item.question ?? '',
                style: TextStyle(
                  color: AppColors.appTextPrimary,
                  fontSize: 14.sp,
                ),
              ),
              children: [
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    item.answer ?? '',
                    style: TextStyle(
                      color: AppColors.appTextSecondary,
                      fontSize: 13.sp,
                      height: 1.35,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
