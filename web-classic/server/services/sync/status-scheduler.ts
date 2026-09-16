import { orderStatusService } from "../order-status";
import { esimService } from "../esim";

/**
 * Background Job Scheduler
 * Runs periodic tasks for order status checking, retries, and usage sync
 */
class StatusScheduler {
  private statusCheckInterval: NodeJS.Timeout | null = null;
  private retryInterval: NodeJS.Timeout | null = null;
  private usageSyncInterval: NodeJS.Timeout | null = null;

  /**
   * Start all background schedulers
   */
  start() {
    console.log("🕐 Starting order status & eSIM management schedulers...");

    // Check pending orders every 5 minutes
    this.statusCheckInterval = setInterval(async () => {
      try {
        console.log("⏰ [Scheduler] Checking pending orders status...");
        await orderStatusService.checkPendingOrdersStatus();
      } catch (error) {
        console.error("❌ [Scheduler] Status check failed:", error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Retry failed orders every 10 minutes
    this.retryInterval = setInterval(async () => {
      try {
        console.log("⏰ [Scheduler] Retrying failed orders...");
        await orderStatusService.retryFailedOrders();
      } catch (error) {
        console.error("❌ [Scheduler] Retry failed:", error);
      }
    }, 10 * 60 * 1000); // 10 minutes

    // Sync eSIM usage every hour
    this.usageSyncInterval = setInterval(async () => {
      try {
        console.log("⏰ [Scheduler] Syncing eSIM usage data...");
        await esimService.syncAllActiveESimUsage();
      } catch (error) {
        console.error("❌ [Scheduler] Usage sync failed:", error);
      }
    }, 60 * 60 * 1000); // 1 hour

    console.log("✅ Status schedulers started:");
    console.log("   - Pending orders check: every 5 minutes");
    console.log("   - Failed orders retry: every 10 minutes");
    console.log("   - eSIM usage sync: every 60 minutes");

    // Run initial checks after 30 seconds
    setTimeout(async () => {
      try {
        console.log("🔄 Running initial status checks...");
        await orderStatusService.checkPendingOrdersStatus();
        await orderStatusService.retryFailedOrders();
      } catch (error) {
        console.error("❌ Initial status check failed:", error);
      }
    }, 30000);
  }

  /**
   * Stop all schedulers (for graceful shutdown)
   */
  stop() {
    console.log("⏹️ Stopping status schedulers...");
    
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
    }
    
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }
    
    if (this.usageSyncInterval) {
      clearInterval(this.usageSyncInterval);
      this.usageSyncInterval = null;
    }
    
    console.log("✅ Status schedulers stopped");
  }

  /**
   * Manually trigger status check (for testing or admin action)
   */
  async manualStatusCheck() {
    console.log("🔄 Manual status check triggered...");
    return await orderStatusService.checkPendingOrdersStatus();
  }

  /**
   * Manually trigger retry (for testing or admin action)
   */
  async manualRetry() {
    console.log("🔄 Manual retry triggered...");
    return await orderStatusService.retryFailedOrders();
  }

  /**
   * Manually trigger usage sync (for testing or admin action)
   */
  async manualUsageSync() {
    console.log("🔄 Manual usage sync triggered...");
    return await esimService.syncAllActiveESimUsage();
  }
}

export const statusScheduler = new StatusScheduler();
