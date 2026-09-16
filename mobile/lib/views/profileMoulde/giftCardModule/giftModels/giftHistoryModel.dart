// To parse this JSON data, do
//
//     final giftCardHistoryModel = giftCardHistoryModelFromJson(jsonString);

import 'dart:convert';

GiftCardHistoryModel giftCardHistoryModelFromJson(String str) =>
    GiftCardHistoryModel.fromJson(json.decode(str));

String giftCardHistoryModelToJson(GiftCardHistoryModel data) =>
    json.encode(data.toJson());

class GiftCardHistoryModel {
  bool? success;
  String? message;
  List<GiftCardsDatum>? data;

  GiftCardHistoryModel({this.success, this.message, this.data});

  factory GiftCardHistoryModel.fromJson(Map<String, dynamic> json) =>
      GiftCardHistoryModel(
        success: json["success"],
        message: json["message"],
        data: json["data"] == null
            ? []
            : List<GiftCardsDatum>.from(
                json["data"]!.map((x) => GiftCardsDatum.fromJson(x)),
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

class GiftCardsDatum {
  String? id;
  String? code;
  String? amount;
  String? currency;
  String? balance;
  String? purchasedBy;
  String? recipientEmail;
  String? recipientName;
  String? message;
  String? theme;
  dynamic deliveryDate;
  bool? deliverySent;
  String? status;
  dynamic expiresAt;
  dynamic redeemedBy;
  dynamic redeemedAt;
  dynamic purchaseOrderId;
  dynamic createdByAdmin;
  DateTime? createdAt;
  DateTime? updatedAt;
  Purchaser? purchaser;

  GiftCardsDatum({
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
    this.purchaser,
  });

  factory GiftCardsDatum.fromJson(Map<String, dynamic> json) => GiftCardsDatum(
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
    expiresAt: json["expiresAt"],
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
    purchaser: json["purchaser"] == null
        ? null
        : Purchaser.fromJson(json["purchaser"]),
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
    "expiresAt": expiresAt,
    "redeemedBy": redeemedBy,
    "redeemedAt": redeemedAt,
    "purchaseOrderId": purchaseOrderId,
    "createdByAdmin": createdByAdmin,
    "createdAt": createdAt?.toIso8601String(),
    "updatedAt": updatedAt?.toIso8601String(),
    "purchaser": purchaser?.toJson(),
  };
}

class Purchaser {
  String? id;
  String? name;
  String? email;

  Purchaser({this.id, this.name, this.email});

  factory Purchaser.fromJson(Map<String, dynamic> json) =>
      Purchaser(id: json["id"], name: json["name"], email: json["email"]);

  Map<String, dynamic> toJson() => {"id": id, "name": name, "email": email};
}
