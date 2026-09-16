import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

import { storage } from "../storage";

/**
 * Loads the Apple private key.
 * Priority:
 *   1. Settings database (apple_private_key)
 *   2. IOS_PRIVATE_KEY env variable (full PEM, newlines can be encoded as \n)
 *   3. storage/apple/<keyId>.p8 file
 */
async function loadApplePrivateKey(keyId: string): Promise<string> {
    const settings = await storage.getAllSettings();
    const dbKey = settings.find(s => s.key === "apple_private_key")?.value;
    if (dbKey && dbKey.trim().length > 0) {
        console.log("🔑 [Apple JWT] Key source: DATABASE");
        return dbKey.replace(/\\n/g, "\n");
    }

    // 1️⃣ Try env variable first
    const envKey = process.env.IOS_PRIVATE_KEY;
    console.log("🔑 [Apple JWT] IOS_KEY_ID:", process.env.IOS_KEY_ID);
    console.log("🔑 [Apple JWT] IOS_ISSUER_ID:", process.env.IOS_ISSUER_ID);
    console.log("🔑 [Apple JWT] Key source:", envKey ? `ENV (${envKey.length} chars)` : `FILE (${keyId}.p8)`);
    if (envKey && envKey.trim().length > 0) {
        // Support both literal newlines and escaped \n
        return envKey.replace(/\\n/g, "\n");
    }

    // 2️⃣ Fall back to .p8 file
    const privateKeyPath = path.join(
        process.cwd(),
        "storage/apple",
        `${keyId}.p8`
    );

    if (!fs.existsSync(privateKeyPath)) {
        throw new Error(
            `Apple private key not found. Set IOS_PRIVATE_KEY env variable or place the key at: ${privateKeyPath}`
        );
    }

    return fs.readFileSync(privateKeyPath, "utf8");
}

export const generateAppleJWT = async ({
    keyId,
    issuerId,
    bundleId,
}: {
    keyId: string;
    issuerId: string;
    bundleId: string;
}) => {
    const privateKey = await loadApplePrivateKey(keyId);

    const now = Math.floor(Date.now() / 1000);

    return jwt.sign(
        {
            iss: issuerId,
            iat: now,
            exp: now + 20 * 60,
            aud: "appstoreconnect-v1",
        },
        privateKey,
        {
            algorithm: "ES256",
            keyid: keyId,
        }
    );
};
