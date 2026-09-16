import fs from "fs";
import path from "path";
import { generateAppleJWT } from "../config/appleJwt";
import { appleApi } from "server/utils/appleApi";
import { db } from "server/db";

type AppleStoreIapInput = {
    sku: string;
    title: string;
    description: string;
    price: number;
    currency?: string;
    country?: string;
};

export class AppleStoreIapJob {
    private sku: string;
    private title: string;
    private description: string;
    private price: number;
    private currency: string;
    private country: string;

    constructor({
        sku,
        title,
        description,
        price,
        currency = "USD",
        country = "USA"
    }: AppleStoreIapInput) {
        this.sku = sku.toLowerCase().replace(/-/g, "_");
        this.title = title;
        this.description = description;
        this.price = price;
        this.currency = currency;
        this.country = country;
    }

    async handle() {
        const settings = await db.query.settings.findMany();
        const getSetting = (key: string, fallback: string | undefined = undefined) => {
            const val = settings.find(s => s.key === key)?.value;
            return val && val.trim().length > 0 ? val : fallback;
        };

        const appId = getSetting("apple_app_id", process.env.IOS_APP_ID)!;
        const bundleId = getSetting("apple_bundle_id", process.env.IOS_BUNDLE_ID)!;
        const keyId = getSetting("apple_key_id", process.env.IOS_KEY_ID)!;
        const issuerId = getSetting("apple_issuer_id", process.env.IOS_ISSUER_ID)!;

        const jwt = await generateAppleJWT({ keyId, issuerId, bundleId });
        const api = appleApi(jwt);

        const existing = await this.checkExistingIAP(api, appId);

        if (existing) {
            await this.updateIAP(api, appId, existing.id);
        } else {
            await this.createIAP(api, appId);
        }
    }

    // 1️⃣ Check existing
    private async checkExistingIAP(api: any, appId: string) {
        try {
            const res = await api.get(`/v1/apps/${appId}/inAppPurchasesV2`, {
                params: { "filter[productId]": this.sku },
            });
            return res.data.data?.[0] || null;
        } catch (err: any) {
            const appleErrors = err?.response?.data?.errors;
            if (appleErrors) {
                const detail = appleErrors.map((e: any) => `[${e.status}] ${e.code}: ${e.detail || e.title}`).join(" | ");
                throw new Error(`Apple API error on checkExistingIAP: ${detail}`);
            }
            throw err;
        }
    }

    // 2️⃣ Create IAP
    private async createIAP(api: any, appId: string) {
        console.log("Creating IAP", this.sku);
        try {
            const res = await api.post("/v2/inAppPurchases", {
                data: {
                    type: "inAppPurchases",
                    attributes: {
                        productId: this.sku,
                        name: this.title,
                        inAppPurchaseType: "CONSUMABLE",
                        reviewNote: this.reviewNote(),
                    },
                    relationships: {
                        app: { data: { type: "apps", id: appId } },
                    },
                },
            });

            const iapId = res.data.data.id;
            await this.setTerritories(api, iapId);
            const price = await this.setPricing(api, iapId);
            await this.upsertLocalization(api, iapId, price);
            await this.uploadScreenshot(api, iapId);
            return iapId;
        } catch (err: any) {
            const appleErrors = err?.response?.data?.errors;
            if (appleErrors) {
                const detail = appleErrors.map((e: any) => `[${e.status}] ${e.code}: ${e.detail || e.title}`).join(" | ");
                throw new Error(`Apple API error on createIAP: ${detail}`);
            }
            throw err;
        }
    }

    // 3️⃣ Update IAP
    private async updateIAP(api: any, appId: string, iapId: string) {
        await api.patch(`/v2/inAppPurchases/${iapId}`, {
            data: {
                id: iapId,
                type: "inAppPurchases",
                attributes: {
                    name: this.title,
                    reviewNote: this.reviewNote(),
                },
            },
        });

        const price = await this.setPricing(api, iapId);
        await this.upsertLocalization(api, iapId, price);
        await this.setTerritories(api, iapId);
        await this.uploadScreenshot(api, iapId);
    }

    // 4️⃣ Pricing
    private async setPricing(api: any, iapId: string) {
        const pp = await api.get(
            `/v2/inAppPurchases/${iapId}/pricePoints`,
            { params: { "filter[territory]": this.country, limit: 800 } }
        );

        const pricePoint = this.findBestPricePoint(pp.data.data);
        if (!pricePoint) throw new Error("No price point found");

        const tempId = `\${tmp-${Date.now()}}`;

        await api.post("/v1/inAppPurchasePriceSchedules", {
            data: {
                type: "inAppPurchasePriceSchedules",
                relationships: {
                    inAppPurchase: { data: { type: "inAppPurchases", id: iapId } },
                    baseTerritory: { data: { type: "territories", id: this.country } },
                    manualPrices: { data: [{ type: "inAppPurchasePrices", id: tempId }] },
                },
            },
            included: [
                {
                    type: "inAppPurchasePrices",
                    id: tempId,
                    attributes: {
                        startDate: new Date().toISOString().slice(0, 10)
                    },
                    relationships: {
                        inAppPurchasePricePoint: {
                            data: { type: "inAppPurchasePricePoints", id: pricePoint.id },
                        },
                        territory: {
                            data: { type: "territories", id: this.country },
                        },
                    },
                },
            ],
        });

        return pricePoint.attributes.customerPrice;
    }

    // 5️⃣ Localization
    private async upsertLocalization(api: any, iapId: string, price: string) {
        const res = await api.get(
            `/v2/inAppPurchases/${iapId}/inAppPurchaseLocalizations`
        );

        const existing = res.data.data?.[0];

        const payload = {
            data: {
                type: "inAppPurchaseLocalizations",
                attributes: {
                    name: `eSIM Pack (${this.currency} ${price})`,
                    description: `Buy eSIM / Top-Up ${this.currency} ${price}`,
                    locale: "en-US",
                },
                relationships: {
                    inAppPurchaseV2: {
                        data: { type: "inAppPurchases", id: iapId },
                    },
                },
            },
        };

        if (existing) {
            await api.patch(
                `/v1/inAppPurchaseLocalizations/${existing.id}`,
                { data: { ...payload.data, id: existing.id } }
            );
        } else {
            await api.post("/v1/inAppPurchaseLocalizations", payload);
        }
    }

    // 6️⃣ Territories
    private async setTerritories(api: any, iapId: string) {
        const t = await api.get("/v1/territories", { params: { limit: 200 } });

        await api.post("/v1/inAppPurchaseAvailabilities", {
            data: {
                type: "inAppPurchaseAvailabilities",
                attributes: { availableInNewTerritories: true },
                relationships: {
                    inAppPurchase: {
                        data: { type: "inAppPurchases", id: iapId },
                    },
                    availableTerritories: {
                        data: t.data.data.map((x: any) => ({
                            type: "territories",
                            id: x.id,
                        })),
                    },
                },
            },
        });
    }

    // 7️⃣ Screenshot
    private async uploadScreenshot(api: any, iapId: string) {
        // STEP 1 - Check and delete existing screenshot
        try {
            const existingRes = await api.get(`/v2/inAppPurchases/${iapId}/appStoreReviewScreenshot`);
            const existingId = existingRes?.data?.data?.id;
            if (existingId) {
                await api.delete(`/v1/inAppPurchaseAppStoreReviewScreenshots/${existingId}`);
            }
        } catch (err: any) {
            // It's normal if there is no existing screenshot
        }

        const img = path.join(
            process.cwd(),
            "uploads/generate_screenshots",
            `${this.sku}.png`
        );

        if (!fs.existsSync(img)) return;

        const stat = fs.statSync(img);

        const reserve = await api.post(
            "/v1/inAppPurchaseAppStoreReviewScreenshots",
            {
                data: {
                    type: "inAppPurchaseAppStoreReviewScreenshots",
                    attributes: {
                        fileName: path.basename(img),
                        fileSize: stat.size,
                    },
                    relationships: {
                        inAppPurchaseV2: {
                            data: { type: "inAppPurchases", id: iapId },
                        },
                    },
                },
            }
        );

        const op = reserve.data.data.attributes.uploadOperations[0];

        await fetch(op.url, {
            method: "PUT",
            headers: { "Content-Type": "image/png" },
            body: fs.readFileSync(img),
        });

        await api.patch(
            `/v1/inAppPurchaseAppStoreReviewScreenshots/${reserve.data.data.id}`,
            { data: { id: reserve.data.data.id, type: "inAppPurchaseAppStoreReviewScreenshots", attributes: { uploaded: true } } }
        );
    }

    private findBestPricePoint(points: any[]) {
        return points
            .filter(p => Number(p.attributes.customerPrice) >= this.price)
            .sort(
                (a, b) =>
                    Number(a.attributes.customerPrice) -
                    Number(b.attributes.customerPrice)
            )[0];
    }

    private reviewNote() {
        return `Consumable item to recharge user balance via eSIM.\n\nHow to test:\n1. Launch app → go to “Packages” tab.\n2. Select the package.\n3. Proceed with purchase via the App Store flow.\n4. After successful purchase, the eSIM QR code should be generated / delivered within the app.\n\nThis is a consumable IAP and can be purchased multiple times.`;
    }
}
