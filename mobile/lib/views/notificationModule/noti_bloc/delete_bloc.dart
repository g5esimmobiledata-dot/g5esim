import 'package:dio/dio.dart';
import 'package:esimconnect/views/notificationModule/model/DeleteModel.dart';
import 'package:esimconnect/views/notificationModule/noti_bloc/delete_event.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';

class DeleteBloc
    extends ApiBloc<deleteEvent, ApiState<DeleteModel>, DeleteModel> {
  final ApiService apiService;

  DeleteBloc(this.apiService) : super(ApiInitial()) {
    on<deleteEvent>(_onfetchnotiDetails);
  }

  Future<void> _onfetchnotiDetails(
    deleteEvent event,
    Emitter<ApiState<DeleteModel>> emit,
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
  Future<DeleteModel> executeApiCall(deleteEvent event) async {
    try {
      final url = ApiEndPoints.NOTIFICATION_DELETE;
      final response = await apiService.delete(url);
      // log('delete noti response is ${jsonEncode(response)}');
      return DeleteModel.fromJson(response);
    } on DioException catch (e) {
      throw e.message ?? 'Failed to fetch NOTIFICATIONList';
    } catch (e) {
      throw 'Unknown error occurred ${e.toString()}';
    }
  }

  @override
  ApiState<DeleteModel> loadingState() => ApiLoading();

  @override
  ApiState<DeleteModel> successState(DeleteModel response) =>
      ApiSuccess(response);

  @override
  ApiState<DeleteModel> errorState(String error) => ApiFailure(error);
}
