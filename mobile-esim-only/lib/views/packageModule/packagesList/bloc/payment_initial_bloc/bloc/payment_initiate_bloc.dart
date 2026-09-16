import 'dart:convert';
import 'dart:developer';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import '../model/paymentinitiateModel.dart';
import 'payment_initiate_event.dart';

class PaymentInitiatebloc
    extends
        ApiBloc<
          PaymentInitiateEvent,
          ApiState<PaymentInitiateModel>,
          PaymentInitiateModel
        > {
  final ApiService apiService;

  PaymentInitiatebloc(this.apiService) : super(ApiInitial()) {
    on<PaymentInitiateEvent>(_onPaymentInitiated);
  }

  Future<void> _onPaymentInitiated(
    PaymentInitiateEvent event,
    Emitter<ApiState<PaymentInitiateModel>> emit,
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
  Future<PaymentInitiateModel> executeApiCall(
    PaymentInitiateEvent event,
  ) async {
    Map<String, dynamic> parameterbody = {};
    if (event.gatewayId != null) {
      parameterbody['gatewayId'] = event.gatewayId;
    }
    parameterbody['packageId'] = event.packageId;
    parameterbody['quantity'] = event.quantity;
    final currency = event.currency.trim();
    parameterbody['currency'] =
        currency.isEmpty || currency.toLowerCase() == 'null'
        ? 'USD'
        : currency.toUpperCase();
    parameterbody['orderId'] = event.orderId;
    if (event.paymentMethod != null) {
      parameterbody['paymentMethod'] = event.paymentMethod;
    }

    if (event.amount != null) {
      parameterbody['amount'] = event.amount.toString();
    }
    if (event.email != null) {
      parameterbody['email'] = event.email;
    }
    if (event.phone != null) {
      parameterbody['phone'] = event.phone;
    }

    parameterbody['referralCredits'] = event.referalId;
    parameterbody['giftCardId'] = event.giftCardId;
    parameterbody['voucherId'] = event.voucherId;
    parameterbody['promoType'] = event.promoType;
    parameterbody['promoCode'] = event.promoCode;

    if (event.gatewayName == 'GpayInAppPurchase') {
      parameterbody["fromApp"] = kIsWeb
          ? 'web'
          : Platform.isAndroid
          ? 'android'
          : 'ios';
    }

    log('payment initiate body is ${jsonEncode(parameterbody)}');

    try {
      final response = await apiService.post(
        ApiEndPoints.PAYMENTINITIATE,
        data: parameterbody,
      );
      log('payment initiate response is ${jsonEncode(response)}');
      return PaymentInitiateModel.fromJson(response);
    } on DioException catch (e) {
      throw e.message ?? 'Failed to fetch _onPaymentInitiated';
    } catch (e) {
      throw 'Unknown error occurred';
    }
  }

  @override
  ApiState<PaymentInitiateModel> loadingState() => ApiLoading();

  @override
  ApiState<PaymentInitiateModel> successState(PaymentInitiateModel response) =>
      ApiSuccess(response);

  @override
  ApiState<PaymentInitiateModel> errorState(String error) => ApiFailure(error);
}
