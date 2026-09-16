import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { normalizeDisplayWords } from "@/lib/displayText";

interface Language {
  id: string;
  code: string;
  name: string;
  nativeName: string;
  flagCode: string;
  isRTL: boolean;
  isEnabled: boolean;
  isDefault: boolean;
  sortOrder: number;
}

interface TranslationContextType {
  language: Language | null;
  languages: Language[];
  languageCode: string;
  isRTL: boolean;
  isLoading: boolean;
  setLanguage: (code: string) => void;
  t: (
    key: string,
    fallbackOrParams?: string | Record<string, string | number>,
    params?: Record<string, string | number>
  ) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(
  undefined
);

type TranslationData = Record<string, Record<string, string>>;

const STORAGE_KEY = "esim_language";
const RTL_LANGUAGE_CODES = new Set(["ar", "fa", "he", "ur"]);
const DOM_TRANSLATION_SKIP_SELECTOR =
  "script,style,noscript,code,pre,textarea,[contenteditable='true'],[data-no-dom-translate]";
const BUILT_IN_TRANSLATION_LOADERS: Record<string, () => Promise<TranslationData>> = {
  en: () => import("@/locales/en_translations.json").then((m) => m.default as TranslationData),
  ar: () => import("@/locales/ar_translations.json").then((m) => m.default as TranslationData),
  fr: () => import("@/locales/fr_translations.json").then((m) => m.default as TranslationData),
  es: () => import("@/locales/es_translations.json").then((m) => m.default as TranslationData),
  ru: () => import("@/locales/ru_translations.json").then((m) => m.default as TranslationData),
  it: () => import("@/locales/it_translations.json").then((m) => m.default as TranslationData),
};
const builtInTranslationCache: Record<string, TranslationData> = {};
const ARABIC_TEXT_PATTERN = /[\u0600-\u06FF]/;

async function loadBuiltInTranslation(code: string) {
  if (builtInTranslationCache[code]) {
    return builtInTranslationCache[code];
  }

  const loader = BUILT_IN_TRANSLATION_LOADERS[code];
  if (!loader) {
    builtInTranslationCache[code] = {};
    return builtInTranslationCache[code];
  }

  try {
    const data = await loader();
    builtInTranslationCache[code] = data;
  } catch (error) {
    console.error(`Failed to load built-in translations for ${code}:`, error);
    builtInTranslationCache[code] = {};
  }

  return builtInTranslationCache[code];
}

const ARABIC_PHRASE_OVERRIDES: Record<string, string> = {
  "Create New User": "إنشاء مستخدم جديد",
  "Create New Agent": "إنشاء وكيل جديد",
  "Create New Reseller": "إنشاء موزع جديد",
  "User Management": "إدارة المستخدمين",
  "Agent Management": "إدارة الوكلاء",
  "Reseller Management": "إدارة الموزعين",
  "Account Status": "حالة الحساب",
  "Account Status:": "حالة الحساب",
  "Account Type": "نوع الحساب",
  "Account Type:": "نوع الحساب",
  "Account Mode": "وضع الحساب",
  "Account Mode:": "وضع الحساب",
  "KYC Required": "KYC مطلوب",
  "KYC Required:": "KYC مطلوب",
  "KYC Verification Required": "التحقق من KYC مطلوب",
  "Access Login": "بيانات الدخول",
  "Quick Actions": "إجراءات سريعة",
  "General": "عام",
  "Modules": "الوحدات",
  "Create User": "إنشاء مستخدم",
  "Create Agent": "إنشاء وكيل",
  "Create Reseller": "إنشاء موزع",
  "Creating...": "جاري الإنشاء...",
  "Cancel": "إلغاء",
  "Back to Users": "رجوع إلى المستخدمين",
  "Back to Agents": "رجوع إلى الوكلاء",
  "Back to Resellers": "رجوع إلى الموزعين",
  "Email": "البريد الإلكتروني",
  "Email:": "البريد الإلكتروني",
  "Name": "الاسم",
  "Name:": "الاسم",
  "Password": "كلمة المرور",
  "Password:": "كلمة المرور",
  "Username": "اسم المستخدم",
  "Username:": "اسم المستخدم",
  "Role": "الدور",
  "Role:": "الدور",
  "Live": "مباشر",
  "Sandbox": "تجريبي",
  "Demo": "عرض تجريبي",
  "User": "مستخدم",
  "Agent": "وكيل",
  "Reseller": "موزع",
  "Users": "المستخدمون",
  "Agents": "الوكلاء",
  "Resellers": "الموزعون",
  "Yes": "نعم",
  "No": "لا",
  "Enabled": "مفعّل",
  "Disabled": "معطّل",
  "Selected": "محدد",
  "Not selected": "غير محدد",
  "Enable All": "تفعيل الكل",
  "Disable All": "تعطيل الكل",
  "Service modules": "وحدات الخدمات",
  "SERVICE MODULES": "وحدات الخدمات",
  "Calling controls": "إعدادات الاتصال",
  "CALLING CONTROLS": "إعدادات الاتصال",
  "Portal modules": "وحدات البوابة",
  "Select the modules this account can see and use": "اختر الوحدات التي يمكن لهذا الحساب رؤيتها واستخدامها",
  "Select the modules this account can see and use.": "اختر الوحدات التي يمكن لهذا الحساب رؤيتها واستخدامها.",
  "Select the modules this account can see and use on the web portal.": "اختر الوحدات التي يمكن لهذا الحساب رؤيتها واستخدامها في بوابة الويب.",
  "Set initial password": "تعيين كلمة المرور الأولية",
  "Select account status": "اختر حالة الحساب",
  "Select account type": "اختر نوع الحساب",
  "Select KYC requirement": "اختر متطلب KYC",
  "Search Orders, Customers, Packages...": "البحث في الطلبات والعملاء والباقات...",
  "System Version": "إصدار النظام",
  "Updated": "تم التحديث",
  "Save": "حفظ",
  "Edit": "تعديل",
  "Delete": "حذف",
  "View": "عرض",
  "Search": "بحث",
  "Filter": "تصفية",
  "Export": "تصدير",
  "Import": "استيراد",
  "Download": "تحميل",
  "Upload": "رفع",
  "Settings": "الإعدادات",
  "Dashboard": "لوحة التحكم",
  "Statistics": "الإحصائيات",
  "Customers": "العملاء",
  "Orders": "الطلبات",
  "Transactions": "المعاملات",
  "Notifications": "الإشعارات",
  "Security": "الأمان",
  "Languages": "اللغات",
  "Translations": "الترجمات",
  "Features": "الميزات",
  "Currencies": "العملات",
  "Blog": "المدونة",
  "API Docs": "وثائق واجهة البرمجة",
  "Admin Panel": "لوحة الإدارة",
  "Loading...": "جاري التحميل...",
  "Loading": "جاري التحميل",
  "Redirecting you now...": "يتم تحويلك الآن...",
  "Back": "رجوع",
  "Go back": "رجوع",
  "Previous": "السابق",
  "Next": "التالي",
  "Close": "إغلاق",
  "Open": "مفتوح",
  "In Progress": "قيد المعالجة",
  "Resolved": "تم الحل",
  "Closed": "مغلق",
  "Total": "الإجمالي",
  "All": "الكل",
  "Status": "الحالة",
  "Priority": "الأولوية",
  "Title": "العنوان",
  "Title *": "العنوان *",
  "Description": "الوصف",
  "Description *": "الوصف *",
  "Conversation": "المحادثة",
  "Created": "تاريخ الإنشاء",
  "Created:": "تاريخ الإنشاء",
  "Customer": "العميل",
  "Customer Email": "بريد العميل",
  "Customer Price": "سعر العميل",
  "Customer ID": "معرّف العميل",
  "Phone": "الهاتف",
  "Address": "العنوان",
  "Date": "التاريخ",
  "Amount": "المبلغ",
  "Price": "السعر",
  "Package": "الباقة",
  "Package Name": "اسم الباقة",
  "Package ID": "معرّف الباقة",
  "Package Details": "تفاصيل الباقة",
  "Order": "الطلب",
  "Order Status": "حالة الطلب",
  "Order Management": "إدارة الطلبات",
  "Details": "التفاصيل",
  "Installation": "التثبيت",
  "Usage": "الاستخدام",
  "Top-Ups": "الشحنات",
  "Data": "البيانات",
  "Validity": "الصلاحية",
  "Operator": "المشغل",
  "Country": "البلد",
  "Coverage": "التغطية",
  "Fair Usage Policy": "سياسة الاستخدام العادل",
  "Activation Code": "رمز التفعيل",
  "QR Code Data": "بيانات رمز QR",
  "Confirmation Code": "رمز التأكيد",
  "Manual Activation Code:": "رمز التفعيل اليدوي",
  "Installation Steps": "خطوات التثبيت",
  "Device Compatibility": "توافق الجهاز",
  "Data Used": "البيانات المستخدمة",
  "Roaming": "التجوال",
  "Voucher Code": "رمز القسيمة",
  "Payment Method": "طريقة الدفع",
  "Credit/Debit Card": "بطاقة ائتمان/خصم",
  "Pay securely with your card": "ادفع بأمان باستخدام بطاقتك",
  "PayPal": "باي بال",
  "Pay with your PayPal account": "ادفع باستخدام حساب باي بال",
  "Apple Pay": "آبل باي",
  "Google Pay": "جوجل باي",
  "Quick and secure payment": "دفع سريع وآمن",
  "Fast checkout with Google": "دفع سريع عبر جوجل",
  "Welcome back": "مرحباً بعودتك",
  "Wallet Balance": "رصيد المحفظة",
  "Available wallet funds": "رصيد المحفظة المتاح",
  "Member Type": "نوع العضوية",
  "Current rewards level": "مستوى المكافآت الحالي",
  "Rewards Wallet": "محفظة المكافآت",
  "Rewards ready for conversion": "مكافآت جاهزة للتحويل",
  "Services": "الخدمات",
  "Open the services enabled for your account.": "افتح الخدمات المفعّلة لحسابك.",
  "Account Details": "تفاصيل الحساب",
  "Main profile information for this member.": "معلومات الملف الشخصي الأساسية لهذا العضو.",
  "Referral Balance": "رصيد الإحالة",
  "Recent Wallet Activity": "آخر نشاط للمحفظة",
  "Free Support": "دعم مجاني",
  "WhatsApp": "واتساب",
  "Call Center": "مركز الاتصال",
  "Calling.......": "جاري الاتصال.......",
  "Create New Support Ticket": "إنشاء تذكرة دعم جديدة",
  "Brief description of your issue": "وصف مختصر للمشكلة",
  "Please provide detailed information about your issue": "يرجى تقديم معلومات مفصلة عن المشكلة",
  "Type your reply...": "اكتب ردك...",
  "No tickets found": "لم يتم العثور على تذاكر",
  "No ticket selected": "لم يتم تحديد تذكرة",
  "No matches found": "لم يتم العثور على نتائج",
  "No Gift Cards Yet": "لا توجد بطاقات هدايا بعد",
  "Low": "منخفض",
  "Medium": "متوسط",
  "High": "مرتفع",
  "Urgent": "عاجل",
  "Submit": "إرسال",
  "Apply": "تطبيق",
  "Reset": "إعادة تعيين",
  "Refresh": "تحديث",
  "Copy": "نسخ",
  "Remove": "إزالة",
  "Remove item": "إزالة العنصر",
  "Download invoice": "تحميل الفاتورة",
  "Invoice": "فاتورة",
  "Invoices": "الفواتير",
  "Optional": "اختياري",
  "Optional invoice notes": "ملاحظات اختيارية للفاتورة",
  "Qty": "الكمية",
  "Unit price": "سعر الوحدة",
  "Search name, email, phone, or ID": "ابحث بالاسم أو البريد أو الهاتف أو المعرّف",
  "Select account": "اختر الحساب",
  "Select status": "اختر الحالة",
  "Filter tier": "تصفية المستوى",
  "Search member": "البحث عن عضو",
  "Saved key hidden": "المفتاح المحفوظ مخفي",
  "Saved - enter new password to replace": "محفوظ - أدخل كلمة مرور جديدة للاستبدال",
  "Public Key Header": "ترويسة المفتاح العام",
  "Secret Key Header": "ترويسة المفتاح السري",
  "My Account": "حسابي",
  "Profile Settings": "إعدادات الملف الشخصي",
  "Preferences": "التفضيلات",
  "Logout": "تسجيل الخروج",
  "Switch language": "تغيير اللغة",
  "Toggle theme": "تبديل المظهر",
  "Select admin theme mode": "اختيار وضع مظهر الإدارة",
  "Open analytics": "فتح التحليلات",
  "Open orders": "فتح الطلبات",
  "Open customers": "فتح العملاء",
  "Open packages": "فتح الباقات",
  "View order": "عرض الطلب",
  "Filter by order status": "تصفية حسب حالة الطلب",
  "Toggle Sidebar": "تبديل الشريط الجانبي",
  "Hide navigation": "إخفاء التنقل",
  "Restore navigation": "استعادة التنقل",
  "Back to top": "العودة للأعلى",
  "Dismiss banner": "إغلاق الشريط",
  "Close banner": "إغلاق الشريط",
  "Download on App Store": "تحميل من App Store",
  "Get it on Google Play": "احصل عليه من Google Play",
  "Get it on Play Store": "احصل عليه من Play Store",
  "KYC Verification": "التحقق من KYC",
  "Vouchers Log's": "سجلات القسائم",
  "All eSIM Providers": "كل مزودي eSIM",
  "Custom Orders": "طلبات مخصصة",
  "Top-up Orders": "طلبات الشحن",
  "Master eSIM Packages": "باقات eSIM الرئيسية",
  "eSIM Catalog": "كتالوج eSIM",
  "Rates": "الأسعار",
  "Topup Packages": "باقات الشحن",
  "Regions": "المناطق",
  "Countries": "الدول",
  "Marketing": "التسويق",
  "Vouchers": "القسائم",
  "Gift Cards": "بطاقات الهدايا",
  "Referral Program": "برنامج الإحالة",
  "Member Rewards": "مكافآت الأعضاء",
  "Support System": "نظام الدعم",
  "Support": "الدعم",
  "Concierge": "الكونسيرج",
  "eRoaming's": "التجوال الإلكتروني",
  "Providers": "المزودون",
  "DID Numbers": "أرقام DID",
  "Cost & Price": "التكلفة والسعر",
  "Logs & Purchase": "السجلات والشراء",
  "Pending": "معلق",
  "Active": "نشط",
  "Debit Cards": "بطاقات الخصم",
  "IPTV Services": "خدمات IPTV",
  "IPTV Provider": "مزود IPTV",
  "Bouquets": "الباقات",
  "Channels": "القنوات",
  "IPTV Log's": "سجلات IPTV",
  "User List": "قائمة المستخدمين",
  "Setting": "الإعداد",
  "In App Purchases": "المشتريات داخل التطبيق",
  "Price Brackets": "شرائح الأسعار",
  "Payment Gateways": "بوابات الدفع",
  "Gateways": "البوابات",
  "Report & Invoice": "التقارير والفواتير",
  "Analytics & Reports": "التحليلات والتقارير",
  "Advanced": "متقدم",
  "Reviews": "المراجعات",
  "Extra": "إضافي",
  "SIP Configuration": "إعدادات SIP",
  "2FA": "المصادقة الثنائية",
  "IP Log's": "سجلات IP",
  "International": "دولي",
  "Platform Setup": "إعدادات المنصة",
  "Failover & API": "التبديل الاحتياطي وواجهة البرمجة",
  "Banner Management": "إدارة البنرات",
  "Pages Management": "إدارة الصفحات",
  "FAQ Management": "إدارة الأسئلة الشائعة",
  "Transaction Reporting": "تقارير المعاملات",
  "All eRoaming/DID Wallet Charges, Estimated Provider Costs, SMS Records, And Gross Margin.": "كل رسوم محفظة التجوال الإلكتروني وأرقام DID وتكاليف المزود المقدرة وسجلات SMS والهامش الإجمالي.",
  "All Package Purchases, Provider Cost, Customer Charge, Profit, Top-Ups, And Fulfillment Status.": "كل مشتريات الباقات وتكلفة المزود ورسوم العميل والربح والشحنات وحالة التنفيذ.",
  "All Customer Wallet Transactions, Top-Ups, Purchases, Voucher Activity, Refunds, And Balance Movement.": "كل معاملات محفظة العملاء والشحنات والمشتريات ونشاط القسائم والمبالغ المستردة وحركة الرصيد.",
  "Customer Charges": "رسوم العميل",
  "Provider Cost": "تكلفة المزود",
  "Customer Charge": "رسوم العميل",
  "Usage Source": "مصدر الاستخدام",
  "Voice, SMS, Renewals": "الصوت وSMS والتجديدات",
  "Charge View": "عرض الرسوم",
  "Customer And Provider Cost": "تكلفة العميل والمزود",
  "Margin": "الهامش",
  "Gross Profit Tracked": "تتبع الربح الإجمالي",
  "Gross Profit": "الربح الإجمالي",
  "Usage Count": "عدد الاستخدامات",
  "Live Summary": "ملخص مباشر",
  "eRoaming Snapshot": "لمحة عن التجوال الإلكتروني",
  "Gross Margin": "الهامش الإجمالي",
  "Profit Margin": "هامش الربح",
  "SMS Usage": "استخدام SMS",
  "Voice Usage": "استخدام الصوت",
  "Renewals": "التجديدات",
  "SMS Records": "سجلات SMS",
  "eRoaming Wallet Transactions": "معاملات محفظة التجوال الإلكتروني",
  "All Wallet Debits And Renewals Related To Virtual/eRoaming Numbers.": "كل خصومات وتجديدات المحفظة المتعلقة بأرقام التجوال الإلكتروني والافتراضية.",
  "eRoaming SMS Usage Records": "سجلات استخدام SMS للتجوال الإلكتروني",
  "Inbound And Outbound SMS Records With Customer Charge And Estimated Provider Cost.": "سجلات SMS الواردة والصادرة مع رسوم العميل وتكلفة المزود المقدرة.",
  "Wallet": "المحفظة",
  "Route": "المسار",
  "Message": "الرسالة",
  "Charge": "الرسوم",
  "Customer Paid": "دفع العميل",
  "My Cost": "تكلفتي",
  "Profit": "الربح",
  "Unit Cost": "تكلفة الوحدة",
  "CUSTOMER PAID": "دفع العميل",
  "MY COST": "تكلفتي",
  "ORDERS": "الطلبات",
  "ORDER STATUS": "حالة الطلب",
  "Completed, Failed, Pending": "مكتمل، فاشل، معلق",
  "PROVIDER VIEW": "عرض المزود",
  "Works With Every Provider": "يعمل مع كل مزود",
  "PACKAGE COST": "تكلفة الباقة",
  "Buy Cost And Sell Price": "تكلفة الشراء وسعر البيع",
  "CUSTOMER PACKAGE SALES": "مبيعات باقات العملاء",
  "PROVIDER PACKAGE COST": "تكلفة باقات المزود",
  "PACKAGE PROFIT": "ربح الباقات",
  "COMPLETED ORDERS": "الطلبات المكتملة",
  "FAILED ORDERS": "الطلبات الفاشلة",
  "PENDING / PROCESSING": "معلق / قيد المعالجة",
  "eSIM Package Purchase Transactions": "معاملات شراء باقات eSIM",
  "Full Package Purchase Report With Your Provider Cost And Customer Selling Price.": "تقرير كامل لمشتريات الباقات مع تكلفة المزود وسعر بيع العميل.",
  "eSIM Top-Up Transactions": "معاملات شحن eSIM",
  "Top-Up Sales With Provider Cost And Profit.": "مبيعات الشحن مع تكلفة المزود والربح.",
  "Total Credits": "إجمالي الإضافات",
  "Total Debits": "إجمالي الخصومات",
  "Net Movement": "صافي الحركة",
  "Wallet View": "عرض المحفظة",
  "Credits And Debits": "الإضافات والخصومات",
  "Customer Report": "تقرير العميل",
  "Full Balance Movement": "حركة الرصيد الكاملة",
  "Completed And Pending": "مكتمل ومعلق",
  "Customer Wallet Transactions": "معاملات محفظة العملاء",
  "Full Customer Transaction Report Across Wallet Top-Ups, Purchases, Vouchers, Refunds, And Adjustments.": "تقرير كامل لمعاملات العملاء يشمل شحن المحفظة والمشتريات والقسائم والمبالغ المستردة والتعديلات.",
  "Movement": "الحركة",
  "Balance": "الرصيد",
  "To": "إلى",
  "Completed": "مكتمل",
  "Failed": "فاشل",
  "Processing": "قيد المعالجة",
  "Customer Package Sales": "مبيعات باقات العملاء",
  "Provider Package Cost": "تكلفة باقات المزود",
  "Package Profit": "ربح الباقات",
  "Packages": "الباقات",
  "Days": "أيام",
  "Cost": "التكلفة",
  "Sell": "البيع",
  "Order:": "الطلب",
  "eSIM:": "eSIM",
  "Provider:": "المزود",
  "Type": "النوع",
  "Author": "الكاتب",
  "Published": "منشور",
  "Draft": "مسودة",
  "Image": "الصورة",
  "Action": "الإجراء",
  "Actions": "الإجراءات",
  "Slug": "الرابط المختصر",
  "Excerpt": "المقتطف",
  "Content": "المحتوى",
  "Featured Image URL": "رابط الصورة المميزة",
  "Featured Image": "الصورة المميزة",
  "Meta Description": "وصف الميتا",
  "Meta Keywords (comma-separated)": "كلمات الميتا (مفصولة بفواصل)",
  "Publish immediately": "النشر فوراً",
  "Blog Management": "إدارة المدونة",
  "Email Marketing": "التسويق بالبريد الإلكتروني",
  "Email Marketing - Admin Dashboard": "التسويق بالبريد الإلكتروني - لوحة الإدارة",
  "Manage campaigns, automations, and subscribers": "إدارة الحملات والأتمتة والمشتركين",
  "Email Campaigns": "حملات البريد الإلكتروني",
  "Create Email Campaign": "إنشاء حملة بريد إلكتروني",
  "Campaign Name": "اسم الحملة",
  "Email Subject": "موضوع البريد الإلكتروني",
  "Email Content": "محتوى البريد الإلكتروني",
  "No campaigns created yet": "لم يتم إنشاء حملات بعد",
  "Email Automations": "أتمتة البريد الإلكتروني",
  "Create Email Automation": "إنشاء أتمتة بريد إلكتروني",
  "Concierge Management": "إدارة الكونسيرج",
  "Pricing & Features": "الأسعار والميزات",
  "Members": "الأعضاء",
  "Chat & Voice Inbox": "صندوق محادثات وصوت",
  "Concierge Chat & Voice Inbox": "صندوق محادثات وصوت الكونسيرج",
  "Active Members": "الأعضاء النشطون",
  "Revenue": "الإيرادات",
  "Estimated Cost": "التكلفة المقدرة",
  "Concierge Product": "منتج الكونسيرج",
  "What users see before they subscribe.": "ما يراه المستخدمون قبل الاشتراك.",
  "VIP Concierge": "كونسيرج VIP",
  "Member Status": "حالة العضو",
  "Live membership states.": "حالات العضوية المباشرة.",
  "Trial": "تجربة",
  "Pending Payment": "دفع معلق",
  "Past Due": "متأخر الدفع",
  "Successful Payments": "مدفوعات ناجحة",
  "Edit the Concierge feature and subscription offer.": "تعديل ميزة الكونسيرج وعرض الاشتراك.",
  "Enable Concierge": "تفعيل الكونسيرج",
  "Show Concierge to eligible users.": "إظهار الكونسيرج للمستخدمين المؤهلين.",
  "Pricing Mode": "وضع التسعير",
  "Free": "مجاني",
  "Paid": "مدفوع",
  "Billing Cycle": "دورة الفوترة",
  "Billing Type": "نوع الفوترة",
  "One time": "مرة واحدة",
  "Monthly": "شهري",
  "Customer Fee": "رسوم العميل",
  "Your Cost": "تكلفتك",
  "Trial Days": "أيام التجربة",
  "Free Trial": "تجربة مجانية",
  "Enable Free Trial": "تفعيل التجربة المجانية",
  "Let users try Concierge before paying.": "اسمح للمستخدمين بتجربة الكونسيرج قبل الدفع.",
  "Feature List": "قائمة الميزات",
  "Enable WhatsApp Support": "تفعيل دعم واتساب",
  "WhatsApp Number": "رقم واتساب",
  "Add a clickable hotline for Concierge members.": "أضف خطاً ساخناً قابلاً للنقر لأعضاء الكونسيرج.",
  "Enable Hotline": "تفعيل الخط الساخن",
  "Button Label": "تسمية الزر",
  "Phone Number": "رقم الهاتف",
  "Direct Link": "رابط مباشر",
  "Provider": "المزود",
  "Active SIP Domain": "نطاق SIP النشط",
  "Enable ASTPP Provisioning": "تفعيل إنشاء ASTPP",
  "New customer SIP accounts will be created as ASTPP SIP devices.": "سيتم إنشاء حسابات SIP الجديدة للعملاء كأجهزة ASTPP SIP.",
  "ASTPP API URL": "رابط ASTPP API",
  "SIP Domain": "نطاق SIP",
  "X-Auth-Token": "رمز X-Auth",
  "Admin Account ID": "معرّف حساب الإدارة",
  "Admin Account Token": "رمز حساب الإدارة",
  "SIP Profile ID": "معرّف ملف SIP",
  "Reseller ID": "معرّف الموزع",
  "SIP Transport": "نقل SIP",
  "SIP Port": "منفذ SIP",
  "Outbound Proxy": "الوكيل الصادر",
  "Provisioning Mode": "وضع الإنشاء",
  "PJSIP Transport Name": "اسم نقل PJSIP",
  "Dial Context": "سياق الاتصال",
  "Linphone SIP Port": "منفذ Linphone SIP",
  "Allowed Codecs": "الترميزات المسموحة",
  "Voicemail Extension": "تحويلة البريد الصوتي",
  "Enable Call Center SIP Call": "تفعيل اتصال مركز الدعم عبر SIP",
  "Customer Call Address": "عنوان اتصال العميل",
  "SIP Server / Domain": "خادم / نطاق SIP",
  "Support Extension": "تحويلة الدعم",
  "Registration Username": "اسم مستخدم التسجيل",
  "Registration Password": "كلمة مرور التسجيل",
  "Transport": "النقل",
  "Enable Voice Messages": "تفعيل الرسائل الصوتية",
  "Read It Voice": "صوت القراءة",
  "Professional OpenAI Voice": "صوت OpenAI احترافي",
  "Browser Voice": "صوت المتصفح",
  "Translation Language": "لغة الترجمة",
  "User App Language": "لغة تطبيق المستخدم",
  "Arabic": "العربية",
  "English": "الإنجليزية",
  "French": "الفرنسية",
  "Spanish": "الإسبانية",
  "German": "الألمانية",
  "Italian": "الإيطالية",
  "Portuguese": "البرتغالية",
  "Chinese": "الصينية",
  "Japanese": "اليابانية",
  "Hindi": "الهندية",
  "Translate Voice Reply": "ترجمة الرد الصوتي",
  "Control the ChatGPT copy and behavior for Concierge.": "التحكم بنص وسلوك ChatGPT للكونسيرج.",
  "Enable AI Bot": "تفعيل بوت الذكاء الاصطناعي",
  "Bot Name": "اسم البوت",
  "Welcome Message": "رسالة الترحيب",
  "Bot Instructions": "تعليمات البوت",
  "Concierge Members": "أعضاء الكونسيرج",
  "View successful members and control their Concierge status.": "عرض الأعضاء الناجحين والتحكم بحالة الكونسيرج لديهم.",
  "Member": "العضو",
  "Billing": "الفوترة",
  "Fee": "الرسوم",
  "Payment": "الدفع",
  "Dates": "التواريخ",
  "No Concierge members yet.": "لا يوجد أعضاء كونسيرج بعد.",
  "Trial Active": "التجربة نشطة",
  "Expired": "منتهي",
  "Inactive": "غير نشط",
  "Payment Methods": "طرق الدفع",
  "Configure available payment methods for Customers": "إعداد طرق الدفع المتاحة للعملاء",
  "Minimum Amount ($)": "الحد الأدنى للمبلغ ($)",
  "Enable Registration Bonus": "تفعيل مكافأة التسجيل",
  "Wallet Bonus Amount": "مبلغ مكافأة المحفظة",
  "Current rule": "القاعدة الحالية",
  "Enable Demo Mode": "تفعيل وضع التجربة",
  "Demo Environment": "بيئة التجربة",
  "Use real payment and provider purchase behavior.": "استخدم سلوك الدفع والشراء الحقيقي من المزود.",
  "Sandbox Wallet Top-up": "شحن محفظة التجربة",
  "Max Test Top-up Amount": "أقصى مبلغ شحن تجريبي",
  "Apply Sandbox To": "تطبيق التجربة على",
  "Connection Mode": "وضع الاتصال",
  "Phone Number ID": "معرّف رقم الهاتف",
  "API Version": "إصدار واجهة البرمجة",
  "Access Token": "رمز الوصول",
  "Verify Token": "رمز التحقق",
  "Webhook Callback URL": "رابط رد Webhook",
  "Use Working Schedule": "استخدام جدول العمل",
  "Start Time": "وقت البدء",
  "End Time": "وقت الانتهاء",
  "Working Days": "أيام العمل",
  "Trial Length (days)": "مدة التجربة (أيام)",
  "Vonage eRoaming's": "تجوال Vonage الإلكتروني",
  "Enable Vonage Feature": "تفعيل ميزة Vonage",
  "Voice Backend": "خلفية الصوت",
  "API Key": "مفتاح واجهة البرمجة",
  "API Secret": "سر واجهة البرمجة",
  "Application ID": "معرّف التطبيق",
  "Private Key": "المفتاح الخاص",
  "SMS Brand / Sender": "علامة / مرسل SMS",
  "Default Number Country": "بلد الرقم الافتراضي",
  "Auto Assign Number": "تعيين الرقم تلقائياً",
  "Inbound SMS Webhook URL": "رابط Webhook لرسائل SMS الواردة",
  "Delivery Status Webhook URL": "رابط Webhook لحالة التسليم",
  "Linphone SIP Backend": "خلفية Linphone SIP",
  "Username Prefix": "بادئة اسم المستخدم",
  "SIP Password": "كلمة مرور SIP",
  "Voice Mail Extension": "تحويلة البريد الصوتي",
  "Country Price List": "قائمة أسعار الدول",
  "Current Country Matrix": "مصفوفة الدولة الحالية",
  "Live API Pricing Preview": "معاينة أسعار واجهة البرمجة المباشرة",
  "Number Cost Preview": "معاينة تكلفة الرقم",
  "SMS API Pricing": "تسعير واجهة رسائل SMS",
  "Voice API Pricing": "تسعير واجهة الصوت",
  "Messages API Pricing": "تسعير واجهة الرسائل",
  "Standard Normal Numbers Plan": "خطة الأرقام العادية القياسية",
  "Provider Name": "اسم المزود",
  "Provider ID": "معرّف المزود",
  "Provider Currency": "عملة المزود",
  "Premium Normal Numbers Plan": "خطة الأرقام العادية المميزة",
  "Reseller Price": "سعر الموزع",
  "Agent Price": "سعر الوكيل",
  "Retail Price": "سعر التجزئة",
  "Messages API Provider Baseline": "أساس مزود واجهة الرسائل",
  "Messages API Cost": "تكلفة واجهة الرسائل",
  "Messages API Notes": "ملاحظات واجهة الرسائل",
  "Currency": "العملة",
  "SMTP": "SMTP",
  "Apps": "التطبيقات",
  "Registration Bonus": "مكافأة التسجيل",
  "Bonus": "المكافأة",
  "Sandbox Demo": "تجربة Sandbox",
  "Theme": "المظهر",
  "Social": "اجتماعي",
  "SEO": "SEO",
  "Account": "الحساب",
  "Popup": "نافذة منبثقة",
  "Global Settings": "الإعدادات العامة",
  "Configure system-wide settings": "إعدادات النظام العامة",
  "Platform Information": "معلومات المنصة",
  "Configure your platform's basic information and branding": "إعداد المعلومات الأساسية والعلامة التجارية للمنصة",
  "Platform Name": "اسم المنصة",
  "Tagline": "الشعار الوصفي",
  "Default Currency": "العملة الافتراضية",
  "Manage currencies in Platform Setup.": "إدارة العملات من إعدادات المنصة.",
  "WhatsApp Support": "دعم واتساب",
  "Save SIP Configuration": "حفظ إعدادات SIP",
  "SIP Provisioning Provider": "مزود إنشاء SIP",
  "Choose which PBX platform creates customer SIP accounts automatically.": "اختر منصة PBX التي تنشئ حسابات SIP للعملاء تلقائياً.",
  "Test ASTPP": "اختبار ASTPP",
  "Not tested": "لم يتم الاختبار",
  "Save Features": "حفظ الميزات",
  "Customer Modules": "وحدات العملاء",
  "Section Agent": "قسم الوكيل",
  "Addon Modules Enabled or Disabled": "وحدات إضافية مفعلة أو معطلة",
  "Web UI Access": "وصول واجهة الويب",
  "Controls what this role can see and use in the browser portal.": "يتحكم بما يمكن لهذا الدور رؤيته واستخدامه في بوابة المتصفح.",
  "Enable All Surfaces": "تفعيل كل الواجهات",
  "Disable All Surfaces": "تعطيل كل الواجهات",
  "Automatic Reminder for Unused Active Package": "تذكير تلقائي للباقة النشطة غير المستخدمة",
  "Automatic Reminder with Special Offer": "تذكير تلقائي مع عرض خاص",
  "Balance Alert": "تنبيه الرصيد",
  "Buy Package": "شراء باقة",
  "Change Profile": "تغيير الملف الشخصي",
  "Chat Module": "وحدة المحادثة",
  "Concierge + AI Voice Agent": "كونسيرج + وكيل صوت ذكي",
  "Create Rates": "إنشاء أسعار",
  "Create Sub Agents": "إنشاء وكلاء فرعيين",
  "Delete Users": "حذف المستخدمين",
  "Download Invoices": "تحميل الفواتير",
  "Download Vouchers": "تحميل القسائم",
  "Edit Customer Details": "تعديل تفاصيل العميل",
  "Export Vouchers": "تصدير القسائم",
  "OpenAI Connection": "اتصال OpenAI",
  "Connected": "متصل",
  "Not Connected": "غير متصل",
  "Paste OpenAI API key": "ألصق مفتاح OpenAI API",
  "Save Key": "حفظ المفتاح",
  "Test Connection": "اختبار الاتصال",
  "Enable AI Selection": "تفعيل اختيار الذكاء الاصطناعي",
  "When enabled, AI analyzes Packages and scores them based on value, not just price": "عند التفعيل، يحلل الذكاء الاصطناعي الباقات ويقيّمها حسب القيمة وليس السعر فقط",
  "Scoring Weights": "أوزان التقييم",
  "Price Weight": "وزن السعر",
  "Quality Weight": "وزن الجودة",
  "Provider Weight": "وزن المزود",
  "How much to prioritize lower prices": "مدى أولوية الأسعار الأقل",
  "AI-analyzed value (data/price ratio, validity, features)": "القيمة التي يحللها الذكاء الاصطناعي (نسبة البيانات إلى السعر، الصلاحية، الميزات)",
  "Provider reliability and reputation score": "درجة موثوقية المزود وسمعته",
  "Save Weights": "حفظ الأوزان",
  "Run AI Selection Now": "تشغيل اختيار الذكاء الاصطناعي الآن",
  "AI Usage Statistics": "إحصائيات استخدام الذكاء الاصطناعي",
  "Requests": "الطلبات",
  "Tokens": "الرموز",
  "Est. Cost": "التكلفة المقدرة",
  "Errors": "الأخطاء",
  "AI-Powered Features": "ميزات مدعومة بالذكاء الاصطناعي",
  "Composite scoring combining price, quality, and provider reliability": "تقييم مركب يجمع السعر والجودة وموثوقية المزود",
  "Intelligent package analysis with value assessments": "تحليل ذكي للباقات مع تقييم القيمة",
  "Automatic fallback to price-only mode if AI unavailable": "رجوع تلقائي إلى وضع السعر فقط إذا لم يتوفر الذكاء الاصطناعي",
  "24-hour result caching to minimize API costs": "تخزين النتائج لمدة 24 ساعة لتقليل تكاليف API",
  "No Logo": "لا يوجد شعار",
  "Currency Management": "إدارة العملات",
  "Add Currency": "إضافة عملة",
  "Add New Currency": "إضافة عملة جديدة",
  "Update Currency": "تحديث العملة",
  "Currency Code": "كود العملة",
  "Currency Name": "اسم العملة",
  "Currency Symbol": "رمز العملة",
  "Conversion Rate": "سعر التحويل",
  "Conversion Rate (from USD)": "سعر التحويل من الدولار الأمريكي",
  "Select World Currency": "اختر عملة عالمية",
  "Select currency...": "اختر عملة...",
  "Search currency...": "ابحث عن عملة...",
  "No currency found.": "لم يتم العثور على عملة.",
  "Set Default": "تعيين كافتراضية",
  "Default": "الافتراضية",
  "US Dollar": "دولار أمريكي",
  "Banner Management": "إدارة البنرات",
  "Manage promotional banners for your platform": "إدارة البنرات الترويجية للمنصة",
  "Active Banners": "البنرات النشطة",
  "Manage banner images, titles, and display order": "إدارة صور البنرات والعناوين وترتيب العرض",
  "No banners found. Add your first banner to get started.": "لا توجد بنرات. أضف أول بنر للبدء.",
  "Add Banner": "إضافة بنر",
  "Add New Banner": "إضافة بنر جديد",
  "Create a new promotional banner for your platform": "إنشاء بنر ترويجي جديد للمنصة",
  "Edit Banner": "تعديل البنر",
  "Update Banner": "تحديث البنر",
  "Update banner details and image": "تحديث تفاصيل البنر والصورة",
  "Banner Image": "صورة البنر",
  "Banner Image *": "صورة البنر *",
  "Upload an image (max 5MB). Recommended size: 1200x400px": "ارفع صورة بحد أقصى 5MB. المقاس المقترح: 1200x400px",
  "Leave empty to keep current image": "اتركه فارغاً للاحتفاظ بالصورة الحالية",
  "Enter banner title": "أدخل عنوان البنر",
  "Enter banner description": "أدخل وصف البنر",
  "Package ID (Optional)": "معرّف الباقة (اختياري)",
  "Select package...": "اختر باقة...",
  "Select Package": "اختر الباقة",
  "Search package...": "ابحث عن باقة...",
  "No package found.": "لم يتم العثور على باقة.",
  "Loading more...": "جاري تحميل المزيد...",
  "Banner added successfully": "تمت إضافة البنر بنجاح",
  "Banner updated successfully": "تم تحديث البنر بنجاح",
  "Banner deleted successfully": "تم حذف البنر بنجاح",
  "Banner status updated": "تم تحديث حالة البنر",
  "Failed to add banner": "فشلت إضافة البنر",
  "Failed to update banner": "فشل تحديث البنر",
  "Failed to delete banner": "فشل حذف البنر",
  "Failed to update banner status": "فشل تحديث حالة البنر",
  "Image size should be less than 5MB": "يجب أن يكون حجم الصورة أقل من 5MB",
  "Title is required": "العنوان مطلوب",
  "Please upload an image": "يرجى رفع صورة",
  "Page Management": "إدارة الصفحات",
  "Manage static CMS pages": "إدارة صفحات المحتوى الثابتة",
  "Pages": "الصفحات",
  "All static pages": "كل الصفحات الثابتة",
  "Add Page": "إضافة صفحة",
  "Edit Page": "تعديل الصفحة",
  "Manage page content & SEO": "إدارة محتوى الصفحة وتحسين محركات البحث",
  "Page Title": "عنوان الصفحة",
  "Page Title *": "عنوان الصفحة *",
  "URL Slug": "رابط الصفحة",
  "URL Slug *": "رابط الصفحة *",
  "Page Content": "محتوى الصفحة",
  "Page Content *": "محتوى الصفحة *",
  "Meta Title": "عنوان الميتا",
  "Meta Description": "وصف الميتا",
  "Publish immediately": "النشر فوراً",
  "Create Page": "إنشاء صفحة",
  "Update Page": "تحديث الصفحة",
  "Page created successfully": "تم إنشاء الصفحة بنجاح",
  "Page updated successfully": "تم تحديث الصفحة بنجاح",
  "Page deleted successfully": "تم حذف الصفحة بنجاح",
  "Failed to create page": "فشل إنشاء الصفحة",
  "Failed to update page": "فشل تحديث الصفحة",
  "Failed to delete page": "فشل حذف الصفحة",
  "Failed to update status": "فشل تحديث الحالة",
  "Missing title": "العنوان مفقود",
  "Enter a page title before saving.": "أدخل عنوان الصفحة قبل الحفظ.",
  "Missing URL slug": "رابط الصفحة مفقود",
  "Enter a valid URL slug before saving.": "أدخل رابط صفحة صالحاً قبل الحفظ.",
  "Missing content": "المحتوى مفقود",
  "Enter page content before saving.": "أدخل محتوى الصفحة قبل الحفظ.",
  "Enter link URL": "أدخل رابط الوصلة",
  "Enter image URL": "أدخل رابط الصورة",
  "Paragraph": "فقرة",
  "Heading 1": "عنوان 1",
  "Heading 2": "عنوان 2",
  "Heading 3": "عنوان 3",
  "Bold": "عريض",
  "Italic": "مائل",
  "Underline": "تسطير",
  "Strike": "يتوسطه خط",
  "Inline code": "كود داخل السطر",
  "Text color": "لون النص",
  "Highlight color": "لون التمييز",
  "Font size": "حجم الخط",
  "Size": "الحجم",
  "Bullet list": "قائمة نقطية",
  "Numbered list": "قائمة مرقمة",
  "Quote": "اقتباس",
  "Code block": "كتلة كود",
  "Horizontal rule": "خط أفقي",
  "Align left": "محاذاة لليسار",
  "Align center": "محاذاة للوسط",
  "Align right": "محاذاة لليمين",
  "Justify": "ضبط النص",
  "Add link": "إضافة رابط",
  "Remove link": "إزالة الرابط",
  "Add image URL": "إضافة رابط صورة",
  "Undo": "تراجع",
  "Redo": "إعادة",
  "Clear formatting": "مسح التنسيق",
  "FAQ Management": "إدارة الأسئلة الشائعة",
  "Manage frequently asked questions and categories": "إدارة الأسئلة الشائعة والتصنيفات",
  "FAQs": "الأسئلة الشائعة",
  "Categories": "التصنيفات",
  "Frequently Asked Questions": "الأسئلة الشائعة",
  "Manage questions and answers for your users": "إدارة الأسئلة والأجوبة للمستخدمين",
  "No FAQs found. Add your first FAQ to get started.": "لا توجد أسئلة شائعة. أضف أول سؤال للبدء.",
  "FAQ Categories": "تصنيفات الأسئلة الشائعة",
  "Organize your FAQs into categories": "نظّم الأسئلة الشائعة ضمن تصنيفات",
  "No categories found. Add your first category to get started.": "لا توجد تصنيفات. أضف أول تصنيف للبدء.",
  "Add FAQ": "إضافة سؤال شائع",
  "Add New FAQ": "إضافة سؤال شائع جديد",
  "Create a new frequently asked question": "إنشاء سؤال شائع جديد",
  "Edit FAQ": "تعديل السؤال الشائع",
  "Update FAQ": "تحديث السؤال الشائع",
  "Update FAQ details": "تحديث تفاصيل السؤال الشائع",
  "Create FAQ": "إنشاء سؤال شائع",
  "Add Category": "إضافة تصنيف",
  "Add New Category": "إضافة تصنيف جديد",
  "Create a new FAQ category": "إنشاء تصنيف جديد للأسئلة الشائعة",
  "Edit Category": "تعديل التصنيف",
  "Update Category": "تحديث التصنيف",
  "Update category details": "تحديث تفاصيل التصنيف",
  "Create Category": "إنشاء تصنيف",
  "Question": "السؤال",
  "Question *": "السؤال *",
  "Answer": "الإجابة",
  "Answer *": "الإجابة *",
  "What is your question?": "ما هو سؤالك؟",
  "Provide a detailed answer...": "قدّم إجابة مفصلة...",
  "Select category": "اختر التصنيف",
  "Uncategorized": "غير مصنف",
  "Views": "المشاهدات",
  "e.g., General Questions": "مثال: أسئلة عامة",
  "general-questions": "اسئلة-عامة",
  "Brief description...": "وصف مختصر...",
  "FAQ created successfully": "تم إنشاء السؤال الشائع بنجاح",
  "FAQ updated successfully": "تم تحديث السؤال الشائع بنجاح",
  "FAQ deleted successfully": "تم حذف السؤال الشائع بنجاح",
  "FAQ status updated": "تم تحديث حالة السؤال الشائع",
  "Category created successfully": "تم إنشاء التصنيف بنجاح",
  "Category updated successfully": "تم تحديث التصنيف بنجاح",
  "Category deleted successfully": "تم حذف التصنيف بنجاح",
  "Failed to create FAQ": "فشل إنشاء السؤال الشائع",
  "Failed to update FAQ": "فشل تحديث السؤال الشائع",
  "Failed to delete FAQ": "فشل حذف السؤال الشائع",
  "Failed to update FAQ status": "فشل تحديث حالة السؤال الشائع",
  "Failed to create category": "فشل إنشاء التصنيف",
  "Failed to update category": "فشل تحديث التصنيف",
  "Failed to delete category": "فشل حذف التصنيف",
  "Question and answer are required": "السؤال والإجابة مطلوبان",
  "Name and slug are required": "الاسم والرابط مطلوبان",
  "Blog Management": "إدارة المدونة",
  "Create and manage blog posts": "إنشاء وإدارة مقالات المدونة",
  "New Post": "مقال جديد",
  "No blog posts yet. Create your first post!": "لا توجد مقالات بعد. أنشئ أول مقال!",
  "Edit Post": "تعديل المقال",
  "Create New Post": "إنشاء مقال جديد",
  "Create Post": "إنشاء المقال",
  "Save Changes": "حفظ التغييرات",
  "Blog post created": "تم إنشاء المقال",
  "Blog post updated": "تم تحديث المقال",
  "Blog post deleted": "تم حذف المقال",
  "Blog post published": "تم نشر المقال",
  "Failed to create blog post": "فشل إنشاء المقال",
  "Failed to update blog post": "فشل تحديث المقال",
  "Failed to delete blog post": "فشل حذف المقال",
  "Failed to publish blog post": "فشل نشر المقال",
  "Are you sure you want to delete this post?": "هل أنت متأكد أنك تريد حذف هذا المقال؟",
  "Author": "الكاتب",
  "Published": "منشور",
  "Draft": "مسودة",
  "Image": "الصورة",
  "Unknown": "غير معروف",
  "Publish": "نشر",
  "Generate": "توليد",
  "Excerpt": "المقتطف",
  "Content": "المحتوى",
  "Featured Image": "الصورة البارزة",
  "Meta Keywords (comma-separated)": "كلمات الميتا المفتاحية (مفصولة بفواصل)",
  "API Documentation": "وثائق واجهة البرمجة",
  "Search endpoints by path, title, or description...": "ابحث في المسار أو العنوان أو الوصف...",
  "All Methods": "كل الطرق",
  "All Auth Levels": "كل مستويات الوصول",
  "Method": "الطريقة",
  "Auth": "الوصول",
  "Public": "عام",
  "Auth Required": "يتطلب تسجيل الدخول",
  "Admin Only": "للإدارة فقط",
  "Base URL": "الرابط الأساسي",
  "endpoints across": "نقاط نهاية ضمن",
  "endpoints": "نقاط نهاية",
  "categories": "تصنيفات",
  "Showing": "عرض",
  "of": "من",
  "Partner API Authentication Guide": "دليل مصادقة واجهة الشركاء",
  "Use these Credentials to Access the External Partner API (v1) for mobile apps and partner integrations": "استخدم بيانات الاعتماد هذه للوصول إلى واجهة الشركاء الخارجية (v1) لتطبيقات الجوال وتكاملات الشركاء",
  "Step 1: Get Your API Keys": "الخطوة 1: احصل على مفاتيح واجهة البرمجة",
  "Generate API keys from the Admin Panel": "أنشئ مفاتيح واجهة البرمجة من لوحة الإدارة",
  "Step 2: Use Required Headers": "الخطوة 2: استخدم الترويسات المطلوبة",
  "All Partner API requests require": "كل طلبات واجهة الشركاء تتطلب",
  "both": "كليهما",
  "headers": "ترويسات",
  "Your API Key (starts with sk_live_)": "مفتاح واجهة البرمجة الخاص بك (يبدأ بـ sk_live_)",
  "Your API Secret (keep this secure!)": "سر واجهة البرمجة الخاص بك (احتفظ به بأمان!)",
  "Code Examples": "أمثلة الكود",
  "Smart Failover Enabled": "التبديل الاحتياطي الذكي مفعّل",
  "Common Error Codes": "أكواد الأخطاء الشائعة",
  "Missing or invalid API credentials": "بيانات اعتماد واجهة البرمجة مفقودة أو غير صالحة",
  "API key disabled or expired": "مفتاح واجهة البرمجة معطل أو منتهي",
  "Invalid request parameters": "معاملات الطلب غير صالحة",
  "Resource not found": "المورد غير موجود",
  "No endpoints found": "لم يتم العثور على نقاط نهاية",
  "Try adjusting your search or filter criteria": "جرّب تعديل البحث أو معايير التصفية",
  "Response Format & Status Codes": "تنسيق الاستجابة وأكواد الحالة",
  "Standard Response Format": "تنسيق الاستجابة القياسي",
  "HTTP Status Codes": "أكواد حالة HTTP",
  "OK - Request succeeded": "تم بنجاح - نجح الطلب",
  "Created - Resource created successfully": "تم الإنشاء - تم إنشاء المورد بنجاح",
  "Bad Request - Invalid input or validation error": "طلب غير صالح - إدخال غير صالح أو خطأ تحقق",
  "Unauthorized - Authentication required": "غير مصرح - المصادقة مطلوبة",
  "Forbidden - Access denied": "ممنوع - تم رفض الوصول",
  "Not Found - Resource does not exist": "غير موجود - المورد غير موجود",
  "Internal Server Error - Server-side error": "خطأ داخلي في الخادم - خطأ من جهة الخادم",
  "Authentication": "المصادقة",
  "Copied!": "تم النسخ!",
  "Code copied to clipboard": "تم نسخ الكود إلى الحافظة",
  "Smart Failover Settings": "إعدادات التبديل الاحتياطي الذكي",
  "Connection Success": "تم الاتصال بنجاح",
  "Connection Failed": "فشل الاتصال",
  "API key and secret are valid.": "مفتاح وسر واجهة البرمجة صالحان.",
  "Invalid Credentials": "بيانات الاعتماد غير صالحة",
  "Missing Information": "معلومات ناقصة",
  "Please enter both API key and secret": "يرجى إدخال مفتاح وسر واجهة البرمجة",
  "Settings Updated": "تم تحديث الإعدادات",
  "Failover settings have been saved successfully.": "تم حفظ إعدادات التبديل الاحتياطي بنجاح.",
  "Update Failed": "فشل التحديث",
  "Failed to update failover settings.": "فشل تحديث إعدادات التبديل الاحتياطي.",
  "Provider Updated": "تم تحديث المزود",
  "Provider settings have been saved.": "تم حفظ إعدادات المزود.",
  "Failed to update provider.": "فشل تحديث المزود.",
  "Priorities Updated": "تم تحديث الأولويات",
  "Provider failover order has been saved.": "تم حفظ ترتيب مزودي التبديل الاحتياطي.",
  "Failed to update priorities.": "فشل تحديث الأولويات.",
  "API Key Created": "تم إنشاء مفتاح واجهة البرمجة",
  "Make sure to copy the secret - it won't be shown again!": "تأكد من نسخ السر، فلن يظهر مرة أخرى!",
  "Creation Failed": "فشل الإنشاء",
  "Failed to create API key.": "فشل إنشاء مفتاح واجهة البرمجة.",
  "API Key Updated": "تم تحديث مفتاح واجهة البرمجة",
  "API key status has been changed.": "تم تغيير حالة مفتاح واجهة البرمجة.",
  "Failed to update API key.": "فشل تحديث مفتاح واجهة البرمجة.",
  "API Key Deleted": "تم حذف مفتاح واجهة البرمجة",
  "The API key has been permanently removed.": "تمت إزالة مفتاح واجهة البرمجة نهائياً.",
  "Deletion Failed": "فشل الحذف",
  "Failed to delete API key.": "فشل حذف مفتاح واجهة البرمجة.",
  "Copied": "تم النسخ",
  "Value copied to clipboard.": "تم نسخ القيمة إلى الحافظة.",
  "Logic & Security": "المنطق والأمان",
  "Routing Engine": "محرك التوجيه",
  "Integration Keys": "مفاتيح التكامل",
  "API Infrastructure": "بنية واجهة البرمجة",
  "Issue New Key": "إصدار مفتاح جديد",
  "New Security Credential": "بيانات اعتماد أمان جديدة",
  "Configure the Access level and rate limits for this API key.": "اضبط مستوى الوصول وحدود الطلبات لهذا المفتاح.",
  "Security Protocol": "بروتوكول الأمان",
  "Your secret key is only displayed once. If you lose it, you will need to re-issue the credential.": "يظهر المفتاح السري مرة واحدة فقط. إذا فقدته فستحتاج إلى إصدار بيانات اعتماد جديدة.",
  "Client ID / API Key": "معرّف العميل / مفتاح واجهة البرمجة",
  "Client Secret": "سر العميل",
  "I Have Secured These Credentials": "حفظت بيانات الاعتماد بأمان",
  "Friendly Name": "اسم وصفي",
  "e.g., iPhone App v2": "مثال: تطبيق iPhone v2",
  "Burst Rate Limit (req/day)": "حد الطلبات اليومي",
  "Generate Credential": "إنشاء بيانات الاعتماد",
  "Syncing keys...": "جاري مزامنة المفاتيح...",
  "No API Access active": "لا يوجد وصول نشط لواجهة البرمجة",
  "Issue your first API key to start integrating your services.": "أصدر أول مفتاح لواجهة البرمجة لبدء تكامل خدماتك.",
  "IDENTITY": "الهوية",
  "PREFIX": "البادئة",
  "STATUS": "الحالة",
  "QUOTA": "الحصة",
  "TRAFFIC": "الحركة",
  "Idle": "خامل",
  "Revoke API Credential?": "إلغاء بيانات اعتماد واجهة البرمجة؟",
  "Keep Key": "الاحتفاظ بالمفتاح",
  "Revoke Access": "إلغاء الوصول",
  "Verify Key": "التحقق من المفتاح",
  "Instantly validate any API credential against our security layer.": "تحقق فوراً من أي بيانات اعتماد لواجهة البرمجة عبر طبقة الأمان.",
  "API Secret": "سر واجهة البرمجة",
  "Authenticated": "تمت المصادقة",
  "Unauthorized": "غير مصرح",
  "Owner": "المالك",
  "Resources": "الموارد",
  "API Documentation": "وثائق واجهة البرمجة",
  "Status Dashboard": "لوحة حالة النظام",
  "External Partner API (v1)": "واجهة الشركاء الخارجية (v1)",
  "External API for partners and mobile apps - requires API Key authentication (X-API-Key + X-API-Secret headers)": "واجهة خارجية للشركاء وتطبيقات الجوال، وتتطلب مصادقة بمفتاح وسر واجهة البرمجة",
  "Path Parameters": "معاملات المسار",
  "Query Parameters": "معاملات الاستعلام",
  "Request Body": "محتوى الطلب",
  "Responses": "الاستجابات",
  "cURL Example": "مثال cURL",
  "required": "مطلوب",
  "List Packages": "عرض الباقات",
  "Get Package Details": "عرض تفاصيل الباقة",
  "List Destinations": "عرض الوجهات",
  "Get Destination with Packages": "عرض الوجهة مع الباقات",
  "Create Order": "إنشاء طلب",
  "List Orders": "عرض الطلبات",
  "Get Order Details": "عرض تفاصيل الطلب",
  "Cancel Order": "إلغاء الطلب",
  "Get Account Info": "عرض معلومات الحساب",
  "Get Usage Statistics": "عرض إحصائيات الاستخدام",
  "Send OTP Code": "إرسال رمز OTP",
  "Verify OTP & Login": "التحقق من OTP وتسجيل الدخول",
  "Get Current User": "عرض المستخدم الحالي",
  "Logout": "تسجيل الخروج",
  "Destinations": "الوجهات",
  "Country/destination endpoints for browsing eSIM coverage areas": "نقاط نهاية الدول والوجهات لتصفح مناطق تغطية eSIM",
  "List All Destinations": "عرض كل الوجهات",
  "Destinations with Pricing": "الوجهات مع الأسعار",
  "Get Destination by Slug": "عرض الوجهة حسب الرابط",
  "Regions": "المناطق",
  "Regional eSIM Packages covering multiple countries": "باقات eSIM إقليمية تغطي عدة دول",
  "List All Regions": "عرض كل المناطق",
  "Regions with Pricing": "المناطق مع الأسعار",
  "Get Region by Slug": "عرض المنطقة حسب الرابط",
  "Packages": "الباقات",
  "eSIM package catalog and browsing": "كتالوج باقات eSIM والتصفح",
  "List All Packages": "عرض كل الباقات",
  "Featured Packages": "الباقات المميزة",
  "Global Packages": "الباقات العالمية",
  "Package Statistics": "إحصائيات الباقات",
  "Get Package by Slug": "عرض الباقة حسب الرابط",
  "Get Package by ID": "عرض الباقة حسب المعرّف",
  "Get Package Reviews": "عرض تقييمات الباقة",
  "Package Review Stats": "إحصائيات تقييمات الباقة",
  "Unified Packages": "الباقات الموحدة",
  "Consolidated package catalog with multi-provider pricing": "كتالوج باقات موحد مع تسعير متعدد المزودين",
  "List Unified Packages": "عرض الباقات الموحدة",
  "List Global Packages": "عرض الباقات العالمية",
  "Orders": "الطلبات",
  "Customer order management and eSIM provisioning": "إدارة طلبات العملاء وتجهيز eSIM",
  "Get My Orders": "عرض طلباتي",
  "Get eSIM Details": "عرض تفاصيل eSIM",
  "Customer Profile": "ملف العميل",
  "Customer profile and account management": "إدارة ملف العميل والحساب",
  "Get Profile": "عرض الملف",
  "Update Profile": "تحديث الملف",
  "Update Notification Preferences": "تحديث تفضيلات الإشعارات",
  "Get Customer Orders": "عرض طلبات العميل",
  "Get Customer eSIMs": "عرض شرائح eSIM للعميل",
  "Get Activity Log": "عرض سجل النشاط",
  "Upload KYC Document": "رفع مستند KYC",
  "Get KYC Documents": "عرض مستندات KYC",
  "Get eSIM Usage": "عرض استخدام eSIM",
  "Get Topups": "عرض عمليات الشحن",
  "Notifications": "الإشعارات",
  "User notification management": "إدارة إشعارات المستخدم",
  "Get Notifications": "عرض الإشعارات",
  "Mark as Read": "تحديد كمقروء",
  "Mark All as Read": "تحديد الكل كمقروء",
  "Delete All Notifications": "حذف كل الإشعارات",
  "Delete Notification": "حذف الإشعار",
  "Support Tickets": "تذاكر الدعم",
  "Customer support ticket system": "نظام تذاكر دعم العملاء",
  "Get My Tickets": "عرض تذاكري",
  "Get Ticket Details": "عرض تفاصيل التذكرة",
  "Update Ticket (Status or Priority)": "تحديث التذكرة (الحالة أو الأولوية)",
  "Create Ticket": "إنشاء تذكرة",
  "Reply to Ticket (Admin)": "الرد على التذكرة (الإدارة)",
  "Admin Authentication": "مصادقة الإدارة",
  "Admin Panel authentication endpoints": "نقاط نهاية مصادقة لوحة الإدارة",
  "Admin Login": "تسجيل دخول الإدارة",
  "Get Admin Profile": "عرض ملف الإدارة",
  "Admin Logout": "تسجيل خروج الإدارة",
  "Admin Dashboard": "لوحة تحكم الإدارة",
  "Dashboard statistics and analytics": "إحصائيات وتحليلات لوحة التحكم",
  "Get Dashboard Stats": "عرض إحصائيات لوحة التحكم",
  "Admin Customers": "عملاء الإدارة",
  "Customer management for administrators": "إدارة العملاء للمسؤولين",
  "List All Customers": "عرض كل العملاء",
  "Get Customer Details": "عرض تفاصيل العميل",
  "Update Customer": "تحديث العميل",
  "Get Customer Activity": "عرض نشاط العميل",
  "Admin Orders": "طلبات الإدارة",
  "Order management, refunds, and cancellations": "إدارة الطلبات والاستردادات والإلغاءات",
  "List All Orders": "عرض كل الطلبات",
  "Update Order": "تحديث الطلب",
  "Check Refund Eligibility": "التحقق من أهلية الاسترداد",
  "Process Refund": "معالجة الاسترداد",
  "Admin Providers": "مزودو الإدارة",
  "eSIM provider management and synchronization": "إدارة مزودي eSIM والمزامنة",
  "List All Providers": "عرض كل المزودين",
  "Create Provider": "إنشاء مزود",
  "Update Provider": "تحديث المزود",
  "Delete Provider": "حذف المزود",
  "Sync Provider Packages": "مزامنة باقات المزود",
  "Admin Settings": "إعدادات الإدارة",
  "Platform configuration and currency management": "إعداد المنصة وإدارة العملات",
  "Get All Settings": "عرض كل الإعدادات",
  "Update Setting": "تحديث الإعداد",
  "List Currencies": "عرض العملات",
  "Create Currency": "إنشاء عملة",
  "Delete Currency": "حذف العملة",
  "Admin Platform Settings": "إعدادات المنصة الإدارية",
  "Platform-wide configuration options": "خيارات إعداد المنصة العامة",
  "Get Platform Settings": "عرض إعدادات المنصة",
  "Get Setting by Key": "عرض الإعداد حسب المفتاح",
  "Update Platform Setting": "تحديث إعداد المنصة",
  "Run Auto Selection": "تشغيل الاختيار التلقائي",
  "Admin Vouchers": "قسائم الإدارة",
  "Discount voucher management": "إدارة قسائم الخصم",
  "List All Vouchers": "عرض كل القسائم",
  "Get Voucher Details": "عرض تفاصيل القسيمة",
  "Get Voucher Usage": "عرض استخدام القسيمة",
  "Create Voucher": "إنشاء قسيمة",
  "Update Voucher": "تحديث القسيمة",
  "Delete Voucher": "حذف القسيمة",
  "Admin Gift Cards": "بطاقات هدايا الإدارة",
  "Gift card management": "إدارة بطاقات الهدايا",
  "List All Gift Cards": "عرض كل بطاقات الهدايا",
  "Get Gift Card Details": "عرض تفاصيل بطاقة الهدية",
  "Get Gift Card Transactions": "عرض معاملات بطاقة الهدية",
  "Create Gift Card": "إنشاء بطاقة هدية",
  "Bulk Create Gift Cards": "إنشاء بطاقات هدايا بالجملة",
  "Send Gift Card Email": "إرسال بريد بطاقة الهدية",
  "Cancel Gift Card": "إلغاء بطاقة الهدية",
  "Payments": "المدفوعات",
  "Payment initialization and processing for checkout": "تهيئة المدفوعات ومعالجتها للدفع",
  "Get Available Gateways": "عرض بوابات الدفع المتاحة",
  "Initialize Payment": "تهيئة الدفع",
  "Admin Payment Gateways": "بوابات دفع الإدارة",
  "Configure and manage active payment gateways": "إعداد وإدارة بوابات الدفع النشطة",
  "List All Gateways": "عرض كل البوابات",
  "Update Gateway": "تحديث البوابة",
  "Admin Content Management": "إدارة محتوى الإدارة",
  "Manage static pages, FAQs, policies, and terms": "إدارة الصفحات الثابتة والأسئلة الشائعة والسياسات والشروط",
  "List Pages": "عرض الصفحات",
  "List FAQs": "عرض الأسئلة الشائعة",
  "Get Privacy Policies": "عرض سياسات الخصوصية",
  "Create Privacy Policy": "إنشاء سياسة خصوصية",
  "Get Terms & Conditions": "عرض الشروط والأحكام",
  "Create Terms & Conditions": "إنشاء الشروط والأحكام",
  "Admin Blog & Articles": "مدونة ومقالات الإدارة",
  "Manage blog posts, announcements, and articles": "إدارة مقالات المدونة والإعلانات والمقالات",
  "List Blog Posts": "عرض مقالات المدونة",
  "Create Blog Post": "إنشاء مقال مدونة",
  "Delete Blog Post": "حذف مقال المدونة",
  "Banners Management": "إدارة البنرات",
  "Endpoints for managing global promotion banners": "نقاط نهاية إدارة البنرات الترويجية العامة",
  "List Banners": "عرض البنرات",
  "Admin Data Imports": "استيراد بيانات الإدارة",
  "Bulk import tools for users and Packages": "أدوات استيراد جماعية للمستخدمين والباقات",
  "Import Users from CSV": "استيراد المستخدمين من CSV",
  "Admin Price Brackets": "شرائح أسعار الإدارة",
  "Manage price brackets for IAP products and automated pricing": "إدارة شرائح الأسعار لمنتجات الشراء داخل التطبيق والتسعير التلقائي",
  "Generate Price Brackets": "توليد شرائح الأسعار",
  "List Price Brackets": "عرض شرائح الأسعار",
  "Preview Price Brackets": "معاينة شرائح الأسعار",
  "Admin Screenshot": "لقطات شاشة الإدارة",
  "Generate screenshots for marketing and IAP product listings": "توليد لقطات شاشة للتسويق وقوائم منتجات الشراء داخل التطبيق",
  "Generate Screenshot": "توليد لقطة شاشة",
  "Admin Support Tickets": "تذاكر دعم الإدارة",
  "Manage and respond to customer support tickets": "إدارة تذاكر دعم العملاء والرد عليها",
  "List All Tickets": "عرض كل التذاكر",
  "Add Ticket Message": "إضافة رسالة تذكرة",
  "Delete Ticket": "حذف التذكرة"
};

function flattenTranslations(data: TranslationData): Record<string, string> {
  return Object.entries(data).reduce<Record<string, string>>((acc, [namespace, values]) => {
    Object.entries(values || {}).forEach(([key, value]) => {
      if (typeof value === "string" && value.trim()) {
        acc[`${namespace}.${key}`] = value;
      }
    });
    return acc;
  }, {});
}

function mergeTranslationData(...sources: Array<TranslationData | undefined>): TranslationData {
  return sources.reduce<TranslationData>((acc, source) => {
    if (!source) return acc;

    Object.entries(source).forEach(([namespace, values]) => {
      acc[namespace] = {
        ...(acc[namespace] || {}),
        ...(values || {}),
      };
    });

    return acc;
  }, {});
}

function addPhrase(map: Map<string, string>, english: string, translated: string) {
  const source = english.trim();
  const target = translated.trim();
  if (!source || !target || source === target || /[{}]/.test(source) || /[{}]/.test(target)) return;
  map.set(source, target);
  map.set(normalizeDisplayWords(source), target);
  if (!source.endsWith(":")) {
    map.set(`${source}:`, target);
  }
}

function shouldPreferBuiltInTranslation(
  languageCode: string,
  remoteValue?: string,
  builtInValue?: string,
  englishValue?: string,
) {
  if (languageCode === "en" || !remoteValue || !builtInValue || remoteValue === builtInValue) return false;
  if (englishValue && remoteValue === englishValue && builtInValue !== englishValue) return true;
  if (languageCode === "ar") {
    return ARABIC_TEXT_PATTERN.test(builtInValue) && !ARABIC_TEXT_PATTERN.test(remoteValue);
  }
  return false;
}

function buildPhraseMap(
  languageCode: string,
  translations: TranslationData,
  builtInTranslations: Record<string, TranslationData>,
) {
  const map = new Map<string, string>();
  const englishTranslations = builtInTranslations.en;
  const activeBuiltInTranslations = builtInTranslations[languageCode];
  if (languageCode === "en" || !englishTranslations || !activeBuiltInTranslations) return map;

  const englishFlat = flattenTranslations(englishTranslations);
  const builtInFlat = flattenTranslations(activeBuiltInTranslations);
  const activeFlat = flattenTranslations(mergeTranslationData(activeBuiltInTranslations, translations));
  Object.entries(englishFlat).forEach(([key, english]) => {
    const translated = shouldPreferBuiltInTranslation(languageCode, activeFlat[key], builtInFlat[key], english)
      ? builtInFlat[key]
      : activeFlat[key];
    if (translated) addPhrase(map, english, translated);
  });
  if (languageCode === "ar") {
    Object.entries(ARABIC_PHRASE_OVERRIDES).forEach(([english, arabic]) => addPhrase(map, english, arabic));
  }
  return map;
}

function translateLiteral(value: string, phraseMap: Map<string, string>) {
  if (!value || !/[A-Za-z]/.test(value)) return value;
  const leading = value.match(/^\s*/)?.[0] || "";
  const trailing = value.match(/\s*$/)?.[0] || "";
  const core = value.trim();
  if (!core) return value;
  const translated = phraseMap.get(core) || phraseMap.get(normalizeDisplayWords(core));
  return translated ? `${leading}${translated}${trailing}` : value;
}

function translateDom(root: ParentNode, phraseMap: Map<string, string>) {
  if (!root || phraseMap.size === 0) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || parent.closest(DOM_TRANSLATION_SKIP_SELECTOR)) return NodeFilter.FILTER_REJECT;
      return node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });

  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text);
  }

  textNodes.forEach((node) => {
    const next = translateLiteral(node.textContent || "", phraseMap);
    if (next !== node.textContent) node.textContent = next;
  });

  if (root instanceof Element || root instanceof Document || root instanceof DocumentFragment) {
    const elements = root instanceof Element ? [root, ...Array.from(root.querySelectorAll("*"))] : Array.from(root.querySelectorAll("*"));
    elements.forEach((element) => {
      if (element.closest(DOM_TRANSLATION_SKIP_SELECTOR)) return;
      ["placeholder", "title", "aria-label"].forEach((attribute) => {
        const current = element.getAttribute(attribute);
        if (!current) return;
        const next = translateLiteral(current, phraseMap);
        if (next !== current) element.setAttribute(attribute, next);
      });
    });
  }
}

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [languageCode, setLanguageCode] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved || "en";
    }
    return "en";
  });

  const [translations, setTranslations] = useState<TranslationData>({});
  const [builtInTranslations, setBuiltInTranslations] = useState<Record<string, TranslationData>>({});
  const [builtInTranslationsLoading, setBuiltInTranslationsLoading] = useState(true);

  const { data: languages = [], isLoading: languagesLoading } = useQuery<Language[]>({
    queryKey: ["/api/languages"],
    staleTime: 5 * 60 * 1000,
  });
  const currentLanguage = languages.find((l) => l.code === languageCode) || null;
  const isRTL = currentLanguage?.isRTL || RTL_LANGUAGE_CODES.has(languageCode);

  useEffect(() => {
    let isActive = true;
    const codes = Array.from(new Set(["en", languageCode].filter(Boolean)));

    setBuiltInTranslationsLoading(true);
    Promise.all(codes.map(async (code) => [code, await loadBuiltInTranslation(code)] as const))
      .then((entries) => {
        if (!isActive) return;
        setBuiltInTranslations((previous) => {
          const next = { ...previous };
          entries.forEach(([code, data]) => {
            next[code] = data;
          });
          return next;
        });
      })
      .finally(() => {
        if (isActive) setBuiltInTranslationsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [languageCode]);

  const { data: translationsData, isLoading: translationsLoading } = useQuery<{
    language: Language;
    translations: TranslationData;
  }>({
    queryKey: [`/api/translations/${languageCode}`],
    enabled: !!languageCode,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (translationsData?.translations) {
      setTranslations(translationsData.translations);
    }
  }, [translationsData]);

  const phraseMap = useMemo(
    () => buildPhraseMap(languageCode, translations, builtInTranslations),
    [languageCode, translations, builtInTranslations],
  );

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dir = isRTL ? "rtl" : "ltr";
      document.documentElement.lang = languageCode;
      document.documentElement.dataset.language = languageCode;
      document.documentElement.classList.toggle("rtl", isRTL);
    }
  }, [isRTL, languageCode]);

  useEffect(() => {
    if (typeof document === "undefined" || languageCode === "en" || phraseMap.size === 0) return;

    let frame = 0;
    const runTranslation = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        translateDom(document.body, phraseMap);
      });
    };

    runTranslation();
    const observer = new MutationObserver(runTranslation);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["placeholder", "title", "aria-label"],
    });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [languageCode, phraseMap]);

  const setLanguage = useCallback((code: string) => {
    setLanguageCode(code);
    setTranslations({});
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, code);
    }
  }, []);


  const t = useCallback(
    (
      key: string,
      fallbackOrParams?: string | Record<string, string | number>,
      params?: Record<string, string | number>
    ): string => {
      let fallback: string | undefined;
      let actualParams: Record<string, string | number> | undefined;

      if (typeof fallbackOrParams === "string") {
        fallback = fallbackOrParams;
        actualParams = params;
      } else {
        fallback = undefined;
        actualParams = fallbackOrParams;
      }

      const keyParts = key.split(".");
      const namespace = keyParts[0];
      const translationKey = keyParts.slice(1).join(".");

      let value: string | undefined;
      
      if (translations[namespace] && translationKey) {
        value = translations[namespace][translationKey];
      }

      if (translationKey) {
        const builtInValue = builtInTranslations[languageCode]?.[namespace]?.[translationKey];
        const englishValue = builtInTranslations.en?.[namespace]?.[translationKey];
        if (!value || shouldPreferBuiltInTranslation(languageCode, value, builtInValue, englishValue)) {
          value = builtInValue;
        }
      } else if (!translationKey) {
        for (const ns of Object.values(translations)) {
          if (ns[key]) {
            value = ns[key];
            break;
          }
        }
      }

      const normalizeText = (text: string) => {
        if (languageCode === "en") return normalizeDisplayWords(text);
        return translateLiteral(text, phraseMap);
      };

      if (!value) {
        if (!fallback) {
          return key;
        }

        const result = fallback;
        if (actualParams) {
          return normalizeText(result.replace(/\{(\w+)\}/g, (match, paramKey) => {
            return actualParams[paramKey]?.toString() || match;
          }));
        }
        return normalizeText(result);
      }

      if (actualParams) {
        return normalizeText(value.replace(/\{(\w+)\}/g, (match, paramKey) => {
          return actualParams[paramKey]?.toString() || match;
        }));
      }

      return normalizeText(value);
    },
    [translations, builtInTranslations, languageCode, phraseMap]
  );

  const isLoading = languagesLoading || translationsLoading || builtInTranslationsLoading;

  return (
    <TranslationContext.Provider
      value={{
        language: currentLanguage,
        languages,
        languageCode,
        isRTL,
        isLoading,
        setLanguage,
        t,
      }}
    >
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (context) {
    return context;
  }

  const fallbackLanguageCode =
    typeof window !== "undefined"
      ? localStorage.getItem(STORAGE_KEY) || document.documentElement.lang || "en"
      : "en";
  const fallbackIsRTL = RTL_LANGUAGE_CODES.has(fallbackLanguageCode);

  const fallbackT: TranslationContextType["t"] = (key, fallbackOrParams, params) => {
    const fallback = typeof fallbackOrParams === "string" ? fallbackOrParams : undefined;
    const actualParams = typeof fallbackOrParams === "string" ? params : fallbackOrParams;
    const rawValue = fallback || key;
    const value =
      fallbackLanguageCode === "en"
        ? normalizeDisplayWords(rawValue)
        : rawValue;

    if (!actualParams) return value;
    return value.replace(/\{(\w+)\}/g, (match, paramKey) => actualParams[paramKey]?.toString() || match);
  };

  return {
    language: null,
    languages: [],
    languageCode: fallbackLanguageCode,
    isRTL: fallbackIsRTL,
    isLoading: false,
    setLanguage: () => {},
    t: fallbackT,
  };
}
