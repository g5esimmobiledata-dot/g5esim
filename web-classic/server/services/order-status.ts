import { airaloAPI } from "./airalo/airalo-sdk";
import { db } from "../db";
import { orders } from "@shared/schema";
import { eq, and, or, lt, isNull, sql } from "drizzle-orm";
import { airaloOrderService } from "./airalo/airalo-order";
import { storage } from "../storage";
import { stringify } from "querystring";

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MINUTES = [5, 15, 60]; // 5min, 15min, 1hr
const STATUS_CHECK_INTERVAL_MINUTES = 5; // Check pending orders every 5min (matches scheduler frequency)

/**
 * Order Status Management Service
 * Handles status polling, retry mechanism, and order synchronization with Airalo
 */
export class OrderStatusService {
  /**
   * Check and update status for pending/processing orders
   * Called by background scheduler
   */
  async checkPendingOrdersStatus() {
    try {
      // Find orders that are pending/processing and haven't been checked recently
      const cutoffTime = new Date(Date.now() - STATUS_CHECK_INTERVAL_MINUTES * 60 * 1000);

      const pendingOrders = await db.query.orders.findMany({
        where: and(
          or(
            eq(orders.status, "pending"),
            eq(orders.status, "processing")
          ),
          or(
            isNull(orders.lastStatusCheck),
            lt(orders.lastStatusCheck, cutoffTime)
          )
        ),
        limit: 50, // Process in batches
      });

      if (pendingOrders.length === 0) {
        console.log("✅ No pending orders to check");
        return { checked: 0, updated: 0, failed: 0 };
      }

      console.log(`🔍 Checking status for ${pendingOrders.length} pending orders...`);

      let updatedCount = 0;
      let failedCount = 0;

      for (const order of pendingOrders) {
        try {
          const updated = await this.checkSingleOrderStatus(order.id);
          if (updated) updatedCount++;
        } catch (error) {
          failedCount++;
          console.error(`Failed to check status for order ${order.displayOrderId}:`, error);
        }
      }

      console.log(`✅ Status check complete: ${updatedCount} updated, ${failedCount} failed`);
      return { checked: pendingOrders.length, updated: updatedCount, failed: failedCount };
    } catch (error: any) {
      console.error("Error in checkPendingOrdersStatus:", error.message);
      throw error;
    }
  }

  /**
   * Check status for a single order
   */
  async checkSingleOrderStatus(orderId: string): Promise<boolean> {
    try {
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
      });

      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      // Update last status check timestamp
      await db.update(orders)
        .set({ lastStatusCheck: new Date() })
        .where(eq(orders.id, orderId));

      console.log("Order status checked for:", order);

      // For async orders, check via requestId
      if (order.requestId) {
        console.log(`🔍 Checking async order status: ${order.displayOrderId} (requestId: ${order.requestId})`);



        // Query Airalo for order by request_id (via description field)
        const response = await airaloAPI.getOrdersList({
          "filter[description]": order.requestId,
          include: "sims,status",
          limit: 1,
        });

        if (response.data && response.data.length > 0) {
          const airaloOrder = response.data[0];

          // If order is now completed, update our database
          if (airaloOrder.status === "completed" && airaloOrder.sims && airaloOrder.sims.length > 0) {
            const parsedDetails = airaloOrderService.parseOrderResponse(airaloOrder);

            if (parsedDetails && parsedDetails.sims.length > 0) {
              const firstSim = parsedDetails.sims[0];

              await db.update(orders)
                .set({
                  status: "completed",
                  iccid: firstSim.iccid,
                  qrCode: firstSim.qrCode,
                  qrCodeUrl: firstSim.qrCodeUrl,
                  lpaCode: firstSim.lpaCode,
                  smdpAddress: firstSim.smdpAddress,
                  activationCode: firstSim.activationCode,
                  directAppleUrl: firstSim.directAppleUrl,
                  apnType: firstSim.apnType,
                  apnValue: firstSim.apnValue,
                  isRoaming: firstSim.isRoaming,
                  webhookReceivedAt: new Date(),
                  updatedAt: new Date(),
                })
                .where(eq(orders.id, orderId));

              // Create in-app notification for order completion
              if (order.userId) {
                await storage.createNotification({
                  userId: order.userId,
                  type: "purchase",
                  title: "Order Confirmed",
                  message: `Your eSIM order is complete! Check your email for installation instructions.`,
                  read: false,
                  metadata: { orderId: order.id },
                });
              }

              console.log(`✅ Order ${order.displayOrderId} updated to completed`);
              return true;
            }
          } else if (airaloOrder.status === "failed") {
            await db.update(orders)
              .set({
                status: "failed",
                failureReason: airaloOrder.meta?.message || "Order failed at Airalo",
                updatedAt: new Date(),
              })
              .where(eq(orders.id, orderId));

            // Create in-app notification for order failure
            if (order.userId) {
              await storage.createNotification({
                userId: order.userId,
                type: "purchase",
                title: "Order Failed",
                message: `Unfortunately, your eSIM order could not be completed. Please contact support for assistance.`,
                read: false,
                metadata: { orderId: order.id, reason: airaloOrder.meta?.message },
              });
            }

            console.log(`❌ Order ${order.displayOrderId} marked as failed`);
            return true;
          }
        }
      }

      // For sync orders with airaloOrderId, check via order ID
      if (order.airaloOrderId && order.providerOrderId) {
        console.log(`🔍 Checking sync order status: ${order.displayOrderId}`);

        const { providerFactory } = await import("../providers/provider-factory");
        const providerService = await providerFactory.getServiceById(order.providerId);
        console.log(`Checking provider providerService: ${JSON.stringify(providerService)}`);
        let providerResponse;
        if (providerService?.provider?.slug === 'maya') {
          providerResponse = await providerService.getOrderStatus(order.iccid)
        } else {
          providerResponse = await providerService.getOrderStatus(order.providerOrderId)
        }

        console.log(`Provider response for order - routes:: ${order.displayOrderId}:`, JSON.stringify(providerResponse));

        // const response = await airaloAPI.getOrder(order.airaloOrderId);

        if (providerResponse) {
          // if (providerResponse.data.status === "failed") {
          await db.update(orders)
            .set({
              iccid: providerResponse.iccid,
              qrCode: providerResponse.qrCode,
              qrCodeUrl: providerResponse.qrCodeUrl,
              directAppleUrl: providerResponse.directAppleUrl,
              apnType: providerResponse.apnType,
              apnValue: providerResponse.apnValue,
              isRoaming: providerResponse.isRoaming,
              smdpAddress: providerResponse.smdpAddress,
              activationCode: providerResponse.activationCode,
              status: providerResponse.status,
              esimStatus: providerResponse.esimStatus,
              failureReason: providerResponse.meta?.message || `Order ${providerResponse.status} at provider`,
              updatedAt: new Date(),
            })
            .where(eq(orders.id, orderId));

          // Create in-app notification for order failure
          if (order.userId) {
            await storage.createNotification({
              userId: order.userId,
              type: "purchase",
              title: `Order ${providerResponse.status.charAt(0).toUpperCase() + providerResponse.status.slice(1)}`,
              message: `Unfortunately, your eSIM order could not be completed. Please contact support for assistance.`,
              read: false,
              metadata: { orderId: order.id, reason: providerResponse.meta?.message },
            });
          }

          console.log(`❌ Order ${order.displayOrderId} marked as failed`);
          return true;
          // }
        }
      }

      return false;
    } catch (error: any) {
      console.error(`Error checking status for order ${orderId}:`, error.message);
      throw error;
    }
  }

  /**
   * Retry failed orders (up to MAX_RETRY_ATTEMPTS)
   */
  async retryFailedOrders() {
    try {
      // Find failed orders that haven't exceeded retry limit
      const failedOrders = await db.query.orders.findMany({
        where: and(
          eq(orders.status, "failed"),
          lt(orders.retryCount, MAX_RETRY_ATTEMPTS)
        ),
        limit: 20, // Process in small batches
      });

      if (failedOrders.length === 0) {
        console.log("✅ No failed orders to retry");
        return { retried: 0, succeeded: 0, failed: 0 };
      }

      console.log(`🔄 Retrying ${failedOrders.length} failed orders...`);

      let succeededCount = 0;
      let failedCount = 0;

      for (const order of failedOrders) {
        // Check if enough time has passed since last retry
        const retryDelay = RETRY_DELAY_MINUTES[order.retryCount] || 60;
        const retryAfter = order.lastRetryAt
          ? new Date(order.lastRetryAt.getTime() + retryDelay * 60 * 1000)
          : new Date(0);

        if (new Date() < retryAfter) {
          console.log(`⏳ Order ${order.displayOrderId} - waiting ${retryDelay}min before retry`);
          continue;
        }

        try {
          console.log(`🔄 Retrying order ${order.displayOrderId} (attempt ${order.retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);

          // Retry the order submission
          const packageId = order.packageId;
          const quantity = order.quantity;

          let orderDetails: any;
          let requestId: string | undefined;

          if (quantity > 1) {
            // Async order
            const response = await airaloOrderService.submitBatchOrder(packageId, quantity);
            requestId = response.requestId;
            orderDetails = null;
          } else {
            // Single order
            orderDetails = await airaloOrderService.submitSingleOrder(packageId, quantity);
            requestId = undefined;
          }

          // Update order with new details
          await db.update(orders)
            .set({
              status: requestId ? "processing" : "completed",
              requestId: requestId,
              retryCount: order.retryCount + 1,
              lastRetryAt: new Date(),
              failureReason: null,
              ...(orderDetails.sims && orderDetails.sims.length > 0 ? {
                iccid: orderDetails.sims[0].iccid,
                qrCode: orderDetails.sims[0].qrCode,
                qrCodeUrl: orderDetails.sims[0].qrCodeUrl,
                lpaCode: orderDetails.sims[0].lpaCode,
                smdpAddress: orderDetails.sims[0].smdpAddress,
                activationCode: orderDetails.sims[0].activationCode,
                directAppleUrl: orderDetails.sims[0].directAppleUrl,
                apnType: orderDetails.sims[0].apnType,
                apnValue: orderDetails.sims[0].apnValue,
                isRoaming: orderDetails.sims[0].isRoaming,
              } : {}),
              updatedAt: new Date(),
            })
            .where(eq(orders.id, order.id));

          succeededCount++;
          console.log(`✅ Order ${order.displayOrderId} retry successful`);
        } catch (error: any) {
          console.log("CHECKKKK esim provider responseee error", error)
          failedCount++;

          const newRetryCount = order.retryCount + 1;
          const isPermanentlyFailed = newRetryCount >= MAX_RETRY_ATTEMPTS;

          // Update retry count and failure reason
          // Mark as permanently_failed if max retries exhausted
          await db.update(orders)
            .set({
              status: isPermanentlyFailed ? "permanently_failed" : "failed",
              retryCount: newRetryCount,
              lastRetryAt: new Date(),
              failureReason: error.message,
              updatedAt: new Date(),
            })
            .where(eq(orders.id, order.id));

          if (isPermanentlyFailed) {
            console.error(`❌ Order ${order.displayOrderId} permanently failed after ${MAX_RETRY_ATTEMPTS} attempts:`, error.message);
          } else {
            console.error(`❌ Order ${order.displayOrderId} retry failed (${newRetryCount}/${MAX_RETRY_ATTEMPTS}):`, error.message);
          }
        }
      }

      console.log(`✅ Retry complete: ${succeededCount} succeeded, ${failedCount} failed`);
      return { retried: failedOrders.length, succeeded: succeededCount, failed: failedCount };
    } catch (error: any) {
      console.error("Error in retryFailedOrders:", error.message);
      throw error;
    }
  }

  /**
   * Get orders stuck in pending for too long (> 30 minutes)
   * For admin alerts
   */
  async getStuckOrders() {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    return await db.query.orders.findMany({
      where: and(
        or(
          eq(orders.status, "pending"),
          eq(orders.status, "processing")
        ),
        lt(orders.createdAt, thirtyMinutesAgo)
      ),
      limit: 100,
    });
  }
}

export const orderStatusService = new OrderStatusService();
