import { motion } from "framer-motion";
import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { HowItWorksCard } from "../HowItWorksCard";

interface HowWorkStep {
  number: number;
  title: string;
  description: string;
  image: string;
  imageAlt?: string;
}

interface HowItWorksProps {
  steps: HowWorkStep[];
}

const benefits = [
  "No physical SIM needed",
  "Instant activation",
  "Works in 190+ countries",
];

export function HowItWorks({ steps }: HowItWorksProps) {
  return (
    <section className="relative py-16 md:py-24 bg-background overflow-hidden">
      {/* Background Effects - Theme Compatible */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, color-mix(in srgb, var(--primary-light-hex) 8%, transparent), transparent, color-mix(in srgb, var(--primary-light-hex) 12%, transparent))`,
        }}
      ></div>
      <div
        className="absolute top-0 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-30"
        style={{ backgroundColor: `var(--primary-light-hex)` }}
      ></div>
      <div
        className="absolute bottom-0 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-30"
        style={{ backgroundColor: `var(--primary-light-hex)` }}
      ></div>

      <div className="relative containers">
        {/* Header Section */}
        <div className="text-center mb-16">
          {/* Badge - Theme Colors */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 border rounded-full mb-6"
            style={{
              backgroundColor: `var(--primary-light-hex)`,
              borderColor: `var(--primary-hex)`,
            }}
          >
            <Sparkles className="h-4 w-4 text-foreground " />
            <span className="text-sm font-semibold text-foreground">Simple Process</span>
          </motion.div>

          {/* Main Heading - Theme Gradient */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r bg-clip-text text-transparent"
            style={{
              backgroundImage: `linear-gradient(135deg, var(--primary-hex), var(--primary-second-hex), var(--primary-dark-hex))`,
            }}
          >
            How Does It Work?
          </motion.h2>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            Get connected in just 3 simple steps. No store visits, no waiting —
            just instant global connectivity at your fingertips.
          </motion.p>
        </div>

        {/* Connecting Line - Desktop - Theme Colors */}
        <div className="relative max-w-7xl mx-auto">
          <div className="hidden lg:block absolute top-8 left-[16%] right-[16%] h-1 overflow-hidden z-0">
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, delay: 0.5 }}
              className="h-full rounded-full origin-left"
              style={{
                background: `linear-gradient(90deg, var(--primary-hex), var(--primary-second-hex), var(--primary-light-hex))`,
              }}
            />

            {/* Animated Traveling Dot - Theme Colors */}
            <motion.div
              animate={{ x: ["0%", "100%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg border-2"
              style={{
                borderColor: `var(--primary-hex)`,
                boxShadow: `0 0 20px var(--primary-hex)`,
              }}
            />
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2, duration: 0.6 }}
              >
                <HowItWorksCard
                  number={step.number}
                  title={step.title}
                  description={step.description}
                  image={step.image}
                  imageAlt={step.imageAlt || step.title}
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom Benefits + CTA Section - Theme Compatible */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8 }}
          className="mt-16 max-w-4xl mx-auto"
        >
          <div className="relative group">
            {/* Glow - Theme Colors */}
            <div
              className="absolute -inset-1 rounded-3xl opacity-50 group-hover:opacity-100 blur-xl transition-opacity duration-500"
              style={{
                background: `linear-gradient(90deg, color-mix(in srgb, var(--primary-hex) 30%, transparent), color-mix(in srgb, var(--primary-second-hex) 50%, transparent), color-mix(in srgb, var(--primary-hex) 30%, transparent))`,
              }}
            ></div>

            {/* Card */}
            <div className="relative bg-card border-2 border-border rounded-3xl p-8 shadow-xl">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Benefits List - Theme Colors */}
                <div className="flex-1 space-y-3">
                  {benefits.map((benefit, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.9 + index * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: `linear-gradient(135deg, var(--primary-hex), var(--primary-second-hex))`,
                        }}
                      >
                        <CheckCircle2
                          className="h-4 w-4 text-black"
                          strokeWidth={2.5}
                        />
                      </div>
                      <span className="text-foreground font-medium text-sm md:text-base">
                        {benefit}
                      </span>
                    </motion.div>
                  ))}
                </div>

                {/* CTA Button - Theme Gradient */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 text-black font-bold rounded-xl shadow-lg transition-all duration-300 flex items-center gap-2 group relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, var(--primary-hex), var(--primary-second-hex))`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = `0 20px 50px color-mix(in srgb, var(--primary-hex) 40%, transparent)`;
                    e.currentTarget.style.transform = "scale(1.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = `0 10px 25px rgba(0, 0, 0, 0.1)`;
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  {/* Shine Effect on Hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500"
                    style={{
                      background: `linear-gradient(90deg, transparent, white, transparent)`,
                      transform: "translateX(-100%)",
                    }}
                  ></div>

                  <span className="relative z-10">Get Started Now</span>
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform relative z-10" />
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
