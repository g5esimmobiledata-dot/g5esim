import { storage } from "../storage";

export interface ProviderErrorLog {
  providerId: string;
  providerName: string;
  errorType: "api_failure" | "rate_limit" | "webhook_validation" | "sync_failure" | "order_failure" | "auth_failure";
  errorMessage: string;
  errorDetails?: Record<string, any>;
  timestamp: Date;
}

class ProviderErrorHandler {
  private errorCounts: Map<string, number> = new Map(); // Track errors per provider
  private lastNotificationTime: Map<string, Date> = new Map(); // Prevent notification spam

  private readonly ERROR_THRESHOLD = 5; // Send notification after 5 errors
  private readonly NOTIFICATION_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

  /**
   * Log a provider error and send admin notification if threshold is reached
   */
  async logError(error: ProviderErrorLog): Promise<void> {
    const key = `${error.providerId}:${error.errorType}`;

    // Increment error count
    const currentCount = (this.errorCounts.get(key) || 0) + 1;
    this.errorCounts.set(key, currentCount);

    // Log to console with detailed information
    console.error(`
╔══════════════════════════════════════════════════════════════╗
║ PROVIDER ERROR - ${error.providerName.toUpperCase()}
╠══════════════════════════════════════════════════════════════╣
║ Type: ${error.errorType}
║ Message: ${error.errorMessage}
║ Error Count: ${currentCount}
║ Timestamp: ${error.timestamp.toISOString()}
${error.errorDetails ? `║ Details: ${JSON.stringify(error.errorDetails, null, 2)}` : ""}
╚══════════════════════════════════════════════════════════════╝
    `);

    // Check if we should send admin notification
    if (currentCount >= this.ERROR_THRESHOLD) {
      await this.sendAdminNotification(error, currentCount);
      this.errorCounts.set(key, 0); // Reset counter after notification
    }
  }

  /**
   * Send admin notification for critical provider errors
   */
  private async sendAdminNotification(error: ProviderErrorLog, errorCount: number): Promise<void> {
    const key = `${error.providerId}:${error.errorType}`;
    const lastNotification = this.lastNotificationTime.get(key);

    // Cooldown check - don't spam notifications
    if (lastNotification) {
      const timeSinceLastNotification = Date.now() - lastNotification.getTime();
      if (timeSinceLastNotification < this.NOTIFICATION_COOLDOWN_MS) {
        console.log(`⏳ Skipping admin notification (cooldown active for ${error.providerName})`);
        return;
      }
    }

    try {
      const notificationTitle = this.getNotificationTitle(error.errorType, error.providerName);
      const notificationMessage = this.getNotificationMessage(error, errorCount);

      // Log critical error for admin visibility
      console.error(`
╔══════════════════════════════════════════════════════════════╗
║ ⚠️  CRITICAL ADMIN ALERT
╠══════════════════════════════════════════════════════════════╣
║ ${notificationTitle}
║ ${notificationMessage}
║ 
║ Action Required:
║ - Check provider configuration in Admin > Providers
║ - Review provider service status
╚══════════════════════════════════════════════════════════════╝
      `);

      this.lastNotificationTime.set(key, new Date());
      console.log(`✅ Critical error logged for admin attention: ${error.providerName} ${error.errorType}`);
    } catch (notificationError) {
      console.error("❌ Failed to log admin notification:", notificationError);
    }
  }

  /**
   * Get notification title based on error type
   */
  private getNotificationTitle(errorType: string, providerName: string): string {
    const titles: Record<string, string> = {
      api_failure: `${providerName} API Failure`,
      rate_limit: `${providerName} Rate Limit Exceeded`,
      webhook_validation: `${providerName} Webhook Validation Failed`,
      sync_failure: `${providerName} Package Sync Failed`,
      order_failure: `${providerName} Order Processing Failed`,
      auth_failure: `${providerName} Authentication Failed`,
    };
    return titles[errorType] || `${providerName} Error`;
  }

  /**
   * Get notification message based on error details
   */
  private getNotificationMessage(error: ProviderErrorLog, errorCount: number): string {
    const messages: Record<string, string> = {
      api_failure: `${error.providerName} API has failed ${errorCount} times. Error: ${error.errorMessage}. Check API credentials and service status.`,
      rate_limit: `${error.providerName} rate limit exceeded ${errorCount} times. Consider reducing sync frequency or increasing rate limit configuration.`,
      webhook_validation: `${error.providerName} webhook validation failed ${errorCount} times. Verify webhook secret configuration.`,
      sync_failure: `${error.providerName} package sync failed ${errorCount} times. Error: ${error.errorMessage}. Packages may be outdated.`,
      order_failure: `${error.providerName} order processing failed ${errorCount} times. Error: ${error.errorMessage}. Customer orders may be affected.`,
      auth_failure: `${error.providerName} authentication failed ${errorCount} times. Check API keys in Secrets.`,
    };
    return messages[error.errorType] || `${error.providerName} encountered ${errorCount} errors: ${error.errorMessage}`;
  }

  /**
   * Log successful operation to reset error count
   */
  markSuccess(providerId: string, operation: string): void {
    const key = `${providerId}:${operation}`;
    if (this.errorCounts.has(key)) {
      console.log(`✅ ${operation} successful for provider ${providerId}, resetting error count`);
      this.errorCounts.delete(key);
    }
  }

  /**
   * Get current error count for a provider operation
   */
  getErrorCount(providerId: string, errorType: string): number {
    const key = `${providerId}:${errorType}`;
    return this.errorCounts.get(key) || 0;
  }

  /**
   * Clear all error counts (for testing or reset)
   */
  clearAllErrors(): void {
    this.errorCounts.clear();
    this.lastNotificationTime.clear();
    console.log("🔄 All provider error counts cleared");
  }
}

// Export singleton instance
export const providerErrorHandler = new ProviderErrorHandler();
