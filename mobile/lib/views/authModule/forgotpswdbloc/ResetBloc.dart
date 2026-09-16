import 'dart:convert';
import 'dart:developer';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import 'package:esimconnect/views/authModule/model/usermodel.dart';

import 'ResetEvent.dart';

class ResetBloc extends ApiBloc<ResetEvent, ApiState<LoginModel>, LoginModel> {
  final ApiService apiService;

  ResetBloc(this.apiService) : super(ApiInitial()) {
    on<ResetEvent>(_onLoginUser);
  }

  Future<void> _onLoginUser(
    ResetEvent event,
    Emitter<ApiState<LoginModel>> emit,
  ) async {
    debugPrint('🚀 ResetEvent event triggered loadingState');
    emit(loadingState());
    try {
      final users = await executeApiCall(event);
      emit(successState(users));
    } catch (e) {
      emit(errorState(e.toString()));
    }
  }

  @override
  Future<LoginModel> executeApiCall(ResetEvent event) async {
    try {
      final Map<String, dynamic> requestData = {'email': event.email};
      log("reset Body data email ${event.email}");
      final response = await apiService.post(
        ApiEndPoints.RESET_QUERY,
        data: requestData,
      );
      log('reset response is ${jsonEncode(response)}');
      return LoginModel.fromJson(response);
    } catch (e) {
      log('❌ reset failed with error: $e');
      throw e is DioException
          ? e.message ?? 'Failed to Login users'
          : 'Unknown error occurred';
    }
  }

  @override
  ApiState<LoginModel> loadingState() => ApiLoading();

  @override
  ApiState<LoginModel> successState(LoginModel response) =>
      ApiSuccess(response);

  @override
  ApiState<LoginModel> errorState(String error) => ApiFailure(error);
}
