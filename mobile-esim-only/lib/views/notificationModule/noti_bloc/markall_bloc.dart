import 'package:dio/dio.dart';
import 'package:esimconnect/views/notificationModule/noti_bloc/mark_event.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import '../model/marknotif.dart';

class markAllreadBloc
    extends ApiBloc<markEvent, ApiState<markNotificatioin>, markNotificatioin> {
  final ApiService apiService;

  markAllreadBloc(this.apiService) : super(ApiInitial()) {
    on<markEvent>(_onfetchnotiDetails);
  }

  Future<void> _onfetchnotiDetails(
    markEvent event,
    Emitter<ApiState<markNotificatioin>> emit,
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
  Future<markNotificatioin> executeApiCall(markEvent event) async {
    try {
      final url = '${ApiEndPoints.NOTIFICATION}/read-all';
      final response = await apiService.patch(url);
      return markNotificatioin.fromJson(response);
    } on DioException catch (e) {
      throw e.message ?? 'Failed to fetch NOTIFICATIONList';
    } catch (e) {
      throw 'Unknown error occurred ${e.toString()}';
    }
  }

  @override
  ApiState<markNotificatioin> loadingState() => ApiLoading();

  @override
  ApiState<markNotificatioin> successState(markNotificatioin response) =>
      ApiSuccess(response);

  @override
  ApiState<markNotificatioin> errorState(String error) => ApiFailure(error);
}
