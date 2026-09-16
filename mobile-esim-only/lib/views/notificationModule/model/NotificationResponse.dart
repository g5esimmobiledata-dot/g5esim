// To parse this JSON data, do
//
//     final notificationResponse = notificationResponseFromJson(jsonString);

import 'dart:convert';

NotificationResponse notificationResponseFromJson(String str) =>
    NotificationResponse.fromJson(json.decode(str));

String notificationResponseToJson(NotificationResponse data) =>
    json.encode(data.toJson());

class NotificationResponse {
  bool? success;
  String? message;
  Data? data;

  NotificationResponse({this.success, this.message, this.data});

  factory NotificationResponse.fromJson(Map<String, dynamic> json) =>
      NotificationResponse(
        success: json["success"],
        message: json["message"],
        data: json["data"] == null ? null : Data.fromJson(json["data"]),
      );

  Map<String, dynamic> toJson() => {
    "success": success,
    "message": message,
    "data": data?.toJson(),
  };
}

class Data {
  List<NotificationItem>? notifications;
  int? unreadCount;
  Pagination? pagination;

  Data({this.notifications, this.unreadCount, this.pagination});

  factory Data.fromJson(Map<String, dynamic> json) => Data(
    notifications: json["notifications"] == null
        ? []
        : List<NotificationItem>.from(
            json["notifications"]!.map((x) => NotificationItem.fromJson(x)),
          ),
    unreadCount: json["unreadCount"],
    pagination: json["pagination"] == null
        ? null
        : Pagination.fromJson(json["pagination"]),
  );

  Map<String, dynamic> toJson() => {
    "notifications": notifications == null
        ? []
        : List<dynamic>.from(notifications!.map((x) => x.toJson())),
    "unreadCount": unreadCount,
    "pagination": pagination?.toJson(),
  };
}

class NotificationItem {
  String? id;
  String? userId;
  String? type;
  String? title;
  String? message;
  bool? read;
  Metadata? metadata;
  DateTime? createdAt;

  NotificationItem({
    this.id,
    this.userId,
    this.type,
    this.title,
    this.message,
    this.read,
    this.metadata,
    this.createdAt,
  });

  factory NotificationItem.fromJson(Map<String, dynamic> json) =>
      NotificationItem(
        id: json["id"],
        userId: json["userId"],
        type: json["type"],
        title: json["title"],
        message: json["message"],
        read: json["read"],
        metadata: json["metadata"] == null
            ? null
            : Metadata.fromJson(json["metadata"]),
        createdAt: json["createdAt"] == null
            ? null
            : DateTime.parse(json["createdAt"]),
      );

  Map<String, dynamic> toJson() => {
    "id": id,
    "userId": userId,
    "type": type,
    "title": title,
    "message": message,
    "read": read,
    "metadata": metadata?.toJson(),
    "createdAt": createdAt?.toIso8601String(),
  };
}

class Metadata {
  String? documentId;
  String? reason;

  Metadata({this.documentId, this.reason});

  factory Metadata.fromJson(Map<String, dynamic> json) =>
      Metadata(documentId: json["documentId"], reason: json["reason"]);

  Map<String, dynamic> toJson() => {"documentId": documentId, "reason": reason};
}

class Pagination {
  int? page;
  int? limit;
  int? total;
  int? totalPages;

  Pagination({this.page, this.limit, this.total, this.totalPages});

  factory Pagination.fromJson(Map<String, dynamic> json) => Pagination(
    page: json["page"],
    limit: json["limit"],
    total: json["total"],
    totalPages: json["totalPages"],
  );

  Map<String, dynamic> toJson() => {
    "page": page,
    "limit": limit,
    "total": total,
    "totalPages": totalPages,
  };
}
