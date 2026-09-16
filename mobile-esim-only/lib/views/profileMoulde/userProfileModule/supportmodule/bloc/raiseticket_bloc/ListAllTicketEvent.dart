import 'package:esimconnect/core/bloc/api_event.dart';

class ListTicketEvent extends ApiEvent {
  final String? ticketid;
  const ListTicketEvent({this.ticketid});
}
