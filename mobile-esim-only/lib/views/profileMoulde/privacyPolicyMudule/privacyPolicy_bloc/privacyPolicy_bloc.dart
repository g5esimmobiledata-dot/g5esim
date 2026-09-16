import 'package:dio/dio.dart';
import 'package:esimconnect/views/profileMoulde/privacyPolicyMudule/Model/privacyPolicyModel.dart';
import 'package:esimconnect/views/profileMoulde/privacyPolicyMudule/privacyPolicy_bloc/privacyPolicy_event.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';

class PrivacypolicyBloc
    extends
        ApiBloc<
          PrivacyPolicyEvent,
          ApiState<PrivacyPolicyModel>,
          PrivacyPolicyModel
        > {
  final ApiService apiService;

  PrivacypolicyBloc(this.apiService) : super(ApiInitial()) {
    on<PrivacyPolicyEvent>(_onFetchPackageList);
  }

  Future<void> _onFetchPackageList(
    PrivacyPolicyEvent event,
    Emitter<ApiState<PrivacyPolicyModel>> emit,
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
  Future<PrivacyPolicyModel> executeApiCall(PrivacyPolicyEvent event) async {
    try {
      final response = await apiService.get(
        ApiEndPoints.PRIVACY_TREMSANDCONDITION,
      );
      return PrivacyPolicyModel.fromJson(response);
    } on DioException catch (e) {
      throw e.message ?? 'Failed to fetch countries';
    } catch (e) {
      throw 'Unknown error occurred';
    }
  }

  @override
  ApiState<PrivacyPolicyModel> loadingState() => ApiLoading();

  @override
  ApiState<PrivacyPolicyModel> successState(PrivacyPolicyModel response) =>
      ApiSuccess(response);

  @override
  ApiState<PrivacyPolicyModel> errorState(String error) => ApiFailure(error);
}
