import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { generateOTPEmail, sendEmail } from "../email";
import { awardRegistrationBonus } from "../utils/registrationBonus";
import { generateToken } from "../utils/auth";
import * as ApiResponse from "../utils/response";
import {
  buildTelegramDisplayName,
  getTelegramAccountLink,
  getTelegramBotUsername,
  toPublicTelegramUser,
  touchTelegramAccountLink,
  upsertTelegramAccountLink,
  validateTelegramInitData,
} from "../services/telegram-miniapp-service";
import { assertLoginAllowed, recordLoginActivity } from "../services/security-service";
import { getOrCreateUserSipAccount, toPublicUserSipAccount } from "../services/user-sip-service";

const router = Router();

function saveSession(req: Request) {
  return new Promise<void>((resolve, reject) => {
    req.session.save((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function generateTelegramOtp() {
  if (process.env.NODE_ENV === "development") return "123456";
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function getLoginSipAccount(userId: string) {
  try {
    const account = await getOrCreateUserSipAccount(userId);
    return toPublicUserSipAccount(account);
  } catch {
    return null;
  }
}

async function buildLoginPayload(req: Request, user: any, source: string) {
  await assertLoginAllowed(req, user);
  req.session.userId = user.id;
  await saveSession(req);
  await recordLoginActivity(req, user, source);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    accountMode: user.accountMode,
    walletBalance: user.walletBalance ?? "0.00",
    token: generateToken(user),
    passwordSet: !!user.hashedPassword,
    sipAccount: await getLoginSipAccount(user.id),
  };
}

async function requireTelegram(initData: unknown) {
  if (typeof initData !== "string" || !initData.trim()) {
    throw new Error("Open this page from Telegram to continue");
  }

  return validateTelegramInitData(initData);
}

router.get("/config", (_req: Request, res: Response) => {
  return ApiResponse.success(res, "Telegram Mini App config", {
    botUsername: getTelegramBotUsername(),
    configured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
  });
});

router.post("/auth", async (req: Request, res: Response) => {
  try {
    const telegram = await requireTelegram(req.body?.initData);
    const telegramUserId = String(telegram.user.id);
    const link = await getTelegramAccountLink(telegramUserId);

    if (!link) {
      return ApiResponse.success(res, "Telegram account needs email linking", {
        linked: false,
        telegramUser: toPublicTelegramUser(telegram.user),
      });
    }

    const user = await storage.getUser(link.user_id);
    if (!user || user.isDeleted) {
      return ApiResponse.badRequest(res, "This Telegram account is not linked to an active G5eSIM account");
    }

    if (user.isBlocked && !user.isDeleted) {
      return ApiResponse.badRequest(res, "Your account has been blocked. Please contact support.");
    }

    await touchTelegramAccountLink(telegram.user);
    const login = await buildLoginPayload(req, user, "telegram_mini_app");

    return ApiResponse.success(res, "Telegram login successful", {
      linked: true,
      user: login,
      telegramUser: toPublicTelegramUser(telegram.user),
    });
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Telegram login failed");
  }
});

router.post("/link/start", async (req: Request, res: Response) => {
  try {
    const telegram = await requireTelegram(req.body?.initData);
    const email = normalizeEmail(req.body?.email);

    if (!isValidEmail(email)) {
      return ApiResponse.badRequest(res, "Please enter a valid email address");
    }

    const existingLink = await getTelegramAccountLink(String(telegram.user.id));
    if (existingLink) {
      const linkedUser = await storage.getUser(existingLink.user_id);
      if (linkedUser && !linkedUser.isDeleted) {
        return ApiResponse.success(res, "Telegram account is already linked", {
          alreadyLinked: true,
          email: linkedUser.email,
        });
      }
    }

    const code = generateTelegramOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await storage.createOTP({
      email,
      code,
      expiresAt,
      verified: false,
      purpose: "telegram_link",
    });

    const emailContent = await generateOTPEmail(code);
    await sendEmail({
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    return ApiResponse.success(res, "Verification code sent", {
      email,
      expiresInSeconds: 600,
    });
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Could not send verification code");
  }
});

router.post("/link/verify", async (req: Request, res: Response) => {
  try {
    const telegram = await requireTelegram(req.body?.initData);
    const email = normalizeEmail(req.body?.email);
    const otp = String(req.body?.otp || "").trim();

    if (!isValidEmail(email)) {
      return ApiResponse.badRequest(res, "Please enter a valid email address");
    }
    if (!otp) {
      return ApiResponse.badRequest(res, "Verification code is required");
    }

    const validOtp = await storage.verifyOTP(email, otp, "telegram_link");
    if (!validOtp) {
      return ApiResponse.badRequest(res, "Invalid or expired verification code");
    }

    const existingLink = await getTelegramAccountLink(String(telegram.user.id));
    let user = await storage.getUserByEmail(email);

    if (existingLink && user && existingLink.user_id !== user.id) {
      return ApiResponse.badRequest(res, "This Telegram account is already linked to another G5eSIM account");
    }

    if (!user) {
      user = await storage.createUser({
        email,
        name: buildTelegramDisplayName(telegram.user),
        imagePath: telegram.user.photo_url,
        kycStatus: "pending",
      });
      await awardRegistrationBonus(user.id, { source: "telegram_mini_app" });
    } else {
      if (user.isDeleted) {
        return ApiResponse.badRequest(res, "Your account has been deleted or deactivated. Please contact support.");
      }
      if (user.isBlocked && !user.isDeleted) {
        return ApiResponse.badRequest(res, "Your account has been blocked. Please contact support.");
      }

      await storage.updateUser(user.id, {
        ...(!user.name ? { name: buildTelegramDisplayName(telegram.user) } : {}),
        ...(telegram.user.photo_url && !user.imagePath ? { imagePath: telegram.user.photo_url } : {}),
      });
      user = await storage.getUser(user.id);
    }

    if (!user) {
      return ApiResponse.badRequest(res, "Could not link this account");
    }

    await upsertTelegramAccountLink(user.id, telegram.user);
    const login = await buildLoginPayload(req, user, "telegram_mini_app_link");

    return ApiResponse.success(res, "Telegram account linked", {
      linked: true,
      user: login,
      telegramUser: toPublicTelegramUser(telegram.user),
    });
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Could not verify Telegram account");
  }
});

export default router;
