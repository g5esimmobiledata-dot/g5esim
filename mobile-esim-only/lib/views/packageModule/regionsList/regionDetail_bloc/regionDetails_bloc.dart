import 'package:dio/dio.dart';
import 'package:esimconnect/utills/global.dart' as global;
import 'package:esimconnect/views/packageModule/regionsList/model/regionDetailsModel.dart';
import 'package:esimconnect/views/packageModule/regionsList/regionDetail_bloc/regionDetails_event.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';

class RegionDatailsBloc
    extends
        ApiBloc<
          RegionsDetailsEvent,
          ApiState<RegionDetailsModel>,
          RegionDetailsModel
        > {
  final ApiService apiService;

  RegionDatailsBloc(this.apiService) : super(ApiInitial()) {
    on<RegionsDetailsEvent>(_onFetchRegionsList);
  }

  Future<void> _onFetchRegionsList(
    RegionsDetailsEvent event,
    Emitter<ApiState<RegionDetailsModel>> emit,
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
  Future<RegionDetailsModel> executeApiCall(RegionsDetailsEvent event) async {
    final String url =
        event.url ?? '${ApiEndPoints.REGIONLIST}/${event.regionId}';
    Map<String, dynamic> parameterbody = {
      "currency": global.activeCurrencyname,
    };
    if (event.page != null) {
      parameterbody['page'] = event.page;
    }
    if (event.limit != null) {
      parameterbody['limit'] = event.limit;
    } else {
      parameterbody['limit'] = 5; // Default limit
    }
    if (event.isUnlimited != null) {
      parameterbody['isUnlimited'] = event.isUnlimited;
    }
    if (event.dataPack != null) {
      parameterbody['dataPack'] = event.dataPack;
    }
    if (event.isLowToHigh != null) {
      parameterbody['sort'] = event.isLowToHigh!
          ? 'priceLowToHigh'
          : 'priceHighToLow';
    }
    if (event.isHighToLow != null) {
      parameterbody['sort'] = event.isHighToLow!
          ? 'priceHighToLow'
          : 'priceLowToHigh';
    }
    // log('region details url is $url');
    // log('query is $parameterbody');
    try {
      final response = await apiService.get(url, query: parameterbody);
      // log('Region Details Response: ${jsonEncode(response)}');
      return RegionDetailsModel.fromJson(response);
    } on DioException catch (e) {
      throw e.message ?? 'Failed to fetch Regions';
    } catch (e) {
      throw 'Unknown error occurred';
    }
  }

  @override
  ApiState<RegionDetailsModel> loadingState() => ApiLoading();

  @override
  ApiState<RegionDetailsModel> successState(RegionDetailsModel response) =>
      ApiSuccess(response);

  @override
  ApiState<RegionDetailsModel> errorState(String error) => ApiFailure(error);
}
