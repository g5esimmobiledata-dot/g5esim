// To parse this JSON data, do
//
//     final initGiftCardModel = initGiftCardModelFromJson(jsonString);

import 'dart:convert';

InitGiftCardModel initGiftCardModelFromJson(String str) =>
    InitGiftCardModel.fromJson(json.decode(str));

String initGiftCardModelToJson(InitGiftCardModel data) =>
    json.encode(data.toJson());

class InitGiftCardModel {
  bool? success;
  String? message;
  Pricing? pricing;
  Payment? payment;

  InitGiftCardModel({this.success, this.message, this.pricing, this.payment});

  factory InitGiftCardModel.fromJson(
    Map<String, dynamic> json,
  ) => InitGiftCardModel(
    success: json["success"],
    message: json["message"],
    pricing: json["pricing"] == null ? null : Pricing.fromJson(json["pricing"]),
    payment: json["payment"] == null ? null : Payment.fromJson(json["payment"]),
  );

  Map<String, dynamic> toJson() => {
    "success": success,
    "message": message,
    "pricing": pricing?.toJson(),
    "payment": payment?.toJson(),
  };
}

class Payment {
  String? provider;
  dynamic clientSecret;
  dynamic paymentIntentId;
  String? orderId;
  dynamic redirectUrl;
  String? publicKey;
  dynamic guestAccessToken;
  int? amount;
  String? currency;
  dynamic paymentMethod;
  String? purchaseType;
  Config? config;

  Payment({
    this.provider,
    this.clientSecret,
    this.paymentIntentId,
    this.orderId,
    this.redirectUrl,
    this.publicKey,
    this.guestAccessToken,
    this.amount,
    this.currency,
    this.paymentMethod,
    this.purchaseType,
    this.config,
  });

  factory Payment.fromJson(Map<String, dynamic> json) => Payment(
    provider: json["provider"],
    clientSecret: json["clientSecret"],
    paymentIntentId: json["paymentIntentId"],
    orderId: json["orderId"],
    redirectUrl: json["redirectUrl"],
    publicKey: json["publicKey"],
    guestAccessToken: json["guestAccessToken"],
    amount: json["amount"],
    currency: json["currency"],
    paymentMethod: json["paymentMethod"],
    purchaseType: json["purchaseType"],
    config: json["config"] == null ? null : Config.fromJson(json["config"]),
  );

  Map<String, dynamic> toJson() => {
    "provider": provider,
    "clientSecret": clientSecret,
    "paymentIntentId": paymentIntentId,
    "orderId": orderId,
    "redirectUrl": redirectUrl,
    "publicKey": publicKey,
    "guestAccessToken": guestAccessToken,
    "amount": amount,
    "currency": currency,
    "paymentMethod": paymentMethod,
    "purchaseType": purchaseType,
    "config": config?.toJson(),
  };
}

class Config {
  String? mode;

  Config({this.mode});

  factory Config.fromJson(Map<String, dynamic> json) =>
      Config(mode: json["mode"]);

  Map<String, dynamic> toJson() => {"mode": mode};
}

class Pricing {
  int? total;
  int? subtotal;
  int? discount;
  int? amount;

  Pricing({this.total, this.subtotal, this.discount, this.amount});

  factory Pricing.fromJson(Map<String, dynamic> json) => Pricing(
    total: json["total"],
    subtotal: json["subtotal"],
    discount: json["discount"],
    amount: json["amount"],
  );

  Map<String, dynamic> toJson() => {
    "total": total,
    "subtotal": subtotal,
    "discount": discount,
    "amount": amount,
  };
}
