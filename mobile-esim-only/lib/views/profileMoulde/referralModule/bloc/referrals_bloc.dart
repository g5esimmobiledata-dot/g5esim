import 'dart:convert';
import 'dart:developer';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';

import '../referralModels/referrals_model.dart';
import '../referralsevents/referalevent.dart';

class ReferralBloc
    extends ApiBloc<Referalevent, ApiState<ReferralModel>, ReferralModel> {
  final ApiService apiService;

  ReferralBloc(this.apiService) : super(ApiInitial()) {
    on<Referalevent>(_onReferalevent);
  }

  Future<void> _onReferalevent(
    Referalevent event,
    Emitter<ApiState<ReferralModel>> emit,
  ) async {
    debugPrint('🚀 Referalevent triggered loadingState');
    emit(loadingState());
    try {
      final users = await executeApiCall(event);
      emit(successState(users));
    } catch (e) {
      emit(errorState(e.toString()));
    }
  }

  @override
  Future<ReferralModel> executeApiCall(Referalevent event) async {
    try {
      final response = await apiService.get(ApiEndPoints.REFERRALS_MYPROGRAM);
      log('referral response is ${jsonEncode(response)}');
      return ReferralModel.fromJson(response);
    } catch (e) {
      throw e is DioException
          ? e.message ?? 'Failed EditUserProfile'
          : 'Unknown error occurred';
    }
  }

  @override
  ApiState<ReferralModel> loadingState() => ApiLoading();

  @override
  ApiState<ReferralModel> successState(ReferralModel response) =>
      ApiSuccess(response);

  @override
  ApiState<ReferralModel> errorState(String error) => ApiFailure(error);
}
