"use strict";

export interface EsimAccessPackageListItem {
  packageCode: string;
  slug: string;
  name: string;
  price: number;
  currencyCode: string;
  volume: number;
  smsStatus: number;
  dataType: number;
  unusedValidTime: number;
  duration: number;
  durationUnit: string;
  location: string;
  description: string;
  activeType: number;
  favorite: boolean;
  retailPrice: number;
  speed: string;
  ipExport: string;
  supportTopUpType: number;
  locationNetworkList?: Array<{
    locationName: string;
    locationLogo: string;
    operatorList: Array<{
      operatorName: string;
      networkType: string;
    }>;
  }>;
}

export interface EsimAccessPackageListResponse {
  success: boolean;
  obj: {
    packageList: EsimAccessPackageListItem[];
  };
}

export interface EsimAccessOrderResponse {
  success: boolean;
  obj: {
    orderNo: string;
    totalPrice: number;
    quantity: number;
  };
}

export interface EsimAccessQueryResponse {
  success: boolean;
  obj: {
    orderNo: string;
    packageCode: string;
    iccid: string;
    smdpAddress: string;
    matchingId: string;
    qrcode: string;
    status: string;
    dataUsed: number;
    dataTotal: number;
    remainingData: number;
    expiryDate?: string;
  };
}

export interface EsimAccessTopupListResponse {
  success: boolean;
  obj: {
    packageList: Array<{
      packageCode: string;
      slug: string;
      name: string;
      price: number;
      currencyCode: string;
      volume: number;
      duration: number;
      durationUnit: string;
    }>;
  };
}

export interface EsimAccessTopupResponse {
  success: boolean;
  obj: {
    orderNo: string;
    totalPrice: number;
  };
}


export interface EsimOrderStatusResponse {
  orderNo: string;
  status: string;
  iccid?: string;
  qrCode?: string;
  lpa?: string;
  smdpAddress?: string;
  activationCode?: string;
  expiryDate?: string;
  dataRemaining?: number;
}