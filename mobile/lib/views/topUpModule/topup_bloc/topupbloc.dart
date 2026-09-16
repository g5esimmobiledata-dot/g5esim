import 'dart:convert';
import 'dart:developer';
import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import 'package:esimconnect/views/topUpModule/model/topupmodel.dart';
import 'package:esimconnect/views/topUpModule/topup_bloc/topupfeatchevent.dart';

class TopUpBloc
    extends ApiBloc<TopUpFetchEvent, ApiState<TopUpOption>, TopUpOption> {
  final ApiService apiService;

  TopUpBloc(this.apiService) : super(ApiInitial()) {
    on<TopUpFetchEvent>(_onLoginUser);
  }

  Future<void> _onLoginUser(
    TopUpFetchEvent event,
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
  Future<TopUpOption> executeApiCall(TopUpFetchEvent event) async {
    // Map<String, dynamic> parameterbody = {'type': 'topup', 'iccid': event.ccid};
    try {
      final url = "${ApiEndPoints.TOPUP_LIST}${event.ccid}/topup-packages";
      final response = await apiService.get(url);
      log('topup response is ${jsonEncode(response)}');
      return TopUpOption.fromJson(response);
    } on DioException catch (e) {
      throw e.message ?? 'Failed to TopUpBloc users due to network error.';
    } catch (e) {
      throw 'Failed to parse TopUpOption response. Data format may be incorrect.';
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
