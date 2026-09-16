import 'package:esimconnect/core/bloc/api_event.dart';

class fetchOrderhistoryEvent extends ApiEvent {
  final String? url;
  final String? page;
  const fetchOrderhistoryEvent({this.url, this.page});
}
