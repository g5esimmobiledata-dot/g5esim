import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/utills/image.dart';
import 'package:esimconnect/views/onBoardModule/controller/onboardController.dart';
import 'package:esimconnect/views/onBoardModule/view/buttonWithPercentIndecator.dart';
import 'package:esimconnect/views/onBoardModule/view/pageItems.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sizer/sizer.dart';
import '../../../utills/global.dart' as global;
import '../../navbarModule/views/bottomNavBarScreen.dart';

String kOnboardingSeen = "onboarding_seen";

class OnBoardingScreen extends StatelessWidget {
  OnBoardingScreen({super.key});
  final onboardcontroller = Get.find<OnBoardController>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.appBackground,
      body: GetBuilder<OnBoardController>(
        builder: (onboardcontroller) {
          return Stack(
            children: [
              Positioned.fill(
                child: PageView(
                  physics: const NeverScrollableScrollPhysics(),
                  controller: onboardcontroller.pagecontroller,
                  children: [
                    PageItem(
                      imagePath: Images.connectAnyWhare,
                      head: "Connect Anywhere",
                      intro:
                          "Stay connected in over 200+ countries with instant eSIM activation, no physical SIM needed.",
                    ),
                    PageItem(
                      imagePath: Images.activeInMinutes,
                      head: "Activate in Minutes",
                      intro:
                          "Buy and install your eSIM directly from the app - travel ready in just a few taps.",
                    ),
                    PageItem(
                      imagePath: Images.manageyourPlans,
                      head: "Almost Done...!\nManage Your Plans",
                      intro:
                          "Track data usage, recharge instantly, and switch between plans anytime, anywhere.",
                    ),
                  ],
                  onPageChanged: (value) {
                    onboardcontroller.percent = (value + 1) * 1 / 3;
                    onboardcontroller.currentPage = value;
                    if (onboardcontroller.percent == 1.0) {
                      onboardcontroller.govalue = true;
                    }
                    onboardcontroller.update();
                  },
                ),
              ),
              Positioned(
                left: 5.w,
                right: 5.w,
                bottom: MediaQuery.paddingOf(context).bottom + 3.h,
                child: ButtonWithLinearPercentIndicator(
                  onTap: () async {
                    onboardcontroller.pagecontroller.nextPage(
                      duration: const Duration(milliseconds: 500),
                      curve: Curves.easeOut,
                    );
                    onboardcontroller.update();
                    if (onboardcontroller.govalue == true) {
                      final prefs = await SharedPreferences.getInstance();
                      await prefs.setBool(kOnboardingSeen, true);
                      await prefs.setString("Currency", "\$");
                      global.activeCurrencysymbol = prefs.getString(
                        "Currency",
                      );
                      Get.off(() => BottomNavigationBarScreen(index: 0));
                    }
                  },
                  percent: onboardcontroller.percent,
                  child: Text(
                    "Next",
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                      fontWeight: FontWeight.w400,
                      fontSize: 16.sp,
                      color: AppColors.whiteColor,
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
