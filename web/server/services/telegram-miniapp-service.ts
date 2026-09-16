import crypto from "crypto";
import { pool } from "../db";

export type TelegramMiniAppUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
};

export type TelegramValidationResult = {
  authDate: Date;
  queryId?: string;
  startParam?: string;
  user: TelegramMiniAppUser;
};

const MAX_INIT_DATA_AGE_MS = 24 * 60 * 60 * 1000;

let telegramLinksTableReady = false;

export function getTelegramBotToken() {
  return String(process.env.TELEGRAM_BOT_TOKEN || "").trim();
}

export function getTelegramBotUsername() {
  return String(process.env.TELEGRAM_BOT_USERNAME || "G5esimBot").replace(/^@/, "").trim();
}

export function buildTelegramDisplayName(user: TelegramMiniAppUser) {
  const fullName = [user.first_name, user.last_name]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" ");

  return fullName || user.username || `Telegram ${user.id}`;
}

export function toPublicTelegramUser(user: TelegramMiniAppUser) {
  return {
    id: user.id,
    firstName: user.first_name || null,
    lastName: user.last_name || null,
    username: user.username || null,
    photoUrl: user.photo_url || null,
    languageCode: user.language_code || null,
    displayName: buildTelegramDisplayName(user),
  };
}

export function validateTelegramInitData(initData: string): TelegramValidationResult {
  const botToken = getTelegramBotToken();
  if (!botToken) {
    throw new Error("Telegram Mini App is not configured");
  }

  const params = new URLSearchParams(initData || "");
  const receivedHash = params.get("hash");
  if (!receivedHash) {
    throw new Error("Telegram authorization data is missing");
  }

  const pairs: string[] = [];
  params.forEach((value, key) => {
    if (key !== "hash") {
      pairs.push(`${key}=${value}`);
    }
  });

  const dataCheckString = pairs.sort().join("\n");
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  const received = Buffer.from(receivedHash, "hex");
  const calculated = Buffer.from(calculatedHash, "hex");
  if (received.length !== calculated.length || !crypto.timingSafeEqual(received, calculated)) {
    throw new Error("Telegram authorization data is invalid");
  }

  const authDateSeconds = Number(params.get("auth_date") || 0);
  if (!Number.isFinite(authDateSeconds) || authDateSeconds <= 0) {
    throw new Error("Telegram authorization date is missing");
  }

  const authDate = new Date(authDateSeconds * 1000);
  if (Date.now() - authDate.getTime() > MAX_INIT_DATA_AGE_MS) {
    throw new Error("Telegram authorization data has expired");
  }

  const rawUser = params.get("user");
  if (!rawUser) {
    throw new Error("Telegram user data is missing");
  }

  const user = JSON.parse(rawUser) as TelegramMiniAppUser;
  if (!user?.id) {
    throw new Error("Telegram user data is invalid");
  }

  return {
    authDate,
    queryId: params.get("query_id") || undefined,
    startParam: params.get("start_param") || params.get("tgWebAppStartParam") || undefined,
    user,
  };
}

export async function ensureTelegramMiniAppTables() {
  if (telegramLinksTableReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_account_links (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      telegram_user_id text NOT NULL UNIQUE,
      user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      telegram_username text,
      telegram_first_name text,
      telegram_last_name text,
      telegram_photo_url text,
      language_code text,
      last_auth_at timestamp NOT NULL DEFAULT now(),
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS telegram_account_links_user_id_idx
    ON telegram_account_links(user_id)
  `);

  telegramLinksTableReady = true;
}

export async function getTelegramAccountLink(telegramUserId: string) {
  await ensureTelegramMiniAppTables();
  const result = await pool.query(
    `
      SELECT *
      FROM telegram_account_links
      WHERE telegram_user_id = $1
      LIMIT 1
    `,
    [telegramUserId],
  );

  return result.rows[0] || null;
}

export async function upsertTelegramAccountLink(userId: string, telegramUser: TelegramMiniAppUser) {
  await ensureTelegramMiniAppTables();
  const telegramUserId = String(telegramUser.id);

  const result = await pool.query(
    `
      INSERT INTO telegram_account_links (
        telegram_user_id,
        user_id,
        telegram_username,
        telegram_first_name,
        telegram_last_name,
        telegram_photo_url,
        language_code,
        last_auth_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now())
      ON CONFLICT (telegram_user_id)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        telegram_username = EXCLUDED.telegram_username,
        telegram_first_name = EXCLUDED.telegram_first_name,
        telegram_last_name = EXCLUDED.telegram_last_name,
        telegram_photo_url = EXCLUDED.telegram_photo_url,
        language_code = EXCLUDED.language_code,
        last_auth_at = now(),
        updated_at = now()
      RETURNING *
    `,
    [
      telegramUserId,
      userId,
      telegramUser.username || null,
      telegramUser.first_name || null,
      telegramUser.last_name || null,
      telegramUser.photo_url || null,
      telegramUser.language_code || null,
    ],
  );

  return result.rows[0];
}

export async function touchTelegramAccountLink(telegramUser: TelegramMiniAppUser) {
  await ensureTelegramMiniAppTables();
  await pool.query(
    `
      UPDATE telegram_account_links
      SET
        telegram_username = $2,
        telegram_first_name = $3,
        telegram_last_name = $4,
        telegram_photo_url = $5,
        language_code = $6,
        last_auth_at = now(),
        updated_at = now()
      WHERE telegram_user_id = $1
    `,
    [
      String(telegramUser.id),
      telegramUser.username || null,
      telegramUser.first_name || null,
      telegramUser.last_name || null,
      telegramUser.photo_url || null,
      telegramUser.language_code || null,
    ],
  );
}
