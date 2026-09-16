// To parse this JSON data, do
//
//     final dataUsageModel = dataUsageModelFromJson(jsonString);

import 'dart:convert';

DataUsageModel dataUsageModelFromJson(String str) =>
    DataUsageModel.fromJson(json.decode(str));

String dataUsageModelToJson(DataUsageModel data) => json.encode(data.toJson());

class DataUsageModel {
  bool? success;
  String? message;
  List<Datum>? data;

  DataUsageModel({this.success, this.message, this.data});

  factory DataUsageModel.fromJson(Map<String, dynamic> json) => DataUsageModel(
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

class Datum {
  String? orderId;
  String? iccid;
  String? providerId;
  Usage? usage;

  Datum({this.orderId, this.iccid, this.providerId, this.usage});

  factory Datum.fromJson(Map<String, dynamic> json) => Datum(
    orderId: json["orderId"],
    iccid: json["iccid"],
    providerId: json["providerId"],
    usage: json["usage"] == null ? null : Usage.fromJson(json["usage"]),
  );

  Map<String, dynamic> toJson() => {
    "orderId": orderId,
    "iccid": iccid,
    "providerId": providerId,
    "usage": usage?.toJson(),
  };
}

class Usage {
  String? iccid;
  int? dataUsed;
  int? dataTotal;
  int? dataRemaining;
  double? percentageUsed;
  String? status;
  bool? isUnlimited;
  int? voiceRemaining;
  int? voiceTotal;
  int? textRemaining;
  int? textTotal;
  int? voiceUsed;
  int? textUsed;
  int? voicePercentageUsed;
  int? textPercentageUsed;
  DateTime? activatedAt;
  DateTime? expiresAt;

  Usage({
    this.iccid,
    this.dataUsed,
    this.dataTotal,
    this.dataRemaining,
    this.percentageUsed,
    this.status,
    this.isUnlimited,
    this.voiceRemaining,
    this.voiceTotal,
    this.textRemaining,
    this.textTotal,
    this.voiceUsed,
    this.textUsed,
    this.voicePercentageUsed,
    this.textPercentageUsed,
    this.activatedAt,
    this.expiresAt,
  });

  factory Usage.fromJson(Map<String, dynamic> json) => Usage(
    iccid: json["iccid"],
    dataUsed: json["dataUsed"],
    dataTotal: json["dataTotal"],
    dataRemaining: json["dataRemaining"],
    percentageUsed: json["percentageUsed"]?.toDouble(),
    status: json["status"],
    isUnlimited: json["isUnlimited"],
    voiceRemaining: json["voiceRemaining"],
    voiceTotal: json["voiceTotal"],
    textRemaining: json["textRemaining"],
    textTotal: json["textTotal"],
    voiceUsed: json["voiceUsed"],
    textUsed: json["textUsed"],
    voicePercentageUsed: json["voicePercentageUsed"],
    textPercentageUsed: json["textPercentageUsed"],
    activatedAt: json["activatedAt"] == null
        ? null
        : DateTime.parse(json["activatedAt"]),
    expiresAt: json["expiresAt"] == null
        ? null
        : DateTime.parse(json["expiresAt"]),
  );

  Map<String, dynamic> toJson() => {
    "iccid": iccid,
    "dataUsed": dataUsed,
    "dataTotal": dataTotal,
    "dataRemaining": dataRemaining,
    "percentageUsed": percentageUsed,
    "status": status,
    "isUnlimited": isUnlimited,
    "voiceRemaining": voiceRemaining,
    "voiceTotal": voiceTotal,
    "textRemaining": textRemaining,
    "textTotal": textTotal,
    "voiceUsed": voiceUsed,
    "textUsed": textUsed,
    "voicePercentageUsed": voicePercentageUsed,
    "textPercentageUsed": textPercentageUsed,
    "activatedAt": activatedAt?.toIso8601String(),
    "expiresAt": expiresAt?.toIso8601String(),
  };
}
