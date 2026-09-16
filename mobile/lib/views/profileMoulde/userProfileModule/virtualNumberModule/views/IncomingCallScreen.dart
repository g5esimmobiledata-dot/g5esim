import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import 'package:esimconnect/utills/services/VoiceBridgeService.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/virtualNumberModule/views/OutboundCallScreen.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/virtualNumberModule/views/virtualNumberScreen.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:sizer/sizer.dart';

class IncomingCallScreen extends StatefulWidget {
  final Map<String, dynamic> callData;
  final String? initialAction;

  const IncomingCallScreen({
    super.key,
    required this.callData,
    this.initialAction,
  });

  @override
  State<IncomingCallScreen> createState() => _IncomingCallScreenState();
}

class _IncomingCallScreenState extends State<IncomingCallScreen> {
  final ApiService _apiService = ApiService();
  final VoiceBridgeService _voiceBridge = VoiceBridgeService();

  String _status = 'Ringing';
  bool _isAccepting = false;
  bool _isDeclining = false;
  bool _isEnding = false;
  Map<String, dynamic>? _voiceSession;
  Map<String, dynamic>? _nativeState;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (widget.initialAction == 'accept_call') {
        _acceptCall();
      } else if (widget.initialAction == 'decline_call') {
        _declineCall();
      }
    });
  }

  String get _callerName =>
      (widget.callData['callerName'] ??
              widget.callData['from'] ??
              widget.callData['fromNumber'] ??
              'Incoming Call')
          .toString();

  String get _didNumber =>
      (widget.callData['to'] ?? widget.callData['toNumber'] ?? '-').toString();

  String get _backend =>
      (widget.callData['backend'] ?? widget.callData['voiceBackend'] ?? 'voice')
          .toString()
          .toUpperCase();

  Future<Map<String, dynamic>> _ensureVoiceSession() async {
    if (_voiceSession != null) {
      return _voiceSession!;
    }

    final response = await _apiService.post(
      'voice/session',
      data: <String, dynamic>{
        'direction': 'inbound',
        'referenceNumber': _didNumber == '-' ? null : _didNumber,
        'from': _callerName,
      },
    );
    final data = response is Map<String, dynamic>
        ? (response['data'] as Map<String, dynamic>? ?? <String, dynamic>{})
        : <String, dynamic>{};

    await _voiceBridge.initializeSession(await _withPushToken(data));

    if (mounted) {
      setState(() {
        _voiceSession = data;
      });
    }
    return data;
  }

  Future<Map<String, dynamic>> _withPushToken(
    Map<String, dynamic> session,
  ) async {
    if (kIsWeb) return session;

    final data = Map<String, dynamic>.from(session);
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null && token.isNotEmpty) {
        data['pushToken'] = token;
      }
    } catch (_) {
      // The active call can still continue if token refresh is unavailable.
    }
    return data;
  }

  bool _hasCallId(Map<String, dynamic> data) {
    const keys = <String>[
      'callId',
      'call_id',
      'callID',
      'id',
      'uuid',
      'callUuid',
      'call_uuid',
    ];
    return keys.any(
      (key) => (data[key]?.toString().trim().isNotEmpty ?? false),
    );
  }

  Future<Map<String, dynamic>> _callDataWithInvite() async {
    final current = Map<String, dynamic>.from(widget.callData);
    if (_hasCallId(current)) return current;

    final processed = await _voiceBridge.processIncomingPush(current);
    if (mounted) {
      setState(() {
        _nativeState = processed;
      });
    }

    final callId = processed['callId']?.toString();
    if (callId != null && callId.isNotEmpty) {
      current['callId'] = callId;
    }
    return current;
  }

  Future<void> _acceptCall() async {
    setState(() {
      _isAccepting = true;
      _status = 'Connecting';
    });

    try {
      await _ensureVoiceSession();
      final callData = await _callDataWithInvite();
      final result = await _voiceBridge.acceptIncomingCall(callData);

      if (!mounted) return;
      setState(() {
        _nativeState = result;
        _status = (result['state'] ?? 'Accepted').toString();
      });

      Get.snackbar(
        'Call accepted',
        'Voice backend session is now bound to the incoming call flow.',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.green.shade700,
        colorText: Colors.white,
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _status = 'Failed';
      });
      Get.snackbar(
        'Accept failed',
        e.toString(),
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.red.shade700,
        colorText: Colors.white,
      );
    } finally {
      if (mounted) {
        setState(() {
          _isAccepting = false;
        });
      }
    }
  }

  Future<void> _declineCall() async {
    setState(() {
      _isDeclining = true;
    });

    try {
      await _ensureVoiceSession();
      final callData = await _callDataWithInvite();
      final result = await _voiceBridge.declineIncomingCall(callData);
      if (mounted) {
        setState(() {
          _nativeState = result;
          _status = (result['state'] ?? 'Declined').toString();
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _status = 'Declined';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isDeclining = false;
        });
      }
      Get.back();
    }
  }

  Future<void> _endCall() async {
    setState(() {
      _isEnding = true;
    });

    try {
      final result = await _voiceBridge.endCurrentCall();
      if (!mounted) return;
      setState(() {
        _nativeState = result;
        _status = (result['state'] ?? 'Ended').toString();
      });
    } catch (e) {
      final message = e.toString().toLowerCase();
      if (message.contains('null check operator used on a null value') ||
          message.contains('terminated') ||
          message.contains('already ended') ||
          message.contains('no active call')) {
        if (!mounted) return;
        setState(() {
          _status = 'Ended';
        });
        return;
      }
      Get.snackbar(
        'End call failed',
        e.toString(),
        snackPosition: SnackPosition.BOTTOM,
      );
    } finally {
      if (mounted) {
        setState(() {
          _isEnding = false;
        });
      }
    }
  }

  void _openVirtualNumber() {
    Get.off(() => const VirtualNumberScreen());
  }

  void _openDialpad() {
    Get.to(
      () => OutboundCallScreen(
        backendHint:
            (_voiceSession?['backend'] ?? widget.callData['backend'] ?? 'voice')
                .toString(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    AppColors.applyTheme(Theme.of(context).brightness == Brightness.dark);

    return SafeArea(
      child: Scaffold(
        backgroundColor: AppColors.scaffoldbackgroudColor,
        appBar: AppBar(title: const Text('Incoming Call').tr()),
        body: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(22),
                  gradient: LinearGradient(
                    colors: [
                      AppColors.primaryColor.withOpacity(0.18),
                      Colors.green.withOpacity(0.14),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  border: Border.all(color: AppColors.appBorder),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _callerName,
                      style: Theme.of(context).textTheme.headlineSmall
                          ?.copyWith(
                            fontWeight: FontWeight.normal,
                            color: AppColors.appTextPrimary,
                          ),
                    ),
                    SizedBox(height: 1.h),
                    Text(
                      'DID: $_didNumber',
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: AppColors.appTextSecondary,
                      ),
                    ),
                    SizedBox(height: 0.8.h),
                    Text(
                      'Backend: eROAMING',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.appTextSecondary,
                      ),
                    ),
                    SizedBox(height: 1.6.h),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: _status == 'active' || _status == 'Accepted'
                            ? Colors.green.withOpacity(0.15)
                            : _status == 'declined' ||
                                  _status == 'Declined' ||
                                  _status == 'Failed'
                            ? Colors.red.withOpacity(0.15)
                            : Colors.orange.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(100),
                      ),
                      child: Text(
                        _status,
                        style: TextStyle(
                          fontSize: 14.sp,
                          fontWeight: FontWeight.normal,
                          color: _status == 'active' || _status == 'Accepted'
                              ? Colors.green.shade700
                              : _status == 'declined' ||
                                    _status == 'Declined' ||
                                    _status == 'Failed'
                              ? Colors.red.shade700
                              : Colors.orange.shade800,
                        ),
                      ),
                    ),
                    if (_nativeState?['number'] != null &&
                        _nativeState!['number'].toString().isNotEmpty) ...[
                      SizedBox(height: 0.8.h),
                      Text(
                        'Connected Number: ${_nativeState!['number']}',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppColors.appTextSecondary,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              SizedBox(height: 3.h),
              Text(
                'Incoming call is ready. Accept connects the eRoaming voice session; Decline rejects the active invite.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.appTextSecondary,
                ),
              ).tr(),
              const Spacer(),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _isDeclining ? null : _declineCall,
                      icon: _isDeclining
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(Icons.call_end_rounded),
                      label:
                          (_isDeclining
                                  ? const Text('Declining...')
                                  : const Text('Decline'))
                              .tr(),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red.shade600,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                    ),
                  ),
                  SizedBox(width: 3.w),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _isAccepting ? null : _acceptCall,
                      icon: _isAccepting
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(Icons.call_rounded),
                      label:
                          (_isAccepting
                                  ? const Text('Connecting...')
                                  : const Text('Accept'))
                              .tr(),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green.shade600,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              SizedBox(height: 1.5.h),
              if (_status == 'active' || _status == 'Accepted') ...[
                OutlinedButton.icon(
                  onPressed: _isEnding ? null : _endCall,
                  icon: _isEnding
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.call_end_rounded),
                  label:
                      (_isEnding
                              ? const Text('Ending...')
                              : const Text('End Call'))
                          .tr(),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                ),
                SizedBox(height: 1.5.h),
              ],
              OutlinedButton.icon(
                onPressed: _openDialpad,
                icon: const Icon(Icons.dialpad_rounded),
                label: const Text('Open Dialpad').tr(),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
              ),
              SizedBox(height: 1.5.h),
              OutlinedButton(
                onPressed: _openVirtualNumber,
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: const Text('Open eRoaming Number').tr(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
