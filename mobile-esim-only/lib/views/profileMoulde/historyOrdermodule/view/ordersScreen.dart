import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/utills/image.dart';
import 'package:esimconnect/widgets/loadingListSkeletion.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:sizer/sizer.dart';
import '../../../../core/bloc/api_state.dart';
import '../controller/orderhistoryController.dart';
import '../model/order_history_model.dart';
import '../order_history_bloc/fetchOrderhistory_bloc.dart';
import '../order_history_bloc/fetch_history_event.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  final orderhistorycontroller = Get.find<OrderHistoryController>();
  final scrollController = ScrollController();
  int _currentPage = 1;
  int _totalPages = 1;
  bool _isLoadingMore = false;
  bool _isInitialLoading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((timeStamp) {
      // Reset controller data
      orderhistorycontroller.esimOrders.clear();
      orderhistorycontroller.nextPageUrl = null;
      orderhistorycontroller.isLoadingMore = false;
      // Fetch first page
      _fetchOrders();
      scrollController.addListener(_pagination);
    });
  }

  void _fetchOrders({bool loadMore = false}) {
    if (loadMore) {
      if (_currentPage >= _totalPages) return;
      _isLoadingMore = true;
      _currentPage++;
    } else {
      _isInitialLoading = true;
      _currentPage = 1;
      orderhistorycontroller.esimOrders.clear();
    }

    context.read<FetchOrderHistorybloc>().add(
      fetchOrderhistoryEvent(page: _currentPage.toString()),
    );
  }

  void _pagination() {
    if (scrollController.position.pixels ==
        scrollController.position.maxScrollExtent) {
      if (_currentPage < _totalPages && !_isLoadingMore) {
        _fetchOrders(loadMore: true);
      }
    }
  }

  void _handleStateUpdate(ApiState<OrderHistoryModel> state) {
    if (state is ApiSuccess<OrderHistoryModel>) {
      setState(() {
        final totalItems = state.data.data?.length ?? 0;
        final itemsPerPage = 10; // Assuming 10 items per page
        _totalPages = (totalItems / itemsPerPage).ceil();

        if (_currentPage == 1) {
          orderhistorycontroller.esimOrders = state.data.data ?? [];
        } else {
          final newOrders = state.data.data ?? [];
          orderhistorycontroller.esimOrders.addAll(newOrders);
        }

        _isInitialLoading = false;
        _isLoadingMore = false;
      });
      orderhistorycontroller.update();
    } else if (state is ApiFailure) {
      setState(() {
        _isInitialLoading = false;
        _isLoadingMore = false;
      });
      orderhistorycontroller.update();
    }
  }

  @override
  void dispose() {
    scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.scaffoldbackgroudColor,
      appBar: AppBar(title: const Text("Orders History").tr()),
      body: GetBuilder<OrderHistoryController>(
        builder: (orderhistorycontroller) =>
            BlocConsumer<FetchOrderHistorybloc, ApiState<OrderHistoryModel>>(
              listener: (context, state) {
                _handleStateUpdate(state);
              },
              builder: (context, state) {
                // Loading state
                if (_isInitialLoading &&
                    orderhistorycontroller.esimOrders.isEmpty) {
                  return LoadingListSkeletion(isLoading: true);
                }

                // Error state
                if (state is ApiFailure &&
                    orderhistorycontroller.esimOrders.isEmpty) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.error,
                            color: Colors.red.shade400,
                            size: 48,
                          ),
                          const SizedBox(height: 16),
                          Text(
                            state.error ?? 'An unknown error occurred.',
                            textAlign: TextAlign.center,
                            style: Theme.of(context).textTheme.bodyMedium!
                                .copyWith(
                                  color: Colors.red.shade700,
                                  fontSize: 16,
                                ),
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton.icon(
                            onPressed: () {
                              _fetchOrders();
                            },
                            icon: const Icon(Icons.refresh),
                            label: const Text('Retry'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primaryColor,
                              foregroundColor: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }

                // Empty state
                if (orderhistorycontroller.esimOrders.isEmpty &&
                    !_isInitialLoading) {
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
                          'No orders found.',
                          style: Theme.of(context).textTheme.bodyMedium!
                              .copyWith(
                                color: Colors.grey.shade600,
                                fontSize: 18,
                              ),
                        ).tr(),
                      ],
                    ),
                  );
                }

                // Success state with data
                return RefreshIndicator(
                  onRefresh: () async {
                    _fetchOrders();
                  },
                  child: ListView.builder(
                    controller: scrollController,
                    padding: EdgeInsets.only(
                      left: 2.w,
                      right: 2.w,
                      top: 5.w,
                      bottom: 5.w,
                    ),
                    itemCount:
                        orderhistorycontroller.esimOrders.length +
                        (_isLoadingMore ? 1 : 0),
                    itemBuilder: (context, index) {
                      // Load more indicator
                      if (index == orderhistorycontroller.esimOrders.length) {
                        return Padding(
                          padding: EdgeInsets.symmetric(vertical: 4.w),
                          child: Center(child: _buildLoadMoreIndicator()),
                        );
                      }

                      final order = orderhistorycontroller.esimOrders[index];
                      return _buildOrderCard(context, order);
                    },
                  ),
                );
              },
            ),
      ),
    );
  }

  Widget _buildOrderCard(BuildContext context, OrderItem order) {
    final orderLabel = _orderTypeLabel(order);
    final amountText = _amountText(order);
    final titleText = _titleText(order);
    final subscriptionText = _subscriptionText(order);
    final failureReason = _textValue(order.failureReason);
    final iccid = _textValue(order.iccid);
    final hasInstallDetails = _hasInstallDetails(order);

    return Container(
      margin: EdgeInsets.symmetric(horizontal: 1.w, vertical: 1.w),
      padding: EdgeInsets.symmetric(horizontal: 2.w, vertical: 1.w),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(2.w),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Padding(
        padding: const EdgeInsets.all(10.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Order Reference
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    'Order Ref: ${order.displayOrderId ?? order.id ?? '-'}',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                      fontSize: 16.sp,
                      fontWeight: FontWeight.normal,
                      color: AppColors.primaryColor,
                    ),
                  ),
                ),
              ],
            ),
            SizedBox(height: 2.w),

            // Status Chip
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: _getStatusColor(order.status).withOpacity(0.1),
                borderRadius: BorderRadius.circular(2.w),
                border: Border.all(
                  width: 0.5,
                  color: _getStatusColor(order.status),
                ),
              ),
              child: Row(
                children: [
                  Text(
                    "Order Status",
                    style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                      fontSize: 13,
                      fontWeight: FontWeight.normal,
                      color: _getStatusColor(order.status),
                    ),
                  ).tr(),
                  Spacer(),
                  Icon(
                    _getStatusIcon(order.status),
                    size: 16,
                    color: _getStatusColor(order.status),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    formatOrderStatus(order.status),
                    style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                      fontSize: 13,
                      fontWeight: FontWeight.normal,
                      color: _getStatusColor(order.status),
                    ),
                  ),
                ],
              ),
            ),
            const Divider(height: 15),

            _buildDetailRow(
              'Service:',
              orderLabel,
              _orderTypeIcon(order),
              isIcon: true,
            ),

            if (titleText != null)
              _buildDetailRow('Product:', titleText, Images.infoImage),

            if (amountText != null)
              _buildDetailRow('Price:', amountText, Images.priceImage),

            if (order.quantity != null && order.quantity! > 0)
              _buildDetailRow(
                'Quantity:',
                '${order.quantity}',
                Images.packageImage,
              ),

            // Data and Validity
            if (order.dataAmount != null)
              _buildDetailRow('Data:', order.dataAmount, Images.infoImage),

            if (order.validity != null)
              _buildDetailRow(
                'Validity:',
                '${order.validity} Days',
                Images.calenderImage,
              ),

            if (subscriptionText != null)
              _buildDetailRow(
                'Validity:',
                subscriptionText,
                Images.calenderImage,
              ),

            // Payment Method
            if (_textValue(order.paymentMethod) != null)
              _buildDetailRow(
                'Payment:',
                _formatLabel(order.paymentMethod.toString()),
                Icons.payment,
                isIcon: true,
              ),

            if (failureReason != null)
              _buildDetailRow(
                'Reason:',
                failureReason,
                Icons.info_outline,
                isIcon: true,
                textColor: Colors.red.shade700,
              ),

            if (iccid != null)
              _buildDetailRow(
                'ICCID:',
                iccid,
                Icons.qr_code_2_rounded,
                isIcon: true,
              ),

            if (hasInstallDetails) ...[
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => _showInstallDetailsSheet(context, order),
                  icon: const Icon(Icons.qr_code_2_rounded),
                  label: const Text('View QR / Install').tr(),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primaryColor,
                    side: BorderSide(color: AppColors.primaryColor),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
              ),
            ],

            // Dates
            const SizedBox(height: 12),
            if (order.createdAt != null)
              Align(
                alignment: Alignment.bottomRight,
                child: Text(
                  'Ordered on: ${DateFormat('dd MMM yyyy, hh:mm a').format(order.createdAt!.toLocal())}',
                  style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                    fontSize: 12,
                    color: Colors.grey.shade500,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  bool _hasInstallDetails(OrderItem order) {
    return _textValue(order.iccid) != null ||
        _lpaPayload(order) != null ||
        _textValue(order.qrCodeUrl) != null ||
        _textValue(order.smdpAddress) != null ||
        _textValue(order.activationCode) != null;
  }

  String? _lpaPayload(OrderItem order) {
    final lpaCode = _textValue(order.lpaCode);
    if (lpaCode != null && lpaCode.startsWith('LPA:')) return lpaCode;

    final qrCode = _textValue(order.qrCode);
    if (qrCode != null && qrCode.startsWith('LPA:')) return qrCode;

    final smdpAddress = _textValue(order.smdpAddress);
    final activationCode = _textValue(
      order.activationCode,
    )?.replaceFirst(RegExp(r'^LPA:1\$[^$]+\$', caseSensitive: false), '');

    if (smdpAddress != null &&
        activationCode != null &&
        activationCode.isNotEmpty) {
      return 'LPA:1\$$smdpAddress\$$activationCode';
    }

    return null;
  }

  void _showInstallDetailsSheet(BuildContext context, OrderItem order) {
    final lpaPayload = _lpaPayload(order);
    final qrCodeUrl = _textValue(order.qrCodeUrl);
    final iccid = _textValue(order.iccid);
    final smdpAddress = _textValue(order.smdpAddress);
    final activationCode = _textValue(order.activationCode);
    final copyValue = lpaPayload ?? qrCodeUrl ?? activationCode ?? smdpAddress;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        return DraggableScrollableSheet(
          initialChildSize: 0.72,
          minChildSize: 0.45,
          maxChildSize: 0.92,
          expand: false,
          builder: (context, scrollController) {
            return Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: ListView(
                controller: scrollController,
                padding: const EdgeInsets.fromLTRB(20, 14, 20, 28),
                children: [
                  Center(
                    child: Container(
                      width: 42,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),
                  Row(
                    children: [
                      Icon(
                        Icons.qr_code_2_rounded,
                        color: AppColors.primaryColor,
                        size: 28,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'eSIM QR Code',
                          style: Theme.of(context).textTheme.titleLarge
                              ?.copyWith(
                                fontWeight: FontWeight.w700,
                                color: Colors.black87,
                              ),
                        ).tr(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  Center(
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: Colors.grey.shade200),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.06),
                            blurRadius: 16,
                            offset: const Offset(0, 8),
                          ),
                        ],
                      ),
                      child: _buildQrPreview(context, lpaPayload, qrCodeUrl),
                    ),
                  ),
                  const SizedBox(height: 18),
                  if (iccid != null)
                    _buildInstallInfoRow(
                      context,
                      'ICCID',
                      iccid,
                      Icons.sim_card_rounded,
                    ),
                  if (smdpAddress != null)
                    _buildInstallInfoRow(
                      context,
                      'SM-DP+ Address',
                      smdpAddress,
                      Icons.dns_rounded,
                    ),
                  if (activationCode != null)
                    _buildInstallInfoRow(
                      context,
                      'Activation Code',
                      activationCode,
                      Icons.vpn_key_rounded,
                    ),
                  if (lpaPayload != null)
                    _buildInstallInfoRow(
                      context,
                      'LPA Code',
                      lpaPayload,
                      Icons.code_rounded,
                    ),
                  const SizedBox(height: 16),
                  if (copyValue != null)
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: () async {
                          await Clipboard.setData(
                            ClipboardData(text: copyValue),
                          );
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(tr('Activation details copied')),
                              ),
                            );
                          }
                        },
                        icon: const Icon(Icons.copy_rounded),
                        label: const Text('Copy activation details').tr(),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primaryColor,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
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

  Widget _buildQrPreview(
    BuildContext context,
    String? lpaPayload,
    String? qrCodeUrl,
  ) {
    if (lpaPayload != null) {
      return QrImageView(
        data: lpaPayload,
        version: QrVersions.auto,
        size: 220,
        backgroundColor: Colors.white,
      );
    }

    if (qrCodeUrl != null && qrCodeUrl.startsWith(RegExp(r'https?://'))) {
      return Image.network(
        qrCodeUrl,
        width: 220,
        height: 220,
        fit: BoxFit.contain,
        errorBuilder: (context, error, stackTrace) =>
            _buildQrUnavailableMessage(context),
      );
    }

    return _buildQrUnavailableMessage(context);
  }

  Widget _buildQrUnavailableMessage(BuildContext context) {
    return SizedBox(
      width: 220,
      height: 220,
      child: Center(
        child: Text(
          'QR code is not available yet. Use the manual details below.',
          textAlign: TextAlign.center,
          style: Theme.of(
            context,
          ).textTheme.bodyMedium?.copyWith(color: Colors.grey.shade600),
        ).tr(),
      ),
    );
  }

  Widget _buildInstallInfoRow(
    BuildContext context,
    String label,
    String value,
    IconData icon,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: AppColors.primaryColor, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.grey.shade600,
                    fontWeight: FontWeight.w600,
                  ),
                ).tr(),
                const SizedBox(height: 4),
                SelectableText(
                  value,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.black87,
                    fontFamily: 'monospace',
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _orderTypeLabel(OrderItem order) {
    final source = _normalizedText(order.historySource);
    final type = _normalizedText(
      order.orderType ??
          order.orderSource ??
          _rawValue(order, const [
            'type',
            'serviceType',
            'transactionType',
            'transaction_type',
            'category',
          ]),
    );

    final combined = '$source $type ${order.raw}'.toLowerCase();
    if (combined.contains('voucher') || combined.contains('redeem')) {
      return 'Voucher';
    }
    if (combined.contains('wallet') || combined.contains('topup_wallet')) {
      return 'Wallet Top-Up';
    }
    if (combined.contains('topup') || combined.contains('top-up')) {
      return 'Top-Up';
    }
    return 'eSIM';
  }

  IconData _orderTypeIcon(OrderItem order) {
    switch (_orderTypeLabel(order)) {
      case 'Voucher':
        return Icons.redeem_rounded;
      case 'Wallet Top-Up':
        return Icons.account_balance_wallet_rounded;
      case 'Top-Up':
        return Icons.add_card_rounded;
      default:
        return Icons.sim_card_rounded;
    }
  }

  String? _titleText(OrderItem order) {
    return _firstText(order, const [
      'packageName',
      'package_name',
      'planName',
      'plan_name',
      'productName',
      'product_name',
      'name',
      'description',
      'note',
    ]);
  }

  String? _amountText(OrderItem order) {
    final amount = _textValue(
      order.price ??
          _rawValue(order, const [
            'amount',
            'total',
            'paidAmount',
            'paid_amount',
            'creditAmount',
            'credit_amount',
            'value',
          ]),
    );
    if (amount == null) return null;

    final currency = _textValue(
      order.currency ??
          order.orderCurrency ??
          _rawValue(order, const [
            'currency',
            'currencyCode',
            'currency_code',
            'currencySymbol',
          ]),
    );
    return currency == null ? amount : '$currency $amount';
  }

  String? _subscriptionText(OrderItem order) {
    final label = _firstText(order, const [
      'subscriptionLabel',
      'subscription_label',
      'termLabel',
      'term_label',
    ]);
    if (label != null) return label;

    final months = int.tryParse(
      _rawValue(order, const ['subscriptionMonths', 'months'])?.toString() ??
          '',
    );
    if (months != null && months > 0) {
      return months == 1 ? '1 Month' : '$months Months';
    }

    final hours = int.tryParse(
      _rawValue(order, const ['subscriptionHours', 'hours'])?.toString() ?? '',
    );
    if (hours != null && hours > 0) {
      return hours == 1 ? '1 Hour' : '$hours Hours';
    }

    final expiresAt = _textValue(
      _rawValue(order, const ['expiresAt', 'expires_at', 'validUntil']),
    );
    if (expiresAt != null) {
      final parsed = DateTime.tryParse(expiresAt);
      if (parsed != null) {
        return 'Expires ${DateFormat('dd MMM yyyy').format(parsed.toLocal())}';
      }
      return expiresAt;
    }

    return null;
  }

  String? _firstText(OrderItem order, List<String> keys) {
    for (final key in keys) {
      final value = _textValue(_rawValue(order, [key]));
      if (value != null) return value;
    }
    return null;
  }

  dynamic _rawValue(OrderItem order, List<String> keys) {
    for (final key in keys) {
      if (order.raw.containsKey(key)) return order.raw[key];
    }
    return null;
  }

  String? _textValue(dynamic value) {
    if (value == null) return null;
    final text = value.toString().trim();
    if (text.isEmpty || text == 'null') return null;
    return text;
  }

  String _normalizedText(dynamic value) =>
      (_textValue(value) ?? '').toLowerCase();

  String _formatLabel(String value) {
    final words = value
        .replaceAll('_', ' ')
        .replaceAll('-', ' ')
        .split(RegExp(r'\s+'))
        .where((word) => word.isNotEmpty)
        .map((word) => word[0].toUpperCase() + word.substring(1).toLowerCase());
    return words.join(' ');
  }

  Widget _buildDetailRow(
    String label,
    String value,
    dynamic icon, {
    Color? textColor,
    bool isIcon = false,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          isIcon
              ? Icon(icon as IconData, size: 20, color: AppColors.primaryColor)
              : Image.asset(
                  icon as String,
                  height: 20,
                  color: AppColors.primaryColor,
                ),
          const SizedBox(width: 12),
          Text(
            label,
            style: Theme.of(context).textTheme.bodyMedium!.copyWith(
              fontSize: 16.sp,
              fontWeight: FontWeight.normal,
              color: Colors.black87,
            ),
          ).tr(),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              value,
              style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                fontSize: 15.sp,
                color: textColor ?? Colors.black54,
              ),
            ).tr(),
          ),
        ],
      ),
    );
  }

  Widget _buildLoadMoreIndicator() {
    return Column(
      children: [
        CircularProgressIndicator(
          strokeWidth: 2,
          color: AppColors.primaryColor,
        ),
        SizedBox(height: 8),
        Text(
          'Loading more orders...',
          style: TextStyle(color: AppColors.textGreyColor, fontSize: 12.sp),
        ).tr(),
      ],
    );
  }

  String formatOrderStatus(String? status) {
    if (status == null || status.isEmpty) return 'Unknown';
    switch (status.toLowerCase()) {
      case 'permanently_failed':
        return 'Failed';
      case 'refunded':
        return 'Refunded';
      default:
        return status[0].toUpperCase() + status.substring(1).toLowerCase();
    }
  }

  Color _getStatusColor(String? status) {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'activated':
      case 'success':
        return Colors.green;
      case 'pending':
      case 'processing':
        return Colors.orange;
      case 'permanently_failed':
      case 'cancelled':
      case 'rejected':
        return Colors.red;
      case 'expired':
        return Colors.grey;
      default:
        return AppColors.primaryColor;
    }
  }

  IconData _getStatusIcon(String? status) {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'activated':
      case 'success':
        return Icons.check_circle;
      case 'pending':
      case 'processing':
        return Icons.hourglass_empty;
      case 'failed':
      case 'cancelled':
      case 'rejected':
        return Icons.error;
      case 'expired':
        return Icons.timelapse;
      default:
        return Icons.info;
    }
  }
}
