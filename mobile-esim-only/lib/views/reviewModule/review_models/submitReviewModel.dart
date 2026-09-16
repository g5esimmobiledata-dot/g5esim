// To parse this JSON data, do
//
//     final submitReviewModel = submitReviewModelFromJson(jsonString);

import 'dart:convert';

SubmitReviewModel submitReviewModelFromJson(String str) =>
    SubmitReviewModel.fromJson(json.decode(str));

String submitReviewModelToJson(SubmitReviewModel data) =>
    json.encode(data.toJson());

class SubmitReviewModel {
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

  SubmitReviewModel({
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

  factory SubmitReviewModel.fromJson(Map<String, dynamic> json) =>
      SubmitReviewModel(
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
