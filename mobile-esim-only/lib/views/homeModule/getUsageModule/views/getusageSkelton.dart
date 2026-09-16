import 'package:flutter/material.dart';
import 'package:sizer/sizer.dart';
import 'package:skeletonizer/skeletonizer.dart';

class GetUsageCardSkeleton extends StatelessWidget {
  const GetUsageCardSkeleton({super.key});
  @override
  Widget build(BuildContext context) {
    return Skeletonizer(
      enabled: true, // Always show skeleton placeholders
      child: Container(
        height: 38.h,
        margin: EdgeInsets.symmetric(horizontal: 4.w, vertical: 2.w),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(2.w),
          gradient: const LinearGradient(
            colors: [Color(0xFFE3F2FD), Color(0xFFFFF3E0)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.grey.withOpacity(0.2),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 25.w,
                  height: 14,
                  color: Colors.grey, // skeleton placeholder
                ),
                const Spacer(),
                Container(
                  width: 20.w,
                  height: 5.w,
                  decoration: BoxDecoration(
                    color: Colors.grey,
                    borderRadius: BorderRadius.circular(20),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 5),
            Row(
              children: [
                Container(width: 25.w, height: 14, color: Colors.grey),
                const Spacer(),
                Container(
                  width: 6.w,
                  height: 6.w,
                  decoration: const BoxDecoration(
                    color: Colors.grey,
                    shape: BoxShape.circle,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 5),
            Row(
              children: [
                Container(width: 20, height: 20, color: Colors.grey),
                const SizedBox(width: 8),
                Container(width: 60, height: 14, color: Colors.grey),
                const Spacer(),
                Container(width: 50, height: 14, color: Colors.grey),
              ],
            ),
            const SizedBox(height: 5),
            Container(width: double.infinity, height: 6, color: Colors.grey),
            const SizedBox(height: 5),
            Container(width: 150, height: 14, color: Colors.grey),
            const SizedBox(height: 5),
            Divider(color: Colors.grey.shade300),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                Column(
                  children: [
                    Container(width: 40, height: 40, color: Colors.grey),
                    const SizedBox(height: 8),
                    Container(width: 60, height: 14, color: Colors.grey),
                  ],
                ),
                Container(height: 50, width: 1, color: Colors.grey.shade300),
                Column(
                  children: [
                    Container(width: 40, height: 40, color: Colors.grey),
                    const SizedBox(height: 8),
                    Container(width: 60, height: 14, color: Colors.grey),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
