import 'dart:async';
import 'dart:developer';
import 'dart:io';

import 'package:device_info_plus/device_info_plus.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

class PushTokenService {
  PushTokenService._();

  static final PushTokenService instance = PushTokenService._();

  static const String fcmTokenKey = 'push_fcm_token';
  static const String apnsTokenKey = 'push_apns_token';

  StreamSubscription<String>? _tokenRefreshSubscription;

  Future<void> initialize() async {
    if (kIsWeb) return;

    await _requestNotificationPermission();
    try {
      await refreshCachedTokens();
    } catch (error) {
      log('Push token initialization failed: $error');
    }

    _tokenRefreshSubscription ??= FirebaseMessaging.instance.onTokenRefresh
        .listen((token) async {
          await _saveToken(fcmTokenKey, token);
          log('Firebase push token refreshed.');
        }, onError: (Object error) {
          log('Firebase push token refresh listener failed: $error');
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
        'pushProvider': 'apns_fcm',
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

    final fcmToken = await _readTokenSafely(
      key: fcmTokenKey,
      label: 'Firebase push',
      loader: FirebaseMessaging.instance.getToken,
    );
    final apnsToken = Platform.isIOS
        ? await _readTokenSafely(
            key: apnsTokenKey,
            label: 'APNs push',
            loader: FirebaseMessaging.instance.getAPNSToken,
          )
        : null;

    final pushToken = fcmToken ?? '';
    return <String, dynamic>{
      'fcmToken': pushToken,
      'pushToken': pushToken,
      'firebaseToken': pushToken,
      'apnsToken': apnsToken ?? '',
      'apns_token': apnsToken ?? '',
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

  Future<String?> _readTokenSafely({
    required String key,
    required String label,
    required Future<String?> Function() loader,
  }) async {
    try {
      final token = await loader();
      await _saveToken(key, token);
      return token;
    } catch (error) {
      log('$label token unavailable; using cached value if present: $error');
      return _getSavedToken(key);
    }
  }

  Future<String?> _getSavedToken(String key) async {
    final prefs = await SharedPreferences.getInstance();
    final value = prefs.getString(key)?.trim();
    return value == null || value.isEmpty ? null : value;
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
  };
}
