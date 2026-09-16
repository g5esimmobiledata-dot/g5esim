# eSIM Go API v2.5 Documentation

## Base Configuration
- **Base URL**: `https://api.esim-go.com/v2.5`
- **Authentication**: Header `X-API-Key: YOUR_API_KEY`
- **API Key Location**: https://sso.esim-go.com/login → Account Settings → API Details

## Authentication
All requests require the `X-API-Key` header:
```bash
curl -H 'X-API-Key: YOUR_API_KEY' https://api.esim-go.com/v2.5/catalogue
```

## Key Endpoints

### 1. Get Bundle Catalogue
**GET `/catalogue`**

Lists all available bundles for ordering.

**Query Parameters:**
- `bundleGroup` (optional) - Filter by bundle group (e.g., "Standard eSIM Bundles")
- `countries` (optional) - Comma-separated ISO country codes

**Bundle Naming Convention:**
`esim_{DATA}_{DAYS}_{COUNTRY}_{VERSION}`
Example: `esim_1GB_7D_NL_V2` = 1GB, 7 Days, Netherlands, Version 2

**Response Structure:**
```json
{
  "bundles": [
    {
      "name": "esim_1GB_7D_NL_V2",
      "bundleGroup": "Standard eSIM Bundles",
      "countries": ["NL"],
      "data": "1GB",
      "validity": 7,
      "price": 2.50,
      "currency": "USD"
    }
  ]
}
```

### 2. Create Order
**POST `/orders`**

Creates and processes orders for eSIM bundles. Supports validation mode and automatic assignment.

**Request Body:**
```json
{
  "type": "transaction",  // "validate" for test, "transaction" for actual purchase
  "bundle": [
    {
      "item": "esim_1GB_7D_NL_V2",  // Bundle name (case-sensitive)
      "quantity": 1,
      "assign": true,  // Auto-assign to eSIM
      "iccids": [""],  // Empty = new eSIM; or specify existing ICCID
      "profileID": "optional-branding-profile-id"
    }
  ],
  "allowReassign": true  // Assign to new ICCID if bundle incompatible
}
```

**Key Parameters:**
- `assign: true` + empty ICCID → creates new eSIM and assigns bundle
- `assign: true` + specified ICCID → assigns bundle to existing eSIM
- `assign: false` → purchases bundle into inventory (no assignment)
- `type: "validate"` → test order without charging balance
- `type: "transaction"` → actual purchase

**Response:**
```json
{
  "statusMessage": "Order completed",
  "reference": "e268b769-1cb3-4335-aed8-52ecb78425e9",
  "total": 2.50,
  "iccids": [{
    "iccid": "8944123456789012345",
    "smdpAddress": "rsp-1234.example.com",
    "matchingId": "ABCD-ABCD-ABCD-ABCD"
  }]
}
```

**Processing Time:** Usually instant, allow up to 10 minutes for full processing

**QR Code Format:**
`LPA:1$smdpAddress$matchingID`
Example: `LPA:1$rsp-1234.example.com$ABCD-ABCD-ABCD-ABCD`

### 3. List Orders
**GET `/orders`**

Retrieves order history with pagination and date filtering.

**Query Parameters:**
- `includeIccids` (boolean) - Include eSIM data in response
- `page` (integer) - Page number (default: 1)
- `limit` (integer) - Results per page (default: 10)
- `createdAt` (string) - Date filtering:
  ```
  createdAt=gte:2024-03-01T00:00:00.000Z&createdAt=lte:2024-03-31T23:59:59.999Z
  ```

**Example:**
```bash
GET /orders?includeIccids=true&page=1&limit=10
```

### 4. Get eSIM Details
**GET `/esims/{iccid}`**

Retrieves detailed information about a specific eSIM.

**Response includes:**
- ICCID
- Profile status (Released = not installed)
- Installation URL
- QR code data
- Customer reference

### 5. Get Bundle Usage
**GET `/esims/{iccid}/bundles/{bundleName}`**

Checks bundle status and remaining data for a specific eSIM.

**Path Parameters:**
- `iccid` - ICCID of the eSIM
- `bundleName` - Name of the bundle (case-sensitive)

**Response:**
```json
{
  "bundleName": "esim_1GB_7D_NL_V2",
  "status": "active",
  "dataRemaining": 536870912,  // bytes
  "dataTotal": 1073741824,      // bytes
  "expiryDate": "2024-12-31T23:59:59Z"
}
```

### 6. Update eSIM Details
**PUT `/esims`**

Associates custom identifier with an eSIM (e.g., customer order ID).

**Request Body:**
```json
{
  "iccid": "8944123456789012345",
  "customerRef": "order-12345"
}
```

### 7. Get eSIM Location
**GET `/esims/{iccid}/location`**

Gets most recent location and network operator information.

**Response:**
```json
{
  "mobileNetworkCode": "FRAF1",
  "networkName": "Orange",
  "networkBrandName": "Orange France",
  "country": "FR",
  "lastSeen": "2024-07-27T00:25:07.382562Z"
}
```

### 8. Get eSIM Install Details
**GET `/esims/assignments`**

Retrieves eSIM SMDP+ details based on order/apply references.

**Query Parameters:**
- `orderReference` - Order reference from create order response

**Special Feature:** Request `application/zip` content type to receive QR code images in ZIP format

## Webhooks

### Usage Callback
Configure webhooks in eSIM Portal to receive real-time usage updates.

**POST `your-usage-callback-url`** (configured in portal)

**Callback Payload:**
- Current bundle in use
- Remaining data
- Real-time notifications when data is consumed

**Benefits:**
- Real-time updates
- Usage tracking
- Automated responses
- Customizable notifications

## Rate Limits
Not explicitly documented - monitor response headers and implement exponential backoff

## Error Handling
Standard HTTP status codes:
- 200: Success
- 400: Bad Request (invalid parameters)
- 401: Unauthorized (invalid API key)
- 404: Not Found
- 500: Server Error

## Notes
- Bundle names are **case-sensitive**
- Find bundle names in `/catalogue` endpoint
- Test orders with `"type": "validate"` (no charge)
- Bundle assignment usually instant, max 10 minutes
- eSIM can be installed during bundle processing
