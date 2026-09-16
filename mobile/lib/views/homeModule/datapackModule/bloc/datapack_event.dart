import 'package:esimconnect/core/bloc/api_event.dart';

class DatapackEvent extends ApiEvent {
  final bool isdatapack;
  final String? page;
  const DatapackEvent({required this.isdatapack, this.page});
}
