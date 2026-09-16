import 'dart:async';
import 'dart:developer';
import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/utills/global.dart' as global;
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get/get.dart';
import 'package:sizer/sizer.dart';
import '../../../../navbarModule/bloc/navbar_bloc.dart';
import '../../profile_bloc/userprofile_bloc.dart';
import '../../profile_bloc/userprofile_event.dart';
import '../bloc/raiseticket_bloc/ListAllTicketEvent.dart';
import '../bloc/raiseticket_bloc/TicketSocketEvent.dart';
import '../bloc/raiseticket_bloc/TicketSocketState.dart';
import '../bloc/raiseticket_bloc/listallticket_bloc.dart';
import '../bloc/raiseticket_bloc/raiseticket_bloc.dart';
import '../bloc/raiseticket_bloc/raiseticket_event.dart';
import '../bloc/raiseticket_bloc/socketTicket_bloc.dart';
import '../bloc/tickets_bloc/ticket_bloc.dart';
import '../bloc/tickets_bloc/ticket_event.dart';
import '../model/ListTicketModel.dart';
import '../model/raiseTicketModel.dart';
import 'MessageBubble.dart';
import 'messageinputcard.dart';

class SupportChatScreen extends StatefulWidget {
  final String? ticketId;
  final bool istileRequired;
  final String? initialTitle;

  const SupportChatScreen({
    super.key,
    this.ticketId,
    this.istileRequired = false,
    this.initialTitle,
  });

  @override
  State<SupportChatScreen> createState() => _SupportChatScreenState();
}

class _SupportChatScreenState extends State<SupportChatScreen> {
  final _subtitleController = TextEditingController();
  final _titleController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  List<Map<String, dynamic>> _liveMessages = [];
  bool isSocketConnected = false;

  @override
  void initState() {
    super.initState();
    global.isInSupportScreen = true;
    if (widget.initialTitle?.trim().isNotEmpty == true) {
      _titleController.text = widget.initialTitle!.trim();
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (widget.ticketId != null) {
        context.read<ListallticketBloc>().add(
          ListTicketEvent(ticketid: widget.ticketId!),
        );
        _setupSocketConnection();
      }
    });
  }

  void _setupSocketConnection() {
    context.read<TicketSocketBloc>().add(ConnectSocketEvent());

    Future.delayed(Duration(milliseconds: 1000), () {
      if (mounted) {
        context.read<TicketSocketBloc>().add(
          JoinTicketRoomEvent(widget.ticketId!),
        );
      }
    });
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _sendReply() {
    if (_subtitleController.text.trim().isEmpty) {
      global.showToastMessage(message: tr("Please enter a message"));
      return;
    }

    if (widget.istileRequired && _titleController.text.trim().isEmpty) {
      global.showToastMessage(message: tr("Please enter a title"));
      return;
    }

    final messageText = _subtitleController.text.trim();

    // Send via API
    context.read<RaiseTicketsBloc>().add(
      RaiseTicketEvent(
        ticketid: widget.ticketId,
        title: widget.istileRequired
            ? _titleController.text.trim()
            : "Ticket Reply",
        subTitle: messageText,
        isfirsttimechat: widget.istileRequired,
      ),
    );

    final userMessage = <String, dynamic>{
      'id': 'temp_${DateTime.now().millisecondsSinceEpoch}',
      'replyId': 'temp_${DateTime.now().millisecondsSinceEpoch}',
      'ticketId': widget.ticketId,
      'senderType': 'user',
      'senderName': 'You',
      'message': messageText,
      'createdAt': DateTime.now().toIso8601String(),
      'isTemp': true,
    };

    setState(() {
      _liveMessages.add(userMessage);
    });

    _subtitleController.clear();
    _scrollToBottom();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _subtitleController.dispose();
    _titleController.dispose();
    global.isInSupportScreen = false;

    if (widget.ticketId != null) {
      context.read<TicketSocketBloc>().add(
        LeaveTicketRoomEvent(widget.ticketId!),
      );
    }

    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MultiBlocListener(
      listeners: [
        BlocListener<TicketSocketBloc, TicketSocketState>(
          listener: (context, state) {
            if (state is TicketSocketNewMessage) {
              print('📨 New socket message received: ${state.message}');
              final messageData = state.message;

              // Log the sender type for debugging
              print('🔍 Sender type from socket: ${messageData['senderType']}');

              // Check for duplicates
              final exists = _liveMessages.any(
                (msg) =>
                    msg['replyId'] == messageData['replyId'] ||
                    (msg['message'] == messageData['message'] &&
                        msg['senderType'] == messageData['senderType'] &&
                        !msg.containsKey('isTemp')),
              );

              if (!exists) {
                setState(() {
                  if (messageData['senderType']?.toLowerCase() == 'user') {
                    _liveMessages.removeWhere(
                      (msg) =>
                          msg['isTemp'] == true &&
                          msg['message'] == messageData['message'],
                    );
                  }

                  // Add new message with correct sender type
                  _liveMessages.add(<String, dynamic>{
                    'id': messageData['replyId'],
                    'replyId': messageData['replyId'],
                    'ticketId': messageData['ticketId'],
                    'senderType': messageData['senderType'],
                    'message': messageData['message'],
                    'createdAt': messageData['createdAt'],
                    'senderName':
                        messageData['senderType']?.toLowerCase() == 'admin'
                        ? 'Support'
                        : 'You',
                  });
                  // Sort oldest → newest
                  _liveMessages.sort((a, b) {
                    final dateA = _parseDate(a['createdAt']);
                    final dateB = _parseDate(b['createdAt']);
                    log('dateA: $dateA, dateB: $dateB');
                    return dateA.compareTo(dateB);
                  });
                });

                _scrollToBottom();
              } else {
                print('⚠️ Duplicate message, skipping');
              }
            } else if (state is TicketSocketConnected) {
              setState(() {
                isSocketConnected = true;
              });
            } else if (state is TicketSocketDisconnected) {
              setState(() {
                isSocketConnected = false;
              });
            }
          },
        ),

        BlocListener<ListallticketBloc, ApiState<ListTicketsModel>>(
          listener: (context, state) {
            if (state is ApiSuccess) {
              final apiMessages =
                  state.data?.data
                      ?.map(
                        (reply) => <String, dynamic>{
                          'id': reply.id?.toString() ?? '',
                          'replyId': reply.id?.toString() ?? '',
                          'ticketId': reply.ticketId?.toString() ?? '',
                          'senderType': reply.senderType ?? 'unknown',
                          'message': reply.message ?? '',
                          'createdAt':
                              reply.createdAt ??
                              DateTime.now().toIso8601String(),
                          'senderName':
                              reply.senderName ??
                              (reply.senderType?.toLowerCase() == 'user'
                                  ? 'You'
                                  : 'Support'),
                        },
                      )
                      .toList() ??
                  <Map<String, dynamic>>[];

              setState(() {
                _liveMessages = apiMessages;
              });

              _scrollToBottom();
            }
          },
        ),

        BlocListener<RaiseTicketsBloc, ApiState<RaiseTicketModel>>(
          listener: (context, state) {
            if (state is ApiSuccess) {
              setState(() {
                _liveMessages.removeWhere((msg) => msg['isTemp'] == true);
              });

              if (widget.ticketId != null) {
                context.read<ListallticketBloc>().add(
                  ListTicketEvent(ticketid: widget.ticketId!),
                );
              }

              context.read<TicketsBloc>().add(TicketEvent());
            }

            if (state is ApiFailure) {
              global.showToastMessage(message: state.error!);

              setState(() {
                final tempIndex = _liveMessages.indexWhere(
                  (msg) => msg['isTemp'] == true,
                );
                if (tempIndex != -1) {
                  _liveMessages[tempIndex]['isFailed'] = true;
                }
              });
            }
          },
        ),
      ],
      child: SafeArea(
        child: Scaffold(
          appBar: AppBar(
            leading: IconButton(
              icon: const Icon(Icons.arrow_back_ios_new_outlined),
              onPressed: () {
                context.read<UserProfileBloc>().add(UserProfileEvent());
                Get.back();
                Get.find<BottomNavController>().jumpToTab(0);
              },
            ),
            title: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.ticketId != null
                      ? 'Support Ticket'
                      : 'Create New Ticket',
                  style: Theme.of(context).textTheme.bodyLarge!.copyWith(
                    fontWeight: FontWeight.normal,
                    fontSize: 17.sp,
                    color: AppColors.whiteColor,
                  ),
                ).tr(),
                if (widget.ticketId != null)
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: isSocketConnected
                              ? Colors.greenAccent
                              : AppColors.greyColor,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        isSocketConnected ? 'Online' : 'Connecting...',
                        style: Theme.of(context).textTheme.bodySmall!.copyWith(
                          fontSize: 11.sp,
                          color: AppColors.whiteColor.withOpacity(0.75),
                        ),
                      ).tr(),
                    ],
                  ),
              ],
            ),
            // actions: [
            //   Padding(
            //     padding: EdgeInsets.only(right: 12.0),
            //     child: Container(
            //       padding: EdgeInsets.all(6),
            //       decoration: BoxDecoration(
            //         shape: BoxShape.circle,
            //         color: isSocketConnected
            //             ? Colors.green.shade100
            //             : Colors.red.shade100,
            //       ),
            //       child: Icon(
            //         isSocketConnected ? Icons.wifi : Icons.wifi_off,
            //         color: isSocketConnected ? Colors.green : Colors.red,
            //         size: 18,
            //       ),
            //     ),
            //   ),
            // ],
          ),
          body: Column(
            children: [
              if (widget.ticketId != null)
                Expanded(child: _buildMessagesList()),

              if (widget.istileRequired)
                Expanded(
                  child: SingleChildScrollView(
                    padding: EdgeInsets.all(20),
                    child: Container(
                      padding: EdgeInsets.all(15),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.blue.shade100),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                Icons.info_outline,
                                color: Colors.blue.shade700,
                              ),
                              SizedBox(width: 10),
                              Text(
                                "Create New Ticket",
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.normal,
                                  color: Colors.blue.shade800,
                                ),
                              ).tr(),
                            ],
                          ),
                          SizedBox(height: 10),
                          Text(
                            "Please provide description of your issue.",
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey.shade700,
                            ),
                          ).tr(),
                        ],
                      ),
                    ),
                  ),
                ),

              MessageInput(
                subTitleController: _subtitleController,
                titleController: _titleController,
                onSend: _sendReply,
                canSend: true,
                istitleRequired: widget.istileRequired,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMessagesList() {
    return BlocBuilder<ListallticketBloc, ApiState<ListTicketsModel>>(
      builder: (context, state) {
        if (state is ApiLoading && _liveMessages.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                CircularProgressIndicator(),
                SizedBox(height: 16),
                Text(
                  "Loading messages...",
                  style: TextStyle(color: Colors.grey),
                ).tr(),
              ],
            ),
          );
        }

        if (state is ApiFailure && _liveMessages.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.error_outline, color: Colors.red, size: 50),
                SizedBox(height: 16),
                Text(
                  "Failed to load messages",
                  style: TextStyle(color: Colors.red),
                ).tr(),
                SizedBox(height: 8),
                ElevatedButton(
                  onPressed: () {
                    context.read<ListallticketBloc>().add(
                      ListTicketEvent(ticketid: widget.ticketId!),
                    );
                  },
                  child: Text("Retry").tr(),
                ),
              ],
            ),
          );
        }

        return ListView.builder(
          controller: _scrollController,
          padding: EdgeInsets.all(12),
          reverse: false,
          itemCount: _liveMessages.length,
          itemBuilder: (context, index) {
            final message = _liveMessages[index];
            final isTemp = message['isTemp'] == true;
            final isFailed = message['isFailed'] == true;

            return Column(
              children: [
                MessageBubble(
                  messages: message['message'] ?? "",
                  sendertype: message['senderType'] ?? "unknown",
                  senderName: message['senderName'] ?? "Unknown",
                  timestamp: _formatTimestamp(message['createdAt']),
                ),

                if (isTemp)
                  Align(
                    alignment: Alignment.centerRight,
                    child: Padding(
                      padding: EdgeInsets.only(right: 4.w, top: 2),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          SizedBox(
                            width: 12,
                            height: 12,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                          SizedBox(width: 4),
                          Text(
                            "Sending...",
                            style: TextStyle(
                              fontSize: 10.sp,
                              color: Colors.grey,
                            ),
                          ).tr(),
                        ],
                      ),
                    ),
                  ),

                if (isFailed)
                  Align(
                    alignment: Alignment.centerRight,
                    child: Padding(
                      padding: EdgeInsets.only(right: 4.w, top: 2),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.error_outline,
                            color: Colors.red,
                            size: 12.sp,
                          ),
                          SizedBox(width: 4),
                          Text(
                            "Failed to send",
                            style: TextStyle(
                              fontSize: 10.sp,
                              color: Colors.red,
                            ),
                          ).tr(),
                        ],
                      ),
                    ),
                  ),
              ],
            );
          },
        );
      },
    );
  }

  String _formatTimestamp(dynamic timestamp) {
    if (timestamp == null) return '';

    try {
      DateTime date;
      if (timestamp is DateTime) {
        date = timestamp;
      } else if (timestamp is String && timestamp.isNotEmpty) {
        date = DateTime.parse(timestamp);
      } else {
        return '';
      }

      return DateFormat('HH:mm').format(date);
    } catch (e) {
      print('⚠️ Error formatting timestamp: $e');
      return '';
    }
  }

  DateTime _parseDate(dynamic value) {
    if (value == null) return DateTime.fromMillisecondsSinceEpoch(0);
    if (value is DateTime) return value;
    if (value is String && value.isNotEmpty) {
      return DateTime.parse(value);
    }
    return DateTime.fromMillisecondsSinceEpoch(0);
  }
}
