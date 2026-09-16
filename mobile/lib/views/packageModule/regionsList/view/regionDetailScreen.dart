import 'dart:developer';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/country_flag_fallback.dart';
import 'package:esimconnect/utills/global.dart' as global;
import 'package:esimconnect/utills/region_flag_avatar.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:sizer/sizer.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/widgets/CustomElevatedButton.dart';
import 'package:esimconnect/utills/UserService.dart';
import 'package:esimconnect/views/authModule/view/loginScreen.dart';
import 'package:esimconnect/views/homeModule/kycFormModule/view/KycFormScreen.dart';
import 'package:esimconnect/views/packageModule/packagesList/bloc/package_detail_bloc/package_details_bloc.dart';
import 'package:esimconnect/views/packageModule/packagesList/model/packageDetailsModel.dart';
import 'package:esimconnect/views/packageModule/packagesList/view/checkoutscreen.dart';
import 'package:esimconnect/views/packageModule/packagesList/bloc/package_detail_bloc/package_datail_event.dart';
import 'package:esimconnect/widgets/loadingSkeletion.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:skeletonizer/skeletonizer.dart';
import 'package:esimconnect/utills/services/ApiService.dart';

class RegionDetailScreen extends StatelessWidget {
  final String? regionId;
  const RegionDetailScreen({super.key, required this.regionId});
  static const Color _cardPrimaryTextColor = Color(0xff101828);
  static const Color _cardSecondaryTextColor = Color(0xff667085);
  static const Color _cardIconColor = Color(0xff6B7280);

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: BlocProvider<PackageDetailsBloc>(
        create: (context) =>
            PackageDetailsBloc(ApiService())
              ..add(PackageDetailsEvent(packageId: regionId)),
        child: Scaffold(
          backgroundColor: AppColors.scaffoldbackgroudColor,
          body: BlocBuilder<PackageDetailsBloc, ApiState<PackageDetailsModel>>(
            builder: (context, state) {
              if (state is ApiLoading) {
                return Center(
                  child: Skeletonizer(
                    enabled: state is ApiLoading,
                    child: ScrollViewSkeletion(),
                  ),
                );
              } else if (state is ApiFailure) {
                return Center(
                  child: Text("Error: ").tr(args: ["${state.error}"]),
                );
              } else if (state is ApiSuccess<PackageDetailsModel>) {
                final packageDetails = state.data.data;
                final destination = packageDetails?.destination;
                final regionDetails = state.data.data?.region;

                return CustomScrollView(
                  slivers: [
                    SliverAppBar(
                      backgroundColor: AppColors.primaryColor,
                      pinned: true,
                      expandedHeight: 230,
                      title: Text('Region Details').tr(),
                      flexibleSpace: FlexibleSpaceBar(
                        background: Container(
                          padding: EdgeInsets.symmetric(horizontal: 5.w),
                          alignment: Alignment.bottomLeft,
                          color: AppColors.secondaryColor,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.end,
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    // Show region name
                                    Text(
                                      regionDetails?.name ?? 'Region',
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
                                    if (regionDetails?.countries?.isNotEmpty ??
                                        false)
                                      Text(
                                        "${regionDetails?.countries?.length} ${tr("Packages")}",
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
                                    if (regionDetails?.countries != null &&
                                        regionDetails!.countries!.isNotEmpty)
                                      GestureDetector(
                                        onTap: () {
                                          _showCountriesSheet(
                                            context,
                                            regionDetails,
                                          );
                                        },
                                        child: Container(
                                          width: 45.w,
                                          margin: const EdgeInsets.symmetric(
                                            horizontal: 2,
                                          ),
                                          padding: EdgeInsets.all(2.w),
                                          decoration: BoxDecoration(
                                            color: AppColors.secondaryColor,
                                            borderRadius: BorderRadius.circular(
                                              10.w,
                                            ),
                                            border: Border.all(
                                              color: AppColors.whiteColor,
                                              width: 0.5,
                                            ),
                                          ),
                                          child: Row(
                                            children: [
                                              SizedBox(width: 2.w),
                                              Icon(
                                                Icons.language,
                                                color: AppColors.whiteColor,
                                              ),
                                              SizedBox(width: 2.w),
                                              Text(
                                                "${regionDetails.countries?.length} ${tr("Countries")}",
                                                style: Theme.of(context)
                                                    .textTheme
                                                    .bodyMedium!
                                                    .copyWith(
                                                      fontSize: 15.sp,
                                                      fontWeight:
                                                          FontWeight.w300,
                                                      color:
                                                          AppColors.whiteColor,
                                                    ),
                                              ),
                                              SizedBox(width: 2.w),
                                              Icon(
                                                Icons.arrow_drop_down_outlined,
                                                color: AppColors.whiteColor,
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
                                countryCodes: regionDetails?.countries,
                                size: 15.w,
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
                          color: AppColors.scaffoldbackgroudColor,
                        ),
                        child: Text(
                          'Plan Details',
                          style: Theme.of(context).textTheme.bodyMedium!
                              .copyWith(
                                fontSize: 18.sp,
                                fontWeight: FontWeight.normal,
                                color: AppColors.textColor,
                              ),
                        ).tr(),
                      ),
                    ),
                    SliverList(
                      delegate: SliverChildListDelegate([
                        _buildDataPlanCard(
                          context,
                          packageDetails!,
                          destination,
                        ),
                        // Coverage Information Section
                        if (packageDetails.destination != null ||
                            (packageDetails.coverage != null &&
                                packageDetails.coverage!.isNotEmpty))
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16.0,
                              vertical: 8.0,
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Coverage Information',
                                  style: Theme.of(context).textTheme.bodyMedium!
                                      .copyWith(
                                        fontSize: 18.sp,
                                        fontWeight: FontWeight.normal,
                                        color: AppColors.textColor,
                                      ),
                                ).tr(),
                                const SizedBox(height: 12),
                                Container(
                                  padding: const EdgeInsets.all(20),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(
                                      color: Colors.grey[300]!,
                                    ),
                                  ),
                                  child: Column(
                                    children: [
                                      // Primary Destination
                                      if (packageDetails.destination != null)
                                        Column(
                                          children: [
                                            Row(
                                              children: [
                                                Icon(
                                                  Icons.flag,
                                                  color: Colors.green,
                                                ),
                                                SizedBox(width: 12),
                                                Expanded(
                                                  child: Text(
                                                    'Primary Destination',
                                                    style: Theme.of(context)
                                                        .textTheme
                                                        .bodyMedium!
                                                        .copyWith(
                                                          fontWeight:
                                                              FontWeight.normal,
                                                        ),
                                                  ).tr(),
                                                ),
                                                Text(
                                                  packageDetails
                                                          .destination!
                                                          .name ??
                                                      '',
                                                  style: Theme.of(context)
                                                      .textTheme
                                                      .bodyMedium!
                                                      .copyWith(
                                                        fontWeight:
                                                            FontWeight.normal,
                                                      ),
                                                ),
                                              ],
                                            ),
                                            SizedBox(height: 16),
                                          ],
                                        ),

                                      // Regional Coverage
                                      if (packageDetails.coverage != null &&
                                          packageDetails.coverage!.isNotEmpty)
                                        InkWell(
                                          onTap: () {
                                            _showCoverageBottomSheet(
                                              context,
                                              packageDetails.coverage!,
                                            );
                                          },
                                          child: Container(
                                            padding: const EdgeInsets.all(16),
                                            decoration: BoxDecoration(
                                              color: AppColors.primaryColor
                                                  .withOpacity(0.05),
                                              borderRadius:
                                                  BorderRadius.circular(12),
                                              border: Border.all(
                                                color: AppColors.primaryColor
                                                    .withOpacity(0.2),
                                              ),
                                            ),
                                            child: Row(
                                              children: [
                                                Icon(
                                                  Icons.public,
                                                  color: AppColors.primaryColor,
                                                ),
                                                SizedBox(width: 12),
                                                Expanded(
                                                  child: Column(
                                                    crossAxisAlignment:
                                                        CrossAxisAlignment
                                                            .start,
                                                    children: [
                                                      Text(
                                                        'Regional Coverage',
                                                        style: Theme.of(context)
                                                            .textTheme
                                                            .bodyMedium!
                                                            .copyWith(
                                                              fontWeight:
                                                                  FontWeight
                                                                      .w500,
                                                            ),
                                                      ).tr(),
                                                      SizedBox(height: 4),
                                                      Text(
                                                        '${packageDetails.coverage!.length} ${tr("countries/regions")}',
                                                        style: Theme.of(context)
                                                            .textTheme
                                                            .bodySmall!
                                                            .copyWith(
                                                              color: Colors
                                                                  .grey[600],
                                                            ),
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                                Icon(
                                                  Icons.arrow_forward_ios,
                                                  size: 16,
                                                  color: AppColors.primaryColor,
                                                ),
                                              ],
                                            ),
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16.0,
                            vertical: 8.0,
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Additional Information',
                                style: Theme.of(context).textTheme.bodyMedium!
                                    .copyWith(
                                      fontSize: 18.sp,
                                      fontWeight: FontWeight.normal,
                                      color: AppColors.textColor,
                                    ),
                              ).tr(),
                              const SizedBox(height: 16),
                              Container(
                                padding: const EdgeInsets.all(20.0),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(16.0),
                                  border: Border.all(color: Colors.grey[300]!),
                                ),
                                child: Column(
                                  children: [
                                    // Provider Information
                                    // _buildAdditionalInfoRow(
                                    //   context,
                                    //   icon: Icons.store,
                                    //   label: 'PROVIDER',
                                    //   value:
                                    //       packageDetails.providerName ??
                                    //       'Not specified',
                                    // ),
                                    Divider(color: AppColors.dividerColor),

                                    // Operator Information
                                    if (packageDetails.dataOperator != null &&
                                        packageDetails.dataOperator!.isNotEmpty)
                                      Column(
                                        children: [
                                          _buildAdditionalInfoRow(
                                            context,
                                            icon: Icons.business,
                                            label: 'OPERATOR',
                                            value:
                                                packageDetails.dataOperator ??
                                                'Not specified',
                                            imagePath:
                                                packageDetails.operatorImage,
                                          ),
                                          Divider(
                                            color: AppColors.dividerColor,
                                          ),
                                        ],
                                      ),

                                    // Unlimited Status
                                    _buildAdditionalInfoRow(
                                      context,
                                      icon: Icons.all_inclusive,
                                      label: 'IS UNLIMITED',
                                      value: packageDetails.isUnlimited == true
                                          ? "Yes"
                                          : "No",
                                    ),
                                    Divider(color: AppColors.dividerColor),

                                    // Package Type
                                    _buildAdditionalInfoRow(
                                      context,
                                      icon: Icons.category,
                                      label: 'PACKAGE TYPE',
                                      value:
                                          packageDetails.type?.toUpperCase() ??
                                          'LOCAL',
                                    ),
                                    Divider(color: AppColors.dividerColor),

                                    // Best Price Badge
                                    if (packageDetails.isBestPrice == true)
                                      Column(
                                        children: [
                                          _buildAdditionalInfoRow(
                                            context,
                                            icon: Icons.local_fire_department,
                                            label: 'SPECIAL',
                                            value: "🔥 Best Price",
                                          ),
                                        ],
                                      ),

                                    // Recommended Badge
                                    if (packageDetails.isRecommended == true)
                                      Column(
                                        children: [
                                          _buildAdditionalInfoRow(
                                            context,
                                            icon: Icons.thumb_up,
                                            label: 'SPECIAL',
                                            value: "👍 Recommended",
                                          ),
                                        ],
                                      ),

                                    // Popular Badge
                                    if (packageDetails.isPopular == true)
                                      Column(
                                        children: [
                                          _buildAdditionalInfoRow(
                                            context,
                                            icon: Icons.trending_up,
                                            label: 'SPECIAL',
                                            value: "📈 Popular",
                                          ),
                                        ],
                                      ),

                                    // // Package ID
                                    // _buildAdditionalInfoRow(
                                    //   context,
                                    //   icon: Icons.info_outline,
                                    //   label: 'PACKAGE ID',
                                    //   value: packageDetails.providerId ?? 'N/A',
                                    // ),
                                  ],
                                ),
                              ),
                              SizedBox(height: 17.h),
                            ],
                          ),
                        ),
                      ]),
                    ),
                  ],
                );
              } else {
                return SizedBox.shrink();
              }
            },
          ),
          bottomSheet: _buildBottomBar(context),
        ),
      ),
    );
  }

  Widget _buildDataPlanCard(
    BuildContext context,
    Data packageDetails,
    Destination? destination,
  ) {
    return Container(
      color: AppColors.scaffoldbackgroudColor,
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      child: Container(
        padding: const EdgeInsets.all(20.0),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16.0),
          border: Border.all(color: Colors.grey[300]!),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        packageDetails.title ?? 'Package',
                        style: Theme.of(context).textTheme.titleLarge!.copyWith(
                          fontSize: 17.sp,
                          fontWeight: FontWeight.normal,
                          color: _cardPrimaryTextColor,
                        ),
                        overflow: TextOverflow.ellipsis,
                        maxLines: 2,
                      ),
                      if ((packageDetails.region?.name ?? '').isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          packageDetails.region!.name!,
                          style: Theme.of(context).textTheme.bodyMedium!
                              .copyWith(
                                fontSize: 14.sp,
                                fontWeight: FontWeight.normal,
                                color: _cardSecondaryTextColor,
                              ),
                          overflow: TextOverflow.ellipsis,
                          maxLines: 1,
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                packageDetails.region != null
                    ? RegionFlagAvatar(
                        imagePath: null,
                        countryCodes: packageDetails.region?.countries,
                        size: 40,
                        backgroundColor: AppColors.primaryColor.withOpacity(
                          0.1,
                        ),
                        borderColor: AppColors.appBorder,
                        fallbackColor: AppColors.primaryColor,
                      )
                    : destination != null
                    ? buildCountryFlagOrEmoji(
                        countryCode: destination.countryCode,
                        flagEmoji: destination.flagEmoji,
                        size: 23.sp,
                        fallbackColor: AppColors.primaryColor,
                      )
                    : Container(),
              ],
            ),
            const SizedBox(height: 16),

            // Data Amount
            _buildInfoRow(
              Icons.data_usage,
              'Data',
              packageDetails.dataAmount ?? '0',
              context,
            ),
            Divider(color: AppColors.dividerColor),

            // Validity
            _buildInfoRow(
              Icons.calendar_today,
              'Validity',
              '${packageDetails.validity} Day${packageDetails.validity != 1 ? 's' : ''}',
              context,
            ),
            Divider(color: AppColors.dividerColor),

            // Price
            _buildInfoRow(
              Icons.money,
              'Price',
              '${global.activeCurrencysymbol} ${packageDetails.price}',
              context,
            ),
            Divider(color: AppColors.dividerColor),

            // Price
            packageDetails.smsCount! > 0
                ? _buildInfoRow(
                    Icons.message,
                    'Sms',
                    '${packageDetails.smsCount}',
                    context,
                  )
                : SizedBox.shrink(),
            packageDetails.voiceMinutes! > 0
                ? _buildInfoRow(
                    Icons.call,
                    'Voice',
                    '${packageDetails.voiceMinutes}',
                    context,
                  )
                : SizedBox.shrink(),

            // Country Code
            if (destination?.countryCode != null)
              Column(
                children: [
                  Divider(color: AppColors.dividerColor),
                  _buildInfoRow(
                    Icons.flag,
                    'Country Code',
                    destination!.countryCode!,
                    context,
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(
    IconData icon,
    String label,
    String value,
    BuildContext context,
  ) {
    return Row(
      children: [
        Icon(icon, color: _cardIconColor, size: 22),
        const SizedBox(width: 16),
        Expanded(
          child: Text(
            label,
            style: Theme.of(context).textTheme.bodyMedium!.copyWith(
              fontSize: 16.sp,
              color: _cardSecondaryTextColor,
              fontWeight: FontWeight.normal,
            ),
          ).tr(),
        ),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.right,
            style: Theme.of(context).textTheme.bodyMedium!.copyWith(
              fontSize: 16.sp,
              color: _cardPrimaryTextColor,
              fontWeight: FontWeight.normal,
            ),
            overflow: TextOverflow.ellipsis,
            maxLines: 2,
          ),
        ),
      ],
    );
  }

  Widget _buildAdditionalInfoRow(
    BuildContext context, {
    required IconData icon,
    String? imagePath,
    required String label,
    required String value,
    bool showTrailingIcon = false,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: _cardIconColor, size: 22),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                  fontSize: 15.sp,
                  color: _cardSecondaryTextColor,
                  fontWeight: FontWeight.normal,
                ),
              ).tr(),
              const SizedBox(height: 4),
              Text(
                value,
                style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                  fontSize: 16.sp,
                  color: _cardPrimaryTextColor,
                  fontWeight: FontWeight.normal,
                ),
              ),
            ],
          ),
        ),
        // Show image if available
        if (imagePath != null && imagePath.isNotEmpty)
          CachedNetworkImage(
            imageUrl: imagePath,
            placeholder: (context, url) => Container(
              width: 30,
              height: 30,
              padding: EdgeInsets.all(4),
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            errorWidget: (context, url, error) =>
                Icon(Icons.business, size: 30, color: _cardIconColor),
            imageBuilder: (context, imageProvider) => Container(
              width: 30,
              height: 30,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                image: DecorationImage(image: imageProvider, fit: BoxFit.cover),
              ),
            ),
          )
        else if (showTrailingIcon)
          Icon(Icons.arrow_forward_ios, size: 18, color: _cardIconColor),
      ],
    );
  }

  Widget _buildBottomBar(BuildContext context) {
    return BlocBuilder<PackageDetailsBloc, ApiState<PackageDetailsModel>>(
      builder: (context, state) {
        if (state is ApiSuccess<PackageDetailsModel>) {
          final packageDetails = state.data.data;

          return Container(
            height: 9.h,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            decoration: BoxDecoration(
              color: AppColors.blackColor,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.1),
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
                    '${packageDetails?.currency} ${packageDetails?.price}',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.normal,
                      color: AppColors.whiteColor,
                    ),
                  ),
                  CustomElevatedButton(
                    onPressed: () {
                      final userService = UserService.to;
                      if (userService.currentUserData == null ||
                          userService.currentUserData?.data?.token?.isEmpty ==
                              true) {
                        Get.to(() => LoginScreen());
                      } else {
                        log('User is signed in');
                        if (global.UserkycStatus != "approved" &&
                            ((packageDetails?.voiceMinutes ?? 0) > 0 ||
                                (packageDetails?.smsCount ?? 0) > 0)) {
                          // Show KYC requirement
                          global.showToastMessage(
                            message: tr(
                              "to_continue_please_log_in_and_complete_your_kyc",
                            ),
                          );
                          Get.to(() => KycFormScreen());
                          return;
                        }
                        Get.to(
                          () => Checkoutscreen(
                            packageListInfo: packageDetails,
                            isShowDestination: false,
                            countryname: packageDetails!.region?.name ?? '',
                            flagemoji: packageDetails.region?.image,
                          ),
                        );
                      }
                    },
                    text: tr('Buy Now'),
                  ),
                ],
              ),
            ),
          );
        } else {
          return SizedBox.shrink();
        }
      },
    );
  }

  void _showCoverageBottomSheet(BuildContext context, List<String> coverage) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Container(
          padding: const EdgeInsets.all(20),
          height: MediaQuery.of(context).size.height * 0.8,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Supported Coverage',
                    style: Theme.of(context).textTheme.titleLarge!.copyWith(
                      fontWeight: FontWeight.normal,
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              SizedBox(height: 10),
              Text(
                '${coverage.length} countries/regions',
                style: Theme.of(
                  context,
                ).textTheme.bodyMedium!.copyWith(color: Colors.grey[600]),
              ),
              SizedBox(height: 20),
              Expanded(
                child: ListView.separated(
                  itemCount: coverage.length,
                  separatorBuilder: (context, index) =>
                      Divider(height: 20, color: Colors.grey[300]),
                  itemBuilder: (context, index) {
                    final country = coverage[index];
                    final parts = country.split(' (');
                    final countryName = parts[0];
                    final operator = parts.length > 1
                        ? parts[1].replaceAll(')', '')
                        : '';

                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: SizedBox(
                        width: 40,
                        height: 40,
                        child: Icon(
                          Icons.public,
                          color: AppColors.primaryColor,
                        ),
                      ),
                      title: Text(
                        global.getCountryName(countryName),
                        style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                          fontWeight: FontWeight.normal,
                        ),
                      ),
                      subtitle: operator.isNotEmpty
                          ? Text(
                              operator,
                              style: Theme.of(context).textTheme.bodySmall!
                                  .copyWith(color: Colors.grey[600]),
                            )
                          : null,
                    );
                  },
                ),
              ),
              SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryColor,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  onPressed: () => Navigator.pop(context),
                  child: Text(
                    'Close',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.normal,
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showCountriesSheet(BuildContext context, Region region) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Container(
          padding: const EdgeInsets.all(20),
          height: MediaQuery.of(context).size.height * 0.8,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    region.name ?? 'Global',
                    style: Theme.of(context).textTheme.titleLarge!.copyWith(
                      fontWeight: FontWeight.normal,
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              SizedBox(height: 10),
              Text(
                '${region.countries!.length} ${tr('countries_2')}',
                style: Theme.of(
                  context,
                ).textTheme.bodyMedium!.copyWith(color: Colors.grey[600]),
              ),
              SizedBox(height: 20),
              Expanded(
                child: region.countries != null && region.countries!.isNotEmpty
                    ? ListView.separated(
                        itemCount: region.countries!.length,
                        separatorBuilder: (context, index) =>
                            Divider(height: 20, color: Colors.grey[300]),
                        itemBuilder: (context, index) {
                          final countryCode = region.countries![index];
                          return ListTile(
                            contentPadding: EdgeInsets.zero,
                            leading: SizedBox(
                              width: 40,
                              height: 40,
                              child: Center(
                                child: buildCountryFlagOrEmoji(
                                  countryCode: countryCode,
                                  size: 23.sp,
                                  fallbackColor: AppColors.primaryColor,
                                ),
                              ),
                            ),
                            title: Text(
                              global.getCountryName(countryCode),
                              style: Theme.of(context).textTheme.bodyMedium!
                                  .copyWith(fontWeight: FontWeight.normal),
                            ),
                            subtitle: Text(
                              '${tr('country_code_2')} $countryCode',
                              style: Theme.of(context).textTheme.bodySmall!
                                  .copyWith(color: Colors.grey[600]),
                            ),
                          );
                        },
                      )
                    : Center(
                        child: Text(
                          'No countries available',
                          style: Theme.of(context).textTheme.bodyMedium!
                              .copyWith(color: Colors.grey[600]),
                        ).tr(),
                      ),
              ),
              SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryColor,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  onPressed: () => Navigator.pop(context),
                  child: Text(
                    'Close',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.normal,
                    ),
                  ).tr(),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
