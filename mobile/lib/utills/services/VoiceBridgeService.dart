import 'dart:async';
import 'dart:math' as math;

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:sip_ua/sip_ua.dart';

import 'web_dtmf_tone_player_stub.dart'
    if (dart.library.html) 'web_dtmf_tone_player_web.dart';

class VoiceBridgeUnavailableException implements Exception {
  final String message;

  const VoiceBridgeUnavailableException(this.message);

  @override
  String toString() => message;
}

class VoiceBridgeService {
  static const MethodChannel _channel = MethodChannel('esimconnect/voice');
  static final StreamController<Map<String, dynamic>> _nativeEventController =
      StreamController<Map<String, dynamic>>.broadcast();
  static final SIPUAHelper _webSipHelper = SIPUAHelper();
  static final _WebSipEventBridge _webSipEvents = _WebSipEventBridge();
  static bool _nativeEventHandlerStarted = false;
  static bool _webSipListenerStarted = false;
  static String? _webSipAccountKey;
  static Completer<void>? _webSipRegistrationCompleter;
  static Call? _webActiveCall;
  static RTCVideoRenderer? _webRemoteAudioRenderer;
  static String _webCallState = 'idle';
  static String? _webCallError;
  static bool _webCallStartInProgress = false;
  static bool _webCallSessionActive = false;
  static bool _webHangupInProgress = false;
  static bool _webSpeakerphoneOn = false;
  static bool _webMicrophoneMuted = false;
  static final AudioPlayer _webTonePlayer = AudioPlayer();
  static final AudioPlayer _webRingbackPlayer = AudioPlayer();
  static final Map<String, Uint8List> _webToneCache = <String, Uint8List>{};
  static Uint8List? _webRingbackToneCache;
  static bool _webRingbackPlaying = false;

  static Stream<Map<String, dynamic>> get nativeEvents =>
      _nativeEventController.stream;

  static void startListeningForNativeEvents() {
    if (kIsWeb || _nativeEventHandlerStarted) return;

    _nativeEventHandlerStarted = true;
    _channel.setMethodCallHandler((MethodCall call) async {
      final event = _mapFromNativeArguments(call.arguments);
      event['event'] = call.method;
      _nativeEventController.add(event);
      return null;
    });
  }

  Future<Map<String, dynamic>> _invoke(
    String method, [
    Map<String, dynamic>? arguments,
  ]) async {
    if (kIsWeb) {
      throw const VoiceBridgeUnavailableException(
        'Live calling is available only in the Android or iOS app. The web preview can show the dialpad, but it can not open the native voice engine.',
      );
    }

    try {
      final result =
          await _channel.invokeMapMethod<String, dynamic>(method, arguments) ??
          <String, dynamic>{};
      return Map<String, dynamic>.from(result);
    } on MissingPluginException {
      throw const VoiceBridgeUnavailableException(
        'Voice engine is not loaded in this app run. Stop the app and run a full Android/iOS rebuild, not hot reload.',
      );
    }
  }

  Future<Map<String, dynamic>> initializeSession(
    Map<String, dynamic> session,
  ) async {
    if (kIsWeb) {
      return {'state': _webCallState, 'backend': session['backend']};
    }

    return _invoke('initializeSession', session);
  }

  Future<Map<String, dynamic>> acceptIncomingCall(
    Map<String, dynamic> callData,
  ) async {
    return _invoke('acceptIncomingCall', callData);
  }

  Future<Map<String, dynamic>> declineIncomingCall(
    Map<String, dynamic> callData,
  ) async {
    return _invoke('declineIncomingCall', callData);
  }

  Future<Map<String, dynamic>> processIncomingPush(
    Map<String, dynamic> callData,
  ) async {
    return _invoke('processIncomingPush', _withRawVonagePayload(callData));
  }

  Future<bool> isIncomingVoicePush(Map<String, dynamic> callData) async {
    if (kIsWeb) return false;

    try {
      return await _channel.invokeMethod<bool>(
            'isIncomingVoicePush',
            _withRawVonagePayload(callData),
          ) ??
          false;
    } on MissingPluginException {
      return false;
    } catch (_) {
      return false;
    }
  }

  Future<Map<String, dynamic>> registerPushToken(String pushToken) async {
    return _invoke('registerPushToken', <String, dynamic>{
      'pushToken': pushToken,
    });
  }

  Future<String?> getVoipToken() async {
    if (kIsWeb) return null;

    try {
      final token = await _channel.invokeMethod<String>('getVoipToken');
      return token?.trim().isNotEmpty == true ? token!.trim() : null;
    } on MissingPluginException {
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<Map<String, dynamic>> startOutboundCall({
    required String number,
    required Map<String, dynamic> metadata,
  }) async {
    return _invoke('startOutboundCall', <String, dynamic>{
      'number': number,
      ...metadata,
    });
  }

  Future<Map<String, dynamic>> startSipCall({
    required String destinationUri,
    required Map<String, dynamic> account,
  }) async {
    if (kIsWeb) {
      return _startWebSipCall(destinationUri: destinationUri, account: account);
    }

    return _invoke('startSipCall', <String, dynamic>{
      'destinationUri': destinationUri,
      'account': account,
    });
  }

  Future<Map<String, dynamic>> endCurrentCall() async {
    if (kIsWeb) {
      return _endWebSipCall();
    }

    return _invoke('endCurrentCall');
  }

  Future<Map<String, dynamic>> setSpeakerphoneEnabled(bool enabled) async {
    if (kIsWeb) {
      final supported = await _applyWebAudioOutputPreference(enabled);
      _webSpeakerphoneOn = supported && enabled;
      return {
        'state': _webCallState,
        'speakerphoneOn': _webSpeakerphoneOn,
        'speakerSupported': supported,
        if (!supported)
          'message':
              'Browser PWA audio output is controlled by the device audio route.',
      };
    }

    return _invoke('setSpeakerphoneEnabled', <String, dynamic>{
      'enabled': enabled,
    });
  }

  Future<Map<String, dynamic>> setMicrophoneMuted(bool muted) async {
    if (kIsWeb) {
      final call = _webActiveCall;
      if (call == null || !_webHasLiveCall) {
        throw const VoiceBridgeUnavailableException(
          'No active call is available to mute.',
        );
      }

      try {
        if (muted) {
          call.mute(true, false);
        } else {
          call.unmute(true, false);
        }
        _webMicrophoneMuted = muted;
        return {
          'state': _webCallState,
          'microphoneMuted': _webMicrophoneMuted,
          'speakerphoneOn': _webSpeakerphoneOn,
        };
      } catch (error) {
        throw VoiceBridgeUnavailableException(
          'Mute failed: ${error.toString()}',
        );
      }
    }

    return _invoke('setMicrophoneMuted', <String, dynamic>{'muted': muted});
  }

  Future<Map<String, dynamic>> playDialTone(String digit) async {
    if (kIsWeb) {
      final sentDtmf = _sendWebDtmf(digit);
      await _playWebDialTone(digit);
      return {'digit': digit, 'dtmfSent': sentDtmf};
    }

    return _invoke('playDialTone', <String, dynamic>{'digit': digit});
  }

  Future<Map<String, dynamic>> getCallState() async {
    if (kIsWeb) {
      return {
        'state': _webCallState,
        if (_webActiveCall?.id != null) 'callId': _webActiveCall!.id,
        if (_webCallError != null) 'error': _webCallError,
        'speakerphoneOn': _webSpeakerphoneOn,
        'speakerSupported': _webRemoteAudioRenderer != null,
        'microphoneMuted': _webMicrophoneMuted,
      };
    }

    return _invoke('getCallState');
  }

  Future<Map<String, dynamic>> _startWebSipCall({
    required String destinationUri,
    required Map<String, dynamic> account,
  }) async {
    if (_webCallStartInProgress || _webHasLiveCall) {
      throw const VoiceBridgeUnavailableException(
        'A call is already active. End the current call before starting another one.',
      );
    }

    final webSocketUrl = _firstNonEmpty([
      account['sipWebSocketUrl'],
      account['webSocketUrl'],
      account['websocketUrl'],
      account['wsUrl'],
      account['wssUrl'],
    ]);

    if (webSocketUrl == null) {
      final server = _firstNonEmpty([
        account['domain'],
        account['server'],
        account['registerServer'],
      ]);
      final transport = _firstNonEmpty([account['transport']]) ?? 'udp';
      final port =
          _firstNonEmpty([account['port'], account['registerPort']]) ?? '5060';
      throw VoiceBridgeUnavailableException(
        'Browser web calling needs a secure SIP WebSocket (WSS) endpoint. Current SIP server ${server ?? 'unknown'} is configured as ${transport.toUpperCase()} on port $port, which a browser cannot use.',
      );
    }

    _webCallStartInProgress = true;
    _webCallSessionActive = true;
    _webCallError = null;

    try {
      await _ensureWebSipRegistered(account, webSocketUrl);

      _webCallState = 'dialing';
      _webCallError = null;
      unawaited(_syncWebRingbackTone());
      final started = await _webSipHelper.call(destinationUri, voiceOnly: true);
      if (!started) {
        throw const VoiceBridgeUnavailableException(
          'Web SIP is not connected. Check the SIP WebSocket URL and account registration.',
        );
      }

      return {
        'state': _webCallState,
        'backend': 'sip-web',
        if (_webActiveCall?.id != null) 'callId': _webActiveCall!.id,
        'speakerphoneOn': _webSpeakerphoneOn,
        'microphoneMuted': _webMicrophoneMuted,
      };
    } catch (_) {
      _webCallSessionActive = false;
      _webActiveCall = null;
      unawaited(_stopWebRingbackTone());
      rethrow;
    } finally {
      _webCallStartInProgress = false;
    }
  }

  Future<Map<String, dynamic>> _endWebSipCall() async {
    if (_webHangupInProgress) {
      return {
        'state': 'ending',
        'backend': 'sip-web',
        'speakerphoneOn': _webSpeakerphoneOn,
      };
    }

    _webHangupInProgress = true;
    _webCallError = null;
    _webCallState = 'ending';
    unawaited(_stopWebRingbackTone());

    var terminateRequested = false;

    try {
      final call = _webActiveCall;
      if (call != null && !_isTerminalWebCallState(call.state)) {
        try {
          call.hangup();
          terminateRequested = true;
        } catch (error) {
          _rememberWebHangupError(error);
        }
      }

      try {
        _webSipHelper.terminateSessions(<String, dynamic>{});
        terminateRequested = true;
      } catch (error) {
        if (!terminateRequested) {
          _rememberWebHangupError(error);
        }
      }

      final ended = await _waitForWebCallEnd(const Duration(seconds: 2));
      if (!ended) {
        try {
          _webSipHelper.stop();
        } catch (_) {}
        await Future<void>.delayed(const Duration(milliseconds: 250));
      }

      await _disposeWebRemoteAudio();
      await _stopWebRingbackTone();
      _webActiveCall = null;
      _webCallSessionActive = false;
      _webCallState = 'ended';
      _webSipAccountKey = null;
      _webSipRegistrationCompleter = null;
      _webMicrophoneMuted = false;

      return {
        'state': 'ended',
        'backend': 'sip-web',
        'hangupSent': terminateRequested,
        'speakerphoneOn': false,
        'microphoneMuted': false,
      };
    } finally {
      _webHangupInProgress = false;
      _webSpeakerphoneOn = false;
      _webMicrophoneMuted = false;
    }
  }

  Future<void> _ensureWebSipRegistered(
    Map<String, dynamic> account,
    String webSocketUrl,
  ) async {
    if (!_webSipListenerStarted) {
      _webSipHelper.addSipUaHelperListener(_webSipEvents);
      _webSipListenerStarted = true;
    }

    final username = _firstNonEmpty([
      account['username'],
      account['authUsername'],
      account['authorizationUser'],
    ]);
    final password = _firstNonEmpty([
      account['password'],
      account['sipPassword'],
    ]);
    final domain = _firstNonEmpty([
      account['domain'],
      account['server'],
      account['registerServer'],
    ]);

    if (username == null || password == null || domain == null) {
      throw const VoiceBridgeUnavailableException(
        'SIP username, password, or domain is missing for web calling.',
      );
    }

    final accountKey = '$username@$domain|$webSocketUrl';
    if (_webSipAccountKey == accountKey && _webSipHelper.registered) {
      return;
    }

    if (_webSipHelper.connected || _webSipHelper.connecting) {
      _webSipHelper.stop();
      await Future<void>.delayed(const Duration(milliseconds: 250));
    }

    _webSipAccountKey = accountKey;
    _webCallState = 'registering';
    _webCallError = null;
    _webSipRegistrationCompleter = Completer<void>();

    final settings = UaSettings()
      ..transportType = TransportType.WS
      ..webSocketUrl = webSocketUrl
      ..uri = 'sip:$username@$domain'
      ..authorizationUser = username
      ..password = password
      ..displayName = _firstNonEmpty([account['displayName']]) ?? username
      ..host = domain
      ..registrarServer = 'sip:$domain'
      ..contact_uri = 'sip:$username@$domain;transport=ws'
      ..userAgent = 'G5 eSIM PWA'
      ..dtmfMode = DtmfMode.INFO;

    await _webSipHelper.start(settings);
    await _webSipRegistrationCompleter!.future.timeout(
      const Duration(seconds: 20),
      onTimeout: () {
        throw const VoiceBridgeUnavailableException(
          'Web SIP registration timed out. Check that the SIP WSS endpoint is reachable from Safari.',
        );
      },
    );
  }

  static Future<bool> _waitForWebCallEnd(Duration timeout) async {
    final deadline = DateTime.now().add(timeout);

    while (DateTime.now().isBefore(deadline)) {
      final call = _webActiveCall;
      if (_isTerminalWebStateName(_webCallState) ||
          call == null && !_webCallSessionActive ||
          call != null && _isTerminalWebCallState(call.state)) {
        return true;
      }
      await Future<void>.delayed(const Duration(milliseconds: 100));
    }

    return false;
  }

  static Future<void> _attachWebRemoteAudio(MediaStream stream) async {
    if (!kIsWeb || stream.getAudioTracks().isEmpty) return;

    final renderer = _webRemoteAudioRenderer ?? RTCVideoRenderer();
    if (_webRemoteAudioRenderer == null) {
      _webRemoteAudioRenderer = renderer;
      await renderer.initialize();
    }

    renderer
      ..muted = false
      ..srcObject = stream;

    if (_webSpeakerphoneOn) {
      await _applyWebAudioOutputPreference(true);
    }
  }

  static Future<void> _disposeWebRemoteAudio() async {
    final renderer = _webRemoteAudioRenderer;
    if (renderer == null) return;

    _webRemoteAudioRenderer = null;
    try {
      renderer.srcObject = null;
      await renderer.dispose();
    } catch (_) {}
  }

  static Future<bool> _applyWebAudioOutputPreference(bool enabled) async {
    final renderer = _webRemoteAudioRenderer;
    if (renderer == null) return false;
    if (!enabled) return true;

    try {
      return await renderer.audioOutput('default');
    } catch (_) {
      return false;
    }
  }

  static bool _sendWebDtmf(String digit) {
    final tone = _dtmfDigitFor(digit);
    final call = _webActiveCall;
    if (tone == null || call == null) return false;

    try {
      call.sendDTMF(tone, <String, dynamic>{
        'duration': 200,
        'interToneGap': 70,
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  static Future<void> _playWebDialTone(String digit) async {
    if (await WebDtmfTonePlayer.play(digit)) return;

    try {
      final bytes = _webToneCache.putIfAbsent(
        digit,
        () => _buildWebTone(digit),
      );
      await _webTonePlayer.stop();
      await _webTonePlayer.play(BytesSource(bytes));
    } catch (_) {
      try {
        await SystemSound.play(SystemSoundType.click);
      } catch (_) {}
    }
  }

  static Future<void> _syncWebRingbackTone() async {
    if (!_shouldPlayWebRingback(_webCallState)) {
      await _stopWebRingbackTone();
      return;
    }
    if (_webRingbackPlaying) return;

    try {
      _webRingbackPlaying = true;
      _webRingbackToneCache ??= _buildWebRingbackTone();
      await _webRingbackPlayer.setReleaseMode(ReleaseMode.loop);
      await _webRingbackPlayer.setVolume(0.46);
      await _webRingbackPlayer.play(BytesSource(_webRingbackToneCache!));
    } catch (_) {
      _webRingbackPlaying = false;
    }
  }

  static Future<void> _stopWebRingbackTone() async {
    if (!_webRingbackPlaying) return;

    _webRingbackPlaying = false;
    try {
      await _webRingbackPlayer.stop();
    } catch (_) {}
  }

  static bool _shouldPlayWebRingback(String state) {
    switch (state.trim().toLowerCase()) {
      case 'dialing':
      case 'calling':
      case 'ringing':
        return true;
      default:
        return false;
    }
  }

  static Uint8List _buildWebRingbackTone() {
    const sampleRate = 44100;
    const durationMs = 6000;
    const audibleMs = 2000;
    const fadeMs = 10;
    const amplitude = 0.22;
    const frequencies = <double>[440.0, 480.0];
    final sampleCount = (sampleRate * durationMs / 1000).round();
    final audibleSamples = (sampleRate * audibleMs / 1000).round();
    final fadeSamples = (sampleRate * fadeMs / 1000).round();
    final dataBytes = sampleCount * 2;
    final bytes = ByteData(44 + dataBytes);

    void writeAscii(int offset, String value) {
      for (var i = 0; i < value.length; i += 1) {
        bytes.setUint8(offset + i, value.codeUnitAt(i));
      }
    }

    writeAscii(0, 'RIFF');
    bytes.setUint32(4, 36 + dataBytes, Endian.little);
    writeAscii(8, 'WAVE');
    writeAscii(12, 'fmt ');
    bytes.setUint32(16, 16, Endian.little);
    bytes.setUint16(20, 1, Endian.little);
    bytes.setUint16(22, 1, Endian.little);
    bytes.setUint32(24, sampleRate, Endian.little);
    bytes.setUint32(28, sampleRate * 2, Endian.little);
    bytes.setUint16(32, 2, Endian.little);
    bytes.setUint16(34, 16, Endian.little);
    writeAscii(36, 'data');
    bytes.setUint32(40, dataBytes, Endian.little);

    for (var i = 0; i < sampleCount; i += 1) {
      var sample = 0;
      if (i < audibleSamples) {
        final t = i / sampleRate;
        final fadeIn = fadeSamples == 0 ? 1.0 : math.min(1.0, i / fadeSamples);
        final fadeOut = fadeSamples == 0
            ? 1.0
            : math.min(1.0, (audibleSamples - i) / fadeSamples);
        final envelope = math.min(fadeIn, fadeOut);
        final wave =
            math.sin(2 * math.pi * frequencies[0] * t) +
            math.sin(2 * math.pi * frequencies[1] * t);
        sample = (wave * 0.5 * amplitude * envelope * 32767).round();
      }
      bytes.setInt16(44 + (i * 2), sample, Endian.little);
    }

    return bytes.buffer.asUint8List();
  }

  static Uint8List _buildWebTone(String digit) {
    const sampleRate = 44100;
    const durationMs = 110;
    const fadeMs = 6;
    const amplitude = 0.32;
    final frequencies =
        _dtmfFrequencies[_dtmfDigitFor(digit)] ?? const <double>[880.0, 1175.0];
    final sampleCount = (sampleRate * durationMs / 1000).round();
    final fadeSamples = (sampleRate * fadeMs / 1000).round();
    final dataBytes = sampleCount * 2;
    final bytes = ByteData(44 + dataBytes);

    void writeAscii(int offset, String value) {
      for (var i = 0; i < value.length; i += 1) {
        bytes.setUint8(offset + i, value.codeUnitAt(i));
      }
    }

    writeAscii(0, 'RIFF');
    bytes.setUint32(4, 36 + dataBytes, Endian.little);
    writeAscii(8, 'WAVE');
    writeAscii(12, 'fmt ');
    bytes.setUint32(16, 16, Endian.little);
    bytes.setUint16(20, 1, Endian.little);
    bytes.setUint16(22, 1, Endian.little);
    bytes.setUint32(24, sampleRate, Endian.little);
    bytes.setUint32(28, sampleRate * 2, Endian.little);
    bytes.setUint16(32, 2, Endian.little);
    bytes.setUint16(34, 16, Endian.little);
    writeAscii(36, 'data');
    bytes.setUint32(40, dataBytes, Endian.little);

    for (var i = 0; i < sampleCount; i += 1) {
      final t = i / sampleRate;
      final fadeIn = fadeSamples == 0 ? 1.0 : math.min(1.0, i / fadeSamples);
      final fadeOut = fadeSamples == 0
          ? 1.0
          : math.min(1.0, (sampleCount - i) / fadeSamples);
      final envelope = math.min(fadeIn, fadeOut);
      final wave =
          math.sin(2 * math.pi * frequencies[0] * t) +
          math.sin(2 * math.pi * frequencies[1] * t);
      final sample = (wave * 0.5 * amplitude * envelope * 32767).round();
      bytes.setInt16(44 + (i * 2), sample, Endian.little);
    }

    return bytes.buffer.asUint8List();
  }

  static String? _dtmfDigitFor(String digit) {
    final value = digit.trim();
    if (value.length != 1) return null;
    if (RegExp(r'^[0-9*#A-Da-d]$').hasMatch(value)) {
      return value.toUpperCase();
    }
    return null;
  }

  static const Map<String, List<double>> _dtmfFrequencies =
      <String, List<double>>{
        '1': <double>[697.0, 1209.0],
        '2': <double>[697.0, 1336.0],
        '3': <double>[697.0, 1477.0],
        'A': <double>[697.0, 1633.0],
        '4': <double>[770.0, 1209.0],
        '5': <double>[770.0, 1336.0],
        '6': <double>[770.0, 1477.0],
        'B': <double>[770.0, 1633.0],
        '7': <double>[852.0, 1209.0],
        '8': <double>[852.0, 1336.0],
        '9': <double>[852.0, 1477.0],
        'C': <double>[852.0, 1633.0],
        '*': <double>[941.0, 1209.0],
        '0': <double>[941.0, 1336.0],
        '#': <double>[941.0, 1477.0],
        'D': <double>[941.0, 1633.0],
      };

  static bool _isTerminalWebCallState(CallStateEnum state) {
    return state == CallStateEnum.ENDED || state == CallStateEnum.FAILED;
  }

  static bool _isTerminalWebStateName(String state) {
    switch (state.trim().toLowerCase()) {
      case 'idle':
      case 'ended':
      case 'failed':
      case 'declined':
      case 'disconnected':
      case 'registration_failed':
        return true;
      default:
        return false;
    }
  }

  static bool _isOngoingWebStateName(String state) {
    switch (state.trim().toLowerCase()) {
      case 'dialing':
      case 'calling':
      case 'ringing':
      case 'active':
      case 'hold':
        return true;
      default:
        return false;
    }
  }

  static void _rememberWebHangupError(Object error) {
    final message = error.toString();
    final normalized = message.toLowerCase();
    if (message.contains('Null check operator used on a null value') ||
        normalized.contains('terminated') ||
        normalized.contains('invalidstateerror')) {
      return;
    }
    _webCallError = message;
  }

  static String? _firstNonEmpty(Iterable<dynamic> values) {
    for (final value in values) {
      final text = value?.toString().trim();
      if (text != null && text.isNotEmpty) return text;
    }
    return null;
  }

  static bool get _webHasLiveCall {
    if (_webCallStartInProgress || _webHangupInProgress) return true;

    final call = _webActiveCall;
    if (call != null && !_isTerminalWebCallState(call.state)) {
      return true;
    }

    if (!_webCallSessionActive) return false;
    return !_isTerminalWebStateName(_webCallState);
  }

  Map<String, dynamic> _withRawVonagePayload(Map<String, dynamic> data) {
    final payload = Map<String, dynamic>.from(data);
    payload.putIfAbsent('rawVonagePayload', () => _toNativeMapString(data));
    return payload;
  }

  String _toNativeMapString(Map<String, dynamic> data) {
    const ignoredKeys = <String>{
      'type',
      'initialAction',
      'rawVonagePayload',
      'rawPushPayload',
      'payload',
    };
    final parts = data.entries
        .where((entry) => !ignoredKeys.contains(entry.key))
        .map((entry) => '${entry.key}=${entry.value}')
        .join(', ');
    return '{$parts}';
  }

  static Map<String, dynamic> _mapFromNativeArguments(dynamic arguments) {
    if (arguments is Map) {
      return arguments.map((key, value) => MapEntry(key.toString(), value));
    }
    return <String, dynamic>{};
  }
}

class _WebSipEventBridge implements SipUaHelperListener {
  @override
  void transportStateChanged(TransportState state) {
    if (state.state == TransportStateEnum.CONNECTING) {
      if (VoiceBridgeService._webActiveCall == null &&
          VoiceBridgeService._webCallStartInProgress) {
        VoiceBridgeService._webCallState = 'connecting';
      }
    } else if (state.state == TransportStateEnum.CONNECTED) {
      if (VoiceBridgeService._webActiveCall == null &&
          VoiceBridgeService._webCallStartInProgress) {
        VoiceBridgeService._webCallState = 'connected';
      }
    } else if (state.state == TransportStateEnum.DISCONNECTED) {
      final hasCallLeg =
          VoiceBridgeService._webActiveCall != null &&
          !VoiceBridgeService._isTerminalWebCallState(
            VoiceBridgeService._webActiveCall!.state,
          );
      final hasOngoingCallState =
          VoiceBridgeService._webCallSessionActive &&
          VoiceBridgeService._isOngoingWebStateName(
            VoiceBridgeService._webCallState,
          );
      if (!VoiceBridgeService._webCallStartInProgress &&
          (hasCallLeg || hasOngoingCallState)) {
        VoiceBridgeService._webCallError = state.cause?.toString();
        return;
      }

      if (VoiceBridgeService._webCallState != 'ended') {
        VoiceBridgeService._webCallState = 'disconnected';
      }
      VoiceBridgeService._webCallSessionActive = false;
      VoiceBridgeService._webActiveCall = null;
      VoiceBridgeService._webCallError = state.cause?.toString();
      final completer = VoiceBridgeService._webSipRegistrationCompleter;
      if (completer != null && !completer.isCompleted) {
        completer.completeError(
          VoiceBridgeUnavailableException(
            'Web SIP socket disconnected${state.cause == null ? '' : ': ${state.cause}'}.',
          ),
        );
      }
    }
  }

  @override
  void registrationStateChanged(RegistrationState state) {
    final completer = VoiceBridgeService._webSipRegistrationCompleter;
    if (state.state == RegistrationStateEnum.REGISTERED) {
      if (VoiceBridgeService._webActiveCall == null &&
          VoiceBridgeService._webCallStartInProgress) {
        VoiceBridgeService._webCallState = 'registered';
      }
      if (completer != null && !completer.isCompleted) {
        completer.complete();
      }
    } else if (state.state == RegistrationStateEnum.REGISTRATION_FAILED) {
      VoiceBridgeService._webCallState = 'registration_failed';
      VoiceBridgeService._webCallError = state.cause?.toString();
      VoiceBridgeService._webCallSessionActive = false;
      if (completer != null && !completer.isCompleted) {
        completer.completeError(
          VoiceBridgeUnavailableException(
            'Web SIP registration failed${state.cause == null ? '' : ': ${state.cause}'}.',
          ),
        );
      }
    } else if (state.state == RegistrationStateEnum.UNREGISTERED &&
        !VoiceBridgeService._webCallSessionActive &&
        VoiceBridgeService._webCallState != 'ended') {
      VoiceBridgeService._webCallState = 'idle';
    }
  }

  @override
  void callStateChanged(Call call, CallState state) {
    VoiceBridgeService._webActiveCall = call;
    final nextState = _mapCallState(state);
    if (nextState.isNotEmpty) {
      VoiceBridgeService._webCallState = nextState;
    }
    unawaited(VoiceBridgeService._syncWebRingbackTone());
    VoiceBridgeService._webCallSessionActive = true;
    if (state.stream != null) {
      unawaited(VoiceBridgeService._attachWebRemoteAudio(state.stream!));
    }
    if (state.state == CallStateEnum.MUTED) {
      VoiceBridgeService._webMicrophoneMuted = true;
    } else if (state.state == CallStateEnum.UNMUTED) {
      VoiceBridgeService._webMicrophoneMuted = false;
    }
    if (state.state == CallStateEnum.FAILED ||
        state.state == CallStateEnum.ENDED) {
      VoiceBridgeService._webCallError = state.cause?.toString();
      VoiceBridgeService._webActiveCall = null;
      VoiceBridgeService._webCallSessionActive = false;
      VoiceBridgeService._webSpeakerphoneOn = false;
      VoiceBridgeService._webMicrophoneMuted = false;
      unawaited(VoiceBridgeService._disposeWebRemoteAudio());
      unawaited(VoiceBridgeService._stopWebRingbackTone());
    }
  }

  @override
  void onNewMessage(SIPMessageRequest msg) {}

  @override
  void onNewNotify(Notify ntf) {}

  @override
  void onNewReinvite(ReInvite event) {}

  String _mapCallState(CallState state) {
    switch (state.state) {
      case CallStateEnum.CALL_INITIATION:
      case CallStateEnum.CONNECTING:
        return 'dialing';
      case CallStateEnum.PROGRESS:
        if (state.cause?.status_code == 180) return 'ringing';
        return 'calling';
      case CallStateEnum.ACCEPTED:
      case CallStateEnum.CONFIRMED:
        return 'active';
      case CallStateEnum.STREAM:
        return _stateAfterStream();
      case CallStateEnum.FAILED:
        return 'failed';
      case CallStateEnum.ENDED:
        return 'ended';
      case CallStateEnum.HOLD:
        return 'hold';
      case CallStateEnum.UNHOLD:
        return 'active';
      case CallStateEnum.MUTED:
      case CallStateEnum.UNMUTED:
      case CallStateEnum.NONE:
      case CallStateEnum.REFER:
        return VoiceBridgeService._webCallState;
    }
  }

  String _stateAfterStream() {
    final current = VoiceBridgeService._webCallState.trim().toLowerCase();
    if (current == 'ringing' ||
        current == 'calling' ||
        current == 'active' ||
        current == 'hold' ||
        current == 'failed' ||
        current == 'ended') {
      return current;
    }
    return 'dialing';
  }
}
