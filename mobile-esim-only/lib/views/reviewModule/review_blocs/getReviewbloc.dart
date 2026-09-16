import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import '../review_events/getReviewEvent.dart';
import '../review_models/getReviewModel.dart';

class Getreviewbloc
    extends ApiBloc<Getreviewevent, ApiState<GetReviewModel>, GetReviewModel> {
  final ApiService apiService;

  Getreviewbloc(this.apiService) : super(ApiInitial()) {
    on<Getreviewevent>(_onFetchTickets);
  }

  Future<void> _onFetchTickets(
    Getreviewevent event,
    Emitter<ApiState<GetReviewModel>> emit,
  ) async {
    emit(loadingState());
    try {
      final result = await executeApiCall(event);
      emit(
        ApiSuccessCustom(
          result,
          packageId: event.packageId,
          orderId: event.orderId,
        ),
      );
    } catch (e) {
      emit(errorState(e.toString()));
    }
  }

  @override
  Future<GetReviewModel> executeApiCall(Getreviewevent event) async {
    try {
      print("getreview:- ${event.packageId}");

      final url = Uri.parse(
        ApiEndPoints.GET_REVIEW,
      ).replace(queryParameters: {"packageId": event.packageId});
      print("url:- $url");
      final response = await apiService.get(url.toString());
      print("resonse:- $response");
      return GetReviewModel.fromJson(response.length == 0 ? {} : response[0]);
    } on DioException catch (e) {
      print("dioException $e");
      throw e.message ?? 'Failed to get getreview';
    } catch (e) {
      print("Exception:-  $e");
      throw 'Unknown error occurred';
    }
  }

  @override
  ApiState<GetReviewModel> loadingState() => ApiLoading();

  // @override
  // ApiState<GetReviewModel> successState(GetReviewModel response) =>
  //     ApiSuccess(response);

  @override
  ApiState<GetReviewModel> errorState(String error) => ApiFailure(error);

  @override
  ApiState<GetReviewModel> successState(GetReviewModel response) {
    throw UnimplementedError();
  }
}

class ApiSuccessCustom<GetReviewModel> extends ApiState<GetReviewModel> {
  @override
  final GetReviewModel data;
  final String? packageId;
  final String? orderId;

  const ApiSuccessCustom(this.data, {this.packageId, this.orderId});
}
