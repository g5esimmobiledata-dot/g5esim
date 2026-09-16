// To parse this JSON data, do
//
//     final paymentVerifyModel = paymentVerifyModelFromJson(jsonString);

import 'dart:convert';

PaymentVerifyModel paymentVerifyModelFromJson(String str) =>
    PaymentVerifyModel.fromJson(json.decode(str));

String paymentVerifyModelToJson(PaymentVerifyModel data) =>
    json.encode(data.toJson());

class PaymentVerifyModel {
  bool? success;
  String? message;
  Order? order;
  String? transactionId;
  String? platform;

  PaymentVerifyModel({
    this.success,
    this.message,
    this.order,
    this.transactionId,
    this.platform,
  });

  factory PaymentVerifyModel.fromJson(Map<String, dynamic> json) =>
      PaymentVerifyModel(
        success: json["success"],
        message: json["message"],
        order: json["order"] == null ? null : Order.fromJson(json["order"]),
        transactionId: json["transactionId"],
        platform: json["platform"],
      );

  Map<String, dynamic> toJson() => {
    "success": success,
    "message": message,
    "order": order?.toJson(),
    "transactionId": transactionId,
    "platform": platform,
  };
}

class Order {
  String? id;
  int? displayOrderId;
  String? userId;
  String? packageId;
  String? providerId;
  dynamic providerOrderId;
  dynamic airaloOrderId;
  dynamic requestId;
  String? orderType;
  int? quantity;
  String? iccid;
  dynamic qrCode;
  String? lpaCode;
  String? smdpAddress;
  String? activationCode;
  dynamic directAppleUrl;
  dynamic esimStatus;
  dynamic apnType;
  dynamic apnValue;
  bool? isRoaming;
  String? status;
  dynamic orderedBy;
  dynamic assignedBy;
  dynamic webhookReceivedAt;
  dynamic bulkOrderId;
  int? retryCount;
  dynamic lastRetryAt;
  dynamic lastStatusCheck;
  dynamic failureReason;
  String? price;
  String? airaloPrice;
  dynamic wholesalePrice;
  String? currency;
  String? orderCurrency;
  String? dataAmount;
  int? validity;
  dynamic activatedAt;
  dynamic expiresAt;
  dynamic usageData;
  bool? installationSent;
  dynamic stripePaymentIntentId;
  String? paymentMethod;
  dynamic guestAccessToken;
  dynamic guestEmail;
  dynamic guestPhone;
  dynamic originalProviderId;
  dynamic finalProviderId;
  dynamic failoverAttempts;
  String? orderSource;
  DateTime? createdAt;
  DateTime? updatedAt;

  Order({
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

  factory Order.fromJson(Map<String, dynamic> json) => Order(
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
    lastRetryAt: json["lastRetryAt"],
    lastStatusCheck: json["lastStatusCheck"],
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
    usageData: json["usageData"],
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
    "lastRetryAt": lastRetryAt,
    "lastStatusCheck": lastStatusCheck,
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
    "usageData": usageData,
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
