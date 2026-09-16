import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:flutter/material.dart';
import 'package:sizer/sizer.dart';

class BottomContainer extends StatelessWidget {
  final String imagepath;
  final String label;
  const BottomContainer({
    super.key,
    required this.imagepath,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 22.w,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            padding: EdgeInsets.all(3.w),
            decoration: BoxDecoration(
              color: AppColors.appSurfaceAlt,
              border: Border.all(width: 0.7, color: AppColors.appBorder),
              shape: BoxShape.circle,
            ),
            child: Image.asset(
              imagepath,
              height: 24.sp,
              color: AppColors.primaryColor,
            ),
          ),
          SizedBox(height: 2.w),
          Text(
            label,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium!.copyWith(
              fontSize: 15.sp,
              color: AppColors.appTextSecondary,
            ),
            maxLines: 2,
          ).tr(),
        ],
      ),
    );
  }
}
