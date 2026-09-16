import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../model/order_history_model.dart';

class OrderHistoryController extends GetxController {
  final scrollController = ScrollController();
  String? nextPageUrl;
  bool isLoadingMore = false;
  List<OrderItem> esimOrders = [];
  OrderHistoryController();
  @override
  onInit() {
    super.onInit();
    _init();
  }

  void _init() {}

  Color getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'completed':
        return Colors.green.shade600;
      case 'pending':
        return Colors.orange.shade600;
      case 'failed':
        return Colors.red.shade600;
      default:
        return Colors.grey.shade600;
    }
  }

  IconData getStatusIcon(String status) {
    switch (status.toLowerCase()) {
      case 'completed':
        return Icons.check_circle_outline;
      case 'pending':
        return Icons.hourglass_empty;
      case 'failed':
        return Icons.error_outline;
      default:
        return Icons.info_outline;
    }
  }

  @override
  void onClose() {
    scrollController.dispose();
    super.onClose();
  }
}
