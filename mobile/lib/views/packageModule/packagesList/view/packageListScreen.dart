import 'package:esimconnect/utills/country_flag_fallback.dart';
import 'package:esimconnect/utills/global.dart';
import 'package:esimconnect/utills/image.dart';
import 'package:esimconnect/views/packageModule/packagesList/view/PlanBadge.dart';
import 'package:esimconnect/views/packageModule/packagesList/view/checkoutscreen.dart';
import 'package:esimconnect/widgets/custiomOutlinedButton.dart';
import 'package:esimconnect/widgets/customElevatedButton.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get/get.dart';
import 'package:sizer/sizer.dart';
import 'package:skeletonizer/skeletonizer.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/views/packageModule/packagesList/bloc/package_List_bloc/packageList_bloc.dart';
import 'package:esimconnect/views/packageModule/packagesList/bloc/package_List_bloc/packageList_event.dart';
import 'package:esimconnect/views/packageModule/packagesList/model/packageListModel.dart';
import 'package:esimconnect/widgets/loadingSkeletion.dart';
import '../../../../utills/UserService.dart';
import '../../../../utills/failurewidget.dart';
import '../../../homeModule/kycFormModule/view/KycFormScreen.dart';
import '../../../profileMoulde/userProfileModule/profile_bloc/userprofile_bloc.dart';
import '../../../profileMoulde/userProfileModule/profile_bloc/userprofile_event.dart';
import '../controller/packagelistcontorller.dart';
import 'package:esimconnect/utills/global.dart' as global;
import 'packageDetailsScreen.dart';

class PackageListScreen extends StatefulWidget {
  final String slug;
  const PackageListScreen({super.key, required this.slug});

  @override
  State<PackageListScreen> createState() => _PackageListScreenState();
}

class _PackageListScreenState extends State<PackageListScreen> {
  int? selectedLoadingIndex;
  final packagelistcontroller = Get.find<PackageListController>();
  final userService = UserService.to;
  FilterType selectedFilter = FilterType.none;
  final scrollController = ScrollController();
  String? countryname, flagemoji, flagcountrycode;
  String? _appBarTitle;
  static const Color _cardPrimaryTextColor = Color(0xff101828);
  static const Color _cardSecondaryTextColor = Color(0xff667085);
  static const Map<String, String> _countryCodeBySlug = {'vietnam': 'VN'};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((timeStamp) {
      resetAndFetch();
      context.read<UserProfileBloc>().add(UserProfileEvent());
      packagelistcontroller.selectedindex = 0;
      packagelistcontroller.update();
      scrollController.addListener(_pagination);
      _appBarTitle = widget.slug.toUpperCase();
    });
  }

  @override
  void dispose() {
    scrollController.removeListener(_pagination);
    scrollController.dispose();
    super.dispose();
  }

  void _pagination() {
    final position = scrollController.position;
    if (position.pixels < position.maxScrollExtent - 200) {
      if (!packagelistcontroller.showLoadMoreHint) {
        packagelistcontroller.updatePaginationState(newShowLoadMoreHint: true);
      }
    } else {
      if (packagelistcontroller.showLoadMoreHint) {
        packagelistcontroller.updatePaginationState(newShowLoadMoreHint: false);
      }
    }
    if (position.pixels >= position.maxScrollExtent &&
        packagelistcontroller.hasMorePages &&
        !packagelistcontroller.isLoadingMore) {
      loadMorePackages();
    }
  }

  void loadMorePackages() {
    final nextPage = packagelistcontroller.currentPage + 1;
    packagelistcontroller.updatePaginationState(newIsLoadingMore: true);
    context.read<PackagelistBloc>().add(
      PackagelistEvent(
        countrycode: widget.slug,
        page: nextPage,
        limit: packagelistcontroller.limit,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: BlocListener<UserProfileBloc, ApiState>(
        listener: (context, state) {
          if (state is ApiSuccess) {
            global.UserkycStatus = state.data?.data?.kycStatus ?? '';
          }
        },
        child: Scaffold(
          floatingActionButton: packagelistcontroller.showLoadMoreHint
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
                      scrollController.animateTo(
                        scrollController.offset + 200,
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
          backgroundColor: AppColors.scaffoldbackgroudColor,
          body: GetBuilder<PackageListController>(
            builder: (packagelistcontroller) =>
                BlocConsumer<PackagelistBloc, ApiState<PackagesListModel>>(
                  listener: (context, state) {
                    final destination = state.data?.data?.destination;
                    if (_appBarTitle == null && destination?.name != null) {
                      _appBarTitle = destination!.name!;
                    }
                    if (state is ApiLoading) {
                    } else if (state is ApiSuccess) {
                      final newPackages = state.data?.data?.packages ?? [];
                      final pagination = state.data?.data?.pagination;

                      if (pagination != null) {
                        packagelistcontroller.addPackagesWithPagination(
                          newPackages: newPackages,
                          page: pagination.page,
                          hasNextPage: pagination.hasNextPage ?? false,
                        );
                      } else {
                        packagelistcontroller.addPackagesWithPagination(
                          newPackages: newPackages,
                          page: packagelistcontroller.currentPage,
                          hasNextPage: false,
                        );
                      }
                    } else if (state is ApiFailure) {
                      packagelistcontroller.updatePaginationState(
                        newIsLoadingMore: false,
                        newIsInitialLoading: false,
                      );
                    }
                  },
                  builder: (context, state) {
                    final packageList = packagelistcontroller.packageListdata;
                    final isLoadingInitial =
                        packagelistcontroller.isInitialLoading;
                    final isInitialError =
                        state is ApiFailure && packageList.isEmpty;

                    // Get destination info from response
                    final destination = state.data?.data?.destination;
                    countryname = destination?.name;
                    flagemoji = destination?.flagEmoji;
                    flagcountrycode = destination?.countryCode;

                    if (isLoadingInitial) {
                      return Center(
                        child: Skeletonizer(
                          enabled: true,
                          child: ScrollViewSkeletion(),
                        ),
                      );
                    }

                    if (isInitialError) {
                      return ApiFailureWidget(
                        error: state.error,
                        onRetry: () {
                          resetAndFetch();
                        },
                      );
                    }

                    return RefreshIndicator(
                      onRefresh: () async {
                        resetAndFetch();
                      },
                      child: CustomScrollView(
                        controller: scrollController,
                        slivers: [
                          SliverAppBar(
                            backgroundColor: AppColors.secondaryColor,
                            foregroundColor: AppColors.whiteColor,
                            pinned: true,
                            expandedHeight: 230,
                            title: Text(
                              (countryname ?? _appBarTitle ?? widget.slug)
                                  .toUpperCase(),
                            ),
                            flexibleSpace: FlexibleSpaceBar(
                              background: _buildCountryHeader(
                                context,
                                destination,
                              ),
                            ),
                          ),
                          SliverToBoxAdapter(
                            child: Container(
                              color: AppColors.scaffoldbackgroudColor,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16.0,
                                vertical: 15.0,
                              ),
                              child: Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    "Choose Data Plans",
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodyMedium!
                                        .copyWith(
                                          fontSize: 18.sp,
                                          fontWeight: FontWeight.normal,
                                          color: AppColors.textColor,
                                        ),
                                  ).tr(),
                                  InkWell(
                                    borderRadius: BorderRadius.circular(30.w),
                                    onTap: () {
                                      _showFilterOptions();
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
                                            .withOpacity(0.1),
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
                                                  fontWeight: FontWeight.w400,
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
                          if (packageList.isEmpty && !isLoadingInitial)
                            SliverFillRemaining(
                              hasScrollBody: false,
                              child: Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.sim_card_outlined,
                                      color: Colors.grey.shade400,
                                      size: 64,
                                    ),
                                    const SizedBox(height: 16),
                                    Text(
                                      'No Packages available Currently',
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodyMedium!
                                          .copyWith(
                                            color: Colors.grey.shade600,
                                            fontSize: 18,
                                          ),
                                    ).tr(),
                                  ],
                                ),
                              ),
                            )
                          else
                            SliverGrid(
                              delegate: SliverChildBuilderDelegate((
                                context,
                                index,
                              ) {
                                final package = packageList[index];
                                return GestureDetector(
                                  onTap: () {
                                    packagelistcontroller.updateSelectedIndex(
                                      index,
                                    );
                                  },
                                  child: _buildDataPlanCard(
                                    context,
                                    index: index,
                                    package: package,
                                    destination: destination,
                                    isSelected:
                                        packagelistcontroller.selectedindex ==
                                        index,
                                    onpressed: () {
                                      Get.to(
                                        () => PackageDetailsScreen(
                                          packageId: package.id,
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
                                    mainAxisSpacing: 0,
                                    mainAxisExtent: 320,
                                  ),
                            ),

                          // Show loading indicator when loading more
                          if (packagelistcontroller.isLoadingMore)
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

                          // Add some bottom padding
                          SliverToBoxAdapter(
                            child: Column(children: [SizedBox(height: 12.h)]),
                          ),
                        ],
                      ),
                    );
                  },
                ),
          ),
          bottomSheet: _buildBottomBar(context),
        ),
      ),
    );
  }

  Widget _buildBottomBar(BuildContext context) {
    return GetBuilder<PackageListController>(
      builder: (packagelistcontroller) {
        if (packagelistcontroller.packageListdata.isEmpty) {
          return const SizedBox.shrink();
        }
        final selectedIndex = packagelistcontroller.selectedindex;
        if (selectedIndex >= packagelistcontroller.packageListdata.length) {
          return const SizedBox.shrink();
        }
        final selectedPackage =
            packagelistcontroller.packageListdata[selectedIndex];

        return Container(
          height: 9.h,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          decoration: BoxDecoration(
            color: AppColors.secondaryColor,
            boxShadow: [
              BoxShadow(
                color: AppColors.secondaryColor.withOpacity(0.1),
                blurRadius: 10,
                offset: const Offset(0, -5),
              ),
            ],
          ),
          child: SafeArea(
            top: false,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '$activeCurrencysymbol ${selectedPackage.price}',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.normal,
                    color: AppColors.whiteColor,
                  ),
                ),
                CustomElevatedButton(
                  onPressed: () {
                    // Check KYC if needed
                    if (global.UserkycStatus != "approved" &&
                        (selectedPackage.voiceMinutes! > 0 ||
                            selectedPackage.smsCount! > 0)) {
                      // Show KYC requirement
                      global.showToastMessage(
                        message: tr(
                          "To continue, please log in and complete your KYC",
                        ),
                      );
                      Get.to(() => KycFormScreen());
                      return;
                    }
                    // Navigate to checkout
                    Get.to(
                      () => Checkoutscreen(
                        packageListInfo: selectedPackage,
                        isShowDestination: false,
                        countryname: countryname,
                        flagemoji: flagemoji,
                        countrycode: flagcountrycode,
                      ),
                    );
                  },
                  text: tr('Buy Now'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildCountryHeader(
    BuildContext context,
    Destination? destination,
  ) {
    final countryCode = _headerCountryCode(destination);
    final title = (destination?.name ?? _appBarTitle ?? widget.slug)
        .toUpperCase();

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.secondaryColor,
            AppColors.secondaryColor,
            AppColors.primaryColor.withOpacity(0.55),
          ],
        ),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          Positioned.fill(
            child: Opacity(
              opacity: 0.12,
              child: FittedBox(
                fit: BoxFit.cover,
                child: SizedBox(
                  width: 260,
                  height: 170,
                  child: buildCountryFlagOrEmoji(
                    countryCode: countryCode,
                    flagEmoji: destination?.flagEmoji,
                    size: 150,
                    width: 260,
                    height: 170,
                    fallbackColor: AppColors.primaryColor,
                  ),
                ),
              ),
            ),
          ),
          Positioned(
            right: -22,
            bottom: 18,
            child: Container(
              width: 46.w,
              height: 28.w,
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: AppColors.whiteColor.withOpacity(0.12),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(
                  color: AppColors.whiteColor.withOpacity(0.28),
                  width: 1,
                ),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(20),
                child: buildCountryFlagOrEmoji(
                  countryCode: countryCode,
                  flagEmoji: destination?.flagEmoji,
                  size: 52,
                  width: 46.w,
                  height: 28.w,
                  fallbackColor: AppColors.primaryColor,
                ),
              ),
            ),
          ),
          Positioned(
            left: 5.w,
            right: 48.w,
            bottom: 24,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.whiteColor.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(
                      color: AppColors.whiteColor.withOpacity(0.24),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: buildCountryFlagOrEmoji(
                          countryCode: countryCode,
                          flagEmoji: destination?.flagEmoji,
                          size: 18,
                          width: 26,
                          height: 18,
                          fallbackColor: AppColors.primaryColor,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        countryCode ?? '',
                        style: Theme.of(context).textTheme.bodyMedium!
                            .copyWith(
                              fontSize: 12.sp,
                              fontWeight: FontWeight.normal,
                              color: AppColors.whiteColor,
                            ),
                      ),
                    ],
                  ),
                ),
                SizedBox(height: 1.5.h),
                Text(
                  title,
                  style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                    fontSize: 20.sp,
                    fontWeight: FontWeight.normal,
                    color: AppColors.whiteColor,
                    letterSpacing: 0,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                SizedBox(height: 0.8.h),
                Text(
                  tr('Available eSIM data plans'),
                  style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                    fontSize: 12.sp,
                    fontWeight: FontWeight.w400,
                    color: AppColors.whiteColor.withOpacity(0.78),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String? _headerCountryCode(Destination? destination) {
    final code = destination?.countryCode?.trim().toUpperCase();
    if (code != null && code.length == 2) return code;

    return _countryCodeBySlug[widget.slug.trim().toLowerCase()];
  }

  Widget _buildDataPlanCard(
    BuildContext context, {
    required int index,
    required Package package,
    required Destination? destination,
    required VoidCallback onpressed,
    required bool isSelected,
  }) {
    final badge = getPlanBadge(package);
    final bool isDisabled = package.isEnabled == false;

    return Opacity(
      opacity: isDisabled ? 0.5 : 1,
      child: Stack(
        children: [
          Container(
            margin: EdgeInsets.symmetric(horizontal: 2.w, vertical: 1.w),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: badge != null ? const Color(0xffF8FBFF) : Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: isSelected
                    ? AppColors.primaryColor
                    : badge?.color ?? Colors.grey.shade300,
                width: isSelected ? 1.5 : 0.8,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 8,
                  offset: const Offset(0, 4),
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
                  ),

                Align(
                  alignment: Alignment.center,
                  child: SizedBox(
                    width: 35.w,
                    child: Image.asset(
                      Images.ESimTel_TextLogo,
                      width: 22.w,
                      height: 10.w,
                      fit: BoxFit.contain,
                    ),
                  ),
                ),
                SizedBox(height: 1.h),

                /// TITLE + FLAG
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        package.title ?? "Package",
                        style: Theme.of(context).textTheme.titleMedium!
                            .copyWith(
                              fontWeight: FontWeight.normal,
                              fontSize: 16.sp,
                              color: _cardPrimaryTextColor,
                            ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Text(
                      destination?.flagEmoji ?? '🌍',
                      style: TextStyle(fontSize: 18.sp),
                    ),
                  ],
                ),

                const Spacer(),

                /// FEATURES
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    _buildFeatureIconAndText(
                      imagePath: Images.signalIcon,
                      iconColor: AppColors.primaryColor,
                      value: package.dataAmount ?? '0',
                    ),
                    if (package.voiceMinutes! > 0)
                      _buildFeatureIconAndText(
                        imagePath: Images.CallIcon,
                        iconColor: AppColors.redColor,
                        value: '${package.voiceMinutes} Mins',
                      ),
                    if (package.smsCount! > 0)
                      _buildFeatureIconAndText(
                        imagePath: Images.messageIcon,
                        iconColor: AppColors.darkgreen,
                        value: '${package.smsCount} SMS',
                      ),
                  ],
                ),

                const Spacer(),

                /// PRICE + VALIDITY
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '${package.validity} Day${package.validity! > 1 ? 's' : ''}',
                      style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                        color: _cardSecondaryTextColor,
                      ),
                    ),
                    Text(
                      "$activeCurrencysymbol ${package.price}",
                      style: Theme.of(context).textTheme.titleMedium!.copyWith(
                        fontWeight: FontWeight.normal,
                        color: _cardPrimaryTextColor,
                      ),
                    ),
                  ],
                ),

                Divider(color: badge?.color ?? Colors.grey.shade300),

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
                  ),
                ),
              ],
            ),
          ),

          /// SELECTED CHECK
          if (isSelected)
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
                child: const Icon(Icons.check, size: 14, color: Colors.white),
              ),
            ),
        ],
      ),
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
              color: _cardPrimaryTextColor,
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
                      title: Text("Price low to high").tr(),
                      value: FilterType.priceLowToHigh,
                      groupValue: selectedFilter,
                      onChanged: (FilterType? value) {
                        modalSetState(() {
                          selectedFilter = value!;
                        });
                        _applyFilter(context);
                      },
                    ),
                    RadioListTile<FilterType>(
                      title: Text("Price high to low").tr(),
                      value: FilterType.priceHighToLow,
                      groupValue: selectedFilter,
                      onChanged: (FilterType? value) {
                        modalSetState(() {
                          selectedFilter = value!;
                        });
                        _applyFilter(context);
                      },
                    ),
                    RadioListTile<FilterType>(
                      title: Text("Unlimited Plans").tr(),
                      value: FilterType.unlimitedPlans,
                      groupValue: selectedFilter,
                      onChanged: (FilterType? value) {
                        modalSetState(() {
                          selectedFilter = value!;
                        });
                        _applyFilter(context);
                      },
                    ),
                    RadioListTile<FilterType>(
                      title: Text("Data Pack").tr(),
                      value: FilterType.dataPack,
                      groupValue: selectedFilter,
                      onChanged: (FilterType? value) {
                        modalSetState(() {
                          selectedFilter = value!;
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

  void _applyFilter(BuildContext context) {
    packagelistcontroller.updateSelectedIndex(0);
    resetAndFetch(isBackgroundHide: true);
  }

  void resetAndFetch({bool? isBackgroundHide = false}) {
    packagelistcontroller.resetAllState();
    packagelistcontroller.updatePaginationState(newIsInitialLoading: true);
    final isLowToHigh = selectedFilter == FilterType.priceLowToHigh;
    final isHighToLow = selectedFilter == FilterType.priceHighToLow;
    final isUnlimited = selectedFilter == FilterType.unlimitedPlans;
    final isDataPack = selectedFilter == FilterType.dataPack;
    context.read<PackagelistBloc>().add(
      PackagelistEvent(
        countrycode: widget.slug,
        page: 1,
        limit: packagelistcontroller.limit,
        isUnlimited: isUnlimited,
        dataPack: isDataPack,
        isLowToHigh: isLowToHigh,
        isHighToLow: isHighToLow,
      ),
    );
    if (isBackgroundHide == true) {
      Navigator.pop(context);
    }
  }
}
