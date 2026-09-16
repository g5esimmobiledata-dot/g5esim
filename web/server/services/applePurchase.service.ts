import axios from "axios";
import jwt from "jsonwebtoken";
import { db } from "../db";

const PROD_URL = process.env.APPLE_PROD_URL || "https://buy.itunes.apple.com/verifyReceipt";
const SANDBOX_URL = process.env.APPLE_SANDBOX_URL || "https://sandbox.itunes.apple.com/verifyReceipt";

export const verifyAppleReceipt = async (
    receiptData: any,
    useSandbox = false
) => {
    // 1️⃣ Extract Transaction ID from Object, JWS String, or direct String
    let transactionId: string | null = null;
    let isBase64Legacy = false;

    if (typeof receiptData === "string") {
        if (receiptData.startsWith("eyJ")) {
            // It's a JWS string
            try {
                const payload = JSON.parse(Buffer.from(receiptData.split(".")[1], "base64").toString("utf8"));
                transactionId = payload.transactionId;
            } catch (e) {
                console.error("Failed to parse JWS token:", e);
            }
        } else if (!receiptData.startsWith("MI") && receiptData.length < 100) {
            // Likely a direct transactionId string
            transactionId = receiptData;
        } else {
            // Likely a Legacy PKCS#7 Base64 Receipt
            isBase64Legacy = true;
        }
    } else if (typeof receiptData === "object" && receiptData !== null) {
        // It's a JSON object matching the frontend payload
        transactionId = receiptData.transactionId || receiptData.transaction_id;

        // Support Flutter/React Native wrapper shapes
        if (!transactionId && receiptData.verificationData) {
            const vData = receiptData.verificationData;
            const childData = vData.serverVerificationData || vData.localVerificationData;

            if (childData && typeof childData === "string") {
                if (childData.startsWith("eyJ")) {
                    try {
                        const payload = JSON.parse(Buffer.from(childData.split(".")[1], "base64").toString("utf8"));
                        transactionId = payload.transactionId;
                    } catch (e) { }
                } else if (!childData.startsWith("MI") && childData.length < 100) {
                    transactionId = childData;
                } else {
                    isBase64Legacy = true;
                    // Overwrite receiptData to be the unwrapped Legacy string so it works in step 3
                    receiptData = childData;
                }
            }
        }
    }

    // 2️⃣ StoreKit 2 Server API Verification
    if (transactionId && !isBase64Legacy) {
        try {
            // Fetch credentials dynamically from database settings
            const settings = await db.query.settings.findMany();
            const getSetting = (key: string, fallback: string | undefined = undefined) => {
                const val = settings.find(s => s.key === key)?.value;
                return val && val.trim().length > 0 ? val : fallback;
            };

            const issuerId = getSetting("apple_issuer_id", process.env.IOS_ISSUER_ID)!;
            const bundleId = getSetting("apple_bundle_id", process.env.IOS_BUNDLE_ID)!;
            const keyId = getSetting("apple_key_id", process.env.IOS_KEY_ID)!;
            const privateKeyRaw = getSetting("apple_private_key", process.env.IOS_PRIVATE_KEY);
            const privateKey = privateKeyRaw ? privateKeyRaw.replace(/\\n/g, "\n") : "";

            // Generate App Store Server API JWT (Needs 'bid' inside the token)
            const token = jwt.sign(
                {
                    iss: issuerId,
                    iat: Math.floor(Date.now() / 1000),
                    exp: Math.floor(Date.now() / 1000) + 20 * 60,
                    aud: "appstoreconnect-v1",
                    bid: bundleId,
                },
                privateKey,
                {
                    algorithm: "ES256",
                    keyid: keyId,
                }
            );

            const baseUrl = useSandbox
                ? "https://api.storekit-sandbox.itunes.apple.com"
                : "https://api.storekit.itunes.apple.com";

            const response = await axios.get(`${baseUrl}/inApps/v1/transactions/${transactionId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json"
                },
                timeout: 30000
            });

            // Parse Apple's verified signed JWS transaction
            const signedInfo = response.data.signedTransactionInfo;
            if (!signedInfo) {
                return { status: 21002 };
            }

            const verifiedPayload = JSON.parse(Buffer.from(signedInfo.split(".")[1], "base64").toString("utf8"));

            // Translate StoreKit 2 payload into the legacy JSON shape 
            // the server router `/api/iap/verify` expects
            return {
                status: 0,
                environment: verifiedPayload.environment === "Sandbox" ? "Sandbox" : "Production",
                latest_receipt_info: [
                    {
                        transaction_id: String(verifiedPayload.transactionId),
                        product_id: verifiedPayload.productId,
                        original_transaction_id: String(verifiedPayload.originalTransactionId),
                        purchase_date_ms: String(verifiedPayload.purchaseDate),
                    },
                ],
            };
        } catch (error: any) {
            // Apple returns 404 (and sometimes 401) if a sandbox transaction is searched on the production endpoint
            if ((error.response?.status === 404 || error.response?.status === 401) && !useSandbox) {
                return { status: 21007 }; // Trigger sandbox fallback
            }
            console.error("[IAP] StoreKit 2 Validation Error:", error.response?.data || error.message);
            return { status: 21002 };
        }
    }

    // 3️⃣ Legacy App Receipt Verification (Base64 PKCS#7 Sequence -> MI...)
    const url = useSandbox ? SANDBOX_URL : PROD_URL;
    try {
        const settings = await db.query.settings.findMany();
        const getSetting = (key: string, fallback: string | undefined = undefined) => {
            const val = settings.find(s => s.key === key)?.value;
            return val && val.trim().length > 0 ? val : fallback;
        };
        const sharedSecret = getSetting("apple_shared_secret", process.env.APPLE_SHARED_SECRET);

        const response = await axios.post(url, {
            "receipt-data": receiptData,
            password: sharedSecret,
            "exclude-old-transactions": true,
        });
        return response.data;
    } catch (error: any) {
        console.error("[IAP] Legacy Validation Error:", error.message);
        return { status: 21002 };
    }
};
