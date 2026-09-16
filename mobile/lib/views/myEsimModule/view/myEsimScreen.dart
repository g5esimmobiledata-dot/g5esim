import 'dart:developer';
import 'package:esimconnect/utills/failurewidget.dart';
import 'package:esimconnect/utills/global.dart' as global;
import 'package:esimconnect/views/myEsimModule/view/myEsimDetails.dart';
import 'package:esimconnect/views/reviewModule/review_events/submitReviewEvent.dart';
import 'package:esimconnect/views/reviewModule/review_models/getReviewModel.dart';
import 'package:esimconnect/widgets/skeletionListWidget.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart' hide Transition;
import 'package:get/get.dart';
import 'package:sizer/sizer.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/utills/image.dart';
import 'package:esimconnect/views/myEsimModule/model/EsimListModel.dart';
import 'package:esimconnect/views/myEsimModule/myesimbloc/fetch_esim_list_bloc.dart';
import 'package:esimconnect/views/myEsimModule/myesimbloc/fetch_esim_event.dart';
import 'package:esimconnect/widgets/custiomOutlinedButton.dart';
import '../../../widgets/reviewBottomSheet.dart';
import '../../reviewModule/review_blocs/getReviewbloc.dart';
import '../../reviewModule/review_blocs/submitReviewbloc.dart';
import '../../reviewModule/review_events/getReviewEvent.dart';

class MyEsimsScreen extends StatefulWidget {
  const MyEsimsScreen({super.key});

  @override
  State<MyEsimsScreen> createState() => _MyEsimsScreenState();
}

class _MyEsimsScreenState extends State<MyEsimsScreen> {
  final scrollController = ScrollController();
  bool showLoadMoreHint = false;
  // Add state for ratings
  Map<int, double> orderRatings = {};
  Map<int, bool> ratingSubmitted = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((timeStamp) {
      scrollController.addListener(() {
        if (scrollController.position.pixels <
            scrollController.position.maxScrollExtent - 200) {
          if (!showLoadMoreHint) {
            setState(() => showLoadMoreHint = true);
          }
        } else {
          if (showLoadMoreHint) {
            setState(() => showLoadMoreHint = false);
          }
        }
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: showLoadMoreHint
          ? FloatingActionButton(
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
            )
          : null,
      backgroundColor: AppColors.scaffoldbackgroudColor,
      body: MultiBlocListener(
        listeners: [
          BlocListener<Getreviewbloc, ApiState<GetReviewModel>>(
            listener: (context, state) async {
              if (state is ApiLoading) {
                print("api is loading...");
              } else if (state is ApiSuccessCustom<GetReviewModel>) {
                print("api success");
                print("${state.data.title}");
                // Show bottom sheet for NEW review
                showReviewBottomSheet(
                  initialTitle: state.data.title ?? "",
                  initialDescription: state.data.comment ?? "",
                  initialStars: state.data.rating?.toInt(),
                  context: context,
                  orderId: state.orderId.toString(),
                  hasUserReviewed: state.data.title == null ? false : true,
                  // User hasn't reviewed yet
                  onSubmit: (reviewData) {
                    // Handle review submission
                    print('Submitting review: $reviewData');
                    context.read<Submitreviewbloc>().add(
                      Submitreviewevent(
                        title: reviewData['title'],
                        comment: reviewData['description'],
                        rating: reviewData['stars'],
                        packageId: state.packageId.toString(),
                      ),
                    );
                  },
                  onEdit: (reviewData) {
                    // Handle review edit
                    print('Editing review: $reviewData');
                    // API call here
                    Navigator.pop(context);
                  },
                );
              } else if (state is ApiFailure) {}
            },
          ),
        ],
        child: BlocConsumer<FetchEsimListbloc, ApiState<EsimListModel>>(
          builder: (context, state) {
            if (state is ApiInitial) {
              log('ApiInitial');
              context.read<FetchEsimListbloc>().add(fetchEsimEvent());
            }
            if (state is ApiLoading) {
              return SkeletonListScreen(isLoading: state is ApiLoading);
            }
            if (state is ApiFailure) {
              return ApiFailureWidget(
                onRetry: () {
                  context.read<FetchEsimListbloc>().add(fetchEsimEvent());
                },
              );
            }
            if (state is ApiSuccess) {
              final orders = state.data?.data
                  ?.where(
                    (item) =>
                        _isProvisionedEsim(item) &&
                        (item.status == 'completed' ||
                            item.status == 'active' ||
                            item.status == 'IN_USE'),
                  )
                  .toList();
              if (orders == null || orders.isEmpty) {
                return Center(
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
                        'No eSIMs found.',
                        style: TextStyle(
                          color: Colors.grey.shade600,
                          fontSize: 18,
                        ),
                      ).tr(),
                      const SizedBox(height: 8),
                      Text(
                        'Purchase an eSIM to see it here.',
                        style: TextStyle(
                          color: Colors.grey.shade500,
                          fontSize: 14,
                        ),
                      ).tr(),
                    ],
                  ),
                );
              }

              return RefreshIndicator(
                onRefresh: () async {
                  context.read<FetchEsimListbloc>().add(fetchEsimEvent());
                },
                child: ListView.builder(
                  controller: scrollController,
                  padding: EdgeInsets.all(3.w),
                  itemCount: orders.length + 1,
                  itemBuilder: (context, index) {
                    if (index >= orders.length) {
                      return SizedBox(height: 10.h);
                    }
                    final order = orders[index];
                    final orderId = order.id ?? index;
                    final isRatingSubmitted = ratingSubmitted[orderId] ?? false;

                    return Padding(
                      padding: EdgeInsets.only(bottom: 5.w),
                      child: Column(
                        children: [
                          // Order Header
                          Align(
                            alignment: Alignment.centerLeft,
                            child: Container(
                              margin: EdgeInsets.symmetric(horizontal: 1.w),
                              decoration: BoxDecoration(
                                color: AppColors.primaryColor,
                                borderRadius: BorderRadius.only(
                                  topLeft: Radius.circular(2.w),
                                  topRight: Radius.circular(2.w),
                                ),
                              ),
                              height: 30,
                              child: Padding(
                                padding: EdgeInsets.symmetric(horizontal: 3.w),
                                child: Row(
                                  children: [
                                    Icon(
                                      Icons.receipt_long,
                                      color: AppColors.whiteColor,
                                      size: 16,
                                    ),
                                    SizedBox(width: 8),
                                    Text(
                                      "Order #",
                                      style: TextStyle(
                                        fontSize: 16.sp,
                                        fontWeight: FontWeight.normal,
                                        color: AppColors.whiteColor,
                                      ),
                                    ).tr(
                                      args: [order.displayOrderId.toString()],
                                    ),
                                    Spacer(),
                                    Text(
                                      global.timeZoneformatDate(
                                        order.createdAt?.toIso8601String(),
                                      ),
                                      style: TextStyle(
                                        fontSize: 15.sp,
                                        color: AppColors.whiteColor,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),

                          // Order Details Card
                          Container(
                            margin: EdgeInsets.symmetric(
                              horizontal: 1.w,
                              vertical: 0.w,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.only(
                                topRight: Radius.circular(2.w),
                                bottomLeft: Radius.circular(2.w),
                                bottomRight: Radius.circular(2.w),
                              ),
                              border: Border.all(color: Colors.grey.shade300),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.grey.shade200,
                                  blurRadius: 4,
                                  offset: Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Package Info Row
                                _buildDetailRow(
                                  'Package',
                                  '${order.dataAmount ?? 'N/A'} - ${order.validity ?? 0} Days',
                                  Images.packageImage,
                                ),

                                // Price Row
                                _buildDetailRow(
                                  'Price',
                                  global.formatCurrency(
                                    order.currency,
                                    order.price,
                                  ),
                                  Images.priceImage,
                                ),

                                // Provider Row
                                if (order.providerOrderId != null)
                                  _buildDetailRow(
                                    'Provider ID',
                                    order.providerOrderId!,
                                    Images.eSIMIcon,
                                  ),

                                // ICCID Row (if available)
                                if (order.iccid != null &&
                                    order.iccid!.isNotEmpty)
                                  _buildDetailRow(
                                    'ICCID',
                                    order.iccid!,
                                    Images.lockImage,
                                  ),

                                // Order Status Section
                                Container(
                                  padding: EdgeInsets.symmetric(
                                    horizontal: 4.w,
                                    vertical: 2.w,
                                  ),
                                  decoration: BoxDecoration(
                                    border: Border(
                                      top: BorderSide(
                                        color: Colors.grey.shade200,
                                      ),
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      // Status Badge
                                      Container(
                                        padding: EdgeInsets.symmetric(
                                          horizontal: 12,
                                          vertical: 6,
                                        ),
                                        decoration: BoxDecoration(
                                          color: global
                                              .getStatusColor(
                                                order.status ?? '',
                                              )
                                              .withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(
                                            20,
                                          ),
                                          border: Border.all(
                                            color: global.getStatusColor(
                                              order.status ?? '',
                                            ),
                                            width: 1,
                                          ),
                                        ),
                                        child: Row(
                                          children: [
                                            Icon(
                                              global.getStatusIcon(
                                                order.status ?? '',
                                              ),
                                              size: 16,
                                              color: global.getStatusColor(
                                                order.status ?? '',
                                              ),
                                            ),
                                            SizedBox(width: 6),
                                            Text(
                                              global.getStatusText(
                                                order.status ?? '',
                                              ),
                                              style: TextStyle(
                                                fontSize: 14.sp,
                                                fontWeight: FontWeight.normal,
                                                color: global.getStatusColor(
                                                  order.status ?? '',
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),

                                      // Review Button (between status and view)
                                      // Text("${order.status?.toLowerCase()}"),
                                      if ((order.status?.toLowerCase() ==
                                              'IN_USE' ||
                                          order.status?.toLowerCase() ==
                                              'active' ||
                                          order.status?.toLowerCase() ==
                                              'completed'))
                                        GestureDetector(
                                          onTap: () {
                                            log(
                                              "package id:${order.packageId}",
                                            );
                                            context.read<Getreviewbloc>().add(
                                              Getreviewevent(
                                                packageId: order.packageId
                                                    .toString(),
                                                orderId: order.displayOrderId
                                                    .toString(),
                                              ),
                                            );
                                          },
                                          child: Container(
                                            padding: EdgeInsets.symmetric(
                                              horizontal: 12,
                                              vertical: 6,
                                            ),
                                            margin: EdgeInsets.only(right: 2.w),
                                            decoration: BoxDecoration(
                                              color: isRatingSubmitted
                                                  ? Colors.green.shade50
                                                  : Colors.amber.shade50,
                                              borderRadius:
                                                  BorderRadius.circular(20),
                                              border: Border.all(
                                                color: isRatingSubmitted
                                                    ? Colors.green.shade300
                                                    : Colors.amber.shade300,
                                                width: 1,
                                              ),
                                            ),
                                            child: Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Icon(
                                                  Icons.star,
                                                  size: 16,
                                                  color: isRatingSubmitted
                                                      ? Colors.green.shade700
                                                      : Colors.amber.shade700,
                                                ),
                                                SizedBox(width: 6),
                                                Text(
                                                  'Review',
                                                  style: TextStyle(
                                                    fontSize: 15.sp,
                                                    fontWeight: FontWeight.normal,
                                                    color: isRatingSubmitted
                                                        ? Colors.green.shade800
                                                        : Colors.amber.shade800,
                                                  ),
                                                ).tr(),
                                              ],
                                            ),
                                          ),
                                        ),

                                      // View Details Button
                                      CustomOutlinedButton(
                                        width: 22.w,
                                        height: 9.w,
                                        padding: EdgeInsets.all(2.w),
                                        onPressed: () async {
                                          if (_isProvisionedEsim(order)) {
                                            Get.to(
                                              () => EsimDetailScreen(
                                                iccid: order.iccid,
                                                esimItem: order,
                                              ),
                                            );
                                          } else {
                                            global.showToastMessage(
                                              message: tr(
                                                'eSIM details not available',
                                              ),
                                            );
                                          }
                                        },
                                        text: tr("View"),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              );
            }
            return const SizedBox.shrink();
          },
          listener: (BuildContext context, ApiState<EsimListModel> state) {
            if (state is ApiSuccess) {
              log(
                'Successfully loaded ${state.data?.data?.length ?? 0} orders',
              );
            }
          },
        ),
      ),
    );
  }

  void showReviewBottomSheet({
    required BuildContext context,
    required String orderId,
    required bool hasUserReviewed,
    String? initialTitle,
    String? initialDescription,
    int? initialStars,
    required Function(Map<String, dynamic> reviewData) onSubmit,
    required Function(Map<String, dynamic> reviewData) onEdit,
  }) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return ReviewBottomSheet(
          orderId: orderId,
          hasUserReviewed: hasUserReviewed,
          initialTitle: initialTitle,
          initialDescription: initialDescription,
          initialStars: initialStars,
          onSubmit: onSubmit,
          onEdit: onEdit,
        );
      },
    );
  }

  bool _isProvisionedEsim(EsimItem item) {
    final hasIccid = item.iccid != null && item.iccid!.trim().isNotEmpty;
    final hasProviderOrder =
        item.providerOrderId != null && item.providerOrderId!.trim().isNotEmpty;
    final hasInstallData =
        (item.qrCode != null && item.qrCode!.trim().isNotEmpty) ||
        (item.qrCodeUrl != null && item.qrCodeUrl!.trim().isNotEmpty) ||
        (item.activationCode != null &&
            item.activationCode!.trim().isNotEmpty) ||
        (item.smdpAddress != null && item.smdpAddress!.trim().isNotEmpty);

    return hasIccid && (hasProviderOrder || hasInstallData);
  }

  Widget _buildDetailRow(
    String label,
    String value,
    String imagePath, {
    Color? textColor,
    Color? iconColor,
  }) {
    return Container(
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: AppColors.dividerColor)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 45.w,
            padding: EdgeInsets.only(
              left: 3.w,
              right: 2.w,
              top: 3.w,
              bottom: 3.w,
            ),
            decoration: BoxDecoration(
              border: Border(right: BorderSide(color: AppColors.dividerColor)),
            ),
            child: Row(
              children: [
                Image.asset(
                  imagePath,
                  height: 20.sp,
                  color: iconColor ?? AppColors.primaryColor,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    label,
                    style: TextStyle(fontSize: 16.sp, color: Colors.black87),
                  ).tr(),
                ),
              ],
            ),
          ),
          Container(
            width: 45.w,
            padding: EdgeInsets.only(left: 2.w, right: 1.w),
            child: Text(
              value,
              style: TextStyle(
                fontSize: 15.sp,
                color: textColor ?? Colors.black54,
                fontWeight: FontWeight.normal,
              ),
              textAlign: TextAlign.left,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
