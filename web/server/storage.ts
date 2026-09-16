import { eq, desc, and, sql, or, ilike, gt, inArray } from "drizzle-orm";
import { db } from "./db";
import { ensureUserWhatsappColumn } from "./utils/whatsapp";
import { normalizeVoucherCode } from "./utils/voucher";
import { getOrCreateUserSipAccount } from "./services/user-sip-service";
import {
  users, otpCodes, admins, destinations, regions, airaloPackages, orders, topups,
  tickets, ticketReplies, notifications, emailTemplates, settings, pages,
  kycDocuments, activityLogs, providerWebhooks, airaloNotifications, customNotifications, providers, currencyRates,
  unifiedPackages, resellerPackagePrices, voucherCodes, voucherUsage, giftCards, giftCardTransactions, referralProgram,
  resellerProviderSettings,
  languages, translationKeys, translationValues, referralSettings, contactMessages,
  type User, type InsertUser, type OtpCode, type InsertOtpCode,
  type Admin, type InsertAdmin, type Destination, type InsertDestination,
  type Region, type InsertRegion, type AiraloPackage, type InsertAiraloPackage,
  type Order, type InsertOrder, type Topup, type InsertTopup,
  type Ticket, type InsertTicket, type TicketReply, type InsertTicketReply,
  type Notification, type InsertNotification, type EmailTemplate, type InsertEmailTemplate,
  type Setting, type InsertSetting, type Page, type InsertPage,
  type KycDocument, type InsertKycDocument, type ActivityLog, type InsertActivityLog,
  type ProviderWebhook, type InsertProviderWebhook,
  type AiraloNotification, type InsertAiraloNotification,
  type CustomNotification, type InsertCustomNotification,
  type Provider, type InsertProvider,
  type CurrencyRate, type InsertCurrencyRate,
  type UnifiedPackage,
  type VoucherCode, type InsertVoucherUsage,
  type GiftCard, type InsertGiftCardTransaction,
  type Language, type InsertLanguage,
  type TranslationKey, type InsertTranslationKey,
  type TranslationValue, type InsertTranslationValue,
  referralTransactions,
  InsertReferralTransaction,
  airaloTopups,
} from "@shared/schema";

const VERIFIED_KYC_STATUSES = ["approved", "verified"];

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  getAllUsers(): Promise<User[]>;
  getUsersWithPagination(
    page?: number,
    limit?: number,
    search?: string,
    kycStatus?: string,
    status?: string,
    role?: string
  ): Promise<{
    data: User[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    stats: {
      totalVerified: number;
      totalPending: number;
      totalBlocked: number;
    };
  }>;

  // OTP
  createOTP(otp: InsertOtpCode): Promise<OtpCode>;
  getOTPByEmail(email: string, purpose?: string): Promise<OtpCode | undefined>;
  verifyOTP(email: string, code: string, purpose?: string): Promise<boolean>;

  // Admins
  getAdminByEmail(email: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;

  // Destinations
  getAllDestinations(): Promise<Destination[]>;
  getDestinationById(id: string): Promise<Destination | undefined>;
  getDestinationBySlug(slug: string): Promise<Destination | undefined>;
  createDestination(destination: InsertDestination): Promise<Destination>;
  updateDestination(id: string, data: Partial<Destination>): Promise<Destination | undefined>;
  getDestinationsWithPricing(resellerId?: string | null): Promise<Array<Destination & { minPrice: string; minDataAmount: string; minValidity: number }>>;

  // Regions
  getAllRegions(): Promise<Region[]>;
  getRegionById(id: string): Promise<Region | undefined>;
  getRegionBySlug(slug: string): Promise<Region | undefined>;
  getRegionByAiraloId(airaloId: string): Promise<Region | undefined>;
  createRegion(region: InsertRegion): Promise<Region>;
  updateRegion(id: string, data: Partial<Region>): Promise<Region | undefined>;
  getRegionsWithPricing(resellerId?: string | null): Promise<Array<Region & { minPrice: string; minDataAmount: string; minValidity: number }>>;

  // Airalo Packages
  getAllPackages(): Promise<AiraloPackage[]>;
  getPackageById(id: string): Promise<AiraloPackage | undefined>;
  getPackageBySlug(slug: string): Promise<AiraloPackage | undefined>;
  getPackageByAiraloId(airaloId: string): Promise<AiraloPackage | undefined>;
  getPackagesByDestination(destinationId: string): Promise<AiraloPackage[]>;
  getFeaturedPackages(): Promise<UnifiedPackage[]>;
  createPackage(pkg: InsertAiraloPackage): Promise<AiraloPackage>;
  updatePackage(id: string, data: Partial<AiraloPackage>): Promise<AiraloPackage | undefined>;
  batchCreatePackages(packages: InsertAiraloPackage[]): Promise<AiraloPackage[]>;
  batchUpdatePackages(updates: Array<{ id: string; data: Partial<AiraloPackage> }>): Promise<void>;
  deletePackage(id: string): Promise<void>;

  // Orders
  createOrder(order: InsertOrder): Promise<Order>;
  getOrderById(id: string): Promise<Order | undefined>;
  getOrderByRequestId(requestId: string): Promise<Order | undefined>;
  getOrdersByRequestId(requestId: string): Promise<Order[]>;
  getOrdersByUser(userId: string): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;
  updateOrder(id: string, data: Partial<Order>): Promise<Order | undefined>;
  deleteOrder(id: string): Promise<void>;
  getOrderByGuestAccessToken(token: string): Promise<Order | undefined>;

  // Topups
  createTopup(topup: InsertTopup): Promise<Topup>;
  getTopups(filters?: { page?: number; limit?: number; search?: string; status?: string }): Promise<{ data: Topup[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>;
  getTopupsByUser(userId: string): Promise<Topup[]>;

  // Tickets
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  getTicketById(id: string): Promise<Ticket | undefined>;
  getTicketsByUser(
    userId: string,
    page?: number,
    limit?: number
  ): Promise<{
    data: Ticket[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>;

  getAllTickets(): Promise<Ticket[]>;
  updateTicket(id: string, data: Partial<Ticket>): Promise<Ticket | undefined>;
  deleteTicket(id: string): Promise<void>;

  // Ticket Replies
  createTicketReply(reply: InsertTicketReply): Promise<TicketReply>;
  getRepliesByTicket(ticketId: string): Promise<TicketReply[]>;

  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getTotalNotificationsCount(userId: string): Promise<number>;
  getNotificationsByUser(
    userId: string,
    limit: number,
    offset: number
  ): Promise<Notification[]>;

  getUnreadNotificationCount(userId: string): Promise<number>;
  markNotificationRead(id: string): Promise<void>;
  deleteNotification(id: string): Promise<void>;
  deleteAllNotifications(userId: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  getNotificationSettings(): Promise<Record<string, boolean>>;

  // Email Templates
  getAllEmailTemplates(): Promise<EmailTemplate[]>;
  getEmailTemplateByType(type: string): Promise<EmailTemplate | undefined>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: string, data: Partial<EmailTemplate>): Promise<EmailTemplate | undefined>;

  // Providers
  getAllProviders(): Promise<Provider[]>;
  getProviderById(id: string): Promise<Provider | undefined>;
  getProviderBySlug(slug: string): Promise<Provider | undefined>;
  createProvider(provider: InsertProvider): Promise<Provider>;
  updateProvider(id: string, data: Partial<Provider>): Promise<Provider | undefined>;
  getEnabledProviders(): Promise<Provider[]>;
  getPreferredProvider(): Promise<Provider | undefined>;

  // Settings
  getAllSettings(): Promise<Setting[]>;
  getSettingByKey(key: string): Promise<Setting | undefined>;
  setSetting(setting: InsertSetting): Promise<Setting>;

  // Currencies
  getCurrencies(): Promise<CurrencyRate[]>;
  getCurrencyById(id: string): Promise<CurrencyRate | undefined>;
  createCurrency(currency: InsertCurrencyRate): Promise<CurrencyRate>;
  updateCurrency(id: string, data: Partial<CurrencyRate>): Promise<CurrencyRate | undefined>;
  deleteCurrency(id: string): Promise<void>;

  // Pages
  getAllPages(): Promise<Page[]>;
  getPublishedPages(): Promise<Page[]>;
  getPageById(id: string): Promise<Page | undefined>;
  getPageBySlug(slug: string): Promise<Page | undefined>;
  createPage(page: InsertPage): Promise<Page>;
  updatePage(id: string, data: Partial<Page>): Promise<Page | undefined>;
  deletePage(id: string): Promise<void>;

  // KYC Documents
  createKycDocument(document: InsertKycDocument): Promise<KycDocument>;
  getKycDocumentsByUser(userId: string): Promise<KycDocument[]>;
  getPendingKycRequests(status?: string): Promise<Array<KycDocument & { user: User }>>;
  updateKycDocument(id: string, data: Partial<KycDocument>): Promise<KycDocument | undefined>;

  // Activity Logs
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogsByUser(userId: string): Promise<ActivityLog[]>;
  getActivityLogsByAdmin(adminId: string): Promise<ActivityLog[]>;
  getAllActivityLogs(limit?: number): Promise<ActivityLog[]>;
  getUserWithDetails(userId: string): Promise<any>;
  getTopupsByUser(userId: string): Promise<Topup[]>;

  // Provider Webhooks (Generic for all providers)
  createProviderWebhook(webhook: InsertProviderWebhook): Promise<ProviderWebhook>;
  getProviderWebhooks(providerId: string, filters?: { type?: string, iccid?: string, processed?: boolean, limit?: number }): Promise<ProviderWebhook[]>;
  updateProviderWebhook(id: string, updates: Partial<ProviderWebhook>): Promise<ProviderWebhook | undefined>;

  // Airalo Notifications (DEPRECATED - use Provider Webhooks instead)
  createAiraloNotification(notification: InsertAiraloNotification): Promise<AiraloNotification>;
  getAiraloNotifications(filters?: { type?: string, iccid?: string, processed?: boolean, limit?: number }): Promise<AiraloNotification[]>;
  updateAiraloNotification(id: string, updates: Partial<AiraloNotification>): Promise<AiraloNotification | undefined>;
  getOrderByIccid(iccid: string): Promise<Order | undefined>;

  // Custom Notifications
  createCustomNotification(notification: InsertCustomNotification): Promise<CustomNotification>;
  getCustomNotifications(filters?: { limit?: number }): Promise<CustomNotification[]>;
  updateCustomNotification(id: string, updates: Partial<CustomNotification>): Promise<CustomNotification | undefined>;
  getAllUserEmails(): Promise<Array<{ id: string; email: string; name: string | null }>>;

  // Email Templates
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  getAllEmailTemplates(): Promise<EmailTemplate[]>;
  getEmailTemplateByEventType(eventType: string): Promise<EmailTemplate | undefined>;
  updateEmailTemplate(id: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: string): Promise<void>;

  // Stats
  getStats(timeFilter?: "7days" | "30days" | "lifetime"): Promise<any>;

  // Voucher Codes
  getVoucherByCode(code: string): Promise<VoucherCode | undefined>;
  incrementVoucherUsage(id: string): Promise<void>;
  createVoucherUsage(usage: InsertVoucherUsage): Promise<void>;
  getVoucherUsageByUserAndVoucher(userId: string, voucherId: string): Promise<number>;

  // Gift Cards
  getGiftCardByCode(code: string): Promise<GiftCard | undefined>;
  updateGiftCardBalance(id: string, newBalance: string): Promise<void>;
  createGiftCardTransaction(transaction: InsertGiftCardTransaction): Promise<void>;
  getGiftCardTransactions(giftCardId: string): Promise<any[]>;
  getGiftCardsByUser(userId: string): Promise<GiftCard[]>;

  // Referral Program
  getUserByReferralCode(code: string): Promise<User | undefined>;

  // Internationalization - Languages
  getAllLanguages(): Promise<Language[]>;
  getEnabledLanguages(): Promise<Language[]>;
  getLanguageById(id: string): Promise<Language | undefined>;
  getLanguageByCode(code: string): Promise<Language | undefined>;
  getDefaultLanguage(): Promise<Language | undefined>;
  createLanguage(language: InsertLanguage): Promise<Language>;
  updateLanguage(id: string, data: Partial<Language>): Promise<Language | undefined>;
  deleteLanguage(id: string): Promise<void>;
  setDefaultLanguage(id: string): Promise<void>;

  // Internationalization - Translation Keys
  getAllTranslationKeys(): Promise<TranslationKey[]>;
  getTranslationKeysByNamespace(namespace: string): Promise<TranslationKey[]>;
  getTranslationKeyById(id: string): Promise<TranslationKey | undefined>;
  createTranslationKey(key: InsertTranslationKey): Promise<TranslationKey>;
  updateTranslationKey(id: string, data: Partial<TranslationKey>): Promise<TranslationKey | undefined>;
  deleteTranslationKey(id: string): Promise<void>;
  bulkCreateTranslationKeys(keys: InsertTranslationKey[]): Promise<TranslationKey[]>;

  // Internationalization - Translation Values
  getTranslationsForLanguage(languageId: string): Promise<Array<{ namespace: string; key: string; value: string }>>;
  getTranslationValue(keyId: string, languageId: string): Promise<TranslationValue | undefined>;
  upsertTranslationValue(value: InsertTranslationValue): Promise<TranslationValue>;
  bulkUpsertTranslationValues(values: InsertTranslationValue[]): Promise<void>;
  getTranslationsForNamespace(namespace: string, languageId: string): Promise<Array<{ key: string; value: string }>>;
  getMissingTranslations(languageId: string): Promise<TranslationKey[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string) {
    await ensureUserWhatsappColumn();
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserWithDestinationsAndCurrency(id: string) {
    await ensureUserWhatsappColumn();
    const [row] = await db
      .select({
        user: users,
        destination: destinations,
        currencyRate: currencyRates,
      })
      .from(users)
      .where(eq(users.id, id))
      .leftJoin(destinations, eq(users.destination, destinations.id))
      .leftJoin(currencyRates, eq(users.currency, currencyRates.id));

    if (!row) return undefined;

    // Flatten the result to match expected format
    return {
      ...row.user,
      destination: row.destination,
      currencyRate: row.currencyRate,
    };
  }

  async getUserByEmail(email: string) {
    await ensureUserWhatsappColumn();
    const normalizedEmail = email.trim().toLowerCase();
    const [user] = await db
      .select()
      .from(users)
      .where(sql`lower(trim(${users.email})) = ${normalizedEmail}`);
    return user || undefined;
  }

  async createUser(insertUser: InsertUser) {
    await ensureUserWhatsappColumn();
    const [user] = await db.insert(users).values(insertUser).returning();
    try {
      await getOrCreateUserSipAccount(user.id);
    } catch (error) {
      console.error("[SIP] Failed to provision user SIP account:", error);
    }
    return user;
  }

  async updateUser(id: string, data: Partial<User>) {
    await ensureUserWhatsappColumn();
    const [user] = await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async getAllUsers() {
    await ensureUserWhatsappColumn();
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUsersWithPagination(
    page = 1,
    limit = 10,
    search?: string,
    kycStatus?: string,
    status?: string,
    role?: string
  ) {
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    const roleConditions: any[] = [];

    if (search) {
      conditions.push(
        or(
          ilike(users.name, `%${search}%`),
          ilike(users.email, `%${search}%`),
          ilike(users.phone, `%${search}%`),
          ilike(users.id, `%${search}%`)
        )
      );
    }

    if (kycStatus && kycStatus !== "all") {
      conditions.push(
        kycStatus === "verified"
          ? inArray(users.kycStatus, VERIFIED_KYC_STATUSES)
          : eq(users.kycStatus, kycStatus)
      );
    }

    if (status && status !== "all") {
      if (status === "active") {
        conditions.push(and(eq(users.isDeleted, false), eq(users.isBlocked, false)));
      } else if (status === "blocked") {
        conditions.push(and(eq(users.isDeleted, false), eq(users.isBlocked, true)));
      } else if (status === "deleted") {
        conditions.push(eq(users.isDeleted, true));
      }
    }

    if (role && role !== "all") {
      const roleCondition = eq(users.role, role);
      conditions.push(roleCondition);
      roleConditions.push(roleCondition);
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;
    const statsRoleCondition = roleConditions.length > 0 ? and(...roleConditions) : undefined;

    // ---------- RUN QUERIES ----------
    const [data, totalResult, verifiedResult, pendingResult, blockedResult] =
      await Promise.all([
        db
          .select()
          .from(users)
          .where(whereCondition)
          .orderBy(desc(users.createdAt))
          .limit(limit)
          .offset(offset),

        db
          .select({ count: sql`count(*)`.mapWith(Number) })
          .from(users)
          .where(whereCondition),

        db
          .select({ count: sql`count(*)`.mapWith(Number) })
          .from(users)
          .where(
            statsRoleCondition
              ? and(statsRoleCondition, inArray(users.kycStatus, VERIFIED_KYC_STATUSES))
              : inArray(users.kycStatus, VERIFIED_KYC_STATUSES),
          ),

        db
          .select({ count: sql`count(*)`.mapWith(Number) })
          .from(users)
          .where(
            statsRoleCondition
              ? and(statsRoleCondition, eq(users.kycStatus, "pending"))
              : eq(users.kycStatus, "pending"),
          ),

        db
          .select({ count: sql`count(*)`.mapWith(Number) })
          .from(users)
          .where(
            statsRoleCondition
              ? and(statsRoleCondition, eq(users.isBlocked, true), eq(users.isDeleted, false))
              : and(eq(users.isBlocked, true), eq(users.isDeleted, false)),
          ),
      ]);

    const total = totalResult[0]?.count || 0;
    const totalVerified = verifiedResult[0]?.count || 0;
    const totalPending = pendingResult[0]?.count || 0;
    const totalBlocked = blockedResult[0]?.count || 0;

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        totalVerified,
        totalPending,
        totalBlocked,
      },
    };
  }



  async getUserById(id: string) {
    return this.getUser(id);
  }

  async deleteUser(id: string) {
    await db
      .update(users)
      .set({
        isDeleted: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }


  // OTP
  async createOTP(insertOtp: InsertOtpCode) {
    const [otp] = await db.insert(otpCodes).values(insertOtp).returning();
    return otp;
  }

  async getOTPByEmail(email: string, purpose: string = "login") {
    const [otp] = await db.select().from(otpCodes)
      .where(and(
        eq(otpCodes.email, email),
        eq(otpCodes.verified, false),
        eq(otpCodes.purpose, purpose)
      ))
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);
    return otp || undefined;
  }

  async verifyOTP(email: string, code: string, purpose: string = "login") {
    const otp = await this.getOTPByEmail(email, purpose);

    if (!otp || otp.code !== code || new Date() > otp.expiresAt) {
      return false;
    }
    await db.update(otpCodes).set({ verified: true }).where(eq(otpCodes.id, otp.id));
    return true;
  }

  // Admins
  async getAdminByEmail(email: string) {
    const [admin] = await db.select().from(admins).where(eq(admins.email, email));
    return admin || undefined;
  }

  async getAdminById(id: string) {
    const [admin] = await db.select().from(admins).where(eq(admins.id, id));
    return admin || undefined;
  }


  async updateAdmin(id: string, data: Partial<{ email: string; password: string }>) {
    return db.update(admins).set(data).where(eq(admins.id, id));
  }


  async createAdmin(insertAdmin: InsertAdmin) {
    const [admin] = await db.insert(admins).values(insertAdmin).returning();
    return admin;
  }

  // Destinations
  async getAllDestinations() {
    return await db.select().from(destinations).where(eq(destinations.active, true)).orderBy(destinations.name);
  }

  async getDestinationById(id: string) {
    const [destination] = await db.select().from(destinations).where(eq(destinations.id, id));
    return destination || undefined;
  }

  async getDestinationBySlug(slug: string) {
    const [destination] = await db.select().from(destinations).where(eq(destinations.slug, slug));
    return destination || undefined;
  }

  async createDestination(insertDestination: InsertDestination) {
    const [destination] = await db.insert(destinations).values(insertDestination).returning();
    return destination;
  }

  async updateDestination(id: string, data: Partial<Destination>) {
    const [destination] = await db.update(destinations).set({ ...data, updatedAt: new Date() }).where(eq(destinations.id, id)).returning();
    return destination || undefined;
  }

  async getDestinationsWithPricing(resellerId?: string | null) {
    const resellerJoinCondition = resellerId
      ? and(
        eq(resellerPackagePrices.packageId, unifiedPackages.id),
        eq(resellerPackagePrices.resellerId, resellerId),
      )
      : sql`false`;
    const resellerProviderJoinCondition = resellerId
      ? and(
        eq(resellerProviderSettings.providerId, unifiedPackages.providerId),
        eq(resellerProviderSettings.resellerId, resellerId),
      )
      : sql`false`;
    const resellerVisibilityCondition = resellerId
      ? and(
        sql`COALESCE(${resellerPackagePrices.isEnabled}, true) = true`,
        sql`COALESCE(${resellerProviderSettings.isEnabled}, true) = true`,
      )
      : sql`true`;
    const displayPrice = resellerId
      ? sql<string>`COALESCE(${resellerPackagePrices.sellingPrice}, ${unifiedPackages.resellerPrice}, ${unifiedPackages.retailPrice}, ${unifiedPackages.wholesalePrice})`
      : sql<string>`${unifiedPackages.retailPrice}`;

    // Get destinations with enabled packages and pricing information
    const result = await db
      .select({
        id: destinations.id,
        airaloId: destinations.airaloId,
        slug: destinations.slug,
        name: destinations.name,
        countryCode: destinations.countryCode,
        flagEmoji: destinations.flagEmoji,
        image: destinations.image,
        bannerImage: destinations.bannerImage,
        isTerritory: destinations.isTerritory,
        parentCountryCode: destinations.parentCountryCode,
        active: destinations.active,
        createdAt: destinations.createdAt,
        updatedAt: destinations.updatedAt,
        // Minimum retail price among enabled packages
        minPrice: sql<string>`MIN(CAST(${displayPrice} AS DECIMAL))`,
        // Data amount of the cheapest package
        minDataAmount: sql<string>`(
          SELECT ${unifiedPackages.dataAmount}
          FROM ${unifiedPackages}
          WHERE ${unifiedPackages.destinationId} = ${destinations.id}
            AND ${unifiedPackages.isEnabled} = true
          ORDER BY CAST(${unifiedPackages.retailPrice} AS DECIMAL) ASC
          LIMIT 1
        )`,
        // Validity of the cheapest package
        minValidity: sql<number>`(
          SELECT ${unifiedPackages.validity}
          FROM ${unifiedPackages}
          WHERE ${unifiedPackages.destinationId} = ${destinations.id}
            AND ${unifiedPackages.isEnabled} = true
          ORDER BY CAST(${unifiedPackages.retailPrice} AS DECIMAL) ASC
          LIMIT 1
        )`,
        // Count of enabled packages for this destination
        packageCount: sql<number>`COUNT(${unifiedPackages.id})::int`,
      })
      .from(destinations)
      .innerJoin(unifiedPackages, and(
        eq(unifiedPackages.destinationId, destinations.id),
        eq(unifiedPackages.isEnabled, true)
      ))
      .leftJoin(resellerPackagePrices, resellerJoinCondition)
      .leftJoin(resellerProviderSettings, resellerProviderJoinCondition)
      .where(and(eq(destinations.active, true), resellerVisibilityCondition))
      .groupBy(destinations.id)
      .orderBy(destinations.name);

    return result;
  }

  // Regions
  async getAllRegions() {
    return await db.select().from(regions).where(eq(regions.active, true)).orderBy(regions.name);
  }

  async getRegionById(id: string) {
    const [region] = await db.select().from(regions).where(eq(regions.id, id));
    return region || undefined;
  }

  async getRegionBySlug(slug: string) {
    const [region] = await db.select().from(regions).where(eq(regions.slug, slug));
    return region || undefined;
  }

  async getRegionByAiraloId(airaloId: string) {
    const [region] = await db.select().from(regions).where(eq(regions.airaloId, airaloId));
    return region || undefined;
  }

  async createRegion(insertRegion: InsertRegion) {
    const [region] = await db.insert(regions).values(insertRegion).returning();
    return region;
  }

  async updateRegion(id: string, data: Partial<Region>) {
    const [region] = await db.update(regions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(regions.id, id))
      .returning();
    return region || undefined;
  }

  async getRegionsWithPricing(resellerId?: string | null) {
    const resellerJoinCondition = resellerId
      ? and(
        eq(resellerPackagePrices.packageId, unifiedPackages.id),
        eq(resellerPackagePrices.resellerId, resellerId),
      )
      : sql`false`;
    const resellerProviderJoinCondition = resellerId
      ? and(
        eq(resellerProviderSettings.providerId, unifiedPackages.providerId),
        eq(resellerProviderSettings.resellerId, resellerId),
      )
      : sql`false`;
    const resellerVisibilityCondition = resellerId
      ? and(
        sql`COALESCE(${resellerPackagePrices.isEnabled}, true) = true`,
        sql`COALESCE(${resellerProviderSettings.isEnabled}, true) = true`,
      )
      : sql`true`;
    const displayPrice = resellerId
      ? sql<string>`COALESCE(${resellerPackagePrices.sellingPrice}, ${unifiedPackages.resellerPrice}, ${unifiedPackages.retailPrice}, ${unifiedPackages.wholesalePrice})`
      : sql<string>`${unifiedPackages.retailPrice}`;

    // Get regions with enabled packages and pricing information.
    const result = await db
      .select({
        id: regions.id,
        airaloId: regions.airaloId,
        slug: regions.slug,
        name: regions.name,
        image: regions.image,
        bannerImage: regions.bannerImage,
        countries: regions.countries,
        active: regions.active,
        createdAt: regions.createdAt,
        updatedAt: regions.updatedAt,
        minPrice: sql<string>`MIN(CAST(${displayPrice} AS DECIMAL))`,
        // Data amount of the cheapest package
        minDataAmount: sql<string>`(
          SELECT ${unifiedPackages.dataAmount}
          FROM ${unifiedPackages}
          WHERE ${unifiedPackages.regionId} = ${regions.id}
          ORDER BY CAST(${unifiedPackages.retailPrice} AS DECIMAL) ASC
          LIMIT 1
        )`,
        // Validity of the cheapest package
        minValidity: sql<number>`(
          SELECT ${unifiedPackages.validity}
          FROM ${unifiedPackages}
          WHERE ${unifiedPackages.regionId} = ${regions.id}
          ORDER BY CAST(${unifiedPackages.retailPrice} AS DECIMAL) ASC
          LIMIT 1
        )`,
        // Count of packages for this region
        packageCount: sql<number>`COUNT(${unifiedPackages.id})::int`,
      })
      .from(regions)
      .innerJoin(unifiedPackages, and(
        eq(unifiedPackages.regionId, regions.id),
        eq(unifiedPackages.isEnabled, true)
      ))
      .leftJoin(resellerPackagePrices, resellerJoinCondition)
      .leftJoin(resellerProviderSettings, resellerProviderJoinCondition)
      .where(and(eq(regions.active, true), resellerVisibilityCondition))
      .groupBy(regions.id)
      .orderBy(regions.name);

    return result;
  }

  async getUnifiedPackagesPaginated({
    limit,
    offset,
    search,
    providerId,
    destinationId,
  }: {
    limit: number;
    offset: number;
    search: string;
    providerId?: string;
    destinationId?: string;
  }) {
    const conditions: any[] = [];

    if (search) {
      conditions.push(
        or(
          ilike(unifiedPackages.dataAmount, `%${search}%`),
          ilike(unifiedPackages.operator, `%${search}%`),
          ilike(unifiedPackages.providerPackageTable, `%${search}%`),
          ilike(destinations.name, `%${search}%`),
          ilike(destinations.countryCode, `%${search}%`)
        )
      );
    }

    if (providerId) {
      conditions.push(eq(unifiedPackages.providerId, providerId));
    }

    if (destinationId) {
      conditions.push(eq(unifiedPackages.destinationId, destinationId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await db
      .select()
      .from(unifiedPackages)
      .leftJoin(destinations, eq(unifiedPackages.destinationId, destinations.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(unifiedPackages)
      .leftJoin(destinations, eq(unifiedPackages.destinationId, destinations.id))
      .where(whereClause);

    // Extract just the unified_packages data from the joined result
    const packageData = data.map(row => row.unified_packages);

    return {
      data: packageData,
      total: Number(count),
    };
  }

  async getUnifiedPackages() {
    const pkgs = await db.select().from(unifiedPackages);
    return pkgs || [];
  }

  async getUnifiedPackageById(id: string) {
    const [pkg] = await db.select().from(unifiedPackages).where(eq(unifiedPackages.id, id));
    return pkg || undefined;
  }

  // Airalo Packages
  async getAllPackages() {
    return await db.select().from(airaloPackages).where(eq(airaloPackages.active, true)).orderBy(airaloPackages.price);
  }

  async getPackageById(id: string) {
    const [pkg] = await db.select().from(airaloPackages).where(eq(airaloPackages.id, id));
    return pkg || undefined;
  }

  async getPackageBySlug(slug: string) {
    const [pkg] = await db.select().from(airaloPackages).where(eq(airaloPackages.slug, slug));
    return pkg || undefined;
  }

  async getPackageByAiraloId(airaloId: string) {
    const [pkg] = await db.select().from(airaloPackages).where(eq(airaloPackages.airaloId, airaloId));
    return pkg || undefined;
  }

  async getPackagesByDestination(destinationId: string) {
    return await db.select().from(airaloPackages)
      .where(and(eq(airaloPackages.destinationId, destinationId), eq(airaloPackages.active, true)))
      .orderBy(airaloPackages.price);
  }

  async getFeaturedPackages() {
    // Prefer admin-selected popular packages. If none are marked yet after a sync,
    // fall back to enabled packages from common destinations so the homepage is not empty.
    const featuredPackages = await db.select().from(unifiedPackages)
      .where(and(
        eq(unifiedPackages.isPopular, true),
        eq(unifiedPackages.isEnabled, true)
      ))
      .orderBy(desc(unifiedPackages.salesCount), sql`CAST(${unifiedPackages.retailPrice} AS DECIMAL) ASC`)
      .limit(8);

    if (featuredPackages.length > 0) {
      return featuredPackages;
    }

    return await db.select().from(unifiedPackages)
      .where(eq(unifiedPackages.isEnabled, true))
      .orderBy(
        sql`CASE
          WHEN ${unifiedPackages.countryCode} IN ('US', 'GB', 'JP', 'DE', 'FR', 'IT', 'ES', 'AU', 'CA', 'TH', 'AE', 'KR') THEN 0
          WHEN ${unifiedPackages.destinationId} IS NOT NULL THEN 1
          ELSE 2
        END`,
        desc(unifiedPackages.salesCount),
        sql`CAST(${unifiedPackages.retailPrice} AS DECIMAL) ASC`
      )
      .limit(8);
  }

  async createPackage(insertPackage: InsertAiraloPackage) {
    const [pkg] = await db.insert(airaloPackages).values(insertPackage).returning();
    return pkg;
  }

  async updatePackage(id: string, data: Partial<AiraloPackage>) {
    const [pkg] = await db.update(airaloPackages).set({ ...data, updatedAt: new Date() }).where(eq(airaloPackages.id, id)).returning();
    return pkg || undefined;
  }

  async batchCreatePackages(packageData: InsertAiraloPackage[]) {
    if (packageData.length === 0) return [];
    const BATCH_SIZE = 100;
    const result: AiraloPackage[] = [];

    for (let i = 0; i < packageData.length; i += BATCH_SIZE) {
      const batch = packageData.slice(i, i + BATCH_SIZE);
      const created = await db.insert(airaloPackages).values(batch).returning();
      result.push(...created);
    }

    return result;
  }

  async batchUpdatePackages(updates: Array<{ id: string; data: Partial<AiraloPackage> }>) {
    if (updates.length === 0) return;

    for (const update of updates) {
      await db.update(airaloPackages)
        .set({ ...update.data, updatedAt: new Date() })
        .where(eq(airaloPackages.id, update.id));
    }
  }

  async deletePackage(id: string) {
    await db.delete(airaloPackages).where(eq(airaloPackages.id, id));
  }

  // Orders
  async createOrder(insertOrder: InsertOrder) {
    const [order] = await db.insert(orders).values(insertOrder).returning();
    return order;
  }

  async getOrderById(id: string) {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async getOrderByRequestId(requestId: string) {
    const [order] = await db.select().from(orders).where(eq(orders.requestId, requestId));
    return order || undefined;
  }

  async getOrdersByRequestId(requestId: string) {
    return await db.select().from(orders).where(eq(orders.requestId, requestId)).orderBy(orders.createdAt);
  }

  async getOrdersByUser(userId: string) {
    return await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
  }

  async getOrdersByStatus(userId: string, status: string) {
    return await db.select().from(orders).where(and(eq(orders.userId, userId), eq(orders.status, status))).orderBy(desc(orders.createdAt));
  }

  async getAllOrdersByStatus(status: string) {
    return await db.select().from(orders).where(eq(orders.status, status)).orderBy(desc(orders.createdAt));
  }

  async getAllOrders() {
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrdersByIccid(iccid: string) {
    return await db.select().from(orders).where(eq(orders.iccid, iccid)).orderBy(desc(orders.createdAt));
  }

  async updateOrder(id: string, data: Partial<Order>) {
    const [order] = await db.update(orders).set({ ...data, updatedAt: new Date() }).where(eq(orders.id, id)).returning();
    return order || undefined;
  }

  async deleteOrder(id: string) {
    await db.delete(orders).where(eq(orders.id, id));
  }

  async getOrderByGuestAccessToken(token: string) {
    const [order] = await db.select().from(orders).where(eq(orders.guestAccessToken, token));
    return order || undefined;
  }

  // Topups
  async createTopup(insertTopup: InsertTopup) {
    const [topup] = await db.insert(topups).values(insertTopup).returning();
    return topup;
  }

  // Tickets
  async createTicket(insertTicket: InsertTicket) {
    const [ticket] = await db.insert(tickets).values(insertTicket).returning();
    return ticket;
  }

  async getTicketById(id: string) {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    return ticket || undefined;
  }

  // async getTicketsByUser(userId: string) {
  //   return await db.select().from(tickets).where(eq(tickets.userId, userId)).orderBy(desc(tickets.createdAt));
  // }

  async getTicketsByUser(
    userId: string,
    page: number = 1,
    limit: number = 10
  ) {
    const offset = (page - 1) * limit;

    const data = await db
      .select()
      .from(tickets)
      .where(eq(tickets.userId, userId))
      .orderBy(desc(tickets.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tickets)
      .where(eq(tickets.userId, userId));

    return {
      data,
      pagination: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
      },
    };
  }


  async getAllTickets() {
    return await db.select().from(tickets).orderBy(desc(tickets.createdAt));
  }

  async updateTicket(id: string, data: Partial<Ticket>) {
    const [ticket] = await db.update(tickets).set({ ...data, updatedAt: new Date() }).where(eq(tickets.id, id)).returning();
    return ticket || undefined;
  }

  async deleteTicket(id: string) {
    await db.delete(ticketReplies).where(eq(ticketReplies.ticketId, id));
    await db.delete(tickets).where(eq(tickets.id, id));
  }

  // Ticket Replies
  async createTicketReply(insertReply: InsertTicketReply) {
    const [reply] = await db.insert(ticketReplies).values(insertReply).returning();
    return reply;
  }

  async getRepliesByTicket(ticketId: string) {
    return await db.select().from(ticketReplies).where(eq(ticketReplies.ticketId, ticketId)).orderBy(ticketReplies.createdAt);
  }

  // Notifications
  async createNotification(insertNotification: InsertNotification) {
    const [notification] = await db.insert(notifications).values(insertNotification).returning();
    return notification;
  }

  // async getNotificationsByUser(userId: string) {
  //   return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  // }



  async getTotalNotificationsCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(eq(notifications.userId, userId));

    return Number(result[0].count);
  }




  async getNotificationsByUser(
    userId: string,
    limit: number,
    offset: number
  ): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);
  }



  async getUnreadNotificationCount(userId: string) {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
    return Number(result[0]?.count || 0);
  }

  async markNotificationRead(id: string) {
    await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(userId: string) {
    await db.update(notifications).set({ read: true }).where(eq(notifications.userId, userId));
  }

  async getNotificationSettings(): Promise<Record<string, boolean>> {
    const allSettings = await this.getAllSettings();
    const notifSettings = allSettings.filter(s => s.key.startsWith('notif_'));
    const settingsObj: Record<string, boolean> = {};
    for (const setting of notifSettings) {
      settingsObj[setting.key] = setting.value === 'true';
    }
    return settingsObj;
  }

  async deleteNotification(id: string): Promise<void> {
    await db.delete(notifications).where(eq(notifications.id, id));
  }

  async deleteAllNotifications(userId: string): Promise<void> {
    await db
      .delete(notifications)
      .where(eq(notifications.userId, userId));
  }




  // Email Templates
  async getAllEmailTemplates() {
    return await db.select().from(emailTemplates);
  }

  async getEmailTemplateByType(eventType: string) {
    const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.eventType, eventType));
    return template || undefined;
  }

  async createEmailTemplate(insertTemplate: InsertEmailTemplate) {
    const [template] = await db.insert(emailTemplates).values(insertTemplate).returning();
    return template;
  }

  async updateEmailTemplate(id: string, data: Partial<EmailTemplate>) {
    const [template] = await db.update(emailTemplates).set({ ...data, updatedAt: new Date() }).where(eq(emailTemplates.id, id)).returning();
    return template || undefined;
  }

  async getEmailTemplateByEventType(eventType: string) {
    return this.getEmailTemplateByType(eventType);
  }

  // Providers
  async getAllProviders() {
    return await db.select().from(providers);
  }

  async getProviderById(id: string) {
    const [provider] = await db.select().from(providers).where(eq(providers.id, id));
    return provider || undefined;
  }

  async getProviderBySlug(slug: string) {
    const [provider] = await db.select().from(providers).where(eq(providers.slug, slug));
    return provider || undefined;
  }

  async createProvider(insertProvider: InsertProvider) {
    const [provider] = await db.insert(providers).values(insertProvider).returning();
    return provider;
  }

  async updateProvider(id: string, data: Partial<Provider>) {
    const [provider] = await db.update(providers)
      .set(data)
      .where(eq(providers.id, id))
      .returning();
    return provider || undefined;
  }

  async getEnabledProviders() {
    return await db.select().from(providers).where(eq(providers.enabled, true));
  }

  async getPreferredProvider() {
    const [provider] = await db.select().from(providers)
      .where(and(eq(providers.enabled, true), eq(providers.isPreferred, true)));
    return provider || undefined;
  }

  // Settings
  async getAllSettings() {
    return await db.select().from(settings);
  }

  async getPublicSettings() {
    return await db
      .select()
      .from(settings)
      .where(
        inArray(settings.key, [
          // 🌐 General
          'platform_name',
          'platform_tagline',
          'logo',
          'dark_logo',
          'email',
          'favicon',
          'currency',
          'timezone',
          'site_name',
          'site_description',
          'website_url',

          // 🎨 Theme
          'theme_primary',
          'theme_primary_second',
          'theme_primary_light',
          'theme_primary_dark',
          'theme_font_heading',
          'theme_font_body',

          // 🔗 Social
          'social_facebook',
          'social_instagram',
          'social_twitter',
          'social_linkedin',
          'social_youtube',
          'social_ios',
          'social_android',

          // 🧾 In-App
          'in_app_purchase',

          // 🔥 FIREBASE (ADD THESE)
          'firebase_api_key',
          'firebase_auth_domain',
          'firebase_project_id',
          'firebase_storage_bucket',
          'firebase_messaging_sender_id',
          'firebase_app_id',
          'firebase_measurement_id',

          // recaptcha settings

          'recaptcha_site_key',
          'recaptcha_enabled',

          // 🔍 SEO
          'seo_default_title',
          'seo_title_suffix',
          'seo_default_description',
          'seo_default_keywords',
          'seo_og_image',
          'seo_twitter_handle',
          'seo_google_verification',
          'seo_bing_verification',
          'show_demo_login',
          'kyc_enabled',
          'kyc_required_customer',
          'kyc_required_agent',
          'kyc_required_reseller',
          'support_whatsapp_enabled',
          'support_whatsapp_number',
          'support_whatsapp_schedule_enabled',
          'support_whatsapp_start_time',
          'support_whatsapp_end_time',
          'support_whatsapp_working_days',
          'support_whatsapp_mode',
          'concierge_enabled',
          'concierge_pricing_mode',
          'concierge_billing_cycle',
          'concierge_fee',
          'concierge_features',
          'concierge_hotline_enabled',
          'concierge_hotline_label',
          'concierge_hotline_number',
          'concierge_hotline_url',
          'concierge_sip_enabled',
          'concierge_sip_label',
          'concierge_ai_bot_enabled',
          'concierge_ai_bot_name',
          'concierge_ai_bot_welcome',
          'concierge_ai_bot_prompt',
          'concierge_trial_enabled',
          'concierge_free_trial_enabled',
          'concierge_trial_days',
          'registration_bonus_enabled',
          'registration_bonus_amount',
          'demo_mode_enabled',
          'demo_mode_environment',
          'sandbox_wallet_topup_enabled',
          'sandbox_wallet_topup_max',
          'sandbox_apply_customer',
          'sandbox_apply_agent',
          'sandbox_apply_reseller',
        ]),
      );
  }



  /* ---------------- CREATE ---------------- */
  async createContactMessage(data: any) {
    return db.insert(contactMessages).values(data).returning();
  }

  /* ---------------- GET ALL ---------------- */
  async getAllContactMessages() {
    return db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt));
  }

  /* ---------------- GET BY ID ---------------- */
  async getContactMessageById(id: string) {
    return db.query.contactMessages.findFirst({
      where: eq(contactMessages.id, id),
    });
  }

  /* ---------------- UPDATE ---------------- */
  async updateContactMessage(id: string, data: any) {
    return db
      .update(contactMessages)
      .set(data)
      .where(eq(contactMessages.id, id))
      .returning();
  }

  /* ---------------- DELETE ---------------- */
  async deleteContactMessage(id: string) {
    return db
      .delete(contactMessages)
      .where(eq(contactMessages.id, id));
  }




  async getSettingByKey(key: string) {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting || undefined;
  }

  async setSetting(insertSetting: InsertSetting) {
    const existing = await this.getSettingByKey(insertSetting.key);
    if (existing) {
      const [updated] = await db.update(settings)
        .set({ value: insertSetting.value, updatedAt: new Date() })
        .where(eq(settings.key, insertSetting.key))
        .returning();
      return updated;
    }
    const [setting] = await db.insert(settings).values(insertSetting).returning();
    return setting;
  }

  // Currencies
  async getCurrencies() {
    return await db.select().from(currencyRates).orderBy(currencyRates.code);
  }

  async getCurrencyById(id: string) {
    const [currency] = await db.select().from(currencyRates).where(eq(currencyRates.id, id));
    return currency || undefined;
  }

  async createCurrency(currency: InsertCurrencyRate) {
    const [newCurrency] = await db.insert(currencyRates).values(currency).returning();
    return newCurrency;
  }

  async updateCurrency(id: string, data: Partial<CurrencyRate>) {
    const [updated] = await db.update(currencyRates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(currencyRates.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCurrency(id: string) {
    await db.delete(currencyRates).where(eq(currencyRates.id, id));
  }

  // Pages
  async getAllPages() {
    return await db.select().from(pages).orderBy(pages.displayOrder);
  }

  async getPublishedPages() {
    return await db.select().from(pages)
      .where(eq(pages.published, true))
      .orderBy(pages.displayOrder);
  }

  async getPageById(id: string) {
    const [page] = await db.select().from(pages).where(eq(pages.id, id));
    return page || undefined;
  }

  async getPageBySlug(slug: string) {
    const [page] = await db.select().from(pages).where(eq(pages.slug, slug));
    return page || undefined;
  }

  async createPage(insertPage: InsertPage) {
    const [page] = await db.insert(pages).values(insertPage).returning();
    return page;
  }

  async updatePage(id: string, data: Partial<Page>) {
    const [updated] = await db.update(pages)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(pages.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePage(id: string) {
    await db.delete(pages).where(eq(pages.id, id));
  }

  // KYC Documents
  async createKycDocument(document: InsertKycDocument) {
    const [doc] = await db.insert(kycDocuments).values(document).returning();
    return doc;
  }

  async getKycDocumentsByUser(userId: string) {
    return await db.select().from(kycDocuments)
      .where(eq(kycDocuments.userId, userId))
      .orderBy(desc(kycDocuments.createdAt));
  }

  async getPendingKycRequests(status?: string) {
    const whereClause = status && status !== 'all'
      ? eq(kycDocuments.status, status)
      : undefined;

    return await db.select({
      id: kycDocuments.id,
      userId: kycDocuments.userId,
      documentType: kycDocuments.documentType,
      filePath: kycDocuments.filePath,
      fileName: kycDocuments.fileName,
      fileSize: kycDocuments.fileSize,
      mimeType: kycDocuments.mimeType,
      status: kycDocuments.status,
      rejectionReason: kycDocuments.rejectionReason,
      createdAt: kycDocuments.createdAt,
      user: users
    })
      .from(kycDocuments)
      .leftJoin(users, eq(kycDocuments.userId, users.id))
      .where(whereClause)
      .orderBy(desc(kycDocuments.createdAt)) as any;
  }

  async updateKycDocument(id: string, data: Partial<KycDocument>) {
    const [doc] = await db.update(kycDocuments).set(data).where(eq(kycDocuments.id, id)).returning();
    return doc || undefined;
  }

  // Activity Logs
  async createActivityLog(log: InsertActivityLog) {
    const [activityLog] = await db.insert(activityLogs).values(log).returning();
    return activityLog;
  }

  async getActivityLogsByUser(userId: string) {
    return await db.select().from(activityLogs)
      .where(eq(activityLogs.userId, userId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(100);
  }

  async getActivityLogsByAdmin(adminId: string) {
    return await db.select().from(activityLogs)
      .where(eq(activityLogs.adminId, adminId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(100);
  }

  async getAllActivityLogs(limit: number = 100) {
    return await db.select().from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  }

  async getUserWithDetails(userId: string) {
    const user = await this.getUser(userId);
    if (!user) return undefined;

    const userOrders = await this.getOrdersByUser(userId);
    const userTopups = await this.getTopupsByUser(userId);
    const userTickets = await this.getTicketsByUser(userId);
    const kycDocs = await this.getKycDocumentsByUser(userId);
    const activityLogs = await this.getActivityLogsByUser(userId);

    return {
      ...user,
      orders: userOrders,
      topups: userTopups,
      tickets: userTickets,
      kycDocuments: kycDocs,
      activityLogs,
    };
  }

  async getTopups(filters: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  } = {}) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (filters.status && filters.status !== 'all') {
      conditions.push(eq(topups.status, filters.status));
    }

    if (filters.search) {
      // Find users matching email
      const matchingUsers = await db.select({ id: users.id }).from(users).where(ilike(users.email, `%${filters.search}%`));
      const userIds = matchingUsers.map(u => u.id);

      const searchConditions = [
        ilike(topups.iccid, `%${filters.search}%`),
        ...(!isNaN(Number(filters.search)) ? [eq(topups.displayTopupId, Number(filters.search))] : []),
        ...(userIds.length > 0 ? [inArray(topups.userId, userIds)] : [])
      ];

      conditions.push(or(...searchConditions));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await db.query.topups.findMany({
      where: whereClause,
      with: {
        order: true,
        user: true,
        package: true,
      },
      orderBy: (topups, { desc }) => [desc(topups.createdAt)],
      limit: limit,
      offset: offset,
    });

    const statsResult = await db.select({
      count: sql<number>`count(*)`,
      totalRevenue: sql<string>`sum(price)`,
      totalCost: sql<string>`sum(airalo_price)`
    })
      .from(topups)
      .where(whereClause);

    const statsRow = statsResult[0] || { count: 0, totalRevenue: '0', totalCost: '0' };
    const total = Number(statsRow.count);
    const totalRevenue = parseFloat(statsRow.totalRevenue || '0');
    const totalCost = parseFloat(statsRow.totalCost || '0');

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats: {
        totalRevenue,
        totalCost,
        totalProfit: totalRevenue - totalCost
      }
    };
  }


  async getTopupsByUser(userId: string) {
    return await db.select().from(topups)
      .where(eq(topups.userId, userId))
      .orderBy(desc(topups.createdAt));
  }

  async getTopupById(packageId: string) {
    return await db.select().from(airaloTopups)
      .where(eq(airaloTopups.id, packageId))
      .orderBy(desc(airaloTopups.createdAt))
      .limit(1);
  }

  // Provider Webhooks (Generic for all providers)
  async createProviderWebhook(webhook: InsertProviderWebhook) {
    const [created] = await db.insert(providerWebhooks).values(webhook).returning();
    return created;
  }

  async getProviderWebhooks(providerId: string, filters?: { type?: string, iccid?: string, processed?: boolean, limit?: number }) {
    const conditions = [eq(providerWebhooks.providerId, providerId)];

    if (filters?.type) {
      conditions.push(eq(providerWebhooks.type, filters.type));
    }
    if (filters?.iccid) {
      conditions.push(eq(providerWebhooks.iccid, filters.iccid));
    }
    if (filters?.processed !== undefined) {
      conditions.push(eq(providerWebhooks.processed, filters.processed));
    }

    const result = await db.select()
      .from(providerWebhooks)
      .where(and(...conditions))
      .orderBy(desc(providerWebhooks.createdAt))
      .limit(filters?.limit || 100);

    return result;
  }

  async updateProviderWebhook(id: string, updates: Partial<ProviderWebhook>) {
    const [updated] = await db.update(providerWebhooks)
      .set(updates)
      .where(eq(providerWebhooks.id, id))
      .returning();
    return updated || undefined;
  }

  // Airalo Notifications (DEPRECATED - use Provider Webhooks instead)
  async createAiraloNotification(notification: InsertAiraloNotification) {
    const [created] = await db.insert(airaloNotifications).values(notification).returning();
    return created;
  }

  async getAiraloNotifications(filters?: { type?: string, iccid?: string, processed?: boolean, limit?: number }) {
    let query = db.select().from(airaloNotifications);

    const conditions = [];
    if (filters?.type) {
      conditions.push(eq(airaloNotifications.type, filters.type));
    }
    if (filters?.iccid) {
      conditions.push(eq(airaloNotifications.iccid, filters.iccid));
    }
    if (filters?.processed !== undefined) {
      conditions.push(eq(airaloNotifications.processed, filters.processed));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const result = await query.orderBy(desc(airaloNotifications.createdAt)).limit(filters?.limit || 100);
    return result;
  }

  async updateAiraloNotification(id: string, updates: Partial<AiraloNotification>) {
    const [updated] = await db.update(airaloNotifications)
      .set(updates)
      .where(eq(airaloNotifications.id, id))
      .returning();
    return updated || undefined;
  }

  async getOrderByIccid(iccid: string) {
    const [order] = await db.select().from(orders).where(eq(orders.iccid, iccid));
    return order || undefined;
  }

  // Custom Notifications
  async createCustomNotification(notification: InsertCustomNotification) {
    const [created] = await db.insert(customNotifications).values(notification).returning();
    return created;
  }

  async getCustomNotifications(filters?: { limit?: number }) {
    return await db.select().from(customNotifications)
      .orderBy(desc(customNotifications.createdAt))
      .limit(filters?.limit || 50);
  }

  async getCountCustomNotifications() {
    const result = await db
      .select({ count: count() })
      .from(customNotifications);
    return result[0].count;
  }



  async updateCustomNotification(id: string, updates: Partial<CustomNotification>) {
    const [updated] = await db.update(customNotifications)
      .set(updates)
      .where(eq(customNotifications.id, id))
      .returning();
    return updated || undefined;
  }

  async getAllUserEmails() {
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
    }).from(users);
    return allUsers;
  }

  async deleteEmailTemplate(id: string) {
    await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
  }

  // Stats
  async getStats(timeFilter: "7days" | "30days" | "lifetime" = "lifetime") {

    // =============================
    // BASIC COUNTS
    // =============================

    const [totalOrders] = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders);

    const totalRevenueResult = await db.execute(sql`
      SELECT COALESCE(SUM(
        CASE
          WHEN o.order_currency = 'USD' THEN o.price::numeric
          ELSE o.price::numeric / cr.conversion_rate::numeric
        END
      ), 0) AS sum
      FROM ${orders} o
      LEFT JOIN ${currencyRates} cr ON cr.code = o.order_currency
      WHERE o.status = 'completed'
    `);


    const [totalEsims] = await db
      .select({ sum: sql<number>`COALESCE(SUM(quantity), 0)` })
      .from(orders)
      .where(eq(orders.status, "completed"));

    const [totalCost] = await db
      .select({
        sum: sql<number>`COALESCE(SUM(wholesale_price::numeric * quantity), 0)`
      })
      .from(orders)
      .where(eq(orders.status, "completed"));

    const [totalCustomers] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    const [totalWalletFunds] = await db
      .select({ sum: sql<number>`COALESCE(SUM(wallet_balance::numeric), 0)` })
      .from(users)
      .where(eq(users.isDeleted, false));

    const [activePackages] = await db
      .select({ count: sql<number>`count(*)` })
      .from(unifiedPackages)
      .where(eq(unifiedPackages.isEnabled, true));

    const [totalPackages] = await db
      .select({ count: sql<number>`count(*)` })
      .from(unifiedPackages);

    const customerTypeCounts = await db.execute(sql`
      SELECT
        CASE
          WHEN role IN ('agent', 'reseller') THEN role
          ELSE 'customer'
        END AS role,
        COUNT(*) AS count
      FROM ${users}
      WHERE ${users.isDeleted} = false
      GROUP BY
        CASE
          WHEN role IN ('agent', 'reseller') THEN role
          ELSE 'customer'
        END
    `);

    const customerTypeProfitRows = await db.execute(sql`
      SELECT
        CASE
          WHEN o.reseller_id IS NOT NULL THEN 'reseller'
          WHEN u.role IN ('agent', 'reseller') THEN u.role
          ELSE 'customer'
        END AS role,
        COUNT(DISTINCT o.id) AS order_count,
        COALESCE(SUM(
          CASE
            WHEN o.order_currency = 'USD' THEN o.price::numeric
            ELSE o.price::numeric / COALESCE(NULLIF(cr.conversion_rate::numeric, 0), 1)
          END
        ), 0) AS total_revenue,
        COALESCE(SUM(COALESCE(o.wholesale_price, o.airalo_price, 0)::numeric * COALESCE(o.quantity, 1)), 0) AS total_cost
      FROM ${orders} o
      LEFT JOIN ${users} u ON o.user_id = u.id
      LEFT JOIN ${currencyRates} cr ON cr.code = o.order_currency
      WHERE o.status = 'completed'
      GROUP BY
        CASE
          WHEN o.reseller_id IS NOT NULL THEN 'reseller'
          WHEN u.role IN ('agent', 'reseller') THEN u.role
          ELSE 'customer'
        END
    `);

    const customerTypeStats: Record<string, { total: number; totalProfit: number }> = {
      customer: { total: 0, totalProfit: 0 },
      agent: { total: 0, totalProfit: 0 },
      reseller: { total: 0, totalProfit: 0 },
    };

    customerTypeCounts.rows.forEach((row: any) => {
      if (customerTypeStats[row.role]) {
        customerTypeStats[row.role].total = Number(row.count) || 0;
      }
    });

    customerTypeProfitRows.rows.forEach((row: any) => {
      if (customerTypeStats[row.role]) {
        const totalRevenue = Number(row.total_revenue) || 0;
        const totalCost = Number(row.total_cost) || 0;
        customerTypeStats[row.role].totalProfit = totalRevenue - totalCost;
      }
    });

    // =============================
    // DATE RANGES
    // =============================

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000);

    // =============================
    // LAST 30 DAYS
    // =============================

    const [ordersLast30Days] = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(sql`${orders.createdAt} >= ${thirtyDaysAgo.toISOString()}`);

    const revenueLast30DaysResult = await db.execute(sql`
      SELECT COALESCE(SUM(
        CASE 
          WHEN o.order_currency = 'USD' THEN o.price::numeric
          ELSE o.price::numeric / cr.conversion_rate::numeric
        END
      ), 0) AS sum
      FROM ${orders} o
      LEFT JOIN ${currencyRates} cr ON cr.code = o.order_currency
      WHERE o.status = 'completed'
        AND o.created_at >= ${thirtyDaysAgo.toISOString()}
    `);

    const [customersLast30Days] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(sql`${users.createdAt} >= ${thirtyDaysAgo.toISOString()}`);

    // =============================
    // PREVIOUS 30 DAYS
    // =============================

    const [ordersPrev30Days] = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(and(
        sql`${orders.createdAt} >= ${sixtyDaysAgo.toISOString()}`,
        sql`${orders.createdAt} < ${thirtyDaysAgo.toISOString()}`
      ));

    const revenuePrev30DaysResult = await db.execute(sql`
      SELECT COALESCE(SUM(
        CASE 
          WHEN o.order_currency = 'USD' THEN o.price::numeric
          ELSE o.price::numeric / cr.conversion_rate::numeric
        END
      ), 0) AS sum
      FROM ${orders} o
      LEFT JOIN ${currencyRates} cr ON cr.code = o.order_currency
      WHERE o.status = 'completed'
        AND o.created_at >= ${sixtyDaysAgo.toISOString()}
        AND o.created_at < ${thirtyDaysAgo.toISOString()}
    `);

    const revenueLast30Days = Number(revenueLast30DaysResult.rows[0]?.sum || 0);
    const revenuePrev30Days = Number(revenuePrev30DaysResult.rows[0]?.sum || 0);

    // =============================
    // TRENDS
    // =============================

    const orderTrend =
      Number(ordersPrev30Days.count) > 0
        ? ((Number(ordersLast30Days.count) - Number(ordersPrev30Days.count))
          / Number(ordersPrev30Days.count) * 100).toFixed(1)
        : "0";

    const revenueTrend =
      revenuePrev30Days > 0
        ? ((revenueLast30Days - revenuePrev30Days)
          / revenuePrev30Days * 100).toFixed(1)
        : "0";

    const customerTrend = Number(customersLast30Days.count) || 0;

    // =============================
    // REVENUE BY MONTH
    // =============================

    const revenueByMonth = await db.execute(sql`
      SELECT 
        to_char(o.created_at, 'Mon YYYY') AS month,
        SUM(
          CASE 
            WHEN o.order_currency = 'USD' THEN o.price::numeric
            ELSE o.price::numeric / cr.conversion_rate::numeric
          END
        ) AS revenue
      FROM ${orders} o
      LEFT JOIN ${currencyRates} cr ON cr.code = o.order_currency
      WHERE o.status = 'completed'
        AND o.created_at >= NOW() - INTERVAL '6 months'
      GROUP BY to_char(o.created_at, 'YYYY-MM'), to_char(o.created_at, 'Mon YYYY')
      ORDER BY to_char(o.created_at, 'YYYY-MM')
    `);

    // =============================
    // ORDERS BY STATUS
    // =============================

    const ordersByStatus = await db
      .select({
        status: orders.status,
        count: sql<number>`count(*)`
      })
      .from(orders)
      .groupBy(orders.status);

    // =============================
    // TOP DESTINATIONS
    // =============================

    const topDestinations = await db.execute(sql`
      SELECT 
        d.name AS country,
        d.flag_emoji AS flag,
        COUNT(o.id) AS count,
        SUM(
          CASE 
            WHEN o.order_currency = 'USD' THEN o.price::numeric
            ELSE o.price::numeric * cr.conversion_rate::numeric
          END
        ) AS revenue
      FROM ${orders} o
      JOIN ${unifiedPackages} p ON o.package_id = p.id
      LEFT JOIN ${destinations} d ON p.destination_id = d.id
      LEFT JOIN ${currencyRates} cr ON cr.code = o.order_currency
      WHERE o.status = 'completed'
        AND d.name IS NOT NULL
      GROUP BY d.name, d.flag_emoji
      ORDER BY count DESC
      LIMIT 10
    `);

    // =============================
    // TICKETS
    // =============================

    const [pendingTickets] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tickets)
      .where(eq(tickets.status, "open"));

    const [totalTickets] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tickets);

    // =============================
    // LATEST ORDERS
    // =============================

    const latestOrders = await db.execute(sql`
      SELECT 
        o.*,
        u.email AS user_email,
        p.title AS package_title,
        d.name AS destination_name
      FROM ${orders} o
      LEFT JOIN ${users} u ON o.user_id = u.id
      JOIN ${unifiedPackages} p ON o.package_id = p.id
      LEFT JOIN ${destinations} d ON p.destination_id = d.id
      ORDER BY o.created_at DESC
      LIMIT 10
    `);

    // =============================
    // LATEST CUSTOMERS
    // =============================

    const latestCustomers = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(10);

    // =============================
    // ORDERS BY COUNTRY
    // =============================

    const timeFilterDate =
      timeFilter === "7days" ? new Date(Date.now() - 7 * 86400000)
        : timeFilter === "30days" ? new Date(Date.now() - 30 * 86400000)
          : null;

    const ordersByCountry = await db.execute(sql`
      SELECT 
        d.name AS country,
        d.country_code AS iso2,
        COUNT(o.id) AS count
      FROM ${orders} o
      JOIN ${unifiedPackages} p ON o.package_id = p.id
      LEFT JOIN ${destinations} d ON p.destination_id = d.id
      WHERE d.name IS NOT NULL
      ${timeFilterDate ? sql`AND o.created_at >= ${timeFilterDate.toISOString()}` : sql``}
      GROUP BY d.name, d.country_code
    `);

    // =============================
    // PROVIDER STATS
    // =============================

    const providerStats = await db.execute(sql`
      SELECT 
        pr.id,
        pr.name,
        pr.slug,
        COUNT(DISTINCT o.id) AS order_count,
        SUM(o.wholesale_price::numeric * o.quantity) AS total_cost,
        SUM(
          CASE 
            WHEN o.order_currency = 'USD' THEN o.price::numeric
            ELSE o.price::numeric / cr.conversion_rate::numeric
          END
        ) AS total_revenue
      FROM ${providers} pr
      LEFT JOIN ${orders} o ON o.provider_id = pr.id AND o.status = 'completed'
      LEFT JOIN ${currencyRates} cr ON cr.code = o.order_currency
      WHERE pr.enabled = true
      GROUP BY pr.id, pr.name, pr.slug
      ORDER BY pr.name
    `);

    // =============================
    // RETURN (FULL DATA)
    // =============================

    return {
      totalOrders: Number(totalOrders.count) || 0,
      totalRevenue: Number(totalRevenueResult.rows[0]?.sum) || 0,
      totalEsims: Number(totalEsims.sum) || 0,
      totalCost: Number(totalCost.sum) || 0,
      totalCustomers: Number(totalCustomers.count) || 0,
      totalWalletFunds: Number(totalWalletFunds.sum) || 0,
      customerTypeStats,
      activePackages: Number(activePackages.count) || 0,
      totalPackages: Number(totalPackages.count) || 0,
      pendingTickets: Number(pendingTickets.count) || 0,
      totalTickets: Number(totalTickets.count) || 0,

      trends: {
        orders: Number(orderTrend),
        revenue: Number(revenueTrend),
        customers: Number(customerTrend),
      },

      revenueByMonth: revenueByMonth.rows.map((r: any) => ({
        month: r.month,
        revenue: Number(r.revenue) || 0,
      })),

      ordersByStatus: ordersByStatus.map(r => ({
        status: r.status,
        count: Number(r.count),
      })),

      topDestinations: topDestinations.rows.map((r: any) => ({
        country: r.country,
        flag: r.flag,
        count: Number(r.count),
        revenue: Number(r.revenue) || 0,
      })),

      latestOrders: latestOrders.rows.map((r: any) => ({
        id: r.id,
        displayOrderId: r.display_order_id,
        userEmail: r.user_email,
        packageTitle: r.package_title,
        destinationName: r.destination_name,
        price: Number(r.price) || 0,
        status: r.status,
        createdAt: r.created_at,
      })),

      latestCustomers: latestCustomers.map(u => ({
        id: u.id,
        displayUserId: u.displayUserId,
        email: u.email,
        name: u.name,
        createdAt: u.createdAt,
      })),

      ordersByCountry: ordersByCountry.rows.map((r: any) => ({
        country: r.country,
        iso2: r.iso2,
        count: Number(r.count),
      })),

      providerStats: providerStats.rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        orderCount: Number(r.order_count) || 0,
        totalCost: Number(r.total_cost) || 0,
        totalRevenue: Number(r.total_revenue) || 0,
      })),
    };
  }




  // Voucher Codes
  async getVoucherByCode(code: string) {
    const normalizedCode = normalizeVoucherCode(code);
    const unformattedCode = normalizedCode.replace(/-/g, "");
    const originalCode = String(code || "").trim().toUpperCase();
    const [voucher] = await db.select().from(voucherCodes).where(
      or(
        eq(voucherCodes.code, normalizedCode),
        eq(voucherCodes.code, unformattedCode),
        eq(voucherCodes.code, originalCode),
      ),
    );
    return voucher || undefined;
  }

  async incrementVoucherUsage(id: string) {
    await db.update(voucherCodes)
      .set({ currentUses: sql`${voucherCodes.currentUses} + 1` })
      .where(eq(voucherCodes.id, id));
  }

  async createVoucherUsage(usage: InsertVoucherUsage) {
    await db.insert(voucherUsage).values(usage);
  }

  async getVoucherUsageByUserAndVoucher(userId: string, voucherId: string) {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(voucherUsage)
      .where(and(eq(voucherUsage.userId, userId), eq(voucherUsage.voucherId, voucherId)));
    return Number(result[0]?.count) || 0;
  }

  // Gift Cards
  async getGiftCardByCode(code: string) {
    const [giftCard] = await db.select().from(giftCards).where(eq(giftCards.code, code.toUpperCase()));
    return giftCard || undefined;
  }

  async updateGiftCardBalance(id: string, newBalance: string) {
    await db.update(giftCards)
      .set({ balance: newBalance, updatedAt: new Date() })
      .where(eq(giftCards.id, id));
  }

  async createGiftCardTransaction(transaction: InsertGiftCardTransaction) {
    await db.insert(giftCardTransactions).values(transaction);
  }

  async getGiftCardTransactions(giftCardId: string) {
    return await db.select().from(giftCardTransactions)
      .where(eq(giftCardTransactions.giftCardId, giftCardId))
      .orderBy(desc(giftCardTransactions.usedAt));
  }

  async getGiftCardsByUser(userId: string) {
    return await db.select().from(giftCards)
      .where(or(eq(giftCards.purchasedBy, userId), eq(giftCards.redeemedBy, userId)))
      .orderBy(desc(giftCards.createdAt));
  }

  // Referral Program
  async getUserByReferralCode(code: string) {
    const [result] = await db.select({ user: users })
      .from(referralProgram)
      .innerJoin(users, eq(referralProgram.userId, users.id))
      .where(eq(referralProgram.referralCode, code.toUpperCase()));
    return result?.user || undefined;
  }

  async createReferralTransaction(transaction: InsertReferralTransaction) {
    await db.insert(referralTransactions).values(transaction);
  }

  async getReferralTransactions(userId: string) {
    return await db.select().from(referralTransactions)
      .where(eq(referralTransactions.userId, userId))
      .orderBy(desc(referralTransactions.createdAt));
  }


  async getReferralSettings() {
    const [settings] = await db
      .select()
      .from(referralSettings)
      .limit(1);

    return settings || null;
  }


  // ==================== INTERNATIONALIZATION ====================

  // Languages
  async getAllLanguages() {
    return await db.select().from(languages).orderBy(languages.sortOrder);
  }

  async getEnabledLanguages() {
    return await db.select().from(languages)
      .where(eq(languages.isEnabled, true))
      .orderBy(languages.sortOrder);
  }

  async getLanguageById(id: string) {
    const [language] = await db.select().from(languages).where(eq(languages.id, id));
    return language || undefined;
  }

  async getLanguageByCode(code: string) {
    const [language] = await db.select().from(languages).where(eq(languages.code, code));
    return language || undefined;
  }

  async getDefaultLanguage() {
    const [language] = await db.select().from(languages).where(eq(languages.isDefault, true));
    return language || undefined;
  }

  async createLanguage(language: InsertLanguage) {
    const [created] = await db.insert(languages).values(language).returning();
    return created;
  }

  async updateLanguage(id: string, data: Partial<Language>) {
    const [updated] = await db.update(languages)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(languages.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteLanguage(id: string) {
    await db.delete(languages).where(eq(languages.id, id));
  }

  async setDefaultLanguage(id: string) {
    // Remove default from all languages first
    await db.update(languages).set({ isDefault: false });
    // Set the new default
    await db.update(languages).set({ isDefault: true }).where(eq(languages.id, id));
  }

  // Translation Keys
  async getAllTranslationKeys() {
    return await db.select().from(translationKeys).orderBy(translationKeys.namespace, translationKeys.key);
  }

  async getTranslationKeysByNamespace(namespace: string) {
    return await db.select().from(translationKeys)
      .where(eq(translationKeys.namespace, namespace))
      .orderBy(translationKeys.key);
  }

  async getTranslationKeyById(id: string) {
    const [key] = await db.select().from(translationKeys).where(eq(translationKeys.id, id));
    return key || undefined;
  }

  async createTranslationKey(key: InsertTranslationKey) {
    const [created] = await db.insert(translationKeys).values(key).returning();
    return created;
  }

  async updateTranslationKey(id: string, data: Partial<TranslationKey>) {
    const [updated] = await db.update(translationKeys)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(translationKeys.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteTranslationKey(id: string) {
    await db.delete(translationKeys).where(eq(translationKeys.id, id));
  }

  async bulkCreateTranslationKeys(keys: InsertTranslationKey[]) {
    if (keys.length === 0) return [];
    return await db.insert(translationKeys).values(keys).returning();
  }

  // Translation Values
  async getTranslationsForLanguage(languageId: string) {
    const results = await db.select({
      namespace: translationKeys.namespace,
      key: translationKeys.key,
      value: translationValues.value,
    })
      .from(translationValues)
      .innerJoin(translationKeys, eq(translationValues.keyId, translationKeys.id))
      .where(eq(translationValues.languageId, languageId));
    return results;
  }

  async getTranslationValue(keyId: string, languageId: string) {
    const [value] = await db.select().from(translationValues)
      .where(and(
        eq(translationValues.keyId, keyId),
        eq(translationValues.languageId, languageId)
      ));
    return value || undefined;
  }

  async upsertTranslationValue(value: InsertTranslationValue) {
    // Check if exists
    const existing = await this.getTranslationValue(value.keyId, value.languageId);
    if (existing) {
      const [updated] = await db.update(translationValues)
        .set({ ...value, updatedAt: new Date() })
        .where(eq(translationValues.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(translationValues).values(value).returning();
      return created;
    }
  }

  async bulkUpsertTranslationValues(values: InsertTranslationValue[]) {
    for (const value of values) {
      await this.upsertTranslationValue(value);
    }
  }

  async getTranslationsForNamespace(namespace: string, languageId: string) {
    const results = await db.select({
      key: translationKeys.key,
      value: translationValues.value,
    })
      .from(translationValues)
      .innerJoin(translationKeys, eq(translationValues.keyId, translationKeys.id))
      .where(and(
        eq(translationKeys.namespace, namespace),
        eq(translationValues.languageId, languageId)
      ));
    return results;
  }

  async getMissingTranslations(languageId: string) {
    // Get all keys that don't have a translation for this language
    const translatedKeyIds = db.select({ keyId: translationValues.keyId })
      .from(translationValues)
      .where(eq(translationValues.languageId, languageId));

    const missingKeys = await db.select().from(translationKeys)
      .where(sql`${translationKeys.id} NOT IN (${translatedKeyIds})`);
    return missingKeys;
  }
}

export const storage = new DatabaseStorage();
