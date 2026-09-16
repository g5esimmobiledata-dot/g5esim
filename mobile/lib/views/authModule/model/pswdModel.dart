// To parse this JSON data, do
//
//     final PswdModel = loginModelFromJson(jsonString);

import 'dart:convert';

PswdModel loginModelFromJson(String str) =>
    PswdModel.fromJson(json.decode(str));

String loginModelToJson(PswdModel data) => json.encode(data.toJson());

class PswdModel {
  bool? success;
  String? message;

  PswdModel({this.success, this.message});

  factory PswdModel.fromJson(Map<String, dynamic> json) =>
      PswdModel(success: json["success"], message: json["message"]);

  Map<String, dynamic> toJson() => {"success": success, "message": message};
}
