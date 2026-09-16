import 'package:esimconnect/utills/ApiAssetLoader.dart';
import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/utills/image.dart';

class LanguageSelectionHandler {
  static Future<void> changeLanguage({
    required BuildContext context,
    required String languageCode,
    required String flagCode,
    required ApiAssetLoader apiAssetLoader,
  }) async {
    try {
      Get.dialog(
        const Center(child: CircularProgressIndicator()),
        barrierDismissible: false,
      );
      final translationService = TranslationService();
      await translationService.getTranslations(
        languageCode,
        countryCode: flagCode,
        forceRefresh: true,
      );
      final newLocale = Locale(languageCode, flagCode);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('selected_language', languageCode);
      await prefs.setString('selected_country', flagCode);
      await prefs.setString('language_id_$languageCode', languageCode);
      await context.deleteSaveLocale();
      await context.setLocale(newLocale);
      await Get.updateLocale(newLocale);
      await Future.delayed(const Duration(milliseconds: 500));
      Get.back();
      Get.back();
      Get.showSnackbar(
        GetSnackBar(
          message: 'Language changed to ${languageCode.toUpperCase()}',
          duration: const Duration(seconds: 2),
          backgroundColor: Colors.green,
        ),
      );

      print('✅ Language changed to $languageCode');
    } catch (e) {
      if (Get.isDialogOpen ?? false) {
        Get.back();
      }
      // Show error message
      Get.showSnackbar(
        GetSnackBar(
          message: 'Failed to change language: ${e.toString()}',
          duration: const Duration(seconds: 3),
          backgroundColor: Colors.red,
        ),
      );
      print('❌ Language change error: $e');
    }
  }
}

Widget buildLanguageListItem({
  required BuildContext context,
  required String langId,
  required String langCode,
  required String langName,
  String? langNativeName,
  String? countryCode,
  required String currentLangCode,
  required VoidCallback onTap,
}) {
  final isSelected = currentLangCode == langCode;
  final nativeName = langNativeName?.trim() ?? '';
  final hasNativeName =
      nativeName.isNotEmpty &&
      nativeName.toLowerCase() != langName.trim().toLowerCase();
  final cardColor = isSelected
      ? AppColors.primaryColor.withOpacity(AppColors.isDarkMode ? 0.16 : 0.1)
      : AppColors.isDarkMode
      ? AppColors.appSurfaceAlt
      : AppColors.whiteColor;
  final borderColor = isSelected ? AppColors.primaryColor : AppColors.appBorder;
  final titleColor = isSelected
      ? AppColors.primaryColor
      : AppColors.isDarkMode
      ? AppColors.appTextPrimary
      : AppColors.textColor;
  final subtitleColor = AppColors.isDarkMode
      ? AppColors.appTextSecondary
      : AppColors.textGreyColor;
  final iconColor = isSelected ? AppColors.primaryColor : subtitleColor;

  return Container(
    margin: const EdgeInsets.only(bottom: 10),
    decoration: BoxDecoration(
      color: cardColor,
      borderRadius: BorderRadius.circular(8),
      border: Border.all(color: borderColor, width: isSelected ? 1.4 : 1),
    ),
    child: ListTile(
      minVerticalPadding: 14,
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 6),
      leading: Image.asset(Images.language, height: 30, color: iconColor),
      title: Text(
        langName,
        style: Theme.of(context).textTheme.bodyMedium!.copyWith(
          color: titleColor,
          fontSize: 17,
          fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
        ),
      ),
      subtitle: hasNativeName
          ? Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                nativeName,
                style: Theme.of(context).textTheme.bodySmall!.copyWith(
                  color: subtitleColor,
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
            )
          : null,
      trailing: isSelected
          ? Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.primaryColor.withOpacity(0.2),
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.primaryColor, width: 1),
              ),
              child: Icon(Icons.check, color: AppColors.primaryColor, size: 20),
            )
          : null,
      onTap: onTap,
    ),
  );
}
