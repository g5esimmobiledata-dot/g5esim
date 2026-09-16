// To parse this JSON data, do
//
//     final eSimInstructionsModel = eSimInstructionsModelFromJson(jsonString);

import 'dart:convert';

ESimInstructionsModel eSimInstructionsModelFromJson(String str) =>
    ESimInstructionsModel.fromJson(json.decode(str));

String eSimInstructionsModelToJson(ESimInstructionsModel data) =>
    json.encode(data.toJson());

class ESimInstructionsModel {
  Instructions? instructions;

  ESimInstructionsModel({this.instructions});

  factory ESimInstructionsModel.fromJson(Map<String, dynamic> json) =>
      ESimInstructionsModel(
        instructions: json["instructions"] == null
            ? null
            : Instructions.fromJson(json["instructions"]),
      );

  Map<String, dynamic> toJson() => {"instructions": instructions?.toJson()};
}

class Instructions {
  String? qrCode;
  String? manualCode;
  String? smdpAddress;
  String? activationCode;
  String? apnType;
  dynamic apnValue;
  bool? isRoaming;
  dynamic directAppleUrl;
  List<dynamic>? steps;

  Instructions({
    this.qrCode,
    this.manualCode,
    this.smdpAddress,
    this.activationCode,
    this.apnType,
    this.apnValue,
    this.isRoaming,
    this.directAppleUrl,
    this.steps,
  });

  factory Instructions.fromJson(Map<String, dynamic> json) => Instructions(
    qrCode:
        json["qr_code"] ??
        json["qrCode"] ??
        json["qrCodeUrl"] ??
        json["qrcode"] ??
        json["qrcode_url"],
    manualCode: json["manual_code"] ?? json["manualCode"] ?? json["lpaCode"],
    smdpAddress: json["smdp_address"] ?? json["smdpAddress"],
    activationCode: json["activation_code"] ?? json["activationCode"],
    apnType: json["apn_type"] ?? json["apnType"],
    apnValue: json["apn_value"] ?? json["apnValue"],
    isRoaming: json["is_roaming"] ?? json["isRoaming"],
    directAppleUrl: json["direct_apple_url"] ?? json["directAppleUrl"],
    steps: json["steps"] == null
        ? []
        : List<dynamic>.from(json["steps"]!.map((x) => x)),
  );

  Map<String, dynamic> toJson() => {
    "qr_code": qrCode,
    "manual_code": manualCode,
    "smdp_address": smdpAddress,
    "activation_code": activationCode,
    "apn_type": apnType,
    "apn_value": apnValue,
    "is_roaming": isRoaming,
    "direct_apple_url": directAppleUrl,
    "steps": steps == null ? [] : List<dynamic>.from(steps!.map((x) => x)),
  };
}
