import 'dart:developer';
import 'package:esimconnect/utills/UserService.dart';
import 'package:esimconnect/utills/image.dart';
import 'package:esimconnect/views/onBoardModule/view/onboardScreen.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:esimconnect/views/navbarModule/views/bottomNavBarScreen.dart';
import 'package:esimconnect/utills/global.dart' as global;
import '../../../utills/notificationUtils.dart';
import '../../profileMoulde/userProfileModule/supportmodule/views/SupportChatScreen.dart';
import '../../profileMoulde/userProfileModule/virtualNumberModule/views/IncomingCallScreen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({Key? key}) : super(key: key);

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  bool _notificationHandled = false;

  @override
  void initState() {
    super.initState();
    if (kIsWeb) {
      _navigateAfterDelay();
    } else {
      _setupFCMHandlers();
    }
    _fetcCurrency();
  }

  void _fetcCurrency() async {
    global.sp = await SharedPreferences.getInstance();
    global.activeCurrencysymbol = global.sp!.getString("Currency");
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.iOS) {
      await FirebaseMessaging.instance.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );
    }
  }

  Future<void> _navigateAfterDelay({bool fromNotification = false}) async {
    if (_notificationHandled && !fromNotification) {
      return;
    }
    await Future.delayed(const Duration(seconds: 5));
    final prefs = await SharedPreferences.getInstance();
    final bool onboardingSeen = prefs.getBool(kOnboardingSeen) ?? false;
    final userService = UserService.to;
    await userService.loadUserData();
    if (!onboardingSeen) {
      Get.off(() => OnBoardingScreen());
      return;
    }

    Get.off(() => BottomNavigationBarScreen(index: 0));
  }

  void _setupFCMHandlers() {
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      final type = message.data['type'];
      if (type == "ticket_reply") {
        if (global.isInSupportScreen == false) {
          NotificationUtils().showNotification(message);
        } else {
          log('in support screen');
        }
      } else {
        NotificationUtils().showNotification(message);
      }
    });

    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      _handleNotificationTap(message);
    });

    FirebaseMessaging.instance.getInitialMessage().then((
      RemoteMessage? message,
    ) {
      if (message != null) {
        _handleNotificationTap(message);
      } else {
        _navigateAfterDelay();
      }
    });
  }

  void _handleNotificationTap(RemoteMessage message) {
    _notificationHandled = true;
    final type = message.data['type'];
    if (type == 'ticket_reply') {
      Future.delayed(const Duration(milliseconds: 500), () {
        Get.off(() => BottomNavigationBarScreen(index: 0))?.then((_) {
          Get.to(
            () => SupportChatScreen(
              ticketId: message.data['ticketId'],
              istileRequired: false,
            ),
          );
        });
      });
    } else if (isIncomingCallNotificationData(
      Map<String, dynamic>.from(message.data),
    )) {
      Future.delayed(const Duration(milliseconds: 500), () {
        Get.off(() => BottomNavigationBarScreen(index: 0))?.then((_) {
          Get.to(
            () => IncomingCallScreen(
              callData: Map<String, dynamic>.from(message.data),
            ),
          );
        });
      });
    } else {
      _navigateAfterDelay(fromNotification: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF061226),
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF001B46), Color(0xFF061226)],
          ),
        ),
        child: Center(
          child: Image.asset(
            Images.splashScreenImage,
            width: double.infinity,
            height: double.infinity,
            fit: BoxFit.cover,
          ),
        ),
      ),
    );
  }
}
