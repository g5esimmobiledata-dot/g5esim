import 'package:esimconnect/core/bloc/api_event.dart';

class ResetPaswdEvent extends ApiEvent {
  final String email;
  final String otp;
  final String newpswd;
  final String cnfmpswd;

  const ResetPaswdEvent({
    required this.email,
    required this.otp,
    required this.newpswd,
    required this.cnfmpswd,
  });
}
