// To parse this JSON data, do
//
//     final referralHistoryModel = referralHistoryModelFromJson(jsonString);

import 'dart:convert';

ReferralHistoryModel referralHistoryModelFromJson(String str) =>
    ReferralHistoryModel.fromJson(json.decode(str));

String referralHistoryModelToJson(ReferralHistoryModel data) =>
    json.encode(data.toJson());

class ReferralHistoryModel {
  List<Referral>? referrals;
  Pagination? pagination;

  ReferralHistoryModel({this.referrals, this.pagination});

  factory ReferralHistoryModel.fromJson(Map<String, dynamic> json) =>
      ReferralHistoryModel(
        referrals: json["referrals"] == null
            ? []
            : List<Referral>.from(
                json["referrals"]!.map((x) => Referral.fromJson(x)),
              ),
        pagination: json["pagination"] == null
            ? null
            : Pagination.fromJson(json["pagination"]),
      );

  Map<String, dynamic> toJson() => {
    "referrals": referrals == null
        ? []
        : List<dynamic>.from(referrals!.map((x) => x.toJson())),
    "pagination": pagination?.toJson(),
  };
}

class Pagination {
  int? page;
  int? limit;
  int? total;
  int? totalPages;

  Pagination({this.page, this.limit, this.total, this.totalPages});

  factory Pagination.fromJson(Map<String, dynamic> json) => Pagination(
    page: json["page"],
    limit: json["limit"],
    total: json["total"],
    totalPages: json["totalPages"],
  );

  Map<String, dynamic> toJson() => {
    "page": page,
    "limit": limit,
    "total": total,
    "totalPages": totalPages,
  };
}

class Referral {
  String? id;
  String? referralCode;
  String? status;
  String? rewardAmount;
  bool? rewardPaid;
  DateTime? completedAt;
  DateTime? createdAt;
  String? referredUserEmail;
  String? referredUserName;

  Referral({
    this.id,
    this.referralCode,
    this.status,
    this.rewardAmount,
    this.rewardPaid,
    this.completedAt,
    this.createdAt,
    this.referredUserEmail,
    this.referredUserName,
  });

  factory Referral.fromJson(Map<String, dynamic> json) => Referral(
    id: json["id"],
    referralCode: json["referralCode"],
    status: json["status"],
    rewardAmount: json["rewardAmount"],
    rewardPaid: json["rewardPaid"],
    completedAt: json["completedAt"] == null
        ? null
        : DateTime.parse(json["completedAt"]),
    createdAt: json["createdAt"] == null
        ? null
        : DateTime.parse(json["createdAt"]),
    referredUserEmail: json["referredUserEmail"],
    referredUserName: json["referredUserName"],
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "referralCode": referralCode,
    "status": status,
    "rewardAmount": rewardAmount,
    "rewardPaid": rewardPaid,
    "completedAt": completedAt?.toIso8601String(),
    "createdAt": createdAt?.toIso8601String(),
    "referredUserEmail": referredUserEmail,
    "referredUserName": referredUserName,
  };
}
