import 'package:esimconnect/core/bloc/api_event.dart';

class RegionsDetailsEvent extends ApiEvent {
  final String? regionId;
  String? url;
  final bool? isUnlimited;
  final bool? dataPack;
  final bool? isLowToHigh;
  final bool? isHighToLow;
  final int? page;
  final int? limit;

  RegionsDetailsEvent({
    this.regionId,
    this.url,
    this.isUnlimited,
    this.dataPack,
    this.isLowToHigh,
    this.isHighToLow,
    this.page,
    this.limit,
  });
}
