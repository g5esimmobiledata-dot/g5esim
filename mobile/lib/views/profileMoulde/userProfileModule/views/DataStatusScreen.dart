import 'dart:developer';

import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/views/homeModule/getUsageModule/bloc/data_usage_bloc.dart';
import 'package:esimconnect/views/homeModule/getUsageModule/bloc/home_event.dart';
import 'package:esimconnect/views/homeModule/getUsageModule/model/dataUsage_Model.dart';
import 'package:esimconnect/views/homeModule/getUsageModule/views/PackageCarousel.dart';
import 'package:esimconnect/views/homeModule/getUsageModule/views/getusageSkelton.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:sizer/sizer.dart';
import 'package:skeletonizer/skeletonizer.dart';

class DataStatusScreen extends StatefulWidget {
  const DataStatusScreen({super.key});

  @override
  State<DataStatusScreen> createState() => _DataStatusScreenState();
}

class _DataStatusScreenState extends State<DataStatusScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<DataUsageBloc>().add(HomeEvent());
    });
  }

  Future<void> _refreshDataStatus() async {
    context.read<DataUsageBloc>().add(HomeEvent());
  }

  @override
  Widget build(BuildContext context) {
    AppColors.applyTheme(Theme.of(context).brightness == Brightness.dark);

    return SafeArea(
      child: Scaffold(
        backgroundColor: AppColors.scaffoldbackgroudColor,
        appBar: AppBar(title: const Text('Data Status').tr()),
        body: RefreshIndicator(
          onRefresh: _refreshDataStatus,
          child: ListView(
            padding: EdgeInsets.symmetric(vertical: 2.h),
            children: [
              BlocConsumer<DataUsageBloc, ApiState<DataUsageModel>>(
                listener: (context, state) {
                  if (state is ApiFailure) {
                    log('data status error is ${state.error}');
                  }
                },
                builder: (context, state) {
                  if (state is ApiLoading) {
                    return Skeletonizer(
                      enabled: true,
                      child: const GetUsageCardSkeleton(),
                    );
                  }

                  if (state is ApiSuccess<DataUsageModel>) {
                    final activePackages = (state.data.data ?? [])
                        .where((item) => item.usage?.status == 'active')
                        .toList();

                    if (activePackages.isEmpty) {
                      return _buildEmptyState(context);
                    }

                    return PackageCarousel(
                      data: activePackages,
                      isLoading: false,
                    );
                  }

                  return _buildEmptyState(context);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 5.w, vertical: 3.h),
      padding: EdgeInsets.all(5.w),
      decoration: BoxDecoration(
        color: AppColors.appSurface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.appBorder),
      ),
      child: Column(
        children: [
          Icon(
            Icons.data_usage_rounded,
            color: AppColors.appTextSecondary,
            size: 34.sp,
          ),
          SizedBox(height: 1.5.h),
          Text(
            'No active data status found',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: AppColors.appTextPrimary,
              fontSize: 15.sp,
              fontWeight: FontWeight.normal,
            ),
          ).tr(),
          SizedBox(height: 0.8.h),
          Text(
            'Your active eSIM usage will appear here.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: AppColors.appTextSecondary,
              fontSize: 13.sp,
            ),
          ).tr(),
        ],
      ),
    );
  }
}
