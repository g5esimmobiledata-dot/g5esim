import 'dart:convert';

import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/utills/config.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/supportmodule/bloc/faq_bloc/faq_bloc.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/supportmodule/bloc/faq_bloc/faq_event.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/supportmodule/model/FaqModel.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/supportmodule/views/ConciergeScreen.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/supportmodule/views/myTicketScreen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:get/get.dart';
import 'package:http/http.dart' as http;
import 'package:sizer/sizer.dart';
import 'package:url_launcher/url_launcher.dart';

import 'SupportCard.dart';

class SupportCustomerScreen extends StatefulWidget {
  const SupportCustomerScreen({super.key});

  @override
  State<SupportCustomerScreen> createState() => _SupportCustomerScreenState();
}

class _SupportCustomerScreenState extends State<SupportCustomerScreen> {
  bool _whatsAppEnabled = false;
  bool _whatsAppScheduleEnabled = false;
  bool _conciergeEnabled = false;
  String _whatsAppNumber = '';
  String _whatsAppStartTime = '09:00';
  String _whatsAppEndTime = '18:00';
  List<String> _workingDays = const ['mon', 'tue', 'wed', 'thu', 'fri'];

  @override
  void initState() {
    super.initState();
    context.read<FAQBloc>().add(FaqEvent());
    _loadSupportSettings();
  }

  Future<void> _loadSupportSettings() async {
    try {
      final response = await http.get(Uri.parse('${baseUrl}public/settings'));
      if (response.statusCode < 200 || response.statusCode >= 300) {
        return;
      }

      final payload = jsonDecode(response.body);
      final data = payload is Map<String, dynamic>
          ? (payload['data'] as Map<String, dynamic>? ?? <String, dynamic>{})
          : <String, dynamic>{};

      if (!mounted) return;

      setState(() {
        _whatsAppNumber = _readSetting(data, const [
          'support_whatsapp_number',
          'supportWhatsAppNumber',
          'whatsapp_number',
          'whatsappNumber',
          'whatsapp',
          'support_whatsapp',
        ]);
        _whatsAppEnabled =
            _parseBool(
              _readSetting(data, const [
                'support_whatsapp_enabled',
                'supportWhatsAppEnabled',
                'whatsapp_enabled',
                'whatsappEnabled',
              ]),
            ) ||
            _normalizeWhatsAppNumber(_whatsAppNumber).isNotEmpty;
        _whatsAppScheduleEnabled =
            _parseBool(
              _readSetting(data, const [
                'support_whatsapp_schedule_enabled',
                'supportWhatsAppScheduleEnabled',
                'whatsapp_schedule_enabled',
              ]),
            );
        _conciergeEnabled = _parseBool(
          _readSetting(data, const ['concierge_enabled', 'conciergeEnabled']),
        );
        _whatsAppStartTime = _readSetting(data, const [
          'support_whatsapp_start_time',
          'supportWhatsAppStartTime',
          'whatsapp_start_time',
        ], fallback: '09:00');
        _whatsAppEndTime = _readSetting(data, const [
          'support_whatsapp_end_time',
          'supportWhatsAppEndTime',
          'whatsapp_end_time',
        ], fallback: '18:00');
        _workingDays =
            _readSetting(data, const [
              'support_whatsapp_working_days',
              'supportWhatsAppWorkingDays',
              'whatsapp_working_days',
            ], fallback: 'mon,tue,wed,thu,fri')
            .toString()
            .split(',')
            .map((day) => day.trim().toLowerCase())
            .where((day) => day.isNotEmpty)
            .toList();
      });
    } catch (_) {}
  }

  String _readSetting(
    Map<String, dynamic> data,
    List<String> keys, {
    String fallback = '',
  }) {
    for (final key in keys) {
      final value = data[key];
      if (value != null && value.toString().trim().isNotEmpty) {
        return value.toString().trim();
      }
    }
    return fallback;
  }

  bool _parseBool(dynamic value) {
    if (value is bool) return value;
    if (value is num) return value != 0;

    final normalized = value.toString().trim().toLowerCase();
    return normalized == 'true' ||
        normalized == '1' ||
        normalized == 'yes' ||
        normalized == 'on' ||
        normalized == 'enabled';
  }

  int? _toMinutes(String value) {
    final parts = value.split(':');
    if (parts.length != 2) return null;
    final hour = int.tryParse(parts[0]);
    final minute = int.tryParse(parts[1]);
    if (hour == null || minute == null) return null;
    return hour * 60 + minute;
  }

  bool _isWhatsAppAvailable() {
    if (!_whatsAppEnabled || _whatsAppNumber.trim().isEmpty) {
      return false;
    }

    if (!_whatsAppScheduleEnabled) {
      return true;
    }

    const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    final now = DateTime.now();
    final weekday = dayOrder[now.weekday - 1];
    if (_workingDays.isNotEmpty && !_workingDays.contains(weekday)) {
      return false;
    }

    final currentMinutes = now.hour * 60 + now.minute;
    final startMinutes = _toMinutes(_whatsAppStartTime);
    final endMinutes = _toMinutes(_whatsAppEndTime);

    if (startMinutes == null || endMinutes == null) {
      return true;
    }

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }

    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }

  bool _hasWhatsAppContact() {
    return _normalizeWhatsAppNumber(_whatsAppNumber).isNotEmpty;
  }

  String _normalizeWhatsAppNumber(String value) {
    return value.replaceAll(RegExp(r'[^0-9]'), '');
  }

  Future<void> _openWhatsApp() async {
    final number = _normalizeWhatsAppNumber(_whatsAppNumber);
    if (number.isEmpty) {
      _showMessage('WhatsApp is not configured yet.');
      return;
    }

    final message = Uri.encodeComponent(
      'Hello, I need support with my eSIM account.',
    );
    final appUri = Uri.parse('whatsapp://send?phone=$number&text=$message');

    if (await canLaunchUrl(appUri)) {
      final openedApp = await launchUrl(appUri);
      if (openedApp) {
        return;
      }
    }

    _showMessage('WhatsApp app is not installed on this device.');
  }

  void _openSupportTickets() {
    Get.to(() => MyTicketsScrren());
  }

  void _openConcierge() {
    Get.to(() => const ConciergeScreen());
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final showWhatsApp = true;

    return Scaffold(
      backgroundColor: AppColors.scaffoldbackgroudColor,
      appBar: AppBar(title: const Text('Customer Support').tr()),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: SingleChildScrollView(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.start,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Frequently Asked Questions',
                style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                  fontSize: 18.sp,
                  fontWeight: FontWeight.normal,
                  color: AppColors.appTextPrimary,
                ),
              ).tr(),
              SizedBox(height: 12),
              BlocBuilder<FAQBloc, ApiState<FaqModel>>(
                builder: (context, state) {
                  if (state is ApiLoading) {
                    return Center(child: faqFilterSkeleton());
                  } else if (state is ApiSuccess) {
                    return faqFilterWidget(state.data!);
                  } else if (state is ApiFailure) {
                  } else {
                    return SizedBox.shrink();
                  }
                  return SizedBox.shrink();
                },
              ),
              SizedBox(height: 20),
              SupportCard(
                onContactSupport: _openSupportTickets,
                onOpenWhatsApp: _openWhatsApp,
                onOpenConcierge: _conciergeEnabled ? _openConcierge : null,
                showWhatsApp: showWhatsApp,
                showConcierge: _conciergeEnabled,
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: InkWell(
        onTap: _openWhatsApp,
        child: CircleAvatar(
          radius: 24.sp,
          backgroundColor: const Color(0xFF25D366),
          child: Icon(
            FontAwesomeIcons.whatsapp,
            color: Colors.white,
            size: 24.sp,
          ),
        ),
      ),
    );
  }

  Widget faqFilterWidget(FaqModel faqModel) {
    Category? selectedCategory;

    List<Category> categories = () {
      final map = <String, Category>{};
      for (var item in faqModel.data ?? []) {
        if (item.category != null && item.category!.id != null) {
          map[item.category!.id!] = item.category!;
        }
      }
      return map.values.toList();
    }();

    return StatefulBuilder(
      builder: (context, setState) {
        Map<String, List<Datum>> groupedData = {};

        for (var item in faqModel.data ?? []) {
          final catName = item.category?.name ?? 'Others';
          groupedData.putIfAbsent(catName, () => []);
          groupedData[catName]!.add(item);
        }

        List<Datum> filteredData = selectedCategory == null
            ? []
            : (faqModel.data
                        ?.where((e) => e.category?.id == selectedCategory!.id)
                        .toList() ??
                    []);

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                color: AppColors.appSurface,
                border: Border.all(color: AppColors.appBorder),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<Category?>(
                  isExpanded: true,
                  dropdownColor: AppColors.appSurface,
                  iconEnabledColor: AppColors.appTextSecondary,
                  hint: const Text('Select Category'),
                  value: selectedCategory,
                  items: [
                    DropdownMenuItem<Category?>(
                      value: null,
                      child: Text(
                        'All',
                        style: TextStyle(color: AppColors.appTextPrimary),
                      ),
                    ),
                    ...categories.map((cat) {
                      return DropdownMenuItem<Category?>(
                        value: cat,
                        child: Text(
                          cat.name ?? '',
                          style: TextStyle(color: AppColors.appTextPrimary),
                        ),
                      );
                    }),
                  ],
                  onChanged: (value) {
                    setState(() {
                      selectedCategory = value;
                    });
                  },
                ),
              ),
            ),
            const SizedBox(height: 16),
            if (selectedCategory == null)
              ...groupedData.entries.map((entry) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${entry.key}:',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.normal,
                        color: AppColors.appTextPrimary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    ...entry.value.map((item) {
                      return _faqCard(item);
                    }),
                    const SizedBox(height: 12),
                  ],
                );
              })
            else
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: filteredData.length,
                itemBuilder: (context, index) {
                  final item = filteredData[index];
                  return _faqCard(item, showCategory: true);
                },
              ),
          ],
        );
      },
    );
  }

  Widget _faqCard(Datum item, {bool showCategory = false}) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.appSurface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.appBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (showCategory) ...[
            Text(
              '#${item.category?.name ?? 'Support'}',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.normal,
                color: AppColors.primaryColor,
              ),
            ),
            SizedBox(height: 1.h),
          ],
          Text(
            item.question ?? '',
            style: TextStyle(
              fontWeight: FontWeight.normal,
              fontSize: 15,
              color: AppColors.appTextPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            item.answer ?? '',
            style: TextStyle(
              fontSize: 13,
              height: 1.35,
              color: AppColors.appTextSecondary,
              fontWeight: FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }

  Widget faqFilterSkeleton() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          height: 48,
          width: double.infinity,
          decoration: BoxDecoration(
            color: Colors.grey.shade300,
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        const SizedBox(height: 16),
        Container(
          height: 18,
          width: 120,
          decoration: BoxDecoration(
            color: Colors.grey.shade300,
            borderRadius: BorderRadius.circular(6),
          ),
        ),
        const SizedBox(height: 10),
        ...List.generate(3, (index) {
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey.shade200,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  height: 14,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(6),
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  height: 12,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(6),
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  height: 12,
                  width: 200,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(6),
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }
}

