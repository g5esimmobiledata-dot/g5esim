import 'dart:convert';
import 'dart:developer';

import 'package:dio/dio.dart';
import 'package:esimconnect/views/homeModule/deviceinfo/device_info_bloc/device_info_event.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import '../model/deviceInfoModel.dart';

class Devicebloc
    extends ApiBloc<DeviceEvent, ApiState<DeviceInfoModel>, DeviceInfoModel> {
  final ApiService apiService;

  Devicebloc(this.apiService) : super(ApiInitial()) {
    on<DeviceEvent>(_onFetchDataUsage);
  }

  Future<void> _onFetchDataUsage(
    DeviceEvent event,
    Emitter<ApiState<DeviceInfoModel>> emit,
  ) async {
    emit(loadingState());
    try {
      final result = await executeApiCall(event);
      emit(successState(result));
    } catch (e) {
      emit(errorState(e.toString()));
    }
  }

  @override
  Future<DeviceInfoModel> executeApiCall(DeviceEvent event) async {
    try {
      final response = await apiService.get(ApiEndPoints.DEVICE_INFO);
      log('Device Info Response: ${jsonEncode(response)}');
      return DeviceInfoModel.fromJson(response);
    } on DioException catch (e) {
      throw e.message ?? 'Failed to device info';
    } catch (e) {
      throw 'Unknown error occurred';
    }
  }

  @override
  ApiState<DeviceInfoModel> loadingState() => ApiLoading();

  @override
  ApiState<DeviceInfoModel> successState(DeviceInfoModel response) =>
      ApiSuccess(response);

  @override
  ApiState<DeviceInfoModel> errorState(String error) => ApiFailure(error);
}
