import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Smartphone, Send, Download, Plus, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDisplayValue } from "@/lib/displayText";

export default function EnterpriseESIMs() {
  const { toast } = useToast();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [employeeEmails, setEmployeeEmails] = useState<string[]>([""]);
  const [isDistributeDialogOpen, setIsDistributeDialogOpen] = useState(false);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["/api/enterprise/orders"],
  });

  const completedOrders = orders?.filter((o: any) => o.status === "completed") || [];

  const distributeMutation = useMutation({
    mutationFn: ({ orderId, emails }: { orderId: string; emails: string[] }) =>
      apiRequest("POST", `/api/enterprise/orders/${orderId}/distribute`, { employeeEmails: emails }),
    onSuccess: (data: any) => {
      toast({
        title: "Distribution Completed",
        description: `${data.totalSent} eSIMs sent successfully, ${data.totalFailed} failed.`,
      });
      setIsDistributeDialogOpen(false);
      setEmployeeEmails([""]);
    },
    onError: (error: any) => {
      toast({
        title: "Distribution Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAddEmail = () => {
    setEmployeeEmails([...employeeEmails, ""]);
  };

  const handleRemoveEmail = (index: number) => {
    setEmployeeEmails(employeeEmails.filter((_, i) => i !== index));
  };

  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...employeeEmails];
    newEmails[index] = value;
    setEmployeeEmails(newEmails);
  };

  const handleDistribute = () => {
    if (!selectedOrderId) return;
    const validEmails = employeeEmails.filter(email => email.trim() && email.includes("@"));
    if (validEmails.length === 0) {
      toast({
        title: "No Valid Emails",
        description: "Please enter at least one valid email address.",
        variant: "destructive",
      });
      return;
    }
    distributeMutation.mutate({ orderId: selectedOrderId, emails: validEmails });
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
        <title>eSIMs | Enterprise Portal</title>
      </Helmet>

      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Smartphone className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">eSIM Distribution</h1>
            <p className="text-muted-foreground">Distribute eSIMs to your employees</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Completed Orders</CardTitle>
            <CardDescription>Orders Ready for distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {completedOrders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedOrders.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}...</TableCell>
                      <TableCell>
                        {order.quote?.package?.dataAmount} - {order.quote?.package?.validity}
                      </TableCell>
                      <TableCell>{order.quote?.quantity || 0} eSIMs</TableCell>
                      <TableCell>
                        <Badge>{formatDisplayValue(order.status)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog open={isDistributeDialogOpen && selectedOrderId === order.id} onOpenChange={(open) => {
                            setIsDistributeDialogOpen(open);
                            if (open) setSelectedOrderId(order.id);
                            else {
                              setSelectedOrderId(null);
                              setEmployeeEmails([""]);
                            }
                          }}>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="default"
                                data-testid={`button-distribute-${order.id}`}
                              >
                                <Send className="h-4 w-4 mr-1" />
                                Distribute
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg">
                              <DialogHeader>
                                <DialogTitle>Distribute eSIMs to Employees</DialogTitle>
                                <DialogDescription>
                                  Enter employee email addresses to send eSIM activation details
                                </DialogDescription>
                              </DialogHeader>

                              <div className="space-y-4">
                                <div className="space-y-2">
                                  {employeeEmails.map((email, index) => (
                                    <div key={index} className="flex gap-2">
                                      <Input
                                        type="email"
                                        placeholder="employee@company.com"
                                        value={email}
                                        onChange={(e) => handleEmailChange(index, e.target.value)}
                                        data-testid={`input-employee-email-${index}`}
                                      />
                                      {employeeEmails.length > 1 && (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="icon"
                                          onClick={() => handleRemoveEmail(index)}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                </div>

                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={handleAddEmail}
                                  className="w-full"
                                  data-testid="button-add-email"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Another Email
                                </Button>

                                <div className="flex gap-2">
                                  <Button
                                    onClick={handleDistribute}
                                    disabled={distributeMutation.isPending}
                                    className="flex-1"
                                    data-testid="button-send-emails"
                                  >
                                    <Send className="h-4 w-4 mr-2" />
                                    {distributeMutation.isPending ? "Sending..." : "Send Emails"}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleExport(order.id)}
                            data-testid={`button-export-csv-${order.id}`}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Export CSV
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Smartphone className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  No completed Orders yet. Accept quotes to create Orders.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
