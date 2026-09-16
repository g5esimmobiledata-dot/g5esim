// To parse this JSON data, do
//
//     final offersModel = offersModelFromJson(jsonString);

import 'dart:convert';

OffersModel offersModelFromJson(String str) =>
    OffersModel.fromJson(json.decode(str));

String offersModelToJson(OffersModel data) => json.encode(data.toJson());

class OffersModel {
  bool? success;
  String? type;
  String? code;
  String? referrerId;
  String? discountType;
  int? discountValue;
  double? discount;
  String? description;
  dynamic giftCardId;

  OffersModel({
    this.success,
    this.type,
    this.code,
    this.referrerId,
    this.discountType,
    this.discountValue,
    this.discount,
    this.description,
    this.giftCardId,
  });

  factory OffersModel.fromJson(Map<String, dynamic> json) => OffersModel(
    success: json["success"],
    type: json["type"],
    code: json["code"],
    referrerId: json["referrerId"],
    discountType: json["discountType"],
    discountValue: json["discountValue"],
    discount: json["discount"]?.toDouble(),
    description: json["description"],
    giftCardId: json["giftCardId"],
  );

  Map<String, dynamic> toJson() => {
    "success": success,
    "type": type,
    "code": code,
    "referrerId": referrerId,
    "discountType": discountType,
    "discountValue": discountValue,
    "discount": discount,
    "description": description,
    "giftCardId": giftCardId,
  };
}
