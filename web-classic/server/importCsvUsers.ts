import fs from "fs";
import csv from "csv-parser";
import { db } from "./db";
import { users } from "@shared/schema";

const results: any[] = [];

console.log("Starting CSV import...");

fs.createReadStream("/home/esimconnect/server/users.csv")
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", async () => {
        try {
            let count = 0;
            for (const row of results) {
                if (row.role === 'admin') continue;
                if (!row.email) continue;

                let createdAt = new Date();
                if (row.created_at && !isNaN(new Date(row.created_at).getTime())) {
                    createdAt = new Date(row.created_at);
                }

                try {
                    await db.insert(users).values({
                        email: row.email,
                        name: row.name || null,
                        hashedPassword: row.password || null,
                        kycStatus: "pending",
                        createdAt: createdAt
                    }).onConflictDoNothing({ target: users.email });
                    count++;
                } catch (err) {
                    console.error(`Failed to insert ${row.email}:`, err);
                }
            }
            console.log(`Successfully processed and imported ${count} users.`);
            process.exit(0);
        } catch (e) {
            console.error(e);
            process.exit(1);
        }
    });
