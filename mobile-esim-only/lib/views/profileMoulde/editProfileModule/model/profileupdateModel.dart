// To parse this JSON data, do
//
//     final profileUpdateModel = profileUpdateModelFromJson(jsonString);

import 'dart:convert';

ProfileUpdateModel profileUpdateModelFromJson(String str) =>
    ProfileUpdateModel.fromJson(json.decode(str));

String profileUpdateModelToJson(ProfileUpdateModel data) =>
    json.encode(data.toJson());

dynamic _readImagePath(Map<String, dynamic> json) {
  return json["imagePath"] ??
      json["image_path"] ??
      json["profileImage"] ??
      json["profile_image"] ??
      json["avatar"] ??
      json["photo"];
}

class ProfileUpdateModel {
  bool? success;
  String? message;
  Data? data;

  ProfileUpdateModel({this.success, this.message, this.data});

  factory ProfileUpdateModel.fromJson(Map<String, dynamic> json) =>
      ProfileUpdateModel(
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
  int? displayUserId;
  String? email;
  String? name;
  String? phone;
  String? address;
  dynamic hashedPassword;
  dynamic passwordSetAt;
  dynamic lastPasswordLoginAt;
  String? kycStatus;
  dynamic kycSubmittedAt;
  DateTime? kycReviewedAt;
  String? kycReviewedBy;
  String? kycRejectionReason;
  String? fcmToken;
  dynamic imagePath;
  dynamic deviceid;
  dynamic deviceType;
  dynamic deviceModel;
  dynamic appVersion;
  dynamic deviceManufacturer;
  dynamic deviceLocation;
  bool? isFromGoogle;
  bool? notifyLowData;
  bool? notifyExpiring;
  String? currency;
  String? destination;
  String? referralBalance;
  String? walletBalance;
  DateTime? createdAt;
  DateTime? updatedAt;

  Data({
    this.id,
    this.displayUserId,
    this.email,
    this.name,
    this.phone,
    this.address,
    this.hashedPassword,
    this.passwordSetAt,
    this.lastPasswordLoginAt,
    this.kycStatus,
    this.kycSubmittedAt,
    this.kycReviewedAt,
    this.kycReviewedBy,
    this.kycRejectionReason,
    this.fcmToken,
    this.imagePath,
    this.deviceid,
    this.deviceType,
    this.deviceModel,
    this.appVersion,
    this.deviceManufacturer,
    this.deviceLocation,
    this.isFromGoogle,
    this.notifyLowData,
    this.notifyExpiring,
    this.currency,
    this.destination,
    this.referralBalance,
    this.walletBalance,
    this.createdAt,
    this.updatedAt,
  });

  factory Data.fromJson(Map<String, dynamic> json) => Data(
    id: json["id"],
    displayUserId: json["displayUserId"],
    email: json["email"],
    name: json["name"],
    phone: json["phone"],
    address: json["address"],
    hashedPassword: json["hashedPassword"],
    passwordSetAt: json["passwordSetAt"],
    lastPasswordLoginAt: json["lastPasswordLoginAt"],
    kycStatus: json["kycStatus"],
    kycSubmittedAt: json["kycSubmittedAt"],
    kycReviewedAt: json["kycReviewedAt"] == null
        ? null
        : DateTime.parse(json["kycReviewedAt"]),
    kycReviewedBy: json["kycReviewedBy"],
    kycRejectionReason: json["kycRejectionReason"],
    fcmToken: json["fcmToken"],
    imagePath: _readImagePath(json),
    deviceid: json["deviceid"],
    deviceType: json["deviceType"],
    deviceModel: json["deviceModel"],
    appVersion: json["appVersion"],
    deviceManufacturer: json["deviceManufacturer"],
    deviceLocation: json["deviceLocation"],
    isFromGoogle: json["isFromGoogle"],
    notifyLowData: json["notifyLowData"],
    notifyExpiring: json["notifyExpiring"],
    currency: json["currency"],
    destination: json["destination"],
    referralBalance: json["referralBalance"]?.toString(),
    walletBalance: json["walletBalance"]?.toString(),
    createdAt: json["createdAt"] == null
        ? null
        : DateTime.parse(json["createdAt"]),
    updatedAt: json["updatedAt"] == null
        ? null
        : DateTime.parse(json["updatedAt"]),
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "displayUserId": displayUserId,
    "email": email,
    "name": name,
    "phone": phone,
    "address": address,
    "hashedPassword": hashedPassword,
    "passwordSetAt": passwordSetAt,
    "lastPasswordLoginAt": lastPasswordLoginAt,
    "kycStatus": kycStatus,
    "kycSubmittedAt": kycSubmittedAt,
    "kycReviewedAt": kycReviewedAt?.toIso8601String(),
    "kycReviewedBy": kycReviewedBy,
    "kycRejectionReason": kycRejectionReason,
    "fcmToken": fcmToken,
    "imagePath": imagePath,
    "deviceid": deviceid,
    "deviceType": deviceType,
    "deviceModel": deviceModel,
    "appVersion": appVersion,
    "deviceManufacturer": deviceManufacturer,
    "deviceLocation": deviceLocation,
    "isFromGoogle": isFromGoogle,
    "notifyLowData": notifyLowData,
    "notifyExpiring": notifyExpiring,
    "currency": currency,
    "destination": destination,
    "referralBalance": referralBalance,
    "walletBalance": walletBalance,
    "createdAt": createdAt?.toIso8601String(),
    "updatedAt": updatedAt?.toIso8601String(),
  };
}
