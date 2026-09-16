// To parse this JSON data, do
//
//     final faqModel = faqModelFromJson(jsonString);

import 'dart:convert';

FaqModel faqModelFromJson(String str) => FaqModel.fromJson(json.decode(str));

String faqModelToJson(FaqModel data) => json.encode(data.toJson());

class FaqModel {
  bool? success;
  List<Datum>? data;

  FaqModel({this.success, this.data});

  factory FaqModel.fromJson(Map<String, dynamic> json) => FaqModel(
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
  String? categoryId;
  String? question;
  String? answer;
  int? position;
  bool? isActive;
  int? views;
  DateTime? createdAt;
  DateTime? updatedAt;
  Category? category;

  Datum({
    this.id,
    this.categoryId,
    this.question,
    this.answer,
    this.position,
    this.isActive,
    this.views,
    this.createdAt,
    this.updatedAt,
    this.category,
  });

  factory Datum.fromJson(Map<String, dynamic> json) => Datum(
    id: json["id"],
    categoryId: json["categoryId"],
    question: json["question"],
    answer: json["answer"],
    position: json["position"],
    isActive: json["isActive"],
    views: json["views"],
    createdAt: json["createdAt"] == null
        ? null
        : DateTime.parse(json["createdAt"]),
    updatedAt: json["updatedAt"] == null
        ? null
        : DateTime.parse(json["updatedAt"]),
    category: json["category"] == null
        ? null
        : Category.fromJson(json["category"]),
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "categoryId": categoryId,
    "question": question,
    "answer": answer,
    "position": position,
    "isActive": isActive,
    "views": views,
    "createdAt": createdAt?.toIso8601String(),
    "updatedAt": updatedAt?.toIso8601String(),
    "category": category?.toJson(),
  };
}

class Category {
  String? id;
  String? name;
  String? slug;
  String? description;
  int? position;
  bool? isActive;
  DateTime? createdAt;
  DateTime? updatedAt;

  Category({
    this.id,
    this.name,
    this.slug,
    this.description,
    this.position,
    this.isActive,
    this.createdAt,
    this.updatedAt,
  });

  factory Category.fromJson(Map<String, dynamic> json) => Category(
    id: json["id"],
    name: json["name"],
    slug: json["slug"],
    description: json["description"],
    position: json["position"],
    isActive: json["isActive"],
    createdAt: json["createdAt"] == null
        ? null
        : DateTime.parse(json["createdAt"]),
    updatedAt: json["updatedAt"] == null
        ? null
        : DateTime.parse(json["updatedAt"]),
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "name": name,
    "slug": slug,
    "description": description,
    "position": position,
    "isActive": isActive,
    "createdAt": createdAt?.toIso8601String(),
    "updatedAt": updatedAt?.toIso8601String(),
  };
}
