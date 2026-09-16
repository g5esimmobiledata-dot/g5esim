import 'package:dio/dio.dart';
import 'package:esimconnect/views/packageModule/regionsList/regionList_bloc/region_event.dart';
import 'package:esimconnect/views/packageModule/regionsList/model/regionsModel.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import '../../../../utills/global.dart' as global;

class RegionsListBloc
    extends ApiBloc<RegionsListEvent, ApiState<RegionsModel>, RegionsModel> {
  final ApiService apiService;

  RegionsListBloc(this.apiService) : super(ApiInitial()) {
    on<RegionsListEvent>(_onFetchRegionsList);
  }

  Future<void> _onFetchRegionsList(
    RegionsListEvent event,
    Emitter<ApiState<RegionsModel>> emit,
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
  Future<RegionsModel> executeApiCall(RegionsListEvent event) async {
    try {
      // Build the query parameters
      Map<String, dynamic> parameterbody = {
        'currency': global.activeCurrencyname,
      };

      final response = await apiService.get(
        ApiEndPoints.REGIONS,
        query: parameterbody,
      );
      // log('region List Response: ${jsonEncode(response)}');

      return RegionsModel.fromJson(response);
    } on DioException catch (e) {
      throw e.message ?? 'Failed to fetch Regions';
    } catch (e) {
      throw 'Unknown error occurred';
    }
  }

  @override
  ApiState<RegionsModel> loadingState() => ApiLoading();

  @override
  ApiState<RegionsModel> successState(RegionsModel response) =>
      ApiSuccess(response);

  @override
  ApiState<RegionsModel> errorState(String error) => ApiFailure(error);
}
