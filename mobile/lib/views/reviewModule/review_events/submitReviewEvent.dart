import 'package:esimconnect/core/bloc/api_event.dart';

class Submitreviewevent extends ApiEvent {
  final String title;
  final String comment;
  final int rating;
  final String packageId;
  const Submitreviewevent({
    required this.title,
    required this.comment,
    required this.rating,
    required this.packageId,
  });
}
