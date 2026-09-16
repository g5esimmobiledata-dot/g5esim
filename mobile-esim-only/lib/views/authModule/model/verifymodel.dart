// To parse this JSON data, do
//
//     final verifyModel = verifyModelFromJson(jsonString);

import 'dart:convert';

VerifyModel verifyModelFromJson(String str) =>
    VerifyModel.fromJson(json.decode(str));

String verifyModelToJson(VerifyModel data) => json.encode(data.toJson());

class VerifyModel {
  bool? success;
  String? message;
  Data? data;

  VerifyModel({this.success, this.message, this.data});

  factory VerifyModel.fromJson(Map<String, dynamic> json) => VerifyModel(
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
  bool? success;
  String? userId;

  Data({this.success, this.userId});

  factory Data.fromJson(Map<String, dynamic> json) =>
      Data(success: json["success"], userId: json["userId"]);

  Map<String, dynamic> toJson() => {"success": success, "userId": userId};
}
