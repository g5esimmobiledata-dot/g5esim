import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Package, Eye, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function EnterpriseOrders() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["/api/enterprise/orders"],
  });

  const { data: orderDetails } = useQuery({
    queryKey: ["/api/enterprise/orders", selectedOrderId, "details"],
    enabled: !!selectedOrderId,
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      processing: "default",
      completed: "default",
      failed: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const handleExport = (orderId: string) => {
    window.open(`/api/enterprise/orders/${orderId}/export`, '_blank');
  };

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
        <title>Orders | Enterprise Portal</title>
      </Helmet>

      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Package className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Orders</h1>
            <p className="text-muted-foreground">Track your bulk eSIM Orders</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bulk Orders</CardTitle>
            <CardDescription>All your enterprise Orders</CardDescription>
          </CardHeader>
          <CardContent>
            {orders && orders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell>{format(new Date(order.createdAt), "MMM dd, yyyy")}</TableCell>
                      <TableCell>
                        {order.quote?.package?.dataAmount} - {order.quote?.package?.validity}
                      </TableCell>
                      <TableCell className="font-semibold">${order.totalAmount}</TableCell>
                      <TableCell>{order.paymentMethod || "Credit"}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedOrderId(order.id)}
                            data-testid={`button-view-order-${order.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          {order.status === "completed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleExport(order.id)}
                              data-testid={`button-export-order-${order.id}`}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Export
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No Orders yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedOrderId} onOpenChange={() => setSelectedOrderId(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>Individual eSIM provisioning status</DialogDescription>
          </DialogHeader>

          {orderDetails ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Total eSIMs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{orderDetails.individualOrderCount}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Completed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{orderDetails.completedCount}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Processing</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-teal-600">{orderDetails.processingCount}</div>
                  </CardContent>
                </Card>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ICCID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Validity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderDetails.individualOrders?.slice(0, 20).map((esim: any) => (
                    <TableRow key={esim.id}>
                      <TableCell className="font-mono text-xs">{esim.iccid || "Pending"}</TableCell>
                      <TableCell>{getStatusBadge(esim.status)}</TableCell>
                      <TableCell>{esim.dataAmount}</TableCell>
                      <TableCell>{esim.validity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {orderDetails.individualOrders?.length > 20 && (
                <p className="text-sm text-muted-foreground text-center">
                  Showing first 20 of {orderDetails.individualOrders.length} eSIMs
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Skeleton className="h-24" />
              <Skeleton className="h-48" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
