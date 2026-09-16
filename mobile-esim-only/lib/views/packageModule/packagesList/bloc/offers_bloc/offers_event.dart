import 'package:esimconnect/core/bloc/api_event.dart';

class OffersEvent extends ApiEvent {
  String? code;
  double? totalAmount;
  String? type;
  OffersEvent({this.code, this.totalAmount, this.type});
}
