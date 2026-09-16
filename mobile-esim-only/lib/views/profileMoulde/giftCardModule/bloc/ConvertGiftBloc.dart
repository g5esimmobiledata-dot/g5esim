import 'dart:convert';
import 'dart:developer';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import '../giftModels/convertGiftModel.dart';
import 'convertGiftEvent.dart';

class ConvertGiftBloc
    extends
        ApiBloc<
          ConvertGiftEvent,
          ApiState<GiftconvertModel>,
          GiftconvertModel
        > {
  final ApiService apiService;

  ConvertGiftBloc(this.apiService) : super(ApiInitial()) {
    on<ConvertGiftEvent>(_onGiftCardHistoryevent);
  }

  Future<void> _onGiftCardHistoryevent(
    ConvertGiftEvent event,
    Emitter<ApiState<GiftconvertModel>> emit,
  ) async {
    debugPrint('🚀 ConvertGiftEvent triggered loadingState');
    emit(loadingState());
    try {
      final users = await executeApiCall(event);
      emit(successState(users));
    } catch (e) {
      emit(errorState(e.toString()));
    }
  }

  @override
  Future<GiftconvertModel> executeApiCall(ConvertGiftEvent event) async {
    try {
      // {
      // "code": "GC-0CG2-2SGO-O24R-EJD1",
      // "amount": 1,
      // "currency": "USD",
      // "message": "asdsad",
      //  "theme": "birthday"
      // }
      final data = {
        "code": event.code,
        "amount": event.amount,
        "currency": event.currency,
        "message": event.message,
        "theme": event.theme,
      };
      log('data is ${jsonEncode(data)}');
      final response = await apiService.post(
        ApiEndPoints.CONVERT_TO_GIFTCARD,
        data: data,
      );
      log("gift ConvertGiftBloc:- ${jsonEncode(response)}");
      return GiftconvertModel.fromJson(response);
    } catch (e) {
      throw e is DioException
          ? e.message ?? 'Failed EditUserProfile'
          : 'Unknown error occurred';
    }
  }

  @override
  ApiState<GiftconvertModel> loadingState() => ApiLoading();

  @override
  ApiState<GiftconvertModel> successState(GiftconvertModel response) =>
      ApiSuccess(response);

  @override
  ApiState<GiftconvertModel> errorState(String error) => ApiFailure(error);
}
