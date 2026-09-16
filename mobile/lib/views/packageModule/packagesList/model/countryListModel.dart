// To parse this JSON data, do
//
//     final countryListModel = countryListModelFromJson(jsonString);

import 'dart:convert';
import 'package:esimconnect/utills/flag_utils.dart';

CountryListModel countryListModelFromJson(String str) =>
    CountryListModel.fromJson(json.decode(str));

String countryListModelToJson(CountryListModel data) =>
    json.encode(data.toJson());

class CountryListModel {
  bool? success;
  dynamic message;
  List<Countries>? data;

  CountryListModel({this.success, this.message, this.data});

  factory CountryListModel.fromJson(Map<String, dynamic> json) =>
      CountryListModel(
        success: json["success"],
        message: json["message"],
        data: json["data"] == null
            ? []
            : List<Countries>.from(
                json["data"]!.map((x) => Countries.fromJson(x)),
              ),
      );

  Map<String, dynamic> toJson() => {
    "success": success,
    "message": message,
    "data": data == null
        ? []
        : List<dynamic>.from(data!.map((x) => x.toJson())),
  };
}

class Countries {
  dynamic id;
  dynamic airaloId;
  dynamic slug;
  dynamic name;
  dynamic countryCode;
  dynamic flagEmoji;
  dynamic image;
  bool? active;
  DateTime? createdAt;
  DateTime? updatedAt;
  dynamic minPrice;
  MinDataAmount? minDataAmount;
  int? minValidity;
  int? packageCount;
  Currency? currency;

  Countries({
    this.id,
    this.airaloId,
    this.slug,
    this.name,
    this.countryCode,
    this.flagEmoji,
    this.image,
    this.active,
    this.createdAt,
    this.updatedAt,
    this.minPrice,
    this.minDataAmount,
    this.minValidity,
    this.packageCount,
    this.currency,
  });

  factory Countries.fromJson(Map<String, dynamic> json) {
    // json.forEach((key, value) {
    //   if (value == null) {
    //     print("❌ NULL VALUE for key: $key");
    //   }
    // });
    return Countries(
      id: json["id"],
      airaloId: json["airaloId"] ?? "",
      slug: json["slug"],
      name: json["name"],
      countryCode: json["countryCode"],
      flagEmoji: resolveFlagEmoji(
        json["flagEmoji"]?.toString(),
        json["countryCode"]?.toString(),
      ),
      image: json["image"] ?? "",
      active: json["active"],
      createdAt: json["createdAt"] == null
          ? null
          : DateTime.parse(json["createdAt"]),
      updatedAt: json["updatedAt"] == null
          ? null
          : DateTime.parse(json["updatedAt"]),
      minPrice: json["minPrice"],
      minDataAmount: minDataAmountValues.map[json["minDataAmount"] ?? {}],
      minValidity: json["minValidity"],
      packageCount: json["packageCount"],
      currency: currencyValues.map[json["currency"]],
    );
  }

  Map<String, dynamic> toJson() => {
    "id": id,
    "airaloId": airaloId ?? "",
    "slug": slug,
    "name": name,
    "countryCode": countryCode,
    "flagEmoji": flagEmoji,
    "image": image ?? "",
    "active": active,
    "createdAt": createdAt?.toIso8601String(),
    "updatedAt": updatedAt?.toIso8601String(),
    "minPrice": minPrice,
    "minDataAmount": minDataAmountValues.reverse[minDataAmount],
    "minValidity": minValidity,
    "packageCount": packageCount,
    "currency": currencyValues.reverse[currency],
  };
}

enum Currency { EMPTY }

final currencyValues = EnumValues({"\u0024": Currency.EMPTY});

enum MinDataAmount {
  MIN_DATA_AMOUNT_1_GB,
  THE_100_MB,
  THE_1_GB,
  THE_500_MB,
  UNLIMITED,
}

final minDataAmountValues = EnumValues({
  "1GB": MinDataAmount.MIN_DATA_AMOUNT_1_GB,
  "100MB": MinDataAmount.THE_100_MB,
  "1 GB": MinDataAmount.THE_1_GB,
  "500MB": MinDataAmount.THE_500_MB,
  "Unlimited": MinDataAmount.UNLIMITED,
});

class EnumValues<T> {
  Map<String, T> map;
  late Map<T, String> reverseMap;

  EnumValues(this.map);

  Map<T, String> get reverse {
    reverseMap = map.map((k, v) => MapEntry(v, k));
    return reverseMap;
  }
}
