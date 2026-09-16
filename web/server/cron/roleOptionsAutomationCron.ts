import cron from "node-cron";
import { and, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { notifications, orders, users } from "@shared/schema";
import { db } from "../db";
import { generateCustomNotificationEmail, sendEmail } from "../email";
import { getRoleOptionRole, getStoredRoleOptionsConfig } from "../utils/roleOptionsConfig";

const DAY_MS = 24 * 60 * 60 * 1000;

type OptionUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  walletBalance: string;
};

function money(value: number) {
  return value.toFixed(2);
}

async function hasRecentAutomationNotification(
  userId: string,
  automation: string,
  since: Date,
  orderId?: string,
) {
  const conditions = [
    eq(notifications.userId, userId),
    gte(notifications.createdAt, since),
    sql`${notifications.metadata}->>'automation' = ${automation}`,
  ];

  if (orderId) {
    conditions.push(sql`${notifications.metadata}->>'orderId' = ${orderId}`);
  }

  const [existing] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(...conditions))
    .limit(1);

  return Boolean(existing);
}

async function sendAutomationReminder({
  user,
  type,
  title,
  subject,
  message,
  metadata,
}: {
  user: OptionUser;
  type: string;
  title: string;
  subject?: string;
  message: string;
  metadata: Record<string, unknown>;
}) {
  await db.insert(notifications).values({
    userId: user.id,
    type,
    title,
    message,
    metadata,
  });

  try {
    const email = await generateCustomNotificationEmail(
      subject || title,
      message,
      user.name || user.email,
      user.email,
    );
    await sendEmail({
      to: user.email,
      subject: email.subject,
      html: email.html,
      text: message,
    });
  } catch (error) {
    console.warn("Role options reminder email failed:", error);
  }
}

export async function runRoleOptionsAutomation() {
  const options = await getStoredRoleOptionsConfig();
  const now = Date.now();

  const activeUsers = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      walletBalance: users.walletBalance,
    })
    .from(users)
    .where(and(eq(users.isDeleted, false), eq(users.isBlocked, false)));

  for (const user of activeUsers) {
    const role = getRoleOptionRole(user.role);
    const settings = options.roles[role];
    const displayRole = role === "user" ? "customer" : role;

    if (settings.modules.balance_alert) {
      const balance = Number(user.walletBalance || 0);
      const threshold = Number(settings.balanceAlertMinimum || 0);

      if (Number.isFinite(balance) && balance <= threshold) {
        const since = new Date(now - DAY_MS);
        const alreadySent = await hasRecentAutomationNotification(user.id, "balance_alert", since);

        if (!alreadySent) {
          await sendAutomationReminder({
            user,
            type: "wallet",
            title: "Balance Alert",
            message: `Your wallet balance is $${money(balance)}. Please add funds when your balance is below $${money(threshold)}.`,
            metadata: {
              automation: "balance_alert",
              role,
              threshold: money(threshold),
              balance: money(balance),
            },
          });
        }
      }
    }

    if (settings.modules.unused_active_package_reminder) {
      const days = Number(settings.unusedActivePackageReminderDays || 1);
      const staleDate = new Date(now - days * DAY_MS);

      const [unusedOrder] = await db
        .select({
          id: orders.id,
          displayOrderId: orders.displayOrderId,
          dataAmount: orders.dataAmount,
          validity: orders.validity,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(
          and(
            eq(orders.userId, user.id),
            inArray(orders.status, ["completed", "ready", "active"]),
            isNull(orders.activatedAt),
            lte(orders.createdAt, staleDate),
          ),
        )
        .limit(1);

      if (unusedOrder) {
        const since = new Date(now - days * DAY_MS);
        const alreadySent = await hasRecentAutomationNotification(
          user.id,
          "unused_active_package_reminder",
          since,
          unusedOrder.id,
        );

        if (!alreadySent) {
          await sendAutomationReminder({
            user,
            type: "package",
            title: "Unused Active Package",
            message: `You have an active package that has not been used yet: ${unusedOrder.dataAmount}, valid for ${unusedOrder.validity} days. Log in to view installation details.`,
            metadata: {
              automation: "unused_active_package_reminder",
              role,
              orderId: unusedOrder.id,
              displayOrderId: unusedOrder.displayOrderId,
              reminderAfterDays: days,
            },
          });
        }
      }
    }

    if (settings.modules.special_offer_reminder) {
      const days = Number(settings.specialOfferReminderDays || 1);
      const since = new Date(now - days * DAY_MS);
      const alreadySent = await hasRecentAutomationNotification(user.id, "special_offer_reminder", since);

      if (!alreadySent) {
        await sendAutomationReminder({
          user,
          type: "marketing",
          title: "Special Offer",
          subject: settings.specialOfferSubject,
          message: settings.specialOfferMessage,
          metadata: {
            automation: "special_offer_reminder",
            role,
            customerType: displayRole,
            reminderEveryDays: days,
          },
        });
      }
    }
  }
}

export const startRoleOptionsAutomationCron = () => {
  cron.schedule("30 9 * * *", async () => {
    try {
      await runRoleOptionsAutomation();
      console.log("Role options automation completed");
    } catch (error) {
      console.error("Role options automation failed:", error);
    }
  });
};
