import 'package:esimconnect/core/bloc/api_event.dart';

class LoginPswdEvent extends ApiEvent {
  final String email;
  final String password;

  const LoginPswdEvent({required this.email, required this.password});
}
