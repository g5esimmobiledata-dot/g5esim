import 'package:esimconnect/core/bloc/api_event.dart';

class VerifyUser extends ApiEvent {
  final String email;
  final String? otp;
  final bool isLoginUsingFirebase;

  const VerifyUser(this.email, {this.otp, this.isLoginUsingFirebase = false});
}
