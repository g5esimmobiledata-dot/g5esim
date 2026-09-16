import 'package:flutter/material.dart';
import 'package:sizer/sizer.dart';
import 'package:esimconnect/utills/appColors.dart';

Map<int, Color> color = {
  50: const Color.fromRGBO(198, 29, 36, .1),
  100: const Color.fromRGBO(198, 29, 36, .2),
  200: const Color.fromRGBO(198, 29, 36, .3),
  300: const Color.fromRGBO(198, 29, 36, .4),
  400: const Color.fromRGBO(198, 29, 36, .5),
  500: const Color.fromRGBO(198, 29, 36, .6),
  600: const Color.fromRGBO(198, 29, 36, .7),
  700: const Color.fromRGBO(198, 29, 36, .8),
  800: const Color.fromRGBO(198, 29, 36, .9),
  900: const Color.fromRGBO(198, 29, 36, 1),
};
ThemeData nativeTheme({
  bool? isDarkModeEnabled,
  required Color appPrimaryColor,
  required int primaryColorInt,
}) {
  final bool isDark = isDarkModeEnabled ?? false;
  final Color primaryColor = appPrimaryColor;
  final Color textColor = AppColors.textColor;
  final String fontFamily = 'Lexend';

  return ThemeData(
    appBarTheme: AppBarTheme(
      backgroundColor: AppColors.appBackground,
      titleSpacing: 1.0,
      centerTitle: false,
      surfaceTintColor: AppColors.appBackground,
      titleTextStyle: TextStyle(
        fontFamily: fontFamily,
        fontWeight: isDark ? FontWeight.normal : FontWeight.normal,
        fontSize: 17.sp,
        color: AppColors.appTextPrimary,
      ),
      iconTheme: IconThemeData(size: 19.sp, color: AppColors.appTextPrimary),
      systemOverlayStyle: AppColors.systemOverlayStyle(),
    ),
    fontFamily: fontFamily,
    brightness: isDark ? Brightness.dark : Brightness.light,
    scaffoldBackgroundColor: AppColors.scaffoldbackgroudColor,
    canvasColor: AppColors.appBackground,
    cardColor: AppColors.appSurface,
    dividerColor: AppColors.dividerColor,
    primaryColor: primaryColor,
    primaryColorLight: primaryColor,
    primarySwatch: MaterialColor(primaryColorInt, color),
    textTheme: TextTheme(
      titleLarge: TextStyle(fontFamily: fontFamily, color: textColor),
      titleMedium: TextStyle(fontFamily: fontFamily, color: textColor),
      titleSmall: TextStyle(fontFamily: fontFamily, color: textColor),
      bodySmall: TextStyle(fontFamily: fontFamily, color: textColor),
      bodyLarge: TextStyle(fontFamily: fontFamily, color: textColor),
      bodyMedium: TextStyle(fontFamily: fontFamily, color: textColor),
    ),
    primaryTextTheme: TextTheme(
      titleLarge: TextStyle(fontFamily: fontFamily, color: textColor),
      titleMedium: TextStyle(fontFamily: fontFamily, color: textColor),
      titleSmall: TextStyle(fontFamily: fontFamily, color: textColor),
      bodyLarge: TextStyle(fontFamily: fontFamily, color: textColor),
      bodyMedium: TextStyle(fontFamily: fontFamily, color: textColor),
      bodySmall: TextStyle(fontFamily: fontFamily, color: textColor),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ButtonStyle(
        backgroundColor: WidgetStateProperty.all(primaryColor),
        foregroundColor: WidgetStateProperty.all(const Color(0xFFF5F5F5)),
      ),
    ),
    colorScheme:
        ColorScheme.fromSwatch(
          primarySwatch: MaterialColor(primaryColorInt, color),
          brightness: isDark ? Brightness.dark : Brightness.light,
        ).copyWith(
          primary: primaryColor,
          surface: AppColors.appSurface,
          onSurface: AppColors.appTextPrimary,
          secondary: AppColors.appAccentBlue,
        ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return AppColors.primaryColor;
        }
        return AppColors.appTextSecondary;
      }),
      trackColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return AppColors.primaryColor.withOpacity(0.28);
        }
        return AppColors.appSurfaceAlt;
      }),
    ),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: AppColors.scaffoldbackgroudColor,
      surfaceTintColor: AppColors.scaffoldbackgroudColor,
    ),
  );
}
