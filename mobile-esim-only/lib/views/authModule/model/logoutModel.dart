class LogoutModel {
  final dynamic success;
  final dynamic message;

  LogoutModel({required this.success, required this.message});

  factory LogoutModel.fromJson(Map<String, dynamic> json) {
    return LogoutModel(success: json['success'], message: json['message']);
  }
}
