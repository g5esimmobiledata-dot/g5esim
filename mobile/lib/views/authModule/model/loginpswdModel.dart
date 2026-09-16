// To parse this JSON data, do
//
//     final loginPswdModel = loginPswdModelFromJson(jsonString);

import 'dart:convert';

LoginPswdModel loginPswdModelFromJson(String str) =>
    LoginPswdModel.fromJson(json.decode(str));

String loginPswdModelToJson(LoginPswdModel data) => json.encode(data.toJson());

class LoginPswdModel {
  bool? success;
  String? message;
  Data? data;

  LoginPswdModel({this.success, this.message, this.data});

  factory LoginPswdModel.fromJson(Map<String, dynamic> json) => LoginPswdModel(
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
  String? id;
  String? email;
  String? name;
  String? token;
  String? role;
  bool? passwordSet;
  String? memberType;
  String? referralBalance;
  String? memberRewardsWallet;
  String? walletBalance;

  Data({
    this.id,
    this.email,
    this.name,
    this.token,
    this.role,
    this.passwordSet,
    this.memberType,
    this.referralBalance,
    this.memberRewardsWallet,
    this.walletBalance,
  });

  factory Data.fromJson(Map<String, dynamic> json) => Data(
    id: json["id"],
    email: json["email"],
    name: json["name"],
    token: json["token"],
    role: json["role"]?.toString(),
    passwordSet: json["passwordSet"],
    memberType:
        json["memberType"]?.toString() ??
        json["membershipType"]?.toString() ??
        json["member_type"]?.toString() ??
        json["customerType"]?.toString() ??
        json["userType"]?.toString() ??
        json["tier"]?.toString() ??
        (json["membership"] is Map
            ? json["membership"]["type"]?.toString() ??
                  json["membership"]["name"]?.toString()
            : null),
    referralBalance: json["referralBalance"]?.toString(),
    memberRewardsWallet:
        json["memberRewardsWallet"]?.toString() ??
        json["rewardsWallet"]?.toString() ??
        json["rewardWallet"]?.toString() ??
        json["rewardsWalletBalance"]?.toString() ??
        json["rewardWalletBalance"]?.toString() ??
        json["rewardBalance"]?.toString() ??
        json["rewardsBalance"]?.toString() ??
        json["loyaltyBalance"]?.toString() ??
        json["pointsBalance"]?.toString() ??
        json["referralBalance"]?.toString(),
    walletBalance: json["walletBalance"]?.toString(),
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "email": email,
    "name": name,
    "token": token,
    "role": role,
    "passwordSet": passwordSet,
    "memberType": memberType,
    "referralBalance": referralBalance,
    "memberRewardsWallet": memberRewardsWallet,
    "walletBalance": walletBalance,
  };
}
