import { FloatingDock } from "@/components/ui/floating-dock";
import {
  Home,
  Globe,
  Package,
  ShoppingBag,
  User,
  HeadphonesIcon,
} from "lucide-react";

export function FloatingDockDemo() {
  const links = [
    {
      title: "Home",
      icon: (
        <Home className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "/",
    },
    {
      title: "Destinations",
      icon: (
        <Globe className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "/destinations",
    },
    {
      title: "My eSIMs",
      icon: (
        <Package className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "/my-esims",
    },
    {
      title: "Orders",
      icon: (
        <ShoppingBag className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "/orders",
    },
    {
      title: "Support",
      icon: (
        <HeadphonesIcon className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "/support",
    },
    {
      title: "Account",
      icon: (
        <User className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "/account",
    },
  ];
  
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <FloatingDock items={links} />
    </div>
  );
}
