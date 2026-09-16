import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class AppColors {
  static bool isDarkMode = true;
  static const Color defaultPrimaryColor = Color(0xff4AA8FF);

  // ------------------PrimaryColor text Color-----------------
  static Color primaryColor = defaultPrimaryColor;
  // static Color secondaryColor = Color(0xff1F3A4A);
  static Color secondaryColor = const Color(0xff0B1026);
  // static Color secondaryColor = Colors.green;

  static Color textColor = const Color(0xff222222);
  static Color textGreyColor = Colors.black54;
  static Color scaffoldbackgroudColor = Colors.white;

  // --------------Modern app shell colors---------------------
  static Color appBackground = const Color(0xff070B1F);
  static Color appSurface = const Color(0xff10162D);
  static Color appSurfaceAlt = const Color(0xff171E38);
  static Color appSurfaceSoft = const Color(0xff202846);
  static Color appAccent = defaultPrimaryColor;
  static Color appAccentBlue = const Color(0xff4AA8FF);
  static Color appAccentPurple = const Color(0xff8D6BFF);
  static Color appAccentPink = const Color(0xffFF6FAF);
  static Color appTextPrimary = const Color(0xffF7F8FF);
  static Color appTextSecondary = const Color(0xffA9B2CD);
  static Color appBorder = const Color(0xff28314F);

  // --------------Toast Colors---------------------
  static Color toastTextColor = Colors.white;
  static Color toastBackgroungColor = const Color(0xff222222);

  // --------------Divider Color---------------------
  static Color dividerColor = Colors.grey.shade400;

  // --------------Normal Colors---------------------
  static Color darkgreen = const Color(0xff06402B);
  static Color darkYellow = const Color(0xffF9A417);
  static Color whiteColor = Colors.white;
  static Color greenColor = Colors.green;
  static Color redColor = Colors.red;
  static Color blueColor = const Color(0xff2323FF);
  static Color blackColor = const Color(0xff222222);
  static Color greyColor = Colors.grey;

  static void applyTheme(bool isDark) {
    isDarkMode = isDark;
    primaryColor = defaultPrimaryColor;
    appAccent = primaryColor;
    appAccentBlue = const Color(0xff4AA8FF);
    appAccentPurple = const Color(0xff8D6BFF);
    appAccentPink = const Color(0xffFF6FAF);
    greenColor = Colors.green;
    redColor = Colors.red;
    blueColor = const Color(0xff2323FF);
    darkgreen = const Color(0xff06402B);
    darkYellow = const Color(0xffF9A417);

    if (isDark) {
      secondaryColor = const Color(0xff0B1026);
      textColor = const Color(0xffF7F8FF);
      textGreyColor = const Color(0xffA9B2CD);
      scaffoldbackgroudColor = const Color(0xff070B1F);
      appBackground = const Color(0xff070B1F);
      appSurface = const Color(0xff10162D);
      appSurfaceAlt = const Color(0xff171E38);
      appSurfaceSoft = const Color(0xff202846);
      appTextPrimary = const Color(0xffF7F8FF);
      appTextSecondary = const Color(0xffA9B2CD);
      appBorder = const Color(0xff28314F);
      toastTextColor = Colors.white;
      toastBackgroungColor = const Color(0xff222222);
      dividerColor = const Color(0xff28314F);
      whiteColor = Colors.white;
      blackColor = const Color(0xff222222);
      greyColor = const Color(0xff8D96AD);
      return;
    }

    secondaryColor = const Color(0xff165B52);
    textColor = const Color(0xff101828);
    textGreyColor = const Color(0xff667085);
    scaffoldbackgroudColor = const Color(0xffF6FAF9);
    appBackground = const Color(0xffF6FAF9);
    appSurface = Colors.white;
    appSurfaceAlt = const Color(0xffEAF4F2);
    appSurfaceSoft = const Color(0xffDDF0ED);
    appTextPrimary = const Color(0xff101828);
    appTextSecondary = const Color(0xff667085);
    appBorder = const Color(0xffD9E7E4);
    toastTextColor = Colors.white;
    toastBackgroungColor = const Color(0xff222222);
    dividerColor = const Color(0xffD9E7E4);
    whiteColor = Colors.white;
    blackColor = const Color(0xff101828);
    greyColor = const Color(0xff8A95A4);
  }

  static SystemUiOverlayStyle systemOverlayStyle() {
    final iconBrightness = isDarkMode ? Brightness.light : Brightness.dark;
    return SystemUiOverlayStyle(
      statusBarColor: appBackground,
      statusBarIconBrightness: iconBrightness,
      systemNavigationBarColor: appBackground,
      systemNavigationBarIconBrightness: iconBrightness,
      statusBarBrightness: isDarkMode ? Brightness.dark : Brightness.light,
    );
  }
}
