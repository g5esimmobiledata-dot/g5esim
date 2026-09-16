import 'dart:developer';
import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import 'package:esimconnect/views/topUpModule/model/topupmodel.dart';
import 'package:esimconnect/views/topUpModule/topup_buy_bloc/topupfeatchevent.dart';
import 'package:esimconnect/utills/global.dart' as global;

class TopUpBuyBloc
    extends ApiBloc<TopUpOrderFetchEvent, ApiState<TopUpOption>, TopUpOption> {
  final ApiService apiService;

  TopUpBuyBloc(this.apiService) : super(ApiInitial()) {
    on<TopUpOrderFetchEvent>(_onBuyTopUpOrder);
  }

  Future<void> _onBuyTopUpOrder(
    TopUpOrderFetchEvent event,
    Emitter<ApiState<TopUpOption>> emit,
  ) async {
    emit(loadingState());
    try {
      final users = await executeApiCall(event);
      emit(successState(users));
    } catch (e) {
      emit(errorState(e.toString()));
    }
  }

  @override
  Future<TopUpOption> executeApiCall(TopUpOrderFetchEvent event) async {
    try {
      final response = await apiService.post(
        ApiEndPoints.ORDERS,
        data: {'iccid': event.iccid, "esim_package_id": event.packageid},
      );
      return TopUpOption.fromJson(response);
    } on DioException catch (e) {
      global.showToastMessage(message: 'Airalo Store Topup Failed');
      throw e.message ??
          'Failed to complete the request due to a network error.';
    } catch (e) {
      log('TopUpBloc me with a custom error: $e');
      throw e.toString();
    }
  }

  @override
  ApiState<TopUpOption> loadingState() => ApiLoading();

  @override
  ApiState<TopUpOption> successState(TopUpOption response) =>
      ApiSuccess(response);

  @override
  ApiState<TopUpOption> errorState(String error) => ApiFailure(error);
}
