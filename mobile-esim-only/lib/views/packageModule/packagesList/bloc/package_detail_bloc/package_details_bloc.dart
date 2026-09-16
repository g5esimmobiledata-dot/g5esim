import 'dart:convert';
import 'dart:developer';
import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import 'package:esimconnect/views/packageModule/packagesList/bloc/package_detail_bloc/package_datail_event.dart';
import 'package:esimconnect/views/packageModule/packagesList/model/packageDetailsModel.dart';
import '../../../../../utills/global.dart' as global;

class PackageDetailsBloc
    extends
        ApiBloc<
          PackageDetailsEvent,
          ApiState<PackageDetailsModel>,
          PackageDetailsModel
        > {
  final ApiService apiService;

  PackageDetailsBloc(this.apiService) : super(ApiInitial()) {
    on<PackageDetailsEvent>(_onPackageDetailsEvent);
  }

  Future<void> _onPackageDetailsEvent(
    PackageDetailsEvent event,
    Emitter<ApiState<PackageDetailsModel>> emit,
  ) async {
    await _onFetchPackageDetailsById(event, emit);
  }

  Future<void> _onFetchPackageDetailsById(
    PackageDetailsEvent event,
    Emitter<ApiState<PackageDetailsModel>> emit,
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
  Future<PackageDetailsModel> executeApiCall(PackageDetailsEvent event) async {
    try {
      String url = "${ApiEndPoints.PACKAGE_DETAIL}/${event.packageId}";
      log('Fetching Package Details from URL: $url');
      final response = await apiService.get(
        url,
        query: {'currency': global.activeCurrencyname},
      );
      log('Package Details Response: ${jsonEncode(response)}');
      return PackageDetailsModel.fromJson(response);
    } on DioException catch (e) {
      throw e.message ?? 'Failed to fetch countries';
    } catch (e) {
      throw 'Unknown error occurred';
    }
  }

  @override
  ApiState<PackageDetailsModel> loadingState() => ApiLoading();

  @override
  ApiState<PackageDetailsModel> successState(PackageDetailsModel response) =>
      ApiSuccess(response);

  @override
  ApiState<PackageDetailsModel> errorState(String error) => ApiFailure(error);
}
