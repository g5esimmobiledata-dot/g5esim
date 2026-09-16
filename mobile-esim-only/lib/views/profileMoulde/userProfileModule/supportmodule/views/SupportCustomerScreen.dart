import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/supportmodule/bloc/faq_bloc/faq_bloc.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/supportmodule/bloc/faq_bloc/faq_event.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/supportmodule/model/FaqModel.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/supportmodule/views/myTicketScreen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get/get.dart';
import 'package:sizer/sizer.dart';

import 'SupportCard.dart';

class SupportCustomerScreen extends StatefulWidget {
  const SupportCustomerScreen({super.key});

  @override
  State<SupportCustomerScreen> createState() => _SupportCustomerScreenState();
}

class _SupportCustomerScreenState extends State<SupportCustomerScreen> {
  @override
  void initState() {
    super.initState();
    context.read<FAQBloc>().add(FaqEvent());
  }

  void _openSupportTickets() {
    Get.to(() => MyTicketsScrren());
  }

  @override
  Widget build(BuildContext context) {
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
              ),
            ],
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

