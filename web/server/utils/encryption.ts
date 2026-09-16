"use strict";

import bcrypt from "bcrypt";
import crypto from "crypto";

const SALT_ROUNDS = 12;
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || process.env.SESSION_SECRET || "default-encryption-key-change-in-production";
  return crypto.createHash("sha256").update(key).digest();
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function encryptApiKey(plainText: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag();
  
  return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;
}

export function decryptApiKey(encryptedText: string): string {
  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(":");
    
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted format");
    }
    
    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (error) {
    console.error("Failed to decrypt API key:", error);
    return "";
  }
}

export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) return "****";
  return apiKey.substring(0, 4) + "..." + apiKey.substring(apiKey.length - 4);
}
