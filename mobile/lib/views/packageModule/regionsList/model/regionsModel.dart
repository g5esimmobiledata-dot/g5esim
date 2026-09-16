// To parse this JSON data, do
//
//     final regionsModel = regionsModelFromJson(jsonString);

import 'dart:convert';

RegionsModel regionsModelFromJson(String str) =>
    RegionsModel.fromJson(json.decode(str));

String regionsModelToJson(RegionsModel data) => json.encode(data.toJson());

class RegionsModel {
  bool? success;
  String? message;
  List<Datum>? data;

  RegionsModel({this.success, this.message, this.data});

  factory RegionsModel.fromJson(Map<String, dynamic> json) => RegionsModel(
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
  dynamic airaloId;
  String? slug;
  String? name;
  dynamic image;
  List<String>? countries;
  bool? active;
  DateTime? createdAt;
  DateTime? updatedAt;
  dynamic minPrice;
  String? minDataAmount;
  int? minValidity;
  int? packageCount;
  String? currency;

  Datum({
    this.id,
    this.airaloId,
    this.slug,
    this.name,
    this.image,
    this.countries,
    this.active,
    this.createdAt,
    this.updatedAt,
    this.minPrice,
    this.minDataAmount,
    this.minValidity,
    this.packageCount,
    this.currency,
  });

  factory Datum.fromJson(Map<String, dynamic> json) => Datum(
    id: json["id"],
    airaloId: json["airaloId"],
    slug: json["slug"],
    name: json["name"],
    image: json["image"],
    countries: json["countries"] == null
        ? []
        : List<String>.from(json["countries"]!.map((x) => x)),
    active: json["active"],
    createdAt: json["createdAt"] == null
        ? null
        : DateTime.parse(json["createdAt"]),
    updatedAt: json["updatedAt"] == null
        ? null
        : DateTime.parse(json["updatedAt"]),
    minPrice: json["minPrice"],
    minDataAmount: json["minDataAmount"],
    minValidity: json["minValidity"],
    packageCount: json["packageCount"],
    currency: json["currency"],
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "airaloId": airaloId,
    "slug": slug,
    "name": name,
    "image": image,
    "countries": countries == null
        ? []
        : List<dynamic>.from(countries!.map((x) => x)),
    "active": active,
    "createdAt": createdAt?.toIso8601String(),
    "updatedAt": updatedAt?.toIso8601String(),
    "minPrice": minPrice,
    "minDataAmount": minDataAmount,
    "minValidity": minValidity,
    "packageCount": packageCount,
    "currency": currency,
  };
}
