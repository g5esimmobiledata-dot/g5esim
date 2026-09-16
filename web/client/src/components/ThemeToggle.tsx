import { Check, Contrast, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// import { useTheme } from "./ThemeProvider";

type ThemeToggleProps = {
  className?: string;
  iconClassName?: string;
};

export function ThemeToggle({ className, iconClassName }: ThemeToggleProps = {}) {
  const { theme, toggleTheme, isAdminRoute, adminTheme, setAdminTheme } = useTheme();

  if (isAdminRoute) {
    const adminModes = [
      { value: "light" as const, label: "Full Light Mode", icon: Sun },
      { value: "half-dark" as const, label: "Half Dark Mode", icon: Contrast },
      { value: "dark" as const, label: "Full Dark Mode", icon: Moon },
    ];
    const activeMode = adminModes.find((mode) => mode.value === adminTheme) || adminModes[1];
    const ActiveIcon = activeMode.icon;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            data-testid="button-theme-toggle"
            className={cn("rounded-full", className)}
            aria-label="Select admin theme mode"
            title={activeMode.label}
          >
            <ActiveIcon className={cn("h-5 w-5 text-foreground", iconClassName)} />
            <span className="sr-only">{activeMode.label}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {adminModes.map((mode) => {
            const Icon = mode.icon;
            const isActive = mode.value === adminTheme;
            return (
              <DropdownMenuItem
                key={mode.value}
                onClick={() => setAdminTheme(mode.value)}
                className="cursor-pointer"
                data-testid={`theme-mode-${mode.value}`}
              >
                <Icon className="h-4 w-4" />
                <span>{mode.label}</span>
                {isActive && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      data-testid="button-theme-toggle"
      className={cn("rounded-full", className)}
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      {theme === "light" ? (
        <Moon className={cn("h-5 w-5 text-foreground", iconClassName)} />
      ) : (
        <Sun className={cn("h-5 w-5 text-foreground", iconClassName)} />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
