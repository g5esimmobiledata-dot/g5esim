import '../../../core/bloc/api_event.dart';

class Getreviewevent extends ApiEvent {
  final String packageId;
  final String? orderId;
  const Getreviewevent({required this.packageId, this.orderId});
}
