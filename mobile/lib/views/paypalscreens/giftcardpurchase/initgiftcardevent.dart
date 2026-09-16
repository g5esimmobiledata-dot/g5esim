import 'package:esimconnect/core/bloc/api_event.dart';

class Initgiftcardevent extends ApiEvent {
  final String amount;
  final String currency;
  final String email;
  final String gatewayId;
  String message;
  String name;
  String recipientEmail;
  String recipientName;
  Initgiftcardevent({
    required this.amount,
    required this.currency,
    required this.email,
    required this.gatewayId,
    required this.message,
    required this.name,
    required this.recipientEmail,
    required this.recipientName,
  });
}
