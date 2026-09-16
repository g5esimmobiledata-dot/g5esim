import 'dart:convert';
import 'dart:developer';
import 'package:dio/dio.dart';
import 'package:esimconnect/utills/global.dart' as global;
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import '../../model/GatewayListModel.dart';
import 'gatewayEvent.dart';

class GatewayEnableBloc
    extends
        ApiBloc<GatewayEvent, ApiState<GatewayListModel>, GatewayListModel> {
  final ApiService apiService;

  GatewayEnableBloc(this.apiService) : super(ApiInitial()) {
    on<GatewayEvent>(_onPackageDetailsEvent);
  }

  Future<void> _onPackageDetailsEvent(
    GatewayEvent event,
    Emitter<ApiState<GatewayListModel>> emit,
  ) async {
    await _onOrderNow(event, emit);
  }

  Future<void> _onOrderNow(
    GatewayEvent event,
    Emitter<ApiState<GatewayListModel>> emit,
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
  Future<GatewayListModel> executeApiCall(GatewayEvent event) async {
    try {
      final response = await apiService.get(
        ApiEndPoints.GATEWAYLIST,
        query: {'currency': global.activeCurrencyname, 'scope': 'checkout'},
      );
      log('gateway response is ${jsonEncode(response)}');

      return GatewayListModel.fromJson(response);
    } on DioException catch (e) {
      throw e.message ?? 'Failed to fetch countries';
    } catch (e) {
      throw 'Unknown error occurred';
    }
  }

  @override
  ApiState<GatewayListModel> loadingState() => ApiLoading();

  @override
  ApiState<GatewayListModel> successState(GatewayListModel response) =>
      ApiSuccess(response);

  @override
  ApiState<GatewayListModel> errorState(String error) => ApiFailure(error);
}
