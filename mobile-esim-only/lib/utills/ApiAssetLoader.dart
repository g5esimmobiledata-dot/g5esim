import 'dart:convert';
import 'dart:developer';
import 'dart:ui';
import 'package:crypto/crypto.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'services/ApiService.dart';

class ApiAssetLoader extends AssetLoader {
  @override
  Future<Map<String, dynamic>> load(String? key, Locale locale) async {
    return TranslationService().getLocalTranslationsOnly(
      locale.languageCode,
      countryCode: locale.countryCode,
    );
  }
}

class TranslationService {
  static final _instance = TranslationService._();
  factory TranslationService() => _instance;
  TranslationService._();

  final apiService = ApiService();
  final Map<String, Map<String, dynamic>> _memoryCache = {};
  final Map<String, Future<Map<String, dynamic>>> _pendingLoads = {};
  static const Duration _cacheCheckInterval = Duration(hours: 1);
  static const Map<String, String> _localCountryCodes = {
    'ar': 'SA',
    'en': 'US',
    'es': 'ES',
    'fr': 'FR',
    'hi': 'IND',
    'it': 'IT',
    'ru': 'RU',
  };

  Future<Map<String, dynamic>> getTranslations(
    String languageCode, {
    String? countryCode,
    bool forceRefresh = false,
  }) async {
    final cacheKey = _translationCacheKey(languageCode, countryCode);
    final cachedInMemory = _memoryCache[cacheKey];
    if (cachedInMemory != null && !forceRefresh) {
      return cachedInMemory;
    }

    final pendingLoad = _pendingLoads[cacheKey];
    if (pendingLoad != null && !forceRefresh) {
      return pendingLoad;
    }

    final loadFuture = _loadTranslations(
      languageCode,
      countryCode: countryCode,
      forceRefresh: forceRefresh,
    );
    _pendingLoads[cacheKey] = loadFuture;
    try {
      final translations = await loadFuture;
      _memoryCache[cacheKey] = translations;
      return translations;
    } finally {
      _pendingLoads.remove(cacheKey);
    }
  }

  Future<Map<String, dynamic>> getLocalTranslationsOnly(
    String languageCode, {
    String? countryCode,
  }) {
    return _loadLocalTranslations(languageCode, countryCode);
  }

  Future<Map<String, dynamic>> _loadTranslations(
    String languageCode, {
    String? countryCode,
    bool forceRefresh = false,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final localTranslations = await _loadLocalTranslations(
      languageCode,
      countryCode,
    );

    final dataKey = 'translation_$languageCode';
    final hashKey = 'translation_${languageCode}_hash';
    final checkedAtKey = 'translation_${languageCode}_checked_at';

    Map<String, dynamic> cachedTranslations = {};
    String? cachedHash;

    // Load cache if exists
    final cachedData = prefs.getString(dataKey);
    cachedHash = prefs.getString(hashKey);

    if (cachedData != null) {
      cachedTranslations = jsonDecode(cachedData);
      log('Loaded cached translations for $languageCode');
    }

    final lastCheckedAt = prefs.getInt(checkedAtKey);
    final hasFreshCache =
        lastCheckedAt != null &&
        DateTime.now().difference(
              DateTime.fromMillisecondsSinceEpoch(lastCheckedAt),
            ) <
            _cacheCheckInterval;

    if (!forceRefresh && cachedTranslations.isNotEmpty && hasFreshCache) {
      return _mergeTranslations(cachedTranslations, localTranslations);
    }

    try {
      final endpoint =
          '${ApiEndPoints.GET_TRANSLATION}/$languageCode?namespace=app';
      final response = await apiService
          .get(endpoint, requiresAuth: false)
          .timeout(const Duration(seconds: 4));
      if (response == null || response['success'] != true) {
        log('API failed, returning cached/local translations');
        return _mergeTranslations(cachedTranslations, localTranslations);
      }
      final apiTranslations =
          (response['data']['translations'] as Map<String, dynamic>?) ?? {};
      if (apiTranslations.isEmpty) {
        log('API returned no translations, using cached/local translations');
        return _mergeTranslations(cachedTranslations, localTranslations);
      }
      final apiHash = _generateHash(apiTranslations);
      print('new apiHash: $apiHash and cachedHash: $cachedHash');
      // Compare hashes
      if (apiHash == cachedHash && cachedTranslations.isNotEmpty) {
        await prefs.setInt(checkedAtKey, DateTime.now().millisecondsSinceEpoch);
        log('Translations unchanged, using cache');
        return _mergeTranslations(cachedTranslations, localTranslations);
      }
      await prefs.setString(dataKey, jsonEncode(apiTranslations));
      await prefs.setString(hashKey, apiHash);
      await prefs.setInt(checkedAtKey, DateTime.now().millisecondsSinceEpoch);
      log('Translations updated and cached..');
      return _mergeTranslations(apiTranslations, localTranslations);
    } catch (e) {
      log('Translation error: $e');
      return _mergeTranslations(cachedTranslations, localTranslations);
    }
  }

  Future<Map<String, dynamic>> _loadLocalTranslations(
    String languageCode,
    String? countryCode,
  ) async {
    final english = await _loadLocalTranslationFile('en', 'US');
    if (languageCode == 'en') return english;

    final localized = await _loadLocalTranslationFile(
      languageCode,
      countryCode,
    );
    return _mergeTranslations(english, localized);
  }

  Future<Map<String, dynamic>> _loadLocalTranslationFile(
    String languageCode,
    String? countryCode,
  ) async {
    final resolvedCountry =
        _localCountryCodes[languageCode] ??
        countryCode ??
        languageCode.toUpperCase();
    final fileName = '$languageCode-$resolvedCountry.json';
    try {
      final data = await rootBundle.loadString('assets/translations/$fileName');
      return (jsonDecode(data) as Map).cast<String, dynamic>();
    } catch (_) {
      return {};
    }
  }

  Map<String, dynamic> _mergeTranslations(
    Map<String, dynamic> base,
    Map<String, dynamic> overrides,
  ) {
    return <String, dynamic>{...base, ...overrides};
  }

  String _translationCacheKey(String languageCode, String? countryCode) =>
      '$languageCode-${countryCode ?? _localCountryCodes[languageCode] ?? ''}';

  String _generateHash(Map<String, dynamic> data) {
    final encoded = jsonEncode(data);
    return sha1.convert(utf8.encode(encoded)).toString();
  }

  Future<void> clearCache(String languageCode) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('translation_$languageCode');
    await prefs.remove('translation_${languageCode}_hash');
    await prefs.remove('translation_${languageCode}_checked_at');
    _memoryCache.removeWhere((key, _) => key.startsWith('$languageCode-'));
  }
}
