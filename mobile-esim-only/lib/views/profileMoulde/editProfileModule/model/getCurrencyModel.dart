// To parse this JSON data, do
//
//     final getCurrencyModel = getCurrencyModelFromJson(jsonString);

import 'dart:convert';

GetCurrencyModel getCurrencyModelFromJson(String str) =>
    GetCurrencyModel.fromJson(json.decode(str));

String getCurrencyModelToJson(GetCurrencyModel data) =>
    json.encode(data.toJson());

class GetCurrencyModel {
  bool? success;
  String? message;
  List<Datum>? data;

  GetCurrencyModel({this.success, this.message, this.data});

  factory GetCurrencyModel.fromJson(Map<String, dynamic> json) =>
      GetCurrencyModel(
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
  String? symbol;
  String? conversionRate;
  bool? isDefault;
  bool? isEnabled;
  DateTime? createdAt;
  DateTime? updatedAt;

  Datum({
    this.id,
    this.code,
    this.name,
    this.symbol,
    this.conversionRate,
    this.isDefault,
    this.isEnabled,
    this.createdAt,
    this.updatedAt,
  });

  factory Datum.fromJson(Map<String, dynamic> json) => Datum(
    id: json["id"],
    code: json["code"],
    name: json["name"],
    symbol: json["symbol"],
    conversionRate: json["conversionRate"],
    isDefault: json["isDefault"],
    isEnabled: json["isEnabled"],
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
    "symbol": symbol,
    "conversionRate": conversionRate,
    "isDefault": isDefault,
    "isEnabled": isEnabled,
    "createdAt": createdAt?.toIso8601String(),
    "updatedAt": updatedAt?.toIso8601String(),
  };
}
