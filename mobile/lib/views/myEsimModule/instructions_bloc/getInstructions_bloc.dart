import 'package:dio/dio.dart';
import 'package:esimconnect/views/myEsimModule/instructions_bloc/getInstructions_event.dart';
import 'package:esimconnect/views/myEsimModule/model/getInstructionsModel.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';

class GetESimInstructionsBloc
    extends
        ApiBloc<
          GetESimInstructionsEvent,
          ApiState<ESimInstructionsModel>,
          ESimInstructionsModel
        > {
  final ApiService apiService;

  GetESimInstructionsBloc(this.apiService) : super(ApiInitial()) {
    on<GetESimInstructionsEvent>(_onfetchEsimInstructions);
  }

  Future<void> _onfetchEsimInstructions(
    GetESimInstructionsEvent event,
    Emitter<ApiState<ESimInstructionsModel>> emit,
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
  Future<ESimInstructionsModel> executeApiCall(
    GetESimInstructionsEvent event,
  ) async {
    final candidates = <String>{
      if ((event.esimId ?? '').trim().isNotEmpty) event.esimId!.trim(),
      if ((event.iccid ?? '').trim().isNotEmpty) event.iccid!.trim(),
    }.toList();

    if (candidates.isEmpty) {
      throw 'No valid eSIM identifier found';
    }

    DioException? lastDioError;

    for (var index = 0; index < candidates.length; index++) {
      final identifier = candidates[index];
      final url =
          '${ApiEndPoints.GETESIM_INSTRUCTIONS}/$identifier/instructions';
      try {
        final response = await apiService.get(url);
        return ESimInstructionsModel.fromJson(response);
      } on DioException catch (e) {
        lastDioError = e;
        if (index < candidates.length - 1) {
          continue;
        }
        throw e.message ?? 'Failed to fetch instructions';
      } catch (e) {
        throw 'Unknown error occurred ${e.toString()}';
      }
    }

    throw lastDioError?.message ?? 'Failed to fetch instructions';
  }

  @override
  ApiState<ESimInstructionsModel> loadingState() => ApiLoading();

  @override
  ApiState<ESimInstructionsModel> successState(
    ESimInstructionsModel response,
  ) => ApiSuccess(response);

  @override
  ApiState<ESimInstructionsModel> errorState(String error) => ApiFailure(error);
}
