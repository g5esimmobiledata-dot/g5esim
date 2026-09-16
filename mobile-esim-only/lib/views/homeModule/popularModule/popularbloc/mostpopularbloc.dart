import 'dart:async';
import 'package:dio/dio.dart';
import 'package:esimconnect/core/bloc/api_event.dart';
import 'package:esimconnect/utills/connectivity/connectivity_bloc.dart';
import 'package:esimconnect/utills/global.dart' as global;
import 'package:esimconnect/views/homeModule/popularModule/model/mostpopularModel.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';

class MostPopularbloc
    extends
        ApiBloc<
          popularEvent,
          ApiState<MostPopularListModel>,
          MostPopularListModel
        > {
  final ApiService apiService;
  final ConnectivityBloc _connectivityBloc;
  late StreamSubscription connectivitySubscription;

  MostPopularbloc(this.apiService, this._connectivityBloc)
    : super(ApiInitial()) {
    on<popularEvent>(_onFetchPackageList);

    connectivitySubscription = _connectivityBloc.stream.listen((state) {
      if (state is Connected) {
        add(popularEvent(is_popular: '1'));
      }
    });
  }

  Future<void> _onFetchPackageList(
    popularEvent event,
    Emitter<ApiState<MostPopularListModel>> emit,
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
  Future<MostPopularListModel> executeApiCall(popularEvent event) async {
    Map<String, dynamic> parameterbody = {"isPopular": true};
    // bool isEnabled = await InAppPurchaseUtils.getInAppBillingStatus();
    // if (isEnabled) {
    //   parameterbody['fromApp'] = Platform.isAndroid ? 'android' : 'ios';
    // }
    try {
      final url = ApiEndPoints.PACKAGE_DETAIL;
      final response = await apiService.get(url, query: parameterbody);
      final popularModel = MostPopularListModel.fromJson(response);

      if (popularModel.data?.data?.isNotEmpty == true) {
        return popularModel;
      }

      final fallbackResponse = await apiService.get(
        url,
        query: {
          'page': 1,
          'limit': 10,
          'currency': global.activeCurrencyname ?? 'USD',
        },
      );
      return MostPopularListModel.fromJson(fallbackResponse);
    } on DioException catch (e) {
      throw e.message ?? 'Failed to fetch mostpopularList';
    } catch (e) {
      throw 'Unknown error occurred';
    }
  }

  @override
  ApiState<MostPopularListModel> loadingState() => ApiLoading();

  @override
  ApiState<MostPopularListModel> successState(MostPopularListModel response) =>
      ApiSuccess(response);

  @override
  ApiState<MostPopularListModel> errorState(String error) => ApiFailure(error);
}

class popularEvent extends ApiEvent {
  String? is_popular;
  popularEvent({this.is_popular = "0"});
}
