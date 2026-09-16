import 'package:esimconnect/utills/config.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'dart:developer' as developer;

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  IO.Socket? _socket;
  bool _isConnected = false;
  Function(Map<String, dynamic>)? _onTicketMessageCallback;

  // Connect to socket
  Future<void> connect() async {
    developer.log('🔌 Connecting to socket...');
    try {
      _socket = IO.io(
        socketbaseUrl,
        IO.OptionBuilder()
            .setTransports(['websocket'])
            .enableAutoConnect()
            .enableReconnection()
            .setReconnectionDelay(1000)
            .setReconnectionAttempts(5)
            .build(),
      );

      _setupEventListeners();
      _socket!.connect();

      developer.log('🔌 Connection initiated');
    } catch (e) {
      developer.log('❌ Connection error: $e');
      _isConnected = false;
    }
  }

  void _setupEventListeners() {
    if (_socket == null) return;

    _socket!.onConnect((_) {
      developer.log('✅ Connected successfully');
      _isConnected = true;
    });

    _socket!.onDisconnect((reason) {
      developer.log('🔌 Disconnected: $reason');
      _isConnected = false;
    });

    // Listen for ticket messages
    _socket!.on('ticket_message', (data) {
      developer.log('📨 Received ticket_message: $data');
      try {
        Map<String, dynamic> messageData;

        if (data is Map<String, dynamic>) {
          messageData = data;
        } else if (data is List && data.isNotEmpty) {
          messageData = data[0] as Map<String, dynamic>;
        } else {
          developer.log('❌ Invalid data format');
          return;
        }

        developer.log('📨 Parsed message: $messageData');

        // Trigger callback
        if (_onTicketMessageCallback != null) {
          _onTicketMessageCallback!(messageData);
        }
      } catch (e) {
        developer.log('❌ Failed to parse message: $e');
      }
    });
  }

  // Join ticket room
  void joinTicketRoom(String ticketId) {
    if (_socket != null && _isConnected) {
      developer.log('🚪 Joining room: $ticketId');
      _socket!.emit('join_ticket', {'ticketId': ticketId});
    }
  }

  // Leave ticket room
  void leaveTicketRoom(String ticketId) {
    if (_socket != null && _isConnected) {
      developer.log('🚪 Leaving room: $ticketId');
      _socket!.emit('leave_ticket', {'ticketId': ticketId});
    }
  }

  // Set message callback
  void onTicketMessage(Function(Map<String, dynamic>) callback) {
    developer.log('👂 Setting message listener');
    _onTicketMessageCallback = callback;
  }

  // Remove listener
  void offTicketMessage() {
    _onTicketMessageCallback = null;
    _socket?.off('ticket_message');
  }

  // Getters
  bool get isConnected => _isConnected;

  // Disconnect
  void disconnect() {
    developer.log('🔌 Disconnecting...');
    _socket?.disconnect();
    _socket = null;
    _isConnected = false;
    _onTicketMessageCallback = null;
  }
}
