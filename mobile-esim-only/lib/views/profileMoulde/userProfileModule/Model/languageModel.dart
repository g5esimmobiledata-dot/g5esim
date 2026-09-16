// To parse this JSON data, do
//
//     final languageModel = languageModelFromJson(jsonString);

import 'dart:convert';

LanguageModel languageModelFromJson(String str) =>
    LanguageModel.fromJson(json.decode(str));

String languageModelToJson(LanguageModel data) => json.encode(data.toJson());

class LanguageModel {
  bool? success;
  String? message;
  List<Datum>? data;

  LanguageModel({this.success, this.message, this.data});

  factory LanguageModel.fromJson(Map<String, dynamic> json) => LanguageModel(
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
  String? code;
  String? name;
  String? nativeName;
  String? flagCode;
  bool? isRtl;
  bool? isEnabled;
  bool? isDefault;
  int? sortOrder;
  DateTime? createdAt;
  DateTime? updatedAt;

  Datum({
    this.id,
    this.code,
    this.name,
    this.nativeName,
    this.flagCode,
    this.isRtl,
    this.isEnabled,
    this.isDefault,
    this.sortOrder,
    this.createdAt,
    this.updatedAt,
  });

  factory Datum.fromJson(Map<String, dynamic> json) => Datum(
    id: json["id"],
    code: json["code"],
    name: json["name"],
    nativeName: json["nativeName"],
    flagCode: json["flagCode"],
    isRtl: json["isRTL"],
    isEnabled: json["isEnabled"],
    isDefault: json["isDefault"],
    sortOrder: json["sortOrder"],
    createdAt: json["createdAt"] == null
        ? null
        : DateTime.parse(json["createdAt"]),
    updatedAt: json["updatedAt"] == null
        ? null
        : DateTime.parse(json["updatedAt"]),
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "code": code,
    "name": name,
    "nativeName": nativeName,
    "flagCode": flagCode,
    "isRTL": isRtl,
    "isEnabled": isEnabled,
    "isDefault": isDefault,
    "sortOrder": sortOrder,
    "createdAt": createdAt?.toIso8601String(),
    "updatedAt": updatedAt?.toIso8601String(),
  };
}
