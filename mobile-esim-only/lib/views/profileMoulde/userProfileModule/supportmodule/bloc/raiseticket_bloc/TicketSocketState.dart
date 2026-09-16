// lib/views/supportModule/review_blocs/ticket_socket_state.dart

import 'package:flutter/material.dart';

@immutable
abstract class TicketSocketState {}

class TicketSocketInitial extends TicketSocketState {}

class TicketSocketConnecting extends TicketSocketState {}

class TicketSocketConnected extends TicketSocketState {}

class TicketSocketError extends TicketSocketState {
  final String message;
  TicketSocketError(this.message);
}

class TicketSocketJoined extends TicketSocketState {
  final String ticketId;
  TicketSocketJoined(this.ticketId);
}

class TicketSocketLeft extends TicketSocketState {
  final String ticketId;
  TicketSocketLeft(this.ticketId);
}

class TicketSocketNewMessage extends TicketSocketState {
  final Map<String, dynamic> message;
  TicketSocketNewMessage(this.message);
}

class TicketSocketMessagesUpdated extends TicketSocketState {
  final List<Map<String, dynamic>> messages;
  TicketSocketMessagesUpdated(this.messages);
}

class TicketSocketDisconnected extends TicketSocketState {}
