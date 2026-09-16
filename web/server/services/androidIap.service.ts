import { CreateInAppProductJob } from "server/jobs/createInAppProduct.job";

export async function syncAndroidIapForBracket(bracket: {
    productId: string;
    setPrice: string | number;
    currency: string;
}) {
    try {
        const job = new CreateInAppProductJob({
            sku: bracket.productId,
            title: bracket.productId,
            description: "eSIM in 30 seconds",
            price: Number(bracket.setPrice),
            currency: bracket.currency,
        });

        await job.handle();

        // job.handle() already updates DB to active
        return { success: true };
    } catch (err: any) {
        // job.handle() already updates DB to error
        return { success: false, error: err.message };
    }
}
