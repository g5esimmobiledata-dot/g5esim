// To parse this JSON data, do
//
//     final deleteModel = deleteModelFromJson(jsonString);

import 'dart:convert';

DeleteModel deleteModelFromJson(String str) =>
    DeleteModel.fromJson(json.decode(str));

String deleteModelToJson(DeleteModel data) => json.encode(data.toJson());

class DeleteModel {
  bool? success;
  String? message;

  DeleteModel({this.success, this.message});

  factory DeleteModel.fromJson(Map<String, dynamic> json) =>
      DeleteModel(success: json["success"], message: json["message"]);

  Map<String, dynamic> toJson() => {"success": success, "message": message};
}
