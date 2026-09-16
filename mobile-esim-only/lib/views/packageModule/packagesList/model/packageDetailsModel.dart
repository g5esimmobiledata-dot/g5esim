// To parse this JSON data, do
//
//     final packageDetailsModel = packageDetailsModelFromJson(jsonString);

import 'dart:convert';
import 'package:esimconnect/utills/flag_utils.dart';

PackageDetailsModel packageDetailsModelFromJson(String str) =>
    PackageDetailsModel.fromJson(json.decode(str));

String packageDetailsModelToJson(PackageDetailsModel data) =>
    json.encode(data.toJson());

class PackageDetailsModel {
  bool? success;
  String? message;
  Data? data;

  PackageDetailsModel({this.success, this.message, this.data});

  factory PackageDetailsModel.fromJson(Map<String, dynamic> json) =>
      PackageDetailsModel(
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
  String? id;
  String? slug;
  String? title;
  String? dataAmount;
  int? validity;
  dynamic price;
  dynamic wholesalePrice;
  String? currency;
  String? type;
  bool? isUnlimited;
  bool? isBestPrice;
  bool? isPopular;
  bool? isTrending;
  bool? isRecommended;
  bool? isBestValue;
  bool? isEnabled;
  String? providerId;
  String? providerName;
  String? providerSlug;
  String? destinationId;
  Destination? destination;
  dynamic regionId;
  Region? region;
  String? dataOperator;
  String? operatorImage;
  List<String>? coverage;
  String? providerPackageTable;
  String? providerPackageId;
  int? voiceMinutes;
  int? smsCount;
  String? mycountryCode;

  Data({
    this.id,
    this.slug,
    this.title,
    this.dataAmount,
    this.validity,
    this.price,
    this.wholesalePrice,
    this.currency,
    this.type,
    this.isUnlimited,
    this.isBestPrice,
    this.isPopular,
    this.isTrending,
    this.isRecommended,
    this.isBestValue,
    this.isEnabled,
    this.providerId,
    this.providerName,
    this.providerSlug,
    this.destinationId,
    this.destination,
    this.regionId,
    this.region,
    this.dataOperator,
    this.operatorImage,
    this.coverage,
    this.providerPackageTable,
    this.providerPackageId,
    this.voiceMinutes,
    this.smsCount,
    this.mycountryCode,
  });

  factory Data.fromJson(Map<String, dynamic> json) => Data(
    id: json["id"],
    slug: json["slug"],
    title: json["title"],
    dataAmount: json["dataAmount"],
    validity: json["validity"],
    price: json["price"],
    wholesalePrice: json["wholesalePrice"],
    currency: json["currency"],
    type: json["type"],
    isUnlimited: json["isUnlimited"],
    isBestPrice: json["isBestPrice"],
    isPopular: json["isPopular"],
    isTrending: json["isTrending"],
    isRecommended: json["isRecommended"],
    isBestValue: json["isBestValue"],
    isEnabled: json["isEnabled"],
    providerId: json["providerId"],
    providerName: json["providerName"],
    providerSlug: json["providerSlug"],
    destinationId: json["destinationId"],
    destination: json["destination"] == null
        ? null
        : Destination.fromJson(json["destination"]),
    regionId: json["regionId"],
    region: json["region"] == null ? null : Region.fromJson(json["region"]),
    dataOperator: json["operator"],
    operatorImage: json["operatorImage"],
    coverage: json["coverage"] == null
        ? []
        : List<String>.from(json["coverage"]!.map((x) => x)),
    providerPackageTable: json["providerPackageTable"],
    providerPackageId: json["providerPackageId"],
    voiceMinutes: json["voiceMinutes"],
    smsCount: json["smsCount"],
    mycountryCode: json["countryCode"],
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "slug": slug,
    "title": title,
    "dataAmount": dataAmount,
    "validity": validity,
    "price": price,
    "wholesalePrice": wholesalePrice,
    "currency": currency,
    "type": type,
    "isUnlimited": isUnlimited,
    "isBestPrice": isBestPrice,
    "isPopular": isPopular,
    "isTrending": isTrending,
    "isRecommended": isRecommended,
    "isBestValue": isBestValue,
    "isEnabled": isEnabled,
    "providerId": providerId,
    "providerName": providerName,
    "providerSlug": providerSlug,
    "destinationId": destinationId,
    "destination": destination?.toJson(),
    "regionId": regionId,
    "region": region?.toJson(),

    "operator": dataOperator,
    "operatorImage": operatorImage,
    "coverage": coverage == null
        ? []
        : List<dynamic>.from(coverage!.map((x) => x)),
    "providerPackageTable": providerPackageTable,
    "providerPackageId": providerPackageId,
    "voiceMinutes": voiceMinutes,
    "smsCount": smsCount,
    "countryCode": mycountryCode,
  };
}

class Region {
  final String? id;
  final String? name;
  final String? slug;
  final List<String>? countries;
  final String? image;
  final bool? active;

  Region({
    this.id,
    this.name,
    this.slug,
    this.countries,
    this.image,
    this.active,
  });

  factory Region.fromJson(dynamic json) {
    if (json is String) {
      return Region(name: json);
    }
    if (json is Map<String, dynamic>) {
      return Region(
        id: json['id'],
        name: json['name'],
        slug: json['slug'],
        countries: json['countries'] != null
            ? List<String>.from(json['countries'])
            : null, // Parse countries list
        image: json['image'],
        active: json['active'],
      );
    }

    return Region();
  }

  Map<String, dynamic> toJson() {
    if (id == null &&
        slug == null &&
        image == null &&
        active == null &&
        countries == null) {
      return {"name": name};
    }

    return {
      "id": id,
      "name": name,
      "slug": slug,
      "countries": countries,
      "image": image,
      "active": active,
    };
  }
}

class Destination {
  String? id;
  dynamic airaloId;
  String? name;
  String? slug;
  String? countryCode;
  String? flagEmoji;
  dynamic image;
  bool? isTerritory;
  dynamic parentCountryCode;
  bool? active;
  DateTime? createdAt;
  DateTime? updatedAt;

  Destination({
    this.id,
    this.airaloId,
    this.name,
    this.slug,
    this.countryCode,
    this.flagEmoji,
    this.image,
    this.isTerritory,
    this.parentCountryCode,
    this.active,
    this.createdAt,
    this.updatedAt,
  });

  factory Destination.fromJson(Map<String, dynamic> json) => Destination(
    id: json["id"],
    airaloId: json["airaloId"],
    name: json["name"],
    slug: json["slug"],
    countryCode: json["countryCode"],
    flagEmoji: resolveFlagEmoji(
      json["flagEmoji"]?.toString(),
      json["countryCode"]?.toString(),
    ),
    image: json["image"],
    isTerritory: json["isTerritory"],
    parentCountryCode: json["parentCountryCode"],
    active: json["active"],
    createdAt: json["createdAt"] == null
        ? null
        : DateTime.parse(json["createdAt"]),
    updatedAt: json["updatedAt"] == null
        ? null
        : DateTime.parse(json["updatedAt"]),
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "airaloId": airaloId,
    "name": name,
    "slug": slug,
    "countryCode": countryCode,
    "flagEmoji": flagEmoji,
    "image": image,
    "isTerritory": isTerritory,
    "parentCountryCode": parentCountryCode,
    "active": active,
    "createdAt": createdAt?.toIso8601String(),
    "updatedAt": updatedAt?.toIso8601String(),
  };
}
