// To parse this JSON data, do
//
//     final getReviewModel = getReviewModelFromJson(jsonString);

import 'dart:convert';

List<GetReviewModel> getReviewModelFromJson(String str) =>
    List<GetReviewModel>.from(
      json.decode(str).map((x) => GetReviewModel.fromJson(x)),
    );

String getReviewModelToJson(List<GetReviewModel> data) =>
    json.encode(List<dynamic>.from(data.map((x) => x.toJson())));

class GetReviewModel {
  String? id;
  String? packageId;
  String? userId;
  String? orderId;
  int? rating;
  String? title;
  String? comment;
  dynamic pros;
  dynamic cons;
  bool? isVerifiedPurchase;
  bool? isApproved;
  dynamic approvedBy;
  dynamic approvedAt;
  int? helpfulCount;
  DateTime? createdAt;
  DateTime? updatedAt;

  GetReviewModel({
    this.id,
    this.packageId,
    this.userId,
    this.orderId,
    this.rating,
    this.title,
    this.comment,
    this.pros,
    this.cons,
    this.isVerifiedPurchase,
    this.isApproved,
    this.approvedBy,
    this.approvedAt,
    this.helpfulCount,
    this.createdAt,
    this.updatedAt,
  });

  factory GetReviewModel.fromJson(Map<String, dynamic> json) => GetReviewModel(
    id: json["id"],
    packageId: json["packageId"],
    userId: json["userId"],
    orderId: json["orderId"],
    rating: json["rating"],
    title: json["title"],
    comment: json["comment"],
    pros: json["pros"],
    cons: json["cons"],
    isVerifiedPurchase: json["isVerifiedPurchase"],
    isApproved: json["isApproved"],
    approvedBy: json["approvedBy"],
    approvedAt: json["approvedAt"],
    helpfulCount: json["helpfulCount"],
    createdAt: json["createdAt"] == null
        ? null
        : DateTime.parse(json["createdAt"]),
    updatedAt: json["updatedAt"] == null
        ? null
        : DateTime.parse(json["updatedAt"]),
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "packageId": packageId,
    "userId": userId,
    "orderId": orderId,
    "rating": rating,
    "title": title,
    "comment": comment,
    "pros": pros,
    "cons": cons,
    "isVerifiedPurchase": isVerifiedPurchase,
    "isApproved": isApproved,
    "approvedBy": approvedBy,
    "approvedAt": approvedAt,
    "helpfulCount": helpfulCount,
    "createdAt": createdAt?.toIso8601String(),
    "updatedAt": updatedAt?.toIso8601String(),
  };
}
