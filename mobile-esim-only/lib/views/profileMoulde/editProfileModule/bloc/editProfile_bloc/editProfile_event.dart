import 'dart:typed_data';

import 'package:esimconnect/core/bloc/api_event.dart';

class EditProfileEvent extends ApiEvent {
  final String name;
  final String email;
  final String phone;
  final String address;
  final String? profileImage;
  final Uint8List? profileImageBytes;
  final String? profileImageFileName;
  final String? profileImageMimeType;
  final String destination;
  final String currency;
  const EditProfileEvent({
    required this.name,
    required this.email,
    required this.phone,
    required this.address,
    required this.profileImage,
    this.profileImageBytes,
    this.profileImageFileName,
    this.profileImageMimeType,
    required this.destination,
    required this.currency,
  });
}
