import 'package:esimconnect/core/bloc/api_event.dart';

class PaymentInitiateEvent extends ApiEvent {
  String? gatewayId;
  String? packageId;
  String? quantity;
  String currency;
  String? orderId;
  String? amount;
  String? promoCode;
  String? promoType;
  String? voucherId;
  String? giftCardId;
  dynamic referalId;
  String? email;
  String? name;
  String? phone;
  String? gatewayName;
  String? paymentMethod;

  PaymentInitiateEvent({
    required this.gatewayId,
    required this.currency,
    required this.packageId,
    this.quantity = "1",
    required this.orderId,
    this.promoCode,
    this.promoType,
    this.voucherId,
    this.giftCardId,
    this.referalId,
    this.email,
    this.name,
    this.phone,
    this.amount,
    this.gatewayName,
    this.paymentMethod,
  });
}
