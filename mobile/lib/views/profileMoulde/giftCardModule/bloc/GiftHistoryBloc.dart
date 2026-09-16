import 'dart:convert';
import 'dart:developer';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import '../giftModels/giftHistoryModel.dart';
import 'GiftCardHistoryevent.dart';

class GiftHistoryBloc
    extends
        ApiBloc<
          GiftHistoryevent,
          ApiState<GiftCardHistoryModel>,
          GiftCardHistoryModel
        > {
  final ApiService apiService;

  GiftHistoryBloc(this.apiService) : super(ApiInitial()) {
    on<GiftHistoryevent>(_onGiftCardHistoryevent);
  }

  Future<void> _onGiftCardHistoryevent(
    GiftHistoryevent event,
    Emitter<ApiState<GiftCardHistoryModel>> emit,
  ) async {
    debugPrint('🚀 GiftHistoryevent triggered loadingState');
    emit(loadingState());
    try {
      final users = await executeApiCall(event);
      emit(successState(users));
    } catch (e) {
      emit(errorState(e.toString()));
    }
  }

  @override
  Future<GiftCardHistoryModel> executeApiCall(GiftHistoryevent event) async {
    try {
      final response = await apiService.get(ApiEndPoints.RECEIVED_GIFT_CARD);
      log("gift card History:- ${jsonEncode(response)}");
      return GiftCardHistoryModel.fromJson(response);
    } catch (e) {
      throw e is DioException
          ? e.message ?? 'Failed EditUserProfile'
          : 'Unknown error occurred';
    }
  }

  @override
  ApiState<GiftCardHistoryModel> loadingState() => ApiLoading();

  @override
  ApiState<GiftCardHistoryModel> successState(GiftCardHistoryModel response) =>
      ApiSuccess(response);

  @override
  ApiState<GiftCardHistoryModel> errorState(String error) => ApiFailure(error);
}
