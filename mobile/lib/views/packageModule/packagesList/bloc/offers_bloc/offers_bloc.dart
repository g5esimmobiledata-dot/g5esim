import 'dart:async';
import 'dart:convert';
import 'dart:developer';
import 'package:dio/dio.dart';
import 'package:esimconnect/views/packageModule/packagesList/bloc/offers_bloc/offers_event.dart';
import 'package:esimconnect/views/packageModule/packagesList/bloc/offers_bloc/offers_model.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';

class OffersBloc
    extends ApiBloc<OffersEvent, ApiState<OffersModel>, OffersModel> {
  final ApiService apiService;

  OffersBloc(this.apiService) : super(ApiInitial()) {
    on<OffersEvent>(_onFetchVoucher);
  }
  Future<void> _onFetchVoucher(
    OffersEvent event,
    Emitter<ApiState<OffersModel>> emit,
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
  Future<OffersModel> executeApiCall(OffersEvent event) async {
    try {
      Map<String, dynamic> parameterbody = {
        "code": event.code,
        "orderAmount": event.totalAmount,
        "type": event.type,
      };
      print("offers body ${jsonEncode(parameterbody)}");
      final response = await apiService.post(
        ApiEndPoints.VOUCHER_APPLY,
        data: jsonEncode(parameterbody),
      );
      log('voucher response ${jsonEncode(response)}');
      return OffersModel.fromJson(response);
    } on DioException catch (e) {
      print("dio excpetion:- ${e.error}");
      throw e.error ?? 'Invalid ${event.type} code';
    } catch (e) {
      print("error in voucher $e");
      throw 'Unknown error occurred';
    }
  }

  @override
  ApiState<OffersModel> loadingState() => ApiLoading();

  @override
  ApiState<OffersModel> successState(OffersModel response) =>
      ApiSuccess(response);

  @override
  ApiState<OffersModel> errorState(String error) => ApiFailure(error);
}
