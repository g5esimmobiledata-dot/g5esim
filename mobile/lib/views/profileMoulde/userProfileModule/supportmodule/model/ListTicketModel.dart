// To parse this JSON data, do
//
//     final listTicketsModel = listTicketsModelFromJson(jsonString);

import 'dart:convert';

ListTicketsModel listTicketsModelFromJson(String str) =>
    ListTicketsModel.fromJson(json.decode(str));

String listTicketsModelToJson(ListTicketsModel data) =>
    json.encode(data.toJson());

class ListTicketsModel {
  bool? success;
  String? message;
  List<Datum>? data;

  ListTicketsModel({this.success, this.message, this.data});

  factory ListTicketsModel.fromJson(Map<String, dynamic> json) =>
      ListTicketsModel(
        success: json["success"],
        message: json["message"],
        data: json["data"] == null
            ? []
            : List<Datum>.from(json["data"]!.map((x) => Datum.fromJson(x))),
      );

  Map<String, dynamic> toJson() => {
    "success": success,
    "message": message,
    "data": data == null
        ? []
        : List<dynamic>.from(data!.map((x) => x.toJson())),
  };
}

class Datum {
  String? id;
  String? ticketId;
  String? senderId;
  String? senderType;
  String? senderName;
  String? message;
  bool? isInternal;
  DateTime? createdAt;

  Datum({
    this.id,
    this.ticketId,
    this.senderId,
    this.senderType,
    this.senderName,
    this.message,
    this.isInternal,
    this.createdAt,
  });

  factory Datum.fromJson(Map<String, dynamic> json) => Datum(
    id: json["id"],
    ticketId: json["ticketId"],
    senderId: json["senderId"],
    senderType: json["senderType"],
    senderName: json["senderName"],
    message: json["message"],
    isInternal: json["isInternal"],
    createdAt: json["createdAt"] == null
        ? null
        : DateTime.parse(json["createdAt"]),
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "ticketId": ticketId,
    "senderId": senderId,
    "senderType": senderType,
    "senderName": senderName,
    "message": message,
    "isInternal": isInternal,
    "createdAt": createdAt?.toIso8601String(),
  };
}
