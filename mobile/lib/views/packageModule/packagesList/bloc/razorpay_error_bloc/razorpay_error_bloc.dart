import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import 'razorpay_error_event.dart';
import 'razorpyamodel.dart';

class RazorpayErrorBloc
    extends ApiBloc<RazorpayEvent, ApiState<RazorpayModel>, RazorpayModel> {
  final ApiService apiService;

  RazorpayErrorBloc(this.apiService) : super(ApiInitial()) {
    on<RazorpayEvent>(_onPaymentVerified);
  }

  Future<void> _onPaymentVerified(
    RazorpayEvent event,
    Emitter<ApiState<RazorpayModel>> emit,
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
  Future<RazorpayModel> executeApiCall(RazorpayEvent event) async {
    try {
      final response = await apiService.post(
        ApiEndPoints.PAYMENTCANCELED,
        data: {
          "esim_order_id": event.esimOrderId.toString(),
          "code": event.code,
        },
      );
      return RazorpayModel.fromJson(response);
    } on DioException catch (e) {
      throw e.message ?? 'Failed to fetch _onPaymentVerified';
    } catch (e) {
      throw 'Unknown error occurred';
    }
  }

  @override
  ApiState<RazorpayModel> loadingState() => ApiLoading();

  @override
  ApiState<RazorpayModel> successState(RazorpayModel response) =>
      ApiSuccess(response);

  @override
  ApiState<RazorpayModel> errorState(String error) => ApiFailure(error);
}
