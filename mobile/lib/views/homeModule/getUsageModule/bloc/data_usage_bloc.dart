import 'dart:async';
import 'dart:developer';
import 'package:dio/dio.dart';
import 'package:esimconnect/utills/connectivity/connectivity_bloc.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import 'package:esimconnect/views/homeModule/getUsageModule/bloc/home_event.dart';
import 'package:esimconnect/views/homeModule/getUsageModule/model/dataUsage_Model.dart';

class DataUsageBloc
    extends ApiBloc<HomeEvent, ApiState<DataUsageModel>, DataUsageModel> {
  final ApiService apiService;
  final ConnectivityBloc _connectivityBloc;
  late StreamSubscription connectivitySubscription;

  DataUsageBloc(this.apiService, this._connectivityBloc) : super(ApiInitial()) {
    on<HomeEvent>(_onFetchDataUsage);

    connectivitySubscription = _connectivityBloc.stream.listen((state) {
      if (state is Connected) {
        add(HomeEvent());
      }
    });
  }

  @override
  Future<void> close() {
    connectivitySubscription.cancel();
    return super.close();
  }

  Future<void> _onFetchDataUsage(
    HomeEvent event,
    Emitter<ApiState<DataUsageModel>> emit,
  ) async {
    emit(loadingState());
    try {
      final result = await executeApiCall(event);
      emit(successState(result));
    } on DioException catch (e) {
      log('error home   ${e.message}');
      if (e.type == DioExceptionType.connectionError) {
        emit(errorState("No internet connection."));
      } else {
        emit(errorState(e.message ?? 'Failed to fetch data'));
      }
    } catch (e) {
      emit(errorState(e.toString()));
    }
  }

  @override
  Future<DataUsageModel> executeApiCall(HomeEvent event) async {
    final response = await apiService.get(ApiEndPoints.GET_USAGE);
    // log('datausage response is ${jsonEncode(response)}');
    return DataUsageModel.fromJson(response);
  }

  @override
  ApiState<DataUsageModel> loadingState() => ApiLoading();

  @override
  ApiState<DataUsageModel> successState(DataUsageModel response) =>
      ApiSuccess(response);

  @override
  ApiState<DataUsageModel> errorState(String error) => ApiFailure(error);
}
