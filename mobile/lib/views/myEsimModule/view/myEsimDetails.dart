import 'dart:convert';

import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/views/myEsimModule/instructions_bloc/getInstructions_bloc.dart';
import 'package:esimconnect/views/myEsimModule/model/getInstructionsModel.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/views/myEsimModule/view/RowInfoWidget.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:sizer/sizer.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/utills/global.dart' as global;
import 'package:url_launcher/url_launcher.dart';
import '../instructions_bloc/getInstructions_event.dart';
import '../model/EsimListModel.dart';

class EsimDetailScreen extends StatefulWidget {
  final String? iccid;
  final EsimItem? esimItem;

  const EsimDetailScreen({super.key, this.iccid, this.esimItem});

  @override
  State<EsimDetailScreen> createState() => _EsimDetailScreenState();
}

class _EsimDetailScreenState extends State<EsimDetailScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((timeStamp) {
      context.read<GetESimInstructionsBloc>().add(
        GetESimInstructionsEvent(
          esimId: widget.esimItem?.id,
          iccid: widget.iccid,
        ),
      );
    });
  }

  Color get _panelColor => AppColors.appSurface;
  Color get _panelAltColor => AppColors.appSurfaceAlt;
  Color get _borderColor => AppColors.appBorder;
  Color get _primaryTextColor => AppColors.appTextPrimary;
  Color get _secondaryTextColor => AppColors.appTextSecondary;

  LinearGradient get _instructionGradient => AppColors.isDarkMode
      ? LinearGradient(
          colors: [AppColors.appSurfaceAlt, AppColors.appSurface],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        )
      : const LinearGradient(
          colors: [Color(0xFFE3F2FD), Color(0xFFFFF3E0)],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        );

  Color get _noticeSurface =>
      AppColors.isDarkMode ? AppColors.appSurfaceAlt : Colors.blue.shade50;
  Color get _noticeBorder =>
      AppColors.isDarkMode ? AppColors.appBorder : Colors.blue.shade200;
  Color get _noticeText =>
      AppColors.isDarkMode ? AppColors.appTextPrimary : Colors.blue.shade800;
  Color get _dangerSurface =>
      AppColors.isDarkMode ? const Color(0xFF3A1F2A) : Colors.red.shade50;
  Color get _dangerBorder =>
      AppColors.isDarkMode ? const Color(0xFF7B2D44) : Colors.red.shade200;
  Color get _dangerText =>
      AppColors.isDarkMode ? const Color(0xFFFFB3C7) : Colors.red.shade700;

  static const Map<String, String> _instructionFallbacks = {
    'android_qr_step_1': 'Go to Settings > Network & Internet > SIMs',
    'android_qr_step_2': 'Tap "Download a SIM instead" or "Add eSIM"',
    'android_qr_step_3': 'Scan the QR code below',
    'android_qr_step_4': 'Follow the on-screen instructions',
    'android_qr_step_5': 'Wait for the eSIM to activate',
    'android_qr_step_6': 'Name your eSIM and set your preferred line',
    'android_manual_step_1': 'Go to Settings > Network & Internet > SIMs',
    'android_manual_step_2': 'Tap "Download a SIM instead" or "Add eSIM"',
    'android_manual_step_3': 'Select "Enter code manually"',
    'android_manual_step_4': 'Enter the activation code from below',
    'android_manual_step_5':
        'Follow on-screen instructions to activate the eSIM',
    'android_manual_step_6': 'Name your eSIM (optional) and tap "Done"',
    'ios_qr_step_1': 'Go to Settings > Cellular',
    'ios_qr_step_2': 'Tap "Add eSIM" or "Add Cellular Plan"',
    'ios_qr_step_3': 'Use QR Code and scan the code below',
    'ios_qr_step_4': 'Follow the on-screen instructions',
    'ios_qr_step_5': 'Wait for activation to finish',
    'ios_qr_step_6': 'Label your eSIM and choose default line preferences',
    'ios_manual_step_1': 'Go to Settings > Cellular',
    'ios_manual_step_2': 'Tap "Add Cellular Plan"',
    'ios_manual_step_3': 'Tap "Enter Details Manually"',
    'ios_manual_step_4': 'Enter the SM-DP+ Address and Activation Code',
    'ios_manual_step_5': 'Follow on-screen instructions to activate the eSIM',
    'ios_manual_step_6': 'Name your eSIM (optional) and tap "Done"',
  };

  String _instructionStep(String key) {
    final translated = tr(key);
    return translated == key ? (_instructionFallbacks[key] ?? key) : translated;
  }

  String? _cleanInstructionValue(String? value) {
    final trimmed = value?.trim();
    return trimmed == null || trimmed.isEmpty ? null : trimmed;
  }

  bool _looksLikeQrPayload(String? value) {
    final cleaned = _cleanInstructionValue(value);
    if (cleaned == null) return false;
    final lower = cleaned.toLowerCase();
    return lower.startsWith('lpa:') ||
        (!lower.startsWith('http') &&
            !lower.startsWith('data:image') &&
            cleaned.contains(r'$'));
  }

  bool _looksLikeQrImage(String? value) {
    final cleaned = _cleanInstructionValue(value)?.toLowerCase();
    return cleaned != null &&
        (cleaned.startsWith('http://') ||
            cleaned.startsWith('https://') ||
            cleaned.startsWith('data:image'));
  }

  String? _qrPayload({
    required String? qrCode,
    required String? manualCode,
    required String? smdpAddress,
    required String? activationCode,
  }) {
    final manual = _cleanInstructionValue(manualCode);
    if (_looksLikeQrPayload(manual)) return manual;

    final qr = _cleanInstructionValue(qrCode);
    if (_looksLikeQrPayload(qr)) return qr;

    final smdp = _cleanInstructionValue(smdpAddress);
    final activation = _cleanInstructionValue(activationCode);
    if (smdp != null && activation != null) {
      return 'LPA:1\$$smdp\$$activation';
    }

    return null;
  }

  String? _qrImageSource(String? qrCode) {
    final cleaned = _cleanInstructionValue(qrCode);
    return _looksLikeQrImage(cleaned) ? cleaned : null;
  }

  String? _qrShareValue(String? qrCode, String? qrPayload) {
    final image = _qrImageSource(qrCode);
    if (image != null && !image.startsWith('data:image')) return image;
    return qrPayload;
  }

  Widget _buildQrCodeView({
    required String? qrPayload,
    required String? qrImageSource,
  }) {
    if (qrPayload != null) {
      return QrImageView(
        data: qrPayload,
        version: QrVersions.auto,
        size: 200.0,
        gapless: true,
        backgroundColor: Colors.white,
      );
    }

    final imageSource = _cleanInstructionValue(qrImageSource);
    if (imageSource == null) {
      return const SizedBox.shrink();
    }

    if (imageSource.toLowerCase().startsWith('data:image')) {
      final commaIndex = imageSource.indexOf(',');
      if (commaIndex != -1) {
        try {
          final bytes = base64Decode(imageSource.substring(commaIndex + 1));
          return Image.memory(
            bytes,
            width: 200,
            height: 200,
            fit: BoxFit.contain,
          );
        } catch (_) {
          return Text(
            'QR Code image could not be loaded',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12.sp),
          ).tr();
        }
      }
    }

    return Image.network(
      imageSource,
      width: 200,
      height: 200,
      fit: BoxFit.contain,
      errorBuilder: (context, error, stackTrace) {
        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error, color: Colors.red, size: 40),
            SizedBox(height: 8),
            Text(
              'QR Code image could not be loaded',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12.sp),
            ).tr(),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: AppColors.scaffoldbackgroudColor,
        appBar: AppBar(title: Text('eSIM Instructions').tr()),
        body: NestedScrollView(
          physics: NeverScrollableScrollPhysics(),
          headerSliverBuilder: (context, innerBoxIsScrolled) {
            return [
              SliverToBoxAdapter(
                child: Column(
                  children: [
                    SizedBox(height: 2.w),
                    Container(
                      margin: EdgeInsets.symmetric(
                        horizontal: 3.w,
                        vertical: 2.w,
                      ),
                      decoration: BoxDecoration(
                        color: _panelAltColor,
                        border: Border.all(color: _borderColor),
                        borderRadius: BorderRadius.circular(2.w),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(2.w),
                        child: ExpansionTile(
                          dense: true,
                          childrenPadding: EdgeInsets.symmetric(
                            horizontal: 2.w,
                          ),
                          tilePadding: EdgeInsets.symmetric(
                            horizontal: 5.w,
                            vertical: 0.w,
                          ),
                          backgroundColor: _panelAltColor,
                          collapsedBackgroundColor: _panelAltColor,
                          title: Text(
                            "Overview",
                            style: Theme.of(context).textTheme.bodyMedium!
                                .copyWith(
                                  fontSize: 16.sp,
                                  fontWeight: FontWeight.normal,
                                  color: _primaryTextColor,
                                ),
                          ).tr(),
                          subtitle: Text(
                            "Tap to see all details",
                            style: Theme.of(context).textTheme.bodyMedium!
                                .copyWith(
                                  fontSize: 13.sp,
                                  fontWeight: FontWeight.normal,
                                  color: _secondaryTextColor,
                                ),
                          ).tr(),
                          leading: Icon(
                            Icons.info_outline,
                            color: _primaryTextColor,
                            size: 18,
                          ),
                          expandedAlignment: Alignment.topLeft,
                          children: [
                            Padding(
                              padding: const EdgeInsets.all(8.0),
                              child: Align(
                                alignment: Alignment.centerLeft,
                                child: Text(
                                  "eSIM Summary",
                                  style: Theme.of(context).textTheme.bodyMedium!
                                      .copyWith(
                                        fontSize: 16.sp,
                                        fontWeight: FontWeight.normal,
                                        color: _primaryTextColor,
                                      ),
                                ),
                              ),
                            ),
                            Container(
                              margin: const EdgeInsets.symmetric(horizontal: 2),
                              decoration: BoxDecoration(
                                color: _panelColor,
                                borderRadius: BorderRadius.circular(2.w),
                                border: Border.all(color: _borderColor),
                              ),
                              child: Column(
                                children: [
                                  InfoRow(
                                    label: 'Order ID:',
                                    value:
                                        widget.esimItem?.displayOrderId
                                            ?.toString() ??
                                        'N/A',
                                    enableCopy: true,
                                    flex: 3,
                                  ),
                                  if (widget.esimItem?.iccid != null)
                                    InfoRow(
                                      label: 'ICCID:',
                                      value: widget.esimItem?.iccid ?? 'N/A',
                                      enableCopy: true,
                                      flex: 3,
                                    ),
                                  InfoRow(
                                    label: "Status:",
                                    value: widget.esimItem?.status ?? 'N/A',
                                    flex: 3,
                                  ),
                                ],
                              ),
                            ),
                            SizedBox(height: 10),
                            _buildSectionTitle(tr('Package detail'), context),
                            Container(
                              margin: const EdgeInsets.symmetric(horizontal: 2),
                              decoration: BoxDecoration(
                                color: _panelColor,
                                borderRadius: BorderRadius.circular(2.w),
                                border: Border.all(color: _borderColor),
                              ),
                              child: Column(
                                children: [
                                  InfoRow(
                                    label: tr('Data:'),
                                    value: widget.esimItem?.dataAmount ?? 'N/A',
                                  ),
                                  InfoRow(
                                    label: tr('Validity:'),
                                    value:
                                        "${widget.esimItem?.validity ?? 'N/A'} ${tr('Days')}",
                                  ),
                                  InfoRow(
                                    label: tr('Price:'),
                                    value:
                                        '${widget.esimItem?.currency} ${global.formatPrice(double.tryParse(widget.esimItem?.price ?? '0'))}',
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 10),
                            if (widget.esimItem?.createdAt != null)
                              _buildSectionTitle(
                                tr('Order Information'),
                                context,
                              ),
                            if (widget.esimItem?.createdAt != null)
                              Container(
                                margin: const EdgeInsets.symmetric(
                                  horizontal: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: _panelColor,
                                  borderRadius: BorderRadius.circular(2.w),
                                  border: Border.all(color: _borderColor),
                                ),
                                child: Column(
                                  children: [
                                    widget.esimItem!.createdAt != null
                                        ? InfoRow(
                                            label: tr("Order Date:"),
                                            value:
                                                DateFormat(
                                                  'MMM dd, yyyy HH:mm',
                                                ).format(
                                                  widget.esimItem!.createdAt!
                                                      .toLocal(),
                                                ),
                                          )
                                        : Container(),
                                  ],
                                ),
                              ),
                            SizedBox(height: 20),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ];
          },
          body: Column(
            children: [
              Padding(
                padding: EdgeInsets.only(left: 5.w, top: 4.w),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    "Installation Guide",
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.textColor,
                      fontSize: 16.sp,
                      fontWeight: FontWeight.normal,
                    ),
                  ).tr(),
                ),
              ),
              Container(
                height: 6.h,
                padding: EdgeInsets.symmetric(vertical: 1.w, horizontal: 0.w),
                margin: EdgeInsets.all(3.w),
                decoration: BoxDecoration(
                  color: _panelAltColor,
                  borderRadius: BorderRadius.circular(2.w),
                  border: Border.all(color: _borderColor),
                ),
                child: TabBar(
                  indicatorSize: TabBarIndicatorSize.tab,
                  labelColor: AppColors.primaryColor,
                  unselectedLabelColor: _primaryTextColor,
                  dividerColor: Colors.transparent,
                  indicator: BoxDecoration(
                    border: Border.all(
                      color: AppColors.primaryColor,
                      width: 0.5,
                    ),
                    borderRadius: BorderRadius.circular(2.w),
                    color: _panelColor,
                  ),
                  indicatorPadding: EdgeInsets.symmetric(
                    horizontal: 1.w,
                    vertical: 0,
                  ),
                  labelPadding: EdgeInsets.symmetric(horizontal: 0.w),
                  labelStyle: TextStyle(
                    fontSize: 14.sp,
                    fontWeight: FontWeight.normal,
                  ),
                  unselectedLabelStyle: TextStyle(
                    fontSize: 14.sp,
                    fontWeight: FontWeight.normal,
                  ),
                  tabs: [
                    Tab(text: 'Android'),
                    Tab(text: 'iOS'),
                  ],
                ),
              ),
              Expanded(
                child: BlocBuilder<GetESimInstructionsBloc, ApiState<ESimInstructionsModel>>(
                  builder: (context, state) {
                    final qrCodeUrl = (state is ApiSuccess)
                        ? state.data?.instructions?.qrCode
                        : null;
                    final manualCode = (state is ApiSuccess)
                        ? state.data?.instructions?.manualCode
                        : null;
                    final smdpAddress = (state is ApiSuccess)
                        ? state.data?.instructions?.smdpAddress
                        : null;
                    final activationCode = (state is ApiSuccess)
                        ? state.data?.instructions?.activationCode
                        : null;
                    final apnType = (state is ApiSuccess)
                        ? state.data?.instructions?.apnType
                        : null;
                    final directAppleUrl = (state is ApiSuccess)
                        ? state.data?.instructions?.directAppleUrl
                        : null;
                    final qrPayload = _qrPayload(
                      qrCode: qrCodeUrl,
                      manualCode: manualCode,
                      smdpAddress: smdpAddress,
                      activationCode: activationCode,
                    );
                    final qrImageSource = _qrImageSource(qrCodeUrl);
                    final hasQrCode =
                        qrPayload != null || qrImageSource != null;
                    final qrShareValue = _qrShareValue(qrCodeUrl, qrPayload);

                    return TabBarView(
                      physics: NeverScrollableScrollPhysics(),
                      children: [
                        // Android Tab
                        SingleChildScrollView(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              _buildSectionTitle(
                                tr('QR Code Installation'),
                                context,
                              ),
                              Container(
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(2.w),
                                  border: Border.all(
                                    color: AppColors.dividerColor,
                                  ),
                                  gradient: _instructionGradient,
                                ),
                                child: Column(
                                  children: [
                                    // Steps
                                    ListView.builder(
                                      itemCount:
                                          global.androidQRStepKeys.length,
                                      shrinkWrap: true,
                                      physics:
                                          const NeverScrollableScrollPhysics(),
                                      itemBuilder: (context, index) {
                                        final stepNumber = (index + 1);
                                        final stepText = _instructionStep(
                                          global.androidQRStepKeys[index],
                                        );

                                        return Padding(
                                          padding: EdgeInsets.symmetric(
                                            vertical: 8,
                                            horizontal: 2.w,
                                          ),
                                          child: Row(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              CircleAvatar(
                                                radius: 15,
                                                backgroundColor:
                                                    AppColors.primaryColor,
                                                child: Text(
                                                  "$stepNumber",
                                                  style: const TextStyle(
                                                    color: Colors.white,
                                                    fontWeight: FontWeight.normal,
                                                    fontSize: 12,
                                                  ),
                                                ),
                                              ),
                                              const SizedBox(width: 10),
                                              Expanded(
                                                child: Text(
                                                  stepText,
                                                  style: Theme.of(context)
                                                      .textTheme
                                                      .bodyMedium
                                                      ?.copyWith(
                                                        color:
                                                            _primaryTextColor,
                                                      ),
                                                ),
                                              ),
                                            ],
                                          ),
                                        );
                                      },
                                    ),

                                    SizedBox(height: 2.h),
                                    // QR Code
                                    if (hasQrCode)
                                      Container(
                                        padding: const EdgeInsets.all(16),
                                        decoration: BoxDecoration(
                                          color: Colors.white,
                                          borderRadius: BorderRadius.circular(
                                            12,
                                          ),
                                          boxShadow: [
                                            BoxShadow(
                                              color: Colors.grey.withOpacity(
                                                0.2,
                                              ),
                                              spreadRadius: 2,
                                              blurRadius: 5,
                                              offset: const Offset(0, 3),
                                            ),
                                          ],
                                        ),
                                        child: _buildQrCodeView(
                                          qrPayload: qrPayload,
                                          qrImageSource: qrImageSource,
                                        ),
                                      )
                                    else if (state is ApiSuccess)
                                      Container(
                                        padding: const EdgeInsets.all(16),
                                        decoration: BoxDecoration(
                                          color: _dangerSurface,
                                          borderRadius: BorderRadius.circular(
                                            12,
                                          ),
                                          border: Border.all(
                                            color: _dangerBorder,
                                          ),
                                        ),
                                        child: Column(
                                          children: [
                                            Icon(
                                              Icons.error_outline,
                                              color: Colors.red,
                                              size: 40,
                                            ),
                                            SizedBox(height: 8),
                                            Text(
                                              'QR Code not available for this eSIM',
                                              style: TextStyle(
                                                color: _dangerText,
                                                fontWeight: FontWeight.normal,
                                              ),
                                            ).tr(),
                                          ],
                                        ),
                                      ),

                                    SizedBox(height: 2.h),
                                    // Activation Info
                                    if (smdpAddress != null ||
                                        activationCode != null)
                                      Container(
                                        padding: const EdgeInsets.all(16),
                                        decoration: BoxDecoration(
                                          color: _noticeSurface,
                                          borderRadius: BorderRadius.circular(
                                            12,
                                          ),
                                          border: Border.all(
                                            color: _noticeBorder,
                                          ),
                                        ),
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              'Activation Details:',
                                              style: TextStyle(
                                                fontWeight: FontWeight.normal,
                                                fontSize: 14.sp,
                                                color: _noticeText,
                                              ),
                                            ).tr(),
                                            SizedBox(height: 8),
                                            if (smdpAddress != null)
                                              InfoRow(
                                                label: tr('SM-DP+ Address:'),
                                                value: smdpAddress,
                                                enableCopy: true,
                                              ),
                                            if (activationCode != null)
                                              InfoRow(
                                                label: tr('Activation Code:'),
                                                value: activationCode,
                                                enableCopy: true,
                                              ),
                                            if (apnType != null)
                                              InfoRow(
                                                label: tr('APN Type:'),
                                                value: apnType,
                                              ),
                                          ],
                                        ),
                                      ),

                                    SizedBox(height: 2.h),
                                    if (qrShareValue != null)
                                      SizedBox(
                                        width: 75.w,
                                        child: ElevatedButton.icon(
                                          onPressed: () {
                                            global.shareContent(
                                              context: context,
                                              text:
                                                  "${tr("Scan this QR to activate the eSIM:")} $qrShareValue",
                                            );
                                          },
                                          icon: const Icon(
                                            Icons.share_outlined,
                                          ),
                                          label: Text('Share QR Code URL').tr(),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor:
                                                Colors.blue.shade700,
                                            foregroundColor: Colors.white,
                                            shape: RoundedRectangleBorder(
                                              borderRadius:
                                                  BorderRadius.circular(8),
                                            ),
                                          ),
                                        ),
                                      ),
                                    SizedBox(height: 2.h),
                                  ],
                                ),
                              ),

                              SizedBox(height: 25),
                              // Manual Installation
                              _buildSectionTitle(
                                tr('Manual Installation'),
                                context,
                              ),
                              Container(
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(2.w),
                                  border: Border.all(
                                    color: AppColors.dividerColor,
                                  ),
                                  gradient: _instructionGradient,
                                ),
                                child: Column(
                                  children: [
                                    ListView.builder(
                                      itemCount:
                                          global.androidManualStepKeys.length,
                                      shrinkWrap: true,
                                      physics:
                                          const NeverScrollableScrollPhysics(),
                                      itemBuilder: (context, index) {
                                        final stepNumber = (index + 1);
                                        final stepText = _instructionStep(
                                          global.androidManualStepKeys[index],
                                        );
                                        return Padding(
                                          padding: EdgeInsets.symmetric(
                                            vertical: 8,
                                            horizontal: 2.w,
                                          ),
                                          child: Row(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              CircleAvatar(
                                                radius: 15,
                                                backgroundColor:
                                                    AppColors.primaryColor,
                                                child: Text(
                                                  "$stepNumber",
                                                  style: const TextStyle(
                                                    color: Colors.white,
                                                    fontWeight: FontWeight.normal,
                                                    fontSize: 12,
                                                  ),
                                                ),
                                              ),
                                              const SizedBox(width: 10),
                                              Expanded(
                                                child: Text(
                                                  stepText,
                                                  style: Theme.of(context)
                                                      .textTheme
                                                      .bodyMedium
                                                      ?.copyWith(
                                                        color:
                                                            _primaryTextColor,
                                                      ),
                                                ),
                                              ),
                                            ],
                                          ),
                                        );
                                      },
                                    ),
                                    SizedBox(height: 2.h),
                                    // Manual Activation Info
                                    if (smdpAddress != null ||
                                        activationCode != null ||
                                        manualCode != null)
                                      Container(
                                        padding: const EdgeInsets.all(16),
                                        margin: EdgeInsets.all(2.w),
                                        decoration: BoxDecoration(
                                          color: _panelColor,
                                          borderRadius: BorderRadius.circular(
                                            12,
                                          ),
                                          border: Border.all(
                                            color: _noticeBorder,
                                          ),
                                        ),
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              'Enter details manually:',
                                              style: TextStyle(
                                                fontWeight: FontWeight.normal,
                                                fontSize: 16.sp,
                                                color: _noticeText,
                                              ),
                                            ).tr(),
                                            SizedBox(height: 12),
                                            if (smdpAddress != null)
                                              InfoRow(
                                                label: tr('SM-DP+ Address:'),
                                                value: smdpAddress,
                                                enableCopy: true,
                                              ),
                                            if (manualCode != null)
                                              InfoRow(
                                                label: tr('Manual Code:'),
                                                value: manualCode,
                                                enableCopy: true,
                                              ),
                                            if (activationCode != null &&
                                                manualCode == null)
                                              InfoRow(
                                                label: tr('Activation Code:'),
                                                value: activationCode,
                                                enableCopy: true,
                                              ),
                                          ],
                                        ),
                                      ),
                                    SizedBox(height: 2.h),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),

                        // iOS Tab
                        SingleChildScrollView(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildSectionTitle(
                                tr('QR Code Installation'),
                                context,
                              ),
                              Container(
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(2.w),
                                  border: Border.all(
                                    color: AppColors.dividerColor,
                                  ),
                                  gradient: _instructionGradient,
                                ),
                                child: Padding(
                                  padding: EdgeInsets.all(1.w),
                                  child: Column(
                                    children: [
                                      ListView.builder(
                                        itemCount: global.iosQRStepKeys.length,
                                        shrinkWrap: true,
                                        physics:
                                            const NeverScrollableScrollPhysics(),
                                        itemBuilder: (context, index) {
                                          final stepNumber = (index + 1);
                                          final stepText = _instructionStep(
                                            global.iosQRStepKeys[index],
                                          );

                                          return Padding(
                                            padding: EdgeInsets.symmetric(
                                              vertical: 8,
                                              horizontal: 2.w,
                                            ),
                                            child: Row(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                CircleAvatar(
                                                  radius: 15,
                                                  backgroundColor:
                                                      AppColors.primaryColor,
                                                  child: Text(
                                                    "$stepNumber",
                                                    style: const TextStyle(
                                                      color: Colors.white,
                                                      fontWeight:
                                                          FontWeight.normal,
                                                      fontSize: 12,
                                                    ),
                                                  ),
                                                ),
                                                const SizedBox(width: 10),
                                                Expanded(
                                                  child: Text(
                                                    stepText,
                                                    style: Theme.of(context)
                                                        .textTheme
                                                        .bodyMedium
                                                        ?.copyWith(
                                                          color:
                                                              _primaryTextColor,
                                                        ),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          );
                                        },
                                      ),

                                      SizedBox(height: 2.h),
                                      // QR Code
                                      if (hasQrCode)
                                        Container(
                                          padding: const EdgeInsets.all(16),
                                          decoration: BoxDecoration(
                                            color: Colors.white,
                                            borderRadius: BorderRadius.circular(
                                              12,
                                            ),
                                            boxShadow: [
                                              BoxShadow(
                                                color: Colors.grey.withOpacity(
                                                  0.2,
                                                ),
                                                spreadRadius: 2,
                                                blurRadius: 5,
                                                offset: const Offset(0, 3),
                                              ),
                                            ],
                                          ),
                                          child: _buildQrCodeView(
                                            qrPayload: qrPayload,
                                            qrImageSource: qrImageSource,
                                          ),
                                        )
                                      else if (state is ApiSuccess)
                                        Container(
                                          padding: const EdgeInsets.all(16),
                                          decoration: BoxDecoration(
                                            color: _dangerSurface,
                                            borderRadius: BorderRadius.circular(
                                              12,
                                            ),
                                            border: Border.all(
                                              color: _dangerBorder,
                                            ),
                                          ),
                                          child: Column(
                                            children: [
                                              Icon(
                                                Icons.error_outline,
                                                color: Colors.red,
                                                size: 40,
                                              ),
                                              SizedBox(height: 8),
                                              Text(
                                                'QR Code not available for this eSIM',
                                                style: TextStyle(
                                                  color: _dangerText,
                                                  fontWeight: FontWeight.normal,
                                                ),
                                              ).tr(),
                                            ],
                                          ),
                                        ),

                                      SizedBox(height: 2.h),
                                      // Direct Apple Installation Button
                                      if (directAppleUrl != null &&
                                          directAppleUrl.isNotEmpty)
                                        Padding(
                                          padding: EdgeInsets.symmetric(
                                            horizontal: 3.w,
                                            vertical: 2.w,
                                          ),
                                          child: SizedBox(
                                            width: double.infinity,
                                            height: 5.h,
                                            child: ElevatedButton.icon(
                                              onPressed: () async {
                                                if (await canLaunchUrl(
                                                  Uri.parse(directAppleUrl),
                                                )) {
                                                  await launchUrl(
                                                    Uri.parse(directAppleUrl),
                                                    mode: LaunchMode
                                                        .externalApplication,
                                                  );
                                                } else {
                                                  ScaffoldMessenger.of(
                                                    context,
                                                  ).showSnackBar(
                                                    SnackBar(
                                                      content: Text(
                                                        'Could not launch Apple Installation URL',
                                                      ).tr(),
                                                    ),
                                                  );
                                                }
                                              },
                                              icon: const Icon(Icons.apple),
                                              label: Text(
                                                'Direct Apple Installation',
                                              ).tr(),
                                              style: ElevatedButton.styleFrom(
                                                backgroundColor:
                                                    Colors.grey.shade900,
                                                foregroundColor: Colors.white,
                                                shape: RoundedRectangleBorder(
                                                  borderRadius:
                                                      BorderRadius.circular(8),
                                                ),
                                              ),
                                            ),
                                          ),
                                        ),

                                      SizedBox(height: 2.h),
                                      // Activation Info
                                      if (smdpAddress != null ||
                                          activationCode != null)
                                        Container(
                                          padding: const EdgeInsets.all(16),
                                          decoration: BoxDecoration(
                                            color: _noticeSurface,
                                            borderRadius: BorderRadius.circular(
                                              12,
                                            ),
                                            border: Border.all(
                                              color: _noticeBorder,
                                            ),
                                          ),
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                'Activation Details:',
                                                style: TextStyle(
                                                  fontWeight: FontWeight.normal,
                                                  fontSize: 16.sp,
                                                  color: _noticeText,
                                                ),
                                              ).tr(),
                                              SizedBox(height: 8),
                                              if (smdpAddress != null)
                                                InfoRow(
                                                  label: tr('SM-DP+ Address:'),
                                                  value: smdpAddress,
                                                  enableCopy: true,
                                                ),
                                              if (activationCode != null)
                                                InfoRow(
                                                  label: tr('Activation Code:'),
                                                  value: activationCode,
                                                  enableCopy: true,
                                                ),
                                              if (apnType != null)
                                                InfoRow(
                                                  label: tr('APN Type:'),
                                                  value: apnType,
                                                ),
                                            ],
                                          ),
                                        ),

                                      SizedBox(height: 2.h),
                                      if (qrShareValue != null)
                                        SizedBox(
                                          width: 75.w,
                                          child: ElevatedButton.icon(
                                            onPressed: () {
                                              global.shareContent(
                                                context: context,
                                                text:
                                                    "${tr("Scan this QR to activate the eSIM:")} $qrShareValue",
                                              );
                                            },
                                            icon: const Icon(
                                              Icons.share_outlined,
                                            ),
                                            label: Text(
                                              'Share QR Code URL',
                                            ).tr(),
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor:
                                                  Colors.blue.shade700,
                                              foregroundColor: Colors.white,
                                              shape: RoundedRectangleBorder(
                                                borderRadius:
                                                    BorderRadius.circular(8),
                                              ),
                                            ),
                                          ),
                                        ),
                                      SizedBox(height: 2.h),
                                    ],
                                  ),
                                ),
                              ),

                              SizedBox(height: 8.w),
                              // Manual Installation
                              _buildSectionTitle(
                                tr('Manual Installation'),
                                context,
                              ),
                              Container(
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(2.w),
                                  border: Border.all(
                                    color: AppColors.dividerColor,
                                  ),
                                  gradient: _instructionGradient,
                                ),
                                child: Padding(
                                  padding: EdgeInsets.all(1.w),
                                  child: Column(
                                    children: [
                                      ListView.builder(
                                        itemCount:
                                            global.iosManualStepKeys.length,
                                        shrinkWrap: true,
                                        physics:
                                            const NeverScrollableScrollPhysics(),
                                        itemBuilder: (context, index) {
                                          final stepNumber = (index + 1);
                                          final stepText = _instructionStep(
                                            global.iosManualStepKeys[index],
                                          );
                                          return Padding(
                                            padding: EdgeInsets.symmetric(
                                              vertical: 8,
                                              horizontal: 2.w,
                                            ),
                                            child: Row(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                CircleAvatar(
                                                  radius: 15,
                                                  backgroundColor:
                                                      AppColors.primaryColor,
                                                  child: Text(
                                                    "$stepNumber",
                                                    style: const TextStyle(
                                                      color: Colors.white,
                                                      fontWeight:
                                                          FontWeight.normal,
                                                      fontSize: 12,
                                                    ),
                                                  ),
                                                ),
                                                const SizedBox(width: 10),
                                                Expanded(
                                                  child: Text(
                                                    stepText,
                                                    style: Theme.of(context)
                                                        .textTheme
                                                        .bodyMedium
                                                        ?.copyWith(
                                                          color:
                                                              _primaryTextColor,
                                                        ),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          );
                                        },
                                      ),
                                      SizedBox(height: 2.h),
                                      // Manual Activation Info
                                      if (smdpAddress != null ||
                                          activationCode != null ||
                                          manualCode != null)
                                        Container(
                                          padding: const EdgeInsets.all(16),
                                          margin: EdgeInsets.all(2.w),
                                          decoration: BoxDecoration(
                                            color: _panelColor,
                                            borderRadius: BorderRadius.circular(
                                              12,
                                            ),
                                            border: Border.all(
                                              color: _noticeBorder,
                                            ),
                                          ),
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                'Enter details manually:',
                                                style: TextStyle(
                                                  fontWeight: FontWeight.normal,
                                                  fontSize: 16.sp,
                                                  color: _noticeText,
                                                ),
                                              ).tr(),
                                              SizedBox(height: 12),
                                              if (smdpAddress != null)
                                                InfoRow(
                                                  label: tr('SM-DP+ Address:'),
                                                  value: smdpAddress,
                                                  enableCopy: true,
                                                ),
                                              if (manualCode != null)
                                                InfoRow(
                                                  label: tr('Manual Code:'),
                                                  value: manualCode,
                                                  enableCopy: true,
                                                ),
                                              if (activationCode != null &&
                                                  manualCode == null)
                                                InfoRow(
                                                  label: tr('Activation Code:'),
                                                  value: activationCode,
                                                  enableCopy: true,
                                                ),
                                            ],
                                          ),
                                        ),
                                      SizedBox(height: 2.h),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title, BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(left: 0.w, bottom: 3.w, top: 0.w),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Text(
          title,
          style: Theme.of(context).textTheme.bodyMedium!.copyWith(
            fontSize: 16.sp,
            fontWeight: FontWeight.normal,
            color: _primaryTextColor,
          ),
        ).tr(),
      ),
    );
  }
}
