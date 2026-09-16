import 'package:esimconnect/core/bloc/api_event.dart';

class PswdEvent extends ApiEvent {
  final String pswd;
  final String cPswd;
  final String id;

  const PswdEvent({required this.pswd, required this.cPswd, required this.id});
}
