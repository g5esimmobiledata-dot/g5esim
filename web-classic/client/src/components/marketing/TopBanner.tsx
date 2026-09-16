import { X, Phone, ArrowRight } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface TopBannerProps {
  message?: string;
  ctaText?: string;
  ctaLink?: string;
  phoneNumber?: string;
}

export function TopBanner({
  message = "Get your eSIM in just 2 minutes on your mobile",
  ctaText = "Order Here",
  ctaLink = "/destinations",
  phoneNumber,
}: TopBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-announcement text-foreground"
        data-testid="banner-announcement"
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-2 sm:gap-4 py-2.5 text-sm font-medium relative">
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center">
              <span className="uppercase tracking-wide text-xs sm:text-sm">
                {message}
              </span>

              {phoneNumber && (
                <span className="hidden sm:flex items-center gap-1.5 text-xs sm:text-sm">
                  <Phone className="h-3.5 w-3.5" />
                  {phoneNumber}
                </span>
              )}

              <Button
                size="sm"
                className="bg-foreground/90 text-background h-7 px-3 text-xs font-semibold rounded-full"
                asChild
                data-testid="button-banner-cta"
              >
                <a
                  href={ctaLink}
                  className="flex items-center gap-1"
                  data-testid="link-banner-cta"
                >
                  {ctaText}
                  <ArrowRight className="h-3 w-3" />
                </a>
              </Button>
            </div>

            <button
              onClick={() => setIsVisible(false)}
              className="absolute right-0 p-1 hover:bg-black/10 rounded-full transition-colors"
              aria-label="Close banner"
              data-testid="button-banner-close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
