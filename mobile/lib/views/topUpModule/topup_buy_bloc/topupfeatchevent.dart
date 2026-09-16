import 'package:esimconnect/core/bloc/api_event.dart';

class TopUpOrderFetchEvent extends ApiEvent {
  String packageid;
  String iccid;
  TopUpOrderFetchEvent({required this.packageid, required this.iccid});
}
