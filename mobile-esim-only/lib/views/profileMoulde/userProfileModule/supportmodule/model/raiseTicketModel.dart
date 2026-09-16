class RaiseTicketModel {
  bool? success;
  Data? data;
  String? message;

  RaiseTicketModel({this.success, this.data, this.message});

  factory RaiseTicketModel.fromJson(Map<String, dynamic> json) {
    return RaiseTicketModel(
      success: json['success'],
      data: json['data'] != null ? Data.fromJson(json['data']) : null,
      message: json['message'],
    );
  }

  Map<String, dynamic> toJson() {
    return {'success': success, 'data': data?.toJson(), 'message': message};
  }
}

class Data {
  int? userId;
  String? subject;
  String? status;
  int? isReply;
  DateTime? updatedAt;
  DateTime? createdAt;
  int? id;
  List<Message>? messages;

  Data({
    this.userId,
    this.subject,
    this.status,
    this.isReply,
    this.updatedAt,
    this.createdAt,
    this.id,
    this.messages,
  });

  factory Data.fromJson(Map<String, dynamic> json) {
    return Data(
      userId: json['user_id'],
      subject: json['subject'],
      status: json['status'],
      isReply: json['is_reply'],
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'])
          : null,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : null,
      id: json['id'],
      messages: json['messages'] != null
          ? List<Message>.from(json['messages'].map((x) => Message.fromJson(x)))
          : [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'user_id': userId,
      'subject': subject,
      'status': status,
      'is_reply': isReply,
      'updated_at': updatedAt?.toIso8601String(),
      'created_at': createdAt?.toIso8601String(),
      'id': id,
      'messages': messages != null
          ? messages!.map((x) => x.toJson()).toList()
          : [],
    };
  }
}

class Message {
  int? id;
  int? supportTicketId;
  int? userId;
  String? message;
  String? senderType;
  int? isRead;
  DateTime? createdAt;
  DateTime? updatedAt;

  Message({
    this.id,
    this.supportTicketId,
    this.userId,
    this.message,
    this.senderType,
    this.isRead,
    this.createdAt,
    this.updatedAt,
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: json['id'],
      supportTicketId: json['support_ticket_id'],
      userId: json['user_id'],
      message: json['message'],
      senderType: json['sender_type'],
      isRead: json['is_read'],
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'support_ticket_id': supportTicketId,
      'user_id': userId,
      'message': message,
      'sender_type': senderType,
      'is_read': isRead,
      'created_at': createdAt?.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
    };
  }
}
