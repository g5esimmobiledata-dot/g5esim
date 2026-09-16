class DeviceInfoModel {
  DeviceInfoModel({
    this.appId,
    this.appVersion,
    this.deviceId,
    this.deviceLocation,
    this.deviceManufacturer,
    this.deviceModel,
  });

  String? appId;
  String? deviceId;
  String? deviceLocation;
  String? deviceManufacturer;
  String? deviceModel;
  String? appVersion;

  factory DeviceInfoModel.fromJson(Map<String, dynamic> json) =>
      DeviceInfoModel();

  Map<String, dynamic> toJson() => {
    "appId": appId,
    "deviceId": deviceId,
    "deviceLocation": deviceLocation ?? "",
    "deviceManufacturer": deviceManufacturer,
    "deviceModel": deviceModel,
    "appVersion": appVersion,
  };
}
