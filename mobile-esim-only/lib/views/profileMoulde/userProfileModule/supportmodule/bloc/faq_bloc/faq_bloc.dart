import 'dart:convert';
import 'dart:developer';

import 'package:dio/dio.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/supportmodule/bloc/faq_bloc/faq_event.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/supportmodule/model/FaqModel.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';

class FAQBloc extends ApiBloc<FaqEvent, ApiState<FaqModel>, FaqModel> {
  final ApiService apiService;

  FAQBloc(this.apiService) : super(ApiInitial()) {
    on<FaqEvent>(_onFetchFAQ);
  }

  Future<void> _onFetchFAQ(
    FaqEvent event,
    Emitter<ApiState<FaqModel>> emit,
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
  Future<FaqModel> executeApiCall(FaqEvent event) async {
    try {
      final response = await apiService.get(ApiEndPoints.GET_FAQ);
      log('faq response is ${jsonEncode(response)}');
      return FaqModel.fromJson(response);
    } on DioException catch (e) {
      throw e.message ?? 'Failed to get faqs';
    } catch (e) {
      throw 'Unknown error occurred';
    }
  }

  @override
  ApiState<FaqModel> loadingState() => ApiLoading();

  @override
  ApiState<FaqModel> successState(FaqModel response) => ApiSuccess(response);

  @override
  ApiState<FaqModel> errorState(String error) => ApiFailure(error);
}
