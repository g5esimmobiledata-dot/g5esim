import 'package:esimconnect/core/bloc/api_event.dart';

class ConvertGiftEvent extends ApiEvent {
  final String code;
  final String amount;
  final String currency;
  final String message;
  final String theme;
  final String? note;

  const ConvertGiftEvent({
    required this.code,
    required this.amount,
    required this.currency,
    required this.message,
    required this.theme,
    required this.note,
  });
}
