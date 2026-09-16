import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { 
  User, 
  Package, 
  Shield, 
  FileText, 
  HelpCircle, 
  Headphones,
  LogOut,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UserData {
  id: string;
  email: string;
  name?: string;
  imagePath?: string;
  role?: string;
}

export function UserDropdown() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const { data: user, isLoading } = useQuery<UserData>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to sign out",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
    );
  }

  if (!user) {
    return (
      <Link href="/login">
        <Button variant="default" size="sm" data-testid="button-login">
          Sign In
        </Button>
      </Link>
    );
  }

  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email.slice(0, 2).toUpperCase();

  const menuItems = [
    { icon: User, label: "Account Information", href: "/account" },
    { icon: Package, label: "Orders History", href: "/account/orders" },
    { icon: Shield, label: "Privacy Policy", href: "/privacy" },
    { icon: FileText, label: "Terms & Conditions", href: "/terms" },
    { icon: HelpCircle, label: "FAQ", href: "/faq" },
    { icon: Headphones, label: "Customer Support", href: "/support" },
  ];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="flex items-center gap-2 px-2"
          data-testid="button-user-dropdown"
        >
          <Avatar className="h-8 w-8">
            {user.imagePath && <AvatarImage src={user.imagePath} alt={user.name || user.email} />}
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user.name || "User"}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            {user.role === "reseller" && (
              <p className="text-xs font-medium text-primary">Account Type: WhiteLabel</p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {user.role === "reseller" && (
          <>
            <DropdownMenuItem asChild data-testid="dropdown-switch-to-reseller-mode">
              <Link href="/reseller/dashboard">
                <div className="flex w-full cursor-pointer items-center gap-3 rounded-md text-primary">
                  <ArrowRightLeft className="h-4 w-4" />
                  <span className="font-medium">Switch to Reseller Mode</span>
                </div>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem 
              key={item.href} 
              asChild
              data-testid={`dropdown-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Link href={item.href}>
                <div className="flex items-center gap-3 w-full cursor-pointer">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span>{item.label}</span>
                </div>
              </Link>
            </DropdownMenuItem>
          );
        })}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive cursor-pointer"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          data-testid="dropdown-sign-out"
        >
          <LogOut className="h-4 w-4 mr-3" />
          <span>{logoutMutation.isPending ? "Signing out..." : "Sign Out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
