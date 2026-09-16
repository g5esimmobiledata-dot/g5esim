"use client";

import { motion } from "framer-motion";
import { Star, ArrowRight, TrendingUp, DollarSign, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AboutUsSection() {
  const stats = [
    {
      icon: TrendingUp,
      value: "95%",
      label: "Customer satisfaction",
      description:
        "Trusted by millions, our service ensures unparalleled customer satisfaction with dedicated support and innovative solutions tailored to your needs.",
    },
    {
      icon: TrendingUp,
      value: "10+",
      label: "Innovation & Insight",
      description:
        "Driving over a decade of groundbreaking innovations and deep industry insights to empower businesses worldwide.",
    },
    {
      icon: DollarSign,
      value: "$10m",
      label: "Efficient financial",
      description:
        "Streamlined processes delivering over $10 million in financial savings and value creation for our clients.",
    },
    {
      icon: Users,
      value: "50m",
      label: "Users worldwide",
      description:
        "Serving a global community of over 50 million users, delivering impactful and reliable solutions every day.",
    },
  ];

  return (
    <section className="py-12 md:py-16 lg:py-20 bg-background">
      <div className="containers space-y-8 md:space-y-12">
        {/* First Card - Hero with CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-white dark:bg-gray-900 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-lg"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-0">
            {/* Left - Content */}
            <div className="p-8 md:p-12 lg:p-16 flex flex-col justify-center">
              {/* Rating */}
              <div className="flex items-center gap-2 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-5 h-5 fill-yellow-400 text-yellow-400"
                  />
                ))}
                <span className="text-gray-700 dark:text-gray-300 font-medium ml-2">
                  4.97/5 reviewes
                </span>
              </div>

              {/* Heading */}
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
                Discover our journey and what drives us
              </h2>

              {/* Description */}
              <p className="text-gray-600 dark:text-gray-400 text-base md:text-lg mb-8 leading-relaxed">
                Founded by data experts, we create cutting-edge SaaS analytics
                platforms tailored for businesses of all sizes.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  size="lg"
                  className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-6 text-base rounded-full shadow-lg hover:shadow-xl transition-all"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-2 border-orange-500 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950 px-8 py-6 text-base rounded-full transition-all"
                >
                  Free trial
                </Button>
              </div>
            </div>

            {/* Right - Image */}
            <div className="relative h-[300px] lg:h-full min-h-[400px]">
              <img
                src="/images/about-hero.jpg"
                alt="Team member working"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          </div>
        </motion.div>

        {/* Second Card - Stats with Image */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white dark:bg-gray-900 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-lg"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Left - Image */}
            <div className="relative h-[300px] lg:h-full min-h-[500px] order-2 lg:order-1">
              <img
                src="/images/about-stats.jpg"
                alt="Team member at work"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>

            {/* Right - Stats */}
            <div className="p-8 md:p-12 lg:p-16 flex flex-col justify-center order-1 lg:order-2">
              <div className="space-y-6">
                {stats.map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      {/* Left - Value */}
                      <div className="flex-shrink-0">
                        <h3 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-1">
                          {stat.value}
                        </h3>
                        <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                          {stat.label}
                        </p>
                      </div>

                      {/* Right - Description */}
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                          {stat.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default AboutUsSection;
