// To parse this JSON data, do
//
//     final userProfileModel = userProfileModelFromJson(jsonString);

import 'dart:convert';

UserProfileModel userProfileModelFromJson(String str) =>
    UserProfileModel.fromJson(json.decode(str));

String userProfileModelToJson(UserProfileModel data) =>
    json.encode(data.toJson());

dynamic _readImagePath(Map<String, dynamic> json) {
  return json["imagePath"] ??
      json["image_path"] ??
      json["profileImage"] ??
      json["profile_image"] ??
      json["avatar"] ??
      json["photo"];
}

class UserProfileModel {
  bool? success;
  String? message;
  Data? data;

  UserProfileModel({this.success, this.message, this.data});

  factory UserProfileModel.fromJson(Map<String, dynamic> json) =>
      UserProfileModel(
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
  Destination? destination;
  String? memberType;
  String? referralBalance;
  String? memberRewardsWallet;
  String? walletBalance;
  dynamic conciergeStatus;
  dynamic conciergeTrialUsed;
  dynamic conciergeTrialAvailable;
  dynamic conciergeSubscription;
  DateTime? createdAt;
  DateTime? updatedAt;
  CurrencyRate? currencyRate;
  dynamic unreadNotificationCount;

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
    this.memberType,
    this.referralBalance,
    this.memberRewardsWallet,
    this.walletBalance,
    this.conciergeStatus,
    this.conciergeTrialUsed,
    this.conciergeTrialAvailable,
    this.conciergeSubscription,
    this.createdAt,
    this.updatedAt,
    this.currencyRate,
    this.unreadNotificationCount,
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
    destination: json["destination"] == null
        ? null
        : Destination.fromJson(json["destination"]),
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
    conciergeStatus:
        json["conciergeStatus"] ??
        json["concierge_status"] ??
        json["conciergeAccess"] ??
        json["concierge_access"],
    conciergeTrialUsed:
        json["conciergeTrialUsed"] ??
        json["concierge_trial_used"] ??
        json["hasUsedConciergeTrial"],
    conciergeTrialAvailable:
        json["conciergeTrialAvailable"] ??
        json["concierge_trial_available"] ??
        json["canUseConciergeTrial"],
    conciergeSubscription:
        json["conciergeSubscription"] ??
        json["concierge_subscription"] ??
        json["concierge"],
    createdAt: json["createdAt"] == null
        ? null
        : DateTime.parse(json["createdAt"]),
    updatedAt: json["updatedAt"] == null
        ? null
        : DateTime.parse(json["updatedAt"]),
    currencyRate: json["currencyRate"] == null
        ? null
        : CurrencyRate.fromJson(json["currencyRate"]),
    unreadNotificationCount: json["unreadNotificationCount"],
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
    "destination": destination?.toJson(),
    "memberType": memberType,
    "referralBalance": referralBalance,
    "memberRewardsWallet": memberRewardsWallet,
    "walletBalance": walletBalance,
    "conciergeStatus": conciergeStatus,
    "conciergeTrialUsed": conciergeTrialUsed,
    "conciergeTrialAvailable": conciergeTrialAvailable,
    "conciergeSubscription": conciergeSubscription,
    "createdAt": createdAt?.toIso8601String(),
    "updatedAt": updatedAt?.toIso8601String(),
    "currencyRate": currencyRate?.toJson(),
    "unreadNotificationCount": unreadNotificationCount,
  };
}

class CurrencyRate {
  String? id;
  String? code;
  String? name;
  String? symbol;
  String? conversionRate;
  bool? isDefault;
  bool? isEnabled;
  DateTime? createdAt;
  DateTime? updatedAt;

  CurrencyRate({
    this.id,
    this.code,
    this.name,
    this.symbol,
    this.conversionRate,
    this.isDefault,
    this.isEnabled,
    this.createdAt,
    this.updatedAt,
  });

  factory CurrencyRate.fromJson(Map<String, dynamic> json) => CurrencyRate(
    id: json["id"],
    code: json["code"],
    name: json["name"],
    symbol: json["symbol"],
    conversionRate: json["conversionRate"],
    isDefault: json["isDefault"],
    isEnabled: json["isEnabled"],
    createdAt: json["createdAt"] == null
        ? null
        : DateTime.parse(json["createdAt"]),
    updatedAt: json["updatedAt"] == null
        ? null
        : DateTime.parse(json["updatedAt"]),
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "code": code,
    "name": name,
    "symbol": symbol,
    "conversionRate": conversionRate,
    "isDefault": isDefault,
    "isEnabled": isEnabled,
    "createdAt": createdAt?.toIso8601String(),
    "updatedAt": updatedAt?.toIso8601String(),
  };
}

class Destination {
  String? id;
  dynamic airaloId;
  String? name;
  String? slug;
  String? countryCode;
  String? flagEmoji;
  dynamic image;
  bool? isTerritory;
  dynamic parentCountryCode;
  bool? active;
  DateTime? createdAt;
  DateTime? updatedAt;

  Destination({
    this.id,
    this.airaloId,
    this.name,
    this.slug,
    this.countryCode,
    this.flagEmoji,
    this.image,
    this.isTerritory,
    this.parentCountryCode,
    this.active,
    this.createdAt,
    this.updatedAt,
  });

  factory Destination.fromJson(Map<String, dynamic> json) => Destination(
    id: json["id"],
    airaloId: json["airaloId"],
    name: json["name"],
    slug: json["slug"],
    countryCode: json["countryCode"],
    flagEmoji: json["flagEmoji"],
    image: json["image"],
    isTerritory: json["isTerritory"],
    parentCountryCode: json["parentCountryCode"],
    active: json["active"],
    createdAt: json["createdAt"] == null
        ? null
        : DateTime.parse(json["createdAt"]),
    updatedAt: json["updatedAt"] == null
        ? null
        : DateTime.parse(json["updatedAt"]),
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "airaloId": airaloId,
    "name": name,
    "slug": slug,
    "countryCode": countryCode,
    "flagEmoji": flagEmoji,
    "image": image,
    "isTerritory": isTerritory,
    "parentCountryCode": parentCountryCode,
    "active": active,
    "createdAt": createdAt?.toIso8601String(),
    "updatedAt": updatedAt?.toIso8601String(),
  };
}
