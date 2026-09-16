import 'package:esimconnect/core/bloc/api_event.dart';

class RazorpayEvent extends ApiEvent {
  dynamic esimOrderId;
  dynamic code;

  RazorpayEvent({required this.esimOrderId, required this.code});
}
