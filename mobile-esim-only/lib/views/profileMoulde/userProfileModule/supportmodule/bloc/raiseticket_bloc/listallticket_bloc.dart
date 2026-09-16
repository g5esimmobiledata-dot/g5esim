import 'dart:developer';
import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import '../../model/ListTicketModel.dart';
import 'ListAllTicketEvent.dart';

class ListallticketBloc
    extends
        ApiBloc<ListTicketEvent, ApiState<ListTicketsModel>, ListTicketsModel> {
  final ApiService apiService;

  ListallticketBloc(this.apiService) : super(ApiInitial()) {
    on<ListTicketEvent>(_onFetchTickets);
  }

  Future<void> _onFetchTickets(
    ListTicketEvent event,
    Emitter<ApiState<ListTicketsModel>> emit,
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
  Future<ListTicketsModel> executeApiCall(ListTicketEvent event) async {
    try {
      final url = '${ApiEndPoints.GET_TICKETS}/${event.ticketid}/replies';
      log('url is $url');
      final response = await apiService.get(url);
      return ListTicketsModel.fromJson(response);
    } on DioException catch (e) {
      throw e.message ?? 'Failed to get ticketsList';
    } catch (e) {
      throw 'Unknown error occurred';
    }
  }

  @override
  ApiState<ListTicketsModel> loadingState() => ApiLoading();

  @override
  ApiState<ListTicketsModel> successState(ListTicketsModel response) =>
      ApiSuccess(response);

  @override
  ApiState<ListTicketsModel> errorState(String error) => ApiFailure(error);
}
