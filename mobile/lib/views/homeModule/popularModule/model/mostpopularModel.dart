// To parse this JSON data, do
//
//     final mostPopularListModel = mostPopularListModelFromJson(jsonString);

import 'dart:convert';
import 'package:esimconnect/utills/flag_utils.dart';

MostPopularListModel mostPopularListModelFromJson(String str) =>
    MostPopularListModel.fromJson(json.decode(str));

String mostPopularListModelToJson(MostPopularListModel data) =>
    json.encode(data.toJson());

class MostPopularListModel {
  bool? success;
  String? message;
  Data? data;

  MostPopularListModel({this.success, this.message, this.data});

  factory MostPopularListModel.fromJson(Map<String, dynamic> json) =>
      MostPopularListModel(
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
  String? providerId;
  String? providerPackageTable;
  String? providerPackageId;
  String? destinationId;
  String? regionId;
  String? slug;
  String? title;
  String? dataAmount;
  int? validity;
  String? type;
  String? wholesalePrice;
  String? retailPrice;
  String? currency;
  String? datumOperator;
  String? operatorImage;
  List<String>? coverage;
  int? voiceCredits;
  int? smsCredits;
  bool? isUnlimited;
  dynamic dataMb;
  int? validityDays;
  int? voiceMinutes;
  int? smsCount;
  String? countryCode;
  String? countryName;
  String? packageGroupKey;
  bool? isEnabled;
  bool? isBestPrice;
  bool? manualOverride;
  bool? isPopular;
  bool? isTrending;
  bool? isRecommended;
  bool? isBestValue;
  int? salesCount;
  dynamic customImage;
  dynamic customDescription;
  DateTime? createdAt;
  DateTime? updatedAt;
  String? price;
  Provider? provider;
  Destination? destination;
  Region? region;

  Datum({
    this.id,
    this.providerId,
    this.providerPackageTable,
    this.providerPackageId,
    this.destinationId,
    this.regionId,
    this.slug,
    this.title,
    this.dataAmount,
    this.validity,
    this.type,
    this.wholesalePrice,
    this.retailPrice,
    this.currency,
    this.datumOperator,
    this.operatorImage,
    this.coverage,
    this.voiceCredits,
    this.smsCredits,
    this.isUnlimited,
    this.dataMb,
    this.validityDays,
    this.voiceMinutes,
    this.smsCount,
    this.countryCode,
    this.countryName,
    this.packageGroupKey,
    this.isEnabled,
    this.isBestPrice,
    this.manualOverride,
    this.isPopular,
    this.isTrending,
    this.isRecommended,
    this.isBestValue,
    this.salesCount,
    this.customImage,
    this.customDescription,
    this.createdAt,
    this.updatedAt,
    this.price,
    this.provider,
    this.destination,
    this.region,
  });

  factory Datum.fromJson(Map<String, dynamic> json) => Datum(
    id: json["id"],
    providerId: json["providerId"],
    providerPackageTable: json["providerPackageTable"],
    providerPackageId: json["providerPackageId"],
    destinationId: json["destinationId"],
    regionId: json["regionId"],
    slug: json["slug"],
    title: json["title"],
    dataAmount: json["dataAmount"],
    validity: json["validity"],
    type: json["type"],
    wholesalePrice: json["wholesalePrice"],
    retailPrice: json["retailPrice"],
    currency: json["currency"],
    datumOperator: json["operator"],
    operatorImage: json["operatorImage"],
    coverage: json["coverage"] == null
        ? []
        : List<String>.from(json["coverage"]!.map((x) => x)),
    voiceCredits: json["voiceCredits"],
    smsCredits: json["smsCredits"],
    isUnlimited: json["isUnlimited"],
    dataMb: json["dataMb"],
    validityDays: json["validityDays"],
    voiceMinutes: json["voiceMinutes"],
    smsCount: json["smsCount"],
    countryCode: json["countryCode"],
    countryName: json["countryName"],
    packageGroupKey: json["packageGroupKey"],
    isEnabled: json["isEnabled"],
    isBestPrice: json["isBestPrice"],
    manualOverride: json["manualOverride"],
    isPopular: json["isPopular"],
    isTrending: json["isTrending"],
    isRecommended: json["isRecommended"],
    isBestValue: json["isBestValue"],
    salesCount: json["salesCount"],
    customImage: json["customImage"],
    customDescription: json["customDescription"],
    createdAt: json["createdAt"] == null
        ? null
        : DateTime.parse(json["createdAt"]),
    updatedAt: json["updatedAt"] == null
        ? null
        : DateTime.parse(json["updatedAt"]),
    price: json["price"],
    provider: json["provider"] == null
        ? null
        : Provider.fromJson(json["provider"]),
    destination: json["destination"] == null
        ? null
        : Destination.fromJson(json["destination"]),
    region: json["region"] == null ? null : Region.fromJson(json["region"]),
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "providerId": providerId,
    "providerPackageTable": providerPackageTable,
    "providerPackageId": providerPackageId,
    "destinationId": destinationId,
    "regionId": regionId,
    "slug": slug,
    "title": title,
    "dataAmount": dataAmount,
    "validity": validity,
    "type": type,
    "wholesalePrice": wholesalePrice,
    "retailPrice": retailPrice,
    "currency": currency,
    "operator": datumOperator,
    "operatorImage": operatorImage,
    "coverage": coverage == null
        ? []
        : List<dynamic>.from(coverage!.map((x) => x)),
    "voiceCredits": voiceCredits,
    "smsCredits": smsCredits,
    "isUnlimited": isUnlimited,
    "dataMb": dataMb,
    "validityDays": validityDays,
    "voiceMinutes": voiceMinutes,
    "smsCount": smsCount,
    "countryCode": countryCode,
    "countryName": countryName,
    "packageGroupKey": packageGroupKey,
    "isEnabled": isEnabled,
    "isBestPrice": isBestPrice,
    "manualOverride": manualOverride,
    "isPopular": isPopular,
    "isTrending": isTrending,
    "isRecommended": isRecommended,
    "isBestValue": isBestValue,
    "salesCount": salesCount,
    "customImage": customImage,
    "customDescription": customDescription,
    "createdAt": createdAt?.toIso8601String(),
    "updatedAt": updatedAt?.toIso8601String(),
    "price": price,
    "provider": provider?.toJson(),
    "destination": destination?.toJson(),
    "region": region?.toJson(),
  };
}

class Destination {
  String? id;
  String? name;
  String? slug;
  String? countryCode;
  String? flagEmoji;
  dynamic image;

  Destination({
    this.id,
    this.name,
    this.slug,
    this.countryCode,
    this.flagEmoji,
    this.image,
  });

  factory Destination.fromJson(Map<String, dynamic> json) => Destination(
    id: json["id"],
    name: json["name"],
    slug: json["slug"],
    countryCode: json["countryCode"],
    flagEmoji: resolveFlagEmoji(
      json["flagEmoji"]?.toString(),
      json["countryCode"]?.toString(),
    ),
    image: json["image"],
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "name": name,
    "slug": slug,
    "countryCode": countryCode,
    "flagEmoji": flagEmoji,
    "image": image,
  };
}

class Provider {
  String? id;
  String? name;
  String? slug;

  Provider({this.id, this.name, this.slug});

  factory Provider.fromJson(Map<String, dynamic> json) =>
      Provider(id: json["id"], name: json["name"], slug: json["slug"]);

  Map<String, dynamic> toJson() => {"id": id, "name": name, "slug": slug};
}

class Region {
  String? id;
  String? name;
  String? slug;
  List<String>? countries;
  String? image;

  Region({this.id, this.name, this.slug, this.countries, this.image});

  factory Region.fromJson(Map<String, dynamic> json) => Region(
    id: json["id"],
    name: json["name"],
    slug: json["slug"],
    countries: json["countries"] == null
        ? []
        : List<String>.from(json["countries"]!.map((x) => x)),
    image: json["image"],
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "name": name,
    "slug": slug,
    "countries": countries == null
        ? []
        : List<dynamic>.from(countries!.map((x) => x)),
    "image": image,
  };
}

class Pagination {
  int? total;
  int? totalPages;
  int? currentPage;
  int? limit;

  Pagination({this.total, this.totalPages, this.currentPage, this.limit});

  factory Pagination.fromJson(Map<String, dynamic> json) => Pagination(
    total: json["total"],
    totalPages: json["totalPages"],
    currentPage: json["currentPage"],
    limit: json["limit"],
  );

  Map<String, dynamic> toJson() => {
    "total": total,
    "totalPages": totalPages,
    "currentPage": currentPage,
    "limit": limit,
  };
}
