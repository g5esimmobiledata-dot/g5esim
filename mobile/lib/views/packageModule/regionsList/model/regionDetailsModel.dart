// To parse this JSON data, do
//
//     final regionDetailsModel = regionDetailsModelFromJson(jsonString);

import 'dart:convert';

RegionDetailsModel regionDetailsModelFromJson(String str) =>
    RegionDetailsModel.fromJson(json.decode(str));

String regionDetailsModelToJson(RegionDetailsModel data) =>
    json.encode(data.toJson());

class RegionDetailsModel {
  bool? success;
  String? message;
  Data? data;

  RegionDetailsModel({this.success, this.message, this.data});

  factory RegionDetailsModel.fromJson(Map<String, dynamic> json) =>
      RegionDetailsModel(
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
  Region? region;
  List<Package>? packages;
  Pagination? pagination;
  Counts? counts;

  Data({this.region, this.packages, this.pagination, this.counts});

  factory Data.fromJson(Map<String, dynamic> json) => Data(
    region: json["region"] == null ? null : Region.fromJson(json["region"]),
    packages: json["packages"] == null
        ? []
        : List<Package>.from(json["packages"]!.map((x) => Package.fromJson(x))),
    pagination: json["pagination"] == null
        ? null
        : Pagination.fromJson(json["pagination"]),
    counts: json["counts"] == null ? null : Counts.fromJson(json["counts"]),
  );

  Map<String, dynamic> toJson() => {
    "region": region?.toJson(),
    "packages": packages == null
        ? []
        : List<dynamic>.from(packages!.map((x) => x.toJson())),
    "pagination": pagination?.toJson(),
    "counts": counts?.toJson(),
  };
}

class Counts {
  String? total;
  int? regional;

  Counts({this.total, this.regional});

  factory Counts.fromJson(Map<String, dynamic> json) =>
      Counts(total: json["total"], regional: json["regional"]);

  Map<String, dynamic> toJson() => {"total": total, "regional": regional};
}

class Package {
  String? id;
  String? slug;
  String? title;
  String? dataAmount;
  int? dataMb;
  int? validity;
  int? validityDays;
  String? price;
  dynamic wholesalePrice;
  String? currency;
  String? type;
  bool? isUnlimited;
  bool? isBestPrice;
  bool? isPopular;
  bool? isRecommended;
  bool? isBestValue;
  bool? isEnabled;
  String? providerId;
  String? providerName;
  String? providerSlug;
  String? packageOperator;
  String? operatorImage;
  List<String>? coverage;
  dynamic packageGroupKey;
  dynamic countryCode;
  dynamic countryName;
  String? regionId;
  Region? region;
  int? voiceMinutes;
  int? smsCount;

  Package({
    this.id,
    this.slug,
    this.title,
    this.dataAmount,
    this.dataMb,
    this.validity,
    this.validityDays,
    this.price,
    this.wholesalePrice,
    this.currency,
    this.type,
    this.isUnlimited,
    this.isBestPrice,
    this.isPopular,
    this.isRecommended,
    this.isBestValue,
    this.isEnabled,
    this.providerId,
    this.providerName,
    this.providerSlug,
    this.packageOperator,
    this.operatorImage,
    this.coverage,
    this.packageGroupKey,
    this.countryCode,
    this.countryName,
    this.regionId,
    this.region,
    this.voiceMinutes,
    this.smsCount,
  });

  factory Package.fromJson(Map<String, dynamic> json) => Package(
    id: json["id"],
    slug: json["slug"],
    title: json["title"],
    dataAmount: json["dataAmount"],
    dataMb: json["dataMb"],
    validity: json["validity"],
    validityDays: json["validityDays"],
    price: json["price"],
    wholesalePrice: json["wholesalePrice"],
    currency: json["currency"],
    type: json["type"],
    isUnlimited: json["isUnlimited"],
    isBestPrice: json["isBestPrice"],
    isPopular: json["isPopular"],
    isRecommended: json["isRecommended"],
    isBestValue: json["isBestValue"],
    isEnabled: json["isEnabled"],
    providerId: json["providerId"],
    providerName: json["providerName"],
    providerSlug: json["providerSlug"],
    packageOperator: json["operator"],
    operatorImage: json["operatorImage"],
    coverage: json["coverage"] == null
        ? []
        : List<String>.from(json["coverage"]!.map((x) => x)),
    packageGroupKey: json["packageGroupKey"],
    countryCode: json["countryCode"],
    countryName: json["countryName"],
    regionId: json["regionId"],
    region: json["region"] == null ? null : Region.fromJson(json["region"]),
    voiceMinutes: json["voiceMinutes"],
    smsCount: json["smsCount"],
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "slug": slug,
    "title": title,
    "dataAmount": dataAmount,
    "dataMb": dataMb,
    "validity": validity,
    "validityDays": validityDays,
    "price": price,
    "wholesalePrice": wholesalePrice,
    "currency": currency,
    "type": type,
    "isUnlimited": isUnlimited,
    "isBestPrice": isBestPrice,
    "isPopular": isPopular,
    "isRecommended": isRecommended,
    "isBestValue": isBestValue,
    "isEnabled": isEnabled,
    "providerId": providerId,
    "providerName": providerName,
    "providerSlug": providerSlug,
    "operator": packageOperator,
    "operatorImage": operatorImage,
    "coverage": coverage == null
        ? []
        : List<dynamic>.from(coverage!.map((x) => x)),
    "packageGroupKey": packageGroupKey,
    "countryCode": countryCode,
    "countryName": countryName,
    "regionId": regionId,
    "region": region?.toJson(),
    "voiceMinutes": voiceMinutes,
    "smsCount": smsCount,
  };
}

class Region {
  String? id;
  dynamic airaloId;
  String? name;
  String? slug;
  List<String>? countries;
  String? image;
  bool? active;
  DateTime? createdAt;
  DateTime? updatedAt;

  Region({
    this.id,
    this.airaloId,
    this.name,
    this.slug,
    this.countries,
    this.image,
    this.active,
    this.createdAt,
    this.updatedAt,
  });

  factory Region.fromJson(Map<String, dynamic> json) => Region(
    id: json["id"],
    airaloId: json["airaloId"],
    name: json["name"],
    slug: json["slug"],
    countries: json["countries"] == null
        ? []
        : List<String>.from(json["countries"]!.map((x) => x)),
    image: json["image"],
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
    "countries": countries == null
        ? []
        : List<dynamic>.from(countries!.map((x) => x)),
    "image": image,
    "active": active,
    "createdAt": createdAt?.toIso8601String(),
    "updatedAt": updatedAt?.toIso8601String(),
  };
}

class Pagination {
  int? page;
  int? limit;
  String? totalItems;
  int? totalPages;
  bool? hasNextPage;
  bool? hasPrevPage;

  Pagination({
    this.page,
    this.limit,
    this.totalItems,
    this.totalPages,
    this.hasNextPage,
    this.hasPrevPage,
  });

  factory Pagination.fromJson(Map<String, dynamic> json) => Pagination(
    page: json["page"],
    limit: json["limit"],
    totalItems: json["totalItems"],
    totalPages: json["totalPages"],
    hasNextPage: json["hasNextPage"],
    hasPrevPage: json["hasPrevPage"],
  );

  Map<String, dynamic> toJson() => {
    "page": page,
    "limit": limit,
    "totalItems": totalItems,
    "totalPages": totalPages,
    "hasNextPage": hasNextPage,
    "hasPrevPage": hasPrevPage,
  };
}
