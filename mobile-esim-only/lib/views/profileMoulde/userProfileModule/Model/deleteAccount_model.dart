class DeleteModel {
  final bool? success;
  final bool? data;
  final String? message;

  DeleteModel({this.success, this.data, this.message});

  factory DeleteModel.fromJson(Map<String, dynamic> json) {
    return DeleteModel(
      success: json['success'] as bool?,
      data: json['data'] as bool?,
      message: json['message'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {'success': success, 'data': data, 'message': message};
  }
}
