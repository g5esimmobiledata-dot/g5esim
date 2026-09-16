import 'package:esimconnect/core/bloc/api_event.dart';

class RaiseTicketEvent extends ApiEvent {
  final String title;
  final String subTitle;
  final bool? isfirsttimechat;
  final String? ticketid;
  const RaiseTicketEvent({
    required this.title,
    required this.subTitle,
    this.isfirsttimechat = false,
    this.ticketid,
  });
}
