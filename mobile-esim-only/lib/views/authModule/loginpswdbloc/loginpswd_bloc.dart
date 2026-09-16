import 'dart:convert';
import 'dart:developer';
import 'package:dio/dio.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/utills/UserService.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import 'package:esimconnect/views/authModule/model/loginpswdModel.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/bloc/api_state.dart';
import '../../../utills/global.dart' as global;
import 'loginPswdEvent.dart';

class LoginPswdBloc
    extends ApiBloc<LoginPswdEvent, ApiState<LoginPswdModel>, LoginPswdModel> {
  final ApiService apiService;

  LoginPswdBloc(this.apiService) : super(ApiInitial()) {
    on<LoginPswdEvent>(_onLoginUser);
  }

  Future<void> _onLoginUser(
    LoginPswdEvent event,
    Emitter<ApiState<LoginPswdModel>> emit,
  ) async {
    debugPrint('🚀 LoginPswdEvent event triggered loadingState');
    emit(loadingState());
    try {
      final users = await executeApiCall(event);
      emit(successState(users));
    } catch (e) {
      emit(errorState(e.toString()));
    }
  }

  @override
  Future<LoginPswdModel> executeApiCall(LoginPswdEvent event) async {
    try {
      // Add referral code if available
      final referralCode = UserService.to.referralCode;
      final deviceDetails = await global.getDeviceDetails();
      final deviceId = deviceDetails['deviceid'];
      final fcmToken = kIsWeb ? '' : deviceDetails['fcmToken']?.toString();
      final location = '';
      final manufacturer = deviceDetails['deviceManufacture'];
      final appVersion = deviceDetails['appVersion'];
      final model = deviceDetails['deviceModel'];

      final Map<String, dynamic> requestData = {
        'email': event.email.trim().toLowerCase(),
        'password': event.password.trim(),
        'fcmToken': fcmToken,
        'pushToken': deviceDetails['pushToken'],
        'firebaseToken': deviceDetails['firebaseToken'],
        'apnsToken': deviceDetails['apnsToken'],
        'platform': deviceDetails['platform'],
        'pushProvider': deviceDetails['pushProvider'],
        // "isFromGoogle": event.isLoginUsingFirebase,
        'device_details': {
          'deviceId': deviceId,
          'location': location,
          'manufacturer': manufacturer,
          'deviceManufacturer': manufacturer,
          'review_models': model,
          'deviceModel': model,
          'appVersion': appVersion,
          'packageName': deviceDetails['packageName'],
          'platform': deviceDetails['platform'],
          'osVersion': deviceDetails['osVersion'],
          'fcmToken': deviceDetails['fcmToken'],
          'pushToken': deviceDetails['pushToken'],
          'apnsToken': deviceDetails['apnsToken'],
          'referralCode': referralCode,
        },
      };

      final safeRequestData = Map<String, dynamic>.from(requestData)
        ..['password'] = '***'
        ..['fcmToken'] = fcmToken == null ? null : '***';
      log("login password body is ${jsonEncode(safeRequestData)}");
      final response = await apiService.post(
        ApiEndPoints.LOGIN_PASSWORD,
        data: requestData,
      );
      log('login pswd response is $response');
      return LoginPswdModel.fromJson(response);
    } catch (e) {
      log('❌ Login/pswd failed with error: $e');
      throw e is DioException
          ? e.message ?? 'Failed to Login users'
          : 'Unknown error occurred';
    }
  }

  @override
  ApiState<LoginPswdModel> loadingState() => ApiLoading();

  @override
  ApiState<LoginPswdModel> successState(LoginPswdModel response) =>
      ApiSuccess(response);

  @override
  ApiState<LoginPswdModel> errorState(String error) => ApiFailure(error);
}
