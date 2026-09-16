// To parse this JSON data, do
//
//     final gatewayListModel = gatewayListModelFromJson(jsonString);

import 'dart:convert';

GatewayListModel gatewayListModelFromJson(String str) =>
    GatewayListModel.fromJson(json.decode(str));

String gatewayListModelToJson(GatewayListModel data) =>
    json.encode(data.toJson());

class GatewayListModel {
  bool? success;
  List<GatewayItem>? data;
  bool? inAppPurchase;
  String? currency;

  GatewayListModel({
    this.success,
    this.data,
    this.inAppPurchase,
    this.currency,
  });

  factory GatewayListModel.fromJson(Map<String, dynamic> json) {
    final gatewayData = json["data"];
    final gatewayDataMap = gatewayData is Map ? gatewayData : null;
    final rawGateways = gatewayData is List
        ? gatewayData
        : gatewayDataMap != null && gatewayDataMap["gateways"] is List
        ? gatewayDataMap["gateways"] as List
        : gatewayDataMap != null && gatewayDataMap["paymentMethods"] is List
        ? gatewayDataMap["paymentMethods"] as List
        : gatewayDataMap != null && gatewayDataMap["methods"] is List
        ? gatewayDataMap["methods"] as List
        : json["gateways"] is List
        ? json["gateways"] as List
        : json["paymentMethods"] is List
        ? json["paymentMethods"] as List
        : json["methods"] is List
        ? json["methods"] as List
        : const [];

    return GatewayListModel(
      success: json["success"],
      data: List<GatewayItem>.from(
        rawGateways.whereType<Map>().map(
          (x) => GatewayItem.fromJson(Map<String, dynamic>.from(x)),
        ),
      ),
      inAppPurchase: json["inAppPurchase"] ?? gatewayDataMap?["inAppPurchase"],
      currency: json["currency"] ?? gatewayDataMap?["currency"],
    );
  }

  Map<String, dynamic> toJson() => {
    "success": success,
    "data": data == null
        ? []
        : List<dynamic>.from(data!.map((x) => x.toJson())),
    "inAppPurchase": inAppPurchase,
    "currency": currency,
  };
}

class GatewayItem {
  String? id;
  String? provider;
  String? displayName;
  String? publicKey;

  GatewayItem({this.id, this.provider, this.displayName, this.publicKey});

  factory GatewayItem.fromJson(Map<String, dynamic> json) => GatewayItem(
    id: json["id"]?.toString(),
    provider:
        json["provider"]?.toString() ??
        json["providerType"]?.toString() ??
        json["type"]?.toString() ??
        json["key"]?.toString(),
    displayName:
        json["displayName"]?.toString() ??
        json["name"]?.toString() ??
        json["title"]?.toString() ??
        json["label"]?.toString(),
    publicKey: json["publicKey"]?.toString(),
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "provider": provider,
    "displayName": displayName,
    "publicKey": publicKey,
  };
}
