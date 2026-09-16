class KYCResponse {
  final bool success;
  final KYCData data;
  final String message;

  KYCResponse({
    required this.success,
    required this.data,
    required this.message,
  });

  factory KYCResponse.fromJson(Map<String, dynamic> json) {
    return KYCResponse(
      success: json['success'],
      data: KYCData.fromJson(json['data']["document"]),
      message: json['message'],
    );
  }
}

class KYCData {
  String? id;
  String? userId;
  String? documentType;
  String? filePath;
  String? fileName;
  int? fileSize;
  String? mimeType;
  String? status;
  dynamic rejectionReason;
  DateTime? createdAt;

  KYCData({
    this.id,
    this.userId,
    this.documentType,
    this.filePath,
    this.fileName,
    this.fileSize,
    this.mimeType,
    this.status,
    this.rejectionReason,
    this.createdAt,
  });

  factory KYCData.fromJson(Map<String, dynamic> json) => KYCData(
    id: json["id"],
    userId: json["userId"],
    documentType: json["documentType"],
    filePath: json["filePath"],
    fileName: json["fileName"],
    fileSize: json["fileSize"],
    mimeType: json["mimeType"],
    status: json["status"],
    rejectionReason: json["rejectionReason"],
    createdAt: json["createdAt"] == null
        ? null
        : DateTime.parse(json["createdAt"]),
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "userId": userId,
    "documentType": documentType,
    "filePath": filePath,
    "fileName": fileName,
    "fileSize": fileSize,
    "mimeType": mimeType,
    "status": status,
    "rejectionReason": rejectionReason,
    "createdAt": createdAt?.toIso8601String(),
  };
}
