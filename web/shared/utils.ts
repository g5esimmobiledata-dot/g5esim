// Utility functions shared between client and server

/**
 * Format a display order ID as OID001, OID002, etc.
 */
export function formatDisplayOrderId(displayOrderId: number): string {
  return `OID${displayOrderId.toString().padStart(3, '0')}`;
}

/**
 * Format a display user ID as UID001, UID002, etc.
 */
export function formatDisplayUserId(displayUserId: number): string {
  return `UID${displayUserId.toString().padStart(3, '0')}`;
}
