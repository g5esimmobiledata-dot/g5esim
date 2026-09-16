// ------------API host config----------------
// ------------Can be overridden with REAL_DEVICE_API_HOST----------------
import 'dart:io' show Platform;
import 'dart:ui';

import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AppRuntimeConfig {
  static const String realDeviceHostStorageKey =
      'real_device_api_host_override';
  static const String _compiledRealDeviceHost = String.fromEnvironment(
    'REAL_DEVICE_API_HOST',
    defaultValue: '',
  );
  static const String _fallbackRealDeviceHost = 'g5esim.mobile';

  static String _apiHost = defaultRealDeviceHost;
  static String _realDeviceHost = defaultRealDeviceHost;
  static bool _usesEditableRealDeviceHost = false;
  static bool _initialized = false;

  static Future<void> initialize() async {
    if (_initialized) return;

    if (kIsWeb) {
      _realDeviceHost = _resolveWebApiHost();
      _apiHost = _realDeviceHost;
      _usesEditableRealDeviceHost = false;
      _initialized = true;
      return;
    }

    _realDeviceHost = await _loadSavedRealDeviceHost();

    try {
      final deviceInfo = DeviceInfoPlugin();

      if (Platform.isAndroid) {
        final androidInfo = await deviceInfo.androidInfo;
        _usesEditableRealDeviceHost = androidInfo.isPhysicalDevice;
        _apiHost = _realDeviceHost;
      } else if (Platform.isIOS) {
        final iosInfo = await deviceInfo.iosInfo;
        _usesEditableRealDeviceHost = iosInfo.isPhysicalDevice;
        _apiHost = _realDeviceHost;
      } else {
        _usesEditableRealDeviceHost = true;
        _apiHost = _realDeviceHost;
      }
    } catch (_) {
      _usesEditableRealDeviceHost = true;
      _apiHost = _realDeviceHost;
    }

    _initialized = true;
  }

  static Future<void> setRealDeviceHost(String host) async {
    final normalizedHost = normalizeHost(host);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(realDeviceHostStorageKey, normalizedHost);
    _realDeviceHost = normalizedHost;
    if (_usesEditableRealDeviceHost) {
      _apiHost = normalizedHost;
    }
  }

  static Future<void> resetRealDeviceHost() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(realDeviceHostStorageKey);
    _realDeviceHost = defaultRealDeviceHost;
    if (_usesEditableRealDeviceHost) {
      _apiHost = defaultRealDeviceHost;
    }
  }

  static String normalizeHost(String host) {
    var value = host.trim();
    value = value
        .replaceFirst(RegExp(r'^https?://', caseSensitive: false), '')
        .replaceFirst(RegExp(r'/.*$'), '')
        .trim();

    if (value.isEmpty) return defaultRealDeviceHost;

    final isLocalIpv4 = RegExp(r'^\d{1,3}(\.\d{1,3}){3}$').hasMatch(value);
    if (isLocalIpv4 || value == 'localhost') {
      return '$value:5000';
    }

    return value;
  }

  static Future<String> _loadSavedRealDeviceHost() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedHost = prefs.getString(realDeviceHostStorageKey);
      return normalizeHost(savedHost ?? defaultRealDeviceHost);
    } catch (_) {
      return defaultRealDeviceHost;
    }
  }

  static String _resolveWebApiHost() {
    final compiledHost = _compiledRealDeviceHost.trim();
    if (compiledHost.isNotEmpty) return normalizeHost(compiledHost);

    return defaultRealDeviceHost;
  }

  static String get apiHost => _apiHost;
  static String get realDeviceHost => _realDeviceHost;
  static String get defaultRealDeviceHost {
    final compiledHost = _compiledRealDeviceHost.trim();
    return compiledHost.isNotEmpty ? compiledHost : _fallbackRealDeviceHost;
  }
  static bool get usesEditableRealDeviceHost => _usesEditableRealDeviceHost;
}

bool get _usesLocalHttpHost =>
    AppRuntimeConfig.apiHost.startsWith('localhost') ||
    RegExp(
      r'^\d{1,3}(\.\d{1,3}){3}(:\d+)?$',
    ).hasMatch(AppRuntimeConfig.apiHost);

String get _apiScheme => _usesLocalHttpHost ? 'http' : 'https';

String get baseUrl => "$_apiScheme://${AppRuntimeConfig.apiHost}/api/";
String get imageBaseUrl => "$_apiScheme://${AppRuntimeConfig.apiHost}";
String get socketbaseUrl => "$_apiScheme://${AppRuntimeConfig.apiHost}/";

// add any new supported lang code here when you add new language
final defaultSupportedLocales = [
  Locale('en', 'US'),
  Locale('hi', 'IN'),
  Locale('cs', 'CZ'),
  Locale('da', 'DK'),
  Locale('de', 'DE'),
  Locale('et', 'EE'),
  Locale('es', 'ES'),
  Locale('fr', 'FR'),
  Locale('ga', 'IE'),
  Locale('hr', 'HR'),
  Locale('hu', 'HU'),
  Locale('it', 'IT'),
  Locale('lv', 'LV'),
  Locale('lt', 'LT'),
  Locale('mt', 'MT'),
  Locale('nl', 'NL'),
  Locale('pl', 'PL'),
  Locale('pt', 'PT'),
  Locale('ro', 'RO'),
  Locale('sk', 'SK'),
  Locale('sl', 'SI'),
  Locale('fi', 'FI'),
  Locale('sv', 'SE'),
  Locale('el', 'GR'),
  Locale('bg', 'BG'),
  Locale('ar', 'SA'),
  Locale('ur', 'PK'),
  Locale('af', 'ZA'),
  Locale('am', 'ET'),
  Locale('ms', 'MY'),
  Locale('no', 'NO'),
  Locale('tr', 'TR'),
  Locale('uk', 'UA'),
  Locale('az', 'AZ'),
  Locale('bn', 'BD'),
  Locale('zh', 'CN'),
  Locale('he', 'IL'),
  Locale('id', 'ID'),
  Locale('ja', 'JP'),
  Locale('ko', 'KR'),
  Locale('ru', 'RU'),
  Locale('vi', 'VN'),
  Locale('fa', 'IR'),
];
