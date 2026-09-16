// To parse this JSON data, do
//
//     final EsimListModel = orderHistoryModelFromJson(jsonString);

import 'dart:convert';

EsimListModel orderHistoryModelFromJson(String str) =>
    EsimListModel.fromJson(json.decode(str));

String orderHistoryModelToJson(EsimListModel data) =>
    json.encode(data.toJson());

class EsimListModel {
  bool? success;
  String? message;
  List<EsimItem>? data;

  EsimListModel({this.success, this.message, this.data});

  factory EsimListModel.fromJson(Map<String, dynamic> json) => EsimListModel(
    success: json["success"],
    message: json["message"],
    data: json["data"] == null
        ? []
        : List<EsimItem>.from(json["data"]!.map((x) => EsimItem.fromJson(x))),
  );

  Map<String, dynamic> toJson() => {
    "success": success,
    "message": message,
    "data": data == null
        ? []
        : List<dynamic>.from(data!.map((x) => x.toJson())),
  };
}

class EsimItem {
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

  EsimItem({
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
  });

  factory EsimItem.fromJson(Map<String, dynamic> json) => EsimItem(
    id: json["id"],
    displayOrderId: json["displayOrderId"],
    userId: json["userId"],
    packageId: json["packageId"],
    providerId: json["providerId"],
    providerOrderId: json["providerOrderId"],
    airaloOrderId: json["airaloOrderId"],
    requestId: json["requestId"],
    orderType: json["orderType"],
    quantity: json["quantity"],
    iccid: json["iccid"],
    qrCode: json["qrCode"],
    qrCodeUrl: json["qrCodeUrl"],
    lpaCode: json["lpaCode"],
    smdpAddress: json["smdpAddress"],
    activationCode: json["activationCode"],
    directAppleUrl: json["directAppleUrl"],
    esimStatus: json["esimStatus"],
    apnType: json["apnType"],
    apnValue: json["apnValue"],
    isRoaming: json["isRoaming"],
    status: json["status"],
    orderedBy: json["orderedBy"],
    assignedBy: json["assignedBy"],
    webhookReceivedAt: json["webhookReceivedAt"],
    bulkOrderId: json["bulkOrderId"],
    retryCount: json["retryCount"],
    lastRetryAt: json["lastRetryAt"] == null
        ? null
        : DateTime.parse(json["lastRetryAt"]),
    lastStatusCheck: json["lastStatusCheck"] == null
        ? null
        : DateTime.parse(json["lastStatusCheck"]),
    failureReason: json["failureReason"],
    price: json["price"],
    airaloPrice: json["airaloPrice"],
    wholesalePrice: json["wholesalePrice"],
    currency: json["currency"],
    orderCurrency: json["orderCurrency"],
    dataAmount: json["dataAmount"],
    validity: json["validity"],
    activatedAt: json["activatedAt"],
    expiresAt: json["expiresAt"],
    usageData: json["usageData"] == null
        ? null
        : UsageData.fromJson(json["usageData"]),
    installationSent: json["installationSent"],
    stripePaymentIntentId: json["stripePaymentIntentId"],
    paymentMethod: json["paymentMethod"],
    guestAccessToken: json["guestAccessToken"],
    guestEmail: json["guestEmail"],
    guestPhone: json["guestPhone"],
    originalProviderId: json["originalProviderId"],
    finalProviderId: json["finalProviderId"],
    failoverAttempts: json["failoverAttempts"],
    orderSource: json["orderSource"],
    createdAt: json["createdAt"] == null
        ? null
        : DateTime.parse(json["createdAt"]),
    updatedAt: json["updatedAt"] == null
        ? null
        : DateTime.parse(json["updatedAt"]),
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
