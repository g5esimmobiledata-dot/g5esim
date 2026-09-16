import { Check, X, Zap, Crown, Shield, Sparkles, TrendingUp, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSettingByKey } from '@/hooks/useSettings';
import { useLocation } from 'wouter';
import { useTranslation } from '@/contexts/TranslationContext';

// const siteName = useSettingByKey('platform_name');

export function ComparisonTable() {
  const siteName = useSettingByKey('platform_name');
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  const comparisons = [
    {
      feature: t("website.compare.affordability", "Affordability"),
      us: t("website.compare.cheaper", "Up to 3x cheaper"),
      others: t("website.compare.expensive", "Premium rates"),
      highlight: true,
    },
    {
      feature: t("website.compare.globalSim", "One Global eSIM"),
      us: true,
      others: false,
      link: true,
      linkText: t("website.compare.lifetime", "Lifetime validity"),
      linkUrl: "#lifetime-validity",
    },
    { feature: t("website.compare.topup", "Easy Online Top-up"), us: true, others: false },
    { feature: t("website.compare.addData", "Add Data Anytime"), us: true, others: t("website.compare.some", "Often limited") },
    { feature: t("website.compare.transparency", "100% Transparency"), us: true, others: false },
    { feature: t("website.compare.esimPhysical", "eSIM + Physical Slot"), us: true, others: false },
    { feature: t("website.compare.gbUnlimited", "GB & Unlimited Plans"), us: true, others: false },
    { feature: t("website.compare.voiceSms", "Voice & SMS Support"), us: true, others: t("website.compare.some", "Data only") },
    { feature: t("website.compare.regulatory", "Regulatory Compliance"), us: true, others: false },
    { feature: t("website.compare.localPlans", "Local Data Plans"), us: true, others: false },
  ];

  const stats = [
    { icon: TrendingUp, value: "40%", label: t("website.compare.costSavings", "Average Cost Savings") },
    { icon: Shield, value: "100%", label: t("website.compare.transparencyStat", "Transparent Pricing") },
    { icon: Sparkles, value: "10+", label: t("website.compare.extraFeatures", "Premium Features") },
  ];

  const renderValue = (value: boolean | string, isOthers: boolean = false) => {
    if (typeof value === 'boolean') {
      return value ? (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          whileInView={{ scale: 1, rotate: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="relative w-11 h-11 rounded-full flex items-center justify-center mx-auto shadow-lg group cursor-pointer"
          style={{
            background: `linear-gradient(135deg, var(--primary-hex), var(--primary-second-hex))`,
          }}
        >
          {/* Glow Effect */}
          <div
            className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-60 blur-xl transition-opacity duration-300"
            style={{ backgroundColor: `var(--primary-hex)` }}
          ></div>

          {/* Check Icon */}
          <Check className="h-6 w-6 text-white relative z-10" strokeWidth={3.5} />

          {/* Shine Effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/30 to-transparent opacity-50"></div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-11 h-11 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mx-auto"
        >
          <X className="h-6 w-6 text-gray-400 dark:text-gray-500" strokeWidth={2.5} />
        </motion.div>
      );
    }
    return (
      <motion.span
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className={`text-sm md:text-base font-bold ${isOthers ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-foreground'
          }`}
      >
        {value}
      </motion.span>
    );
  };

  return (
    <section className="py-16 md:py-24 bg-background relative overflow-hidden">
      {/* Background Decorations - Theme Compatible */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, color-mix(in srgb, var(--primary-light-hex) 8%, transparent), transparent, color-mix(in srgb, var(--primary-light-hex) 12%, transparent))`,
        }}
      ></div>
      <div
        className="absolute top-20 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-40"
        style={{ backgroundColor: `var(--primary-light-hex)` }}
      ></div>
      <div
        className="absolute bottom-20 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-40"
        style={{ backgroundColor: `var(--primary-light-hex)` }}
      ></div>

      <div className="containers relative">
        {/* Header Section */}
        <div className="text-center mb-12 md:mb-16">
          {/* Badge - Theme Colors */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex bg-gradient-to-r from-primary to-primary-dark items-center gap-2 px-4 py-2 border rounded-full mb-6 text-white"
          >
            <Crown className="h-4 w-4 Why Choose Us" />
            <span className="text-sm font-semibold Why Choose Us">{t("website.compare.whyChoose", "Why Choose Us")}</span>
          </motion.div>

          {/* Main Heading - Theme Gradient */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4"
          >
            <span
              className="bg-gradient-to-r bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(135deg, var(--primary-hex), var(--primary-second-hex))`,
              }}
            >
              {siteName}
            </span>{' '}
            <span className="text-foreground">Vs</span>{' '}
            <span className="text-gray-400 dark:text-gray-500">{t("website.compare.others", "Others")}</span>
          </motion.h2>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            {t("website.compare.trust", `Trusted By 500,000+ Travelers For Reliable Global Connectivity.`, { siteName })}
          </motion.p>
        </div>

        {/* Stats Cards - Theme Compatible */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-12 max-w-4xl mx-auto"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="group relative"
            >
              {/* Glow - Theme Colors */}
              <div
                className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 blur-lg transition-opacity duration-500"
                style={{
                  background: `linear-gradient(90deg, color-mix(in srgb, var(--primary-hex) 30%, transparent), color-mix(in srgb, var(--primary-second-hex) 50%, transparent), color-mix(in srgb, var(--primary-hex) 30%, transparent))`,
                }}
              ></div>

              {/* Card */}
              <div
                className="relative bg-card border-2 rounded-2xl p-6 text-center transition-all duration-300 shadow-sm group-hover:shadow-xl"
                style={{ borderColor: 'var(--border)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `var(--primary-hex)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: `var(--primary-light-hex)` }}
                >
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="text-3xl font-bold mb-1" style={{ color: `var(--primary-hex)` }}>
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="max-w-5xl mx-auto"
        >
          {/* Outer Glow Container */}
          <div className="relative">
            {/* Glow Effect - Theme Colors */}
            <div
              className="absolute -inset-1 rounded-3xl blur-2xl opacity-30"
              style={{
                background: `linear-gradient(90deg, color-mix(in srgb, var(--primary-hex) 30%, transparent), color-mix(in srgb, var(--primary-second-hex) 50%, transparent), color-mix(in srgb, var(--primary-hex) 30%, transparent))`,
              }}
            ></div>

            {/* Table Container */}
            <div className="relative bg-card rounded-2xl md:rounded-3xl border-2 border-border overflow-hidden shadow-2xl">
              {/* Header Row */}
              <div className="grid grid-cols-[2fr_1fr_1fr] md:grid-cols-3 border-b-2 border-border bg-gradient-to-r from-muted/50 to-muted/30">
                <div className="p-4 md:p-6">
                  <span className="text-xs md:text-sm font-bold text-muted-foreground uppercase tracking-wider">
                    {t("website.compare.features", "Features")}
                  </span>
                </div>

                <div
                  className="p-4 md:p-6 text-center border-x-2 border-border relative overflow-visible"
                  style={{
                    background: `linear-gradient(135deg, color-mix(in srgb, var(--primary-light-hex) 20%, transparent), color-mix(in srgb, var(--primary-hex) 10%, transparent), color-mix(in srgb, var(--primary-light-hex) 20%, transparent))`,
                  }}
                >
                  {/* Crown Badge - Theme Colors */}
                  {/* <div
                    className="absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full flex items-center justify-center shadow-xl z-10 animate-bounce"
                    style={{
                      background: `linear-gradient(135deg, var(--primary-hex), var(--primary-second-hex))`,
                    }}
                  >
                    <Crown className="h-5 w-5 text-black" strokeWidth={2.5} />
                  </div> */}

                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Zap className="h-5 w-5 fill-current" style={{ color: `var(--primary-hex)` }} />
                    <span
                      className="text-sm md:text-base font-black"
                      style={{ color: `var(--primary-hex)` }}
                    >
                      {siteName}
                    </span>
                  </div>

                  {/* Winner Tag - Theme Colors */}
                  <div className="mt-2 inline-flex items-center bg-gradient-to-tr from-primary to-primary-light text-white  gap-1 px-3 py-1 border rounded-full">
                    <Sparkles className="h-3 w-3  " />
                    <span className="text-xs font-bold ">{t("website.compare.bestChoice", "BEST CHOICE")}</span>
                  </div>
                </div>

                <div className="p-4 md:p-6 text-center">
                  <span className="text-sm md:text-base font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                    {t("website.compare.othersHeader", "Others")}
                  </span>
                  <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">{t("website.compare.competitors", "Competitors")}</div>
                </div>
              </div>

              {/* Comparison Rows */}
              {comparisons.map((row, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.03 }}
                  className={`grid grid-cols-[2fr_1fr_1fr] md:grid-cols-3 ${index !== comparisons.length - 1 ? 'border-b border-border' : ''
                    } hover:bg-muted/30 dark:hover:bg-muted/20 transition-all duration-200 group`}
                  style={
                    row.highlight
                      ? {
                        backgroundColor: `color-mix(in srgb, var(--primary-light-hex) 10%, transparent)`,
                      }
                      : {}
                  }
                >
                  {/* Feature Name */}
                  <div className="p-4 md:p-6 flex items-center gap-3">
                    {/* Feature Number Badge */}
                    <div className="hidden md:flex w-7 h-7 rounded-lg bg-muted items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-muted-foreground">{index + 1}</span>
                    </div>

                    <span className="text-sm md:text-base text-foreground font-medium transition-colors">
                      {row.feature}
                      {row.link && (
                        <>
                          {' '}
                          <a
                            href={row.linkUrl}
                            className="font-semibold underline underline-offset-2 decoration-2 inline-flex items-center gap-1 transition-colors hover:opacity-80"
                            style={{ color: `var(--primary-hex)` }}
                          >
                            {row.linkText}
                            <ArrowRight className="h-3 w-3 " />
                          </a>
                        </>
                      )}
                    </span>
                  </div>

                  <div
                    className="p-4 md:p-6 flex items-center justify-center border-x border-border"
                    style={{
                      background: `linear-gradient(135deg, color-mix(in srgb, var(--primary-light-hex) 5%, transparent), transparent, color-mix(in srgb, var(--primary-light-hex) 5%, transparent))`,
                    }}
                  >
                    {renderValue(row.us)}
                  </div>

                  {/* Others Value */}
                  <div className="p-4 md:p-6 flex items-center justify-center">
                    {renderValue(row.others, true)}
                  </div>
                </motion.div>
              ))}

              {/* Bottom Summary Bar - Theme Colors */}
              <div
                className="p-6 border-t-2 border-border"
                style={{
                  background: `linear-gradient(90deg, color-mix(in srgb, var(--primary-light-hex) 10%, transparent), color-mix(in srgb, var(--primary-hex) 5%, transparent), color-mix(in srgb, var(--primary-light-hex) 10%, transparent))`,
                }}
              >
                <div className="flex items-center justify-center gap-3 text-center">
                  <Shield className="h-6 w-6" style={{ color: `var(--primary-hex)` }} />
                  <p className="text-sm md:text-base font-semibold text-foreground">
                    <span className="font-bold" style={{ color: `var(--primary-hex)` }}>
                      {t("website.compare.premiumFeatures", "Premium Features Included")}
                    </span>{' '}
                    {/* — All included at no extra cost */}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bottom CTA - Theme Gradient */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="text-center mt-12"
        >
          <button
            className="inline-flex items-center gap-3 px-8 py-4 text-white font-bold rounded-xl shadow-lg transition-all duration-300 group"
            style={{
              background: `linear-gradient(135deg, var(--primary-hex), var(--primary-second-hex))`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = `0 20px 50px color-mix(in srgb, var(--primary-hex) 40%, transparent)`;
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = `0 10px 25px rgba(0, 0, 0, 0.1)`;
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onClick={() => {
              setLocation('/login');
            }}
          >
            {t("website.compare.getStarted", "Get Started Now")}
            <Zap className="h-5 w-5 group-hover:rotate-12 transition-transform" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
