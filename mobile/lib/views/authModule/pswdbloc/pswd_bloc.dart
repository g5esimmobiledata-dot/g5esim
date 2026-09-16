import 'dart:convert';
import 'dart:developer';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';

import '../model/pswdModel.dart';
import 'PswdEvent.dart';

class PswdBloc extends ApiBloc<PswdEvent, ApiState<PswdModel>, PswdModel> {
  final ApiService apiService;

  PswdBloc(this.apiService) : super(ApiInitial()) {
    on<PswdEvent>(_onLoginUser);
  }

  Future<void> _onLoginUser(
    PswdEvent event,
    Emitter<ApiState<PswdModel>> emit,
  ) async {
    debugPrint('🚀 PswdEvent event triggered loadingState');
    emit(loadingState());
    try {
      final users = await executeApiCall(event);
      emit(successState(users));
    } catch (e) {
      emit(errorState(e.toString()));
    }
  }

  @override
  Future<PswdModel> executeApiCall(PswdEvent event) async {
    try {
      final Map<String, dynamic> requestData = {
        'password': event.pswd,
        "confirmPassword": event.cPswd,
        "userId": event.id,
      };

      log("sognup Body data email ${jsonEncode(requestData)}");
      final response = await apiService.post(
        ApiEndPoints.SET_PASSWORD,
        data: requestData,
      );
      log('login response is ${jsonEncode(response)}');
      return PswdModel.fromJson(response);
    } catch (e) {
      log('❌ Login failed with error: $e');
      throw e is DioException
          ? e.message ?? 'Failed to Login users'
          : 'Unknown error occurred';
    }
  }

  @override
  ApiState<PswdModel> loadingState() => ApiLoading();

  @override
  ApiState<PswdModel> successState(PswdModel response) => ApiSuccess(response);

  @override
  ApiState<PswdModel> errorState(String error) => ApiFailure(error);
}
