import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

export interface ActivityContext {
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: any;
}

// Middleware to log user/admin activities
export async function logActivity(
  req: Request,
  action: string,
  entity?: string,
  entityId?: string,
  metadata?: any
) {
  try {
    // Read user/admin IDs from session where they're actually stored
    const userId = req.session?.userId;
    const adminId = req.session?.adminId;
    const ipAddress = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.get('user-agent') || '';

    await storage.createActivityLog({
      userId,
      adminId,
      action,
      entity,
      entityId,
      metadata,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    // Don't fail the request if logging fails
    console.error('Activity logging failed:', error);
  }
}

// Common activity actions
export const ActivityActions = {
  // Auth
  LOGIN: 'login',
  LOGOUT: 'logout',
  OTP_REQUESTED: 'otp_requested',
  OTP_VERIFIED: 'otp_verified',
  
  // Profile
  PROFILE_VIEWED: 'profile_viewed',
  PROFILE_UPDATED: 'profile_updated',
  
  // Orders
  ORDER_CREATED: 'order_created',
  ORDER_VIEWED: 'order_viewed',
  ORDER_CANCELLED: 'order_cancelled',
  
  // Topups
  TOPUP_CREATED: 'topup_created',
  
  // KYC
  KYC_SUBMITTED: 'kyc_submitted',
  KYC_APPROVED: 'kyc_approved',
  KYC_REJECTED: 'kyc_rejected',
  KYC_VIEWED: 'kyc_viewed',
  
  // Tickets
  TICKET_CREATED: 'ticket_created',
  TICKET_UPDATED: 'ticket_updated',
  TICKET_REPLIED: 'ticket_replied',
  
  // Admin
  PACKAGE_UPDATED: 'package_updated',
  CUSTOMER_VIEWED: 'customer_viewed',
  SETTINGS_UPDATED: 'settings_updated',
};
