import 'dart:convert';
import 'dart:developer';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:esimconnect/utills/global.dart' as global;
import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import '../model/paymentverifyModel.dart';
import 'payment_verify_event.dart';

class PaymentVerifybloc
    extends
        ApiBloc<
          PaymentVerifyEvent,
          ApiState<PaymentVerifyModel>,
          PaymentVerifyModel
        > {
  final ApiService apiService;

  PaymentVerifybloc(this.apiService) : super(ApiInitial()) {
    on<PaymentVerifyEvent>(_onPaymentVerified);
  }

  Future<void> _onPaymentVerified(
    PaymentVerifyEvent event,
    Emitter<ApiState<PaymentVerifyModel>> emit,
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
  Future<PaymentVerifyModel> executeApiCall(PaymentVerifyEvent event) async {
    Map<String, dynamic> parameterbody = {};
    final packageName = await global.getPackageName();
    if (!kIsWeb && Platform.isIOS) {
      parameterbody["receiptData"] = event.receiptData;
    } else {
      parameterbody["purchaseToken"] = event.purchaseToken;
      parameterbody["productId"] = event.googleorderid;
    }
    parameterbody["packageName"] = packageName;
    parameterbody["platform"] = kIsWeb
        ? 'web'
        : Platform.isAndroid
        ? 'android'
        : 'ios';
    parameterbody["quantity"] = 1;
    parameterbody["currency"] = global.activeCurrencyname ?? "USD";
    parameterbody["packageId"] = event.packageId;
    parameterbody["voucherId"] = event.voucherId;
    parameterbody["referalId"] = event.referalId;
    parameterbody["giftCardId"] = event.giftCardId;
    parameterbody["promoType"] = event.promoType;
    parameterbody["promoCode"] = event.promoCode;

    log('Payment Verify body: ${jsonEncode(parameterbody)}');

    try {
      final response = await apiService.post(
        ApiEndPoints.IAP_VERIFY,
        data: parameterbody,
      );
      log('Payment Verify Response: ${jsonEncode(response)}');

      return PaymentVerifyModel.fromJson(response);
    } on DioException catch (e) {
      throw e.message ?? 'Payment cancelled';
    } catch (e) {
      log('erorr is $e');
      throw 'Unknown error occurred';
    }
  }

  @override
  ApiState<PaymentVerifyModel> loadingState() => ApiLoading();

  @override
  ApiState<PaymentVerifyModel> successState(PaymentVerifyModel response) =>
      ApiSuccess(response);

  @override
  ApiState<PaymentVerifyModel> errorState(String error) => ApiFailure(error);
}
