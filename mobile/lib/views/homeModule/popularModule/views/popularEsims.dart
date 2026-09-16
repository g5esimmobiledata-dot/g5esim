import 'dart:developer';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/failurewidget.dart';
import 'package:esimconnect/utills/randomColors.dart';
import 'package:esimconnect/views/homeModule/getUsageModule/views/popularEsimsCard.dart';
import 'package:esimconnect/views/homeModule/popularModule/popularbloc/mostpopularbloc.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/views/packageModule/regionsList/view/regionDetailScreen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get/get.dart';
import 'package:sizer/sizer.dart';
import '../../../packageModule/packagesList/view/packageDetailsScreen.dart';
import '../model/mostpopularModel.dart';

class PopularEsims extends StatelessWidget {
  const PopularEsims({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<MostPopularbloc, ApiState<MostPopularListModel>>(
      builder: (context, state) {
        if (state is ApiLoading) {
          return SizedBox();
        } else if (state is ApiFailure) {
          log('popula plan error is ${state.error}');
          return ApiFailureWidget(
            onRetry: () {
              context.read<MostPopularbloc>().add(
                popularEvent(is_popular: '1'),
              );
            },
          );
        } else if (state is ApiSuccess<MostPopularListModel>) {
          final countries = state.data.data?.data ?? [];

          return Column(
            children: [
              Padding(
                padding: EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      "Popular eSIMs",
                      style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                        fontSize: 16.sp,
                        fontWeight: FontWeight.normal,
                      ),
                    ).tr(),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                height: 100,
                child: ListView.builder(
                  itemCount: countries.length < 10 ? countries.length : 10,
                  itemBuilder: (context, index) {
                    final colors = RandomColorHelper.getShuffledColors(
                      count: countries.length,
                    );
                    return InkWell(
                      onTap: () {
                        if (countries[index].destination != null) {
                          Get.to(
                            () => PackageDetailsScreen(
                              packageId: countries[index].id,
                            ),
                          );
                        } else {
                          Get.to(
                            () => RegionDetailScreen(
                              regionId: countries[index].id,
                            ),
                          );
                        }
                      },
                      child: PopularESIMsCard(
                        countryName: countries[index].destinationId != null
                            ? countries[index].destination?.name ?? ""
                            : countries[index].region?.name ?? "",
                        imagePath: countries[index].destinationId != null
                            ? countries[index].destination?.image?.toString() ??
                                  ""
                            : countries[index].region?.image ?? "",
                        countryCode: countries[index].destinationId != null
                            ? countries[index].destination?.countryCode
                            : null,
                        countryCodes: countries[index].destinationId != null
                            ? null
                            : countries[index].region?.countries,
                        flagEmoji: countries[index].destinationId != null
                            ? countries[index].destination?.flagEmoji
                            : null,
                        colorcode: colors[index],
                        planName: "${countries[index].title}",
                        isUnlimited: countries[index].isUnlimited ?? false,
                      ),
                    );
                  },
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                ),
              ),
            ],
          );
        } else {
          return SizedBox.shrink();
        }
      },
    );
  }
}
