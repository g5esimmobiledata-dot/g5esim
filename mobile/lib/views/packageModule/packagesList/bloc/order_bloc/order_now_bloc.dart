import 'dart:convert';
import 'dart:developer';
import 'package:dio/dio.dart';
import 'package:esimconnect/utills/global.dart' as global;
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import '../../model/ordernowModel.dart';
import 'package_datail_event.dart';

class OrderNowBloc
    extends ApiBloc<BuyNowEvent, ApiState<OrderNowModel>, OrderNowModel> {
  final ApiService apiService;

  OrderNowBloc(this.apiService) : super(ApiInitial()) {
    on<BuyNowEvent>(_onPackageDetailsEvent);
  }

  Future<void> _onPackageDetailsEvent(
    BuyNowEvent event,
    Emitter<ApiState<OrderNowModel>> emit,
  ) async {
    await _onOrderNow(event, emit);
  }

  Future<void> _onOrderNow(
    BuyNowEvent event,
    Emitter<ApiState<OrderNowModel>> emit,
  ) async {
    emit(loadingState());
    try {
      final result = await executeApiCall(event);
      log('emitt success');
      emit(successState(result));
    } catch (e) {
      emit(errorState(e.toString()));
    }
  }

  @override
  Future<OrderNowModel> executeApiCall(BuyNowEvent event) async {
    try {
      Map<String, dynamic> parametermap = {};
      //total_amount
      if (event.isTopu == true) {
        parametermap["iccid"] = event.topUpiccid;
        parametermap["packageId"] = event.packageid;
      } else {
        parametermap["packageId"] = event.packageid;
      }
      parametermap["currency"] = global.activeCurrencyname ?? "USD";
      // parametermap["total_amount"] = event.orderPrice;
      // parametermap["payment_gateway"] = event.gatewayname;
      // if (event.gatewayname == 'GpayInAppPurchase') {
      //   parametermap["fromApp"] = Platform.isAndroid ? 'android' : 'ios';
      // }
      log('OrderNow body is $parametermap');

      final response = await apiService.post(
        ApiEndPoints.IAP_INITIATE,
        data: parametermap,
      );
      log('OrderNow response ${jsonEncode(response)}');
      return OrderNowModel.fromJson(response);
    } on DioException catch (e) {
      throw e.message ?? 'Failed to fetch countries';
    } catch (e) {
      throw 'Unknown error occurred';
    }
  }

  @override
  ApiState<OrderNowModel> loadingState() => ApiLoading();

  @override
  ApiState<OrderNowModel> successState(OrderNowModel response) =>
      ApiSuccess(response);

  @override
  ApiState<OrderNowModel> errorState(String error) => ApiFailure(error);
}
