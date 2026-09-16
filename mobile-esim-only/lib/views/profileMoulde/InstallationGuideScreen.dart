import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:flutter/material.dart';
import 'package:sizer/sizer.dart';

class InstallationGuideScreen extends StatelessWidget {
  const InstallationGuideScreen({super.key});

  Widget _buildStep(BuildContext context, int stepNumber, String text) {
    return Container(
      margin: EdgeInsets.symmetric(vertical: 1.h),
      padding: EdgeInsets.all(3.w),
      decoration: BoxDecoration(
        color: Colors.yellow.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.primaryColor.withOpacity(0.8)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 35,
            height: 35,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AppColors.primaryColor,
              shape: BoxShape.circle,
            ),
            child: Text(
              "$stepNumber",
              style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                fontSize: 15.sp,
                color: AppColors.whiteColor,
                fontWeight: FontWeight.normal,
              ),
            ),
          ),
          SizedBox(width: 3.w),
          // Step text
          Expanded(
            child: Text(
              text,
              style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                fontSize: 15.sp,
                color: AppColors.textColor,
                fontWeight: FontWeight.normal,
              ),
            ).tr(),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.scaffoldbackgroudColor,
      body: CustomScrollView(
        slivers: <Widget>[
          SliverAppBar(
            backgroundColor: AppColors.primaryColor,
            pinned: true,
            expandedHeight: 230,
            title: Text("ESim Installation Guide").tr(),
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                color: AppColors.blackColor,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Container(
                      width: 120,
                      height: 120,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: Color(0xFF002A3A),
                        border: Border.all(
                          color: AppColors.whiteColor,
                          width: 0.2,
                        ),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.link,
                        color: AppColors.whiteColor,
                        size: 20.w,
                      ),
                    ),
                    SizedBox(height: 5.h),
                  ],
                ),
              ),
            ),
          ),

          SliverList(
            delegate: SliverChildListDelegate([
              SizedBox(height: 4.h),
              Padding(
                padding: EdgeInsets.symmetric(horizontal: 4.w),
                child: Column(
                  children: [
                    _buildStep(
                      context,
                      1,
                      "Ensure your device supports eSIM functionality.",
                    ),
                    _buildStep(
                      context,
                      2,
                      "Connect to a stable Wi-Fi network.",
                    ),
                    _buildStep(
                      context,
                      3,
                      "Go to Settings > Mobile Data > Add eSIM.",
                    ),
                    _buildStep(
                      context,
                      4,
                      "Scan the provided QR code or enter the activation details.",
                    ),
                    _buildStep(
                      context,
                      5,
                      "Wait for the eSIM to activate (may take a few minutes).",
                    ),
                  ],
                ),
              ),
              Padding(
                padding: EdgeInsets.symmetric(horizontal: 4.w, vertical: 2.h),
                child: Container(
                  padding: EdgeInsets.all(3.w),
                  decoration: BoxDecoration(
                    color: Colors.yellow.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.darkYellow),
                  ),
                  child: Text(
                    "Note: Keep your device connected",
                    style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                      fontSize: 15.sp,
                      color: AppColors.textColor,
                      fontWeight: FontWeight.normal,
                    ),
                  ).tr(),
                ),
              ),
              SizedBox(height: 15.h),
            ]),
          ),
        ],
      ),
    );
  }
}
