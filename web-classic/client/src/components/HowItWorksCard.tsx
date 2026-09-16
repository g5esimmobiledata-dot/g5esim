import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

interface HowItWorksCardProps {
  number: number;
  title: string;
  description: string;
  image: string;
  imageAlt?: string;
  index?: number;
}

export function HowItWorksCard({
  number,
  title,
  description,
  image,
  imageAlt = "Step illustration",
  index = 0,
}: HowItWorksCardProps) {
  return (
    <div className="relative group h-full">
      {/* Glow Effect - Theme Compatible */}
      <div
        className="absolute -inset-1 rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"
        style={{
          background: `linear-gradient(135deg, color-mix(in srgb, var(--primary-hex) 30%, transparent), color-mix(in srgb, var(--primary-second-hex) 50%, transparent), color-mix(in srgb, var(--primary-hex) 30%, transparent))`,
        }}
      ></div>

      {/* Card - Theme Compatible */}
      <div
        className="relative rounded-3xl p-8 pt-12 pb-0 flex flex-col items-center text-center border-2 transition-all duration-300 h-full shadow-2xl"
        style={{
          background: `linear-gradient(135deg, var(--card), color-mix(in srgb, var(--primary-hex) 5%, var(--card)), var(--card))`,
          borderColor: "var(--border)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = `var(--primary-hex)`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
        }}
      >
        {/* Shine Effect Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>

        {/* Number Badge - Theme Compatible */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          whileInView={{ scale: 1, rotate: 0 }}
          viewport={{ once: true }}
          transition={{
            delay: index * 0.2 + 0.3,
            type: "spring",
            stiffness: 200,
            damping: 12,
          }}
          className="absolute -top-6 left-1/2 -translate-x-1/2 z-20"
        >
          <div className="relative">
            {/* Glow Ring - Theme Colors */}
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-full border-2 blur-sm"
              style={{ borderColor: `var(--primary-hex)` }}
            />

            {/* Number Circle - Theme Gradient */}
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center border-4 shadow-xl group-hover:scale-110 transition-transform duration-300"
              style={{
                background: `linear-gradient(135deg, var(--primary-hex), var(--primary-second-hex))`,
                borderColor: "var(--background)",
              }}
            >
              <span className="text-black font-black text-xl">{number}</span>
            </div>
          </div>
        </motion.div>

        {/* Top Arrow Indicator (for cards 2 & 3) - Theme Colors */}
        {index > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.2 + 0.4 }}
            className="hidden lg:flex absolute -left-8 top-8 w-8 h-8 rounded-full items-center justify-center shadow-lg"
            style={{
              background: `linear-gradient(90deg, var(--primary-hex), var(--primary-second-hex))`,
            }}
          >
            <ArrowRight
              className="h-4 w-4 text-black rotate-180"
              strokeWidth={2.5}
            />
          </motion.div>
        )}

        {/* Content Container */}
        <div className="relative z-10 flex-1 flex flex-col items-center w-full">
          {/* Title - Theme Compatible */}
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.2 + 0.2 }}
            className="text-2xl md:text-3xl font-bold mb-4 transition-colors duration-300"
            style={{ color: "var(--foreground)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = `var(--primary-hex)`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--foreground)";
            }}
          >
            {title}
          </motion.h3>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.2 + 0.3 }}
            className="text-muted-foreground text-base md:text-lg leading-relaxed mb-8 max-w-sm"
          >
            {description}
          </motion.p>

          {/* Divider Line - Theme Gradient */}
          <div
            className="w-20 h-1 rounded-full mb-6 opacity-50 group-hover:opacity-100 transition-opacity"
            style={{
              background: `linear-gradient(90deg, transparent, var(--primary-hex), transparent)`,
            }}
          ></div>

          {/* Image Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.2 + 0.4, duration: 0.5 }}
            className="w-full mt-auto relative"
          >
            {/* Image Glow - Theme Colors */}
            <div
              className="absolute inset-0 rounded-t-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
              style={{
                background: `linear-gradient(to top, color-mix(in srgb, var(--primary-hex) 20%, transparent), transparent)`,
              }}
            ></div>

            {/* Image */}
            <img
              src={image}
              alt={imageAlt}
              className="relative w-full h-[200px] md:h-[240px] object-contain group-hover:scale-105 transition-transform duration-500"
            />
          </motion.div>
        </div>

        {/* Bottom Gradient Bar - Theme Colors */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1 opacity-50 group-hover:opacity-100 transition-opacity"
          style={{
            background: `linear-gradient(90deg, var(--primary-hex), var(--primary-second-hex), var(--primary-light-hex))`,
          }}
        ></div>
      </div>
    </div>
  );
}
