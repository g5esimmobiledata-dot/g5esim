import 'package:esimconnect/core/bloc/api_event.dart';

class GatewayEvent extends ApiEvent {
  final String? userId; // optional
  const GatewayEvent({this.userId});
}
