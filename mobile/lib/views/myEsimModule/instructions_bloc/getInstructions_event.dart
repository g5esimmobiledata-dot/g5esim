import 'package:esimconnect/core/bloc/api_event.dart';

class GetESimInstructionsEvent extends ApiEvent {
  final String? esimId;
  final String? iccid;

  const GetESimInstructionsEvent({this.esimId, this.iccid});
}
