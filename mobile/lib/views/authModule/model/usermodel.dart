// To parse this JSON data, do
//
//     final loginModel = loginModelFromJson(jsonString);

import 'dart:convert';

LoginModel loginModelFromJson(String str) =>
    LoginModel.fromJson(json.decode(str));

String loginModelToJson(LoginModel data) => json.encode(data.toJson());

class LoginModel {
  bool? success;
  String? message;
  Data? data;

  LoginModel({this.success, this.message, this.data});

  factory LoginModel.fromJson(Map<String, dynamic> json) => LoginModel(
    success: json["success"],
    message: json["message"],
    data: json["data"] == null ? null : Data.fromJson(json["data"]),
  );

  Map<String, dynamic> toJson() => {
    "success": success,
    "message": message,
    "data": data?.toJson(),
  };
}

class Data {
  String? email;
  bool? isPasswordSet;

  Data({this.email, this.isPasswordSet});

  factory Data.fromJson(Map<String, dynamic> json) =>
      Data(email: json["email"], isPasswordSet: json["is_password_set"]);

  Map<String, dynamic> toJson() => {
    "email": email,
    "is_password_set": isPasswordSet,
  };
}
