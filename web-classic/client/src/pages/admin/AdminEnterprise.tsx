import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import {
  Building2,
  Plus,
  Check,
  X,
  Edit,
  Trash,
  BarChart,
  PlayCircle,
  Eye,
  Send,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { EnterpriseAccount, BulkQuote, BulkOrder } from '@shared/schema';

export default function AdminEnterprise() {
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [createAccountDialogOpen, setCreateAccountDialogOpen] = useState(false);
  const [orderDetailsDialogOpen, setOrderDetailsDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [accountForm, setAccountForm] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    billingAddress: '',
    taxId: '',
    creditLimit: '10000',
    discountPercent: '0',
  });
  const [editForm, setEditForm] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    billingAddress: '',
    taxId: '',
    creditLimit: '',
    discountPercent: '',
    status: 'approved',
  });
  const [quoteForm, setQuoteForm] = useState({
    enterpriseAccountId: '',
    destinationId: '',
    packageId: '',
    quantity: '1',
    unitPrice: '',
    discountPercent: '0',
    totalPrice: '',
    validUntil: '',
    notes: '',
  });

  const { data: accounts, isLoading: accountsLoading } = useQuery<EnterpriseAccount[]>({
    queryKey: ['/api/admin/enterprise/accounts'],
  });

  const { data: quotes, isLoading: quotesLoading } = useQuery<BulkQuote[]>({
    queryKey: ['/api/admin/enterprise/quotes'],
  });

  const { data: orders, isLoading: ordersLoading } = useQuery<BulkOrder[]>({
    queryKey: ['/api/admin/enterprise/orders'],
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/admin/enterprise/analytics'],
  });

  const { data: destinations } = useQuery({
    queryKey: ['/api/destinations'],
  });

  const { data: packages } = useQuery({
    queryKey: ['/api/admin/unified-packages', 'destination', quoteForm.destinationId || 'all'],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (quoteForm.destinationId) {
        params.append('destination', quoteForm.destinationId);
      }
      params.append('limit', '1000');
      const response = await fetch(`/api/admin/unified-packages?${params.toString()}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to fetch Packages');
      const result = await response.json();
      return result.data || [];
    },
    enabled: Boolean(quoteForm.destinationId),
  });

  const approveMutation = useMutation({
    mutationFn: (accountId: string) =>
      apiRequest('POST', `/api/admin/enterprise/accounts/${accountId}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/enterprise/accounts'] });
      toast({ title: 'Account Approved', description: 'Enterprise Account Approved successfully' });
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest('PUT', `/api/admin/enterprise/accounts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/enterprise/accounts'] });
      setEditDialogOpen(false);
      toast({ title: 'Account Updated', description: 'Enterprise account updated successfully' });
    },
  });

  const createQuoteMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/admin/enterprise/quotes', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/enterprise/quotes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/unified-packages'] });
      setQuoteDialogOpen(false);
      setQuoteForm({
        enterpriseAccountId: '',
        destinationId: '',
        packageId: '',
        quantity: '1',
        unitPrice: '',
        discountPercent: '0',
        totalPrice: '',
        validUntil: '',
        notes: '',
      });
      toast({ title: 'Quote Created', description: 'Bulk quote created successfully' });
    },
  });

  const deleteQuoteMutation = useMutation({
    mutationFn: (quoteId: string) =>
      apiRequest('DELETE', `/api/admin/enterprise/quotes/${quoteId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/enterprise/quotes'] });
      toast({ title: 'Quote Deleted', description: 'Quote deleted successfully' });
    },
  });

  const sendQuoteMutation = useMutation({
    mutationFn: (quoteId: string) =>
      apiRequest('POST', `/api/admin/enterprise/quotes/${quoteId}/send`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/enterprise/quotes'] });
      toast({ title: 'Quote Sent', description: 'Quote sent to customer successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Send Quote',
        description: error.message || 'Failed to send quote email. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const createAccountMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/admin/enterprise/accounts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/enterprise/accounts'] });
      setCreateAccountDialogOpen(false);
      setAccountForm({
        companyName: '',
        contactName: '',
        email: '',
        phone: '',
        billingAddress: '',
        taxId: '',
        creditLimit: '10000',
        discountPercent: '0',
      });
      toast({ title: 'Account Created', description: 'Enterprise account created successfully' });
    },
  });

  const createOrderFromQuoteMutation = useMutation({
    mutationFn: (quoteId: string) =>
      apiRequest('POST', '/api/admin/enterprise/orders', { quoteId, paymentMethod: 'credit' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/enterprise/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/enterprise/quotes'] });
      toast({ title: 'Order Created', description: 'Bulk order created successfully' });
    },
  });

  const executeOrderMutation = useMutation({
    mutationFn: (orderId: string) =>
      apiRequest('POST', `/api/admin/enterprise/orders/${orderId}/execute`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/enterprise/orders'] });
      if (selectedOrderId) {
        queryClient.invalidateQueries({
          queryKey: ['/api/admin/enterprise/orders', selectedOrderId, 'details'],
        });
      }
      toast({
        title: 'Order Executed',
        description: 'eSIMs are being provisioned via provider APIs',
      });
    },
    onError: (error: any) => {
      toast({ title: 'Execution Failed', description: error.message, variant: 'destructive' });
    },
  });

  const { data: orderDetails, isLoading: orderDetailsLoading } = useQuery({
    queryKey: ['/api/admin/enterprise/orders', selectedOrderId, 'details'],
    enabled: !!selectedOrderId && orderDetailsDialogOpen,
  });

  const handleEditAccount = (account: EnterpriseAccount) => {
    setSelectedAccount(account);
    setEditForm({
      companyName: account.companyName,
      contactName: account.contactName,
      email: account.email,
      phone: account.phone ?? '',
      billingAddress: account.billingAddress ?? '',
      taxId: account.taxId ?? '',
      creditLimit: account.creditLimit ?? '',
      discountPercent: account.discountPercent ?? '',
      status: account.status,
    });
    setEditDialogOpen(true);
  };

  const handleUpdateAccount = () => {
    if (!selectedAccount) return;

    updateAccountMutation.mutate({
      id: selectedAccount.id,
      data: {
        companyName: editForm.companyName,
        contactName: editForm.contactName,
        email: editForm.email,
        phone: editForm.phone,
        billingAddress: editForm.billingAddress,
        taxId: editForm.taxId,
        creditLimit: editForm.creditLimit,
        discountPercent: editForm.discountPercent,
        status: editForm.status,
      },
    });
  };

  const handleDestinationChange = (value: string) => {
    setQuoteForm({
      ...quoteForm,
      destinationId: value,
      packageId: '',
      unitPrice: '',
    });
  };

  const handlePackageChange = (value: string) => {
    const selectedPackage = packages?.find((pkg: any) => pkg.id === value);
    setQuoteForm({
      ...quoteForm,
      packageId: value,
      unitPrice: selectedPackage?.wholesalePrice || '',
    });
  };

  const calculateMargin = () => {
    if (!quoteForm.unitPrice) return 0;
    const selectedPackage = packages?.find((pkg: any) => pkg.id === quoteForm.packageId);
    if (!selectedPackage) return 0;
    const wholesale = parseFloat(selectedPackage.wholesalePrice);
    const retail = parseFloat(quoteForm.unitPrice);
    const quantity = parseInt(quoteForm.quantity) || 1;
    return (retail - wholesale) * quantity;
  };

  const handleCreateQuote = () => {
    // Validate required fields
    if (
      !quoteForm.enterpriseAccountId ||
      !quoteForm.destinationId ||
      !quoteForm.packageId ||
      !quoteForm.quantity ||
      !quoteForm.unitPrice ||
      !quoteForm.validUntil
    ) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    const totalPrice =
      (parseFloat(quoteForm.unitPrice) *
        parseInt(quoteForm.quantity) *
        (100 - parseFloat(quoteForm.discountPercent || '0'))) /
      100;

    // Create payload with exact types expected by backend schema
    const payload = {
      enterpriseAccountId: quoteForm.enterpriseAccountId,
      packageId: quoteForm.packageId,
      quantity: parseInt(quoteForm.quantity, 10),
      unitPrice: parseFloat(quoteForm.unitPrice).toFixed(2), // Decimal as string with 2 decimals
      discountPercent: parseFloat(quoteForm.discountPercent || '0').toFixed(2), // Decimal as string with 2 decimals
      totalPrice: totalPrice.toFixed(2), // Decimal as string with 2 decimals
      validUntil: `${quoteForm.validUntil}T23:59:59.999Z`, // Convert YYYY-MM-DD to ISO string at end of day
      notes: quoteForm.notes || '',
    };

    createQuoteMutation.mutate(payload);
  };

  const handleCreateAccount = () => {
    createAccountMutation.mutate({
      ...accountForm,
      status: 'approved',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      approved: 'default',
      suspended: 'destructive',
      completed: 'default',
      paid: 'default',
      overdue: 'destructive',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  return (
    <>
      <Helmet>
        <title>Enterprise Management | Admin Dashboard</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 text-foreground">
            <Building2 className="h-8 w-8" />
            Enterprise Management
          </h1>
          <p className="text-muted-foreground">
            Manage enterprise Accounts, bulk quotes, and Orders
          </p>
        </div>

        <Tabs defaultValue="accounts" className="space-y-6">
          <TabsList>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="quotes">Quotes</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="accounts" className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() => setCreateAccountDialogOpen(true)}
                data-testid="button-create-account"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Enterprise Account
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Enterprise Accounts</CardTitle>
                <CardDescription>
                  Manage and approve enterprise account applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Credit Limit</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts?.map((account: any) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">{account.companyName}</TableCell>
                        <TableCell>{account.contactName}</TableCell>
                        <TableCell>{account.email}</TableCell>
                        <TableCell>{getStatusBadge(account.status)}</TableCell>
                        <TableCell>${account.creditLimit}</TableCell>
                        <TableCell>{account.discountPercent}%</TableCell>
                        <TableCell>{format(new Date(account.createdAt), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {account.status === 'pending' && (
                              <Button
                                size="sm"
                                onClick={() => approveMutation.mutate(account.id)}
                                data-testid={`button-approve-${account.id}`}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditAccount(account)}
                              data-testid={`button-edit-${account.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quotes" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setQuoteDialogOpen(true)} data-testid="button-create-quote">
                <Plus className="mr-2 h-4 w-4" />
                Create Quote
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Bulk Quotes</CardTitle>
                <CardDescription>Manage quotes for enterprise Customers</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead>Package</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Valid Until</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotes?.map((quote: any) => (
                      <TableRow key={quote.id}>
                        <TableCell>{quote.enterpriseAccount?.companyName || 'N/A'}</TableCell>
                        <TableCell>{quote.package?.title || 'N/A'}</TableCell>
                        <TableCell>{quote.quantity}</TableCell>
                        <TableCell>${quote.unitPrice}</TableCell>
                        <TableCell>{quote.discountPercent}%</TableCell>
                        <TableCell className="font-semibold">${quote.totalPrice}</TableCell>
                        <TableCell>{format(new Date(quote.validUntil), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{getStatusBadge(quote.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {quote.status === 'pending' && (
                              <Button
                                size="sm"
                                onClick={() => sendQuoteMutation.mutate(quote.id)}
                                disabled={sendQuoteMutation.isPending}
                                data-testid={`button-send-quote-${quote.id}`}
                              >
                                <Send className="h-4 w-4 mr-1" />
                                Send to Customer
                              </Button>
                            )}
                            {quote.status === 'approved' && (
                              <Button
                                size="sm"
                                onClick={() => createOrderFromQuoteMutation.mutate(quote.id)}
                                disabled={createOrderFromQuoteMutation.isPending}
                                data-testid={`button-create-order-${quote.id}`}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Create Order
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteQuoteMutation.mutate(quote.id)}
                              data-testid={`button-delete-quote-${quote.id}`}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Orders</CardTitle>
                <CardDescription>View all enterprise bulk Orders</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead>Order Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders?.map((order: any) => (
                      <TableRow key={order.id}>
                        <TableCell>{format(new Date(order.createdAt), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{order.enterpriseAccount?.companyName || 'N/A'}</TableCell>
                        <TableCell className="font-semibold">${order.totalAmount}</TableCell>
                        <TableCell>{order.paymentMethod || 'N/A'}</TableCell>
                        <TableCell>{getStatusBadge(order.paymentStatus)}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedOrderId(order.id);
                                setOrderDetailsDialogOpen(true);
                              }}
                              data-testid={`button-view-details-${order.id}`}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                            {order.status === 'pending' && (
                              <Button
                                size="sm"
                                onClick={() => executeOrderMutation.mutate(order.id)}
                                disabled={executeOrderMutation.isPending}
                                data-testid={`button-execute-${order.id}`}
                              >
                                <PlayCircle className="h-4 w-4 mr-1" />
                                Execute
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Total Accounts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{analytics?.totalAccounts || 0}</div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {analytics?.approvedAccounts || 0} Approved
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Total Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">${analytics?.totalRevenue || '0.00'}</div>
                  <p className="text-sm text-muted-foreground mt-2">From enterprise Orders</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Active Quotes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {quotes?.filter((q: any) => q.status === 'approved').length || 0}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">Awaiting acceptance</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Top Enterprise Accounts</CardTitle>
                <CardDescription>By total spending</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Total Orders</TableHead>
                      <TableHead>Total Spent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics?.topAccounts?.map((account: any) => (
                      <TableRow key={account.accountId}>
                        <TableCell className="font-medium">{account.companyName}</TableCell>
                        <TableCell>{account.totalOrders}</TableCell>
                        <TableCell className="font-semibold">${account.totalSpent}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* <Dialog open={quoteDialogOpen} onOpenChange={setQuoteDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Bulk Quote</DialogTitle>
            <DialogDescription>Generate a quote for an enterprise customer</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Enterprise Account</Label>
              <Select
                value={quoteForm.enterpriseAccountId}
                onValueChange={(value) =>
                  setQuoteForm({ ...quoteForm, enterpriseAccountId: value })
                }
              >
                <SelectTrigger data-testid="select-enterprise-account">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    ?.filter((a: any) => a.status === 'approved')
                    .map((account: any) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.companyName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Destination / Country *</Label>
              <Select value={quoteForm.destinationId} onValueChange={handleDestinationChange}>
                <SelectTrigger data-testid="select-destination">
                  <SelectValue placeholder="Select destination first" />
                </SelectTrigger>
                <SelectContent>
                  {destinations?.map((dest: any) => (
                    <SelectItem key={dest.id} value={dest.id}>
                      {dest.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Package *</Label>
                <Select
                  value={quoteForm.packageId}
                  onValueChange={handlePackageChange}
                  disabled={!quoteForm.destinationId}
                >
                  <SelectTrigger data-testid="select-package">
                    <SelectValue
                      placeholder={
                        quoteForm.destinationId ? 'Select package' : 'Select destination first'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {packages?.map((pkg: any) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{pkg.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {pkg.provider?.name} • {pkg.dataAmount} • {pkg.validity} days • Admin
                            Cost: ${pkg.wholesalePrice}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={quoteForm.quantity}
                  onChange={(e) => setQuoteForm({ ...quoteForm, quantity: e.target.value })}
                  data-testid="input-quantity"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unit Price (Auto-filled from Admin Cost)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={quoteForm.unitPrice}
                  onChange={(e) => setQuoteForm({ ...quoteForm, unitPrice: e.target.value })}
                  data-testid="input-unit-price"
                />
                {quoteForm.packageId && quoteForm.unitPrice && (
                  <p className="text-sm text-muted-foreground">
                    Margin: ${calculateMargin().toFixed(2)} (
                    {calculateMargin() >= 0 ? 'profit' : 'loss'})
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Discount %</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={quoteForm.discountPercent}
                  onChange={(e) => setQuoteForm({ ...quoteForm, discountPercent: e.target.value })}
                  data-testid="input-discount"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Valid Until</Label>
              <Input
                type="date"
                value={quoteForm.validUntil}
                onChange={(e) => setQuoteForm({ ...quoteForm, validUntil: e.target.value })}
                data-testid="input-valid-until"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={quoteForm.notes}
                onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                data-testid="input-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateQuote} data-testid="button-create-quote-submit">
              Create Quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog> */}

      <Dialog open={quoteDialogOpen} onOpenChange={setQuoteDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Create Bulk Quote</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Generate a quote for an enterprise customer
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm sm:text-base">Enterprise Account</Label>
              <Select
                value={quoteForm.enterpriseAccountId}
                onValueChange={(value) =>
                  setQuoteForm({ ...quoteForm, enterpriseAccountId: value })
                }
              >
                <SelectTrigger
                  data-testid="select-enterprise-account"
                  className="text-sm sm:text-base"
                >
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    ?.filter((a: any) => a.status === 'approved')
                    .map((account: any) => (
                      <SelectItem
                        key={account.id}
                        value={account.id}
                        className="text-sm sm:text-base"
                      >
                        {account.companyName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm sm:text-base">Destination / Country *</Label>
              <Select value={quoteForm.destinationId} onValueChange={handleDestinationChange}>
                <SelectTrigger data-testid="select-destination" className="text-sm sm:text-base">
                  <SelectValue placeholder="Select destination first" />
                </SelectTrigger>
                <SelectContent>
                  {destinations?.map((dest: any) => (
                    <SelectItem key={dest.id} value={dest.id} className="text-sm sm:text-base">
                      {dest.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm sm:text-base">Package *</Label>
                <Select
                  value={quoteForm.packageId}
                  onValueChange={handlePackageChange}
                  disabled={!quoteForm.destinationId}
                >
                  <SelectTrigger data-testid="select-package" className="text-sm sm:text-base">
                    <SelectValue
                      placeholder={
                        quoteForm.destinationId ? 'Select package' : 'Select destination first'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 sm:max-h-96">
                    {packages?.map((pkg: any) => (
                      <SelectItem key={pkg.id} value={pkg.id} className="text-sm sm:text-base">
                        <div className="flex flex-col">
                          <span className="font-medium">{pkg.title}</span>
                          <span className="text-xs sm:text-sm text-muted-foreground truncate">
                            {pkg.provider?.name} • {pkg.dataAmount} • {pkg.validity} days • Admin
                            Cost: ${pkg.wholesalePrice}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm sm:text-base">Quantity</Label>
                <Input
                  type="number"
                  value={quoteForm.quantity}
                  onChange={(e) => setQuoteForm({ ...quoteForm, quantity: e.target.value })}
                  data-testid="input-quantity"
                  className="text-sm sm:text-base"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm sm:text-base">
                  Unit Price (Auto-filled from Admin Cost)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={quoteForm.unitPrice}
                  onChange={(e) => setQuoteForm({ ...quoteForm, unitPrice: e.target.value })}
                  data-testid="input-unit-price"
                  className="text-sm sm:text-base"
                />
                {quoteForm.packageId && quoteForm.unitPrice && (
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Margin: ${calculateMargin().toFixed(2)} (
                    {calculateMargin() >= 0 ? 'profit' : 'loss'})
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm sm:text-base">Discount %</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={quoteForm.discountPercent}
                  onChange={(e) => setQuoteForm({ ...quoteForm, discountPercent: e.target.value })}
                  data-testid="input-discount"
                  className="text-sm sm:text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm sm:text-base">Valid Until</Label>
              <Input
                type="date"
                value={quoteForm.validUntil}
                onChange={(e) => setQuoteForm({ ...quoteForm, validUntil: e.target.value })}
                data-testid="input-valid-until"
                className="text-sm sm:text-base"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm sm:text-base">Notes</Label>
              <Textarea
                value={quoteForm.notes}
                onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                data-testid="input-notes"
                className="min-h-[80px] text-sm sm:text-base"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => setQuoteDialogOpen(false)}
              className="w-full sm:w-auto mt-2 sm:mt-0 text-sm sm:text-base"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateQuote}
              data-testid="button-create-quote-submit"
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              Create Quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createAccountDialogOpen} onOpenChange={setCreateAccountDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto mx-2">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Create Enterprise Account</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Add a new enterprise customer account
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm sm:text-base">Company Name *</Label>
                <Input
                  value={accountForm.companyName}
                  onChange={(e) => setAccountForm({ ...accountForm, companyName: e.target.value })}
                  data-testid="input-company-name"
                  placeholder="Acme Corporation"
                  className="text-sm sm:text-base"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm sm:text-base">Contact Name *</Label>
                <Input
                  value={accountForm.contactName}
                  onChange={(e) => setAccountForm({ ...accountForm, contactName: e.target.value })}
                  data-testid="input-contact-name"
                  placeholder="John Doe"
                  className="text-sm sm:text-base"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm sm:text-base">Email *</Label>
                <Input
                  type="email"
                  value={accountForm.email}
                  onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                  data-testid="input-email"
                  placeholder="contact@acme.com"
                  className="text-sm sm:text-base"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm sm:text-base">Phone</Label>
                <Input
                  type="tel"
                  value={accountForm.phone}
                  onChange={(e) => setAccountForm({ ...accountForm, phone: e.target.value })}
                  data-testid="input-phone"
                  placeholder="+1 234 567 8900"
                  className="text-sm sm:text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm sm:text-base">Billing Address</Label>
              <Textarea
                value={accountForm.billingAddress}
                onChange={(e) => setAccountForm({ ...accountForm, billingAddress: e.target.value })}
                data-testid="input-billing-address"
                placeholder="123 Main Street, Suite 100, City, State, ZIP"
                className="min-h-[80px] text-sm sm:text-base"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm sm:text-base">Tax ID</Label>
                <Input
                  value={accountForm.taxId}
                  onChange={(e) => setAccountForm({ ...accountForm, taxId: e.target.value })}
                  data-testid="input-tax-id"
                  placeholder="12-3456789"
                  className="text-sm sm:text-base"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm sm:text-base">Credit Limit ($)</Label>
                <Input
                  type="number"
                  value={accountForm.creditLimit}
                  onChange={(e) => setAccountForm({ ...accountForm, creditLimit: e.target.value })}
                  data-testid="input-credit-limit-new"
                  placeholder="10000"
                  className="text-sm sm:text-base"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm sm:text-base">Discount (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={accountForm.discountPercent}
                  onChange={(e) =>
                    setAccountForm({ ...accountForm, discountPercent: e.target.value })
                  }
                  data-testid="input-discount-percent-new"
                  placeholder="0"
                  className="text-sm sm:text-base"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => setCreateAccountDialogOpen(false)}
              className="w-full sm:w-auto mt-2 sm:mt-0"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateAccount}
              data-testid="button-create-account-submit"
              className="w-full sm:w-auto"
            >
              Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Edit Enterprise Account</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Update account details and settings
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm sm:text-base">Company Name *</Label>
                <Input
                  value={editForm.companyName}
                  onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                  data-testid="input-edit-company-name"
                  placeholder="Acme Corporation"
                  className="text-sm sm:text-base"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm sm:text-base">Contact Name *</Label>
                <Input
                  value={editForm.contactName}
                  onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })}
                  data-testid="input-edit-contact-name"
                  placeholder="John Doe"
                  className="text-sm sm:text-base"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm sm:text-base">Email *</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  data-testid="input-edit-email"
                  placeholder="contact@acme.com"
                  className="text-sm sm:text-base"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm sm:text-base">Phone</Label>
                <Input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  data-testid="input-edit-phone"
                  placeholder="+1 234 567 8900"
                  className="text-sm sm:text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm sm:text-base">Billing Address</Label>
              <Textarea
                value={editForm.billingAddress}
                onChange={(e) => setEditForm({ ...editForm, billingAddress: e.target.value })}
                data-testid="input-edit-billing-address"
                placeholder="123 Main Street, Suite 100, City, State, ZIP"
                className="min-h-[80px] text-sm sm:text-base"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm sm:text-base">Tax ID</Label>
                <Input
                  value={editForm.taxId}
                  onChange={(e) => setEditForm({ ...editForm, taxId: e.target.value })}
                  data-testid="input-edit-tax-id"
                  placeholder="12-3456789"
                  className="text-sm sm:text-base"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm sm:text-base">Credit Limit ($)</Label>
                <Input
                  type="number"
                  value={editForm.creditLimit}
                  onChange={(e) => setEditForm({ ...editForm, creditLimit: e.target.value })}
                  data-testid="input-edit-credit-limit"
                  placeholder="10000"
                  className="text-sm sm:text-base"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm sm:text-base">Discount (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.discountPercent}
                  onChange={(e) => setEditForm({ ...editForm, discountPercent: e.target.value })}
                  data-testid="input-edit-discount-percent"
                  placeholder="0"
                  className="text-sm sm:text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm sm:text-base">Account Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(value) => setEditForm({ ...editForm, status: value })}
              >
                <SelectTrigger data-testid="select-edit-status" className="text-sm sm:text-base">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved" className="text-sm sm:text-base">
                    Approved
                  </SelectItem>
                  <SelectItem value="pending" className="text-sm sm:text-base">
                    Pending
                  </SelectItem>
                  <SelectItem value="suspended" className="text-sm sm:text-base">
                    Suspended
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              data-testid="button-edit-cancel"
              className="w-full sm:w-auto mt-2 sm:mt-0 text-sm sm:text-base"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateAccount}
              disabled={updateAccountMutation.isPending}
              data-testid="button-edit-submit"
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              {updateAccountMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </span>
              ) : (
                'Update Account'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* <Dialog
        open={orderDetailsDialogOpen}
        onOpenChange={(open) => {
          setOrderDetailsDialogOpen(open);
          if (!open) setSelectedOrderId(null);
        }}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Bulk Order Details</DialogTitle>
            <DialogDescription>
              View individual eSIM Orders provisioned for this bulk order
            </DialogDescription>
          </DialogHeader>
          {orderDetailsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading order details...</div>
            </div>
          ) : orderDetails ? (
            <div className="space-y-4">
              <div className="grid md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Total eSIMs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {orderDetails.individualOrderCount || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Completed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {orderDetails.completedCount || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Processing</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-teal-600">
                      {orderDetails.processingCount || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Failed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {orderDetails.failedCount || 0}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Order Information</h3>
                <div className="grid md:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Company:</span>{' '}
                    {orderDetails.enterpriseAccount?.companyName}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Amount:</span> $
                    {orderDetails.totalAmount}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>{' '}
                    {getStatusBadge(orderDetails.status)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created:</span>{' '}
                    {format(new Date(orderDetails.createdAt), 'MMM dd, yyyy HH:mm')}
                  </div>
                </div>
              </div>

              {orderDetails.individualOrders && orderDetails.individualOrders.length > 0 ? (
                <div>
                  <h3 className="font-semibold mb-2">Individual eSIM Orders</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ICCID</TableHead>
                        <TableHead>Package</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Validity</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderDetails.individualOrders.map((esim: any) => (
                        <TableRow key={esim.id} data-testid={`row-esim-${esim.id}`}>
                          <TableCell className="font-mono text-xs">
                            {esim.iccid || 'Pending...'}
                          </TableCell>
                          <TableCell>{orderDetails.quote?.package?.title || 'N/A'}</TableCell>
                          <TableCell>{getStatusBadge(esim.status)}</TableCell>
                          <TableCell>{esim.dataAmount}</TableCell>
                          <TableCell>{esim.validity}</TableCell>
                          <TableCell>{format(new Date(esim.createdAt), 'MMM dd, HH:mm')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No individual eSIM Orders yet. Click "Execute" to provision eSIMs.
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">Order not found</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog> */}

      <Dialog
        open={orderDetailsDialogOpen}
        onOpenChange={(open) => {
          setOrderDetailsDialogOpen(open);
          if (!open) setSelectedOrderId(null);
        }}
      >
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Bulk Order Details</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              View individual eSIM Orders provisioned for this bulk order
            </DialogDescription>
          </DialogHeader>

          {orderDetailsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground text-sm sm:text-base">
                Loading order details...
              </div>
            </div>
          ) : orderDetails ? (
            <div className="space-y-4 py-4">
              {/* Stats Cards - Responsive Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <Card className="col-span-1">
                  <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                    <CardTitle className="text-xs sm:text-sm">Total eSIMs</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                    <div className="text-xl sm:text-2xl font-bold">
                      {orderDetails.individualOrderCount || 0}
                    </div>
                  </CardContent>
                </Card>

                <Card className="col-span-1">
                  <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                    <CardTitle className="text-xs sm:text-sm">Completed</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                    <div className="text-xl sm:text-2xl font-bold text-green-600">
                      {orderDetails.completedCount || 0}
                    </div>
                  </CardContent>
                </Card>

                <Card className="col-span-1">
                  <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                    <CardTitle className="text-xs sm:text-sm">Processing</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                    <div className="text-xl sm:text-2xl font-bold text-teal-600">
                      {orderDetails.processingCount || 0}
                    </div>
                  </CardContent>
                </Card>

                <Card className="col-span-1">
                  <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                    <CardTitle className="text-xs sm:text-sm">Failed</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                    <div className="text-xl sm:text-2xl font-bold text-red-600">
                      {orderDetails.failedCount || 0}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Order Information */}
              <div className="space-y-2">
                <h3 className="font-semibold text-base sm:text-lg">Order Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                  <div className="space-y-1 sm:space-y-0">
                    <span className="text-muted-foreground text-xs sm:text-sm block">Company:</span>
                    <span className="text-sm sm:text-base block truncate">
                      {orderDetails.enterpriseAccount?.companyName}
                    </span>
                  </div>
                  <div className="space-y-1 sm:space-y-0">
                    <span className="text-muted-foreground text-xs sm:text-sm block">
                      Total Amount:
                    </span>
                    <span className="text-sm sm:text-base block">${orderDetails.totalAmount}</span>
                  </div>
                  <div className="space-y-1 sm:space-y-0">
                    <span className="text-muted-foreground text-xs sm:text-sm block">Status:</span>
                    <span className="text-sm sm:text-base block">
                      {getStatusBadge(orderDetails.status)}
                    </span>
                  </div>
                  <div className="space-y-1 sm:space-y-0">
                    <span className="text-muted-foreground text-xs sm:text-sm block">Created:</span>
                    <span className="text-sm sm:text-base block">
                      {format(new Date(orderDetails.createdAt), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Individual eSIM Orders Table */}
              {orderDetails.individualOrders && orderDetails.individualOrders.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="font-semibold text-base sm:text-lg">Individual eSIM Orders</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs sm:text-sm px-3 sm:px-4">ICCID</TableHead>
                            <TableHead className="text-xs sm:text-sm px-3 sm:px-4">
                              Package
                            </TableHead>
                            <TableHead className="text-xs sm:text-sm px-3 sm:px-4">
                              Status
                            </TableHead>
                            <TableHead className="text-xs sm:text-sm px-3 sm:px-4">Data</TableHead>
                            <TableHead className="text-xs sm:text-sm px-3 sm:px-4">
                              Validity
                            </TableHead>
                            <TableHead className="text-xs sm:text-sm px-3 sm:px-4">
                              Created
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orderDetails.individualOrders.map((esim: any) => (
                            <TableRow key={esim.id} data-testid={`row-esim-${esim.id}`}>
                              <TableCell className="font-mono text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-3">
                                <span className="truncate block max-w-[120px] sm:max-w-none">
                                  {esim.iccid || 'Pending...'}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-3 truncate max-w-[120px] sm:max-w-none">
                                {orderDetails.quote?.package?.title || 'N/A'}
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-3">
                                {getStatusBadge(esim.status)}
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-3">
                                {esim.dataAmount}
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-3">
                                {esim.validity}
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-3">
                                {format(new Date(esim.createdAt), 'MMM dd, HH:mm')}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 sm:py-8 text-muted-foreground text-sm sm:text-base">
                  No individual eSIM Orders yet. Click "Execute" to provision eSIMs.
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm sm:text-base">
              Order not found
            </div>
          )}

          <DialogFooter className="flex sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setOrderDetailsDialogOpen(false)}
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
