import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:flutter/material.dart';
import 'package:sizer/sizer.dart';

class CustomElevatedButton extends StatelessWidget {
  final VoidCallback? onPressed;
  final String? text;
  final Color? backgroundColor;
  final Color? foregroundColor;
  final EdgeInsetsGeometry? padding;
  final double borderRadius;
  final double elevation;
  final TextStyle? textStyle;
  final double? width;
  final double? height;
  final CircularProgressIndicator? progressIndicator;

  const CustomElevatedButton({
    super.key,
    required this.onPressed,
    this.text,
    this.backgroundColor,
    this.foregroundColor,
    this.padding,
    this.borderRadius = 10.0,
    this.elevation = 0,
    this.textStyle,
    this.width,
    this.height = 42,
    this.progressIndicator,
  });

  @override
  Widget build(BuildContext context) {
    final bool isLoading = text == null || text!.isEmpty;

    return ConstrainedBox(
      constraints: BoxConstraints(minHeight: height ?? 48),
      child: SizedBox(
      width: width,
      child: ElevatedButton(
        onPressed: onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: backgroundColor ?? AppColors.primaryColor,
          foregroundColor: foregroundColor ?? Colors.white,
          padding: padding,
          minimumSize: Size(0, height ?? 48),
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(borderRadius),
          ),
          elevation: elevation,
        ),
        child: isLoading
            ? progressIndicator ??
                  SizedBox(
                    width: 10.w,
                    height: 10.w,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
            : Text(
                text!,
                style: textStyle,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
              ).tr(),
      ),
      ),
    );
  }
}
