import 'dart:convert';
import 'dart:developer';
import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../review_events/submitReviewEvent.dart';
import '../review_models/submitReviewModel.dart';

class Submitreviewbloc
    extends
        ApiBloc<
          Submitreviewevent,
          ApiState<SubmitReviewModel>,
          SubmitReviewModel
        > {
  final ApiService apiService;

  Submitreviewbloc(this.apiService) : super(ApiInitial()) {
    on<Submitreviewevent>(_onFetchTickets);
  }

  Future<void> _onFetchTickets(
    Submitreviewevent event,
    Emitter<ApiState<SubmitReviewModel>> emit,
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
  Future<SubmitReviewModel> executeApiCall(Submitreviewevent event) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userData = prefs.getString('UserProfileData');
      String? id = jsonDecode(userData!)['data']?['id'];
      print("userid:- $id");
      final Map<String, dynamic> data = {
        "packageId": event.packageId,
        "rating": event.rating,
        "title": event.title,
        "comment": event.comment,
        "userId": id,
      };
      log("data i am sending:- $data");
      final url = ApiEndPoints.SUBMIT_REVIEW;
      log('submitreview url is $url');
      final response = await apiService.post(url, data: data);
      log('submitreview Response: ${jsonEncode(response)}');
      return SubmitReviewModel.fromJson(response);
    } on DioException catch (e) {
      throw e.message ?? 'Failed to get submitreview';
    } catch (e) {
      throw 'Unknown error occurred';
    }
  }

  @override
  ApiState<SubmitReviewModel> loadingState() => ApiLoading();

  @override
  ApiState<SubmitReviewModel> successState(SubmitReviewModel response) =>
      ApiSuccess(response);

  @override
  ApiState<SubmitReviewModel> errorState(String error) => ApiFailure(error);
}
