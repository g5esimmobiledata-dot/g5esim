// To parse this JSON data, do
//
//     final paymentInitiateModel = paymentInitiateModelFromJson(jsonString);

import 'dart:convert';

PaymentInitiateModel paymentInitiateModelFromJson(String str) =>
    PaymentInitiateModel.fromJson(json.decode(str));

String paymentInitiateModelToJson(PaymentInitiateModel data) =>
    json.encode(data.toJson());

class PaymentInitiateModel {
  bool? success;
  bool? builtInComplete;
  String? message;
  Pricing? pricing;
  Payment? payment;

  PaymentInitiateModel({
    this.success,
    this.builtInComplete,
    this.message,
    this.pricing,
    this.payment,
  });

  factory PaymentInitiateModel.fromJson(
    Map<String, dynamic> json,
  ) => PaymentInitiateModel(
    success: json["success"],
    builtInComplete: json["builtInComplete"],
    message: json["message"],
    pricing: json["pricing"] == null ? null : Pricing.fromJson(json["pricing"]),
    payment: json["payment"] == null ? null : Payment.fromJson(json["payment"]),
  );

  Map<String, dynamic> toJson() => {
    "success": success,
    "builtInComplete": builtInComplete,
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
  dynamic publicKey;
  dynamic guestAccessToken;
  dynamic amount;
  String? currency;
  String? mode;
  dynamic walletTransactionId;
  dynamic balance;
  Map<String, dynamic>? metadata;
  dynamic paymentUrl;
  dynamic txRef;
  dynamic qrCode;
  dynamic payAddress;
  dynamic payAmount;
  dynamic payCurrency;
  dynamic network;
  dynamic priceAmount;
  dynamic priceCurrency;
  dynamic transactionId;
  dynamic packageOrderId;

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
    this.mode,
    this.walletTransactionId,
    this.balance,
    this.metadata,
    this.paymentUrl,
    this.txRef,
    this.qrCode,
    this.payAddress,
    this.payAmount,
    this.payCurrency,
    this.network,
    this.priceAmount,
    this.priceCurrency,
    this.transactionId,
    this.packageOrderId,
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
    mode: json["mode"],
    walletTransactionId: json["walletTransactionId"],
    balance: json["balance"],
    metadata: json["metadata"] == null
        ? null
        : Map<String, dynamic>.from(json["metadata"]),
    paymentUrl: json["paymentUrl"],
    txRef: json["txRef"],
    qrCode: json["qrCode"],
    payAddress: json["payAddress"],
    payAmount: json["payAmount"],
    payCurrency: json["payCurrency"],
    network: json["network"],
    priceAmount: json["priceAmount"],
    priceCurrency: json["priceCurrency"],
    transactionId: json["transactionId"],
    packageOrderId: json["packageOrderId"],
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
    "mode": mode,
    "walletTransactionId": walletTransactionId,
    "balance": balance,
    "metadata": metadata,
    "paymentUrl": paymentUrl,
    "txRef": txRef,
    "qrCode": qrCode,
    "payAddress": payAddress,
    "payAmount": payAmount,
    "payCurrency": payCurrency,
    "network": network,
    "priceAmount": priceAmount,
    "priceCurrency": priceCurrency,
    "transactionId": transactionId,
    "packageOrderId": packageOrderId,
  };
}

class Pricing {
  dynamic unitPrice;
  dynamic quantity;
  dynamic subtotal;
  dynamic discount;
  dynamic total;
  dynamic appliedReferralCredits;

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
