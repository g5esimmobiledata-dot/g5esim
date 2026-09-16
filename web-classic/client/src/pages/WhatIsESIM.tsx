'use client';

import { motion } from 'framer-motion';
import {
  Smartphone,
  Zap,
  Globe,
  Shield,
  CheckCircle2,
  Download,
  ScanLine,
  Wifi,
  CreditCard,
  Clock,
  Users,
  ArrowRight,
  X,
  Settings,
  Plane,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Helmet } from 'react-helmet-async';
import { useSettingByKey } from '@/hooks/useSettings';
import { useLocation } from 'wouter';
import { useTranslation } from '@/contexts/TranslationContext';

export function WhatIsEsim() {
  const siteName = useSettingByKey('platform_name');
  const [, navigate] = useLocation();
  const { t } = useTranslation();

 const benefits = [
  {
    icon: Clock,
    titleKey: "website.esim.benefits.instant.title",
    descKey: "website.esim.benefits.instant.desc",
  },
  {
    icon: CreditCard,
    titleKey: "website.esim.benefits.save.title",
    descKey: "website.esim.benefits.save.desc",
  },
  {
    icon: Globe,
    titleKey: "website.esim.benefits.global.title",
    descKey: "website.esim.benefits.global.desc",
  },
  {
    icon: Shield,
    titleKey: "website.esim.benefits.number.title",
    descKey: "website.esim.benefits.number.desc",
  },
  {
    icon: Settings,
    titleKey: "website.esim.benefits.management.title",
    descKey: "website.esim.benefits.management.desc",
  },
  {
    icon: Wifi,
    titleKey: "website.esim.benefits.profiles.title",
    descKey: "website.esim.benefits.profiles.desc",
  },
];

  const howItWorks = [
  {
    step: "1",
    icon: Download,
    titleKey: "website.esim.how.purchase.title",
    descKey: "website.esim.how.purchase.desc",
  },
  {
    step: "2",
    icon: ScanLine,
    titleKey: "website.esim.how.scan.title",
    descKey: "website.esim.how.scan.desc",
  },
  {
    step: "3",
    icon: Settings,
    titleKey: "website.esim.how.install.title",
    descKey: "website.esim.how.install.desc",
  },
  {
    step: "4",
    icon: Wifi,
    titleKey: "website.esim.how.connect.title",
    descKey: "website.esim.how.connect.desc",
  },
];

  const comparison = [
  {
    featureKey: "website.esim.compare.activation",
    traditionalKey: "website.esim.compare.activation.traditional",
    esimKey: "website.esim.compare.activation.esim",
    winner: "esim",
  },
  {
    featureKey: "website.esim.compare.cost",
    traditionalKey: "website.esim.compare.cost.traditional",
    esimKey: "website.esim.compare.cost.esim",
    winner: "esim",
  },
  {
    featureKey: "website.esim.compare.setup",
    traditionalKey: "website.esim.compare.setup.traditional",
    esimKey: "website.esim.compare.setup.esim",
    winner: "esim",
  },
  {
    featureKey: "website.esim.compare.number",
    traditionalKey: "website.esim.compare.number.traditional",
    esimKey: "website.esim.compare.number.esim",
    winner: "esim",
  },
  {
    featureKey: "website.esim.compare.countries",
    traditionalKey: "website.esim.compare.countries.traditional",
    esimKey: "website.esim.compare.countries.esim",
    winner: "esim",
  },
];
 const compatibleDevices = [
  "website.esim.devices.iphone",
  "website.esim.devices.samsung",
  "website.esim.devices.pixel",
  "website.esim.devices.ipad",
  "website.esim.devices.galaxywatch",
  "website.esim.devices.applewatch",
];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background flex flex-col">
      <Helmet>
        <title>{` What is eSIM? - ${siteName} | Complete Guide to eSIM Technology `}</title>
        <meta
          name="description"
          content={`Learn everything about eSIM technology. Instant activation, save up to 90% on roaming, works in 190+ countries. Get started with ${siteName} Today.`}
        />
      </Helmet>

      {/* Hero Section */}
      <section className="py-20 md:py-28 lg:py-36 bg-white dark:bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 dark:from-primary/10 dark:via-transparent dark:to-primary/5"></div>

        <div className="containers relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 bg-primary/10 dark:bg-primary/20 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full mb-4 sm:mb-6">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <span className="text-xs sm:text-sm font-semibold text-primary">
                    {t("website.esim.hero.badge", "Future of Travel Connectivity")}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 leading-tight text-gray-900 dark:text-foreground">
               {t("website.esim.hero.title", "What is an")}{" "}
                <span className="bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
                  eSIM?
                </span>
              </h1>

              <p className="text-base sm:text-lg text-gray-600 dark:text-muted-foreground mb-6 sm:mb-8 leading-relaxed">
                {t(
    "website.esim.hero.description",
    "An eSIM (embedded SIM) is a digital SIM card built directly into your phone. No physical card needed - just scan a QR code and get connected instantly in 190+ countries."
  )}
              </p>

              <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm sm:text-base text-gray-700 dark:text-muted-foreground">
                    <strong>{t("website.esim.hero.points.saveTitle","Save 90%")}:</strong>{" "}
{t("website.esim.hero.points.save","Avoid expensive roaming charges")}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm sm:text-base text-gray-700 dark:text-muted-foreground">
                    <strong>{t("website.esim.hero.points.instantTitle","Instant Setup")}:</strong>{" "}
{t("website.esim.hero.points.instant","Activate in 5 seconds by scanning QR code")}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm sm:text-base text-gray-700 dark:text-muted-foreground">
                  <strong>{t("website.esim.hero.points.dualTitle","Dual SIM")}:</strong>{" "}
{t("website.esim.hero.points.dual","Keep your main number active while traveling")}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 sm:gap-4">
                <Button
                  onClick={() => navigate('/destinations')}
                  size="lg"
                  className="bg-primary-gradient text-white px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg shadow-lg hover:shadow-xl transition-all hover:scale-105"
                >
                  {t("website.esim.hero.cta.buy","Get Your eSIM Now")}
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                <Button
                  onClick={() => navigate('/supported-devices')}
                  variant="outline"
                  size="lg"
                  className="border-2 border-gray-300 dark:border-border px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg"
                >
                  {t("website.esim.hero.cta.compatibility","Check Compatibility")}
                </Button>
              </div>
            </motion.div>

            {/* Right Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl sm:shadow-2xl ring-1 ring-gray-200 dark:ring-primary/20">
                <img
                  src="/images/Coverage that reaches further.png"
                  alt="eSIM Technology"
                  className="w-full h-[300px] sm:h-[400px] lg:h-[500px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent dark:from-black/50"></div>
              </div>

              {/* Floating Badge */}
              <div className="absolute -bottom-4 sm:-bottom-6 -right-4 sm:-right-6 bg-white dark:bg-card rounded-xl sm:rounded-2xl shadow-xl dark:shadow-primary/20 p-3 sm:p-4 border border-gray-200 dark:border-primary/30">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-foreground">
                      190+ Countries
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-600 dark:text-muted-foreground">
                      Instant Connection
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-gray-50 dark:bg-background">
        <div className="containers">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10 sm:mb-12 md:mb-16"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary-dark mb-3 sm:mb-4">
             {t("website.esim.how.title","How Does eSIM Work?")}
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-muted-foreground max-w-2xl mx-auto">
              {t("website.esim.how.description","Get connected in 4 simple steps. No technical knowledge required")}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {howItWorks.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <div className="bg-white dark:bg-card rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-gray-200 dark:border-primary/30 shadow-sm dark:shadow-primary/10 hover:shadow-lg dark:hover:shadow-primary/20 transition-all h-full">
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary-gradient flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-lg">
                      {item.step}
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                      <item.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-foreground mb-2 sm:mb-3">
                   {t(item.titleKey)}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-muted-foreground leading-relaxed">
                    {t(item.descKey)}
                  </p>
                </div>
                {index < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className="w-6 h-6 text-primary/30" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-white dark:bg-background">
        <div className="containers">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10 sm:mb-12 md:mb-16"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-foreground mb-3 sm:mb-4">
              {t("website.esim.benefits.title","Why Choose eSIM?")}
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-muted-foreground max-w-2xl mx-auto">
               {t("website.esim.benefits.description","Experience the future of travel connectivity with these powerful benefits")}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group bg-white dark:bg-card rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-gray-200 dark:border-primary/30 hover:border-primary/50 hover:shadow-xl dark:hover:shadow-primary/20 transition-all"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform shadow-sm">
                  <benefit.icon className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-foreground mb-2 sm:mb-3">
                  {t(benefit.titleKey)}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-muted-foreground leading-relaxed">
                  {t(benefit.descKey)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-gray-50 dark:bg-background">
        <div className="containers">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10 sm:mb-12 md:mb-16"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary-dark mb-3 sm:mb-4">
             {t("website.esim.compare.title","eSIM vs Traditional SIM")}
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-muted-foreground max-w-2xl mx-auto">
              {t("website.esim.compare.description","See why eSIM is the smarter choice for modern travelers")}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-white dark:bg-card rounded-xl sm:rounded-2xl shadow-xl dark:shadow-primary/20 border border-gray-200 dark:border-primary/30 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-muted">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-900 dark:text-foreground">
                        {t("website.esim.compare.feature","Feature")}
                      </th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-900 dark:text-foreground">
                        {t("website.esim.compare.traditional","Traditional SIM")}
                      </th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-primary">
                        {t("website.esim.compare.esim","eSIM")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-border">
                    {comparison.map((item, index) => (
                      <tr
                        key={index}
                        className="hover:bg-gray-50 dark:hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium text-gray-900 dark:text-foreground">
                          {t(item.featureKey)}
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600 dark:text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <X className="w-4 h-4 text-red-500 flex-shrink-0" />
                            <span>{t(item.traditionalKey)}</span>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                            <span className="font-medium text-primary">{t(item.esimKey)}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Compatible Devices Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-white dark:bg-background">
        <div className="containers">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <div className="text-center mb-8 sm:mb-10 md:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-foreground mb-3 sm:mb-4">
               {t("website.esim.compatibility.title","Is Your Device Compatible?")}
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-muted-foreground">
               {t("website.esim.compatibility.description","Most devices from 2018 onwards support eSIM technology")}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-10">
              {compatibleDevices.map((device, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 bg-gray-50 dark:bg-card rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-primary/30"
                >
                  <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
                  <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-foreground">
                   {t(device)}
                  </span>
                </motion.div>
              ))}
            </div>

            <div className="text-center">
              <Button
                onClick={() => navigate('/supported-devices')}
                size="lg"
                variant="outline"
                className="border-2 border-primary text-primary hover:bg-primary/10 px-6 sm:px-8 text-sm sm:text-base rounded-lg"
              >
                {t("website.esim.compatibility.cta","View Full Compatibility List")}

                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-br from-primary to-primary-dark text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-64 sm:w-96 h-64 sm:h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="containers relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
               {t("website.esim.cta.title","Ready to Try eSIM?")}
            </h2>
            <p className="text-base sm:text-lg text-white/90 mb-6 sm:mb-8">
             {t(
    "website.esim.cta.description",
    "Join millions of travelers who stay connected worldwide with"
  )} {siteName}
            </p>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
              <Button
                onClick={() => navigate('/destinations')}
                size="lg"
                className="bg-white text-primary hover:bg-gray-100 px-6 sm:px-8 text-sm sm:text-base rounded-lg shadow-xl hover:shadow-2xl transition-all"
              >
                {t("website.esim.cta.plans","Browse eSIM Plans")}
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button
                onClick={() => navigate('/about-us')}
                size="lg"
                variant="outline"
                className="border-2 border-white text-white hover:bg-white/20 backdrop-blur-sm px-6 sm:px-8 text-sm sm:text-base rounded-lg"
              >
               {t("website.esim.cta.learn","Learn More")}
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

export default WhatIsEsim;
