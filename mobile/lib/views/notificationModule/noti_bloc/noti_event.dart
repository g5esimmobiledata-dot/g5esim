import 'package:esimconnect/core/bloc/api_event.dart';

class fetchNotiEvent extends ApiEvent {
  final bool? isAllread;
  final String? url;
  final String? page;
  const fetchNotiEvent({this.isAllread, this.url, this.page});
}
