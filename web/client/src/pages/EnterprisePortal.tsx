import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Building2, CreditCard, FileText, Package, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/contexts/TranslationContext";
import { format } from "date-fns";

export default function EnterprisePortal() {
  const { toast } = useToast();
  const { t } = useTranslation();

  const { data: account, isLoading: accountLoading } = useQuery({
    queryKey: ["/api/enterprise/my-account"],
  });

  const { data: quotes, isLoading: quotesLoading } = useQuery({
    queryKey: ["/api/enterprise/quotes"],
    enabled: !!account,
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/enterprise/orders"],
    enabled: !!account,
  });

  const handleAcceptQuote = async (quoteId: string) => {
    try {
      await apiRequest("POST", `/api/enterprise/quotes/${quoteId}/accept`, {
        paymentMethod: "invoice",
      });
      
      toast({
        title: "Quote Accepted",
        description: "Your quote has been converted to an order successfully.",
      });
      
    } catch (error: any) {
      toast({
        title: "Failed to Accept Quote",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  if (accountLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-64 mb-8" />
        <div className="grid md:grid-cols-3 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have an enterprise account yet. Please apply for one first.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      approved: "default",
      suspended: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <>
      <Helmet>
        <title>Enterprise Portal | eSIM Global</title>
        <meta name="description" content="Manage your enterprise account, quotes, and bulk Orders" />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Building2 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">{account.companyName}</h1>
            <p className="text-muted-foreground">Enterprise Portal</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Account Status
                {getStatusBadge(account.status)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contact:</span>
                  <span>{account.contactName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span>{account.email}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Credit Info
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Credit Limit:</span>
                  <span className="font-semibold">${account.creditLimit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Balance:</span>
                  <span className="font-semibold">${account.currentBalance}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Discount Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {account.discountPercent}%
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Applied to all bulk Orders
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Active Quotes
            </CardTitle>
            <CardDescription>View and accept quotes from your account manager</CardDescription>
          </CardHeader>
          <CardContent>
            {quotesLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : quotes && quotes.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Package</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((quote: any) => (
                    <TableRow key={quote.id}>
                      <TableCell>{quote.package?.title || "N/A"}</TableCell>
                      <TableCell>{quote.quantity}</TableCell>
                      <TableCell>${quote.unitPrice}</TableCell>
                      <TableCell>{quote.discountPercent}%</TableCell>
                      <TableCell className="font-semibold">${quote.totalPrice}</TableCell>
                      <TableCell>{format(new Date(quote.validUntil), "MMM dd, yyyy")}</TableCell>
                      <TableCell>{getStatusBadge(quote.status)}</TableCell>
                      <TableCell>
                        {quote.status === "approved" && (
                          <Button
                            size="sm"
                            onClick={() => handleAcceptQuote(quote.id)}
                            data-testid={`button-accept-quote-${quote.id}`}
                          >
                            Accept
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No active quotes. Contact your account manager to request a quote.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order History</CardTitle>
            <CardDescription>View all your bulk Orders</CardDescription>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : orders && orders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Quote ID</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Order Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell>{format(new Date(order.createdAt), "MMM dd, yyyy")}</TableCell>
                      <TableCell className="font-mono text-sm">{order.quoteId?.slice(0, 8)}...</TableCell>
                      <TableCell className="font-semibold">${order.totalAmount}</TableCell>
                      <TableCell>{order.paymentMethod || "N/A"}</TableCell>
                      <TableCell>{getStatusBadge(order.paymentStatus)}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-8">No Orders yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
