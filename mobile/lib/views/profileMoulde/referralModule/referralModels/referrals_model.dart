// To parse this JSON data, do
//
//     final referralModel = referralModelFromJson(jsonString);

import 'dart:convert';

ReferralModel referralModelFromJson(String str) =>
    ReferralModel.fromJson(json.decode(str));

String referralModelToJson(ReferralModel data) => json.encode(data.toJson());

class ReferralModel {
  String? id;
  String? userId;
  String? referralCode;
  int? totalReferrals;
  String? totalEarnings;
  DateTime? createdAt;
  DateTime? updatedAt;
  String? shareUrl;

  ReferralModel({
    this.id,
    this.userId,
    this.referralCode,
    this.totalReferrals,
    this.totalEarnings,
    this.createdAt,
    this.updatedAt,
    this.shareUrl,
  });

  factory ReferralModel.fromJson(Map<String, dynamic> json) => ReferralModel(
    id: json["id"],
    userId: json["userId"],
    referralCode: json["referralCode"],
    totalReferrals: json["totalReferrals"],
    totalEarnings: json["totalEarnings"],
    createdAt: json["createdAt"] == null
        ? null
        : DateTime.parse(json["createdAt"]),
    updatedAt: json["updatedAt"] == null
        ? null
        : DateTime.parse(json["updatedAt"]),
    shareUrl: json["shareUrl"],
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "userId": userId,
    "referralCode": referralCode,
    "totalReferrals": totalReferrals,
    "totalEarnings": totalEarnings,
    "createdAt": createdAt?.toIso8601String(),
    "updatedAt": updatedAt?.toIso8601String(),
    "shareUrl": shareUrl,
  };
}
