import 'package:esimconnect/core/bloc/api_event.dart';

class PaymentVerifyEvent extends ApiEvent {
  String? paymentid; //razorpay
  String? signature; //razorpay
  String? iccid;
  bool? isTopup;
  //for ios
  String? originalTransactionId;
  String? transactionId;

  dynamic esim_order_id;
  String? packageName;
  String? gateway_order_id;
  dynamic receiptData;
  String? purchaseToken;
  dynamic googleorderid;
  dynamic gatewayname;

  dynamic clientsecret; //strip
  dynamic voucherId;
  dynamic referalId;
  dynamic giftCardId;
  dynamic promoType;
  dynamic promoCode;
  String? packageId;

  PaymentVerifyEvent({
    this.paymentid,
    this.signature,
    this.iccid,
    this.isTopup,
    this.esim_order_id,
    this.packageName,
    this.gateway_order_id,
    this.receiptData,
    this.purchaseToken,
    this.googleorderid,
    this.originalTransactionId,
    this.transactionId,
    this.gatewayname,
    this.clientsecret,
    this.voucherId,
    this.referalId,
    this.giftCardId,
    this.promoType,
    this.promoCode,
    this.packageId,
  });
}
