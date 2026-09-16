import 'package:flutter/material.dart';
import 'package:sizer/sizer.dart';

import '../../../../utills/global.dart' as global;

class StatusTag extends StatelessWidget {
  final String status;

  const StatusTag({Key? key, required this.status}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final backgroundColor = global.getBackgroundColor(status);
    final foregroundColor = global.getForegroundColor(status);

    return Container(
      padding: EdgeInsets.symmetric(horizontal: 3.w, vertical: 1.5.w),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(100.0),
        boxShadow: [
          BoxShadow(
            color: backgroundColor.withOpacity(0.3),
            spreadRadius: 1,
            blurRadius: 5,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Text(
        status.replaceAll('_', ' ').firstLetterToUpper(),
        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
          fontSize: 12.sp,
          fontWeight: FontWeight.normal,
          color: foregroundColor,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}
