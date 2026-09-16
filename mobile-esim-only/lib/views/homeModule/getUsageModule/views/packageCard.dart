import 'package:esimconnect/utills/global.dart' as global;
import 'package:esimconnect/views/homeModule/getUsageModule/model/dataUsage_Model.dart';
import 'package:esimconnect/widgets/custiomOutlinedButton.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:percent_indicator/linear_percent_indicator.dart';
import 'package:sizer/sizer.dart';
import 'package:easy_localization/easy_localization.dart';

class PackageDetailCard extends StatelessWidget {
  final Datum datum;
  final Usage usage;
  final bool? isloadingState;
  final VoidCallback onCardTap;

  const PackageDetailCard({
    super.key,
    required this.datum,
    required this.usage,
    this.isloadingState = false,
    required this.onCardTap,
  });

  IconData _getStatusIcon(String? status) {
    switch (status?.toLowerCase()) {
      case 'active':
        return Icons.check_circle;
      case 'expired':
        return Icons.cancel;
      case 'suspended':
        return Icons.pause_circle;
      case 'not_active':
      case 'inactive':
        return Icons.circle_outlined;
      default:
        return Icons.help_outline;
    }
  }

  Color _getStatusColor(String? status) {
    switch (status?.toLowerCase()) {
      case 'active':
        return Colors.green;
      case 'expired':
        return Colors.red;
      case 'suspended':
        return Colors.orange;
      case 'not_active':
      case 'inactive':
        return Colors.blueGrey;

      default:
        return Colors.grey;
    }
  }

  Color _getTimeRemainingColor(DateTime? expiresAt) {
    if (expiresAt == null) return Colors.grey;
    final difference = expiresAt.difference(DateTime.now());

    if (difference.inSeconds <= 0) {
      return Colors.red;
    } else if (difference.inDays <= 1) {
      return Colors.orange;
    } else {
      return Colors.green;
    }
  }

  Color _getProgressColor(double percent) {
    if (percent >= 0.9) return Colors.red;
    if (percent >= 0.7) return Colors.orange;
    if (percent >= 0.5) return Colors.amber;
    return Colors.green;
  }

  @override
  Widget build(BuildContext context) {
    // Calculate USED data instead of remaining
    final dataUsed = (usage.dataTotal ?? 0) - (usage.dataRemaining ?? 0);
    final voiceUsed = (usage.voiceTotal ?? 0) - (usage.voiceRemaining ?? 0);
    final textUsed = (usage.textTotal ?? 0) - (usage.textRemaining ?? 0);

    // Calculate USED percentage (0% = none used, 100% = all used)
    final dataUsedPercent = usage.dataTotal != null && usage.dataTotal! > 0
        ? dataUsed / usage.dataTotal!
        : 0;

    final voiceUsedPercent = usage.voiceTotal != null && usage.voiceTotal! > 0
        ? voiceUsed / usage.voiceTotal!
        : 0;

    final textUsedPercent = usage.textTotal != null && usage.textTotal! > 0
        ? textUsed / usage.textTotal!
        : 0;

    return Container(
      margin: EdgeInsets.symmetric(vertical: 0.5.w, horizontal: 1.w),
      padding: EdgeInsets.all(1.w),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(4.w),
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('ICCID: ${datum.iccid} copied')),
                    );
                  },
                  child: Row(
                    children: [
                      Container(
                        padding: EdgeInsets.all(1.w),
                        decoration: BoxDecoration(
                          color: Get.theme.primaryColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(
                          Icons.sim_card,
                          size: 18.sp,
                          color: Get.theme.primaryColor,
                        ),
                      ),
                      SizedBox(width: 2.w),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'eSIM ID',
                              style: Get.textTheme.labelSmall?.copyWith(
                                color: Colors.grey.shade600,
                                fontSize: 13.sp,
                              ),
                            ).tr(),
                            Text(
                              datum.iccid ?? 'N/A',
                              style: Get.textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.normal,
                                fontSize: 15.sp,
                                color: Colors.grey.shade900,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              SizedBox(width: 2.w),

              // Status Icon
              Tooltip(
                message: usage.status?.replaceAll('_', ' ') ?? 'Unknown',
                child: Container(
                  padding: EdgeInsets.all(0.8.w),
                  decoration: BoxDecoration(
                    color: _getStatusColor(usage.status).withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    _getStatusIcon(usage.status),
                    size: 18.sp,
                    color: _getStatusColor(usage.status),
                  ),
                ),
              ),

              SizedBox(width: 2.w),

              // Top Up Button
              if (usage.status?.toLowerCase() == 'active')
                CustomOutlinedButton(
                  padding: EdgeInsets.symmetric(
                    horizontal: 1.w,
                    vertical: 0.3.w,
                  ),
                  onPressed: onCardTap,
                  text: tr("Top Up"),
                  fontSize: 15.sp,
                  borderRadius: 1.w,
                  textColor: Get.theme.primaryColor,
                  borderColor: Get.theme.primaryColor,
                ),
            ],
          ),

          SizedBox(height: 2.h),

          // Data Usage Section - SHOWING USED/TOTAL
          Container(
            padding: EdgeInsets.all(2.w),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.data_usage,
                          size: 18.sp,
                          color: Get.theme.primaryColor,
                        ),
                        SizedBox(width: 2.w),
                        Text(
                          'Data',
                          style: Get.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.normal,
                            fontSize: 15.sp,
                            color: Colors.grey.shade800,
                          ),
                        ).tr(),
                      ],
                    ),
                    // CHANGED: Show USED/TOTAL instead of REMAINING/TOTAL
                    Text(
                      '${global.formatDataUsage(dataUsed.toString())} / ${global.formatDataUsage(usage.dataTotal?.toString() ?? '0')}',
                      style: Get.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.normal,
                        color: Get.theme.primaryColor,
                        fontSize: 14.sp,
                      ),
                    ),
                  ],
                ),

                SizedBox(height: 1.h),

                Row(
                  children: [
                    Expanded(
                      child: LinearPercentIndicator(
                        lineHeight: 0.8.h,
                        percent: dataUsedPercent.clamp(0.0, 1.0).toDouble(),
                        progressColor: _getProgressColor(
                          double.tryParse(dataUsedPercent.toString()) ?? 0.0,
                        ),
                        backgroundColor: Colors.grey.shade300,
                        barRadius: Radius.circular(10),
                        padding: EdgeInsets.zero,
                      ),
                    ),
                    SizedBox(width: 2.w),
                    // CHANGED: Show USED percentage instead of remaining
                    Text(
                      '${(dataUsedPercent * 100).toStringAsFixed(0)}%',
                      style: Get.textTheme.labelSmall?.copyWith(
                        fontWeight: FontWeight.normal,
                        fontSize: 13.sp,
                        color: Colors.grey.shade700,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          SizedBox(height: 1.5.h),

          // Voice & SMS Row - SHOWING USED/TOTAL
          Row(
            children: [
              Expanded(
                child: _buildCompactUsageItem(
                  icon: Icons.call,
                  label: 'Voice',
                  used: voiceUsed,
                  total: usage.voiceTotal ?? 0,
                  usedPercent:
                      double.tryParse(voiceUsedPercent.toString()) ?? 0.0,
                ),
              ),
              Container(width: 1, height: 4.h, color: Colors.grey.shade300),
              Expanded(
                child: _buildCompactUsageItem(
                  icon: Icons.message,
                  label: 'SMS',
                  used: textUsed,
                  total: usage.textTotal ?? 0,
                  usedPercent:
                      double.tryParse(textUsedPercent.toString()) ?? 0.0,
                ),
              ),
            ],
          ),

          SizedBox(height: 1.h),

          // Validity Row
          Row(
            children: [
              Expanded(
                child: _buildValidityItem(
                  icon: Icons.calendar_today,
                  label: 'Activated',
                  date: usage.activatedAt,
                ),
              ),
              Container(width: 1, height: 4.h, color: Colors.grey.shade300),
              Expanded(
                child: _buildValidityItem(
                  icon: Icons.timer,
                  label: 'Expires',
                  date: usage.expiresAt,
                  isExpiry: true,
                ),
              ),
            ],
          ),

          // Unlimited Badge (if applicable)
          if (usage.isUnlimited == true)
            Container(
              margin: EdgeInsets.only(top: 0.5.h),
              padding: EdgeInsets.symmetric(horizontal: 3.w, vertical: 0.6.h),
              decoration: BoxDecoration(
                color: Colors.green.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.all_inclusive, size: 15.sp, color: Colors.green),
                  SizedBox(width: 1.w),
                  Text(
                    'Unlimited Data',
                    style: Get.textTheme.labelSmall?.copyWith(
                      color: Colors.green,
                      fontWeight: FontWeight.normal,
                      fontSize: 15.sp,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildCompactUsageItem({
    required IconData icon,
    required String label,
    required int used,
    required int total,
    required double usedPercent,
  }) {
    return Container(
      padding: EdgeInsets.all(1.5.w),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(icon, size: 16.sp, color: Colors.grey.shade700),
                  SizedBox(width: 1.w),
                  Text(
                    label,
                    style: Get.textTheme.labelMedium?.copyWith(
                      fontWeight: FontWeight.normal,
                      fontSize: 15.sp,
                      color: Colors.grey.shade800,
                    ),
                  ).tr(),
                ],
              ),
              // CHANGED: Show USED instead of remaining
              Text(
                '$used / $total',
                style: Get.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.normal,
                  fontSize: 15.sp,
                  color: Get.theme.primaryColor,
                ),
              ),
            ],
          ),
          SizedBox(height: 0.5.h),
          LinearPercentIndicator(
            lineHeight: 0.4.h,
            percent: usedPercent.clamp(0.0, 1.0).toDouble(),
            progressColor: _getProgressColor(usedPercent),
            backgroundColor: Colors.grey.shade300,
            barRadius: Radius.circular(10),
            padding: EdgeInsets.zero,
          ),
        ],
      ),
    );
  }

  Widget _buildValidityItem({
    required IconData icon,
    required String label,
    required DateTime? date,
    bool isExpiry = false,
  }) {
    final remainingColor = isExpiry
        ? _getTimeRemainingColor(date)
        : Colors.grey;

    return Container(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Badge-style header
          Container(
            padding: EdgeInsets.symmetric(horizontal: 4.w, vertical: 0.5.h),
            margin: EdgeInsets.symmetric(horizontal: 0.5.w),
            decoration: BoxDecoration(
              color: isExpiry
                  ? remainingColor.withOpacity(0.1)
                  : Colors.blueGrey.withOpacity(0.1),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  icon,
                  size: 14.sp,
                  color: isExpiry ? remainingColor : Colors.blueGrey,
                ),
                SizedBox(width: 1.w),
                Text(
                  label,
                  style: Get.textTheme.labelSmall?.copyWith(
                    fontWeight: FontWeight.normal,
                    fontSize: 14.sp,
                    color: isExpiry ? remainingColor : Colors.blueGrey,
                  ),
                ).tr(),
              ],
            ),
          ),

          SizedBox(height: 0.6.h),

          // Date in large, bold text
          Container(
            margin: EdgeInsets.symmetric(horizontal: 2.w),
            child: Text(
              date != null
                  ? DateFormat('dd MMM yyyy').format(date)
                  : '-- / -- / ----',
              style: Get.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.normal,
                fontSize: 15.sp,
                color: Colors.black,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
