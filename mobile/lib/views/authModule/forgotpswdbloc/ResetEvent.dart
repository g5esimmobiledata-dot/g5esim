import 'package:esimconnect/core/bloc/api_event.dart';

class ResetEvent extends ApiEvent {
  final String email;
  const ResetEvent(this.email);
}
