import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Building2, LayoutDashboard, FileText, Package, Smartphone, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";

interface EnterpriseLayoutProps {
  children: React.ReactNode;
}

export default function EnterpriseLayout({ children }: EnterpriseLayoutProps) {
  const [location, navigate] = useLocation();
  const { toast } = useToast();

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/enterprise/me"],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <div className="w-64 border-r bg-muted/30">
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="flex-1">
          <Skeleton className="h-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    navigate("/enterprise/login");
    return null;
  }

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/enterprise/logout", {});
      queryClient.clear();
      toast({
        title: "Logged Out",
        description: "You have been logged out successfully.",
      });
      navigate("/enterprise/login");
    } catch (error: any) {
      toast({
        title: "Logout Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const navItems = [
    { path: "/enterprise/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/enterprise/quotes", label: "Quotes", icon: FileText },
    { path: "/enterprise/orders", label: "Orders", icon: Package },
    { path: "/enterprise/esims", label: "eSIMs", icon: Smartphone },
  ];

  return (
    <div className="flex h-screen">
      <div className="w-64 border-r bg-muted/30 flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="h-6 w-6 text-primary" />
            <div>
              <h2 className="font-semibold text-sm">{user.enterpriseAccount?.companyName}</h2>
              <p className="text-xs text-muted-foreground">Enterprise Portal</p>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = location === item.path;
              const Icon = item.icon;

              return (
                <Link key={item.path} href={item.path}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    data-testid={`nav-${item.label.toLowerCase()}`}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t">
          <Card className="p-3 mb-3">
            <p className="text-xs text-muted-foreground mb-1">Logged in as</p>
            <p className="text-sm font-medium truncate">{user.email}</p>
            <p className="text-xs text-muted-foreground capitalize mt-1">{user.role}</p>
          </Card>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
