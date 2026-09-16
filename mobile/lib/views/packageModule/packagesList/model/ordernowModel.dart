// To parse this JSON data, do
//
//     final orderNowModel = orderNowModelFromJson(jsonString);

import 'dart:convert';

OrderNowModel orderNowModelFromJson(String str) =>
    OrderNowModel.fromJson(json.decode(str));

String orderNowModelToJson(OrderNowModel data) => json.encode(data.toJson());

class OrderNowModel {
  bool? success;
  String? message;
  Pricing? pricing;
  Iap? iap;

  OrderNowModel({this.success, this.message, this.pricing, this.iap});

  factory OrderNowModel.fromJson(Map<String, dynamic> json) => OrderNowModel(
    success: json["success"],
    message: json["message"],
    pricing: json["pricing"] == null ? null : Pricing.fromJson(json["pricing"]),
    iap: json["iap"] == null ? null : Iap.fromJson(json["iap"]),
  );

  Map<String, dynamic> toJson() => {
    "success": success,
    "message": message,
    "pricing": pricing?.toJson(),
    "iap": iap?.toJson(),
  };
}

class Iap {
  String? platform;
  AvailableBrackets? availableBrackets;
  String? note;

  Iap({this.platform, this.availableBrackets, this.note});

  factory Iap.fromJson(Map<String, dynamic> json) => Iap(
    platform: json["platform"],
    availableBrackets: json["availableBrackets"] == null
        ? null
        : AvailableBrackets.fromJson(json["availableBrackets"]),
    note: json["note"],
  );

  Map<String, dynamic> toJson() => {
    "platform": platform,
    "availableBrackets": availableBrackets?.toJson(),
    "note": note,
  };
}

class AvailableBrackets {
  String? id;
  String? minPrice;
  String? maxPrice;
  String? packageImage;
  String? setPrice;
  String? productId;
  String? currency;
  String? androidStatus;
  dynamic androidSyncError;
  dynamic androidLastSyncAt;
  String? appleStatus;
  dynamic appleSyncError;
  dynamic appleLastSyncAt;
  bool? isActive;
  DateTime? createdAt;
  DateTime? updatedAt;

  AvailableBrackets({
    this.id,
    this.minPrice,
    this.maxPrice,
    this.packageImage,
    this.setPrice,
    this.productId,
    this.currency,
    this.androidStatus,
    this.androidSyncError,
    this.androidLastSyncAt,
    this.appleStatus,
    this.appleSyncError,
    this.appleLastSyncAt,
    this.isActive,
    this.createdAt,
    this.updatedAt,
  });

  factory AvailableBrackets.fromJson(Map<String, dynamic> json) =>
      AvailableBrackets(
        id: json["id"],
        minPrice: json["minPrice"],
        maxPrice: json["maxPrice"],
        packageImage: json["packageImage"],
        setPrice: json["setPrice"],
        productId: json["productId"],
        currency: json["currency"],
        androidStatus: json["androidStatus"],
        androidSyncError: json["androidSyncError"],
        androidLastSyncAt: json["androidLastSyncAt"],
        appleStatus: json["appleStatus"],
        appleSyncError: json["appleSyncError"],
        appleLastSyncAt: json["appleLastSyncAt"],
        isActive: json["isActive"],
        createdAt: json["createdAt"] == null
            ? null
            : DateTime.parse(json["createdAt"]),
        updatedAt: json["updatedAt"] == null
            ? null
            : DateTime.parse(json["updatedAt"]),
      );

  Map<String, dynamic> toJson() => {
    "id": id,
    "minPrice": minPrice,
    "maxPrice": maxPrice,
    "packageImage": packageImage,
    "setPrice": setPrice,
    "productId": productId,
    "currency": currency,
    "androidStatus": androidStatus,
    "androidSyncError": androidSyncError,
    "androidLastSyncAt": androidLastSyncAt,
    "appleStatus": appleStatus,
    "appleSyncError": appleSyncError,
    "appleLastSyncAt": appleLastSyncAt,
    "isActive": isActive,
    "createdAt": createdAt?.toIso8601String(),
    "updatedAt": updatedAt?.toIso8601String(),
  };
}

class Pricing {
  double? unitPrice;
  int? quantity;
  double? subtotal;
  int? discount;
  double? total;
  int? appliedReferralCredits;

  Pricing({
    this.unitPrice,
    this.quantity,
    this.subtotal,
    this.discount,
    this.total,
    this.appliedReferralCredits,
  });

  factory Pricing.fromJson(Map<String, dynamic> json) => Pricing(
    unitPrice: json["unitPrice"]?.toDouble(),
    quantity: json["quantity"],
    subtotal: json["subtotal"]?.toDouble(),
    discount: json["discount"],
    total: json["total"]?.toDouble(),
    appliedReferralCredits: json["appliedReferralCredits"],
  );

  Map<String, dynamic> toJson() => {
    "unitPrice": unitPrice,
    "quantity": quantity,
    "subtotal": subtotal,
    "discount": discount,
    "total": total,
    "appliedReferralCredits": appliedReferralCredits,
  };
}
