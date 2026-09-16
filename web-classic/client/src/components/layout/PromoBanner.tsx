"use client";

import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);
  return prefersReducedMotion;
}

export function PromoBanner() {
  const [isVisible, setIsVisible] = useState(true);
  const prefersReducedMotion = usePrefersReducedMotion();

  if (!isVisible) return null;

  const promoText = 'Use Coupon Code "SAVE25" during Checkout to Get 25% Off';

  return (
    <div 
      className="bg-primary text-primary-foreground py-2.5 relative z-50 overflow-hidden"
      data-testid="promo-banner"
    >
      <div className="flex items-center">
        <motion.div
          className="flex whitespace-nowrap"
          animate={prefersReducedMotion ? {} : { x: ["0%", "-50%"] }}
          transition={prefersReducedMotion ? {} : {
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 20,
              ease: "linear",
            },
          }}
        >
          {[...Array(8)].map((_, index) => (
            <span 
              key={index} 
              className="mx-8 text-sm font-medium"
            >
              {promoText}
            </span>
          ))}
        </motion.div>
      </div>
      <button
        onClick={() => setIsVisible(false)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        aria-label="Dismiss banner"
        data-testid="button-dismiss-banner"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
