# eSIM Access API Documentation

## Base Configuration
- **Base URL**: `https://api.esimaccess.com`
- **Image Assets Base**: `https://static.redteago.com/`
- **API Key Location**: https://console.esimaccess.com/developer/index
- **Account Dashboard**: https://console.esimaccess.com

## Authentication

### Method 1: Simple API Key (Header Authentication)
Use the `AccessCode` in request headers:

```bash
curl --location 'https://api.esimaccess.com/api/v1/open/balance/query' \
  --header 'RT-AccessCode: YOUR_ACCESS_CODE' \
  --data ''
```

**Required Header:**
- `RT-AccessCode`: Your access code from eSIM Access console

### Method 2: HMAC Signature (Enhanced Security)
For production environments, use HMAC-SHA256 signature validation.

**Request Headers:**
- `RT-AccessCode` - Access Key (used in signData)
- `RT-RequestID` - Request ID (uuid.v4() format)
- `RT-Signature` - HMAC signature (HexString)
- `RT-Timestamp` - Request timestamp in milliseconds (as string)
- `SecretKey` - Used in signature (from your account)

**Signature Calculation:**
```javascript
// signData = Timestamp + RequestID + AccessCode + RequestBody
const signStr = RT-Timestamp + RT-RequestID + RT-AccessCode + requestBody
const signature = HMACSha256(signStr, secretKey).toLowerCase()
```

**Example:**
```
Timestamp=1628670421
RequestID=4ce9d9cdac9e4e17b3a2c66c358c1ce2
AccessCode=11111
SecretKey=1111
RequestBody={"imsi":"326543826"}
signStr=16286704214ce9d9cdac9e4e17b3a2c66c358c1ce211111{"imsi":"326543826"}
Signature=7EB765E27DF5373DEA2DBC8C41A7D9557743E46C8054750F3D851B3FD01D0835
```

## Key Endpoints

### 1. Get All Data Packages
**POST `/api/v1/open/package/list`**

Request a list of all available data packages. Optionally filter by country or region.

**Request Parameters:**
- `locationCode` (optional) - Alpha-2 ISO Country Code or:
  - `!RG` = Regional packages
  - `!GL` = Global packages
- `type` (optional) - `BASE` (default products) or `TOPUP` (top-up products)
- `packageCode` (optional) - Used with `TOPUP` to view top-ups for a package
- `slug` (optional) - Package alias (alternative to packageCode)
- `iccid` (optional) - Used with `TOPUP` to see available top-ups for an eSIM

**Request Body:**
```json
{
  "locationCode": "US",
  "type": "BASE"
}
```

**Response Structure:**
```json
{
  "errorCode": null,
  "errorMsg": null,
  "success": true,
  "obj": {
    "packageList": [
      {
        "packageCode": "JC016",
        "slug": "AU_1_7",
        "name": "Asia 11 countries 1GB 30 Days",
        "price": 10000,  // value * 10,000 (10000 = $1.00)
        "currencyCode": "USD",
        "volume": 1073741824,  // bytes
        "smsStatus": 0,  // 0=no SMS, 1=API+mobile, 2=API only
        "dataType": 1,  // 1=Total, 2=Daily(reduced), 3=Daily(cutoff), 4=Daily Unlimited
        "unusedValidTime": 30,  // days till invalid
        "duration": 30,
        "durationUnit": "DAY",
        "location": "CN,HK,ID,JP,MO,MY,PH,SG,KR,TW,TH",
        "description": "Asia 11 countries",
        "activeType": 1,  // 1=First install, 2=First network connection
        "favorite": false,
        "retailPrice": 71000,  // suggested retail price
        "speed": "3G/4G",
        "ipExport": "HK",  // data traffic exit country
        "supportTopUpType": 2,  // 1=no, 2=yes
        "locationNetworkList": [
          {
            "locationName": "Japan",
            "locationLogo": "/img/flags/jp.png",
            "operatorList": [
              {
                "operatorName": "NTT Docomo",
                "networkType": "4G/5G"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

**Package Fields:**
- `packageCode` - Unique package identifier
- `slug` - Package alias
- `price` - Wholesale price (multiply by 10,000 for USD)
- `volume` - Data volume in bytes
- `smsStatus` - SMS support level
- `dataType` - Data allocation type
- `activeType` - When package activates
- `supportTopUpType` - Whether top-ups are supported

### 2. Order Profiles
**POST `/api/v1/open/esim/order`**

Order eSIM profiles individually or in batch.

**Request Parameters:**
- `packageCode` (mandatory) - Package code or slug
- `quantity` (mandatory) - Number of eSIMs to order
- `price` (optional) - Package price (validation)
- `amount` (optional) - Total order price (validation)
- `periodNum` (optional) - For day-pass plans (number of periods)

**Request Body:**
```json
{
  "packageCode": "JC016",
  "quantity": 1
}
```

**Response:**
```json
{
  "errorCode": null,
  "errorMsg": null,
  "success": true,
  "obj": {
    "orderNo": "B25012220580005",
    "totalPrice": 10000,
    "quantity": 1
  }
}
```

**Note:** Order processing is asynchronous. Use webhooks or query endpoint to get eSIM details.

### 3. Query Order/eSIM Details
**POST `/api/v1/open/esim/query`**

Query eSIM details by order number or ICCID.

**Request Parameters:**
- `orderNo` (optional) - Order number from order response
- `iccid` (optional) - ICCID of the eSIM

**Request Body:**
```json
{
  "orderNo": "B25012220580005"
}
```

**Response:**
```json
{
  "errorCode": null,
  "errorMsg": null,
  "success": true,
  "obj": {
    "orderNo": "B25012220580005",
    "packageCode": "JC016",
    "iccid": "8943108170005579276",
    "smdpAddress": "rsp.redtea-mobile.com",
    "matchingId": "ABCD1234567890",
    "qrcode": "LPA:1$rsp.redtea-mobile.com$ABCD1234567890",
    "status": "ALLOCATED",  // PENDING, ALLOCATED, INSTALLED, etc.
    "dataUsed": 0,
    "dataTotal": 1073741824,
    "remainingData": 1073741824,
    "expiryDate": "2024-12-31T00:00:00.000Z"
  }
}
```

### 4. Top-up eSIM
**POST `/api/v1/open/esim/topup`**

Add data to an existing eSIM profile.

**Request Parameters:**
- `iccid` (mandatory) - ICCID of the eSIM
- `packageCode` (mandatory) - Top-up package code
- `quantity` (optional) - Number of top-ups (default: 1)

**Request Body:**
```json
{
  "iccid": "8943108170005579276",
  "packageCode": "JC016_TOPUP",
  "quantity": 1
}
```

### 5. Cancel Order
**POST `/api/v1/open/esim/cancel`**

Cancel an eSIM order (before installation).

**Request Parameters:**
- `iccid` (mandatory) - ICCID to cancel

**Request Body:**
```json
{
  "iccid": "8943108170005579276"
}
```

### 6. Query Balance
**POST `/api/v1/open/balance/query`**

Check account balance and last updated timestamp.

**Request Body:** Empty `{}`

**Response:**
```json
{
  "errorCode": null,
  "errorMsg": null,
  "success": true,
  "obj": {
    "balance": 1000000,  // balance * 10,000 ($100.00)
    "currencyCode": "USD",
    "lastUpdated": "2024-11-18T08:35:29.000Z"
  }
}
```

## Webhooks

eSIM Access supports webhooks for asynchronous notifications. Configure webhook URLs in your console.

### Webhook Types

#### 1. Order Status Webhook
Notifies when eSIM order is completed and ready for download.

**Webhook Payload:**
```json
{
  "orderNo": "B25012220580005",
  "iccid": "8943108170005579276",
  "status": "ALLOCATED",
  "packageCode": "JC016",
  "qrcode": "LPA:1$rsp.redtea-mobile.com$ABCD1234567890"
}
```

#### 2. Low Balance Webhook (Added Mar 8, 2025)
Notifies when eSIM data balance reaches thresholds.

**Trigger Points:**
- 25% remaining
- 10% remaining

**Webhook Payload:**
```json
{
  "iccid": "8943108170005579276",
  "orderNo": "B25012220580005",
  "packageCode": "JC016",
  "dataTotal": 1073741824,
  "dataRemaining": 268435456,  // 25% remaining
  "percentRemaining": 25,
  "alert": "LOW_DATA_25"
}
```

#### 3. SMDP+ Event Webhook (Added May 28, 2025)
SM-DP+ server events for advanced tracking.

### Webhook Security
- Implement HMAC signature validation using your SecretKey
- Verify `RT-Signature` header matches calculated signature
- Check `RT-Timestamp` to prevent replay attacks

## Rate Limits
- **8 requests per second** (enforced as of v1.5)
- Implement exponential backoff for rate limit errors

## Error Codes

### General Errors
- `000001` - Server error
- `000101` - Request header (mandatory) is null
- `000102` - Wrong request header format
- `000104` - Request in invalid JSON format
- `000106` - Request parameter (mandatory) is null

### Order Errors
- `200002` - Operation not allowed due to order status
- `200005` - Package price error
- `200007` - Insufficient account balance
- `200009` - Abnormal order status
- `200010` - Profile is being downloaded
- `200011` - Insufficient available profiles

### Not Found Errors
- `310241` - The packageCode does not exist
- `310272` - The orderNo does not exist
- `310403` - The ICCID does not exist in the order

## Standards
- **Time codes**: UTC format
- **Country codes**: Alpha-2 ISO (e.g., "US", "JP", "GB")
- **Data values**: Bytes
- **Price values**: Multiply by 10,000 for USD (10000 = $1.00)

## Notes
- No sandbox environment - cancel orders in live environment as needed
- Request test funds from eSIM Access if needed
- Orders are processed asynchronously - use webhooks for best experience
- Top-up packages must match base package type (country/regional)
- SMS sending available via separate endpoint (v1.4+)
- Day-pass plans support added in v1.5
