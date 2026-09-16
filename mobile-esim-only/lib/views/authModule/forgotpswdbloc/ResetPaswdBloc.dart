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
import 'ResetPaswdEvent.dart';

class ResetPaswdBloc
    extends ApiBloc<ResetPaswdEvent, ApiState<PswdModel>, PswdModel> {
  final ApiService apiService;

  ResetPaswdBloc(this.apiService) : super(ApiInitial()) {
    on<ResetPaswdEvent>(_onLoginUser);
  }

  Future<void> _onLoginUser(
    ResetPaswdEvent event,
    Emitter<ApiState<PswdModel>> emit,
  ) async {
    debugPrint('🚀 ResetPaswdEvent event triggered loadingState');
    emit(loadingState());
    try {
      final users = await executeApiCall(event);
      emit(successState(users));
    } catch (e) {
      emit(errorState(e.toString()));
    }
  }

  @override
  Future<PswdModel> executeApiCall(ResetPaswdEvent event) async {
    try {
      final Map<String, dynamic> requestData = {
        'email': event.email,
        'otp': event.otp,
        'newPassword': event.newpswd,
        'confirmPassword': event.cnfmpswd,
      };
      log("reset pswd Body data email ${event.email}");
      final response = await apiService.post(
        ApiEndPoints.RESET_PASSWORD_VERIFY,
        data: requestData,
      );
      log('reset pswd response is ${jsonEncode(response)}');
      return PswdModel.fromJson(response);
    } catch (e) {
      log('❌ reset pswd failed with error: $e');
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
