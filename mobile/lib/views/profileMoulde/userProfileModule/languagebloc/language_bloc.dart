import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/Model/LanguageModel.dart';
import '../../../../utills/connectivity/connectivity_bloc.dart';
import 'language_event.dart';

class LanguageBloc
    extends ApiBloc<LanguageEvent, ApiState<LanguageModel>, LanguageModel> {
  final ApiService apiService;
  final ConnectivityBloc _connectivityBloc;
  late StreamSubscription connectivitySubscription;
  LanguageBloc(this.apiService, this._connectivityBloc) : super(ApiInitial()) {
    on<LanguageEvent>(_onFetchPackageList);

    connectivitySubscription = _connectivityBloc.stream.listen((state) {
      if (state is Connected) {
        add(LanguageEvent());
      }
    });
  }

  Future<void> _onFetchPackageList(
    LanguageEvent event,
    Emitter<ApiState<LanguageModel>> emit,
  ) async {
    emit(loadingState());
    try {
      final result = await executeApiCall(event);
      emit(successState(result));
    } on DioException catch (e) {
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
  Future<LanguageModel> executeApiCall(LanguageEvent event) async {
    final response = await apiService.get(ApiEndPoints.GET_LANGUAGE);
    // log("Language Response: ${jsonEncode(response)}");
    return LanguageModel.fromJson(response);
  }

  @override
  ApiState<LanguageModel> loadingState() => ApiLoading();

  @override
  ApiState<LanguageModel> successState(LanguageModel response) =>
      ApiSuccess(response);

  @override
  ApiState<LanguageModel> errorState(String error) => ApiFailure(error);
}
