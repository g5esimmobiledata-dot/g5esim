import 'dart:developer';

import 'package:shared_preferences/shared_preferences.dart';

class InAppPurchaseUtils {
  static const String _keyInAppBilling = "inAppBillingStatus";
  // ---------- SAVE ----------
  static Future<void> saveInAppBillingStatus(bool value) async {
    log('InAppBilling homescree: $value');
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyInAppBilling, value);
  }

  // ---------- GET ----------
  static Future<bool> getInAppBillingStatus() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_keyInAppBilling) ?? false;
  }
}
