import 'dart:convert';
import 'dart:developer';
import 'package:dio/dio.dart';
import 'package:esimconnect/utills/UserService.dart' show UserService;
import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import '../../../utills/global.dart' as global;
import '../model/loginpswdModel.dart';
import 'FirebaseLoginEvent.dart.dart';

class FirebaseLoginBloc
    extends
        ApiBloc<FirebaseLoginEvent, ApiState<LoginPswdModel>, LoginPswdModel> {
  final ApiService apiService;

  FirebaseLoginBloc(this.apiService) : super(ApiInitial()) {
    on<FirebaseLoginEvent>(_onLoginUser);
  }

  Future<void> _onLoginUser(
    FirebaseLoginEvent event,
    Emitter<ApiState<LoginPswdModel>> emit,
  ) async {
    debugPrint('🚀 FirebaseLoginEvent event triggered loadingState');
    emit(loadingState());
    try {
      final users = await executeApiCall(event);
      emit(successState(users));
    } catch (e) {
      emit(errorState(e.toString()));
    }
  }

  @override
  Future<LoginPswdModel> executeApiCall(FirebaseLoginEvent event) async {
    try {
      // Add referral code if available
      final referralCode = UserService.to.referralCode;
      final deviceDetails = await global.getDeviceDetails();
      final deviceId = deviceDetails['deviceid'];
      final fcmToken = kIsWeb ? '' : deviceDetails['fcmToken']?.toString();
      final location = '';
      final manufacturer =
          deviceDetails['deviceManufacturer'] ??
          deviceDetails['deviceManufacture'];
      final appVersion = deviceDetails['appVersion'];
      final model = deviceDetails['deviceModel'];

      final Map<String, dynamic> requestData = {
        'email': event.email,
        'fcmToken': fcmToken,
        'pushToken': deviceDetails['pushToken'],
        'firebaseToken': deviceDetails['firebaseToken'],
        'apnsToken': deviceDetails['apnsToken'],
        'platform': deviceDetails['platform'],
        'pushProvider': deviceDetails['pushProvider'],
        'device_details': {
          'deviceId': deviceId,
          'deviceLocation': location,
          'deviceManufacturer': manufacturer,
          'manufacturer': manufacturer,
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
      log("FirebaseLoginBloc Body data email ${event.email}");
      final response = await apiService.post(
        ApiEndPoints.FIREBASE_LOGIN,
        data: requestData,
      );
      log('FirebaseLoginBloc response is ${jsonEncode(response)}');
      return LoginPswdModel.fromJson(response);
    } catch (e) {
      log('❌ FirebaseLoginBloc failed with error: $e');
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
