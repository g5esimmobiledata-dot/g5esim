// lib/views/supportModule/review_blocs/ticket_socket_event.dart

import 'package:flutter/material.dart';

@immutable
abstract class TicketSocketEvent {}

class ConnectSocketEvent extends TicketSocketEvent {}

class JoinTicketRoomEvent extends TicketSocketEvent {
  final String ticketId;
  JoinTicketRoomEvent(this.ticketId);
}

class LeaveTicketRoomEvent extends TicketSocketEvent {
  final String ticketId;
  LeaveTicketRoomEvent(this.ticketId);
}

class NewTicketMessageEvent extends TicketSocketEvent {
  final Map<String, dynamic> messageData;
  NewTicketMessageEvent({required this.messageData});
}

class AddMessageEvent extends TicketSocketEvent {
  final Map<String, dynamic> message;
  AddMessageEvent({required this.message});
}

class DisconnectSocketEvent extends TicketSocketEvent {}
