// To parse this JSON data, do
//
//     final privacyPolicyModel = privacyPolicyModelFromJson(jsonString);

import 'dart:convert';

PrivacyPolicyModel privacyPolicyModelFromJson(String str) =>
    PrivacyPolicyModel.fromJson(json.decode(str));

String privacyPolicyModelToJson(PrivacyPolicyModel data) =>
    json.encode(data.toJson());

class PrivacyPolicyModel {
  bool? success;
  List<Datum>? data;

  PrivacyPolicyModel({this.success, this.data});

  factory PrivacyPolicyModel.fromJson(Map<String, dynamic> json) =>
      PrivacyPolicyModel(
        success: json["success"],
        data: json["data"] == null
            ? []
            : List<Datum>.from(json["data"]!.map((x) => Datum.fromJson(x))),
      );

  Map<String, dynamic> toJson() => {
    "success": success,
    "data": data == null
        ? []
        : List<dynamic>.from(data!.map((x) => x.toJson())),
  };
}

class Datum {
  String? id;
  String? slug;
  String? title;
  String? content;
  dynamic metaTitle;
  dynamic metaDescription;
  bool? isPublished;
  DateTime? createdAt;
  DateTime? updatedAt;

  Datum({
    this.id,
    this.slug,
    this.title,
    this.content,
    this.metaTitle,
    this.metaDescription,
    this.isPublished,
    this.createdAt,
    this.updatedAt,
  });

  factory Datum.fromJson(Map<String, dynamic> json) => Datum(
    id: json["id"],
    slug: json["slug"],
    title: json["title"],
    content: json["content"],
    metaTitle: json["metaTitle"],
    metaDescription: json["metaDescription"],
    isPublished: json["isPublished"],
    createdAt: json["createdAt"] == null
        ? null
        : DateTime.parse(json["createdAt"]),
    updatedAt: json["updatedAt"] == null
        ? null
        : DateTime.parse(json["updatedAt"]),
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "slug": slug,
    "title": title,
    "content": content,
    "metaTitle": metaTitle,
    "metaDescription": metaDescription,
    "isPublished": isPublished,
    "createdAt": createdAt?.toIso8601String(),
    "updatedAt": updatedAt?.toIso8601String(),
  };
}
