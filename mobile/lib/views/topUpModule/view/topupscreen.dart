import 'dart:convert';
import 'dart:developer';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/UserService.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/utills/config.dart';
import 'package:esimconnect/utills/global.dart' as global;
import 'package:esimconnect/views/topUpModule/topup_bloc/topupbloc.dart';
import 'package:esimconnect/views/topUpModule/topup_bloc/topupfeatchevent.dart';
import 'package:esimconnect/views/topUpModule/topup_buy_bloc/topupbybloc.dart';
import 'package:esimconnect/widgets/customElevatedButton.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get/get.dart';
import 'package:sizer/sizer.dart';
import '../../authModule/view/loginScreen.dart';
import '../../packageModule/packagesList/bloc/order_bloc/gatewayEnablecheck.dart';
import '../../packageModule/packagesList/bloc/order_bloc/gatewayEvent.dart';
import '../../packageModule/packagesList/model/GatewayListModel.dart';
import '../../packageModule/packagesList/view/GatewaySelectionDialog.dart';
import '../../packageModule/packagesList/view/PaymentScreen.dart';
import '../model/topupmodel.dart';

class TopUpScreen extends StatefulWidget {
  final String iccid;
  final String? orderid;
  final String? packageId;

  const TopUpScreen({
    Key? key,
    required this.iccid,
    this.orderid,
    this.packageId,
  }) : super(key: key);

  @override
  State<TopUpScreen> createState() => _TopUpScreenState();
}

class _TopUpScreenState extends State<TopUpScreen> {
  final scrollController = ScrollController();
  int currentPage = 1;
  bool isLoadingMore = false;
  List<TopUpItems> _allTopUpList = [];
  List<GatewayItem> _availableGateways = [];
  bool _isLoadingGateways = false;
  final userService = UserService.to;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<TopUpBloc>().add(
        TopUpFetchEvent(ccid: widget.iccid.toString()),
      );
      _loadGateways();
    });

    scrollController.addListener(_pagination);
  }

  @override
  void dispose() {
    scrollController.dispose();
    super.dispose();
  }

  void _loadGateways() {
    context.read<GatewayEnableBloc>().add(GatewayEvent());
  }

  void _refreshList() {
    setState(() {
      _allTopUpList.clear();
      currentPage = 1;
      context.read<TopUpBloc>().add(
        TopUpFetchEvent(ccid: widget.iccid.toString()),
      );
    });
  }

  void _pagination() {
    if (scrollController.position.pixels ==
        scrollController.position.maxScrollExtent) {
      if (!isLoadingMore) {
        setState(() {
          isLoadingMore = true;
          currentPage++;
        });
        context.read<TopUpBloc>().add(
          TopUpFetchEvent(ccid: widget.iccid.toString(), page: currentPage),
        );
      }
    }
  }

  String _formatDataAmount(dynamic dataAmount) {
    if (dataAmount == null) return 'N/A';
    if (dataAmount == 'Unlimited') return 'Unlimited';

    // Handle numeric data amounts
    if (dataAmount is num) {
      if (dataAmount >= 1024) {
        return '${(dataAmount / 1024).toStringAsFixed(1)} GB';
      }
      return '$dataAmount MB';
    }

    return dataAmount.toString();
  }

  String _getDataIcon(dynamic dataAmount) {
    if (dataAmount == 'Unlimited') return 'Unlimited';
    if (dataAmount is num) {
      if (dataAmount >= 1024) return '📱';
    }
    return '📊';
  }

  String _formatPrice(double? price, String? currency) {
    if (price == null) return 'N/A';
    String symbol = currency ?? '\$';
    return '$symbol ${price.toStringAsFixed(2)}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Get.theme.scaffoldBackgroundColor,
      appBar: AppBar(title: Text('Choose Your Top-Up')),
      body: MultiBlocListener(
        listeners: [
          BlocListener<GatewayEnableBloc, ApiState<GatewayListModel>>(
            listener: (context, state) {
              if (state is ApiLoading) {
                setState(() => _isLoadingGateways = true);
              } else if (state is ApiSuccess<GatewayListModel>) {
                setState(() {
                  _isLoadingGateways = false;
                  _availableGateways = state.data.data ?? [];
                });
              } else if (state is ApiFailure) {
                setState(() => _isLoadingGateways = false);
                global.showToastMessage(
                  message: state.error ?? "Failed to load gateways",
                );
              }
            },
          ),
        ],
        child: _buildLiveDataUI(),
      ),
    );
  }

  Widget _buildLiveDataUI() {
    return BlocConsumer<TopUpBloc, ApiState<TopUpOption>>(
      listener: (context, state) {
        if (state is ApiSuccess<TopUpOption>) {
          setState(() {
            if (currentPage == 1) {
              _allTopUpList = state.data.packages ?? [];
            } else {
              _allTopUpList.addAll(state.data.packages ?? []);
            }
            isLoadingMore = false;
          });
        } else if (state is ApiLoading && _allTopUpList.isNotEmpty) {
          setState(() {
            isLoadingMore = true;
          });
        } else if (state is ApiFailure) {
          setState(() {
            isLoadingMore = false;
          });
        }
      },
      builder: (context, state) {
        if (state is ApiLoading && _allTopUpList.isEmpty) {
          return Center(
            child: CircularProgressIndicator(color: Get.theme.primaryColor),
          );
        }

        if (_allTopUpList.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.sim_card_outlined,
                  size: 60.sp,
                  color: Get.theme.textTheme.bodyMedium?.color,
                ),
                SizedBox(height: 2.h),
                Text(
                  "No top-up options available",
                  style: Get.textTheme.titleMedium?.copyWith(
                    color: Get.isDarkMode
                        ? Colors.grey.shade400
                        : Colors.grey.shade600,
                  ),
                ).tr(),
                SizedBox(height: 1.h),
                Text(
                  "Check back later for new packages",
                  style: Get.textTheme.bodySmall?.copyWith(
                    color: Get.theme.textTheme.bodyMedium?.color,
                  ),
                ).tr(),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () async {
            setState(() {
              currentPage = 1;
              _allTopUpList.clear();
            });
            context.read<TopUpBloc>().add(
              TopUpFetchEvent(ccid: widget.iccid.toString()),
            );
          },
          child: Column(children: [Expanded(child: _buildPackageList())]),
        );
      },
    );
  }

  Widget _buildPackageList() {
    return Padding(
      padding: EdgeInsets.all(2.w),
      child: ListView.builder(
        controller: scrollController,
        itemCount: _allTopUpList.length + (isLoadingMore ? 1 : 0),
        itemBuilder: (context, index) {
          if (index == _allTopUpList.length) {
            return Padding(
              padding: EdgeInsets.symmetric(vertical: 4.w),
              child: Center(
                child: CircularProgressIndicator(color: Get.theme.primaryColor),
              ),
            );
          }

          final package = _allTopUpList[index];
          final isUnlimited = package.dataAmount == 'Unlimited';

          return _buildPackageCard(package, isUnlimited);
        },
      ),
    );
  }

  Widget _buildPackageCard(TopUpItems package, bool isUnlimited) {
    return Container(
      margin: EdgeInsets.only(bottom: 2.h),
      decoration: BoxDecoration(
        color: Get.theme.cardColor,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(Get.isDarkMode ? 0.3 : 0.05),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
        border: Border.all(
          color: Get.theme.textTheme.bodyMedium!.color!,
          width: 1,
        ),
      ),
      child: InkWell(
        onTap: () {
          _handlePackageTap(package);
        },
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: EdgeInsets.all(3.w),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Title Row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          package.title ?? 'Top-Up Package',
                          style: Get.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.normal,
                            fontSize: 16.sp,
                            color: Get.theme.textTheme.bodyMedium?.color,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              SizedBox(height: 2.h),

              // Data & Price Row
              Container(
                padding: EdgeInsets.all(2.w),
                decoration: BoxDecoration(
                  color: Get.isDarkMode
                      ? Colors.white.withOpacity(0.05)
                      : Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    // Data Amount
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                _getDataIcon(package.dataAmount),
                                style: TextStyle(
                                  fontSize: 14.sp,
                                  color: Get.theme.textTheme.bodyMedium?.color,
                                ),
                              ),
                              SizedBox(width: 1.w),
                              Text(
                                'Data',
                                style: Get.textTheme.labelMedium?.copyWith(
                                  color: Get.isDarkMode
                                      ? Colors.grey.shade400
                                      : Colors.grey.shade600,
                                  fontSize: 15.sp,
                                ),
                              ).tr(),
                            ],
                          ),
                          SizedBox(height: 0.5.h),
                          Text(
                            _formatDataAmount(package.dataAmount),
                            style: Get.textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.normal,
                              fontSize: 16.sp,
                              color: Get.theme.textTheme.bodyMedium?.color,
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Vertical Divider
                    Container(
                      width: 1,
                      height: 5.h,
                      color: Get.isDarkMode
                          ? Colors.white.withOpacity(0.1)
                          : Colors.grey.shade300,
                    ),

                    // Validity
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.calendar_today,
                                size: 15.sp,
                                color: Get.isDarkMode
                                    ? Colors.grey.shade400
                                    : Colors.grey.shade600,
                              ),
                              SizedBox(width: 1.w),
                              Text(
                                'Validity',
                                style: Get.textTheme.labelMedium?.copyWith(
                                  color: Get.isDarkMode
                                      ? Colors.grey.shade400
                                      : Colors.grey.shade600,
                                  fontSize: 15.sp,
                                ),
                              ).tr(),
                            ],
                          ),
                          SizedBox(height: 0.5.h),
                          Text(
                            package.validity != null
                                ? '${package.validity} ${tr("Days")}'
                                : 'N/A',
                            style: Get.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.normal,
                              fontSize: 14.sp,
                              color: Get.theme.textTheme.bodyMedium?.color,
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Vertical Divider
                    Container(
                      width: 1,
                      height: 5.h,
                      color: Get.isDarkMode
                          ? Colors.white.withOpacity(0.1)
                          : Colors.grey.shade300,
                    ),

                    // Price
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            'Price',
                            style: Get.textTheme.labelMedium?.copyWith(
                              color: Get.theme.textTheme.bodyMedium?.color,

                              fontSize: 15.sp,
                            ),
                          ).tr(),
                          SizedBox(height: 0.5.h),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                _formatPrice(package.price, package.currency),
                                style: Get.textTheme.titleLarge?.copyWith(
                                  fontWeight: FontWeight.normal,
                                  fontSize: 16.sp,
                                  color: Get.theme.textTheme.bodyMedium?.color,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              if (package.data != null && package.data!.isNotEmpty) ...[
                SizedBox(height: 1.h),
                Container(
                  padding: EdgeInsets.symmetric(
                    horizontal: 2.w,
                    vertical: 0.5.h,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    package.data!,
                    style: Get.textTheme.labelSmall?.copyWith(
                      color: Colors.blue.shade700,
                      fontSize: 11.sp,
                    ),
                  ),
                ),
              ],

              SizedBox(height: 2.h),

              if (isUnlimited)
                Container(
                  padding: EdgeInsets.symmetric(
                    horizontal: 3.w,
                    vertical: 0.8.h,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.green.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.green.withOpacity(0.3)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.all_inclusive,
                        size: 15.sp,
                        color: Colors.green,
                      ),
                      SizedBox(width: 1.w),
                      Text(
                        'Unlimited Data',
                        style: Get.textTheme.labelSmall?.copyWith(
                          color: Colors.green,
                          fontWeight: FontWeight.normal,
                          fontSize: 10.sp,
                        ),
                      ).tr(),
                    ],
                  ),
                ),

              SizedBox(height: 2.h),

              // Buy Now Button
              BlocBuilder<TopUpBuyBloc, ApiState>(
                builder: (context, state) {
                  bool isLoading = state is ApiLoading;
                  return CustomElevatedButton(
                    width: double.infinity,
                    backgroundColor: AppColors.primaryColor,
                    height: 5.h,
                    onPressed: isLoading
                        ? null
                        : () {
                            _handlePackageTap(package);
                          },
                    text: isLoading ? tr("Processing...") : tr("Buy Now"),
                    borderRadius: 12,
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _handlePackageTap(TopUpItems package) {
    log('Package Info Passed: ${jsonEncode(package.toJson())}');
    if (userService.currentUserData == null ||
        userService.currentUserData?.data?.token?.isEmpty == true) {
      Get.offAll(() => LoginScreen());
    } else {
      if (_isLoadingGateways) {
        global.showToastMessage(message: tr("Loading payment methods..."));
        return;
      }

      if (_availableGateways.isEmpty) {
        _loadGateways();
        global.showToastMessage(message: tr("Fetching payment methods..."));
        return;
      }

      showDialog(
        context: context,
        builder: (context) => GatewaySelectionDialog(
          gateways: _availableGateways,
          onSelected: (gateway) async {
            final email = userService.currentUserData?.data?.email ?? "";
            final iccid = widget.iccid;
            final orderId = widget.orderid ?? "";
            final topupId = package.providerPackageId;
            final gatewayId = gateway.id;
            print(''' 
                iccid: $iccid,
                orderId: $orderId,
                topupId: $topupId,
                gatewayId: $gatewayId,
                callbackScheme: tripsimy,
                email: $email
                ''');

            // Using the requested localhost URL for testing/launching as specified
            // Using Uri ensures the email and other symbols are properly encoded for the web
            final uri = Uri.parse("${socketbaseUrl}mobile-topup").replace(
              queryParameters: {
                "iccid": iccid.toString(),
                "orderId": orderId.toString(),
                "topupId": topupId.toString(),
                "gatewayId": gatewayId.toString(),
                "callbackScheme": "simfinity",
                "email": email,
              },
            );

            final url = uri.toString();

            log('🚀 Launching Top-up Payment Screen: $url');

            Get.to(
              () => PaymentScreen(
                url: url,
                paymentMethod: gateway.provider ?? 'razorpay',
              ),
            );
          },
          isLoading: false,
        ),
      );
    }
  }
}
