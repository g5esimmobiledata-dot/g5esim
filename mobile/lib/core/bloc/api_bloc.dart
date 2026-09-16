import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';

abstract class ApiBloc<Event, State extends ApiState<Response>, Response>
    extends Bloc<Event, State> {
  ApiBloc(State initialState) : super(initialState);

  Future<Response> executeApiCall(Event event);
  State loadingState();
  State successState(Response response);
  State errorState(String error);
}
