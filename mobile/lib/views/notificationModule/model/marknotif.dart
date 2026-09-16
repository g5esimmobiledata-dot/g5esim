// To parse this JSON data, do
//
//     final notificationResponse = notificationResponseFromJson(jsonString);

import 'dart:convert';

markNotificatioin notificationResponseFromJson(String str) =>
    markNotificatioin.fromJson(json.decode(str));

String notificationResponseToJson(markNotificatioin data) =>
    json.encode(data.toJson());

class markNotificatioin {
  bool? success;
  String? message;

  markNotificatioin({this.success, this.message});

  factory markNotificatioin.fromJson(Map<String, dynamic> json) =>
      markNotificatioin(success: json["success"], message: json["message"]);

  Map<String, dynamic> toJson() => {"success": success, "message": message};
}
