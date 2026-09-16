// ignore_for_file: unnecessary_brace_in_string_interps, unnecessary_string_interpolations

import 'dart:io';
import 'package:country_picker/country_picker.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/utills/config.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lottie/lottie.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:share_plus/share_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sizer/sizer.dart';
import 'package:esimconnect/utills/image.dart';
import 'package:toastification/toastification.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:esimconnect/views/packageModule/regionsList/model/regionDetailsModel.dart';

import 'package:get/get_core/src/get_main.dart';
import 'package:get/get_navigation/src/extension_navigation.dart';
import '../views/profileMoulde/giftCardModule/giftModels/giftHistoryModel.dart';
import 'services/PushTokenService.dart';

SharedPreferences? sp;
AndroidDeviceInfo? androidInfo;
IosDeviceInfo? iosInfo;
var appVersion = "1.0.0";
String? deviceId;
String? appName = "esimconnect";
String? fcmToken;
String? deviceLocation;
String? deviceManufacturer;
String? deviceModel;
String? activeCurrencyname = "USD";
String? activeCurrencysymbol = "\$";
String? defaultCounty = "United States";
bool? isInSupportScreen = false;

DeviceInfoPlugin deviceInfo = DeviceInfoPlugin();

dynamic activeProvider;
String UserkycStatus = '';

String getAppVersion() {
  PackageInfo.fromPlatform().then((PackageInfo packageInfo) {
    appVersion = packageInfo.version;
  });
  return appVersion;
}

Future<String> getPlayStoreLink() async {
  final packageInfo = await PackageInfo.fromPlatform();
  final packageName = packageInfo.packageName;

  return "https://play.google.com/store/apps/details?id=$packageName";
}

Future<String> getPackageName() async {
  final PackageInfo packageInfo = await PackageInfo.fromPlatform();
  return packageInfo.packageName;
}

String getCountryName(String code) {
  try {
    return Country.parse(code).name;
  } catch (e) {
    return 'Unknown';
  }
}

Color getBackgroundColor(String status) {
  switch (status.toLowerCase()) {
    case 'active':
      return const Color(0xFF28A745);
    case 'pending':
      return const Color(0xFFFFC107);
    case 'inactive':
      return const Color(0xFF6C757D);
    default:
      return const Color(0xFFDC3545);
  }
}

Color getForegroundColor(String status) {
  return Colors.white;
}

String formatDataUsage(dynamic input) {
  input = input?.toString();
  if (input == null) return "0 MB";
  input = input.trim().toUpperCase();
  String numericPart = input.replaceAll(RegExp(r'[^\d\.]'), '');
  double? value = double.tryParse(numericPart);
  if (value == null) return "0 MB";

  // If input was already in GB
  if (input.contains("GB")) {
    if (value >= 1) {
      return "${value.toStringAsFixed(value < 10 ? 1 : 0)} GB";
    } else {
      // convert to MB
      return "${(value * 1024).toStringAsFixed(0)} MB";
    }
  }

  // If input was in MB
  if (input.contains("MB")) {
    if (value >= 1024) {
      // convert to GB
      return "${(value / 1024).toStringAsFixed(1)} GB";
    } else {
      return "${value.toStringAsFixed(0)} MB";
    }
  }

  return "${value.toStringAsFixed(0)} MB";
}

String getRegionNames(List<Package> regions) {
  if (regions.isEmpty) return 'N/A';

  if (regions.length == 1) {
    return regions.first.title ?? 'N/A';
  } else if (regions.length <= 3) {
    return regions.map((region) => region.title ?? 'N/A').join(', ');
  } else {
    final firstThree = regions
        .take(3)
        .map((region) => region.title ?? 'N/A')
        .join(', ');
    return '$firstThree +${regions.length - 3} more';
  }
}

// Helper method to get countries count text
String getCountriesCountText(dynamic regionDatailsList) {
  final regions = regionDatailsList.region ?? [];
  final countries = regionDatailsList.country ?? [];

  final totalCountries = regions.length + countries.length;

  if (totalCountries == 0) return '0 Countries Included';
  if (totalCountries == 1) return '1 Country Included';
  return '$totalCountries Countries Included';
}

Future<void> showToastMessage({
  required String message,
  ToastificationStyle? toastificationStyle,
}) async {
  toastification.show(
    type: ToastificationType.info,
    style: toastificationStyle ?? ToastificationStyle.minimal,
    autoCloseDuration: const Duration(seconds: 4),

    title: Text(
      message,
      style: TextStyle(color: AppColors.toastTextColor, fontSize: 15.sp),
    ),
    backgroundColor: AppColors.toastBackgroungColor,
    foregroundColor: AppColors.toastTextColor,
    alignment: Alignment.bottomCenter,
    showIcon: true,
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
    margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
    borderRadius: BorderRadius.circular(10),
  );
}

String buildImageUrl(String? imagePath) {
  final path = imagePath?.trim() ?? '';
  if (path.isEmpty || path.toLowerCase() == 'null') {
    return '';
  }

  // Already a full URL
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // Relative path → prepend base URL
  if (path.startsWith('//')) {
    return 'https:$path';
  }

  if (path.startsWith('/uploads/')) {
    return '$imageBaseUrl$path';
  }

  if (path.startsWith('uploads/')) {
    return '$imageBaseUrl/$path';
  }

  if (isLocalImagePath(path)) {
    return path;
  }

  return path.startsWith('/') ? '$imageBaseUrl$path' : '$imageBaseUrl/$path';
}

bool isLocalImagePath(String? imagePath) {
  final path = imagePath?.trim() ?? '';
  if (path.isEmpty || path.toLowerCase() == 'null') return false;
  if (kIsWeb) return false;
  if (path.startsWith('file://')) return true;
  if (RegExp(r'^[A-Za-z]:[\\/]').hasMatch(path)) return true;
  if (path.startsWith('/')) return File(path).existsSync();
  return false;
}

void copyToClipboard({required BuildContext context, required String text}) {
  Clipboard.setData(ClipboardData(text: text)).then((_) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Referral code copied to clipboard!')),
    );
  });
}

Future<void> launchPlayStore() async {
  const androidPackageName = 'com.g5esim.app';
  const iosAppId = '6752647886';

  final Uri androidUri = Uri.parse("market://details?id=$androidPackageName");
  final Uri androidWebUri = Uri.parse(
    "https://play.google.com/store/apps/details?id=$androidPackageName",
  );
  final Uri iosUri = Uri.parse("itms-apps://apps.apple.com/app/id$iosAppId");
  if (kIsWeb) {
    await launchUrl(androidWebUri, mode: LaunchMode.externalApplication);
  } else if (Platform.isAndroid) {
    if (!await launchUrl(androidUri, mode: LaunchMode.externalApplication)) {
      await launchUrl(androidWebUri, mode: LaunchMode.externalApplication);
    }
  } else if (Platform.isIOS) {
    await launchUrl(iosUri, mode: LaunchMode.externalApplication);
  }
}

void showLoader(BuildContext context) {
  showDialog(
    context: context,
    barrierDismissible: false,
    builder: (_) => Center(
      child: Container(
        height: 60,
        width: 70.w,
        padding: EdgeInsets.all(0),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(2.w),
        ),
        child: Lottie.asset(
          Images.circleLoader,
          width: 80,
          height: 80,
          repeat: true,
        ),
      ),
    ),
  );
}

String referralLink = '';

Future<Map<String, dynamic>> getDeviceDetails() async {
  final details = await PushTokenService.instance.deviceDetailsForLogin();
  fcmToken = details['fcmToken']?.toString();
  deviceId = details['deviceid']?.toString();
  deviceManufacturer = details['deviceManufacture']?.toString();
  deviceModel = details['deviceModel']?.toString();
  appVersion = details['appVersion']?.toString() ?? appVersion;
  return details;
}

Future<void> shareContent({
  required BuildContext context,
  required String text,
  String? subject,
}) async {
  await Share.share(text, subject: subject);
}

Widget showPaginationLoader(BuildContext context) {
  return SizedBox(
    height: 50,
    child: Column(
      children: [
        SizedBox(
          height: 18,
          width: 18,
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
        SizedBox(height: 2.w),
        Text(
          "Hold on Loading content...",
          style: Theme.of(context).textTheme.bodyMedium!.copyWith(
            color: AppColors.textGreyColor,
            fontSize: 15.sp,
          ),
        ),
      ],
    ),
  );
}

String formatPrice(double? price) {
  if (price == null) return 'N/A';
  return price % 1 == 0 ? price.toStringAsFixed(0) : price.toStringAsFixed(1);
}

// Android – QR Code steps
final List<String> androidQRStepKeys = [
  'android_qr_step_1',
  'android_qr_step_2',
  'android_qr_step_3',
  'android_qr_step_4',
  'android_qr_step_5',
  'android_qr_step_6',
];
final List<String> androidManualStepKeys = [
  'android_manual_step_1',
  'android_manual_step_2',
  'android_manual_step_3',
  'android_manual_step_4',
  'android_manual_step_5',
  'android_manual_step_6',
];
final List<String> iosQRStepKeys = [
  'ios_qr_step_1',
  'ios_qr_step_2',
  'ios_qr_step_3',
  'ios_qr_step_4',
  'ios_qr_step_5',
  'ios_qr_step_6',
];
final List<String> iosManualStepKeys = [
  'ios_manual_step_1',
  'ios_manual_step_2',
  'ios_manual_step_3',
  'ios_manual_step_4',
  'ios_manual_step_5',
  'ios_manual_step_6',
];

extension StringExtensionUpper on String {
  String firstLetterToUpper() {
    if (isEmpty) {
      return this;
    }
    return '${this[0].toUpperCase()}${substring(1).toLowerCase()}';
  }
}

Color getStatusColor(String status) {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'in_use':
    case 'active':
      return Colors.green.shade600;

    case 'refunded':
      return Colors.blue.shade600;
    case 'pending':
      return Colors.orange.shade600;
    case 'permanently_failed':
      return Colors.red.shade600;
    case 'failed':
      return Colors.red.shade600;
    case 'not_active':
      return Colors.blue.shade600;
    case 'expired':
      return Colors.grey.shade600;
    default:
      return Colors.grey.shade600;
  }
}

String getStatusText(String status) {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'in_use':
    case 'active':
      return 'active';
    case 'refunded':
      return 'Refunded';
    case 'pending':
      return 'Pending';
    case 'permanently_failed':
      return 'Failed';
    case 'failed':
      return 'Failed';
    case 'not_active':
      return 'Not Active';
    case 'expired':
      return 'Expired';
    default:
      return status;
  }
}

IconData offerIcon(dynamic selectedOffer) {
  final offer = selectedOffer?.toString().split('.').last;
  switch (offer) {
    case 'voucher':
      return Icons.confirmation_num_outlined;
    case 'referral':
      return Icons.group_outlined;
    case 'giftCard':
      return Icons.card_giftcard_outlined;
    default:
      return Icons.local_offer_outlined;
  }
}

String offerTitle(dynamic selectedOffer) {
  final offer = selectedOffer?.toString().split('.').last;
  switch (offer) {
    case 'voucher':
      return "Voucher Applied";
    case 'referral':
      return "Referral Applied";
    case 'giftCard':
      return "Gift Card Applied";
    default:
      return "";
  }
}

IconData getStatusIcon(String status) {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'in_use':
    case 'active':
      return Icons.power;
    case 'refunded':
      return Icons.monetization_on;
    case 'pending':
      return Icons.hourglass_empty;
    case 'permanently_failed':
    case 'failed':
      return Icons.error_outline;
    case 'not_active':
      return Icons.power_off;
    case 'expired':
      return Icons.history_toggle_off;
    default:
      return Icons.info_outline;
  }
}

String formatDate(String? dateString) {
  if (dateString == null) return 'N/A';
  try {
    final date = DateTime.parse(dateString);
    return DateFormat('dd MMM yyyy, hh:mm a').format(date);
  } catch (e) {
    return dateString;
  }
}

String timeZoneformatDate(String? dateString) {
  if (dateString == null) return 'N/A';
  try {
    final DateTime utcDate = DateTime.parse(dateString);
    // Convert UTC → Local timezone (e.g. IST +05:30)
    final DateTime localDate = utcDate.toLocal();
    return DateFormat('dd MMM yyyy, hh:mm a').format(localDate);
  } catch (e) {
    return dateString;
  }
}

String formatCurrency(String? currency, String? price) {
  if (currency == null || price == null) return 'N/A';
  final parsedPrice = double.tryParse(price);
  return '$currency ${parsedPrice != null ? parsedPrice.toStringAsFixed(2) : price}';
}

Widget buildGiftCardItem(GiftCardsDatum item) {
  final isActive = item.status == "active";
  final iconColor = isActive ? AppColors.primaryColor : Colors.grey;
  final statusColor = isActive ? Colors.green : Colors.red;
  final statusText = isActive
      ? tr("ACTIVE")
      : tr(item.status.toString().replaceAll('_', " ").toUpperCase());

  return Container(
    margin: EdgeInsets.only(bottom: 12.sp),
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(20),
      color: Colors.white,
      boxShadow: [
        BoxShadow(
          color: Colors.black.withOpacity(0.08),
          blurRadius: 15,
          offset: Offset(0, 5),
        ),
      ],
    ),
    child: Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () {
          // Handle tap if needed
        },
        child: Padding(
          padding: EdgeInsets.all(16.sp),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 22.sp,
                    height: 22.sp,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        colors: [
                          iconColor.withOpacity(0.1),
                          iconColor.withOpacity(0.05),
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                    ),
                    child: Icon(
                      isActive
                          ? Icons.card_giftcard
                          : Icons.card_giftcard_outlined,
                      color: iconColor,
                      size: 22.sp,
                    ),
                  ),
                  SizedBox(width: 12.sp),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "$activeCurrencysymbol${item.amount}",
                          style: TextStyle(
                            fontSize: 18.sp,
                            fontWeight: FontWeight.normal,
                            color: Colors.black87,
                          ),
                        ),
                        if (item.theme != null && item.theme != "Default") ...[
                          SizedBox(height: 4.sp),
                          Container(
                            padding: EdgeInsets.symmetric(
                              horizontal: 10.sp,
                              vertical: 4.sp,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.primaryColor.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                getOccasionIcon(item.theme!),
                                SizedBox(width: 4.sp),
                                Text(
                                  item.theme!,
                                  style: TextStyle(
                                    fontSize: 14.sp,
                                    color: AppColors.primaryColor,
                                    fontWeight: FontWeight.normal,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  Container(
                    padding: EdgeInsets.symmetric(
                      horizontal: 10.sp,
                      vertical: 6.sp,
                    ),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: statusColor.withOpacity(0.3),
                        width: 1,
                      ),
                    ),
                    child: Text(
                      statusText,
                      style: TextStyle(
                        color: statusColor,
                        fontWeight: FontWeight.normal,
                        fontSize: 14.sp,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                ],
              ),
              SizedBox(height: 16.sp),
              Container(
                padding: EdgeInsets.all(12.sp),
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.shade200, width: 1),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            tr("Gift Card Code"),
                            style: TextStyle(
                              fontSize: 14.sp,
                              color: Colors.grey.shade600,
                              fontWeight: FontWeight.normal,
                            ),
                          ),
                          SizedBox(height: 6.sp),
                          Text(
                            item.code.toString(),
                            style: TextStyle(
                              fontSize: 16.sp,
                              fontWeight: FontWeight.normal,
                              color: Colors.black87,
                              fontFamily: 'monospace',
                              letterSpacing: 1,
                            ),
                          ),
                        ],
                      ),
                    ),
                    SizedBox(width: 12.sp),
                    Row(
                      children: [
                        buildIconButton(
                          icon: Icons.copy,
                          color: AppColors.primaryColor,
                          onTap: () {
                            Clipboard.setData(
                              ClipboardData(text: item.code.toString()),
                            );
                            showSnackBar(
                              Get.context!,
                              tr("Code copied to clipboard"),
                            );
                          },
                        ),
                        SizedBox(width: 8.sp),
                        buildIconButton(
                          icon: Icons.share,
                          color: AppColors.secondaryColor,
                          onTap: () async {
                            final playStoreLink = await getPlayStoreLink();
                            Share.share(
                              "🎁 ${tr("Gift Card Code!")}\n\n"
                              "💰 ${tr("Amount")}: ${activeCurrencysymbol}${item.amount}\n"
                              "🎯 ${tr("Code")}: ${item.code}\n"
                              "📱 ${tr("Download our app")}: $playStoreLink\n\n"
                              "${tr("Enjoy your gift!")} 🎉",
                            );
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              SizedBox(height: 16.sp),
              Text('Message: ${item.message}  '),
              SizedBox(height: 1.h),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        tr("Created"),
                        style: TextStyle(
                          fontSize: 14.sp,
                          color: Colors.grey.shade600,
                        ),
                      ),
                      SizedBox(height: 4.sp),
                      Text(
                        timeZoneformatDate(item.createdAt.toString()),
                        style: TextStyle(
                          fontSize: 14.sp,
                          fontWeight: FontWeight.normal,
                          color: Colors.grey.shade700,
                        ),
                      ),
                    ],
                  ),
                  if (item.expiresAt != null)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          tr("Expires"),
                          style: TextStyle(
                            fontSize: 14.sp,
                            color: Colors.grey.shade600,
                          ),
                        ),
                        SizedBox(height: 4.sp),
                        Text(
                          timeZoneformatDate(item.expiresAt.toString()),
                          style: TextStyle(
                            fontSize: 14.sp,
                            fontWeight: FontWeight.normal,
                            color: Colors.grey.shade700,
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

Widget buildIconButton({
  required IconData icon,
  required Color color,
  required VoidCallback onTap,
}) {
  return Container(
    width: 25.sp,
    height: 25.sp,
    decoration: BoxDecoration(
      color: color.withOpacity(0.1),
      shape: BoxShape.circle,
      border: Border.all(color: color.withOpacity(0.2), width: 1),
    ),
    child: Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(50),
        child: Icon(icon, color: color, size: 16.sp),
      ),
    ),
  );
}

void showSnackBar(BuildContext context, String message) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(
        message,
        style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.normal),
      ),
      backgroundColor: Colors.green,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      margin: EdgeInsets.all(16.sp),
    ),
  );
}

Widget getOccasionIcon(String occasion) {
  switch (occasion.toLowerCase()) {
    case 'birthday':
      return Icon(Icons.cake, color: Colors.pink, size: 14.sp);
    case 'holiday':
      return Icon(Icons.beach_access, color: Colors.blue, size: 14.sp);
    case 'travel':
      return Icon(Icons.flight, color: Colors.green, size: 14.sp);
    case 'thank you':
      return Icon(Icons.thumb_up, color: Colors.orange, size: 14.sp);
    case 'celebration':
      return Icon(Icons.celebration, color: Colors.purple, size: 14.sp);
    default:
      return Icon(Icons.card_giftcard, color: Colors.grey, size: 14.sp);
  }
}
