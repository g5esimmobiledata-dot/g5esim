import 'package:esimconnect/core/bloc/api_event.dart';

class FirebaseLoginEvent extends ApiEvent {
  final String email;
  const FirebaseLoginEvent(this.email);
}
