import 'dart:convert';
import 'dart:developer';

import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import 'package:esimconnect/views/homeModule/kycFormModule/kycform_bloc/kycformevent.dart';
import 'package:esimconnect/views/homeModule/kycFormModule/model/KYCResponse.dart';
import 'package:esimconnect/utills/global.dart' as global;

class KycFormBloc
    extends ApiBloc<KycFormEvent, ApiState<KYCResponse>, KYCResponse> {
  final ApiService apiService;
  KycFormBloc(this.apiService) : super(ApiInitial()) {
    on<KycFormEvent>(_onKycFormEvent);
  }
  Future<void> _onKycFormEvent(
    KycFormEvent event,
    Emitter<ApiState<KYCResponse>> emit,
  ) async {
    emit(loadingState());
    try {
      final users = await executeApiCall(event);
      emit(successState(users));
    } catch (e) {
      emit(errorState(e.toString()));
    }
  }

  @override
  Future<KYCResponse> executeApiCall(KycFormEvent event) async {
    try {
      final formData = FormData.fromMap({
        'documentType': event.documentType,
        "document": await MultipartFile.fromFile(event.document),
      });

      final response = await apiService.post(
        ApiEndPoints.KYCFORM,
        data: formData,
      );
      log("kyc response:- ${jsonEncode(response)}");
      return KYCResponse.fromJson(response);
    } on DioException catch (e) {
      global.showToastMessage(message: '${e.error}');
      throw e.message ??
          'Failed to complete the request due to a network error.';
    } catch (e) {
      print("exception at kyc form:- $e");
      throw e.toString();
    }
  }

  @override
  ApiState<KYCResponse> loadingState() => ApiLoading();

  @override
  ApiState<KYCResponse> successState(KYCResponse response) =>
      ApiSuccess(response);

  @override
  ApiState<KYCResponse> errorState(String error) => ApiFailure(error);
}
