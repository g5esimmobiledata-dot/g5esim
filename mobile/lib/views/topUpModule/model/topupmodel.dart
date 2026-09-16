// To parse this JSON data, do
//
//     final topUpOption = topUpOptionFromJson(jsonString);

import 'dart:convert';

TopUpOption topUpOptionFromJson(String str) =>
    TopUpOption.fromJson(json.decode(str));

String topUpOptionToJson(TopUpOption data) => json.encode(data.toJson());

class TopUpOption {
  List<TopUpItems>? packages;
  int? topupMargin;
  String? providerId;

  TopUpOption({this.packages, this.topupMargin, this.providerId});

  factory TopUpOption.fromJson(Map<String, dynamic> json) => TopUpOption(
    packages: json["packages"] == null
        ? []
        : List<TopUpItems>.from(
      json["packages"]!.map((x) => TopUpItems.fromJson(x)),
    ),
    topupMargin: json["topupMargin"],
    providerId: json["providerId"],
  );

  Map<String, dynamic> toJson() => {
    "packages": packages == null
        ? []
        : List<dynamic>.from(packages!.map((x) => x.toJson())),
    "topupMargin": topupMargin,
    "providerId": providerId,
  };
}

class TopUpItems {
  String? providerPackageId;
  String? title;
  String? dataAmount;
  int? validity;
  double? wholesalePrice;
  String? currency;
  double? providerPrice;
  double? price;
  String? data;

  TopUpItems({
    this.providerPackageId,
    this.title,
    this.dataAmount,
    this.validity,
    this.wholesalePrice,
    this.currency,
    this.providerPrice,
    this.price,
    this.data,
  });

  factory TopUpItems.fromJson(Map<String, dynamic> json) => TopUpItems(
    providerPackageId: json["providerPackageId"],
    title: json["title"],
    dataAmount: json["dataAmount"],
    validity: json["validity"],
    wholesalePrice: json["wholesalePrice"]?.toDouble(),
    currency: json["currency"],
    providerPrice: json["provider_price"]?.toDouble(),
    price: json["price"]?.toDouble(),
    data: json["data"],
  );

  Map<String, dynamic> toJson() => {
    "providerPackageId": providerPackageId,
    "title": title,
    "dataAmount": dataAmount,
    "validity": validity,
    "wholesalePrice": wholesalePrice,
    "currency": currency,
    "provider_price": providerPrice,
    "price": price,
    "data": data,
  };
}
