import 'dart:developer';
import 'package:esimconnect/utills/country_flag_fallback.dart';
import 'package:esimconnect/utills/failurewidget.dart';
import 'package:esimconnect/utills/global.dart' as global;
import 'package:esimconnect/utills/region_flag_avatar.dart';
import 'package:esimconnect/utills/global.dart';
import 'package:esimconnect/utills/image.dart';
import 'package:esimconnect/views/packageModule/packagesList/view/PlanBadge.dart';
import 'package:esimconnect/views/packageModule/packagesList/view/checkoutscreen.dart';
import 'package:esimconnect/views/packageModule/regionsList/controller/regionalcontroller.dart';
import 'package:esimconnect/views/packageModule/regionsList/model/regionDetailsModel.dart';
import 'package:esimconnect/views/packageModule/regionsList/regionDetail_bloc/regionDetails_bloc.dart';
import 'package:esimconnect/views/packageModule/regionsList/regionDetail_bloc/regionDetails_event.dart';
import 'package:esimconnect/views/packageModule/regionsList/view/regionDetailScreen.dart';
import 'package:esimconnect/widgets/custiomOutlinedButton.dart';
import 'package:esimconnect/widgets/customElevatedButton.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart' hide Transition;
import 'package:get/get.dart';
import 'package:sizer/sizer.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/widgets/loadingSkeletion.dart';
import 'package:skeletonizer/skeletonizer.dart';
import '../../../../utills/UserService.dart';
import '../../../authModule/view/loginScreen.dart';
import '../../../homeModule/kycFormModule/view/KycFormScreen.dart';
import '../../../profileMoulde/userProfileModule/profile_bloc/userprofile_bloc.dart';

class RegionListScreen extends StatefulWidget {
  final String slug;
  const RegionListScreen({super.key, required this.slug});
  @override
  State<RegionListScreen> createState() => _RegionListScreenState();
}

class _RegionListScreenState extends State<RegionListScreen> {
  final reglController = Get.find<RegionalListController>();
  final _scrollController = ScrollController();

  @override
  void dispose() {
    _scrollController.removeListener(_pagination);
    _scrollController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      resetAndFetch();
      _scrollController.addListener(_pagination);
    });
  }

  void resetAndFetch() {
    // Reset controller state
    reglController.resetAllState();

    // Set initial loading
    reglController.updatePaginationState(newIsInitialLoading: true);

    // Fetch first page
    fetchPackages(page: 1);
  }

  void fetchPackages({required int page, bool isLoadMore = false}) {
    if (isLoadMore) {
      reglController.updatePaginationState(newIsLoadingMore: true);
    }
    final isLowToHigh =
        reglController.selectedFilter == FilterType.priceLowToHigh;
    final isHighToLow =
        reglController.selectedFilter == FilterType.priceHighToLow;
    final isUnlimited =
        reglController.selectedFilter == FilterType.unlimitedPlans;
    final isDataPack = reglController.selectedFilter == FilterType.dataPack;
    context.read<RegionDatailsBloc>().add(
      RegionsDetailsEvent(
        regionId: widget.slug,
        page: page,
        limit: reglController.limit,
        isUnlimited: isUnlimited,
        dataPack: isDataPack,
        isLowToHigh: isLowToHigh,
        isHighToLow: isHighToLow,
      ),
    );
  }

  void _pagination() {
    final position = _scrollController.position;

    // Show/hide load more hint
    if (position.pixels < position.maxScrollExtent - 200) {
      if (!reglController.showLoadMoreHint) {
        reglController.updatePaginationState(newShowLoadMoreHint: true);
      }
    } else {
      if (reglController.showLoadMoreHint) {
        reglController.updatePaginationState(newShowLoadMoreHint: false);
      }
    }

    // Load more when scrolled to bottom
    if (position.pixels >= position.maxScrollExtent &&
        reglController.hasMorePages &&
        !reglController.isLoadingMore) {
      loadMorePackages();
    }
  }

  void loadMorePackages() {
    final nextPage = reglController.currentPage + 1;
    fetchPackages(page: nextPage, isLoadMore: true);
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: RefreshIndicator(
        onRefresh: () async {
          resetAndFetch();
        },
        child: BlocListener<UserProfileBloc, ApiState>(
          listener: (context, state) {
            if (state is ApiSuccess) {
              global.UserkycStatus = state.data?.user?.kycStatus ?? '';
            }
          },
          child: GetBuilder<RegionalListController>(
            builder: (reglController) => Scaffold(
              floatingActionButton: reglController.showLoadMoreHint
                  ? Padding(
                      padding: EdgeInsets.only(bottom: 15.w),
                      child: FloatingActionButton(
                        backgroundColor: Colors.transparent,
                        elevation: 0,
                        highlightElevation: 0,
                        splashColor: Colors.transparent,
                        focusColor: Colors.transparent,
                        hoverColor: Colors.transparent,
                        onPressed: () {
                          _scrollController.animateTo(
                            _scrollController.offset + 200,
                            duration: const Duration(milliseconds: 300),
                            curve: Curves.easeOut,
                          );
                        },
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppColors.primaryColor,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.keyboard_arrow_down,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    )
                  : null,
              backgroundColor: AppColors.appBackground,
              body: GetBuilder<RegionalListController>(
                builder: (reglController) {
                  return BlocConsumer<
                    RegionDatailsBloc,
                    ApiState<RegionDetailsModel>
                  >(
                    listener: (context, state) {
                      if (state is ApiLoading) {
                      } else if (state is ApiSuccess<RegionDetailsModel>) {
                        final newPackages = state.data.data?.packages ?? [];
                        final region = state.data.data?.region;
                        final pagination = state.data.data?.pagination;

                        if (pagination != null) {
                          reglController.addPackagesWithPagination(
                            newPackages: newPackages,
                            region: region,
                            page: pagination.page ?? 1,
                            hasNextPage: pagination.hasNextPage ?? false,
                          );
                        } else {
                          reglController.addPackagesWithPagination(
                            newPackages: newPackages,
                            region: region,
                            page: reglController.currentPage,
                            hasNextPage: false,
                          );
                        }

                        log(
                          'Region - ${reglController.currentPage}, Has more: ${reglController.hasMorePages}',
                        );
                      } else if (state is ApiFailure) {
                        // Reset loading states on error
                        reglController.updatePaginationState(
                          newIsLoadingMore: false,
                          newIsInitialLoading: false,
                        );
                      }
                    },
                    builder: (context, state) {
                      final packageList = reglController.regionalList;
                      final regionData = reglController.regionData;
                      final isLoadingInitial = reglController.isInitialLoading;
                      final isInitialError =
                          state is ApiFailure && packageList.isEmpty;

                      if (isLoadingInitial) {
                        return Center(
                          child: Skeletonizer(
                            enabled: true,
                            child: ScrollViewSkeletion(),
                          ),
                        );
                      } else if (isInitialError) {
                        return ApiFailureWidget(
                          onRetry: () {
                            resetAndFetch();
                          },
                        );
                      }

                      final isGlobalRegion =
                          widget.slug.toLowerCase() == 'global';

                      return CustomScrollView(
                        controller: _scrollController,
                        slivers: [
                          SliverAppBar(
                            backgroundColor: AppColors.appBackground,
                            pinned: true,
                            surfaceTintColor: AppColors.appBackground,
                            foregroundColor: AppColors.appTextPrimary,
                            title: Text(
                              isGlobalRegion
                                  ? 'Global Packages'
                                  : 'Regional Details',
                            ).tr(),
                            expandedHeight: 230.0,
                            flexibleSpace: FlexibleSpaceBar(
                              background: Container(
                                padding: EdgeInsets.symmetric(horizontal: 5.w),
                                alignment: Alignment.bottomLeft,
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    colors: [
                                      AppColors.appBackground,
                                      AppColors.appSurface,
                                      AppColors.appAccentPurple.withOpacity(
                                        0.56,
                                      ),
                                    ],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                ),
                                child: Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Column(
                                        mainAxisAlignment:
                                            MainAxisAlignment.end,
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          // Show region name
                                          Text(
                                            regionData?.name ?? 'Region',
                                            style: Theme.of(context)
                                                .textTheme
                                                .bodyMedium!
                                                .copyWith(
                                                  fontSize: 20.sp,
                                                  fontWeight: FontWeight.w400,
                                                  color: AppColors.whiteColor,
                                                ),
                                          ),
                                          // Show package count
                                          if (regionData
                                                  ?.countries
                                                  ?.isNotEmpty ??
                                              false)
                                            Text(
                                              "${regionData?.countries?.length} ${tr("Countries")}",
                                              style: Theme.of(context)
                                                  .textTheme
                                                  .bodyMedium!
                                                  .copyWith(
                                                    fontSize: 14.sp,
                                                    fontWeight: FontWeight.w400,
                                                    color: AppColors.whiteColor
                                                        .withOpacity(0.8),
                                                  ),
                                            ),
                                          SizedBox(height: 2.h),
                                          // Show country count from region
                                          if (regionData?.countries != null &&
                                              regionData!.countries!.isNotEmpty)
                                            GestureDetector(
                                              onTap: () {
                                                _showCountriesSheet(context);
                                              },
                                              child: Container(
                                                width: isGlobalRegion
                                                    ? 62.w
                                                    : 54.w,
                                                margin:
                                                    const EdgeInsets.symmetric(
                                                      horizontal: 2,
                                                    ),
                                                padding: EdgeInsets.all(2.w),
                                                decoration: BoxDecoration(
                                                  color: Colors.white
                                                      .withOpacity(0.1),
                                                  borderRadius:
                                                      BorderRadius.circular(
                                                        10.w,
                                                      ),
                                                  border: Border.all(
                                                    color: Colors.white
                                                        .withOpacity(0.24),
                                                    width: 0.5,
                                                  ),
                                                ),
                                                child: Row(
                                                  children: [
                                                    SizedBox(width: 2.w),
                                                    Icon(
                                                      Icons.language,
                                                      color:
                                                          AppColors.whiteColor,
                                                    ),
                                                    SizedBox(width: 2.w),
                                                    Text(
                                                      "${regionData.countries?.length} Countries",
                                                      style: Theme.of(context)
                                                          .textTheme
                                                          .bodyMedium!
                                                          .copyWith(
                                                            fontSize: 15.sp,
                                                            fontWeight:
                                                                FontWeight.w300,
                                                            color: AppColors
                                                                .whiteColor,
                                                          ),
                                                    ),
                                                    SizedBox(width: 2.w),
                                                    Icon(
                                                      Icons
                                                          .arrow_drop_down_outlined,
                                                      color:
                                                          AppColors.whiteColor,
                                                    ),
                                                  ],
                                                ),
                                              ),
                                            ),
                                          SizedBox(height: 3.h),
                                          SizedBox(height: 2.h),
                                        ],
                                      ),
                                    ),

                                    RegionFlagAvatar(
                                      imagePath: null,
                                      countryCodes: regionData?.countries,
                                      size: 15.w,
                                      backgroundColor: AppColors.primaryColor
                                          .withOpacity(0.1),
                                      borderColor: AppColors.primaryColor,
                                      fallbackColor: AppColors.primaryColor,
                                    ),
                                    SizedBox(height: 3.h),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          SliverToBoxAdapter(
                            child: Container(
                              padding: const EdgeInsets.fromLTRB(
                                16.0,
                                20.0,
                                16.0,
                                8.0,
                              ),
                              decoration: BoxDecoration(
                                color: AppColors.appBackground,
                              ),
                              child: Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'Choose Plan',
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodyMedium!
                                        .copyWith(
                                          fontSize: 18.sp,
                                          fontWeight: FontWeight.normal,
                                          color: AppColors.appTextPrimary,
                                        ),
                                  ).tr(),

                                  InkWell(
                                    borderRadius: BorderRadius.circular(30.w),
                                    onTap: () {
                                      WidgetsBinding.instance
                                          .addPostFrameCallback((_) {
                                            _showFilterOptions();
                                          });
                                    },
                                    child: Container(
                                      padding: EdgeInsets.symmetric(
                                        horizontal: 6,
                                        vertical: 2,
                                      ),
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(
                                          30.w,
                                        ),
                                        color: AppColors.primaryColor
                                            .withOpacity(0.14),
                                        border: Border.all(
                                          color: AppColors.primaryColor,
                                          width: 1,
                                        ),
                                      ),
                                      child: Row(
                                        children: [
                                          Text(
                                            "Filter",
                                            style: Theme.of(context)
                                                .textTheme
                                                .bodyMedium!
                                                .copyWith(
                                                  fontSize: 15.sp,
                                                  fontWeight: FontWeight.normal,
                                                  color: AppColors.primaryColor,
                                                ),
                                          ).tr(),
                                          SizedBox(width: 1.w),
                                          Icon(
                                            Icons.filter_list_rounded,
                                            color: AppColors.primaryColor,
                                            size: 18.sp,
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),

                          if (packageList.isNotEmpty)
                            SliverGrid(
                              delegate: SliverChildBuilderDelegate((
                                context,
                                index,
                              ) {
                                final Package plan = packageList[index];

                                return GestureDetector(
                                  onTap: () {
                                    reglController.updateSelectedIndex(index);
                                  },
                                  child: _buildPackageCard(
                                    context,
                                    index: index,
                                    plan: plan,
                                    regionData: regionData,
                                    onpressed: () {
                                      Get.to(
                                        () => RegionDetailScreen(
                                          regionId: plan.id,
                                        ),
                                      );
                                    },
                                  ),
                                );
                              }, childCount: packageList.length),
                              gridDelegate:
                                  const SliverGridDelegateWithFixedCrossAxisCount(
                                    crossAxisCount: 2,
                                    crossAxisSpacing: 0,
                                    mainAxisSpacing: 8,
                                    childAspectRatio: 0.64,
                                  ),
                            )
                          else if (packageList.isEmpty && !isLoadingInitial)
                            SliverFillRemaining(
                              hasScrollBody: false,
                              child: Container(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.sim_card_outlined,
                                      color: AppColors.appTextSecondary,
                                      size: 64,
                                    ),
                                    const SizedBox(height: 16),
                                    Text(
                                      'No Packages available Currently',
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodyMedium!
                                          .copyWith(
                                            color: AppColors.appTextSecondary,
                                            fontSize: 18,
                                          ),
                                    ).tr(),
                                  ],
                                ),
                              ),
                            ),

                          if (reglController.isLoadingMore)
                            SliverToBoxAdapter(
                              child: Padding(
                                padding: const EdgeInsets.symmetric(
                                  vertical: 20.0,
                                ),
                                child: Center(
                                  child: global.showPaginationLoader(context),
                                ),
                              ),
                            ),

                          SliverToBoxAdapter(child: SizedBox(height: 10.h)),
                        ],
                      );
                    },
                  );
                },
              ),
              bottomSheet: (reglController.regionalList.isNotEmpty)
                  ? _buildBottomBar(context)
                  : const SizedBox.shrink(),
            ),
          ),
        ),
      ),
    );
  }

  final userService = UserService.to;
  Widget _buildBottomBar(BuildContext context) {
    return GetBuilder<RegionalListController>(
      builder: (reglController) {
        if (reglController.regionalList.isEmpty ||
            reglController.selectedindex >=
                reglController.regionalList.length) {
          return const SizedBox.shrink();
        }

        final selectedPackage =
            reglController.regionalList[reglController.selectedindex];

        return Container(
          height: 10.5.h,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
          decoration: BoxDecoration(
            color: AppColors.appSurface,
            border: Border(top: BorderSide(color: AppColors.appBorder)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.32),
                blurRadius: 22,
                offset: const Offset(0, -10),
              ),
            ],
          ),
          child: SafeArea(
            top: false,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      selectedPackage.title ?? "Package",
                      style: TextStyle(
                        fontSize: 14.sp,
                        fontWeight: FontWeight.normal,
                        color: AppColors.whiteColor.withOpacity(0.9),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      '$activeCurrencysymbol ${selectedPackage.price ?? "0.00"}',
                      style: TextStyle(
                        fontSize: 16.sp,
                        fontWeight: FontWeight.normal,
                        color: AppColors.whiteColor,
                      ),
                    ),
                  ],
                ),

                CustomElevatedButton(
                  onPressed: () {
                    final bool hasCallingFeatures =
                        (selectedPackage.voiceMinutes ?? 0) > 0 ||
                        (selectedPackage.smsCount ?? 0) > 0;

                    print('''
                          📦 Package Buying Info:
                            • kyc Status   : ${global.UserkycStatus}
                            • Package Type : ${selectedPackage.type}
                            • Has Calling  : $hasCallingFeatures
                            • Package voice: ${selectedPackage.voiceMinutes}
                            • Package smsCount: ${selectedPackage.smsCount}

                     ''');

                    if (global.UserkycStatus != "approved" &&
                        hasCallingFeatures) {
                      if (userService.currentUserData != null &&
                          userService
                                  .currentUserData
                                  ?.data
                                  ?.token
                                  ?.isNotEmpty ==
                              true) {
                        print("user login");
                        // Show KYC requirement
                        global.showToastMessage(
                          message: tr(
                            "To continue, please log in and complete your KYC",
                          ),
                        );
                        Get.to(() => KycFormScreen());
                      } else {
                        // Show KYC requirement
                        global.showToastMessage(
                          message: tr("To continue, please log in"),
                        );
                        print("not login");
                        Get.offAll(() => LoginScreen());
                      }
                      return;
                    }

                    Get.to(
                      () => Checkoutscreen(
                        packageListInfo: selectedPackage,
                        isShowDestination: false,
                        countryname: reglController.regionData?.name ?? "",
                        flagemoji: reglController.regionData?.image ?? "",
                      ),
                    );
                  },
                  text: tr('Buy Now'),
                  height: 40,
                  borderRadius: 30,
                  foregroundColor: AppColors.appBackground,
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildPackageCard(
    BuildContext context, {
    required Package plan,
    required Region? regionData,
    required VoidCallback onpressed,
    required int index,
  }) {
    final badge = getPlanBadge(plan);
    final bool isDisabled = plan.isEnabled == false;

    return GetBuilder<RegionalListController>(
      builder: (reglController) {
        return Opacity(
          opacity: isDisabled ? 0.5 : 1,
          child: Stack(
            children: [
              Container(
                margin: EdgeInsets.symmetric(horizontal: 2.w, vertical: 1.w),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: badge != null
                      ? badge.color.withOpacity(0.12)
                      : AppColors.appSurface,
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(
                    color: reglController.selectedindex == index
                        ? AppColors.primaryColor
                        : badge?.color.withOpacity(0.7) ?? AppColors.appBorder,
                    width: reglController.selectedindex == index ? 1.5 : 0.8,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.2),
                      blurRadius: 18,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    /// BADGE
                    if (badge != null)
                      Align(
                        alignment: Alignment.center,
                        child: Container(
                          padding: EdgeInsets.symmetric(
                            horizontal: 4.w,
                            vertical: 6,
                          ),
                          margin: const EdgeInsets.only(bottom: 10),
                          decoration: BoxDecoration(
                            color: badge.color,
                            borderRadius: BorderRadius.circular(30),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(badge.icon, color: Colors.white, size: 16),
                              const SizedBox(width: 6),
                              Text(
                                badge.label,
                                style: Theme.of(context).textTheme.bodyMedium!
                                    .copyWith(
                                      color: Colors.white,
                                      fontWeight: FontWeight.normal,
                                      fontSize: 13.sp,
                                    ),
                              ),
                            ],
                          ),
                        ),
                      )
                    else
                      Align(
                        alignment: Alignment.center,
                        child: Container(
                          width: 35.w,
                          alignment: Alignment.center,
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: EdgeInsets.symmetric(
                            horizontal: 3.w,
                            vertical: 7,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.primaryColor.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(30.w),
                            border: Border.all(color: AppColors.appBorder),
                          ),
                          child: Image.asset(
                            Images.ESimTel_TextLogo,
                            width: 22.w,
                            height: 10.w,
                            fit: BoxFit.contain,
                          ),
                        ),
                      ),

                    /// TITLE + FLAG
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            plan.title ?? "Package",
                            style: Theme.of(context).textTheme.titleMedium!
                                .copyWith(
                                  fontWeight: FontWeight.normal,
                                  color: AppColors.appTextPrimary,
                                ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ).tr(),
                        ),
                        RegionFlagAvatar(
                          imagePath: null,
                          countryCodes:
                              plan.region?.countries ?? regionData?.countries,
                          size: 8.w,
                          backgroundColor: AppColors.primaryColor.withOpacity(
                            0.1,
                          ),
                          borderColor: AppColors.appBorder,
                          fallbackColor: AppColors.primaryColor,
                        ),
                      ],
                    ),

                    SizedBox(height: 3.w),

                    /// FEATURES
                    Row(
                      mainAxisAlignment: MainAxisAlignment.start,
                      children: [
                        _buildFeatureIconAndText(
                          imagePath: Images.signalIcon,
                          iconColor: AppColors.primaryColor,
                          value: plan.dataAmount ?? '0',
                        ),
                        if (plan.voiceMinutes != null && plan.voiceMinutes! > 0)
                          _buildFeatureIconAndText(
                            imagePath: Images.CallIcon,
                            iconColor: AppColors.redColor,
                            value: '${plan.voiceMinutes} Mins',
                          ),
                        if (plan.smsCount != null && plan.smsCount! > 0)
                          _buildFeatureIconAndText(
                            imagePath: Images.messageIcon,
                            iconColor: AppColors.darkgreen,
                            value: '${plan.smsCount} SMS',
                          ),
                      ],
                    ),

                    const Spacer(),

                    /// PRICE + VALIDITY
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '${plan.validity} Day${plan.validity != 1 ? 's' : ''}',
                          style: Theme.of(context).textTheme.bodyMedium!
                              .copyWith(color: AppColors.appTextSecondary),
                        ),
                        Text(
                          "$activeCurrencysymbol ${plan.price}",
                          style: Theme.of(context).textTheme.titleMedium!
                              .copyWith(
                                fontWeight: FontWeight.normal,
                                color: AppColors.appTextPrimary,
                              ),
                        ),
                      ],
                    ),

                    Divider(color: badge?.color ?? AppColors.appBorder),

                    /// ACTION
                    Align(
                      alignment: Alignment.bottomRight,
                      child: CustomOutlinedButton(
                        padding: EdgeInsets.all(0.w),
                        borderRadius: 2.w,
                        width: 18.w,
                        height: 3.h,
                        onPressed: isDisabled ? null : onpressed,
                        text: tr('View'),
                        fontSize: 14.sp,
                        textColor: AppColors.primaryColor,
                        borderColor: AppColors.primaryColor,
                        backgroundColor: MaterialStateProperty.all(
                          AppColors.primaryColor.withOpacity(0.08),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              /// SELECTED CHECK
              if (reglController.selectedindex == index)
                Positioned(
                  top: 10,
                  right: 12,
                  child: Container(
                    height: 22,
                    width: 22,
                    decoration: BoxDecoration(
                      color: AppColors.primaryColor,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.check,
                      size: 14,
                      color: Colors.white,
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildFeatureIconAndText({
    required String imagePath,
    required Color iconColor,
    required dynamic value,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Column(
        children: [
          Image.asset(imagePath, height: 17.sp, color: iconColor),
          const SizedBox(height: 4),
          Text(
            value.toString(),
            style: TextStyle(
              fontSize: 13.sp,
              fontWeight: FontWeight.normal,
              color: AppColors.appTextPrimary,
            ),
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  void _showFilterOptions() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (BuildContext context) {
        return StatefulBuilder(
          builder: (BuildContext context, StateSetter modalSetState) {
            return SafeArea(
              child: Container(
                padding: EdgeInsets.all(16.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "Filter",
                      style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                        fontSize: 18.sp,
                        color: AppColors.textColor,
                      ),
                    ).tr(),
                    SizedBox(height: 16.0),
                    RadioListTile<FilterType>(
                      title: Text('Price low to high').tr(),
                      value: FilterType.priceLowToHigh,
                      groupValue: reglController.selectedFilter,
                      onChanged: (FilterType? value) {
                        modalSetState(() {
                          reglController.updateSelectedFilter(value!);
                        });
                        _applyFilter(context);
                      },
                    ),
                    RadioListTile<FilterType>(
                      title: Text('Price high to low').tr(),
                      value: FilterType.priceHighToLow,
                      groupValue: reglController.selectedFilter,
                      onChanged: (FilterType? value) {
                        modalSetState(() {
                          reglController.updateSelectedFilter(value!);
                        });
                        _applyFilter(context);
                      },
                    ),
                    RadioListTile<FilterType>(
                      title: Text('Unlimited Plans').tr(),
                      value: FilterType.unlimitedPlans,
                      groupValue: reglController.selectedFilter,
                      onChanged: (FilterType? value) {
                        modalSetState(() {
                          reglController.updateSelectedFilter(value!);
                        });
                        _applyFilter(context);
                      },
                    ),
                    RadioListTile<FilterType>(
                      title: Text('Data Pack').tr(),
                      value: FilterType.dataPack,
                      groupValue: reglController.selectedFilter,
                      onChanged: (FilterType? value) {
                        modalSetState(() {
                          reglController.updateSelectedFilter(value!);
                        });
                        _applyFilter(context);
                      },
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _showCountriesSheet(BuildContext context) {
    final regionData = reglController.regionData;
    if (regionData?.countries == null || regionData!.countries!.isEmpty) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.5,
          minChildSize: 0.2,
          maxChildSize: 0.85,
          expand: false,
          builder: (context, scrollController) {
            return Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: Column(
                children: [
                  Padding(
                    padding: EdgeInsets.all(16.0),
                    child: Text(
                      'Coverage Countries',
                      style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                        fontSize: 18.sp,
                        fontWeight: FontWeight.normal,
                      ),
                    ).tr(args: [regionData.countries!.length.toString()]),
                  ),
                  Expanded(
                    child: ListView.builder(
                      padding: EdgeInsets.symmetric(
                        horizontal: 5.w,
                        vertical: 1.w,
                      ),
                      controller: scrollController,
                      itemCount: regionData.countries!.length,
                      itemBuilder: (context, index) {
                        final countryCode = regionData.countries![index];
                        final countryName = countryCode;
                        return Container(
                          margin: EdgeInsets.symmetric(vertical: 2.w),
                          padding: EdgeInsets.symmetric(
                            horizontal: 4.w,
                            vertical: 3.w,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.scaffoldbackgroudColor,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Row(
                            children: [
                              SizedBox(
                                width: 10.w,
                                height: 10.w,
                                child: Center(
                                  child: buildCountryFlagOrEmoji(
                                    countryCode: countryCode,
                                    size: 23.sp,
                                    fallbackColor: AppColors.primaryColor,
                                  ),
                                ),
                              ),
                              SizedBox(width: 5.w),
                              Expanded(
                                child: Text(
                                  global.getCountryName(countryName),
                                  style: Theme.of(context).textTheme.bodyMedium!
                                      .copyWith(fontWeight: FontWeight.normal),
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _applyFilter(BuildContext context) {
    final isLowToHigh =
        reglController.selectedFilter == FilterType.priceLowToHigh;
    final isHighToLow =
        reglController.selectedFilter == FilterType.priceHighToLow;
    final isUnlimited =
        reglController.selectedFilter == FilterType.unlimitedPlans;
    final isDataPack = reglController.selectedFilter == FilterType.dataPack;

    reglController.updateSelectedIndex(0);
    context.read<RegionDatailsBloc>().add(
      RegionsDetailsEvent(
        regionId: widget.slug,
        page: 1,
        limit: reglController.limit,
        isUnlimited: isUnlimited,
        dataPack: isDataPack,
        isLowToHigh: isLowToHigh,
        isHighToLow: isHighToLow,
      ),
    );
    Navigator.pop(context);
    resetAndFetch();
  }
}
