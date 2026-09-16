import 'dart:convert';
import 'dart:developer';
import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import '../model/order_history_model.dart';
import 'fetch_history_event.dart';

class FetchOrderHistorybloc
    extends
        ApiBloc<
          fetchOrderhistoryEvent,
          ApiState<OrderHistoryModel>,
          OrderHistoryModel
        > {
  final ApiService apiService;

  FetchOrderHistorybloc(this.apiService) : super(ApiInitial()) {
    on<fetchOrderhistoryEvent>(_onFetchOrderList);
  }

  Future<void> _onFetchOrderList(
    fetchOrderhistoryEvent event,
    Emitter<ApiState<OrderHistoryModel>> emit,
  ) async {
    if (event.url == null) {
      emit(loadingState());
    }

    try {
      final result = await executeApiCall(event);
      emit(successState(result));
    } catch (e) {
      if (event.url == null) {
        emit(errorState(e.toString()));
      } else {
        log('Pagination API call failed: $e');
      }
    }
  }

  @override
  Future<OrderHistoryModel> executeApiCall(fetchOrderhistoryEvent event) async {
    try {
      final response = await apiService.get(
        event.url ?? ApiEndPoints.ORDERS,
        query: event.page == null
            ? null
            : <String, dynamic>{'page': event.page, 'limit': 10},
      );
      log('Order History Response: ${jsonEncode(response)}');

      final orders = OrderHistoryModel.fromJson(_mapFrom(response)).data ?? [];
      final shouldMergeExtraSources =
          event.url == null && (event.page == null || event.page == '1');

      if (shouldMergeExtraSources) {
        orders.addAll(await _fetchWalletHistoryOrders());
      }

      final mergedOrders = _dedupeOrders(orders);
      mergedOrders.sort((a, b) {
        final left = a.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);
        final right = b.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);
        return right.compareTo(left);
      });

      return OrderHistoryModel(
        success: _mapFrom(response)['success'] == true,
        message: _mapFrom(response)['message']?.toString(),
        data: mergedOrders,
      );
    } on DioException catch (e) {
      throw e.message ?? 'Failed to fetch OrderList';
    } catch (e) {
      throw 'Unknown error occurred';
    }
  }

  Future<List<OrderItem>> _fetchOptionalOrders(
    String endpoint,
    String source,
  ) async {
    try {
      final response = await apiService.get(endpoint);
      log('$source Order History Response: ${jsonEncode(response)}');
      final model = OrderHistoryModel.fromJson(_mapFrom(response));
      return (model.data ?? [])
          .map((item) => OrderItem.fromJson(
                <String, dynamic>{
                  ...item.raw,
                  'historySource': source,
                },
                historySource: source,
              ))
          .toList();
    } catch (e) {
      log('Optional $source history unavailable: $e');
      return <OrderItem>[];
    }
  }

  Future<List<OrderItem>> _fetchWalletHistoryOrders() async {
    final endpoints = const <String>[
      ApiEndPoints.WALLET_TRANSACTIONS,
      'wallet/history',
      'wallet/topups',
      'wallet/topup/history',
      'wallet/vouchers',
      'wallet/voucher-history',
      'wallet/redeem-history',
    ];
    final orders = <OrderItem>[];
    for (final endpoint in endpoints) {
      orders.addAll(await _fetchOptionalOrders(endpoint, 'wallet'));
    }
    return orders;
  }

  List<OrderItem> _dedupeOrders(List<OrderItem> orders) {
    final seen = <String>{};
    final unique = <OrderItem>[];
    for (final order in orders) {
      final key =
          '${order.historySource ?? order.orderSource ?? order.orderType ?? 'order'}:${order.id ?? order.displayOrderId ?? order.providerOrderId ?? order.stripePaymentIntentId ?? order.createdAt?.toIso8601String() ?? unique.length}';
      if (seen.add(key)) unique.add(order);
    }
    return unique;
  }

  Map<String, dynamic> _mapFrom(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return Map<String, dynamic>.from(value);
    return <String, dynamic>{};
  }

  @override
  ApiState<OrderHistoryModel> loadingState() => ApiLoading();

  @override
  ApiState<OrderHistoryModel> successState(OrderHistoryModel response) =>
      ApiSuccess(response);

  @override
  ApiState<OrderHistoryModel> errorState(String error) => ApiFailure(error);
}
