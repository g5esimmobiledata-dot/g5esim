import 'dart:convert';
import 'dart:developer';
import 'package:dio/dio.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/supportmodule/bloc/raiseticket_bloc/raiseticket_event.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/supportmodule/model/raiseTicketModel.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';

class RaiseTicketsBloc
    extends
        ApiBloc<
          RaiseTicketEvent,
          ApiState<RaiseTicketModel>,
          RaiseTicketModel
        > {
  final ApiService apiService;

  RaiseTicketsBloc(this.apiService) : super(ApiInitial()) {
    on<RaiseTicketEvent>(_onFetchTickets);
  }

  Future<void> _onFetchTickets(
    RaiseTicketEvent event,
    Emitter<ApiState<RaiseTicketModel>> emit,
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
  Future<RaiseTicketModel> executeApiCall(RaiseTicketEvent event) async {
    try {
      if (event.isfirsttimechat == true || event.ticketid == null) {
        final Map<String, dynamic> data = {
          "title": event.title,
          "description": event.subTitle,
          "message": event.subTitle,
          "priority": "medium",
        };
        final response = await apiService.post(
          ApiEndPoints.GET_TICKETS,
          data: data,
        );
        log('Create Ticket Response: ${jsonEncode(response)}');
        return RaiseTicketModel.fromJson(response);
      }

      final Map<String, dynamic> data = {"message": event.subTitle};
      final url = '${ApiEndPoints.GET_TICKETS}/${event.ticketid}/reply';
      log('RaiseTicket url is $url');
      final response = await apiService.post(url, data: data);
      log('Raise Ticket Response: ${jsonEncode(response)}');
      return RaiseTicketModel.fromJson(response);
    } on DioException catch (e) {
      throw e.message ?? 'Failed to get ticketsList';
    } catch (e) {
      throw 'Unknown error occurred';
    }
  }

  @override
  ApiState<RaiseTicketModel> loadingState() => ApiLoading();

  @override
  ApiState<RaiseTicketModel> successState(RaiseTicketModel response) =>
      ApiSuccess(response);

  @override
  ApiState<RaiseTicketModel> errorState(String error) => ApiFailure(error);
}
