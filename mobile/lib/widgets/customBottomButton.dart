import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:sizer/sizer.dart';

class CustomBottomButton extends StatelessWidget {
  final String title;
  final VoidCallback? onTap;
  final double? height;
  final double? fontSize;

  final bool isLoading;

  const CustomBottomButton({
    Key? key,
    required this.title,
    this.fontSize,
    this.height,
    required this.onTap,
    this.isLoading = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: isLoading ? null : onTap,
      child: ConstrainedBox(
        constraints: BoxConstraints(minHeight: height ?? 48),
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.primaryColor,
            borderRadius: BorderRadius.circular(2.w),
          ),
          alignment: Alignment.center,
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: isLoading
              ? SizedBox(
                  height: 18,
                  width: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                )
              : Text(
                  title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: Get.theme.textTheme.titleMedium!.copyWith(
                    fontSize: fontSize ?? 15,
                    fontWeight: FontWeight.normal,
                    letterSpacing: 0,
                    color: Colors.white,
                  ),
                ).tr(),
        ),
      ),
    );
  }
}
