import 'dart:async';
import 'package:esimconnect/utills/TimeZoneHelper.dart';
import 'package:esimconnect/utills/UserService.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/utills/binding/networkBinding.dart';
import 'package:esimconnect/utills/config.dart';
import 'package:esimconnect/utills/connectivity/connectivity_bloc.dart';
import 'package:esimconnect/utills/notificationUtils.dart';
import 'package:esimconnect/utills/services/PushTokenService.dart';
import 'package:esimconnect/views/authModule/auth_controller/LoginController.dart';
import 'package:esimconnect/views/authModule/auth_controller/OtpController.dart';
import 'package:esimconnect/views/homeModule/controller/homeController.dart';
import 'package:esimconnect/views/myEsimModule/controller/myesimController.dart';
import 'package:esimconnect/views/onBoardModule/controller/onboardController.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart' hide Transition;
import 'package:get/get.dart';
import 'package:in_app_purchase_android/in_app_purchase_android.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sizer/sizer.dart';
import 'package:esimconnect/theme/bloc/them_block.dart';
import 'package:esimconnect/theme/bloc/theme_state.dart';
import 'package:esimconnect/theme/nativetheme.dart';
import 'package:esimconnect/utills/app_providers.dart';
import 'package:esimconnect/utills/firebase_options.dart';
import 'package:esimconnect/views/authModule/view/splashscreen.dart';
import 'package:esimconnect/views/navbarModule/bloc/navbar_bloc.dart';
import 'package:toastification/toastification.dart';
import 'utills/ApiAssetLoader.dart';
import 'views/authModule/auth_controller/OtpDialogController.dart';
import 'views/homeModule/getUsageModule/controller/currencyController.dart';
import 'views/packageModule/packagesList/controller/packagelistcontorller.dart';
import 'views/packageModule/regionsList/controller/regionalcontroller.dart';
import 'views/profileMoulde/historyOrdermodule/controller/orderhistoryController.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  await setupLocalNotifications();
  await NotificationUtils().showNotification(message);
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await EasyLocalization.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  final savedLangCode = prefs.getString('selected_language') ?? 'en';
  final savedCountryCode = prefs.getString('selected_country') ?? 'US';
  AppColors.applyTheme(prefs.getBool('isDarkTheme') ?? true);

  if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
    InAppPurchaseAndroidPlatform.registerPlatform();
  }
  TimeZoneHelper.initialize();

  await _runStartupTask('Runtime config', AppRuntimeConfig.initialize());
  Get.put(UserService());
  EasyLocalization.logger.enableLevels = [];

  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  SystemChrome.setSystemUIOverlayStyle(AppColors.systemOverlayStyle());

  runApp(
    EasyLocalization(
      supportedLocales: defaultSupportedLocales,
      path: 'translations',
      assetLoader: ApiAssetLoader(),
      fallbackLocale: const Locale('en', 'US'),
      startLocale: Locale(savedLangCode, savedCountryCode),
      useFallbackTranslations: true,
      saveLocale: true,
      child: MultiProvider(
        providers: [...appProviders],
        child: ToastificationWrapper(child: MyApp()),
      ),
    ),
  );

  WidgetsBinding.instance.addPostFrameCallback((_) {
    unawaited(_initializeAppServices());
  });
}

Future<void> _initializeAppServices() async {
  await _runStartupTask(
    'Firebase',
    Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform),
  );

  if (!kIsWeb) {
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  }

  await _runStartupTask('Push token', PushTokenService.instance.initialize());
  await _initializeForegroundNotifications();
}

Future<void> _runStartupTask(String name, Future<void> task) async {
  try {
    await task.timeout(const Duration(seconds: 8));
  } catch (error, stackTrace) {
    debugPrint('$name startup failed: $error');
    debugPrintStack(stackTrace: stackTrace);
  }
}

Future<void> _initializeForegroundNotifications() async {
  if (kIsWeb) return;
  if (Firebase.apps.isEmpty) {
    debugPrint('Notification setup skipped: Firebase is not initialized');
    return;
  }

  try {
    await setupLocalNotifications();
    await FirebaseMessaging.instance
        .setForegroundNotificationPresentationOptions(
          alert: true,
          badge: true,
          sound: true,
        );
  } catch (e) {
    debugPrint('Notification setup failed: $e');
  }
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  final loginController = Get.put(LoginController());
  final otpController = Get.put(OtpController());
  final orderHistoryController = Get.put(OrderHistoryController());
  final packagelistcontorller = Get.put(PackageListController());
  final myeSimController = Get.put(MyESimController());
  final homeController = Get.put(HomeController());
  final bottmconrolltre = Get.put(BottomNavController());
  final onboardController = Get.put(OnBoardController());
  final regionalListCntroller = Get.put(RegionalListController());
  final currencycont = Get.put(CurrencyController());
  final otpcontroller = Get.put(OtpDialogController());
  ToastificationItem? _internetToast;

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ThemeBloc, ThemeState>(
      builder: (context, themeState) {
        AppColors.applyTheme(themeState.isDarkTheme);
        SystemChrome.setSystemUIOverlayStyle(AppColors.systemOverlayStyle());
        return Sizer(
          builder: (context, orientation, screenType) {
            return GetMaterialApp(
              navigatorKey: Get.key,
              locale: context.locale,
              supportedLocales: context.supportedLocales,
              localizationsDelegates: context.localizationDelegates,
              defaultTransition: Transition.rightToLeftWithFade,
              debugShowCheckedModeBanner: false,
              initialBinding: NetworkBinding(),
              theme: nativeTheme(
                isDarkModeEnabled: themeState.isDarkTheme,
                appPrimaryColor: themeState.primaryColor,
                primaryColorInt: themeState.pickIntColor,
              ),
              title: "G5 eSIM",
              home: SplashScreen(),
              builder: (innerContext, child) {
                final mediaQuery = MediaQuery.of(innerContext);
                final clampedTextScaler = mediaQuery.textScaler.clamp(
                  minScaleFactor: 1.0,
                  maxScaleFactor: 1.2,
                );
                return MediaQuery(
                  data: mediaQuery.copyWith(textScaler: clampedTextScaler),
                  child: BlocListener<ConnectivityBloc, ConnectivityState>(
                    listener: (context, state) {
                      if (state is Disconnected) {
                        _internetToast ??= toastification.show(
                          context: innerContext,
                          type: ToastificationType.error,
                          style: ToastificationStyle.fillColored,
                          title: Text(
                            'No internet connection!',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 15.sp,
                            ),
                          ).tr(),
                          alignment: Alignment.topCenter,
                          showIcon: true,
                          primaryColor: Colors.red,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 10,
                          ),
                          margin: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 10,
                          ),
                          borderRadius: BorderRadius.circular(10),
                          closeButtonShowType: CloseButtonShowType.none,
                          autoCloseDuration: const Duration(seconds: 2),
                          animationDuration: const Duration(seconds: 1),
                          animationBuilder:
                              (context, animation, alignment, child) {
                                return child;
                              },
                        );
                      } else if (state is Connected) {
                        if (_internetToast != null) {
                          toastification.dismiss(_internetToast!);
                          _internetToast = null;

                          toastification.show(
                            autoCloseDuration: const Duration(seconds: 2),
                            context: innerContext,
                            type: ToastificationType.success,
                            style: ToastificationStyle.fillColored,
                            title: Text(
                              'Internet is back!',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 15.sp,
                              ),
                            ).tr(),
                            alignment: Alignment.topCenter,
                            showIcon: true,
                            primaryColor: Colors.green,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 10,
                            ),
                            margin: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 10,
                            ),
                            borderRadius: BorderRadius.circular(10),
                          );
                        }
                      }
                    },
                    child: child!,
                  ),
                );
              },
            );
          },
        );
      },
    );
  }
}
