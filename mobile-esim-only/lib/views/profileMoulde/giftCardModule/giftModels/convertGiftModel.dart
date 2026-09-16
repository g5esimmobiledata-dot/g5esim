// To parse this JSON data, do
//
//     final giftconvertModel = giftconvertModelFromJson(jsonString);

import 'dart:convert';

GiftconvertModel giftconvertModelFromJson(String str) =>
    GiftconvertModel.fromJson(json.decode(str));

String giftconvertModelToJson(GiftconvertModel data) =>
    json.encode(data.toJson());

class GiftconvertModel {
  bool? success;
  GiftCard? giftCard;
  String? newBalance;

  GiftconvertModel({this.success, this.giftCard, this.newBalance});

  factory GiftconvertModel.fromJson(Map<String, dynamic> json) =>
      GiftconvertModel(
        success: json["success"],
        giftCard: json["giftCard"] == null
            ? null
            : GiftCard.fromJson(json["giftCard"]),
        newBalance: json["newBalance"],
      );

  Map<String, dynamic> toJson() => {
    "success": success,
    "giftCard": giftCard?.toJson(),
    "newBalance": newBalance,
  };
}

class GiftCard {
  String? id;
  String? code;
  String? amount;
  String? currency;
  String? balance;
  String? purchasedBy;
  dynamic recipientEmail;
  dynamic recipientName;
  String? message;
  String? theme;
  dynamic deliveryDate;
  bool? deliverySent;
  String? status;
  DateTime? expiresAt;
  dynamic redeemedBy;
  dynamic redeemedAt;
  dynamic purchaseOrderId;
  dynamic createdByAdmin;
  DateTime? createdAt;
  DateTime? updatedAt;

  GiftCard({
    this.id,
    this.code,
    this.amount,
    this.currency,
    this.balance,
    this.purchasedBy,
    this.recipientEmail,
    this.recipientName,
    this.message,
    this.theme,
    this.deliveryDate,
    this.deliverySent,
    this.status,
    this.expiresAt,
    this.redeemedBy,
    this.redeemedAt,
    this.purchaseOrderId,
    this.createdByAdmin,
    this.createdAt,
    this.updatedAt,
  });

  factory GiftCard.fromJson(Map<String, dynamic> json) => GiftCard(
    id: json["id"],
    code: json["code"],
    amount: json["amount"],
    currency: json["currency"],
    balance: json["balance"],
    purchasedBy: json["purchasedBy"],
    recipientEmail: json["recipientEmail"],
    recipientName: json["recipientName"],
    message: json["message"],
    theme: json["theme"],
    deliveryDate: json["deliveryDate"],
    deliverySent: json["deliverySent"],
    status: json["status"],
    expiresAt: json["expiresAt"] == null
        ? null
        : DateTime.parse(json["expiresAt"]),
    redeemedBy: json["redeemedBy"],
    redeemedAt: json["redeemedAt"],
    purchaseOrderId: json["purchaseOrderId"],
    createdByAdmin: json["createdByAdmin"],
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
    "amount": amount,
    "currency": currency,
    "balance": balance,
    "purchasedBy": purchasedBy,
    "recipientEmail": recipientEmail,
    "recipientName": recipientName,
    "message": message,
    "theme": theme,
    "deliveryDate": deliveryDate,
    "deliverySent": deliverySent,
    "status": status,
    "expiresAt": expiresAt?.toIso8601String(),
    "redeemedBy": redeemedBy,
    "redeemedAt": redeemedAt,
    "purchaseOrderId": purchaseOrderId,
    "createdByAdmin": createdByAdmin,
    "createdAt": createdAt?.toIso8601String(),
    "updatedAt": updatedAt?.toIso8601String(),
  };
}
