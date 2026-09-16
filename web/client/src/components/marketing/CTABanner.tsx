import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useAuthDialog } from "@/contexts/AuthDialogContext";
import { useUser } from "@/hooks/use-user";
import { Link } from "wouter";

interface CTABannerProps {
  title?: string;
  subtitle?: string;
  buttonText?: string;
  variant?: "primary" | "accent";
}

export function CTABanner({
  title = "Ready to stay connected worldwide?",
  subtitle = "Join 500,000+ happy travelers using eSIM Connect",
  buttonText = "Get Started Now",
  variant = "primary",
}: CTABannerProps) {
  const { isAuthenticated } = useUser();
  const { openSignUp } = useAuthDialog();

  return (
    <section 
      className={`py-16 md:py-24 ${variant === "primary" ? "gradient-hero" : "gradient-accent"}`}
      data-testid="cta-banner"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
          {title}
        </h2>
        <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
          {subtitle}
        </p>
        {isAuthenticated ? (
          <Link href="/destinations">
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-white/90 font-semibold px-8 group"
              data-testid="button-cta-browse"
            >
              Browse Destinations
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        ) : (
          <Button
            size="lg"
            onClick={openSignUp}
            className="bg-white text-primary hover:bg-white/90 font-semibold px-8 group"
            data-testid="button-cta-signup"
          >
            {buttonText}
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        )}
      </div>
    </section>
  );
}
