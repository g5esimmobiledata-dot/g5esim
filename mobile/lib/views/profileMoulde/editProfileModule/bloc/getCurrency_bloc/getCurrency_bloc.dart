import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import 'package:esimconnect/views/profileMoulde/editProfileModule/model/getCurrencyModel.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/profile_bloc/userprofile_event.dart';

class GetCurrencyBloc
    extends
        ApiBloc<
          GetCurrencyEvent,
          ApiState<GetCurrencyModel>,
          GetCurrencyModel
        > {
  final ApiService apiService;

  GetCurrencyBloc(this.apiService) : super(ApiInitial()) {
    on<GetCurrencyEvent>(_onFetchPackageList);
  }

  Future<void> _onFetchPackageList(
    GetCurrencyEvent event,
    Emitter<ApiState<GetCurrencyModel>> emit,
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
  Future<GetCurrencyModel> executeApiCall(GetCurrencyEvent event) async {
    try {
      final response = await apiService.get(ApiEndPoints.GETCURRENCY);
      return GetCurrencyModel.fromJson(response);
    } on DioException catch (e) {
      throw e.message ?? 'Failed to fetch countries';
    } catch (e) {
      throw 'Unknown error occurred';
    }
  }

  @override
  ApiState<GetCurrencyModel> loadingState() => ApiLoading();

  @override
  ApiState<GetCurrencyModel> successState(GetCurrencyModel response) =>
      ApiSuccess(response);

  @override
  ApiState<GetCurrencyModel> errorState(String error) => ApiFailure(error);
}
