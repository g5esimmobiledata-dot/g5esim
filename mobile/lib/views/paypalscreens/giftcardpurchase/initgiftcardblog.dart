import 'dart:convert';
import 'dart:developer';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';

import 'initGiftCardModel.dart';
import 'initgiftcardevent.dart';

class InitGitCardBloc
    extends
        ApiBloc<
          Initgiftcardevent,
          ApiState<InitGiftCardModel>,
          InitGiftCardModel
        > {
  final ApiService apiService;

  InitGitCardBloc(this.apiService) : super(ApiInitial()) {
    on<Initgiftcardevent>(_onLoginUser);
  }

  Future<void> _onLoginUser(
    Initgiftcardevent event,
    Emitter<ApiState<InitGiftCardModel>> emit,
  ) async {
    debugPrint('🚀 Initgiftcardevent event triggered loadingState');
    emit(loadingState());
    try {
      final users = await executeApiCall(event);
      print("sucesss");
      emit(successState(users));
    } catch (e) {
      emit(errorState(e.toString()));
    }
  }

  @override
  Future<InitGiftCardModel> executeApiCall(Initgiftcardevent event) async {
    try {
      print(" requestData");
      final Map<String, dynamic> requestData = {
        "amount": event.amount,
        "currency": event.currency,
        "email": event.email,
        "gatewayId": event.gatewayId,
        "message": event.message,
        "name": event.name,
        "recipientEmail": event.recipientEmail,
        "recipientName": event.recipientName,
      };
      print(" init api body ${requestData}");
      final response = await apiService.post(
        ApiEndPoints.CREATE_GIFTCARD,
        data: requestData,
      );
      log('reset response is ${jsonEncode(response)}');
      return InitGiftCardModel.fromJson(response);
    } catch (e) {
      print('❌ reset failed with error: $e');
      throw e is DioException
          ? e.message ?? 'Failed to Login users'
          : 'Unknown error occurred';
    }
  }

  @override
  ApiState<InitGiftCardModel> loadingState() => ApiLoading();

  @override
  ApiState<InitGiftCardModel> successState(InitGiftCardModel response) =>
      ApiSuccess(response);

  @override
  ApiState<InitGiftCardModel> errorState(String error) => ApiFailure(error);
}
