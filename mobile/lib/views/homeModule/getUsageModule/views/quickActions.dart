import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:sizer/sizer.dart';
import 'package:esimconnect/utills/appColors.dart';

class QuickAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onpressed;
  const QuickAction({
    super.key,
    required this.icon,
    required this.label,
    required this.onpressed,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 22.w,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          InkWell(
            onTap: onpressed,
            borderRadius: BorderRadius.circular(100.w),
            child: Container(
              padding: EdgeInsets.all(3.w),
              decoration: BoxDecoration(
                color: AppColors.appSurfaceAlt,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.appBorder, width: 0.7),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primaryColor.withOpacity(0.12),
                    blurRadius: 14,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Icon(icon, color: AppColors.primaryColor, size: 22.sp),
            ),
          ),
          SizedBox(height: 2.w),
          Text(
            label,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium!.copyWith(
              fontSize: 12,
              color: AppColors.appTextSecondary,
              fontWeight: FontWeight.normal,
            ),
            maxLines: 2,
          ).tr(),
        ],
      ),
    );
  }
}
