// To parse this JSON data, do
//
//     final bannersModel = bannersModelFromJson(jsonString);

import 'dart:convert';

BannersModel bannersModelFromJson(String str) =>
    BannersModel.fromJson(json.decode(str));

String bannersModelToJson(BannersModel data) => json.encode(data.toJson());

class BannersModel {
  bool? success;
  String? message;
  List<Datum>? data;

  BannersModel({this.success, this.message, this.data});

  factory BannersModel.fromJson(Map<String, dynamic> json) => BannersModel(
    success: json["success"],
    message: json["message"],
    data: json["data"] == null
        ? []
        : List<Datum>.from(json["data"]!.map((x) => Datum.fromJson(x))),
  );

  Map<String, dynamic> toJson() => {
    "success": success,
    "message": message,
    "data": data == null
        ? []
        : List<dynamic>.from(data!.map((x) => x.toJson())),
  };
}

// id: b3890fd4-849e-42a2-91af-9b31e6c9cdba,
//     title: test1,
//     imageUrl: /uploads/banner/1767789972744-c4vr371k3d.jpg,
//     description: testdescription,
//     isActive: true,
//     position: 1,
//     packageId: 26fa8ef2-10a7-4067-b996-bc612aa4d488,
//     createdAt: 2026-01-07T12: 46: 12.748Z,
//     updatedAt: 2026-01-07T12: 46: 12.748Z
class Datum {
  String? id;
  String? title;
  String? imageUrl;
  String? description;
  bool? isActive;
  int? position;
  String? packageId;
  dynamic createdAt;
  dynamic updatedAt;

  Datum({
    this.id,
    this.title,
    this.imageUrl,
    this.description,
    this.isActive,
    this.position,
    this.packageId,
    this.createdAt,
    this.updatedAt,
  });

  factory Datum.fromJson(Map<String, dynamic> json) => Datum(
    id: json["id"],
    title: json["title"],
    imageUrl:
        json["imageUrl"] ??
        json["image_url"] ??
        json["image"] ??
        json["bannerImage"] ??
        json["banner_image"],
    description: json["description"],
    isActive: json["isActive"],
    position: json["position"],
    packageId: json["packageId"],
    createdAt: json["createdAt"],
    updatedAt: json["updatedAt"],
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "title": title,
    "imageUrl": imageUrl,
    "description": description,
    "isActive": isActive,
    "position": position,
    "packageId": packageId,
    "createdAt": createdAt,
    "updatedAt": updatedAt,
  };
}
