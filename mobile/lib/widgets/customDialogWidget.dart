import 'package:esimconnect/utills/appColors.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:sizer/sizer.dart';

void showCustomDialog({
  String? title,
  String? subtitle,
  String? primaryButtonText,
  TextStyle? primaryButtonTextStyle,
  Color? secondaryButtonColor,
  Color? primaryButtonColor,
  required VoidCallback? onPrimaryPressed,
  String? secondaryButtonText,
  TextStyle? secondaryButtonTextStyle,
  VoidCallback? onSecondaryPressed,
}) {
  Get.dialog(
    Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (title != null)
              Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  title,
                  style: Get.theme.textTheme.bodyMedium!.copyWith(
                    fontSize: 17.sp,
                    fontWeight: FontWeight.normal,
                  ),
                  textAlign: TextAlign.start,
                ),
              ),
            if (subtitle != null) ...[
              const SizedBox(height: 10),
              Text(
                subtitle,
                style: Get.theme.textTheme.bodyMedium!.copyWith(
                  fontWeight: FontWeight.w400,
                  fontSize: 16.sp,
                  color: Colors.grey[700],
                ),
                textAlign: TextAlign.start,
              ),
            ],
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (secondaryButtonText != null)
                  TextButton(
                    style: TextButton.styleFrom(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      side: BorderSide(
                        color: secondaryButtonColor ?? AppColors.primaryColor,
                      ),
                    ),
                    onPressed: onSecondaryPressed ?? () => Get.back(),
                    child: Text(
                      secondaryButtonText,
                      style:
                          secondaryButtonTextStyle ??
                          TextStyle(
                            color:
                                secondaryButtonColor ?? AppColors.primaryColor,
                          ),
                    ),
                  ),
                SizedBox(width: 3.w),
                if (primaryButtonText != null)
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    onPressed: onPrimaryPressed ?? () => Get.back(),
                    child: Text(
                      primaryButtonText,
                      style:
                          primaryButtonTextStyle ??
                          TextStyle(
                            color: secondaryButtonColor ?? Colors.white,
                          ),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    ),
    barrierDismissible: false,
  );
}
