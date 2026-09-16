import { db } from "../../config/db";
import { storeProducts } from "../../db/schema/storeProducts";
import { userPurchases } from "../../db/schema/userPurchases";
import { verifyAppleReceipt } from "../../services/applePurchase.service";
import { eq } from "drizzle-orm";

export const verifyApplePurchase = async ({
    userId,
    receipt,
}: {
    userId: string;
    receipt: string;
}) => {
    // 1. Verify receipt with Apple
    let appleResponse = await verifyAppleReceipt(receipt);

    // Sandbox fallback
    if (appleResponse.status === 21007) {
        appleResponse = await verifyAppleReceipt(receipt, true);
    }

    if (appleResponse.status !== 0) {
        throw new Error("Invalid Apple receipt");
    }

    const transaction = appleResponse.receipt.in_app[0];
    const storeProductId = transaction.product_id;

    // 2. Resolve unified package
    const storeProduct = await db.query.storeProducts.findFirst({
        where: eq(storeProducts.storeProductId, storeProductId),
    });

    if (!storeProduct) {
        throw new Error("Unknown Apple product");
    }

    // 3. Save purchase
    await db.insert(userPurchases).values({
        userId,
        unifiedPackageId: storeProduct.unifiedPackageId,
        store: "apple_app_store",
        storeProductId,
        purchaseToken: transaction.transaction_id,
        orderId: transaction.original_transaction_id,
        purchaseTime: new Date(Number(transaction.purchase_date_ms)),
        status: "active",
        rawReceipt: appleResponse,
    });

    return storeProduct.unifiedPackageId;
};
