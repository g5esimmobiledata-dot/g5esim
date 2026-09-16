class PackagelistEvent {
  final String? countrycode;
  final String? url;
  final int? page;
  final int? limit;
  final bool? isUnlimited;
  final bool? dataPack;
  final bool? isLowToHigh;
  final bool? isHighToLow;

  PackagelistEvent({
    this.countrycode,
    this.url,
    this.page,
    this.limit,
    this.isUnlimited,
    this.dataPack,
    this.isLowToHigh,
    this.isHighToLow,
  });
}
