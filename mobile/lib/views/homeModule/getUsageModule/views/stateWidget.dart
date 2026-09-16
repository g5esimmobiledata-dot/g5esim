import 'package:flutter/material.dart';
import 'package:percent_indicator/circular_percent_indicator.dart';
import 'package:sizer/sizer.dart';
import 'package:esimconnect/utills/appColors.dart';

class StatWidget extends StatelessWidget {
  final String icon;
  final String label;
  final double percent;
  const StatWidget({
    super.key,
    required this.icon,
    required this.label,
    required this.percent,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        CircularPercentIndicator(
          radius: 22.0,
          lineWidth: 3.0,
          percent: percent,
          center: Image.asset(icon, height: 5.w, color: AppColors.blackColor),
          progressColor: AppColors.greenColor,
        ),
        SizedBox(width: 3.w),
        Text(
          label,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodyMedium!.copyWith(
            fontSize: 15.sp,
            fontWeight: FontWeight.normal,
          ),
        ),
      ],
    );
  }
}
