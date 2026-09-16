import 'package:country_flags/country_flags.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/utills/global.dart';
import 'package:esimconnect/utills/region_flag_avatar.dart';
import 'package:esimconnect/views/homeModule/controller/homeController.dart';
import 'package:esimconnect/views/homeModule/datapackModule/bloc/datapack_bloc.dart';
import 'package:esimconnect/views/homeModule/datapackModule/model/datapackModel.dart';
import 'package:esimconnect/views/packageModule/regionsList/view/regionDetailScreen.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get/get.dart';
import 'package:sizer/sizer.dart';
import '../../../../utills/failurewidget.dart';
import '../../../navbarModule/bloc/navbar_bloc.dart';
import '../../../packageModule/packagesList/view/packageDetailsScreen.dart';
import 'package:esimconnect/views/homeModule/datapackModule/bloc/datapack_event.dart';

class SwichDataTab extends StatefulWidget {
  const SwichDataTab({super.key});

  @override
  State<SwichDataTab> createState() => _RedesignedPackageCardsState();
}

class _RedesignedPackageCardsState extends State<SwichDataTab> {
  final navController = Get.find<BottomNavController>();
  List<Datum> dataPackList = [];
  List<Datum> voiceSmsPackList = [];
  bool _isFetchingData = false;
  bool _isFetchingVoice = false;
  bool _hasLoadedData = false;
  bool _hasLoadedVoice = false;
  static const Color _cardPrimaryTextColor = Color(0xff101828);
  static const Color _cardSecondaryTextColor = Color(0xff667085);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _fetchData(isDataPack: true);
    });
  }

  void _fetchData({required bool isDataPack}) {
    setState(() {
      if (isDataPack) {
        _isFetchingData = true;
      } else {
        _isFetchingVoice = true;
      }
    });
    context.read<DataPackBloc>().add(DatapackEvent(isdatapack: isDataPack));
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<HomeController>(
      builder: (homeController) {
        return BlocBuilder<DataPackBloc, ApiState<DataPackModel>>(
          builder: (context, state) {
            final isDataTab = homeController.isSelected[0];

            // Update local data if state matches what we were fetching
            if (state is ApiSuccess && state.data?.data?.data != null) {
              final newData = state.data!.data!.data!;
              if (_isFetchingData) {
                dataPackList = newData;
                _isFetchingData = false;
                _hasLoadedData = true;
              } else if (_isFetchingVoice) {
                voiceSmsPackList = newData.where((package) {
                  return (package.voiceMinutes != null &&
                          package.voiceMinutes! > 0) ||
                      (package.smsCount != null && package.smsCount! > 0);
                }).toList();
                _isFetchingVoice = false;
                _hasLoadedVoice = true;
              }
            }

            // Handle Loading State
            final isLoading =
                (isDataTab && _isFetchingData) ||
                (!isDataTab && _isFetchingVoice);

            // Show loading skeleton ONLY if we don't have existing data for the current tab
            if (isLoading &&
                (isDataTab ? dataPackList.isEmpty : voiceSmsPackList.isEmpty)) {
              return _buildLoadingState(homeController);
            }

            // Handle Failure State
            if (state is ApiFailure) {
              if ((isDataTab && _isFetchingData) ||
                  (!isDataTab && _isFetchingVoice)) {
                _isFetchingData = false;
                _isFetchingVoice = false;
                return ApiFailureWidget(
                  error: state.error,
                  onRetry: () {
                    _fetchData(isDataPack: isDataTab);
                  },
                );
              }
            }

            final displayList = isDataTab ? dataPackList : voiceSmsPackList;

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Tab Switcher
                _buildTabSwitcher(context, homeController),
                SizedBox(height: 0.5.h),
                // Package Cards
                if (displayList.isEmpty)
                  _buildEmptyState()
                else
                  _buildPackageCards(displayList, isDataTab),
              ],
            );
          },
        );
      },
    );
  }

  Widget _buildTabSwitcher(
    BuildContext context,
    HomeController homeController,
  ) {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 4.w, vertical: 1.h),
      padding: EdgeInsets.all(1.w),
      decoration: BoxDecoration(
        color: AppColors.primaryColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(30.w),
      ),
      child: Row(
        children: [
          _buildTab(
            context: context,
            label: "Data",
            isSelected: homeController.isSelected[0],
            onTap: () {
              if (!homeController.isSelected[0]) {
                homeController.isSelected = [true, false];
                if (!_hasLoadedData) {
                  _fetchData(isDataPack: true);
                }
                homeController.update();
              }
            },
          ),
          _buildTab(
            context: context,
            label: "Data+Call+SMS",
            isSelected: homeController.isSelected[1],
            onTap: () {
              if (!homeController.isSelected[1]) {
                homeController.isSelected = [false, true];
                if (!_hasLoadedVoice) {
                  _fetchData(isDataPack: false);
                }
                homeController.update();
              }
            },
          ),
        ],
      ),
    );
  }

  Widget _buildTab({
    required BuildContext context,
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: EdgeInsets.symmetric(vertical: 1.2.h),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primaryColor : Colors.transparent,
            borderRadius: BorderRadius.circular(30.w),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: AppColors.primaryColor.withOpacity(0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: Center(
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                fontSize: 15.sp,
                fontWeight: FontWeight.normal,
                color: isSelected
                    ? AppColors.whiteColor
                    : AppColors.textGreyColor,
              ),
            ).tr(),
          ),
        ),
      ),
    );
  }

  Widget _buildPackageCards(List<Datum> displayList, bool isDataTab) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: EdgeInsets.symmetric(horizontal: 2.w),
      child: Row(
        children: displayList.map((package) {
          return _buildPackageCard(
            context: context,
            package: package,
            isDataTab: isDataTab,
          );
        }).toList(),
      ),
    );
  }

  Widget _buildPackageCard({
    required BuildContext context,
    required Datum package,
    required bool isDataTab,
  }) {
    return Container(
      width: 70.w,
      height: 31.h,
      margin: EdgeInsets.all(1.w),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(4.w),
        color: AppColors.whiteColor,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 15,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: InkWell(
        onTap: () => _navigateToPackageDetail(package),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: EdgeInsets.all(4.w),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildFlagSection(package, isDataTab),

              SizedBox(height: 0.5.h),

              Text(
                package.title ?? "eSIM Package",
                style: Theme.of(context).textTheme.titleMedium!.copyWith(
                  fontSize: 15.sp,
                  fontWeight: FontWeight.normal,
                  color: _cardPrimaryTextColor,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),

              SizedBox(height: 0.5.h),

              // Data section
              _buildDataSection(context, package),

              SizedBox(height: 0.5.h),

              Expanded(
                child: _buildFeaturesSection(context, package, isDataTab),
              ),

              SizedBox(height: 0.5.h),

              // Price section
              _buildPriceSection(context, package),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFlagSection(Datum package, bool isDataTab) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.start,
      children: [
        Row(
          children: [
            _getFlagWidget(package),
            SizedBox(width: 1.w),
            SizedBox(
              width: 35.w,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    package.destination?.name ??
                        package.region?.name ??
                        "Countries",
                    style: TextStyle(
                      fontSize: 15.sp,
                      fontWeight: FontWeight.normal,
                      color: _cardPrimaryTextColor,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ).tr(),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _getFlagWidget(Datum package) {
    if (package.destination != null && package.destination!.flagEmoji != null) {
      return Container(
        height: 4.h,
        width: 10.w,
        decoration: BoxDecoration(borderRadius: BorderRadius.circular(6)),
        child: Center(
          child: Text(
            package.destination!.flagEmoji!,
            style: TextStyle(fontSize: 20.sp),
          ),
        ),
      );
    } else if (package.destination == null && package.region != null) {
      return RegionFlagAvatar(
        imagePath: null,
        countryCodes: package.region?.countries,
        size: 10.w,
        backgroundColor: AppColors.primaryColor.withOpacity(0.1),
        borderColor: AppColors.appBorder,
        fallbackColor: AppColors.primaryColor,
      );
    } else if (package.destination != null) {
      if (kIsWeb) {
        return _buildCountryFlagEmoji(package.destination!.countryCode ?? "IN");
      }
      try {
        return SizedBox(
          height: 4.h,
          width: 10.w,
          child: CountryFlag.fromCountryCode(
            package.destination!.countryCode ?? "IN",
            theme: EmojiTheme(size: 22.sp),
          ),
        );
      } catch (e) {
        return _buildDefaultFlagIcon();
      }
    }

    return _buildDefaultFlagIcon();
  }

  Widget _buildCountryFlagEmoji(String countryCode) {
    final emoji = _countryCodeToEmoji(countryCode);
    if (emoji == null) {
      return _buildDefaultFlagIcon();
    }

    return SizedBox(
      height: 4.h,
      width: 10.w,
      child: Center(
        child: Text(emoji, style: TextStyle(fontSize: 20.sp)),
      ),
    );
  }

  String? _countryCodeToEmoji(String countryCode) {
    final normalized = countryCode.trim().toUpperCase();
    if (normalized.length != 2) {
      return null;
    }

    final codeUnits = normalized.codeUnits;
    if (codeUnits.any((codeUnit) => codeUnit < 65 || codeUnit > 90)) {
      return null;
    }

    const regionalIndicatorOffset = 0x1F1E6 - 65;
    return String.fromCharCodes(
      codeUnits.map((codeUnit) => codeUnit + regionalIndicatorOffset),
    );
  }

  Widget _buildDefaultFlagIcon() {
    return Container(
      height: 4.h,
      width: 10.w,
      decoration: BoxDecoration(
        color: AppColors.primaryColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Icon(Icons.public, size: 14, color: AppColors.primaryColor),
    );
  }

  Widget _buildDataSection(BuildContext context, Datum package) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 3.w, vertical: 2.w),
      decoration: BoxDecoration(
        color: AppColors.primaryColor.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(
            Icons.signal_cellular_alt,
            size: 19.sp,
            color: AppColors.primaryColor,
          ),
          SizedBox(width: 2.w),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  package.dataAmount ?? "Unlimited",
                  style: Theme.of(context).textTheme.bodyLarge!.copyWith(
                    fontSize: 16.sp,
                    fontWeight: FontWeight.normal,
                    color: AppColors.primaryColor,
                  ),
                ).tr(),
                Text(
                  "Valid for days",
                  style: TextStyle(
                    fontSize: 13.sp,
                    color: _cardSecondaryTextColor,
                    fontWeight: FontWeight.normal,
                  ),
                ).tr(
                  args: [
                    "${package.validityDays ?? package.validity.toString()}",
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFeaturesSection(
    BuildContext context,
    Datum package,
    bool isDataTab,
  ) {
    final features = <Widget>[];

    // Voice minutes
    if (package.voiceMinutes != null && package.voiceMinutes! > 0) {
      features.add(
        _buildFeatureChip(
          icon: Icons.call,
          value: "${package.voiceMinutes} min",
          color: Colors.blue,
        ),
      );
    }

    // SMS count
    if (package.smsCount != null && package.smsCount! > 0) {
      features.add(
        _buildFeatureChip(
          icon: Icons.message,
          value: "${package.smsCount} SMS",
          color: Colors.green,
        ),
      );
    }

    // Coverage count for data tab
    if (isDataTab && package.coverage?.isNotEmpty == true) {
      features.add(
        _buildFeatureChip(
          icon: Icons.location_on,
          value: "${package.coverage!.length} ${tr("countries")}",
          color: Colors.orange,
        ),
      );
    }

    // Validity days
    if (package.validityDays != null) {
      features.add(
        _buildFeatureChip(
          icon: Icons.calendar_today,
          value: "${package.validityDays} ${tr("days")}",
          color: Colors.purple,
        ),
      );
    }

    if (features.isEmpty) {
      return Center(
        child: Text(
          "Basic Data Package",
          style: TextStyle(
            fontSize: 10.sp,
            color: _cardSecondaryTextColor,
            fontWeight: FontWeight.normal,
          ),
        ).tr(),
      );
    }

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(children: features),
    );
  }

  Widget _buildFeatureChip({
    required IconData icon,
    required String value,
    required Color color,
  }) {
    return Container(
      margin: EdgeInsets.only(right: 2.w),
      padding: EdgeInsets.symmetric(horizontal: 2.5.w, vertical: 1.w),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 17.sp, color: color),
          SizedBox(width: 1.w),
          Text(
            value,
            style: TextStyle(
              fontSize: 14.sp,
              color: _cardPrimaryTextColor,
              fontWeight: FontWeight.normal,
            ),
          ).tr(),
        ],
      ),
    );
  }

  Widget _buildPriceSection(BuildContext context, Datum package) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              margin: EdgeInsets.only(left: 0.5.w),
              child: Text(
                "Price",
                style: TextStyle(
                  fontSize: 15.sp,
                  color: _cardPrimaryTextColor,
                  fontWeight: FontWeight.normal,
                ),
              ).tr(),
            ),
            Text.rich(
              TextSpan(
                text: "$activeCurrencysymbol",
                style: TextStyle(
                  fontSize: 17.sp,
                  fontWeight: FontWeight.normal,
                  color: AppColors.primaryColor,
                ),
                children: [
                  TextSpan(
                    text: " ${package.price}",
                    style: TextStyle(
                      fontSize: 16.sp,
                      fontWeight: FontWeight.normal,
                      color: _cardPrimaryTextColor,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),

        // View button
        Container(
          padding: EdgeInsets.symmetric(horizontal: 3.w, vertical: 0.5.h),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                AppColors.primaryColor,
                AppColors.primaryColor.withOpacity(0.8),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              Text(
                "View",
                style: TextStyle(
                  fontSize: 14.sp,
                  fontWeight: FontWeight.normal,
                  color: AppColors.whiteColor,
                ),
              ).tr(),
              SizedBox(width: 1.w),
              Icon(
                Icons.arrow_forward,
                size: 15.sp,
                color: AppColors.whiteColor,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildLoadingState(HomeController homeController) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          margin: EdgeInsets.symmetric(horizontal: 4.w, vertical: 1.h),
          padding: EdgeInsets.all(1.w),
          decoration: BoxDecoration(
            color: AppColors.primaryColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(30.w),
          ),
          child: Row(
            children: [
              _buildTab(
                context: context,
                label: "Data",
                isSelected: homeController.isSelected[0],
                onTap: () {},
              ),
              _buildTab(
                context: context,
                label: "Data+Call+SMS",
                isSelected: homeController.isSelected[1],
                onTap: () {},
              ),
            ],
          ),
        ),

        SizedBox(height: 0.5.h),

        // Cards skeleton only
        SizedBox(
          height: 36.h,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: EdgeInsets.symmetric(horizontal: 4.w),
            itemCount: 3,
            itemBuilder: (context, index) {
              return Container(
                width: 70.w,
                margin: EdgeInsets.all(2.w),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(4.w),
                  color: Colors.white,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.08),
                      blurRadius: 15,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Padding(
                  padding: EdgeInsets.all(4.w),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Flag section skeleton
                      Row(
                        mainAxisAlignment: MainAxisAlignment.start,
                        children: [
                          Container(
                            height: 4.h,
                            width: 10.w,
                            decoration: BoxDecoration(
                              color: Colors.grey[200],
                              borderRadius: BorderRadius.circular(6),
                            ),
                          ),
                          SizedBox(width: 1.w),
                          Container(
                            width: 35.w,
                            height: 4.h,
                            color: Colors.grey[200],
                          ),
                        ],
                      ),

                      SizedBox(height: 1.h),

                      // Title skeleton
                      Container(
                        width: 50.w,
                        height: 16.sp,
                        color: Colors.grey[200],
                      ),

                      SizedBox(height: 1.h),

                      // Data section skeleton
                      Container(
                        height: 6.5.h,
                        decoration: BoxDecoration(
                          color: Colors.grey[200],
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),

                      SizedBox(height: 1.h),

                      // Features section skeleton
                      Container(
                        height: 4.5.h,
                        decoration: BoxDecoration(
                          color: Colors.grey[200],
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),

                      SizedBox(height: 0.5.h),

                      // Price section skeleton
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            width: 25.w,
                            height: 5.h,
                            color: Colors.grey[200],
                          ),
                          Container(
                            width: 20.w,
                            height: 5.h,
                            color: Colors.grey[200],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildErrorState(String error) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 50.sp, color: Colors.red),
          SizedBox(height: 2.h),
          Text(
            "Failed to load packages",
            style: TextStyle(
              fontSize: 16.sp,
              fontWeight: FontWeight.normal,
              color: AppColors.textColor,
            ),
          ).tr(),
          SizedBox(height: 1.h),
          Text(
            error,
            style: TextStyle(fontSize: 15.sp, color: AppColors.textGreyColor),
            textAlign: TextAlign.center,
          ),
          SizedBox(height: 2.h),
          ElevatedButton(
            onPressed: () {
              context.read<DataPackBloc>().add(DatapackEvent(isdatapack: true));
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryColor,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 1.5.h),
            ),
            child: Text(
              "Retry",
              style: TextStyle(
                fontSize: 14.sp,
                fontWeight: FontWeight.normal,
                color: AppColors.whiteColor,
              ),
            ).tr(),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.search_off, size: 50.sp, color: AppColors.textGreyColor),
          SizedBox(height: 2.h),
          Text(
            "No packages available",
            style: TextStyle(
              fontSize: 16.sp,
              fontWeight: FontWeight.normal,
              color: AppColors.textColor,
            ),
          ).tr(),
          SizedBox(height: 1.h),
          Text(
            "Check back later for new packages",
            style: TextStyle(fontSize: 15.sp, color: AppColors.textGreyColor),
          ).tr(),
        ],
      ),
    );
  }

  void _navigateToPackageDetail(Datum package) {
    if (package.destination == null) {
      Get.to(() => RegionDetailScreen(regionId: "${package.id}"));
    } else {
      Get.to(() => PackageDetailsScreen(packageId: "${package.id}"));
    }
  }
}
