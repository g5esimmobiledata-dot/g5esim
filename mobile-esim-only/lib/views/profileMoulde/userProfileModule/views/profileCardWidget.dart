import 'package:cached_network_image/cached_network_image.dart';
import 'dart:io';

import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/utills/global.dart';
import 'package:esimconnect/utills/image.dart';
import 'package:flutter/material.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/Model/userProfileModel.dart';
import 'package:sizer/sizer.dart';

class ProfileCardWidget extends StatelessWidget {
  const ProfileCardWidget({super.key, required this.userProfileData});
  final Data? userProfileData;

  String _formatWalletBalance(String? value) {
    final parsed = double.tryParse(value ?? "");
    if (parsed == null) {
      return value?.isNotEmpty == true ? value! : "0.00";
    }
    return parsed.toStringAsFixed(2);
  }

  String _formatMemberType(String? value) {
    final raw = value?.trim();
    if (raw == null || raw.isEmpty || raw.toLowerCase() == "null") {
      return tr("Standard");
    }
    return raw
        .split(RegExp(r'[_\s-]+'))
        .where((part) => part.isNotEmpty)
        .map(
          (part) => part.length == 1
              ? part.toUpperCase()
              : '${part[0].toUpperCase()}${part.substring(1).toLowerCase()}',
        )
        .join(' ');
  }

  @override
  Widget build(BuildContext context) {
    final walletBalance = _formatWalletBalance(userProfileData?.walletBalance);
    final rewardsWallet = _formatWalletBalance(
      userProfileData?.memberRewardsWallet ?? userProfileData?.referralBalance,
    );
    final memberType = _formatMemberType(userProfileData?.memberType);
    final walletSymbol =
        userProfileData?.currencyRate?.symbol ?? activeCurrencysymbol ?? "\$";
    final profileImageUrl = buildImageUrl(userProfileData?.imagePath?.toString());
    final isLocalProfileImage = isLocalImagePath(profileImageUrl);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.appSurface,
        borderRadius: BorderRadius.circular(2.w),
        border: Border.all(width: 0.6, color: AppColors.appBorder),
      ),
      child: Column(
        children: [
          Row(
            children: [
              isLocalProfileImage
                  ? Container(
                      height: 18.w,
                      width: 18.w,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.primaryColor),
                        image: DecorationImage(
                          image: FileImage(
                            File(
                              profileImageUrl.replaceFirst('file://', ''),
                            ),
                          ),
                          fit: BoxFit.cover,
                        ),
                      ),
                    )
                  : profileImageUrl.isNotEmpty
                  ? CachedNetworkImage(
                      imageUrl: profileImageUrl,
                      placeholder: (context, url) => SizedBox(
                        height: 10.w,
                        width: 10.w,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                      errorWidget: (context, url, error) => Container(
                        height: 18.w,
                        width: 18.w,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: AppColors.primaryColor),
                          image: DecorationImage(
                            image: AssetImage(Images.defaultProfile),
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                      imageBuilder: (context, imageProvider) => Container(
                        height: 18.w,
                        width: 18.w,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: AppColors.primaryColor),
                          image: DecorationImage(
                            image: imageProvider,
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                    )
                  : Container(
                      height: 18.w,
                      width: 18.w,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.primaryColor),
                        image: DecorationImage(
                          image: AssetImage(Images.defaultProfile),
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    userProfileData?.name != null
                        ? Text(
                            "${userProfileData?.name}",
                            style: Theme.of(context).textTheme.bodyMedium!
                                .copyWith(
                                  fontSize: 16.sp,
                                  color: AppColors.appTextPrimary,
                                  fontWeight: FontWeight.normal,
                                ),
                          )
                        : SizedBox(),
                    SizedBox(height: 4),
                    userProfileData?.destination?.name != null
                        ? Text(
                            "${userProfileData!.destination?.name}",
                            style: Theme.of(context).textTheme.bodyMedium!
                                .copyWith(
                                  fontSize: 15.sp,
                                  color: AppColors.appTextSecondary,
                                  fontWeight: FontWeight.normal,
                                ),
                          )
                        : SizedBox(),
                    userProfileData?.email != null
                        ? Text(
                            "${userProfileData?.email}",
                            style: Theme.of(context).textTheme.bodyMedium!
                                .copyWith(
                                  fontSize: 15.sp,
                                  color: AppColors.appTextSecondary,
                                  fontWeight: FontWeight.normal,
                                ),
                          )
                        : SizedBox(),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: AppColors.appTextSecondary),
            ],
          ),
          SizedBox(height: 4.w),
          Divider(color: AppColors.dividerColor),
          Row(
            children: [
              const SizedBox(width: 12),
              userProfileData?.currencyRate?.name == null
                  ? SizedBox()
                  : Expanded(
                      child: Text(
                        "Currency",
                        style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                          fontSize: 15.sp,
                          color: AppColors.appTextSecondary,
                          fontWeight: FontWeight.normal,
                        ),
                      ).tr(),
                    ),
              userProfileData?.currencyRate?.name == null
                  ? SizedBox()
                  : Text(
                      "${userProfileData?.currencyRate?.name.toString().toUpperCase()} "
                      "(${userProfileData?.currencyRate?.symbol})",
                      style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                        fontSize: 16.sp,
                        color: AppColors.appTextPrimary,
                        fontWeight: FontWeight.normal,
                      ),
                    ),
            ],
          ),
          SizedBox(height: 2.w),
          Row(
            children: [
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  "Wallet Balance",
                  style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                    fontSize: 15.sp,
                    color: AppColors.appTextSecondary,
                    fontWeight: FontWeight.normal,
                  ),
                ).tr(),
              ),
              Text(
                "$walletSymbol $walletBalance",
                style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                  fontSize: 16.sp,
                  color: AppColors.appTextPrimary,
                  fontWeight: FontWeight.normal,
                ),
              ),
            ],
          ),
          SizedBox(height: 2.w),
          Row(
            children: [
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  "Member Type",
                  style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                    fontSize: 15.sp,
                    color: AppColors.appTextSecondary,
                    fontWeight: FontWeight.normal,
                  ),
                ).tr(),
              ),
              Text(
                memberType,
                style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                  fontSize: 16.sp,
                  color: AppColors.appTextPrimary,
                  fontWeight: FontWeight.normal,
                ),
              ),
            ],
          ),
          SizedBox(height: 2.w),
          Row(
            children: [
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  "Rewards Wallet",
                  style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                    fontSize: 15.sp,
                    color: AppColors.appTextSecondary,
                    fontWeight: FontWeight.normal,
                  ),
                ).tr(),
              ),
              Text(
                "$walletSymbol $rewardsWallet",
                style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                  fontSize: 16.sp,
                  color: AppColors.appTextPrimary,
                  fontWeight: FontWeight.normal,
                ),
              ),
            ],
          ),
          SizedBox(height: 2.w),
          userProfileData?.kycStatus != null && userProfileData?.kycStatus != ""
              ? Row(
                  children: [
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        "KYC Status",
                        style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                          fontSize: 15.sp,
                          color: AppColors.appTextSecondary,
                          fontWeight: FontWeight.normal,
                        ),
                      ).tr(),
                    ),
                    Text(
                      userProfileData?.kycStatus
                              .toString()
                              .firstLetterToUpper() ??
                          "",
                      style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                        fontSize: 15.sp,
                        color: userProfileData?.kycStatus == "approved"
                            ? AppColors.greenColor
                            : userProfileData?.kycStatus == "rejected"
                            ? AppColors.redColor
                            : userProfileData?.kycStatus == "pending"
                            ? AppColors.darkYellow
                            : AppColors.textGreyColor,
                        fontWeight: FontWeight.normal,
                      ),
                    ),
                    SizedBox(width: 2),
                    userProfileData?.kycStatus == "approved"
                        ? Image.asset(Images.kycapproved, height: 18)
                        : userProfileData?.kycStatus == "rejected"
                        ? Image.asset(Images.kycrejected, height: 18)
                        : userProfileData?.kycStatus == "pending"
                        ? Image.asset(Images.kycpending, height: 16)
                        : SizedBox(),
                  ],
                )
              : SizedBox(),
        ],
      ),
    );
  }
}
