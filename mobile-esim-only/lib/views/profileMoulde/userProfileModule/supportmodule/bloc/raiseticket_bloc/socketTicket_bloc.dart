import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../../../utills/socketservice.dart';
import 'TicketSocketEvent.dart';
import 'TicketSocketState.dart';

class TicketSocketBloc extends Bloc<TicketSocketEvent, TicketSocketState> {
  final _socketService = SocketService();

  TicketSocketBloc() : super(TicketSocketInitial()) {
    on<ConnectSocketEvent>(_onConnectSocket);
    on<JoinTicketRoomEvent>(_onJoinTicketRoom);
    on<LeaveTicketRoomEvent>(_onLeaveTicketRoom);
    on<NewTicketMessageEvent>(_onNewTicketMessage);
    on<DisconnectSocketEvent>(_onDisconnectSocket);
  }

  // Connect to socket server
  Future<void> _onConnectSocket(
    ConnectSocketEvent event,
    Emitter<TicketSocketState> emit,
  ) async {
    print('🔌 Connecting to socket...');
    emit(TicketSocketConnecting());

    try {
      await _socketService.connect();

      await Future.delayed(Duration(milliseconds: 500));

      print('✅ Connected successfully');
      emit(TicketSocketConnected());
    } catch (e) {
      print('❌ Connection failed: $e');
      emit(TicketSocketError('Failed to connect: $e'));
    }
  }

  void _onJoinTicketRoom(
    JoinTicketRoomEvent event,
    Emitter<TicketSocketState> emit,
  ) {
    _socketService.onTicketMessage((callbackfromsocketResponse) {
      print('📨 Received message from socket: $callbackfromsocketResponse');
      if (callbackfromsocketResponse['ticketId'] == null ||
          callbackfromsocketResponse['message'] == null) {
        print('⚠️ Invalid message format, skipping');
        return;
      }
      final messageData = {
        'replyId':
            callbackfromsocketResponse['replyId'] ??
            callbackfromsocketResponse['id'] ??
            'socket_${DateTime.now().millisecondsSinceEpoch}',
        'ticketId': callbackfromsocketResponse['ticketId'],
        'senderType': callbackfromsocketResponse['senderType'] ?? 'admin',
        'message': callbackfromsocketResponse['message'],
        'createdAt':
            callbackfromsocketResponse['createdAt'] ??
            DateTime.now().toIso8601String(),
      };
      add(NewTicketMessageEvent(messageData: messageData));
    });

    // Join the room
    _socketService.joinTicketRoom(event.ticketId);

    emit(TicketSocketJoined(event.ticketId));
  }

  // Leave ticket room
  void _onLeaveTicketRoom(
    LeaveTicketRoomEvent event,
    Emitter<TicketSocketState> emit,
  ) {
    print('🚪 Leaving ticket room: ${event.ticketId}');

    _socketService.leaveTicketRoom(event.ticketId);
    _socketService.offTicketMessage();

    emit(TicketSocketLeft(event.ticketId));
  }

  // Handle new message from socket
  void _onNewTicketMessage(
    NewTicketMessageEvent event,
    Emitter<TicketSocketState> emit,
  ) {
    emit(TicketSocketNewMessage(event.messageData));
  }

  // Disconnect from socket
  void _onDisconnectSocket(
    DisconnectSocketEvent event,
    Emitter<TicketSocketState> emit,
  ) {
    print('🔌 Disconnecting socket');
    _socketService.disconnect();
    emit(TicketSocketDisconnected());
  }

  @override
  Future<void> close() {
    print('🔌 Closing review_blocs and disconnecting socket');
    _socketService.disconnect();
    return super.close();
  }
}
