import 'dart:developer';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:carousel_slider/carousel_slider.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/utills/global.dart' as global;
import 'package:esimconnect/views/homeModule/bannersModule/bloc/banner_bloc.dart';
import 'package:esimconnect/views/homeModule/bannersModule/model/bannerModel.dart';
import 'package:esimconnect/views/homeModule/controller/homeController.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get/get.dart';
import 'package:sizer/sizer.dart';
import 'package:skeletonizer/skeletonizer.dart';
import '../../../packageModule/packagesList/view/packageDetailsScreen.dart';

class BuildBannerWidget extends StatelessWidget {
  const BuildBannerWidget({super.key});

  Widget _bannerErrorPlaceholder() {
    return Container(
      height: 20.h,
      color: AppColors.appSurface,
      alignment: Alignment.center,
      child: Icon(
        Icons.image_not_supported_outlined,
        color: AppColors.appTextSecondary,
        size: 28.sp,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<HomeController>(
      builder: (homeController) {
        return BlocBuilder<BannerBloc, ApiState<BannersModel>>(
          builder: (context, state) {
            if (state is ApiLoading) {
              return Skeletonizer(
                containersColor: Colors.grey.shade300,
                enabled: state is ApiLoading,
                child: Container(
                  width: MediaQuery.of(context).size.width,
                  margin: const EdgeInsets.symmetric(
                    horizontal: 8.0,
                    vertical: 6.0,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.appSurface,
                    borderRadius: BorderRadius.circular(16.0),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 6,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(16.0),
                    child: Container(
                      height: 20.h,
                      color: AppColors.appSurfaceSoft,
                    ),
                  ),
                ),
              );
            } else if (state is ApiFailure) {
              return SizedBox.shrink();
            } else if (state is ApiSuccess) {
              final bannersList =
                  state.data?.data
                      ?.where(
                        (banner) =>
                            banner.isActive == true &&
                            (banner.imageUrl?.trim().isNotEmpty ?? false),
                      )
                      .toList()
                    ?..sort(
                      (a, b) => (a.position ?? 0).compareTo(b.position ?? 0),
                    );

              if (bannersList!.isEmpty) {
                return SizedBox();
              } else {
                return SizedBox(
                  height: 24.h,
                  child: Column(
                    children: [
                      bannersList.length > 1
                          ? CarouselSlider(
                              options: CarouselOptions(
                                autoPlay: false,
                                reverse: false,
                                height: 20.h,
                                enlargeCenterPage: true,
                                viewportFraction: 0.8,
                                enlargeFactor: 0.2,
                                onPageChanged: (index, reason) {
                                  homeController.bannerActiveIndex = index;
                                  homeController.update();
                                },
                              ),
                              items: bannersList.asMap().entries.map((entry) {
                                var banners = entry.value;
                                final bannerImageUrl = global.buildImageUrl(
                                  banners.imageUrl,
                                );
                                return Builder(
                                  builder: (BuildContext context) {
                                    return GestureDetector(
                                      onTap:
                                          bannersList[entry.key].packageId !=
                                              null
                                          ? () {
                                              final banner =
                                                  bannersList[entry.key];

                                              Get.to(
                                                () => PackageDetailsScreen(
                                                  packageId:
                                                      "${banner.packageId}",
                                                ),
                                              );
                                            }
                                          : null,

                                      child: Container(
                                        width: MediaQuery.of(
                                          context,
                                        ).size.width,
                                        margin: EdgeInsets.symmetric(
                                          horizontal: 5.0,
                                        ),
                                        decoration: BoxDecoration(
                                          color: Colors.white10,
                                        ),
                                        child: ClipRRect(
                                          borderRadius: BorderRadius.circular(
                                            2.w,
                                          ),
                                          child: CachedNetworkImage(
                                            imageUrl: bannerImageUrl,
                                            placeholder: (context, url) =>
                                                SizedBox(
                                                  child: Skeletonizer(
                                                    child: SizedBox(
                                                      height: 20.h,
                                                    ),
                                                  ),
                                                ),
                                            errorWidget:
                                                (context, url, error) =>
                                                    _bannerErrorPlaceholder(),
                                            imageBuilder:
                                                (context, imageProvider) =>
                                                    Container(
                                                      height: 15.h,
                                                      width: 80.w,
                                                      decoration: BoxDecoration(
                                                        image: DecorationImage(
                                                          image: imageProvider,
                                                          fit: BoxFit.cover,
                                                        ),
                                                      ),
                                                    ),
                                          ),
                                        ),
                                      ),
                                    );
                                  },
                                );
                              }).toList(),
                            )
                          : InkWell(
                              onTap: () {
                                log(
                                  'banner list ${global.buildImageUrl(bannersList[0].imageUrl)}',
                                );
                                Get.to(
                                  () => PackageDetailsScreen(
                                    packageId: "${bannersList[0].packageId}",
                                  ),
                                );
                              },
                              child: Container(
                                width: MediaQuery.of(context).size.width,
                                margin: EdgeInsets.symmetric(
                                  horizontal: 5.w,
                                  vertical: 2.w,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.white10,
                                ),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(2.w),
                                  child: CachedNetworkImage(
                                    imageUrl: global.buildImageUrl(
                                      bannersList[0].imageUrl,
                                    ),
                                    placeholder: (context, url) => SizedBox(
                                      child: Skeletonizer(
                                        child: SizedBox(height: 20.h),
                                      ),
                                    ),
                                    errorWidget: (context, url, error) =>
                                        _bannerErrorPlaceholder(),
                                    imageBuilder: (context, imageProvider) =>
                                        Container(
                                          height: 20.h,
                                          width: 80.w,
                                          decoration: BoxDecoration(
                                            image: DecorationImage(
                                              image: imageProvider,
                                              fit: BoxFit.cover,
                                            ),
                                          ),
                                        ),
                                  ),
                                ),
                              ),
                            ),
                      SizedBox(height: 15),
                      bannersList.length > 1
                          ? Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: List.generate(
                                bannersList.length,
                                (index) => Container(
                                  width: 8.0,
                                  height: 8.0,
                                  margin: const EdgeInsets.symmetric(
                                    horizontal: 4.0,
                                  ),
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color:
                                        homeController.bannerActiveIndex ==
                                            index
                                        ? Theme.of(context).primaryColor
                                        : Colors.grey,
                                  ),
                                ),
                              ),
                            )
                          : SizedBox.shrink(),
                    ],
                  ),
                );
              }
            } else {
              return SizedBox();
            }
          },
        );
      },
    );
  }
}
