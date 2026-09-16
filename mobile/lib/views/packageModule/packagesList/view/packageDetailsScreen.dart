import 'dart:developer';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:esimconnect/utills/country_flag_fallback.dart';
import 'package:esimconnect/utills/image.dart';
import 'package:esimconnect/utills/region_flag_avatar.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/views/packageModule/packagesList/bloc/package_detail_bloc/package_datail_event.dart';
import 'package:esimconnect/views/packageModule/packagesList/view/checkoutscreen.dart';
import 'package:esimconnect/widgets/loadingSkeletion.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get/get.dart';
import 'package:sizer/sizer.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/widgets/CustomElevatedButton.dart';
import 'package:skeletonizer/skeletonizer.dart';
import '../../../../utills/global.dart' as global;
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/UserService.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import 'package:esimconnect/views/authModule/view/loginScreen.dart';
import 'package:esimconnect/views/homeModule/kycFormModule/view/KycFormScreen.dart';
import 'package:esimconnect/views/packageModule/packagesList/bloc/package_detail_bloc/package_details_bloc.dart';
import 'package:esimconnect/views/packageModule/packagesList/model/packageDetailsModel.dart';

class PackageDetailsScreen extends StatelessWidget {
  final String? packageId;
  PackageDetailsScreen({super.key, required this.packageId});
  String? countrycode;
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
              ..add(PackageDetailsEvent(packageId: packageId)),
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
                return Center(child: Text("Error: ${state.error}"));
              } else if (state is ApiSuccess<PackageDetailsModel>) {
                final packageDetails = state.data.data;
                final destination = packageDetails?.destination;
                countrycode = packageDetails?.destination?.countryCode;
                return CustomScrollView(
                  slivers: <Widget>[
                    SliverAppBar(
                      backgroundColor: AppColors.primaryColor,
                      pinned: true,
                      expandedHeight: 230,
                      title: Text('Package Details').tr(),
                      flexibleSpace: FlexibleSpaceBar(
                        background: Container(
                          alignment: Alignment.bottomCenter,
                          color: AppColors.blackColor,
                          child: Stack(
                            children: [
                              Image.asset(
                                Images.silverAppBarImage,
                                fit: BoxFit.cover,
                                height: 20.h,
                              ),
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
                                    Divider(color: AppColors.dividerColor),

                                    // Operator Information
                                    if (packageDetails.dataOperator != null &&
                                        packageDetails.dataOperator!.isNotEmpty)
                                      Column(
                                        children: [
                                          InkWell(
                                            onTap: () {
                                              // Show operator details if needed
                                            },
                                            child: _buildAdditionalInfoRow(
                                              context,
                                              icon: Icons.business,
                                              label: 'OPERATOR',
                                              value:
                                                  packageDetails.dataOperator ??
                                                  'Not specified',
                                              imagePath:
                                                  packageDetails.operatorImage,
                                              showTrailingIcon: true,
                                            ),
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
                                          Divider(
                                            color: AppColors.dividerColor,
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
                                    // Coverage
                                    if (packageDetails.coverage != null &&
                                        packageDetails.coverage!.isNotEmpty)
                                      Column(
                                        children: [
                                          _buildAdditionalInfoRow(
                                            context,
                                            icon: Icons.public,
                                            label: 'COVERAGE',
                                            value: packageDetails.coverage!
                                                .join(', '),
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
    final locationName =
        destination?.name ??
        packageDetails.region?.name ??
        packageDetails.mycountryCode;
    log('''  
          Destination ${destination?.countryCode}
    
        mycodountry ${packageDetails.mycountryCode}
                      ''');
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
                      if (locationName != null && locationName.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          locationName,
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
                // Show flag emoji
                buildFlag(packageDetails, destination),
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
            // _buildInfoRow(
            //   Icons.data_usage,
            //   'Provider',
            //   packageDetails.providerName ?? '0',
            //   context,
            // ),
            // Divider(color: AppColors.dividerColor),

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

            // Sms
            packageDetails.smsCount! > 0
                ? Column(
                    children: [
                      Divider(color: AppColors.dividerColor),
                      _buildInfoRow(
                        Icons.message,
                        'Sms',
                        '${packageDetails.smsCount}',
                        context,
                      ),
                    ],
                  )
                : SizedBox.shrink(),

            // Voice
            packageDetails.voiceMinutes! > 0
                ? Column(
                    children: [
                      Divider(color: AppColors.dividerColor),

                      _buildInfoRow(
                        Icons.call,
                        'Voice',
                        '${packageDetails.voiceMinutes}',
                        context,
                      ),
                    ],
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
                    destination?.countryCode ?? '',
                    context,
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }

  Widget buildFlag(Data packageDetails, Destination? destination) {
    final countryCode =
        destination?.countryCode ?? packageDetails.mycountryCode ?? "";

    if (packageDetails.region != null) {
      return RegionFlagAvatar(
        imagePath: null,
        countryCodes: packageDetails.region?.countries,
        size: 23.sp,
        backgroundColor: AppColors.primaryColor.withOpacity(0.1),
        borderColor: AppColors.appBorder,
        fallbackColor: AppColors.primaryColor,
      );
    }

    return buildCountryFlagOrEmoji(
      countryCode: countryCode,
      flagEmoji: destination?.flagEmoji,
      size: 23.sp,
      fallbackColor: AppColors.primaryColor,
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

  final userService = UserService.to;
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
                      if (global.UserkycStatus != "approved" &&
                          ((packageDetails?.voiceMinutes ?? 0) > 0 ||
                              (packageDetails?.smsCount ?? 0) > 0)) {
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
                          packageListInfo: packageDetails!,
                          countrycode: countrycode,
                        ),
                      );
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
}
