'use strict';

import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { storage } from '../storage';
import { asyncHandler } from '../lib/asyncHandler';
import { ValidationError, NotFoundError } from '../lib/errors';
import { logger } from '../lib/logger';
import { sendEmail, generateOTPEmail, generateWelcomeEmail } from '../email';
import { generateToken } from 'server/utils/auth';
import { requireAuth, requireAdmin } from 'server/middleware/auth';
import * as ApiResponse from '../utils/response';
import admin, { initFirebaseAdmin } from "../config/firebase-admin";
import { awardRegistrationBonus } from "../utils/registrationBonus";
import { assertLoginAllowed, getSecurityConfig, recordLoginActivity, verifyTotpCode } from "../services/security-service";
import { getOrCreateUserSipAccount, toPublicUserSipAccount } from "../services/user-sip-service";

const router = Router();
const BCRYPT_ROUNDS = 12;

type AdminLoginAsPayload = {
  type?: string;
  customerId?: string;
  adminId?: string;
  role?: string;
};

type CustomerRole = 'customer' | 'agent' | 'reseller';

const loginAsCustomerRedirects: Record<CustomerRole, string> = {
  customer: '/account/dashboard',
  agent: '/account/dashboard',
  reseller: '/account/dashboard',
};

function getCustomerRole(value?: string | null): CustomerRole {
  return value === 'agent' || value === 'reseller' ? value : 'customer';
}

function getLoginAsTokenSecret() {
  const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET or SESSION_SECRET is required for Login as customer');
  }
  return secret;
}

function saveSession(req: Request) {
  return new Promise<void>((resolve, reject) => {
    req.session.save((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function getLoginSipAccount(userId: string) {
  try {
    const account = await getOrCreateUserSipAccount(userId);
    return toPublicUserSipAccount(account);
  } catch (error: any) {
    logger.error("SIP account provisioning failed during auth response", {
      userId,
      error: error.message,
    });
    return null;
  }
}

function getSafeRedirect(value: unknown, fallback: string) {
  const redirectTo = typeof value === 'string' ? value : fallback;
  if (!redirectTo.startsWith('/') || redirectTo.startsWith('//')) return fallback;
  return redirectTo;
}

function generateOTP(): string {
  if (process.env.NODE_ENV === 'development') {
    return '123456';
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true };
}

async function awardSignupBonus(userId: string, source: string) {
  try {
    await awardRegistrationBonus(userId, { source });
  } catch (error: any) {
    logger.warn("Registration bonus award failed", {
      userId,
      source,
      error: error.message,
    });
  }
}

router.post('/send-otp', async (req: Request, res: Response) => {
  try {
    const { email, purpose = 'login' } = req.body;
    if (!email) {
      return ApiResponse.badRequest(res, 'Email is required');
    }


    let user = await storage.getUserByEmail(email);

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      if (user && user.isDeleted) {
        return ApiResponse.badRequest(
          res,
          'Your account has been deleted or deactivated. Please contact support.'
        );
      }

    await storage.createOTP({ email, code, expiresAt, verified: false, purpose });
    console.log(
      `Generated OTP for ${email}: ${code} (purpose: ${purpose}, expires at ${expiresAt.toISOString()})`,
    );

    const emailContent = await generateOTPEmail(code);
    await sendEmail({
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    return ApiResponse.success(res, `OTP sent successfully ${code}`, { email });
  } catch (error: any) {
    console.error('Send OTP error:', error);
    return ApiResponse.serverError(res, error.message);
  }
});

router.post('/app/send-otp', async (req: Request, res: Response) => {
  try {
    const { email, purpose = 'login' } = req.body;

    if (!email) {
      return ApiResponse.badRequest(res, 'Email is required');
    }

    /* ---------------------------------
       CHECK USER EXISTS
    ---------------------------------- */
    const existingUser = await storage.getUserByEmail(email);


    if (existingUser && existingUser.isDeleted) {
  return ApiResponse.badRequest(
    res,
    'Your account has been deleted or deactivated. Please contact support.'
  );
}

    // ✅ User exists AND password is already set → DO NOT send OTP
    if (existingUser?.hashedPassword != null) {
      return ApiResponse.success(res, 'User password already set', {
        email,
        is_password_set: true,
      });
    }

    /* ---------------------------------
       PASSWORD NOT SET → SEND OTP
    ---------------------------------- */
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    console.log('🔥 BEFORE CREATE OTP');

    const otpRecord = await storage.createOTP({
      email,
      code,
      expiresAt,
      verified: false,
      purpose,
    });

    console.log('🔥 AFTER CREATE OTP', otpRecord);

    console.log(
      `Generated OTP for ${email}: ${code} (purpose: ${purpose}, expires at ${expiresAt.toISOString()})`,
    );

    const emailContent = await generateOTPEmail(code);

    await sendEmail({
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    return ApiResponse.success(res, `OTP sent successfully ${code}`, {
      email,
      is_password_set: false,
    });
  } catch (error: any) {
    console.error('Send OTP error:', error);
    return ApiResponse.serverError(res, error.message);
  }
});

router.post('/app/verify-otp', async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email) {
      return ApiResponse.badRequest(res, 'Email is required');
    }

    if (!otp) {
      return ApiResponse.badRequest(res, 'OTP is required');
    }

    const isValid = await storage.verifyOTP(email, otp);

    if (!isValid) {
      // ❌ OTP invalid or expired
      return ApiResponse.success(res, 'Invalid or expired OTP', {
        success: false,
      });
    }

    let user = await storage.getUserByEmail(email);

    if (!user) {
      user = await storage.createUser({
        email,
        kycStatus: 'pending',
      });
      await awardSignupBonus(user.id, "app_verify_otp");
    }

    // ✅ OTP matched
    return ApiResponse.success(res, 'OTP verified successfully', {
      success: true,
      userId: user?.id,
      sipAccount: user ? await getLoginSipAccount(user.id) : null,
    });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const {
      email,
      otp,
      isFromGoogle = false,
      fcmToken,
      imagePath,
      deviceid,
      deviceType,
      deviceModel,
      appVersion,
      deviceManufacturer,
      deviceLocation,
      name,
    } = req.body;

    if (!email) {
      return ApiResponse.badRequest(res, 'Email is required');
    }

    if (!isFromGoogle) {
      if (!otp) {
        return ApiResponse.badRequest(res, 'OTP is required');
      }

      const isValid = await storage.verifyOTP(email, otp);
      if (!isValid) {
        return ApiResponse.badRequest(res, 'Invalid or expired OTP');
      }
    }

    let user = await storage.getUserByEmail(email);

    if (!user) {
      user = await storage.createUser({
        email,
        name: name ?? null,
        imagePath: imagePath ?? null,
        isFromGoogle,
        kycStatus: 'pending',
      });
      await awardSignupBonus(user.id, isFromGoogle ? "google_verify_otp" : "verify_otp");

      const welcomeEmail = await generateWelcomeEmail(user.name || 'Traveler', email);
      await sendEmail({
        to: email,
        subject: welcomeEmail.subject,
        html: welcomeEmail.html,
      });

      await storage.createNotification({
        userId: user.id,
        type: 'welcome',
        title: 'Welcome message coming up as esim global!',
        message: 'Thank you for joining us. Start browsing destinations to get your first eSIM.',
        read: false,
      });
    } else {
      // ✅ NEW CHECK — isBlocked & isDeleted
      if (user.isBlocked && !user.isDeleted) {
        return ApiResponse.badRequest(
          res,
          'Your account has been blocked. Please contact support.'
        );
      }

      if (user.isDeleted) {
        return ApiResponse.badRequest(
          res,
          'Your account has been deleted or deactivated. Please contact support.'
        );
      }

      await storage.updateUser(user.id, {
        ...(name && { name }),
        ...(imagePath && { imagePath }),
        ...(fcmToken && { fcmToken }),
        ...(deviceid && { deviceid }),
        ...(deviceType && { deviceType }),
        ...(deviceModel && { deviceModel }),
        ...(appVersion && { appVersion }),
        ...(deviceManufacturer && { deviceManufacturer }),
        ...(deviceLocation && { deviceLocation }),
        ...(typeof isFromGoogle === 'boolean' && { isFromGoogle }),
      });
    }

    await assertLoginAllowed(req, user);

    req.session.userId = user.id;
    // console.log("User logged in or registered with ID:", user.id, req.session.userId);
    const token = generateToken(user);
    await recordLoginActivity(req, user, isFromGoogle ? "google_otp" : "otp");

    return ApiResponse.success(res, 'User logged in successfully', {
      id: user.id,
      email: user.email,
      name: user.name,
      walletBalance: user.walletBalance ?? '0.00',
      token,
      passwordSet: !!user.hashedPassword,
      sipAccount: await getLoginSipAccount(user.id),
    });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

router.post('/check-email', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return ApiResponse.badRequest(res, 'Email is required');
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedPassword = String(password).trim();
    const user = await storage.getUserByEmail(normalizedEmail);

    return ApiResponse.success(res, 'Email check completed', {
      exists: !!user,
      passwordSet: user ? !!user.hashedPassword : false,
    });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

router.post('/login-password', async (req: Request, res: Response) => {
  try {
    const { email, password, twoFactorOtp } = req.body;

    if (!email || !password) {
      return ApiResponse.badRequest(res, 'Email and password are required');
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedPassword = String(password).trim();
    const user = await storage.getUserByEmail(normalizedEmail);

    if (!user) {
      return ApiResponse.badRequest(res, 'Invalid email or password');
    }

    // ✅ NEW CHECK — isBlocked & isDeleted
    if (user.isBlocked && !user.isDeleted) {
      return ApiResponse.badRequest(
        res,
        'Your account has been blocked. Please contact support.'
      );
    }

    if (user.isDeleted) {
      return ApiResponse.badRequest(
        res,
        'Your account has been deleted or deactivated. Please contact support.'
      );
    }

    if (!user.hashedPassword) {
      return ApiResponse.badRequest(res, 'Password not set. Please login with OTP first.');
    }

    const isValid = await bcrypt.compare(normalizedPassword, user.hashedPassword);

    if (!isValid) {
      return ApiResponse.badRequest(res, 'Invalid email or password');
    }

    await assertLoginAllowed(req, user);

    const security = getSecurityConfig(user);
    if (security.twoFactorEnabled) {
      if (!security.totpSecret) {
        return ApiResponse.badRequest(res, 'Two-factor is enabled, but authenticator setup is incomplete.');
      }
      if (!twoFactorOtp) {
        return ApiResponse.badRequest(res, 'Authenticator verification code is required');
      }
      if (!verifyTotpCode(security.totpSecret, twoFactorOtp)) {
        return ApiResponse.badRequest(res, 'Invalid authenticator code');
      }
    }

    await storage.updateUser(user.id, {
      lastPasswordLoginAt: new Date(),
    });

    req.session.userId = user.id;
    const token = generateToken(user);
    await recordLoginActivity(req, user, "password");

    logger.info('User logged in with password', { userId: user.id, email: user.email });

    return ApiResponse.success(res, 'Login successful', {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      accountMode: user.accountMode,
      walletBalance: user.walletBalance ?? '0.00',
      token,
      passwordSet: true,
      sipAccount: await getLoginSipAccount(user.id),
    });
  } catch (error: any) {
    logger.error('Password login error', { error: error.message });
    return ApiResponse.serverError(res, error.message);
  }
});

router.post('/app/login-password', async (req, res) => {
  try {
    const {
      email,
      password,
      isFromGoogle = false,
      fcmToken,
      imagePath,
      deviceid,
      deviceType,
      deviceModel,
      appVersion,
      deviceManufacturer,
      deviceLocation,
      twoFactorOtp,
    } = req.body;

    if (!email || !password) {
      return ApiResponse.badRequest(res, 'Email and password are required');
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedPassword = String(password).trim();
    const user = await storage.getUserByEmail(normalizedEmail);
    if (!user || !user.hashedPassword) {
      return ApiResponse.badRequest(res, 'Invalid email or password');
    }


    // ✅ NEW CHECK — isBlocked & isDeleted
    if (user.isBlocked && !user.isDeleted) {
      return ApiResponse.badRequest(
        res,
        'Your account has been blocked. Please contact support.'
      );
    }

    if (user.isDeleted) {
      return ApiResponse.badRequest(
        res,
        'Your account has been deleted or deactivated. Please contact support.'
      );
    }

    const isValid = await bcrypt.compare(normalizedPassword, user.hashedPassword);
    if (!isValid) {
      return ApiResponse.badRequest(res, 'Invalid email or password');
    }

    await assertLoginAllowed(req, user);
    const security = getSecurityConfig(user);
    if (security.twoFactorEnabled) {
      if (!security.totpSecret) {
        return ApiResponse.badRequest(res, 'Two-factor is enabled, but authenticator setup is incomplete.');
      }
      if (!twoFactorOtp) {
        return ApiResponse.badRequest(res, 'Authenticator verification code is required');
      }
      if (!verifyTotpCode(security.totpSecret, twoFactorOtp)) {
        return ApiResponse.badRequest(res, 'Invalid authenticator code');
      }
    }

    await storage.updateUser(user.id, {
      lastPasswordLoginAt: new Date(),
      ...(typeof isFromGoogle === 'boolean' && { isFromGoogle }),
      ...(fcmToken && { fcmToken }),
      ...(imagePath && { imagePath }),
      ...(deviceid && { deviceid }),
      ...(deviceType && { deviceType }),
      ...(deviceModel && { deviceModel }),
      ...(appVersion && { appVersion }),
      ...(deviceManufacturer && { deviceManufacturer }),
      ...(deviceLocation && { deviceLocation }),
    });

    const token = generateToken({ id: user.id, email: user.email });
    await recordLoginActivity(req, user, "app_password");

    return ApiResponse.success(res, 'Login successful', {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      accountMode: user.accountMode,
      walletBalance: user.walletBalance ?? '0.00',
      token,
      passwordSet: true,
      sipAccount: await getLoginSipAccount(user.id),
    });
  } catch (err: any) {
    return ApiResponse.serverError(res, err.message);
  }
});

router.post('/set-password', requireAuth, async (req: any, res: Response) => {
  try {
    const { password, confirmPassword, name } = req.body;
    const userId = req.userId;

    console.log('password:', password, 'confirmPassword:', confirmPassword);
    // if (!password || !confirmPassword) {
    //   return ApiResponse.badRequest(res, "Password and confirmation are required");
    // }

    if (password !== confirmPassword) {
      return ApiResponse.badRequest(res, 'Passwords do not match');
    }

    const validation = validatePassword(password);
    if (!validation.valid) {
      return ApiResponse.badRequest(res, validation.message || 'Invalid password');
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return ApiResponse.notFound(res, 'User not found');
    }

    if (user.hashedPassword) {
      return ApiResponse.badRequest(res, 'Password already set. Use change password instead.');
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await storage.updateUser(userId, {
      hashedPassword,
      passwordSetAt: new Date(),
      name
    });

    logger.info('Password set for user', { userId });

    return ApiResponse.success(res, 'Password set successfully');
  } catch (error: any) {
    logger.error('Set password error', { error: error.message });
    return ApiResponse.serverError(res, error.message);
  }
});

router.post('/app/set-password', async (req: any, res: Response) => {
  try {
    const { password, confirmPassword } = req.body;
    const { userId } = req.body;

    console.log('password:', password, 'confirmPassword:', confirmPassword);
    // if (!password || !confirmPassword) {
    //   return ApiResponse.badRequest(res, "Password and confirmation are required");
    // }

    if (password !== confirmPassword) {
      return ApiResponse.badRequest(res, 'Passwords do not match');
    }

    const validation = validatePassword(password);
    if (!validation.valid) {
      return ApiResponse.badRequest(res, validation.message || 'Invalid password');
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return ApiResponse.notFound(res, 'User not found');
    }

    if (user.hashedPassword) {
      return ApiResponse.badRequest(res, 'Password already set. Use change password instead.');
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await storage.updateUser(userId, {
      hashedPassword,
      passwordSetAt: new Date(),
    });

    logger.info('Password set for user', { userId });

    return ApiResponse.success(res, 'Password set successfully');
  } catch (error: any) {
    logger.error('Set password error', { error: error.message });
    return ApiResponse.serverError(res, error.message);
  }
});

router.post('/change-password', requireAuth, async (req: any, res: Response) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.userId;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return ApiResponse.badRequest(res, 'All fields are required');
    }

    if (newPassword !== confirmPassword) {
      return ApiResponse.badRequest(res, 'New passwords do not match');
    }

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      return ApiResponse.badRequest(res, validation.message || 'Invalid password');
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return ApiResponse.notFound(res, 'User not found');
    }

    if (!user.hashedPassword) {
      return ApiResponse.badRequest(res, 'No password set. Use set password instead.');
    }

    const isValid = await bcrypt.compare(currentPassword, user.hashedPassword);
    if (!isValid) {
      return ApiResponse.badRequest(res, 'Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await storage.updateUser(userId, {
      hashedPassword,
      passwordSetAt: new Date(),
    });

    logger.info('Password changed for user', { userId });

    return ApiResponse.success(res, 'Password changed successfully');
  } catch (error: any) {
    logger.error('Change password error', { error: error.message });
    return ApiResponse.serverError(res, error.message);
  }
});

router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return ApiResponse.badRequest(res, 'Email is required');
    }

    const user = await storage.getUserByEmail(email);

    // if (!user) {
    //   return ApiResponse.success(res, "If an account exists, a reset code has been sent", { email });
    // }

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await storage.createOTP({ email, code, expiresAt, verified: false, purpose: 'password_reset' });

    const emailContent = await generateOTPEmail(code);
    await sendEmail({
      to: email,
      subject: 'Password Reset Code - eSIM Global',
      html: emailContent.html.replace('verification code', 'password reset code'),
    });

    logger.info('Password reset OTP sent', { email });

    return ApiResponse.success(res, `If an account exists, a reset code has been sent ${code}`, {
      email,
    });
  } catch (error: any) {
    logger.error('Forgot password error', { error: error.message });
    return ApiResponse.serverError(res, error.message);
  }
});

router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    if (!email || !otp || !newPassword || !confirmPassword) {
      return ApiResponse.badRequest(res, 'All fields are required');
    }

    if (newPassword !== confirmPassword) {
      return ApiResponse.badRequest(res, 'Passwords do not match');
    }

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      return ApiResponse.badRequest(res, validation.message || 'Invalid password');
    }

    const isValid = await storage.verifyOTP(email, otp, 'password_reset');
    if (!isValid) {
      return ApiResponse.badRequest(res, 'Invalid or expired reset code');
    }

    const user = await storage.getUserByEmail(email);
    if (!user) {
      return ApiResponse.badRequest(res, 'Invalid or expired reset code');
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await storage.updateUser(user.id, {
      hashedPassword,
      passwordSetAt: new Date(),
    });

    logger.info('Password reset for user', { userId: user.id, email });

    return ApiResponse.success(
      res,
      'Password reset successfully. You can now login with your new password.',
    );
  } catch (error: any) {
    logger.error('Reset password error', { error: error.message });
    return ApiResponse.serverError(res, error.message);
  }
});

router.get('/admin/me', requireAdmin, async (req: Request, res: Response) => {
  try {
    console.log('Fetching user with ID:', req.session);
    const admin = await storage.getAdminById(req.session.adminId!);
    if (!admin) {
      return ApiResponse.notFound(res, 'Admin not found');
    }
    const { password, ...user } = admin;
    return ApiResponse.success(res, 'Admin fetched successfully', user);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

router.get('/admin-login-as', asyncHandler(async (req: Request, res: Response) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!token) {
    return ApiResponse.badRequest(res, 'Login link is missing');
  }

  let payload: AdminLoginAsPayload;
  try {
    payload = jwt.verify(token, getLoginAsTokenSecret()) as AdminLoginAsPayload;
  } catch {
    return ApiResponse.unauthorized(res, 'Login link has expired or is invalid');
  }

  if (payload.type !== 'admin_login_as_customer' || !payload.customerId || !payload.adminId) {
    return ApiResponse.badRequest(res, 'Login link is invalid');
  }

  const user = await storage.getUser(payload.customerId);
  if (!user) {
    return ApiResponse.notFound(res, 'Customer not found');
  }
  if (user.isBlocked && !user.isDeleted) {
    return ApiResponse.badRequest(res, 'This customer account is blocked');
  }
  if (user.isDeleted) {
    return ApiResponse.badRequest(res, 'This customer account is deleted');
  }

  const role = getCustomerRole(user.role);
  req.session.userId = user.id;
  req.session.impersonatedByAdminId = payload.adminId;
  req.session.impersonatedUserRole = role;
  req.session.impersonatedAt = new Date().toISOString();
  await saveSession(req);

  logger.info('Admin login-as customer session started', {
    adminId: payload.adminId,
    customerId: user.id,
    role,
  });

  return res.redirect(302, getSafeRedirect(req.query.redirect, loginAsCustomerRedirects[role]));
}));

router.get('/me', requireAuth, async (req: any, res: Response) => {
  try {
    const userId = req.userId;

    const user = await storage.getUserWithDestinationsAndCurrency(userId);
    if (!user) {
      return ApiResponse.notFound(res, 'User not found');
    }

    const unreadNotificationCount = await storage.getUnreadNotificationCount(userId);

    return ApiResponse.success(res, 'User fetched successfully', {
      ...user,
      unreadNotificationCount,
      sipAccount: await getLoginSipAccount(user.id),
    });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

router.post('/logout', (req: Request, res: Response) => {
  if (req.session.adminId && req.session.impersonatedByAdminId) {
    delete req.session.userId;
    delete req.session.impersonatedByAdminId;
    delete req.session.impersonatedUserRole;
    delete req.session.impersonatedAt;
    req.session.save(() => {
      return ApiResponse.success(res, 'Logged out from customer account');
    });
    return;
  }

  req.session.destroy(() => {
    return ApiResponse.success(res, 'Logged out successfully');
  });
});

router.post('/app/login-with-google', async (req: Request, res: Response) => {
  try {
    const {
      email,
      fcmToken,
      imagePath,
      deviceid,
      deviceType,
      deviceModel,
      appVersion,
      deviceManufacturer,
      deviceLocation,
    } = req.body;

    if (!email) {
      return ApiResponse.badRequest(res, 'Email is required');
    }

    let user = await storage.getUserByEmail(email);

    /* -----------------------------------
       CREATE USER IF NOT EXISTS
    ----------------------------------- */
    if (!user) {
      user = await storage.createUser({
        email,
        kycStatus: 'pending',
        isFromGoogle: true,
        imagePath,
        fcmToken,
        deviceid,
        deviceType,
        deviceModel,
        appVersion,
        deviceManufacturer,
        deviceLocation,
      });
      await awardSignupBonus(user.id, "app_google");
    } else {
      /* -----------------------------------
       CHECK BLOCKED/DELETED
    ----------------------------------- */
      if (user.isBlocked && !user.isDeleted) {
        return ApiResponse.badRequest(
          res,
          'Your account has been blocked. Please contact support.'
        );
      }

      if (user.isDeleted) {
        return ApiResponse.badRequest(
          res,
          'Your account has been deleted or deactivated. Please contact support.'
        );
      }

      /* -----------------------------------
       UPDATE USER IF EXISTS
    ----------------------------------- */
      await storage.updateUser(user.id, {
        lastGoogleLoginAt: new Date(),
        isFromGoogle: true,
        ...(fcmToken && { fcmToken }),
        ...(imagePath && { imagePath }),
        ...(deviceid && { deviceid }),
        ...(deviceType && { deviceType }),
        ...(deviceModel && { deviceModel }),
        ...(appVersion && { appVersion }),
        ...(deviceManufacturer && { deviceManufacturer }),
        ...(deviceLocation && { deviceLocation }),
      });
    }

    /* -----------------------------------
       GENERATE TOKEN
    ----------------------------------- */
    const token = generateToken({
      id: user.id,
      email: user.email,
    });

    return ApiResponse.success(res, 'Login successful', {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      accountMode: user.accountMode,
      walletBalance: user.walletBalance ?? '0.00',
      token,
      passwordSet: Boolean(user.hashedPassword),
      sipAccount: await getLoginSipAccount(user.id),
    });
  } catch (err: any) {
    return ApiResponse.serverError(res, err.message);
  }
});





// google auth


router.post(
  "/web/login-with-google",
  async (req: Request, res: Response) => {
    try {
      const { idToken, referralCode } =
        req.body;


      console.log(idToken, referralCode, "Req body")

      /* -----------------------------------
         VALIDATE TOKEN
      ----------------------------------- */
      if (!idToken) {
        return ApiResponse.badRequest(
          res,
          "Firebase token is required"
        );
      }

      /* -----------------------------------
         VERIFY FIREBASE TOKEN
      ----------------------------------- */
      await initFirebaseAdmin();
      const decoded = await admin
        .auth()
        .verifyIdToken(idToken);

      const firebaseUid = decoded.uid;
      const email = decoded.email;
      const name = decoded.name;
      const imagePath = decoded.picture;

      if (!email) {
        return ApiResponse.badRequest(
          res,
          "Email not found"
        );
      }

      /* -----------------------------------
         CHECK USER
      ----------------------------------- */
      let user =
        await storage.getUserByEmail(
          email
        );

      /* -----------------------------------
         CREATE USER (Signup via Google)
      ----------------------------------- */
      if (!user) {
        user =
          await storage.createUser({
            email,
            name,
            firebaseUid,
            isFromGoogle: true,
            imagePath,
            kycStatus: "pending",
          });
        await awardSignupBonus(user.id, "web_google");

        /* -------- Referral Apply -------- */
        // if (referralCode) {
        //   try {
        //     await applyReferral(
        //       user.id,
        //       referralCode
        //     );
        //   } catch (err) {
        //     console.log(
        //       "Referral error:",
        //       err
        //     );
        //   }
        // }
      }
      /* -----------------------------------
         CHECK BLOCKED/DELETED
      ----------------------------------- */
      if (user && user.isBlocked && !user.isDeleted) {
        return ApiResponse.badRequest(
          res,
          "Your account has been blocked. Please contact support."
        );
      }

      if (user && user.isDeleted) {
        return ApiResponse.badRequest(
          res,
          "Your account has been deleted or deactivated. Please contact support."
        );
      }

      /* -----------------------------------
         MERGE ACCOUNT
      ----------------------------------- */
      if (user && !user.firebaseUid) {
        await storage.updateUser(
          user.id,
          {
            firebaseUid,
            isFromGoogle: true,
          }
        );
      }

      /* -----------------------------------
         GENERATE SESSION / JWT
      ----------------------------------- */
      const token = generateToken({
        id: user.id,
        email: user.email,
      });

      await assertLoginAllowed(req, user);
      req.session.userId = user.id;
      await recordLoginActivity(req, user, "google");

      /* -----------------------------------
         RESPONSE
      ----------------------------------- */
      return ApiResponse.success(
        res,
        "Google login successful",
        {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          accountMode: user.accountMode,
          walletBalance: user.walletBalance ?? "0.00",
          imagePath:
            user.imagePath,
          token,
          passwordSet: Boolean(
            user.hashedPassword
          ),
          sipAccount: await getLoginSipAccount(user.id),
        }
      );
    } catch (err: any) {
      console.error(
        "Website Google login error:",
        err.message
      );

      return ApiResponse.serverError(
        res,
        err.message
      );
    }
  }
);




export default router;
