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

import 'confrimPaymentEvent.dart';

class Confrimpaymentbloc
    extends ApiBloc<Confrimpaymentevent, ApiState<LoginModel>, LoginModel> {
  final ApiService apiService;

  Confrimpaymentbloc(this.apiService) : super(ApiInitial()) {
    on<Confrimpaymentevent>(_onLoginUser);
  }

  Future<void> _onLoginUser(
    Confrimpaymentevent event,
    Emitter<ApiState<LoginModel>> emit,
  ) async {
    debugPrint('🚀 Confrimpaymentevent event triggered loadingState');
    emit(loadingState());
    try {
      final users = await executeApiCall(event);
      emit(successState(users));
    } catch (e) {
      emit(errorState(e.toString()));
    }
  }

  @override
  Future<LoginModel> executeApiCall(Confrimpaymentevent event) async {
    try {
      print(" requestData");
      final Map<String, dynamic> requestData = event.fromGiftCard
          ? {
              "providerType": "paypal",
              "orderId": event.orderId,
              "metadata": {
                "type": "gift_card",
                "amount": event.amount,
                "currency": event.currency,
                "recipientEmail": event.recipientEmail,
                "recipientName": event.recipientName,
                "message": event.message,
                "userId": event.userId,
              },
            }
          : {
              "providerType": "paypal",
              "orderId": event.orderId,
              "metadata": {
                "type": event.isGuest ? "guest_purchase" : "package_purchase",
                "packageId": "${event.packageId}",
                "userId": event.userId,
                "quantity": "1",
                "guestEmail": event.guestEmail,
                if ((event.guestAccessToken ?? '').trim().isNotEmpty)
                  "guestAccessToken": event.guestAccessToken,
              },
            };
      print(" event.isGuest ${requestData}");
      final response = await apiService.post(
        event.isGuest
            ? ApiEndPoints.CONFIRM_PAYMENT_GUEST
            : ApiEndPoints.CONFIRM_PAYMENT,
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
