import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:sizer/sizer.dart';

class ApiFailureWidget extends StatelessWidget {
  final String? error;
  final VoidCallback onRetry;

  const ApiFailureWidget({Key? key, this.error, required this.onRetry})
    : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error, color: Colors.red.shade400, size: 48),
            const SizedBox(height: 16),
            Text(
              error ?? 'An unknown error occurred.'.tr(),
              maxLines: 2,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                color: Colors.red.shade700,
                fontSize: 16.sp,
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry').tr(),
              style: ElevatedButton.styleFrom(foregroundColor: Colors.white),
            ),
          ],
        ),
      ),
    );
  }
}
