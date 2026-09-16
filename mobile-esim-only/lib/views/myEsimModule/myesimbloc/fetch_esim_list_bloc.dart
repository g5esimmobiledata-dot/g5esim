import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import 'package:esimconnect/views/myEsimModule/model/EsimListModel.dart';
import 'package:esimconnect/views/myEsimModule/myesimbloc/fetch_esim_event.dart';

class FetchEsimListbloc
    extends ApiBloc<fetchEsimEvent, ApiState<EsimListModel>, EsimListModel> {
  final ApiService apiService;

  FetchEsimListbloc(this.apiService) : super(ApiInitial()) {
    on<fetchEsimEvent>(_onfetchEsimDetails);
  }

  Future<void> _onfetchEsimDetails(
    fetchEsimEvent event,
    Emitter<ApiState<EsimListModel>> emit,
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
  Future<EsimListModel> executeApiCall(fetchEsimEvent event) async {
    try {
      final url = ApiEndPoints.ORDERS;
      final response = await apiService.get(url);
      // log('fetchEsimList Response: ${jsonEncode(response)}');
      return EsimListModel.fromJson(response);
    } on DioException catch (e) {
      throw e.message ?? 'Failed to fetch OrderList';
    } catch (e) {
      throw 'Unknown error occurred ${e.toString()}';
    }
  }

  @override
  ApiState<EsimListModel> loadingState() => ApiLoading();

  @override
  ApiState<EsimListModel> successState(EsimListModel response) =>
      ApiSuccess(response);

  @override
  ApiState<EsimListModel> errorState(String error) => ApiFailure(error);
}
