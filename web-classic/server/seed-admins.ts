import bcrypt from "bcrypt";
import { admins } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";

async function seedAdmins() {
  const adminUsers = [
    {
      email: "superadmin@gmail.com",
      password: "Superadmin@123",
      name: "Super Admin",
      role: "super_admin",
    },
    {
      email: "admin@gmail.com",
      password: "Admin@123",
      name: "Admin",
      role: "admin",
    },
    {
      email: "demo@diploy.in",
      password: "Demo@123",
      name: "Demo",
      role: "admin",
    },
  ];

  for (const a of adminUsers) {
    const existing = await db.query.admins.findFirst({
      where: eq(admins.email, a.email),
    });

    if (existing) {
      console.log(`⏩ Skipped (already exists): ${a.email}`);
      continue;
    }

    const hash = await bcrypt.hash(a.password, 12);

    await db.insert(admins).values({
      email: a.email,
      password: hash,
      name: a.name,
      role: a.role,
    });

    console.log(`✓ Created ${a.role}: ${a.email}`);
  }
}

seedAdmins()
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
