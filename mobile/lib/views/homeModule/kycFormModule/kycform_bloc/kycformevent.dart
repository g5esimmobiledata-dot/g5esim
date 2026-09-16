import 'package:esimconnect/core/bloc/api_event.dart';

class KycFormEvent extends ApiEvent {
  final String documentType;
  final String document;
  const KycFormEvent({required this.documentType, required this.document});
}
