import 'dart:convert';
import 'dart:developer';

import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../UserService.dart';
import 'ApiService.dart';

class UserModuleAccessService extends GetxService {
  static UserModuleAccessService get to => Get.find<UserModuleAccessService>();

  final RxMap<String, bool> modules = <String, bool>{}.obs;
  final RxBool isLoading = false.obs;
  bool _hasLoaded = false;
  String? _loadedForUserKey;
  DateTime? _lastLoadedAt;

  Future<void> load({bool force = false}) async {
    if (isLoading.value) return;

    final userData = UserService.to.currentUserData?.data;
    final storedUserData = await _storedUserData();
    final storedData = storedUserData?['data'] is Map
        ? storedUserData!['data'] as Map
        : null;
    final token =
        _stringValue(userData?.token) ?? _stringValue(storedData?['token']);
    final hasToken = token?.trim().isNotEmpty == true;
    final userKey = hasToken
        ? (_stringValue(userData?.id) ??
              _stringValue(storedData?['id']) ??
              _stringValue(userData?.email) ??
              _stringValue(storedData?['email']) ??
              token ??
              'signed-in')
        : 'guest';

    final loadedAt = _lastLoadedAt;
    final cacheIsFresh =
        loadedAt != null &&
        DateTime.now().difference(loadedAt) < const Duration(seconds: 30);

    if (_hasLoaded && !force && _loadedForUserKey == userKey && cacheIsFresh) {
      return;
    }

    isLoading.value = true;
    try {
      final response = await ApiService().get(
        'options',
        requiresAuth: hasToken,
      );
      final data = response is Map ? response['data'] ?? response : null;
      final roles = data is Map ? data['roles'] : null;
      final userRole = _roleKey(
        _stringValue(userData?.role) ?? _stringValue(storedData?['role']),
      );
      final roleOptions = roles is Map ? roles[userRole] : null;
      final rawModules = roleOptions is Map
          ? (roleOptions['mobileModules'] ?? roleOptions['modules'])
          : null;

      if (rawModules is Map) {
        modules.assignAll(
          rawModules.map(
            (key, value) => MapEntry(key.toString(), _truthy(value)),
          ),
        );
      } else {
        modules.clear();
      }
      _hasLoaded = true;
      _loadedForUserKey = userKey;
      _lastLoadedAt = DateTime.now();
    } catch (error) {
      log('Failed to load user module options: $error');
    } finally {
      isLoading.value = false;
    }
  }

  bool enabled(String key, {bool fallback = true}) {
    if (!modules.containsKey(key)) return fallback;
    return modules[key] == true;
  }

  bool hasAny(Iterable<String> keys) {
    final normalizedKeys = keys.map(_normalizeKey).toSet();
    for (final key in modules.keys) {
      if (keys.contains(key) || normalizedKeys.contains(_normalizeKey(key))) {
        return true;
      }
    }
    return false;
  }

  bool enabledAny(Iterable<String> keys, {bool fallback = true}) {
    final normalizedKeys = keys.map(_normalizeKey).toSet();
    var matched = false;

    for (final key in keys) {
      if (modules.containsKey(key)) {
        matched = true;
        if (modules[key] == true) return true;
      }
    }

    for (final entry in modules.entries) {
      if (normalizedKeys.contains(_normalizeKey(entry.key))) {
        matched = true;
        if (entry.value == true) return true;
      }
    }

    return matched ? false : fallback;
  }

  Future<Map<String, dynamic>?> _storedUserData() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString('UserProfileData');
      if (raw == null || raw.trim().isEmpty) return null;
      final decoded = jsonDecode(raw);
      return decoded is Map<String, dynamic> ? decoded : null;
    } catch (error) {
      log('Failed to read stored user data for module options: $error');
      return null;
    }
  }

  String? _stringValue(dynamic value) {
    if (value == null) return null;
    final text = value.toString().trim();
    return text.isEmpty ? null : text;
  }

  String _roleKey(String? role) {
    if (role == 'agent' || role == 'reseller') return role!;
    return 'user';
  }

  bool _truthy(dynamic value) {
    if (value is bool) return value;
    if (value is num) return value != 0;
    final text = value?.toString().trim().toLowerCase();
    return text == 'true' ||
        text == '1' ||
        text == 'yes' ||
        text == 'on' ||
        text == 'active' ||
        text == 'enabled';
  }

  String _normalizeKey(String value) {
    return value.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '');
  }
}
