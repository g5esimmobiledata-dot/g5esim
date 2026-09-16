import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get/get_core/src/get_main.dart';
import 'package:get/get_navigation/src/extension_navigation.dart';
import 'package:sizer/sizer.dart';

import '../../../../core/bloc/api_state.dart';
import '../../../../utills/UserService.dart';
import '../../../../utills/appColors.dart';
import '../../../navbarModule/views/bottomNavBarScreen.dart';
import '../bloc/GiftCardHistoryevent.dart';
import '../bloc/GiftHistoryBloc.dart';
import '../giftModels/giftHistoryModel.dart';
import '../../../../utills/global.dart' as global;

class Viewgiftcardhistory extends StatelessWidget {
  Viewgiftcardhistory({super.key});

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
              color: Colors.grey.shade700,
            ),
          ),
          SizedBox(height: 8.sp),
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 40.sp),
            child: Text(
              error,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13.sp, color: Colors.grey.shade500),
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

  Widget _buildEmptyState({
    required IconData icon,
    required String title,
    required String subtitle,
    required BuildContext context,
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
              color: Colors.grey.shade100,
            ),
            child: Icon(icon, size: 40.sp, color: Colors.grey.shade400),
          ),
          SizedBox(height: 20.sp),
          Text(
            title,
            style: TextStyle(
              fontSize: 18.sp,
              fontWeight: FontWeight.normal,
              color: Colors.grey.shade600,
            ),
          ),
          SizedBox(height: 8.sp),
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 40.sp),
            child: Text(
              subtitle,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13.sp, color: Colors.grey.shade500),
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

  Widget _buildTabContent({
    required List<GiftCardsDatum> cards,
    required BuildContext context,
    required String emptyTitle,
    required String emptySubtitle,
    required IconData emptyIcon,
  }) {
    if (cards.isEmpty) {
      return _buildEmptyState(
        icon: emptyIcon,
        title: tr(emptyTitle),
        subtitle: tr(emptySubtitle),
        context: context,
      );
    }

    return RefreshIndicator(
      color: AppColors.primaryColor,
      onRefresh: () async {
        context.read<GiftHistoryBloc>().add(GiftHistoryevent());
      },
      child: ListView.builder(
        padding: EdgeInsets.only(top: 4),
        physics: AlwaysScrollableScrollPhysics(),
        itemCount: cards.length,
        itemBuilder: (context, index) {
          return global.buildGiftCardItem(cards[index]);
        },
      ),
    );
  }

  final _userService = UserService.to;
  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async {
        Get.off(() => BottomNavigationBarScreen(index: 0));
        return false;
      },
      child: DefaultTabController(
        length: 2,
        child: Scaffold(
          appBar: AppBar(
            title: Text(tr("Gift Card History")),
            bottom: TabBar(
              onTap: (index) {
                context.read<GiftHistoryBloc>().add(GiftHistoryevent());
              },
              indicatorColor: AppColors.primaryColor,
              labelColor: AppColors.blackColor,
              unselectedLabelColor: Colors.white,
              labelStyle: TextStyle(
                fontSize: 14.sp,
                fontWeight: FontWeight.normal,
              ),
              unselectedLabelStyle: TextStyle(
                fontSize: 14.sp,
                fontWeight: FontWeight.w400,
              ),
              tabs: [
                Tab(text: tr("Purchased")),
                Tab(text: tr("Received")),
              ],
            ),
          ),
          body: BlocBuilder<GiftHistoryBloc, ApiState<GiftCardHistoryModel>>(
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

              List<GiftCardsDatum> allCards = state.data?.data ?? [];
              return Padding(
                padding: EdgeInsets.all(12.sp),
                child: TabBarView(
                  children: [
                    _buildTabContent(
                      cards: allCards
                          .where(
                            (card) =>
                                card.purchasedBy ==
                                _userService.currentUserData?.data?.id,
                          )
                          .toList(),
                      context: context,
                      emptyTitle: "No Purchased Cards",
                      emptySubtitle: "Gift cards you purchase will appear here",
                      emptyIcon: Icons.shopping_bag_outlined,
                    ),
                    _buildTabContent(
                      cards: allCards
                          .where(
                            (card) =>
                                card.purchasedBy !=
                                _userService.currentUserData?.data?.id,
                          )
                          .toList(),
                      context: context,
                      emptyTitle: "No Received Cards",
                      emptySubtitle: "Gift cards sent to you will appear here",
                      emptyIcon: Icons.card_giftcard_outlined,
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
