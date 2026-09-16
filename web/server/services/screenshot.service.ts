import puppeteer from "puppeteer";
import ejs from "ejs";
import fs from "fs-extra";
import path from "path";

export interface ScreenshotProduct {
    showIap?: boolean;
    appName?: string;
    product: {
        id?: string;
        name: string;
        description: string;
        price: number;
        currency: string;
        slug: string;
    };
}

const TEMPLATE = path.resolve("server/templates/product.ejs");
const OUTPUT = path.resolve("uploads/generate_screenshots");

let browser: any = null;

async function getBrowser() {
    if (!browser) {
        try {
            browser = await puppeteer.launch({
                headless: true,
                args: [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                    "--no-zygote",
                    "--single-process"
                ]
            });
        } catch (err: any) {
            console.error("❌ Failed to launch Puppeteer:", err.message);
            if (err.message.includes("error while loading shared libraries")) {
                console.error("💡 TIP: You are likely missing system dependencies. Run this on your server:");
                console.error("sudo apt-get install -y libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2");
            }
            throw new Error(`Browser launch failed: ${err.message}`);
        }
    }
    return browser;
}

export async function createImages(products: ScreenshotProduct[]) {
    await fs.ensureDir(OUTPUT);

    const browser = await getBrowser();
    const page = await browser.newPage();

    await page.setViewport({
        width: 1242,
        height: 2688,
        deviceScaleFactor: 3
    });

    const results = [];

    // console.log("products", products)
    for (const item of products) {
        const html = await ejs.renderFile(TEMPLATE, {
            showIap: item.showIap,
            appName: item.appName,
            product: item.product
        });

        await page.setContent(html, { waitUntil: "networkidle0" });

        const phone = await page.$(".phone");
        if (!phone) throw new Error("Phone container missing");

        const file = `${OUTPUT}/${item.product.slug}.png`;
        await phone.screenshot({ path: file });

        results.push(`/uploads/generate_screenshots/${item.product.slug}.png`);
    }

    await page.close();
    return results;
}