import 'package:esimconnect/core/bloc/api_event.dart';

class Confrimpaymentevent extends ApiEvent {
  final String orderId;
  final String packageId;
  final String userId;
  final bool isGuest;
  String? guestEmail;
  String? guestAccessToken;
  bool fromGiftCard;
  String amount;
  String currency;
  String recipientEmail;
  String recipientName;
  String message;
  Confrimpaymentevent({
    required this.orderId,
    required this.packageId,
    required this.userId,
    required this.isGuest,
    this.guestEmail,
    this.guestAccessToken,
    this.fromGiftCard = false,
    this.amount = '',
    this.currency = '',
    this.recipientEmail = '',
    this.recipientName = '',
    this.message = '',
  });
}
