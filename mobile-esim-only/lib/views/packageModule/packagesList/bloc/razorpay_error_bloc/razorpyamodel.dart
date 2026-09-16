class RazorpayModel {
  final bool success;
  final String message;

  RazorpayModel({required this.success, required this.message});

  factory RazorpayModel.fromJson(Map<String, dynamic> json) {
    return RazorpayModel(
      success: json['success'] ?? false,
      message: json['message'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {'success': success, 'message': message};
  }

  @override
  String toString() => 'RazorpayModel(success: $success, message: $message)';
}
