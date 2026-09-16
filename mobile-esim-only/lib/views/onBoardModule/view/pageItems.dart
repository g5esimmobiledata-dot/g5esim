// ignore_for_file: must_be_immutable
import 'dart:math' as math;

import 'package:esimconnect/utills/appColors.dart';
import 'package:flutter/material.dart';
import 'package:sizer/sizer.dart';

class PageItem extends StatelessWidget {
  String imagePath;
  String head;
  double? imageheight;
  String intro;
  PageItem({
    super.key,
    this.imageheight,
    required this.head,
    required this.intro,
    required this.imagePath,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        Image.asset(
          imagePath,
          height: imageheight,
          width: double.infinity,
          fit: BoxFit.cover,
          alignment: Alignment.center,
        ),
        const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Color(0x33070B1F),
                Color(0x00070B1F),
                Color(0xCC070B1F),
              ],
              stops: [0.0, 0.42, 1.0],
            ),
          ),
        ),
        Positioned(
          left: 6.w,
          right: 6.w,
          bottom:
              MediaQuery.paddingOf(context).bottom + math.max(96.0, 12.h),
          child: ConstrainedBox(
            constraints: BoxConstraints(maxHeight: 34.h),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Flexible(
                  child: Text(
                    head,
                    style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                      fontSize: 20.sp,
                      fontWeight: FontWeight.normal,
                      color: AppColors.whiteColor,
                      shadows: const [
                        Shadow(
                          blurRadius: 12,
                          color: Color(0x99000000),
                          offset: Offset(0, 2),
                        ),
                      ],
                    ),
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                  ),
                ),
                SizedBox(height: 2.h),
                Flexible(
                  child: Text(
                    intro,
                    style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                      fontSize: 13.sp,
                      fontWeight: FontWeight.w400,
                      color: AppColors.whiteColor.withOpacity(0.92),
                      height: 1.4,
                      shadows: const [
                        Shadow(
                          blurRadius: 10,
                          color: Color(0x99000000),
                          offset: Offset(0, 2),
                        ),
                      ],
                    ),
                    maxLines: 4,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
