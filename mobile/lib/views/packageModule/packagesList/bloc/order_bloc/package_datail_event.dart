import 'package:esimconnect/core/bloc/api_event.dart';

class BuyNowEvent extends ApiEvent {
  final String? packageid;
  final bool? isTopu;
  final String? topUpiccid;
  final dynamic orderPrice;
  final String? gatewayname;

  const BuyNowEvent({
    required this.packageid,
    this.isTopu = false,
    this.topUpiccid,
    this.orderPrice,
    this.gatewayname,
  });
}
