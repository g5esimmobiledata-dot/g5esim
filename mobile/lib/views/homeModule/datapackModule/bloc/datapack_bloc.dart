import 'dart:convert';
import 'dart:developer';
import 'package:dio/dio.dart';
import 'package:esimconnect/views/homeModule/datapackModule/bloc/datapack_event.dart';
import 'package:esimconnect/views/homeModule/datapackModule/model/datapackModel.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';

import '../../../../utills/global.dart' as global;

class DataPackBloc
    extends ApiBloc<DatapackEvent, ApiState<DataPackModel>, DataPackModel> {
  final ApiService apiService;

  DataPackBloc(this.apiService) : super(ApiInitial()) {
    on<DatapackEvent>(_onFetchRegionsList);
  }

  Future<void> _onFetchRegionsList(
    DatapackEvent event,
    Emitter<ApiState<DataPackModel>> emit,
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
  Future<DataPackModel> executeApiCall(DatapackEvent event) async {
    Map<String, dynamic> parameterbody = {};
    parameterbody['page'] = event.page ?? 1;
    parameterbody['limit'] = 10;
    if (event.isdatapack == true) {
      parameterbody['dataPack'] = event.isdatapack; //only data pack
    } else {
      parameterbody['voiceAndDataAndSmsPack'] = true; // voiceAndDataAndSmsPack
    }
    parameterbody['currency'] = global.activeCurrencyname;
    log('data pack body is ${jsonEncode(parameterbody)}');
    try {
      final response = await apiService.get(
        ApiEndPoints.PACKAGE_DETAIL,
        query: parameterbody,
      );
      // log('data pack response is ${jsonEncode(response)}');
      return DataPackModel.fromJson(response);
    } on DioException catch (e) {
      throw e.message ?? 'Failed to fetch Regions';
    } catch (e, stackTrace) {
      log('Data pack parse failed: $e\n$stackTrace');
      throw e.toString();
    }
  }

  @override
  ApiState<DataPackModel> loadingState() => ApiLoading();

  @override
  ApiState<DataPackModel> successState(DataPackModel response) =>
      ApiSuccess(response);

  @override
  ApiState<DataPackModel> errorState(String error) => ApiFailure(error);
}
