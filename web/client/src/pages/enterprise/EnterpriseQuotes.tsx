import { useQuery, useMutation } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

export default function EnterpriseQuotes() {
  const { toast } = useToast();

  const { data: quotes, isLoading } = useQuery({
    queryKey: ["/api/enterprise/quotes"],
  });

  const acceptMutation = useMutation({
    mutationFn: (quoteId: string) => apiRequest("POST", `/api/enterprise/quotes/${quoteId}/accept`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enterprise/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enterprise/orders"] });
      toast({
        title: "Quote Accepted",
        description: "Order has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Accept Quote",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Quotes | Enterprise Portal</title>
      </Helmet>

      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Quotes</h1>
            <p className="text-muted-foreground">Review and accept quotes from your account manager</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active Quotes</CardTitle>
            <CardDescription>Quotes sent to your company</CardDescription>
          </CardHeader>
          <CardContent>
            {quotes && quotes.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Package</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total Price</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((quote: any) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">
                        {quote.package?.dataAmount} - {quote.package?.validity}
                      </TableCell>
                      <TableCell>{quote.package?.destination?.name || "N/A"}</TableCell>
                      <TableCell>{quote.quantity} eSIMs</TableCell>
                      <TableCell>${quote.unitPrice}</TableCell>
                      <TableCell className="font-semibold">${quote.totalPrice}</TableCell>
                      <TableCell>{format(new Date(quote.validUntil), "MMM dd, yyyy")}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => acceptMutation.mutate(quote.id)}
                          disabled={acceptMutation.isPending}
                          data-testid={`button-accept-quote-${quote.id}`}
                        >
                          {acceptMutation.isPending ? "Accepting..." : "Accept Quote"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  No active quotes. Contact your account manager to request a quote.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
