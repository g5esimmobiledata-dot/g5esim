import cron from "node-cron";
import { runInvoiceReminderAutomation, runMonthlyInvoiceAutomation } from "../services/invoice-service";

export const startInvoiceCron = () => {
  cron.schedule("0 9 * * *", async () => {
    try {
      const result = await runMonthlyInvoiceAutomation();
      if (!result.skipped) {
        console.log("Monthly invoice automation sent invoice", result.invoice?.invoiceNumber);
      }
    } catch (error) {
      console.error("Monthly invoice automation failed:", error);
    }
  });

  cron.schedule("30 9 * * *", async () => {
    try {
      const result = await runInvoiceReminderAutomation();
      if (!result.skipped && result.sentCount) {
        console.log("Invoice reminders sent", result.sentCount);
      }
    } catch (error) {
      console.error("Invoice reminder automation failed:", error);
    }
  });
};
