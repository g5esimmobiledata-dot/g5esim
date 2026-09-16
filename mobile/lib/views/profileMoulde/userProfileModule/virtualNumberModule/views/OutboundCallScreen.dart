import 'dart:async';

import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import 'package:esimconnect/utills/services/UserModuleAccessService.dart';
import 'package:esimconnect/utills/services/VoiceBridgeService.dart';
import 'package:esimconnect/utills/global.dart' as global;
import 'package:esimconnect/views/homeModule/getUsageModule/views/walletTopUpSheet.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/virtualNumberModule/services/CallHistoryStore.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/virtualNumberModule/views/CallHistoryScreen.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:get/get.dart';
import 'package:sizer/sizer.dart';

class OutboundCallScreen extends StatefulWidget {
  final String backendHint;
  final Map<String, dynamic>? initialVoiceSession;
  final bool showAppBar;
  final String? initialNumber;
  final bool autoStart;

  const OutboundCallScreen({
    super.key,
    this.backendHint = 'voice',
    this.initialVoiceSession,
    this.showAppBar = true,
    this.initialNumber,
    this.autoStart = false,
  });

  @override
  State<OutboundCallScreen> createState() => _OutboundCallScreenState();
}

class _OutboundCallScreenState extends State<OutboundCallScreen> {
  final ApiService _apiService = ApiService();
  final VoiceBridgeService _voiceBridge = VoiceBridgeService();
  final CallHistoryStore _callHistoryStore = CallHistoryStore();
  final UserModuleAccessService _moduleAccess = Get.put(
    UserModuleAccessService(),
    permanent: true,
  );
  final TextEditingController _numberController = TextEditingController();
  bool _isCalling = false;
  bool _isEnding = false;
  bool _isSpeakerOn = false;
  bool _isTogglingSpeaker = false;
  bool _isMuted = false;
  bool _isTogglingMute = false;
  bool _isRecording = false;
  bool _isTogglingRecording = false;
  bool _callSessionLocked = false;
  bool _hasInitializedVoiceSession = false;
  String _status = 'Idle';
  String? _activeHistoryEntryId;
  Map<String, dynamic>? _voiceSession;
  Map<String, dynamic>? _rateQuote;
  Timer? _callStateTimer;
  Timer? _rateQuoteDebounce;
  bool _isLoadingRateQuote = false;
  String? _rateQuoteRequestKey;

  static const List<String> _conferenceModuleKeys = [
    'conference_call',
    'conference',
    'module_conference_call',
    'module_conference',
  ];

  static const List<String> _recordingModuleKeys = [
    'call_recording',
    'recording',
    'module_call_recording',
    'module_recording',
  ];

  static const List<String> _recordingPaymentKeys = [
    'call_recording_requires_payment',
    'recording_requires_payment',
    'module_call_recording_requires_payment',
    'module_recording_requires_payment',
    'call_recording_paid',
  ];

  bool get _shouldShowRateQuotePanel {
    final hasNumber = _numberController.text.trim().isNotEmpty;
    return hasNumber && (_isLoadingRateQuote || _rateQuote != null);
  }

  bool get _conferenceEnabled =>
      _moduleAccess.enabledAny(_conferenceModuleKeys, fallback: false);

  bool get _recordingEnabled =>
      _moduleAccess.enabledAny(_recordingModuleKeys, fallback: false);

  bool get _recordingRequiresPayment =>
      _moduleAccess.enabledAny(_recordingPaymentKeys, fallback: false);

  @override
  void initState() {
    super.initState();
    final initialSession = widget.initialVoiceSession;
    if (initialSession != null) {
      _voiceSession = Map<String, dynamic>.from(initialSession);
    }
    final initialNumber = widget.initialNumber?.trim();
    if (initialNumber != null && initialNumber.isNotEmpty) {
      _numberController.text = initialNumber;
    }
    _numberController.addListener(_scheduleRateQuoteRefresh);
    if (_numberController.text.trim().isNotEmpty) {
      _scheduleRateQuoteRefresh();
    }
    _moduleAccess.load().then((_) {
      if (mounted) setState(() {});
      if (widget.autoStart && mounted) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) unawaited(_startCall());
        });
      }
    });
  }

  @override
  void dispose() {
    _callStateTimer?.cancel();
    _rateQuoteDebounce?.cancel();
    _numberController.removeListener(_scheduleRateQuoteRefresh);
    _numberController.dispose();
    super.dispose();
  }

  Future<Map<String, dynamic>> _ensureVoiceSession({
    String? referenceNumber,
    bool forceRefresh = false,
  }) async {
    if (_voiceSession != null && !forceRefresh) {
      if (!kIsWeb &&
          !_isSipSession(_voiceSession!) &&
          !_hasInitializedVoiceSession) {
        await _voiceBridge.initializeSession(
          await _withPushToken(_voiceSession!),
        );
        _hasInitializedVoiceSession = true;
      }
      return _voiceSession!;
    }

    final requestData = <String, dynamic>{'direction': 'outbound'};
    if (referenceNumber != null) {
      requestData['referenceNumber'] = referenceNumber;
    }

    final response = await _apiService.post('voice/session', data: requestData);
    final data = response is Map<String, dynamic>
        ? (response['data'] as Map<String, dynamic>? ?? <String, dynamic>{})
        : <String, dynamic>{};

    if (!kIsWeb && !_isSipSession(data)) {
      await _voiceBridge.initializeSession(await _withPushToken(data));
      _hasInitializedVoiceSession = true;
    }

    if (!mounted) return data;
    setState(() {
      _voiceSession = data;
    });
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
      // Calling can still work in the foreground if FCM token retrieval fails.
    }
    return data;
  }

  void _scheduleRateQuoteRefresh() {
    _rateQuoteDebounce?.cancel();
    final rawNumber = _numberController.text.trim();
    if (rawNumber.isEmpty || !_canRequestRateQuote(rawNumber)) {
      if (_rateQuote != null || _isLoadingRateQuote) {
        setState(() {
          _rateQuote = null;
          _isLoadingRateQuote = false;
          _rateQuoteRequestKey = null;
        });
      }
      return;
    }

    _rateQuoteDebounce = Timer(const Duration(milliseconds: 450), () {
      unawaited(_loadRateQuote(rawNumber));
    });
  }

  Future<Map<String, dynamic>?> _loadRateQuote(String rawNumber) async {
    final requestKey = rawNumber.trim();
    if (requestKey.isEmpty || !_canRequestRateQuote(requestKey)) return null;

    _rateQuoteRequestKey = requestKey;
    if (mounted) {
      setState(() {
        _isLoadingRateQuote = true;
      });
    }

    try {
      final response = await _apiService.post(
        'voice/rate-quote',
        data: <String, dynamic>{'destination': requestKey},
      );
      final data = response is Map<String, dynamic>
          ? (response['data'] as Map<String, dynamic>? ?? <String, dynamic>{})
          : <String, dynamic>{};

      if (!mounted || _rateQuoteRequestKey != requestKey) return data;
      setState(() {
        _rateQuote = data;
        _isLoadingRateQuote = false;
      });
      return data;
    } catch (_) {
      if (mounted && _rateQuoteRequestKey == requestKey) {
        setState(() {
          _isLoadingRateQuote = false;
          _rateQuote = null;
        });
      }
      return null;
    }
  }

  Future<Map<String, dynamic>?> _ensureRateQuote(String rawNumber) async {
    final requestKey = rawNumber.trim();
    if (requestKey.isEmpty || !_canRequestRateQuote(requestKey)) return null;
    final currentDestination = (_rateQuote?['destination'] ?? '').toString();
    if (_rateQuote != null && currentDestination == requestKey) {
      return _rateQuote;
    }
    return _loadRateQuote(requestKey);
  }

  bool _quoteAllowsCall(Map<String, dynamic>? quote) {
    if (quote == null) return true;
    return quote['canCall'] != false;
  }

  String _quoteBlockMessage(Map<String, dynamic>? quote) {
    final message = (quote?['message'] ?? '').toString().trim();
    if (message.isNotEmpty) return message;
    return 'This call is not available for this account.';
  }

  void _showDialWarning(String title, String message) {
    Get.closeCurrentSnackbar();
    Get.snackbar(
      title,
      message,
      snackPosition: SnackPosition.TOP,
      margin: const EdgeInsets.fromLTRB(14, 12, 14, 0),
      duration: const Duration(seconds: 3),
    );
  }

  bool _shouldRefreshVoiceSession(String callType) {
    final session = _voiceSession;
    if (session == null) return false;

    final sessionCallType =
        (session['callType'] ??
                (session['rateQuote'] is Map
                    ? (session['rateQuote'] as Map)['callType']
                    : null) ??
                '')
            .toString()
            .trim()
            .toLowerCase();

    if (sessionCallType.isEmpty) {
      return callType == 'international';
    }
    return sessionCallType != callType;
  }

  Future<void> _startCall() async {
    if (_hasLiveCall) {
      _showDialWarning(
        'Call already active',
        'End the current call before starting another one.',
      );
      return;
    }

    final rawNumber = _numberController.text.trim();
    if (rawNumber.isEmpty) {
      _showDialWarning('Number required', 'Enter a number first.');
      return;
    }

    final isInternationalCall = _isInternationalDialInput(rawNumber);
    final normalizedInternational = _normalizeInternationalNumber(rawNumber);
    final internalDestination = isInternationalCall
        ? null
        : _normalizeSipDestination(rawNumber);
    final isInternalCall = !isInternationalCall && internalDestination != null;

    if (!isInternalCall && !isInternationalCall) {
      _showDialWarning('Invalid number', 'Check the number and try again.');
      return;
    }

    if (isInternalCall) {
      if (!_moduleAccess.enabled('allow_internal_calls')) {
        _showDialWarning(
          'Calls disabled',
          'Internal calls are not enabled for this account.',
        );
        return;
      }
    } else {
      if (!_moduleAccess.enabled('allow_international_calls')) {
        _showDialWarning(
          'Calls disabled',
          'International calls are not enabled for this account.',
        );
        return;
      }

      if (normalizedInternational == null) {
        _showDialWarning(
          'International format required',
          'Use a full number with country code, for example +961XXXXXXXX.',
        );
        return;
      }
    }

    final quote = await _ensureRateQuote(rawNumber);
    if (!_quoteAllowsCall(quote)) {
      _showDialWarning(
        quote?['requiresDid'] == true ? 'DID required' : 'Call unavailable',
        _quoteBlockMessage(quote),
      );
      return;
    }

    setState(() {
      _isCalling = true;
      _callSessionLocked = true;
      _status = 'Connecting';
    });

    String? attemptedTarget;
    var attemptedInternal = false;

    try {
      final callReference = isInternalCall
          ? internalDestination
          : normalizedInternational!;
      attemptedTarget = callReference;
      attemptedInternal = isInternalCall;
      final desiredCallType = isInternalCall ? 'internal' : 'international';
      final session = await _ensureVoiceSession(
        referenceNumber: callReference,
        forceRefresh: _shouldRefreshVoiceSession(desiredCallType),
      );
      final isSipCall = _isSipSession(session);

      if (isInternalCall && !isSipCall) {
        throw const VoiceBridgeUnavailableException(
          'Internal eRoaming calls require a SIP voice session.',
        );
      }

      if (kIsWeb && !isSipCall) {
        throw const VoiceBridgeUnavailableException(
          'Browser calling is available for SIP WebRTC sessions only. This account returned a non-SIP voice session.',
        );
      }

      final Map<String, dynamic> result;
      if (isSipCall) {
        final sipDialTarget = isInternalCall
            ? callReference
            : _sipInternationalDestination(callReference);
        final destinationUri = _buildSipDestinationUri(sipDialTarget, session);
        result = await _voiceBridge.startSipCall(
          destinationUri: destinationUri,
          account: _sipAccountFromSession(session),
        );
      } else {
        result = await _voiceBridge.startOutboundCall(
          number: callReference,
          metadata: <String, dynamic>{
            'backend': session['backend'],
            ...?(quote == null ? null : <String, dynamic>{'rateQuote': quote}),
          },
        );
      }

      if (!mounted) return;
      final state = (result['state'] ?? 'dialing').toString();
      final speakerOn = _speakerphoneStateFrom(result) ?? _isSpeakerOn;
      await _recordCallHistoryStarted(
        number: callReference,
        status: state,
        isInternal: isSipCall,
        callId: _callIdFrom(result),
      );
      setState(() {
        _status = _displayCallState(state);
        _isSpeakerOn = speakerOn;
      });
      _startCallStateWatcher();
      Get.snackbar(
        _callSuccessTitle(state),
        _callSuccessMessage(state, callReference),
        snackPosition: SnackPosition.BOTTOM,
      );
    } catch (e) {
      if (!mounted) return;
      final message = _friendlyCallError(e);
      await _recordCallHistoryFailed(
        number: attemptedTarget ?? rawNumber,
        isInternal: attemptedInternal,
        errorMessage: message,
      );
      setState(() {
        _status = message.contains('Android or iOS')
            ? 'Native app required'
            : 'Failed';
        _callSessionLocked = false;
      });
      _showDialWarning('Call failed', message);
    } finally {
      if (mounted) {
        setState(() {
          _isCalling = false;
        });
      }
    }
  }

  String _displayCallState(String state) {
    final value = state.trim();
    if (value.isEmpty) return 'Dialing';

    switch (value.toLowerCase()) {
      case 'dialing':
      case 'calling':
      case 'connecting':
      case 'connected':
      case 'registered':
      case 'registering':
      case 'session_ready':
        return 'Dialing';
      case 'progress':
      case 'early':
        return 'Calling';
      case 'ringing':
        return 'Ringing';
      case 'accepted':
      case 'confirmed':
      case 'stream':
      case 'active':
        return 'Active';
      case 'hold':
        return 'On Hold';
      case 'registration_failed':
        return 'Failed';
      default:
        return '${value[0].toUpperCase()}${value.substring(1)}';
    }
  }

  void _startCallStateWatcher() {
    _callStateTimer?.cancel();
    _callStateTimer = Timer.periodic(const Duration(seconds: 1), (_) async {
      try {
        final result = await _voiceBridge.getCallState();
        if (!mounted) return;

        final state = (result['state'] ?? '').toString().trim();
        final normalized = state.toLowerCase();
        final transientWebDisconnect =
            kIsWeb && normalized == 'disconnected' && _hasLiveCall;
        final speakerOn = _speakerphoneStateFrom(result);
        final muted = _microphoneMutedStateFrom(result);
        if ((state.isNotEmpty && !transientWebDisconnect) ||
            speakerOn != null ||
            muted != null) {
          setState(() {
            if (state.isNotEmpty && !transientWebDisconnect) {
              _status = _displayCallState(state);
            }
            if (speakerOn != null) {
              _isSpeakerOn = speakerOn;
            }
            if (muted != null) {
              _isMuted = muted;
            }
          });
        }

        if (!transientWebDisconnect &&
            (normalized == 'ended' ||
                normalized == 'failed' ||
                normalized == 'disconnected' ||
                normalized == 'registration_failed' ||
                normalized == 'declined')) {
          unawaited(_finishActiveHistory(status: normalized));
          setState(() {
            _callSessionLocked = false;
            _isSpeakerOn = false;
            _isMuted = false;
            _isRecording = false;
          });
          _callStateTimer?.cancel();
        }
      } catch (_) {
        // Keep the call screen stable if one native status poll fails.
      }
    });
  }

  String _callSuccessTitle(String state) {
    final normalized = state.toLowerCase();
    if (normalized == 'active') return 'Call active';
    if (normalized == 'ringing') return 'Ringing';
    if (normalized == 'dialing' ||
        normalized == 'calling' ||
        normalized == 'progress' ||
        normalized == 'early' ||
        normalized == 'registering' ||
        normalized == 'connecting' ||
        normalized == 'session_ready') {
      return 'Dialing';
    }
    return 'Call status';
  }

  String _callSuccessMessage(String state, String number) {
    final normalized = state.toLowerCase();
    if (normalized == 'active') {
      return 'Your eRoaming call is connected.';
    }
    if (normalized == 'ringing') {
      return 'Ringing $number...';
    }
    if (normalized == 'dialing' ||
        normalized == 'calling' ||
        normalized == 'progress' ||
        normalized == 'early' ||
        normalized == 'registering' ||
        normalized == 'connecting' ||
        normalized == 'session_ready') {
      return 'Calling $number through eRoaming...';
    }
    return 'eRoaming returned state: $state';
  }

  String _displayBackendName() => 'eROAMING';

  String _friendlyCallError(Object error) {
    if (error is VoiceBridgeUnavailableException) {
      return error.message;
    }
    if (error is MissingPluginException) {
      return 'Voice engine is not loaded in this app run. Stop the app fully and run a fresh Android/iOS build.';
    }
    final text = error.toString();
    if (text.contains('MissingPluginException') ||
        text.contains('No implementation found for method')) {
      return 'Voice engine is not loaded in this app run. Stop the app fully and run a fresh Android/iOS build.';
    }
    return error.toString();
  }

  bool _isAlreadyEndedError(Object error) {
    final message = error.toString().toLowerCase();
    return message.contains('null check operator used on a null value') ||
        message.contains('terminated') ||
        message.contains('already ended') ||
        message.contains('no active call');
  }

  Future<void> _endCall() async {
    setState(() {
      _isEnding = true;
    });

    try {
      final result = await _voiceBridge.endCurrentCall();
      _callStateTimer?.cancel();
      if (!mounted) return;
      await _finishActiveHistory(
        status: (result['state'] ?? 'ended').toString(),
        callId: _callIdFrom(result),
      );
      setState(() {
        _status = (result['state'] ?? 'Ended').toString();
        _isSpeakerOn = _speakerphoneStateFrom(result) ?? false;
        _isMuted = _microphoneMutedStateFrom(result) ?? false;
        _isRecording = false;
        _callSessionLocked = false;
      });
    } catch (e) {
      if (_isAlreadyEndedError(e)) {
        _callStateTimer?.cancel();
        if (!mounted) return;
        await _finishActiveHistory(status: 'ended');
        setState(() {
          _status = 'Ended';
          _isSpeakerOn = false;
          _isMuted = false;
          _isRecording = false;
          _callSessionLocked = false;
        });
        return;
      }
      Get.snackbar(
        'End call failed',
        _friendlyCallError(e),
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

  Future<void> _recordCallHistoryStarted({
    required String number,
    required String status,
    required bool isInternal,
    String? callId,
  }) async {
    final entry = await _callHistoryStore.add(
      number: number,
      status: _normalizeHistoryStatus(status),
      isInternal: isInternal,
      callId: callId,
    );
    _activeHistoryEntryId = entry.id;
  }

  Future<void> _recordCallHistoryFailed({
    required String number,
    required bool isInternal,
    required String errorMessage,
  }) async {
    await _callHistoryStore.add(
      number: number,
      status: 'failed',
      isInternal: isInternal,
      errorMessage: errorMessage,
    );
  }

  Future<void> _finishActiveHistory({
    required String status,
    String? callId,
  }) async {
    final historyId = _activeHistoryEntryId;
    if (historyId == null) return;
    await _callHistoryStore.update(
      historyId,
      status: _normalizeHistoryStatus(status),
      endedAt: DateTime.now(),
      callId: callId,
    );
    _activeHistoryEntryId = null;
  }

  String _normalizeHistoryStatus(String status) {
    final normalized = status.trim().toLowerCase();
    if (normalized == 'released' || normalized == 'end') return 'ended';
    if (normalized.isEmpty) return 'dialing';
    return normalized;
  }

  String? _callIdFrom(Map<String, dynamic> result) {
    final value =
        result['callId'] ?? result['call_id'] ?? result['id'] ?? result['uuid'];
    final text = value?.toString().trim();
    return text == null || text.isEmpty ? null : text;
  }

  Future<void> _openCallHistory() async {
    final selectedNumber = await Get.to<String>(
      () => const CallHistoryScreen(),
    );
    if (selectedNumber == null || selectedNumber.trim().isEmpty) return;
    setState(() {
      _numberController.text = selectedNumber.trim();
    });
  }

  Future<void> _toggleSpeaker() async {
    if (!_canToggleSpeaker) return;

    final nextValue = !_isSpeakerOn;
    setState(() {
      _isTogglingSpeaker = true;
    });

    try {
      final result = await _voiceBridge.setSpeakerphoneEnabled(nextValue);
      if (!mounted) return;
      if (result['speakerSupported'] == false) {
        Get.snackbar(
          'Speaker controlled by browser',
          (result['message'] ??
                  'Use the device audio route controls for speaker output.')
              .toString(),
          snackPosition: SnackPosition.BOTTOM,
        );
      }
      setState(() {
        _isSpeakerOn = _speakerphoneStateFrom(result) ?? false;
      });
    } catch (e) {
      if (!mounted) return;
      final message = _friendlyCallError(e);
      Get.snackbar(
        message.contains('Voice engine is not loaded')
            ? 'Native rebuild required'
            : 'Speaker failed',
        message,
        snackPosition: SnackPosition.BOTTOM,
      );
    } finally {
      if (mounted) {
        setState(() {
          _isTogglingSpeaker = false;
        });
      }
    }
  }

  Future<void> _toggleMute() async {
    if (!_canToggleMute) return;

    final nextValue = !_isMuted;
    setState(() {
      _isTogglingMute = true;
    });

    try {
      final result = await _voiceBridge.setMicrophoneMuted(nextValue);
      if (!mounted) return;
      setState(() {
        _isMuted = _microphoneMutedStateFrom(result) ?? nextValue;
      });
    } catch (e) {
      if (!mounted) return;
      Get.snackbar(
        'Mute failed',
        _friendlyCallError(e),
        snackPosition: SnackPosition.BOTTOM,
      );
    } finally {
      if (mounted) {
        setState(() {
          _isTogglingMute = false;
        });
      }
    }
  }

  void _handleAddCall() {
    if (!_conferenceEnabled) return;
    Get.snackbar(
      'Conference',
      'Add call is enabled for this account. Entering a second line will be connected in the conference flow.',
      snackPosition: SnackPosition.BOTTOM,
    );
  }

  Future<void> _handleRecordingAction() async {
    if (!_recordingEnabled || _isTogglingRecording) return;

    if (_recordingRequiresPayment && !_isRecording) {
      Get.to(
        () => WalletTopUpPage(
          symbol: global.activeCurrencysymbol ?? r'$',
          onWalletChanged: () => unawaited(_moduleAccess.load(force: true)),
        ),
      );
      return;
    }

    setState(() {
      _isTogglingRecording = true;
    });

    try {
      await Future<void>.delayed(const Duration(milliseconds: 180));
      if (!mounted) return;
      setState(() {
        _isRecording = !_isRecording;
      });
      Get.snackbar(
        _isRecording ? 'Recording started' : 'Recording stopped',
        _isRecording
            ? 'Call recording is active for this call.'
            : 'Call recording is off.',
        snackPosition: SnackPosition.BOTTOM,
      );
    } finally {
      if (mounted) {
        setState(() {
          _isTogglingRecording = false;
        });
      }
    }
  }

  bool get _canToggleSpeaker {
    if (_isTogglingSpeaker) return false;
    final state = _status.trim().toLowerCase();
    return state == 'active' ||
        state == 'ringing' ||
        state == 'dialing' ||
        state == 'calling' ||
        state == 'connecting' ||
        state == 'registering' ||
        state == 'session_ready';
  }

  bool get _canToggleMute {
    if (_isTogglingMute) return false;
    return _canToggleSpeaker;
  }

  bool get _hasLiveCall {
    if (_callSessionLocked || _isCalling || _isEnding) return true;

    final state = _status.trim().toLowerCase();
    if (_activeHistoryEntryId != null && !_isTerminalCallState(state)) {
      return true;
    }

    return state == 'active' ||
        state == 'ringing' ||
        state == 'dialing' ||
        state == 'calling' ||
        state == 'connecting' ||
        state == 'registered' ||
        state == 'hold' ||
        state == 'session_ready';
  }

  bool _isTerminalCallState(String state) {
    return state.isEmpty ||
        state == 'idle' ||
        state == 'ready' ||
        state == 'ended' ||
        state == 'end' ||
        state == 'released' ||
        state == 'failed' ||
        state == 'disconnected' ||
        state == 'registration_failed' ||
        state == 'declined' ||
        state == 'native app required';
  }

  bool? _speakerphoneStateFrom(Map<String, dynamic> result) {
    final value =
        result['speakerphoneOn'] ??
        result['speakerOn'] ??
        result['isSpeakerOn'] ??
        result['speakerEnabled'];
    if (value is bool) return value;
    if (value is String) {
      final normalized = value.trim().toLowerCase();
      if (normalized == 'true' || normalized == '1' || normalized == 'on') {
        return true;
      }
      if (normalized == 'false' || normalized == '0' || normalized == 'off') {
        return false;
      }
    }
    return null;
  }

  bool? _microphoneMutedStateFrom(Map<String, dynamic> result) {
    final value =
        result['microphoneMuted'] ??
        result['muted'] ??
        result['isMuted'] ??
        result['microphoneMute'];
    if (value is bool) return value;
    if (value is String) {
      final normalized = value.trim().toLowerCase();
      if (normalized == 'true' || normalized == '1' || normalized == 'on') {
        return true;
      }
      if (normalized == 'false' || normalized == '0' || normalized == 'off') {
        return false;
      }
    }
    return null;
  }

  void _appendDigit(String value) {
    unawaited(_playDialTone(value));
    setState(() {
      final current = _numberController.text;
      if (value == '+') {
        if (current.startsWith('+')) return;
        _numberController.text = '+$current';
        return;
      }
      _numberController.text = '$current$value';
    });
  }

  Future<void> _playDialTone(String value) async {
    try {
      await _voiceBridge.playDialTone(value);
    } catch (_) {
      try {
        await SystemSound.play(SystemSoundType.click);
      } catch (_) {
        // Dial input should never fail because a short keypad tone could not play.
      }
    }
  }

  String? _normalizeInternationalNumber(String value) {
    final compact = value.replaceAll(RegExp(r'[\s().-]'), '');
    final normalized = compact.startsWith('00')
        ? '+${compact.substring(2)}'
        : compact.startsWith('+')
        ? compact
        : RegExp(r'^[1-9]\d{9,14}$').hasMatch(compact)
        ? '+$compact'
        : compact;
    if (RegExp(r'^\+[1-9]\d{7,14}$').hasMatch(normalized)) {
      return normalized;
    }
    return null;
  }

  bool _isInternationalDialInput(String value) {
    final compact = value.trim().replaceAll(RegExp(r'[\s().-]'), '');
    return compact.startsWith('+') ||
        compact.startsWith('00') ||
        RegExp(r'^[1-9]\d{9,14}$').hasMatch(compact);
  }

  String _sipInternationalDestination(String value) {
    final compact = value.trim().replaceAll(RegExp(r'[\s().-]'), '');
    if (compact.startsWith('+')) return compact.substring(1);
    if (compact.startsWith('00')) return compact.substring(2);
    return compact;
  }

  bool _isInternalDialInput(String value) {
    final trimmed = value.trim();
    if (trimmed.toLowerCase().startsWith('sip:') ||
        trimmed.toLowerCase().startsWith('sips:')) {
      return true;
    }

    final compact = trimmed.replaceAll(RegExp(r'[\s().-]'), '');
    return RegExp(r'^91\d{4,6}$').hasMatch(compact) ||
        RegExp(r'^10\d{4,13}$').hasMatch(compact) ||
        RegExp(r'^\*[0-9]{2,6}$').hasMatch(compact);
  }

  bool _canRequestRateQuote(String value) {
    return _isInternalDialInput(value) ||
        _normalizeInternationalNumber(value) != null;
  }

  bool _isSipSession(Map<String, dynamic>? session) {
    if (session == null) return false;
    final backend = (session['backend'] ?? '').toString().toLowerCase();
    return backend == 'linphone' ||
        backend == 'sip' ||
        backend.contains('sip') ||
        session.containsKey('sipDomain') ||
        session.containsKey('sipPassword');
  }

  String? _normalizeSipDestination(
    String value, {
    bool allowLeadingPlus = false,
  }) {
    final trimmed = value.trim();
    if (trimmed.toLowerCase().startsWith('sip:') ||
        trimmed.toLowerCase().startsWith('sips:')) {
      return trimmed;
    }

    final compact = trimmed.replaceAll(RegExp(r'[\s().-]'), '');
    final extension = allowLeadingPlus && compact.startsWith('+')
        ? compact.substring(1)
        : compact;
    if (RegExp(r'^91\d{4,6}$').hasMatch(extension) ||
        RegExp(r'^10\d{4,13}$').hasMatch(extension) ||
        RegExp(r'^\*[0-9]{2,6}$').hasMatch(extension)) {
      return extension;
    }
    return null;
  }

  String _buildSipDestinationUri(
    String destination,
    Map<String, dynamic> session,
  ) {
    final trimmed = destination.trim();
    if (trimmed.toLowerCase().startsWith('sip:') ||
        trimmed.toLowerCase().startsWith('sips:')) {
      return trimmed;
    }

    final compact = trimmed.replaceAll(RegExp(r'[\s().-]'), '');
    final domain =
        (session['sipDomain'] ??
                session['domain'] ??
                _voiceSession?['sipDomain'] ??
                _voiceSession?['domain'] ??
                '')
            .toString()
            .trim();

    return domain.isEmpty ? 'sip:$compact' : 'sip:$compact@$domain';
  }

  Map<String, dynamic> _sipAccountFromSession(Map<String, dynamic> session) {
    final domain = (session['sipDomain'] ?? session['domain'] ?? '')
        .toString()
        .trim();
    return <String, dynamic>{
      'username': (session['username'] ?? '').toString(),
      'password': (session['sipPassword'] ?? session['password'] ?? '')
          .toString(),
      'domain': domain,
      'displayName': (session['callerId'] ?? session['displayName'] ?? '')
          .toString(),
      'callerId': (session['callerId'] ?? '').toString(),
      'transport': (session['sipTransport'] ?? 'udp').toString(),
      'port': (session['sipPort'] ?? '5060').toString(),
      'outboundProxy':
          (session['sipOutboundProxy'] ?? session['outboundProxy'] ?? '')
              .toString(),
      'sipWebSocketUrl':
          (session['sipWebSocketUrl'] ??
                  session['webSocketUrl'] ??
                  session['websocketUrl'] ??
                  session['wsUrl'] ??
                  '')
              .toString(),
    };
  }

  void _backspace() {
    final text = _numberController.text;
    if (text.isEmpty) return;
    setState(() {
      _numberController.text = text.substring(0, text.length - 1);
    });
  }

  Widget _dialKey(
    String value, {
    double? height,
    IconData? icon,
    VoidCallback? onTap,
  }) {
    return GestureDetector(
      onTap: onTap ?? () => _appendDigit(value),
      child: Container(
        height: height ?? 8.5.h,
        decoration: BoxDecoration(
          color: AppColors.scaffoldbackgroudColor,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.appBorder),
        ),
        child: Center(
          child: icon != null
              ? Icon(icon, color: AppColors.appTextPrimary, size: 28)
              : Text(
                  value,
                  style: TextStyle(
                    fontSize: 22.sp,
                    fontWeight: FontWeight.w700,
                    color: AppColors.appTextPrimary,
                  ),
                ),
        ),
      ),
    );
  }

  Widget _dialPad() {
    const keys = <List<String>>[
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['+', '0', '#'],
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        const rowSpacing = 8.0;
        final availableHeight = constraints.maxHeight - (rowSpacing * 3);
        final keyHeight = (availableHeight / 4).clamp(44.0, 82.0);

        return Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            for (final row in keys) ...[
              Row(
                children: [
                  for (final key in row) ...[
                    Expanded(child: _dialKey(key, height: keyHeight)),
                    if (key != row.last) const SizedBox(width: 12),
                  ],
                ],
              ),
              if (row != keys.last) const SizedBox(height: rowSpacing),
            ],
          ],
        );
      },
    );
  }

  double _quoteNumber(Map<String, dynamic> quote, String key) {
    final value = quote[key];
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '') ?? 0;
  }

  String _formatQuoteRate(Map<String, dynamic> quote) {
    final currency = (quote['currency'] ?? 'USD').toString();
    final rate = _quoteNumber(quote, 'ratePerMinute');
    final formatted = rate < 1
        ? rate.toStringAsFixed(4)
        : rate.toStringAsFixed(2);
    return '$currency $formatted/min';
  }

  String _formatAvailableMinutes(Map<String, dynamic> quote) {
    final minutes = quote['availableMinutes'];
    if (minutes == null) return '';
    final value = minutes is num
        ? minutes.toDouble()
        : double.tryParse(minutes.toString()) ?? 0;
    final formatted = value >= 100
        ? value.floor().toString()
        : value.toStringAsFixed(value == value.floorToDouble() ? 0 : 1);
    return '$formatted min available';
  }

  String _rateQuotePrimaryText(Map<String, dynamic> quote) {
    final message = (quote['message'] ?? '').toString().trim();
    if (quote['canCall'] == false || quote['unlimited'] == true) {
      return message.isNotEmpty ? message : 'Unlimited Internal Calls';
    }

    final minutes = _formatAvailableMinutes(quote);
    if (minutes.isEmpty) return _formatQuoteRate(quote);
    return '${_formatQuoteRate(quote)} - $minutes';
  }

  String _rateQuoteSecondaryText(Map<String, dynamic> quote) {
    final type = (quote['callType'] ?? '').toString();
    final did = (quote['didNumber'] ?? '').toString().trim();
    if (type == 'international' && did.isNotEmpty) {
      return 'Caller ID: $did';
    }
    if (type == 'internal') {
      return 'eSIM internal rate';
    }
    return 'eSIM international rate';
  }

  Widget _rateQuotePanel() {
    if (_numberController.text.trim().isEmpty) {
      return const SizedBox.shrink();
    }

    final quote = _rateQuote;
    if (_isLoadingRateQuote && quote == null) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: AppColors.scaffoldbackgroudColor,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.appBorder),
        ),
        child: Row(
          children: [
            SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: AppColors.primaryColor,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                tr('Checking eSIM rate...'),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.appTextSecondary,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      );
    }

    if (quote == null) return const SizedBox.shrink();

    final canCall = quote['canCall'] != false;
    final requiresDid = quote['requiresDid'] == true;
    final Color accent = canCall
        ? Colors.green.shade500
        : requiresDid
        ? Colors.orange.shade500
        : Colors.red.shade500;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: accent.withOpacity(0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: accent.withOpacity(0.45)),
      ),
      child: Row(
        children: [
          Icon(
            canCall
                ? Icons.paid_rounded
                : requiresDid
                ? Icons.sim_card_rounded
                : Icons.warning_amber_rounded,
            color: accent,
            size: 20,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  _rateQuotePrimaryText(quote),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.appTextPrimary,
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  _rateQuoteSecondaryText(quote),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.appTextSecondary,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInCallBody(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _inCallHeaderCard(context),
          SizedBox(height: 1.2.h),
          _inCallRateCard(context),
          SizedBox(height: 1.4.h),
          Expanded(
            child: GridView.count(
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.35,
              children: [
                _inCallActionTile(
                  context,
                  icon: _isMuted ? Icons.mic_off_rounded : Icons.mic_rounded,
                  title: _isMuted ? 'Unmute' : 'Mute',
                  active: _isMuted,
                  loading: _isTogglingMute,
                  onTap: _canToggleMute ? _toggleMute : null,
                ),
                _inCallActionTile(
                  context,
                  icon: _isSpeakerOn
                      ? Icons.volume_up_rounded
                      : Icons.volume_off_rounded,
                  title: _isSpeakerOn ? 'Loudspeaker On' : 'Loudspeaker',
                  active: _isSpeakerOn,
                  loading: _isTogglingSpeaker,
                  onTap: _canToggleSpeaker ? _toggleSpeaker : null,
                ),
                _inCallActionTile(
                  context,
                  icon: Icons.add_ic_call_rounded,
                  title: 'Add Call',
                  subtitle: _conferenceEnabled ? 'Conference' : 'Not active',
                  active: false,
                  onTap: _conferenceEnabled ? _handleAddCall : null,
                ),
                _inCallActionTile(
                  context,
                  icon: _isRecording
                      ? Icons.stop_circle_rounded
                      : Icons.fiber_manual_record_rounded,
                  title: _isRecording ? 'Stop Recording' : 'Record',
                  subtitle: _recordingEnabled
                      ? (_recordingRequiresPayment && !_isRecording
                            ? 'Paid add-on'
                            : 'Available')
                      : 'Not active',
                  active: _isRecording,
                  loading: _isTogglingRecording,
                  onTap: _recordingEnabled ? _handleRecordingAction : null,
                ),
              ],
            ),
          ),
          SizedBox(height: 1.2.h),
          ElevatedButton.icon(
            onPressed: _isEnding ? null : _endCall,
            icon: _isEnding
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.call_end_rounded, size: 24),
            label: Text(
              tr('End Call'),
              style: TextStyle(fontSize: 15.sp, fontWeight: FontWeight.w800),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red.shade600,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _inCallHeaderCard(BuildContext context) {
    final number = _numberController.text.trim();
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: LinearGradient(
          colors: [
            AppColors.primaryColor.withOpacity(0.20),
            Colors.cyan.withOpacity(0.14),
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
            _displayCallState(_status),
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: AppColors.primaryColor,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              number.isEmpty ? 'eRoaming Call' : number,
              maxLines: 1,
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                color: AppColors.appTextPrimary,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Backend: ${_displayBackendName()}',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: AppColors.appTextSecondary,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _inCallRateCard(BuildContext context) {
    final quote = _rateQuote;
    final title = quote == null
        ? 'Rate will appear after the number is verified'
        : _rateQuotePrimaryText(quote);
    final subtitle = quote == null
        ? 'eSIM rating source'
        : _rateQuoteSecondaryText(quote);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.scaffoldbackgroudColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.appBorder),
      ),
      child: Row(
        children: [
          Icon(Icons.payments_rounded, color: AppColors.primaryColor, size: 22),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.appTextPrimary,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  subtitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.appTextSecondary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _inCallActionTile(
    BuildContext context, {
    required IconData icon,
    required String title,
    String? subtitle,
    required bool active,
    bool loading = false,
    VoidCallback? onTap,
  }) {
    final enabled = onTap != null && !loading;
    final accent = active ? AppColors.primaryColor : AppColors.appTextPrimary;
    return Opacity(
      opacity: enabled || active ? 1 : 0.45,
      child: Material(
        color: active
            ? AppColors.primaryColor.withOpacity(0.14)
            : AppColors.scaffoldbackgroudColor,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: enabled ? onTap : null,
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: active
                    ? AppColors.primaryColor.withOpacity(0.55)
                    : AppColors.appBorder,
              ),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                loading
                    ? SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.primaryColor,
                        ),
                      )
                    : Icon(icon, color: accent, size: 28),
                const SizedBox(height: 8),
                Text(
                  title,
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.appTextPrimary,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.appTextSecondary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    AppColors.applyTheme(Theme.of(context).brightness == Brightness.dark);

    if (!_moduleAccess.enabled('module_dial_pad', fallback: false)) {
      return SafeArea(
        child: Scaffold(
          backgroundColor: AppColors.scaffoldbackgroudColor,
          appBar: widget.showAppBar
              ? AppBar(title: const Text('Outbound Call').tr())
              : null,
          body: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text(
                'Dial pad is not enabled for this account.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: AppColors.appTextSecondary,
                ),
              ).tr(),
            ),
          ),
        ),
      );
    }

    return SafeArea(
      child: Scaffold(
        backgroundColor: AppColors.scaffoldbackgroudColor,
        appBar: widget.showAppBar
            ? AppBar(title: const Text('Outbound Call').tr())
            : null,
        body: _hasLiveCall
            ? _buildInCallBody(context)
            : Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Container(
                      padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(20),
                        gradient: LinearGradient(
                          colors: [
                            AppColors.primaryColor.withOpacity(0.18),
                            Colors.cyan.withOpacity(0.14),
                          ],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        border: Border.all(color: AppColors.appBorder),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: FittedBox(
                                  fit: BoxFit.scaleDown,
                                  alignment: Alignment.centerLeft,
                                  child: Text(
                                    _numberController.text.isEmpty
                                        ? 'Enter Number'
                                        : _numberController.text,
                                    style: Theme.of(context)
                                        .textTheme
                                        .headlineSmall
                                        ?.copyWith(
                                          fontWeight: FontWeight.w700,
                                          fontSize: 23.sp,
                                          color: AppColors.appTextPrimary,
                                        ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              IconButton(
                                onPressed: _openCallHistory,
                                icon: const Icon(Icons.history_rounded),
                                color: AppColors.primaryColor,
                                tooltip: tr('Call History'),
                              ),
                            ],
                          ),
                          SizedBox(height: 0.6.h),
                          Text(
                            'Backend: ${_displayBackendName()}',
                            style: Theme.of(context).textTheme.bodyLarge
                                ?.copyWith(color: AppColors.appTextSecondary),
                          ),
                          SizedBox(height: 0.4.h),
                          Text(
                            'State: $_status',
                            style: Theme.of(context).textTheme.bodyMedium
                                ?.copyWith(color: AppColors.appTextSecondary),
                          ),
                        ],
                      ),
                    ),
                    if (_shouldShowRateQuotePanel) ...[
                      SizedBox(height: 0.8.h),
                      _rateQuotePanel(),
                      SizedBox(height: 0.8.h),
                    ] else
                      SizedBox(height: 1.h),
                    Expanded(child: _dialPad()),
                    SizedBox(height: 1.2.h),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: _hasLiveCall ? null : _startCall,
                            icon: _isCalling
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Icon(Icons.call_rounded, size: 24),
                            label: Text(
                              tr('Call'),
                              style: TextStyle(
                                fontSize: 15.sp,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.green.shade600,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 15),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                            ),
                          ),
                        ),
                        SizedBox(width: 3.w),
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: _hasLiveCall && !_isEnding
                                ? _endCall
                                : null,
                            icon: _isEnding
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Icon(Icons.call_end_rounded, size: 24),
                            label: Text(
                              tr('End'),
                              style: TextStyle(
                                fontSize: 15.sp,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.red.shade600,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 15),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        SizedBox(
                          width: 58,
                          height: 56,
                          child: OutlinedButton(
                            onPressed: _backspace,
                            style: OutlinedButton.styleFrom(
                              foregroundColor: AppColors.primaryColor,
                              side: BorderSide(color: AppColors.appBorder),
                              padding: EdgeInsets.zero,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                            ),
                            child: const Icon(
                              Icons.backspace_outlined,
                              size: 24,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}
