import 'dart:async';
import 'dart:developer';
import 'dart:io';

import 'package:device_info_plus/device_info_plus.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'VoiceBridgeService.dart';

class PushTokenService {
  PushTokenService._();

  static final PushTokenService instance = PushTokenService._();

  static const String fcmTokenKey = 'push_fcm_token';
  static const String apnsTokenKey = 'push_apns_token';
  static const String voipTokenKey = 'push_voip_token';

  StreamSubscription<String>? _tokenRefreshSubscription;

  Future<void> initialize() async {
    if (kIsWeb) return;

    await _requestNotificationPermission();
    await refreshCachedTokens();

    _tokenRefreshSubscription ??= FirebaseMessaging.instance.onTokenRefresh
        .listen((token) async {
          await _saveToken(fcmTokenKey, token);
          log('Firebase push token refreshed.');
        });
  }

  Future<Map<String, dynamic>> deviceDetailsForLogin() async {
    final packageInfo = await PackageInfo.fromPlatform();
    if (kIsWeb) {
      return <String, dynamic>{
        'deviceid': '',
        'fcmToken': '',
        'pushToken': '',
        'apnsToken': '',
        'voipToken': '',
        'callkitToken': '',
        'platform': 'web',
        'pushProvider': 'web',
        'deviceLocation': '',
        'deviceManufacture': 'Web',
        'deviceManufacturer': 'Web',
        'deviceModel': defaultTargetPlatform.name,
        'appVersion': packageInfo.version,
        'packageName': packageInfo.packageName,
        'osVersion': defaultTargetPlatform.name,
      };
    }

    final tokens = await refreshCachedTokens();
    final deviceInfo = DeviceInfoPlugin();
    final platform = Platform.isAndroid
        ? 'android'
        : Platform.isIOS
        ? 'ios'
        : Platform.operatingSystem;

    if (Platform.isAndroid) {
      final androidInfo = await deviceInfo.androidInfo;
      return <String, dynamic>{
        ...tokens,
        'deviceid': androidInfo.id,
        'deviceLocation': '',
        'deviceManufacture': androidInfo.manufacturer,
        'deviceManufacturer': androidInfo.manufacturer,
        'deviceModel': androidInfo.model,
        'appVersion': packageInfo.version,
        'packageName': packageInfo.packageName,
        'platform': platform,
        'pushProvider': 'fcm',
        'osVersion': androidInfo.version.release,
      };
    }

    if (Platform.isIOS) {
      final iosInfo = await deviceInfo.iosInfo;
      return <String, dynamic>{
        ...tokens,
        'deviceid': iosInfo.identifierForVendor,
        'deviceLocation': '',
        'deviceManufacture': 'Apple',
        'deviceManufacturer': 'Apple',
        'deviceModel': iosInfo.utsname.machine,
        'appVersion': packageInfo.version,
        'packageName': packageInfo.packageName,
        'platform': platform,
        'pushProvider': 'apns_voip_fcm',
        'osVersion': iosInfo.systemVersion,
      };
    }

    return <String, dynamic>{
      ...tokens,
      'deviceid': '',
      'deviceLocation': '',
      'deviceManufacture': platform,
      'deviceManufacturer': platform,
      'deviceModel': platform,
      'appVersion': packageInfo.version,
      'packageName': packageInfo.packageName,
      'platform': platform,
      'pushProvider': 'fcm',
      'osVersion': Platform.operatingSystemVersion,
    };
  }

  Future<Map<String, dynamic>> refreshCachedTokens() async {
    if (kIsWeb) return _emptyTokenPayload();

    final fcmToken = await FirebaseMessaging.instance.getToken();
    final apnsToken = Platform.isIOS
        ? await FirebaseMessaging.instance.getAPNSToken()
        : null;
    final voipToken = Platform.isIOS
        ? await VoiceBridgeService().getVoipToken()
        : null;

    await _saveToken(fcmTokenKey, fcmToken);
    await _saveToken(apnsTokenKey, apnsToken);
    await _saveToken(voipTokenKey, voipToken);

    final pushToken = fcmToken ?? '';
    return <String, dynamic>{
      'fcmToken': pushToken,
      'pushToken': pushToken,
      'firebaseToken': pushToken,
      'apnsToken': apnsToken ?? '',
      'apns_token': apnsToken ?? '',
      'voipToken': voipToken ?? '',
      'voip_token': voipToken ?? '',
      'callkitToken': voipToken ?? pushToken,
      'callkit_token': voipToken ?? pushToken,
    };
  }

  Future<void> _requestNotificationPermission() async {
    try {
      await FirebaseMessaging.instance.requestPermission(
        alert: true,
        announcement: false,
        badge: true,
        carPlay: false,
        criticalAlert: false,
        provisional: false,
        sound: true,
      );
    } catch (error) {
      log('Notification permission request failed: $error');
    }
  }

  Future<void> _saveToken(String key, String? token) async {
    final prefs = await SharedPreferences.getInstance();
    final value = token?.trim() ?? '';
    if (value.isEmpty) {
      await prefs.remove(key);
    } else {
      await prefs.setString(key, value);
    }
  }

  Map<String, dynamic> _emptyTokenPayload() => const <String, dynamic>{
    'fcmToken': '',
    'pushToken': '',
    'firebaseToken': '',
    'apnsToken': '',
    'apns_token': '',
    'voipToken': '',
    'voip_token': '',
    'callkitToken': '',
    'callkit_token': '',
  };
}
