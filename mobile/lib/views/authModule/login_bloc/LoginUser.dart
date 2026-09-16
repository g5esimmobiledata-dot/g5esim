import 'package:esimconnect/core/bloc/api_event.dart';

class LoginUser extends ApiEvent {
  final String email;
  const LoginUser(this.email);
}
