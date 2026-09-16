import 'dart:developer';
import 'package:dio/dio.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import 'package:esimconnect/views/packageModule/packagesList/bloc/package_List_bloc/packageList_event.dart';
import 'package:esimconnect/views/packageModule/packagesList/model/packageListModel.dart';
import 'package:esimconnect/utills/global.dart' as global;

class PackagelistBloc
    extends
        ApiBloc<
          PackagelistEvent,
          ApiState<PackagesListModel>,
          PackagesListModel
        > {
  final ApiService apiService;

  PackagelistBloc(this.apiService) : super(ApiInitial()) {
    on<PackagelistEvent>(_onFetchPackageList);
  }

  Future<void> _onFetchPackageList(
    PackagelistEvent event,
    Emitter<ApiState<PackagesListModel>> emit,
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
  Future<PackagesListModel> executeApiCall(PackagelistEvent event) async {
    try {
      final String url =
          event.url ?? '${ApiEndPoints.PACKAGELIST}/${event.countrycode}';

      Map<String, dynamic> queryParams = {
        "currency": global.activeCurrencyname,
      };
      if (event.page != null) {
        queryParams['page'] = event.page;
      }
      if (event.limit != null) {
        queryParams['limit'] = event.limit;
      } else {
        queryParams['limit'] = 5; // Default limit
      }
      if (event.isUnlimited != null) {
        queryParams['isUnlimited'] = event.isUnlimited;
      } else {
        log('isUnlimited is null');
      }
      if (event.dataPack != null) {
        queryParams['dataPack'] = event.dataPack;
      }
      if (event.isLowToHigh != null) {
        queryParams['sort'] = event.isLowToHigh!
            ? 'priceLowToHigh'
            : 'priceHighToLow';
      }
      if (event.isHighToLow != null) {
        queryParams['sort'] = event.isHighToLow!
            ? 'priceHighToLow'
            : 'priceLowToHigh';
      }
      log('query is $queryParams');
      final response = await apiService.get(url, query: queryParams);
      // log('packagelist response is ${jsonEncode(response)}');
      return PackagesListModel.fromJson(response);
    } on DioException catch (e) {
      throw e.message ?? 'Failed to fetch packages';
    } catch (e) {
      throw 'Unknown error occurred: ${e.toString()}';
    }
  }

  @override
  ApiState<PackagesListModel> loadingState() => ApiLoading();

  @override
  ApiState<PackagesListModel> successState(PackagesListModel response) =>
      ApiSuccess(response);

  @override
  ApiState<PackagesListModel> errorState(String error) => ApiFailure(error);
}
