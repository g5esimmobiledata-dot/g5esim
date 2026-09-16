import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:sizer/sizer.dart';
import 'package:esimconnect/views/homeModule/kycFormModule/view/KycFormScreen.dart';
import 'package:skeletonizer/skeletonizer.dart';

class KycNotificationWidget extends StatelessWidget {
  final String kycStatus;
  final bool isLoading;

  const KycNotificationWidget({
    super.key,
    required this.kycStatus,
    this.isLoading = false,
  });
  static const Color _approvedColor = Color(0xFF28A745);
  static const Color _rejectedColor = Color(0xFFDC3545);
  static const Color _pendingColor = Color(0xFFFFC107);
  static const Color _notAppliedColor = Color(0xFF007BFF);

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'approved':
        return _approvedColor;
      case 'rejected':
        return _rejectedColor;
      case 'pending':
        return _pendingColor;
      case 'submitted':
        return _notAppliedColor;
      default:
        return _notAppliedColor;
    }
  }

  String _getStatusTitle(String status) {
    switch (status.toLowerCase()) {
      case 'approved':
        return tr("Congratulations! Application Approved");
      case 'rejected':
        return tr('Application Rejected');
      case 'submitted':
        return tr('Application Pending');
      case 'pending':
        return tr("Complete Your KYC");
      default:
        return tr("Complete Your KYC");
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status.toLowerCase()) {
      case 'approved':
        return Icons.check_circle_outline;
      case 'rejected':
        return Icons.cancel_outlined;
      case 'pending':
        return Icons.pending_outlined;
      default:
        return Icons.info_outline;
    }
  }

  bool _isActionable(String status) {
    return status.toLowerCase() == 'rejected' ||
        status.toLowerCase() == 'not applied';
  }

  @override
  Widget build(BuildContext context) {
    final color = _getStatusColor(kycStatus);
    final title = _getStatusTitle(kycStatus);
    final subtitle = kycStatus.isEmpty
        ? tr("Start your KYC to enjoy full benefits.")
        : kycStatus;
    final isActionable = _isActionable(kycStatus);
    final icon = _getStatusIcon(kycStatus);

    Widget content = Skeletonizer(
      enabled: isLoading,
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 2.w, vertical: 3.w),
        decoration: BoxDecoration(
          color: color.withOpacity(0.2),
          borderRadius: BorderRadius.circular(1.5.w),
          border: Border.all(color: color, width: 0.5),
        ),
        child: Row(
          children: [
            Icon(icon, color: color, size: 25.sp),
            SizedBox(width: 2.w),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      color: color,
                      fontSize: 16.sp,
                      fontWeight: FontWeight.normal,
                    ),
                  ).tr(),
                  const SizedBox(height: 4),
                  Text(
                    subtitle.capitalizeFirstLetter(),
                    style: TextStyle(color: color, fontSize: 15.sp),
                  ),
                ],
              ),
            ),
            if (isActionable)
              Icon(Icons.chevron_right, color: color, size: 22.sp),
          ],
        ),
      ),
    );
    return InkWell(
      onTap: isActionable
          ? () {
              Get.to(() => KycFormScreen());
            }
          : null,
      child: content,
    );
  }
}

extension StringExtension on String {
  String capitalizeFirstLetter() {
    if (isEmpty) {
      return this;
    }
    return '${this[0].toUpperCase()}${substring(1).toLowerCase()}';
  }
}
