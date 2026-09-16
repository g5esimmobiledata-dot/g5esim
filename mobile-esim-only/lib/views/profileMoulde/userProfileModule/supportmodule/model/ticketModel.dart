// To parse this JSON data, do
//
//     final ticketsModel = ticketsModelFromJson(jsonString);

import 'dart:convert';

TicketsModel ticketsModelFromJson(String str) =>
    TicketsModel.fromJson(json.decode(str));

String ticketsModelToJson(TicketsModel data) => json.encode(data.toJson());

class TicketsModel {
  bool? success;
  String? message;
  Data? data;

  TicketsModel({this.success, this.message, this.data});

  factory TicketsModel.fromJson(Map<String, dynamic> json) => TicketsModel(
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
  List<Datum>? data;
  Pagination? pagination;

  Data({this.data, this.pagination});

  factory Data.fromJson(Map<String, dynamic> json) => Data(
    data: json["data"] == null
        ? []
        : List<Datum>.from(json["data"]!.map((x) => Datum.fromJson(x))),
    pagination: json["pagination"] == null
        ? null
        : Pagination.fromJson(json["pagination"]),
  );

  Map<String, dynamic> toJson() => {
    "data": data == null
        ? []
        : List<dynamic>.from(data!.map((x) => x.toJson())),
    "pagination": pagination?.toJson(),
  };
}

class Datum {
  String? id;
  String? title;
  String? description;
  String? status;
  String? priority;
  String? userId;
  String? userName;
  dynamic assignedToId;
  dynamic assignedToName;
  DateTime? createdAt;
  DateTime? updatedAt;
  dynamic resolvedAt;
  dynamic closedAt;

  Datum({
    this.id,
    this.title,
    this.description,
    this.status,
    this.priority,
    this.userId,
    this.userName,
    this.assignedToId,
    this.assignedToName,
    this.createdAt,
    this.updatedAt,
    this.resolvedAt,
    this.closedAt,
  });

  factory Datum.fromJson(Map<String, dynamic> json) => Datum(
    id: json["id"],
    title: json["title"],
    description: json["description"],
    status: json["status"],
    priority: json["priority"],
    userId: json["userId"],
    userName: json["userName"],
    assignedToId: json["assignedToId"],
    assignedToName: json["assignedToName"],
    createdAt: json["createdAt"] == null
        ? null
        : DateTime.parse(json["createdAt"]),
    updatedAt: json["updatedAt"] == null
        ? null
        : DateTime.parse(json["updatedAt"]),
    resolvedAt: json["resolvedAt"],
    closedAt: json["closedAt"],
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "title": title,
    "description": description,
    "status": status,
    "priority": priority,
    "userId": userId,
    "userName": userName,
    "assignedToId": assignedToId,
    "assignedToName": assignedToName,
    "createdAt": createdAt?.toIso8601String(),
    "updatedAt": updatedAt?.toIso8601String(),
    "resolvedAt": resolvedAt,
    "closedAt": closedAt,
  };
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
