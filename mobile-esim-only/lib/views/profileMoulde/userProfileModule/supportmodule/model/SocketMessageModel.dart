// Create a review_models class for socket messages
class SocketMessageModel {
  final String? replyId;
  final String? ticketId;
  final String? senderType;
  final String? message;
  final String? createdAt;
  final String? senderName;

  SocketMessageModel({
    this.replyId,
    this.ticketId,
    this.senderType,
    this.message,
    this.createdAt,
    this.senderName,
  });

  factory SocketMessageModel.fromMap(Map<String, dynamic> map) {
    return SocketMessageModel(
      replyId: map['replyId']?.toString(),
      ticketId: map['ticketId']?.toString(),
      senderType: map['senderType']?.toString(),
      message: map['message']?.toString(),
      createdAt: map['createdAt']?.toString(),
      senderName: map['senderName']?.toString(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'replyId': replyId,
      'ticketId': ticketId,
      'senderType': senderType,
      'message': message,
      'createdAt': createdAt,
      'senderName': senderName,
    };
  }
}
