// To parse this JSON data, do
//
//     final orderHistoryModel = orderHistoryModelFromJson(jsonString);

import 'dart:convert';

OrderHistoryModel orderHistoryModelFromJson(String str) =>
    OrderHistoryModel.fromJson(json.decode(str));

String orderHistoryModelToJson(OrderHistoryModel data) =>
    json.encode(data.toJson());

class OrderHistoryModel {
  bool? success;
  String? message;
  List<OrderItem>? data;

  OrderHistoryModel({this.success, this.message, this.data});

  factory OrderHistoryModel.fromJson(Map<String, dynamic> json) =>
      OrderHistoryModel(
        success: json["success"],
        message: json["message"],
        data: List<OrderItem>.from(
          _extractItems(json).map((x) => OrderItem.fromJson(x)),
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

List<Map<String, dynamic>> _extractItems(Map<String, dynamic> json) {
  final rawData = json["data"];
  final candidates = <dynamic>[
    rawData,
    if (rawData is Map) rawData["data"],
    if (rawData is Map) rawData["items"],
    if (rawData is Map) rawData["orders"],
    if (rawData is Map) rawData["transactions"],
    json["items"],
    json["orders"],
    json["transactions"],
  ];

  for (final candidate in candidates) {
    if (candidate is List) {
      return candidate
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList();
    }
  }

  return <Map<String, dynamic>>[];
}

int? _intFrom(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '');
}

String? _stringFrom(dynamic value) {
  if (value == null) return null;
  final text = value.toString();
  return text == 'null' ? null : text;
}

DateTime? _dateFrom(dynamic value) {
  final text = _stringFrom(value);
  return text == null || text.isEmpty ? null : DateTime.tryParse(text);
}

class OrderItem {
  String? id;
  int? displayOrderId;
  String? userId;
  String? packageId;
  String? providerId;
  String? providerOrderId;
  String? airaloOrderId;
  dynamic requestId;
  dynamic orderType;
  int? quantity;
  String? iccid;
  String? qrCode;
  String? qrCodeUrl;
  dynamic lpaCode;
  String? smdpAddress;
  String? activationCode;
  dynamic directAppleUrl;
  String? esimStatus;
  String? apnType;
  dynamic apnValue;
  bool? isRoaming;
  dynamic status;
  dynamic orderedBy;
  dynamic assignedBy;
  dynamic webhookReceivedAt;
  dynamic bulkOrderId;
  int? retryCount;
  DateTime? lastRetryAt;
  DateTime? lastStatusCheck;
  String? failureReason;
  String? price;
  String? airaloPrice;
  dynamic wholesalePrice;
  dynamic currency;
  dynamic orderCurrency;
  dynamic dataAmount;
  int? validity;
  dynamic activatedAt;
  dynamic expiresAt;
  UsageData? usageData;
  bool? installationSent;
  String? stripePaymentIntentId;
  dynamic paymentMethod;
  dynamic guestAccessToken;
  dynamic guestEmail;
  dynamic guestPhone;
  dynamic originalProviderId;
  dynamic finalProviderId;
  dynamic failoverAttempts;
  dynamic orderSource;
  DateTime? createdAt;
  DateTime? updatedAt;
  String? historySource;
  Map<String, dynamic> raw;

  OrderItem({
    this.id,
    this.displayOrderId,
    this.userId,
    this.packageId,
    this.providerId,
    this.providerOrderId,
    this.airaloOrderId,
    this.requestId,
    this.orderType,
    this.quantity,
    this.iccid,
    this.qrCode,
    this.qrCodeUrl,
    this.lpaCode,
    this.smdpAddress,
    this.activationCode,
    this.directAppleUrl,
    this.esimStatus,
    this.apnType,
    this.apnValue,
    this.isRoaming,
    this.status,
    this.orderedBy,
    this.assignedBy,
    this.webhookReceivedAt,
    this.bulkOrderId,
    this.retryCount,
    this.lastRetryAt,
    this.lastStatusCheck,
    this.failureReason,
    this.price,
    this.airaloPrice,
    this.wholesalePrice,
    this.currency,
    this.orderCurrency,
    this.dataAmount,
    this.validity,
    this.activatedAt,
    this.expiresAt,
    this.usageData,
    this.installationSent,
    this.stripePaymentIntentId,
    this.paymentMethod,
    this.guestAccessToken,
    this.guestEmail,
    this.guestPhone,
    this.originalProviderId,
    this.finalProviderId,
    this.failoverAttempts,
    this.orderSource,
    this.createdAt,
    this.updatedAt,
    this.historySource,
    Map<String, dynamic>? raw,
  }) : raw = raw ?? <String, dynamic>{};

  factory OrderItem.fromJson(
    Map<String, dynamic> json, {
    String? historySource,
  }) => OrderItem(
    id: _stringFrom(json["id"] ?? json["orderId"] ?? json["transactionId"]),
    displayOrderId: _intFrom(json["displayOrderId"] ?? json["orderNumber"]),
    userId: _stringFrom(json["userId"]),
    packageId: _stringFrom(json["packageId"]),
    providerId: _stringFrom(json["providerId"]),
    providerOrderId: _stringFrom(json["providerOrderId"]),
    airaloOrderId: _stringFrom(json["airaloOrderId"]),
    requestId: json["requestId"],
    orderType: json["orderType"],
    quantity: _intFrom(json["quantity"]),
    iccid: _stringFrom(json["iccid"]),
    qrCode: _stringFrom(json["qrCode"]),
    qrCodeUrl: _stringFrom(json["qrCodeUrl"]),
    lpaCode: json["lpaCode"],
    smdpAddress: _stringFrom(json["smdpAddress"]),
    activationCode: _stringFrom(json["activationCode"]),
    directAppleUrl: json["directAppleUrl"],
    esimStatus: _stringFrom(json["esimStatus"]),
    apnType: _stringFrom(json["apnType"]),
    apnValue: json["apnValue"],
    isRoaming: json["isRoaming"],
    status: json["status"],
    orderedBy: json["orderedBy"],
    assignedBy: json["assignedBy"],
    webhookReceivedAt: json["webhookReceivedAt"],
    bulkOrderId: json["bulkOrderId"],
    retryCount: _intFrom(json["retryCount"]),
    lastRetryAt: _dateFrom(json["lastRetryAt"]),
    lastStatusCheck: _dateFrom(json["lastStatusCheck"]),
    failureReason: _stringFrom(json["failureReason"]),
    price: _stringFrom(
      json["price"] ?? json["amount"] ?? json["total"] ?? json["paidAmount"],
    ),
    airaloPrice: _stringFrom(json["airaloPrice"]),
    wholesalePrice: json["wholesalePrice"],
    currency: json["currency"],
    orderCurrency: json["orderCurrency"],
    dataAmount: json["dataAmount"],
    validity: _intFrom(json["validity"]),
    activatedAt: json["activatedAt"],
    expiresAt: json["expiresAt"],
    usageData: json["usageData"] == null
        ? null
        : UsageData.fromJson(json["usageData"]),
    installationSent: json["installationSent"],
    stripePaymentIntentId: _stringFrom(json["stripePaymentIntentId"]),
    paymentMethod: json["paymentMethod"],
    guestAccessToken: json["guestAccessToken"],
    guestEmail: json["guestEmail"],
    guestPhone: json["guestPhone"],
    originalProviderId: json["originalProviderId"],
    finalProviderId: json["finalProviderId"],
    failoverAttempts: json["failoverAttempts"],
    orderSource: json["orderSource"],
    createdAt: _dateFrom(json["createdAt"] ?? json["created_at"] ?? json["date"]),
    updatedAt: _dateFrom(json["updatedAt"] ?? json["updated_at"]),
    historySource: historySource ?? _stringFrom(json["historySource"]),
    raw: json,
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "displayOrderId": displayOrderId,
    "userId": userId,
    "packageId": packageId,
    "providerId": providerId,
    "providerOrderId": providerOrderId,
    "airaloOrderId": airaloOrderId,
    "requestId": requestId,
    "orderType": orderType,
    "quantity": quantity,
    "iccid": iccid,
    "qrCode": qrCode,
    "qrCodeUrl": qrCodeUrl,
    "lpaCode": lpaCode,
    "smdpAddress": smdpAddress,
    "activationCode": activationCode,
    "directAppleUrl": directAppleUrl,
    "esimStatus": esimStatus,
    "apnType": apnType,
    "apnValue": apnValue,
    "isRoaming": isRoaming,
    "status": status,
    "orderedBy": orderedBy,
    "assignedBy": assignedBy,
    "webhookReceivedAt": webhookReceivedAt,
    "bulkOrderId": bulkOrderId,
    "retryCount": retryCount,
    "lastRetryAt": lastRetryAt?.toIso8601String(),
    "lastStatusCheck": lastStatusCheck?.toIso8601String(),
    "failureReason": failureReason,
    "price": price,
    "airaloPrice": airaloPrice,
    "wholesalePrice": wholesalePrice,
    "currency": currency,
    "orderCurrency": orderCurrency,
    "dataAmount": dataAmount,
    "validity": validity,
    "activatedAt": activatedAt,
    "expiresAt": expiresAt,
    "usageData": usageData?.toJson(),
    "installationSent": installationSent,
    "stripePaymentIntentId": stripePaymentIntentId,
    "paymentMethod": paymentMethod,
    "guestAccessToken": guestAccessToken,
    "guestEmail": guestEmail,
    "guestPhone": guestPhone,
    "originalProviderId": originalProviderId,
    "finalProviderId": finalProviderId,
    "failoverAttempts": failoverAttempts,
    "orderSource": orderSource,
    "createdAt": createdAt?.toIso8601String(),
    "updatedAt": updatedAt?.toIso8601String(),
    "historySource": historySource,
  };
}

class UsageData {
  dynamic total;
  dynamic remaining;
  dynamic percentage;
  dynamic remainingText;
  dynamic remainingVoice;

  UsageData({
    this.total,
    this.remaining,
    this.percentage,
    this.remainingText,
    this.remainingVoice,
  });

  factory UsageData.fromJson(Map<String, dynamic> json) => UsageData(
    total: json["total"],
    remaining: json["remaining"],
    percentage: json["percentage"],
    remainingText: json["remaining_text"],
    remainingVoice: json["remaining_voice"],
  );

  Map<String, dynamic> toJson() => {
    "total": total,
    "remaining": remaining,
    "percentage": percentage,
    "remaining_text": remainingText,
    "remaining_voice": remainingVoice,
  };
}

class EnumValues<T> {
  Map<String, T> map;
  late Map<T, String> reverseMap;

  EnumValues(this.map);

  Map<T, String> get reverse {
    reverseMap = map.map((k, v) => MapEntry(v, k));
    return reverseMap;
  }
}
