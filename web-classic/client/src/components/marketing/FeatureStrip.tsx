import { Headphones, Wifi, Globe, Smartphone, Zap, Shield, Clock } from "lucide-react";

const features = [
  { icon: Headphones, text: "24/7 Customer Service" },
  { icon: Wifi, text: "Hotspot Sharing" },
  { icon: Globe, text: "One eSIM for lifetime" },
  { icon: Smartphone, text: "Instant Activation" },
  { icon: Zap, text: "Data + Voice + SMS" },
];

export function FeatureStrip() {
  return (
    <div className="w-full overflow-hidden bg-gradient-to-r from-primary/5 via-teal-500/5 to-primary/5 py-4 border-y border-border/50">
      <div className="flex animate-marquee whitespace-nowrap">
        {[...features, ...features, ...features].map((feature, index) => (
          <div
            key={index}
            className="flex items-center gap-2 mx-8 text-sm font-medium text-muted-foreground"
          >
            <feature.icon className="h-4 w-4 text-primary" />
            <span>{feature.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface FeatureGridProps {
  className?: string;
}

const gridFeatures = [
  {
    icon: Globe,
    title: "Global Coverage",
    description: "Stay connected in 190+ countries with reliable local networks",
  },
  {
    icon: Zap,
    title: "Instant Activation",
    description: "Get your eSIM in minutes - no waiting, no physical SIM needed",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Your data is protected with enterprise-grade security",
  },
  {
    icon: Clock,
    title: "24/7 Support",
    description: "Our team is always here to help whenever you need us",
  },
];

export function FeatureGrid({ className }: FeatureGridProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className || ""}`}>
      {gridFeatures.map((feature, index) => (
        <div
          key={index}
          className="group p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300"
          data-testid={`feature-card-${index}`}
        >
          <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <feature.icon className="h-6 w-6 text-white" />
          </div>
          <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
          <p className="text-sm text-muted-foreground">{feature.description}</p>
        </div>
      ))}
    </div>
  );
}
