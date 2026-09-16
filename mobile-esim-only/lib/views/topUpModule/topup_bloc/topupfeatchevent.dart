import 'package:esimconnect/core/bloc/api_event.dart';

class TopUpFetchEvent extends ApiEvent {
  String? ccid;
  int? page;
  TopUpFetchEvent({required this.ccid, this.page});
}
