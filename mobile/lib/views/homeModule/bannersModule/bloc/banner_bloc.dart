import 'package:dio/dio.dart';
import 'package:esimconnect/views/homeModule/bannersModule/bloc/banner_event.dart';
import 'package:esimconnect/views/homeModule/bannersModule/model/bannerModel.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';

class BannerBloc
    extends ApiBloc<BannerEvent, ApiState<BannersModel>, BannersModel> {
  final ApiService apiService;

  BannerBloc(this.apiService) : super(ApiInitial()) {
    on<BannerEvent>(_onFetchBanners);
  }

  Future<void> _onFetchBanners(
    BannerEvent event,
    Emitter<ApiState<BannersModel>> emit,
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
  Future<BannersModel> executeApiCall(BannerEvent event) async {
    try {
      final response = await apiService.get(ApiEndPoints.BANNERS);
      // log('Banners Response: ${response.toString()}');
      return BannersModel.fromJson(response);
    } on DioException catch (e) {
      throw e.message ?? 'Failed to fetch banners';
    } catch (e) {
      throw 'Unknown error occurred';
    }
  }

  @override
  ApiState<BannersModel> loadingState() => ApiLoading();

  @override
  ApiState<BannersModel> successState(BannersModel response) =>
      ApiSuccess(response);

  @override
  ApiState<BannersModel> errorState(String error) => ApiFailure(error);
}
