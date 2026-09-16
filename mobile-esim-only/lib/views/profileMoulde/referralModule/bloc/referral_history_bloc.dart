import 'dart:developer';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import '../referralModels/referral_history_model.dart';

import '../referralsevents/referral_history_event.dart';

class ReferralHistoryBloc
    extends
        ApiBloc<
          ReferralHistoryEvent,
          ApiState<ReferralHistoryModel>,
          ReferralHistoryModel
        > {
  final ApiService apiService;

  ReferralHistoryBloc(this.apiService) : super(ApiInitial()) {
    on<ReferralHistoryEvent>(_onReferralHistoryEvent);
  }

  Future<void> _onReferralHistoryEvent(
    ReferralHistoryEvent event,
    Emitter<ApiState<ReferralHistoryModel>> emit,
  ) async {
    debugPrint('🚀 ReferralHistoryEvent triggered loadingState');
    emit(loadingState());
    try {
      final users = await executeApiCall(event);
      emit(successState(users));
    } catch (e) {
      emit(errorState(e.toString()));
    }
  }

  @override
  Future<ReferralHistoryModel> executeApiCall(
    ReferralHistoryEvent event,
  ) async {
    try {
      final response = await apiService.get(ApiEndPoints.REFERRALS_HISTORY);
      log("referral History:- $response");
      return ReferralHistoryModel.fromJson(response);
    } catch (e) {
      throw e is DioException
          ? e.message ?? 'Failed EditUserProfile'
          : 'Unknown error occurred';
    }
  }

  @override
  ApiState<ReferralHistoryModel> loadingState() => ApiLoading();

  @override
  ApiState<ReferralHistoryModel> successState(ReferralHistoryModel response) =>
      ApiSuccess(response);

  @override
  ApiState<ReferralHistoryModel> errorState(String error) => ApiFailure(error);
}
