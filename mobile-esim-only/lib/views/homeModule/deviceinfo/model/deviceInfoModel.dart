// To parse this JSON data, do
//
//     final deviceInfoModel = deviceInfoModelFromJson(jsonString);

import 'dart:convert';

DeviceInfoModel deviceInfoModelFromJson(String str) => DeviceInfoModel.fromJson(json.decode(str));

String deviceInfoModelToJson(DeviceInfoModel data) => json.encode(data.toJson());

class DeviceInfoModel {
    bool? success;
    String? source;
    List<DeviceData>? data;

    DeviceInfoModel({
        this.success,
        this.source,
        this.data,
    });

    factory DeviceInfoModel.fromJson(Map<String, dynamic> json) => DeviceInfoModel(
        success: json["success"],
        source: json["source"],
        data: json["data"] == null ? [] : List<DeviceData>.from(json["data"]!.map((x) => DeviceData.fromJson(x))),
    );

    Map<String, dynamic> toJson() => {
        "success": success,
        "source": source,
        "data": data == null ? [] : List<dynamic>.from(data!.map((x) => x.toJson())),
    };
}

class DeviceData {
    Os? os;
    String? brand;
    String? name;

    DeviceData({
        this.os,
        this.brand,
        this.name,
    });

    factory DeviceData.fromJson(Map<String, dynamic> json) => DeviceData(
        os: osValues.map[json["os"]]!,
        brand: json["brand"],
        name: json["name"],
    );

    Map<String, dynamic> toJson() => {
        "os": osValues.reverse[os],
        "brand": brand,
        "name": name,
    };
}

enum Os {
    ANDROID,
    IOS
}

final osValues = EnumValues({
    "android": Os.ANDROID,
    "ios": Os.IOS
});

class EnumValues<T> {
    Map<String, T> map;
    late Map<T, String> reverseMap;

    EnumValues(this.map);

    Map<T, String> get reverse {
            reverseMap = map.map((k, v) => MapEntry(v, k));
            return reverseMap;
    }
}
