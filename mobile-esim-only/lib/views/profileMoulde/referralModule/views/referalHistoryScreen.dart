import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:sizer/sizer.dart';
import '../../../../core/bloc/api_state.dart';
import '../../../../utills/appColors.dart';
import '../../../../utills/global.dart' as global;
import '../../giftCardModule/bloc/GiftHistoryBloc.dart';
import '../../giftCardModule/giftModels/giftHistoryModel.dart';
import '../bloc/referral_history_bloc.dart';
import '../referralModels/referral_history_model.dart';

class Referalhistoryscreen extends StatefulWidget {
  const Referalhistoryscreen({super.key});

  @override
  State<Referalhistoryscreen> createState() => _ReferalhistoryscreenState();
}

class _ReferalhistoryscreenState extends State<Referalhistoryscreen> {
  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: AppColors.scaffoldbackgroudColor,
        appBar: AppBar(
          title: Text(
            "History",
            style: TextStyle(
              fontSize: 20.sp,
              fontWeight: FontWeight.normal,
              color: AppColors.appTextPrimary,
            ),
          ).tr(),
          elevation: 0,
          backgroundColor: AppColors.appBackground,
          leading: IconButton(
            icon: Icon(
              Icons.arrow_back_ios_new_rounded,
              color: AppColors.appTextPrimary,
              size: 18.sp,
            ),
            onPressed: () => Navigator.pop(context),
          ),
          bottom: PreferredSize(
            preferredSize: Size.fromHeight(60),
            child: _buildTabBar(),
          ),
        ),
        body: Column(
          children: [
            Expanded(
              child: TabBarView(
                children: [
                  _buildReferralHistoryTab(),
                  _buildGiftCardHistoryTab(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTabBar() {
    return Container(
      height: 6.h,
      margin: EdgeInsets.symmetric(horizontal: 4.w, vertical: 1.h),
      decoration: BoxDecoration(
        color: AppColors.appSurfaceAlt,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.appBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 2.w,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: TabBar(
        indicatorSize: TabBarIndicatorSize.tab,
        indicator: BoxDecoration(
          gradient: LinearGradient(
            colors: [AppColors.primaryColor, AppColors.secondaryColor],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: AppColors.primaryColor.withOpacity(0.3),
              blurRadius: 2.w,
              offset: Offset(0, 3),
            ),
          ],
        ),
        labelColor: Colors.white,
        unselectedLabelColor: AppColors.appTextSecondary,
        labelStyle: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.normal),
        unselectedLabelStyle: TextStyle(
          fontSize: 13.sp,
          fontWeight: FontWeight.normal,
        ),
        tabs: [
          Tab(
            icon: Icon(Icons.people_alt_outlined, size: 18.sp),
            text: tr("Referrals"),
          ),
          Tab(
            icon: Icon(Icons.card_giftcard, size: 18.sp),
            text: tr("Gift Cards"),
          ),
        ],
      ),
    );
  }

  Widget _buildReferralHistoryTab() {
    return BlocBuilder<ReferralHistoryBloc, ApiState<ReferralHistoryModel>>(
      builder: (context, state) {
        if (state is ApiLoading) {
          return Center(
            child: CircularProgressIndicator(
              color: AppColors.primaryColor,
              strokeWidth: 2,
            ),
          );
        }

        if (state is ApiFailure) {
          return _buildErrorState(state.error!);
        }

        List<Referral>? referralHistory = state.data?.referrals;

        if (referralHistory == null || referralHistory.isEmpty) {
          return _buildEmptyState(
            icon: Icons.people_outline,
            title: tr("No Referrals Yet"),
            subtitle: tr("Your referral history will appear here"),
          );
        }

        return Padding(
          padding: EdgeInsets.all(12.sp),
          child: RefreshIndicator(
            color: AppColors.primaryColor,
            onRefresh: () async {
              // Add refresh logic here if needed
            },
            child: ListView.builder(
              padding: EdgeInsets.only(top: 4),
              physics: AlwaysScrollableScrollPhysics(),
              itemCount: referralHistory.length,
              itemBuilder: (context, index) {
                return _buildReferralCard(referralHistory[index]);
              },
            ),
          ),
        );
      },
    );
  }

  Widget _buildReferralCard(Referral item) {
    final isSuccess = item.status?.toLowerCase() == "completed";

    return Container(
      margin: EdgeInsets.only(bottom: 12.sp),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        color: AppColors.appSurface,
        border: Border.all(color: AppColors.appBorder),
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
              children: [
                Row(
                  children: [
                    Container(
                      width: 22.sp,
                      height: 22.sp,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: LinearGradient(
                          colors: isSuccess
                              ? [Colors.green.shade100, Colors.green.shade50]
                              : [Colors.orange.shade100, Colors.orange.shade50],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                      ),
                      child: Icon(
                        isSuccess ? Icons.check_circle : Icons.pending,
                        color: isSuccess ? Colors.green : Colors.orange,
                        size: 22.sp,
                      ),
                    ),
                    SizedBox(width: 12.sp),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.referredUserName ?? tr("Unknown User"),
                            style: TextStyle(
                              fontSize: 17.sp,
                              fontWeight: FontWeight.normal,
                              color: AppColors.appTextPrimary,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          SizedBox(height: 2.sp),
                          Text(
                            item.referralCode ?? "",
                            style: TextStyle(
                              fontSize: 14.sp,
                              color: AppColors.appTextSecondary,
                              fontFamily: 'monospace',
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: EdgeInsets.symmetric(
                        horizontal: 10.sp,
                        vertical: 6.sp,
                      ),
                      decoration: BoxDecoration(
                        color: isSuccess
                            ? Colors.green.withOpacity(0.1)
                            : Colors.orange.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: isSuccess
                              ? Colors.green.withOpacity(0.3)
                              : Colors.orange.withOpacity(0.3),
                          width: 1,
                        ),
                      ),
                      child: Text(
                        isSuccess ? tr("COMPLETED") : tr("PENDING"),
                        style: TextStyle(
                          color: isSuccess ? Colors.green : Colors.orange,
                          fontWeight: FontWeight.normal,
                          fontSize: 15.sp,
                        ),
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 16.sp),
                Divider(height: 1, color: AppColors.appBorder),
                SizedBox(height: 12.sp),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          tr("Reward"),
                          style: TextStyle(
                            fontSize: 14.sp,
                            color: AppColors.appTextSecondary,
                          ),
                        ),
                        SizedBox(height: 4.sp),
                        Text(
                          "${global.activeCurrencysymbol} ${item.rewardAmount}",
                          style: TextStyle(
                            fontSize: 16.sp,
                            fontWeight: FontWeight.normal,
                            color: AppColors.primaryColor,
                          ),
                        ),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          tr("Date"),
                          style: TextStyle(
                            fontSize: 14.sp,
                            color: AppColors.appTextSecondary,
                          ),
                        ),
                        SizedBox(height: 4.sp),
                        Text(
                          global.timeZoneformatDate(item.createdAt.toString()),
                          style: TextStyle(
                            fontSize: 15.sp,
                            fontWeight: FontWeight.normal,
                            color: AppColors.appTextSecondary,
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

  Widget _buildGiftCardHistoryTab() {
    return BlocBuilder<GiftHistoryBloc, ApiState<GiftCardHistoryModel>>(
      builder: (context, state) {
        if (state is ApiLoading) {
          return Center(
            child: CircularProgressIndicator(
              color: AppColors.primaryColor,
              strokeWidth: 2,
            ),
          );
        }

        if (state is ApiFailure) {
          return _buildErrorState(state.error!);
        }

        List<GiftCardsDatum>? giftCards = state.data?.data;

        if (giftCards == null || giftCards.isEmpty) {
          return _buildEmptyState(
            icon: Icons.card_giftcard,
            title: tr("No Gift Cards"),
            subtitle: tr("Your gift card history will appear here"),
          );
        }

        return Padding(
          padding: EdgeInsets.all(12.sp),
          child: RefreshIndicator(
            color: AppColors.primaryColor,
            onRefresh: () async {
              // Add refresh logic here if needed
            },
            child: ListView.builder(
              padding: EdgeInsets.only(top: 4),
              physics: AlwaysScrollableScrollPhysics(),
              itemCount: giftCards.length,
              itemBuilder: (context, index) {
                return global.buildGiftCardItem(giftCards[index]);
              },
            ),
          ),
        );
      },
    );
  }

  Widget _buildEmptyState({
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 80.sp,
            height: 80.sp,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.appSurfaceAlt,
            ),
            child: Icon(icon, size: 40.sp, color: AppColors.appTextSecondary),
          ),
          SizedBox(height: 20.sp),
          Text(
            title,
            style: TextStyle(
              fontSize: 18.sp,
              fontWeight: FontWeight.normal,
              color: AppColors.appTextPrimary,
            ),
          ),
          SizedBox(height: 8.sp),
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 40.sp),
            child: Text(
              subtitle,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13.sp,
                color: AppColors.appTextSecondary,
              ),
            ),
          ),
          SizedBox(height: 24.sp),
          Container(
            width: 180.sp,
            height: 22.sp,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [AppColors.primaryColor, AppColors.secondaryColor],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(22.sp),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primaryColor.withOpacity(0.3),
                  blurRadius: 10,
                  offset: Offset(0, 4),
                ),
              ],
            ),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(22.sp),
                onTap: () => Navigator.pop(context),
                child: Center(
                  child: Text(
                    tr("Go Back"),
                    style: TextStyle(
                      fontSize: 14.sp,
                      fontWeight: FontWeight.normal,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(String error) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 60.sp, color: Colors.red.shade400),
          SizedBox(height: 20.sp),
          Text(
            tr("Something went wrong"),
            style: TextStyle(
              fontSize: 18.sp,
              fontWeight: FontWeight.normal,
              color: AppColors.appTextPrimary,
            ),
          ),
          SizedBox(height: 8.sp),
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 40.sp),
            child: Text(
              error,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13.sp,
                color: AppColors.appTextSecondary,
              ),
            ),
          ),
          SizedBox(height: 24.sp),
          Container(
            width: 180.sp,
            height: 22.sp,
            decoration: BoxDecoration(
              color: Colors.red.shade50,
              borderRadius: BorderRadius.circular(22.sp),
              border: Border.all(color: Colors.red.shade200, width: 1.5),
            ),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(22.sp),
                onTap: () {
                  // Add retry logic here
                },
                child: Center(
                  child: Text(
                    tr("Retry"),
                    style: TextStyle(
                      fontSize: 14.sp,
                      fontWeight: FontWeight.normal,
                      color: Colors.red.shade600,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
