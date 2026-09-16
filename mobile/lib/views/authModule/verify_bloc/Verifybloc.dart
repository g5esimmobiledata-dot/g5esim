import 'dart:convert';
import 'dart:developer';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import 'package:esimconnect/views/authModule/model/verifymodel.dart';
import 'package:esimconnect/views/authModule/verify_bloc/VerifyUser.dart';

class Verifybloc
    extends ApiBloc<VerifyUser, ApiState<VerifyModel>, VerifyModel> {
  final ApiService apiService;

  Verifybloc(this.apiService) : super(ApiInitial()) {
    on<VerifyUser>(_onVerifyUser);
  }

  Future<void> _onVerifyUser(
    VerifyUser event,
    Emitter<ApiState<VerifyModel>> emit,
  ) async {
    debugPrint('🚀 VerifyUser event triggered loadingState');
    emit(loadingState());
    try {
      final users = await executeApiCall(event);
      emit(successState(users));
    } catch (e) {
      emit(errorState(e.toString()));
    }
  }

  @override
  Future<VerifyModel> executeApiCall(VerifyUser event) async {
    try {
      var parameter = {"email": event.email, "otp": event.otp};
      final response = await apiService.post(
        ApiEndPoints.VERIFYEMAIL,
        data: parameter,
      );
      log('verify response is ${jsonEncode(response)}');
      return VerifyModel.fromJson(response);
    } catch (e) {
      throw e is DioException
          ? e.message ?? 'Failed to verify users'
          : 'Unknown error occurred';
    }
  }

  @override
  ApiState<VerifyModel> loadingState() => ApiLoading();

  @override
  ApiState<VerifyModel> successState(VerifyModel response) =>
      ApiSuccess(response);

  @override
  ApiState<VerifyModel> errorState(String error) => ApiFailure(error);
}
