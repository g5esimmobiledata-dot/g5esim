import 'dart:developer';
import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import 'package:esimconnect/views/authModule/logout_bloc/LogoutUser.dart';
import 'package:esimconnect/views/authModule/model/logoutModel.dart';

class LogOutBloc
    extends ApiBloc<LogoutUser, ApiState<LogoutModel>, LogoutModel> {
  final ApiService apiService;

  LogOutBloc(this.apiService) : super(ApiInitial()) {
    on<LogoutUser>(_onLogoutUser);
  }

  Future<void> _onLogoutUser(
    LogoutUser event,
    Emitter<ApiState<LogoutModel>> emit,
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
  Future<LogoutModel> executeApiCall(LogoutUser event) async {
    try {
      final response = await apiService.post(ApiEndPoints.LOGOUT);
      return LogoutModel.fromJson(response);
    } catch (e) {
      if (e is DioException) {
        log('❌ LogOut failed with error: ${e.error}');
        rethrow;
      }
      rethrow;
    }
  }

  @override
  ApiState<LogoutModel> loadingState() => ApiLoading();

  @override
  ApiState<LogoutModel> successState(LogoutModel response) =>
      ApiSuccess(response);

  @override
  ApiState<LogoutModel> errorState(String error) => ApiFailure(error);
}
