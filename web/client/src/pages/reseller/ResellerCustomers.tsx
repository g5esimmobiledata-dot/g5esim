import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSearch } from 'wouter';
import {
  AlertTriangle,
  Ban,
  Calendar,
  Edit,
  KeyRound,
  Layers,
  Loader2,
  Package,
  Power,
  Search,
  ShieldAlert,
  ShoppingCart,
  Trash2,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

type ResellerCustomer = {
  id: string;
  displayUserId?: number | null;
  email: string;
  name?: string | null;
  phone?: string | null;
  address?: string | null;
  role?: 'customer' | 'agent' | 'reseller' | string;
  kycStatus?: string | null;
  walletBalance?: string | null;
  isBlocked?: boolean;
  isDeleted?: boolean;
  createdAt: string;
  linkedAt?: string;
  orderCount?: number;
  totalSpend?: string;
  recentOrders?: Array<{
    id: string;
    displayOrderId?: number | null;
    dataAmount: string;
    validity: number;
    price: string;
    quantity: number;
    status: string;
    createdAt: string;
  }>;
};

type RateTableOption = {
  id: string;
  name: string;
  defaultMarginPercent?: string;
  packages?: number;
  enabledPackages?: number;
};

type CustomerRateAssignment = {
  id?: string;
  rateTableId?: string;
  rateName?: string;
};

type CustomerResponse = {
  customers: ResellerCustomer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: {
    total: number;
    active: number;
    blocked: number;
    deleted: number;
  };
};

type CatalogPackage = {
  packageId: string;
  title: string;
  providerName?: string | null;
  destinationName?: string | null;
  regionName?: string | null;
  dataAmount: string;
  validity: number;
  wholesaleCost: number;
  sellingPrice: number;
  isEnabled: boolean;
};

type CatalogPackageResponse = {
  packages: CatalogPackage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type CreateAccountRole = 'customer' | 'agent' | 'reseller';

type CreateAccountForm = {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: CreateAccountRole;
  rateTableId: string;
};

const emptyCreateForm: CreateAccountForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  role: 'customer',
  rateTableId: '',
};

const emptyEditForm = {
  name: '',
  email: '',
  phone: '',
  address: '',
};

function formatMoney(value: unknown) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value || 0));
}

function formatDate(value?: string | null) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function customerStatus(customer: ResellerCustomer) {
  if (customer.isDeleted) return { label: 'Deleted', variant: 'secondary' as const };
  if (customer.isBlocked) return { label: 'Inactive', variant: 'destructive' as const };
  return { label: 'Active', variant: 'default' as const };
}

function accountTypeLabel(role?: string | null) {
  if (role === 'agent') return 'Agent';
  if (role === 'reseller') return 'Sub Reseller';
  return 'User';
}

function isRateAccount(role?: string | null) {
  return role === 'agent' || role === 'reseller';
}

function createRoleFromFilter(role?: string | null): CreateAccountRole | null {
  if (role === 'customer' || role === 'agent' || role === 'reseller') return role;
  return null;
}

function lockedCreateRoleFromFilter(role?: string | null): CreateAccountRole | null {
  if (role === 'agent' || role === 'reseller') return role;
  return null;
}

function createDescription(role?: CreateAccountRole | null) {
  if (role) return `Add a new ${accountTypeLabel(role)} account to this workspace.`;
  return 'Add a User, Agent, or Sub Reseller to this workspace.';
}

function sectionCopy(role?: string | null) {
  if (role === 'agent') {
    return {
      badge: 'Agent Section',
      title: 'Agent Management',
      description: 'Create and manage Agent accounts for this workspace.',
      totalLabel: 'Total Agents',
      tableTitle: 'Agents',
      countLabel: 'agent accounts',
      searchPlaceholder: 'Search Agents...',
      emptyLabel: 'No Agents found.',
      createLabel: 'Create Agent',
    };
  }

  if (role === 'reseller') {
    return {
      badge: 'Reseller Section',
      title: 'Reseller Management',
      description: 'Create and manage Sub Reseller accounts for this workspace.',
      totalLabel: 'Total Resellers',
      tableTitle: 'Resellers',
      countLabel: 'reseller accounts',
      searchPlaceholder: 'Search Resellers...',
      emptyLabel: 'No Resellers found.',
      createLabel: 'Create Reseller',
    };
  }

  if (role === 'customer' || role === 'user') {
    return {
      badge: 'User Section',
      title: 'User Management',
      description: 'Create and manage User accounts for this workspace.',
      totalLabel: 'Total Users',
      tableTitle: 'Users',
      countLabel: 'user accounts',
      searchPlaceholder: 'Search Users...',
      emptyLabel: 'No Users found.',
      createLabel: 'Create User',
    };
  }

  return {
    badge: 'Managed Accounts',
    title: 'Customer Management',
    description: 'Create Users, Agents, and Sub Resellers for your reseller storefront.',
    totalLabel: 'Total Customers',
    tableTitle: 'Customers',
    countLabel: 'customer accounts',
    searchPlaceholder: 'Search Customers...',
    emptyLabel: 'No Customers found.',
    createLabel: 'Create Account',
  };
}

export default function ResellerCustomers() {
  const { toast } = useToast();
  const searchParams = useSearch();
  const roleFilter = new URLSearchParams(searchParams).get('role') || 'all';
  const defaultCreateRole = createRoleFromFilter(roleFilter) || 'customer';
  const fixedCreateRole = lockedCreateRoleFromFilter(roleFilter);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ResellerCustomer | null>(null);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [newPassword, setNewPassword] = useState('');
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceDescription, setBalanceDescription] = useState('');
  const [packageSearch, setPackageSearch] = useState('');
  const [debouncedPackageSearch, setDebouncedPackageSearch] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [sendPackageEmail, setSendPackageEmail] = useState(true);
  const [selectedRateTableId, setSelectedRateTableId] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [roleFilter]);

  useEffect(() => {
    if (!createOpen || !fixedCreateRole) return;
    setCreateForm((current) => ({
      ...current,
      role: fixedCreateRole,
      rateTableId: isRateAccount(fixedCreateRole) ? current.rateTableId : '',
    }));
  }, [createOpen, fixedCreateRole]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedPackageSearch(packageSearch), 300);
    return () => window.clearTimeout(timer);
  }, [packageSearch]);

  const customersQuery = useQuery<CustomerResponse>({
    queryKey: ['/api/reseller/customers', { page, search: debouncedSearch, status: statusFilter, role: roleFilter }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
        status: statusFilter,
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (roleFilter !== 'all') params.set('role', roleFilter);
      const response = await fetch(`/api/reseller/customers?${params.toString()}`, {
        credentials: 'include',
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.message || 'Failed to load Customers');
      }
      return json.data;
    },
  });

  const customerDetailsQuery = useQuery<ResellerCustomer>({
    queryKey: ['/api/reseller/customers/detail', selectedCustomer?.id],
    enabled: detailsOpen && Boolean(selectedCustomer?.id),
    queryFn: async () => {
      const response = await fetch(`/api/reseller/customers/${selectedCustomer!.id}`, {
        credentials: 'include',
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.message || 'Failed to load customer details');
      }
      return json.data;
    },
  });

  const packagesQuery = useQuery<CatalogPackageResponse>({
    queryKey: ['/api/reseller/prices', {
      page: 1,
      limit: 50,
      search: debouncedPackageSearch,
      status: 'active',
    }],
    enabled: detailsOpen,
  });

  const ratesQuery = useQuery<{ rates: RateTableOption[] }>({
    queryKey: ['/api/reseller/rates'],
    queryFn: async () => {
      const response = await fetch('/api/reseller/rates', { credentials: 'include' });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.message || 'Failed to load Resellers/Agents rates');
      }
      return json.data;
    },
  });

  const customerRateQuery = useQuery<CustomerRateAssignment | null>({
    queryKey: ['/api/reseller/rates/assignments', selectedCustomer?.id],
    enabled: detailsOpen && Boolean(selectedCustomer?.id && isRateAccount(selectedCustomer?.role)),
    queryFn: async () => {
      const response = await fetch(`/api/reseller/rates/assignments/${selectedCustomer!.id}`, {
        credentials: 'include',
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.message || 'Failed to load rate assignment');
      }
      return json.data;
    },
  });

  useEffect(() => {
    if (customerRateQuery.data?.rateTableId) {
      setSelectedRateTableId(customerRateQuery.data.rateTableId);
    }
  }, [customerRateQuery.data?.rateTableId]);

  const invalidateCustomers = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/reseller/customers'] });
    if (selectedCustomer?.id) {
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/customers/detail', selectedCustomer.id] });
    }
  };

  const openCreateDialog = () => {
    setCreateForm({
      ...emptyCreateForm,
      role: fixedCreateRole || defaultCreateRole,
    });
    setCreateOpen(true);
  };

  const createCustomerMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/reseller/customers', {
        name: createForm.name,
        email: createForm.email,
        phone: createForm.phone || undefined,
        password: createForm.password || undefined,
        role: createForm.role,
        rateTableId: isRateAccount(createForm.role) ? createForm.rateTableId : undefined,
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.message || 'Failed to create customer');
      return json.data as ResellerCustomer;
    },
    onSuccess: () => {
      setCreateOpen(false);
      setCreateForm(emptyCreateForm);
      invalidateCustomers();
      toast({
        title: `${accountTypeLabel(createForm.role)} created`,
        description: 'The account was added to your Reseller workspace.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Create failed',
        description: error.message || 'Could not create customer',
        variant: 'destructive',
      });
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomer) throw new Error('No customer selected');
      const response = await apiRequest('PATCH', `/api/reseller/customers/${selectedCustomer.id}`, {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone || null,
        address: editForm.address || null,
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.message || 'Failed to update customer');
      return json.data as ResellerCustomer;
    },
    onSuccess: (customer) => {
      setSelectedCustomer((current) => (current?.id === customer.id ? { ...current, ...customer } : current));
      invalidateCustomers();
      toast({ title: 'Customer updated', description: 'Customer details were saved.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Update failed',
        description: error.message || 'Could not update customer',
        variant: 'destructive',
      });
    },
  });

  const assignRateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomer) throw new Error('No account selected');
      if (!selectedRateTableId) throw new Error('Select a rate table');
      const response = await apiRequest('POST', `/api/reseller/rates/${selectedRateTableId}/assign`, {
        customerId: selectedCustomer.id,
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.message || 'Failed to assign rate table');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/rates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/rates/assignments', selectedCustomer?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/customers'] });
      toast({ title: 'Rate assigned', description: 'Package cost prices were applied to this account.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Rate assignment failed',
        description: error.message || 'Could not assign rate table',
        variant: 'destructive',
      });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomer) throw new Error('No customer selected');
      const response = await apiRequest('PATCH', `/api/reseller/customers/${selectedCustomer.id}/password`, {
        password: newPassword,
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.message || 'Failed to update password');
      return json.data as ResellerCustomer;
    },
    onSuccess: () => {
      setNewPassword('');
      toast({ title: 'Password updated', description: 'The customer can now sign in with the new password.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Password update failed',
        description: error.message || 'Could not update password',
        variant: 'destructive',
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ customerId, status }: { customerId: string; status: 'active' | 'inactive' }) => {
      const response = await apiRequest('PATCH', `/api/reseller/customers/${customerId}/status`, { status });
      const json = await response.json();
      if (!json.success) throw new Error(json.message || 'Failed to update status');
      return json.data as ResellerCustomer;
    },
    onSuccess: (customer) => {
      setSelectedCustomer((current) => (current?.id === customer.id ? { ...current, ...customer } : current));
      invalidateCustomers();
      toast({ title: 'Customer status updated' });
    },
    onError: (error: any) => {
      toast({
        title: 'Status update failed',
        description: error.message || 'Could not update customer status',
        variant: 'destructive',
      });
    },
  });

  const addBalanceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomer) throw new Error('No customer selected');
      const amount = Number(balanceAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('Enter a wallet amount greater than zero');
      }

      const response = await fetch(`/api/reseller/customers/${selectedCustomer.id}/balance`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          description: balanceDescription.trim() || undefined,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.success) throw new Error(json.message || 'Failed to add wallet funds');
      return json.data as { customer: ResellerCustomer; resellerBalance: string };
    },
    onSuccess: (data) => {
      setBalanceAmount('');
      setBalanceDescription('');
      setSelectedCustomer((current) => (current?.id === data.customer.id ? { ...current, ...data.customer } : current));
      invalidateCustomers();
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/stats'] });
      toast({ title: 'Funds added', description: 'Customer wallet balance was updated.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Funding failed',
        description: error.message || 'Could not add funds to this customer wallet',
        variant: 'destructive',
      });
    },
  });

  const applyPackageMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomer) throw new Error('No customer selected');
      if (!selectedPackageId) throw new Error('Select a package to apply');

      const response = await fetch(`/api/reseller/customers/${selectedCustomer.id}/apply-package`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: selectedPackageId,
          sendEmail: sendPackageEmail,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.success) throw new Error(json.message || 'Failed to apply package');
      return json.data as { order: { id: string }; resellerBalance: string };
    },
    onSuccess: () => {
      setSelectedPackageId('');
      invalidateCustomers();
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/prices'] });
      toast({ title: 'Package applied', description: 'The package was added to the customer account.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Package failed',
        description: error.message || 'Could not apply this package',
        variant: 'destructive',
      });
    },
  });

  const reminderMutation = useMutation({
    mutationFn: async (type: 'kyc' | 'balance') => {
      if (!selectedCustomer) throw new Error('No customer selected');

      const response = await fetch(`/api/reseller/customers/${selectedCustomer.id}/reminder`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.success) throw new Error(json.message || 'Failed to send reminder email');
      return json.data as { type: 'kyc' | 'balance'; customerId: string };
    },
    onSuccess: (data) => {
      toast({
        title: 'Reminder sent',
        description: data.type === 'kyc' ? 'KYC reminder email was sent.' : 'Balance reminder email was sent.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Reminder failed',
        description: error.message || 'Could not send reminder email',
        variant: 'destructive',
      });
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const response = await apiRequest('DELETE', `/api/reseller/customers/${customerId}`, {});
      const json = await response.json();
      if (!json.success) throw new Error(json.message || 'Failed to delete customer');
      return json.data;
    },
    onSuccess: () => {
      setDetailsOpen(false);
      setSelectedCustomer(null);
      invalidateCustomers();
      toast({ title: 'Customer deleted', description: 'The customer was removed from your active list.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Delete failed',
        description: error.message || 'Could not delete customer',
        variant: 'destructive',
      });
    },
  });

  const openCustomer = (customer: ResellerCustomer) => {
    setSelectedCustomer(customer);
    setEditForm({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
    });
    setNewPassword('');
    setBalanceAmount('');
    setBalanceDescription('');
    setPackageSearch('');
    setSelectedPackageId('');
    setSendPackageEmail(true);
    setSelectedRateTableId('');
    setDetailsOpen(true);
  };

  const data = customersQuery.data;
  const customers = data?.customers || [];
  const stats = data?.stats || { total: 0, active: 0, blocked: 0, deleted: 0 };
  const pagination = data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 };
  const detailCustomer = customerDetailsQuery.data || selectedCustomer;
  const availablePackages = packagesQuery.data?.packages || [];
  const selectedPackage = availablePackages.find((pkg) => pkg.packageId === selectedPackageId);
  const rates = ratesQuery.data?.rates || [];
  const currentRateAssignment = customerRateQuery.data;
  const customerActionsDisabled = Boolean(detailCustomer?.isBlocked || detailCustomer?.isDeleted);
  const customerBalance = Number(detailCustomer?.walletBalance || 0);
  const customerKycStatus = String(detailCustomer?.kycStatus || 'pending').toLowerCase();
  const isKycVerified = ['approved', 'verified'].includes(customerKycStatus);
  const showKycReminder = Boolean(detailCustomer && !detailCustomer.isDeleted && !isKycVerified);
  const showBalanceReminder = Boolean(detailCustomer && !detailCustomer.isDeleted && customerBalance < 0);
  const showRateTools = Boolean(detailCustomer && isRateAccount(detailCustomer.role));
  const copy = sectionCopy(roleFilter);

  return (
    <div className="-m-4 min-h-[calc(100vh-4rem)] space-y-6 bg-[#071226] p-4 text-slate-100 sm:-m-6 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Badge variant="outline" className="mb-3 border-slate-700 bg-[#101520] text-slate-300">{copy.badge}</Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            {copy.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            {copy.description}
          </p>
        </div>
        <Button className="bg-[#58cbbb] text-slate-950 hover:bg-[#67d8c8]" onClick={openCreateDialog}>
          <UserPlus className="mr-2 h-4 w-4" />
          {copy.createLabel}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-0 bg-gradient-to-br from-[#111a2b] to-[#181836] p-1 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#54e2d0]">{copy.totalLabel}</CardTitle>
            <Users className="h-4 w-4 text-[#58cbbb]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-white">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-[#102019] to-[#0f2b23] p-1 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-400">Active</CardTitle>
            <Power className="h-4 w-4 text-emerald-300" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-white">{stats.active}</div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-[#2a171d] to-[#32151e] p-1 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-400">Inactive</CardTitle>
            <Ban className="h-4 w-4 text-orange-300" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-white">{stats.blocked}</div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-[#241824] to-[#2d1822] p-1 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-300">Deleted</CardTitle>
            <Trash2 className="h-4 w-4 text-red-300" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-white">{stats.deleted}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 bg-[#101520] shadow-lg">
        <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-white">{copy.tableTitle}</CardTitle>
              <p className="text-sm text-slate-400">{pagination.total} {copy.countLabel}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative sm:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="border-[#29456d] bg-[#0b1b33] pl-9 text-white placeholder:text-slate-400"
                  placeholder={copy.searchPlaceholder}
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="border-[#29456d] bg-[#0b1b33] text-white sm:w-44">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="blocked">Inactive</SelectItem>
                  <SelectItem value="deleted">Deleted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {customersQuery.isLoading ? (
            <div className="flex h-56 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#58cbbb]" />
            </div>
          ) : customers.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
              {copy.emptyLabel}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="font-medium text-slate-300">Account</TableHead>
                  <TableHead className="font-medium text-slate-300">Type</TableHead>
                  <TableHead className="font-medium text-slate-300">Contact</TableHead>
                  <TableHead className="font-medium text-slate-300">Wallet</TableHead>
                  <TableHead className="font-medium text-slate-300">Orders</TableHead>
                  <TableHead className="font-medium text-slate-300">Status</TableHead>
                  <TableHead className="font-medium text-slate-300">Joined</TableHead>
                  <TableHead className="text-right font-medium text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => {
                  const status = customerStatus(customer);
                  return (
                    <TableRow key={customer.id} className="border-slate-800 hover:bg-[#0b1b33]/70">
                      <TableCell>
                        <p className="font-medium text-white">
                          {customer.name || 'Customer'}
                        </p>
                        <p className="text-xs text-slate-400">
                          UID{String(customer.displayUserId || '').padStart(3, '0')}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge className={isRateAccount(customer.role) ? 'border-sky-500/20 bg-sky-500/15 text-sky-300' : 'border-slate-500/20 bg-slate-500/15 text-slate-300'} variant="outline">
                          {accountTypeLabel(customer.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-slate-300">{customer.email}</p>
                        <p className="text-xs text-slate-500">{customer.phone || 'No phone'}</p>
                      </TableCell>
                      <TableCell className="text-white">{formatMoney(customer.walletBalance)}</TableCell>
                      <TableCell>
                        <p className="font-medium text-white">{customer.orderCount || 0}</p>
                        <p className="text-xs text-slate-500">{formatMoney(customer.totalSpend)}</p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            status.label === 'Active'
                              ? 'border-emerald-500/20 bg-emerald-500/15 text-emerald-300'
                              : status.label === 'Inactive'
                                ? 'border-orange-500/20 bg-orange-500/15 text-orange-300'
                                : 'border-red-500/20 bg-red-500/15 text-red-300'
                          }
                          variant="outline"
                        >
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-400">{formatDate(customer.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button className="border-[#58cbbb] bg-transparent text-white hover:bg-[#0b1b33] hover:text-[#58cbbb]" variant="outline" size="sm" onClick={() => openCustomer(customer)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Manage
                          </Button>
                          <Button
                            variant={customer.isBlocked || customer.isDeleted ? 'outline' : 'destructive'}
                            size="icon"
                            onClick={() =>
                              statusMutation.mutate({
                                customerId: customer.id,
                                status: customer.isBlocked || customer.isDeleted ? 'active' : 'inactive',
                              })
                            }
                            disabled={statusMutation.isPending}
                            aria-label={customer.isBlocked || customer.isDeleted ? 'Activate customer' : 'Deactivate customer'}
                          >
                            {customer.isBlocked || customer.isDeleted ? (
                              <Power className="h-4 w-4" />
                            ) : (
                              <Ban className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm">
              <span className="text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-hidden border-slate-700/80 bg-slate-950 p-0 text-slate-100 shadow-2xl shadow-black/40">
          <DialogHeader className="border-b border-slate-800 bg-slate-900/80 px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary-gradient text-white shadow-lg shadow-primary/20">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white">Create {accountTypeLabel(createForm.role)}</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-slate-400">{createDescription(fixedCreateRole)}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="grid max-h-[calc(92vh-104px)] gap-4 overflow-y-auto px-6 py-5">
            <div className="rounded-md border border-slate-800 bg-slate-900/55 p-4">
              <Label htmlFor="create-account-role" className="text-slate-200">Account Type</Label>
              <Select
                value={createForm.role}
                onValueChange={(value) =>
                  setCreateForm((current) => ({
                    ...current,
                    role: value as CreateAccountRole,
                    rateTableId: isRateAccount(value) ? current.rateTableId : '',
                  }))
                }
                disabled={Boolean(fixedCreateRole)}
              >
                <SelectTrigger id="create-account-role" className="mt-2 border-slate-700 bg-slate-950 text-slate-100 focus:ring-primary">
                  <SelectValue placeholder="Choose account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">User</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="reseller">Sub Reseller</SelectItem>
                </SelectContent>
              </Select>
              {fixedCreateRole && (
                <p className="mt-2 text-xs text-slate-500">
                  This page is set to create {accountTypeLabel(fixedCreateRole).toLowerCase()} accounts.
                </p>
              )}
            </div>
            {isRateAccount(createForm.role) && (
              <div className="space-y-2 rounded-md border border-slate-800 bg-slate-900/55 p-4">
                <Label htmlFor="create-account-rate" className="text-slate-200">Rate Table</Label>
                <Select
                  value={createForm.rateTableId}
                  onValueChange={(value) => setCreateForm((current) => ({ ...current, rateTableId: value }))}
                  disabled={rates.length === 0}
                >
                  <SelectTrigger id="create-account-rate" className="border-slate-700 bg-slate-950 text-slate-100 focus:ring-primary">
                    <SelectValue placeholder="Choose rate table" />
                  </SelectTrigger>
                  <SelectContent>
                    {rates.map((rate) => (
                      <SelectItem key={rate.id} value={rate.id}>
                        {rate.name} | {Number(rate.defaultMarginPercent || 0).toFixed(2)}% markup
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {rates.length === 0 && (
                  <p className="text-xs text-slate-500">
                    No rate table yet. You can create this account now and assign rates later.
                  </p>
                )}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="create-customer-name" className="text-slate-200">Name</Label>
              <Input
                id="create-customer-name"
                className="border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus-visible:ring-primary"
                value={createForm.name}
                onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-customer-email" className="text-slate-200">Email</Label>
              <Input
                id="create-customer-email"
                type="email"
                className="border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus-visible:ring-primary"
                value={createForm.email}
                onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-customer-phone" className="text-slate-200">Phone</Label>
              <Input
                id="create-customer-phone"
                className="border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus-visible:ring-primary"
                value={createForm.phone}
                onChange={(event) => setCreateForm((current) => ({ ...current, phone: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-customer-password" className="text-slate-200">Password</Label>
              <Input
                id="create-customer-password"
                type="password"
                placeholder="Optional"
                className="border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus-visible:ring-primary"
                value={createForm.password}
                onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
              />
            </div>
            </div>
            <Button
              onClick={() => createCustomerMutation.mutate()}
              className="mt-1 h-11 bg-primary-gradient text-white shadow-lg shadow-primary/20 hover:opacity-95"
              disabled={
                createCustomerMutation.isPending ||
                !createForm.name.trim() ||
                !createForm.email.trim()
              }
            >
              {createCustomerMutation.isPending ? 'Creating...' : `Create ${accountTypeLabel(createForm.role)}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-none overflow-hidden border-slate-700/80 bg-[#06152d] p-0 text-slate-100 shadow-2xl shadow-black/50 sm:w-[calc(100vw-2rem)] xl:w-[min(1600px,calc(100vw-2rem))]">
          <DialogHeader className="border-b border-slate-800 bg-[#081a36] px-5 py-4">
            <DialogTitle className="text-white">{detailCustomer ? `${accountTypeLabel(detailCustomer.role)} Details` : 'Account Details'}</DialogTitle>
            <DialogDescription className="text-slate-400">Manage the selected customer account.</DialogDescription>
          </DialogHeader>
          {detailCustomer && (
            <div className="grid max-h-[calc(92vh-76px)] items-stretch gap-4 overflow-y-auto bg-[#06152d] p-4 xl:grid-cols-3">
              <div className="flex h-full flex-col gap-3 rounded-md border border-slate-700/80 bg-[#0b1f3f] p-3">
                <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-4">
                  <div className="rounded-md border border-slate-700/70 bg-[#071832] p-2">
                    <Wallet className="mb-1 h-4 w-4 text-teal-300" />
                    <p className="text-xs text-slate-400">Wallet</p>
                    <p className="font-semibold text-white">{formatMoney(detailCustomer.walletBalance)}</p>
                  </div>
                  <div className="rounded-md border border-slate-700/70 bg-[#071832] p-2">
                    <ShoppingCart className="mb-1 h-4 w-4 text-teal-300" />
                    <p className="text-xs text-slate-400">Orders</p>
                    <p className="font-semibold text-white">{detailCustomer.orderCount || 0}</p>
                  </div>
                  <div className="rounded-md border border-slate-700/70 bg-[#071832] p-2">
                    <Calendar className="mb-1 h-4 w-4 text-teal-300" />
                    <p className="text-xs text-slate-400">Joined</p>
                    <p className="font-semibold text-white">{formatDate(detailCustomer.createdAt)}</p>
                  </div>
                  <div className="rounded-md border border-slate-700/70 bg-[#071832] p-2">
                    <ShieldAlert className="mb-1 h-4 w-4 text-teal-300" />
                    <p className="text-xs text-slate-400">KYC</p>
                    <Badge variant={isKycVerified ? 'default' : 'secondary'} className="mt-1 capitalize">
                      {customerKycStatus}
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-customer-name" className="text-slate-200">Name</Label>
                    <Input
                      id="edit-customer-name"
                      className="border-slate-700 bg-[#071832] text-slate-100 placeholder:text-slate-500 focus-visible:ring-teal-400"
                      value={editForm.name}
                      onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-customer-email" className="text-slate-200">Email</Label>
                    <Input
                      id="edit-customer-email"
                      type="email"
                      className="border-slate-700 bg-[#071832] text-slate-100 placeholder:text-slate-500 focus-visible:ring-teal-400"
                      value={editForm.email}
                      onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-customer-phone" className="text-slate-200">Phone</Label>
                    <Input
                      id="edit-customer-phone"
                      className="border-slate-700 bg-[#071832] text-slate-100 placeholder:text-slate-500 focus-visible:ring-teal-400"
                      value={editForm.phone}
                      onChange={(event) => setEditForm((current) => ({ ...current, phone: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-customer-address" className="text-slate-200">Address</Label>
                    <Input
                      id="edit-customer-address"
                      className="border-slate-700 bg-[#071832] text-slate-100 placeholder:text-slate-500 focus-visible:ring-teal-400"
                      value={editForm.address}
                      onChange={(event) => setEditForm((current) => ({ ...current, address: event.target.value }))}
                    />
                  </div>
                </div>

                <Button
                  className="mt-auto w-full bg-teal-500 text-white hover:bg-teal-400"
                  onClick={() => updateCustomerMutation.mutate()}
                  disabled={updateCustomerMutation.isPending || !editForm.name.trim() || !editForm.email.trim()}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  {updateCustomerMutation.isPending ? 'Saving...' : 'Save Customer'}
                </Button>
              </div>

              <div className="flex h-full flex-col gap-3 rounded-md border border-slate-700/80 bg-[#0b1f3f] p-3">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-teal-300" />
                  <h3 className="font-semibold text-white">Fund Account</h3>
                </div>

                <div className="grid gap-3 sm:grid-cols-[130px_1fr] xl:grid-cols-1 2xl:grid-cols-[130px_1fr]">
                  <div className="space-y-1.5">
                    <Label htmlFor="customer-wallet-amount" className="text-slate-200">Amount</Label>
                    <Input
                      id="customer-wallet-amount"
                      type="number"
                      min="0"
                      step="0.01"
                      className="border-slate-700 bg-[#071832] text-slate-100 placeholder:text-slate-500 focus-visible:ring-teal-400"
                      value={balanceAmount}
                      onChange={(event) => setBalanceAmount(event.target.value)}
                      disabled={customerActionsDisabled}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="customer-wallet-description" className="text-slate-200">Note</Label>
                    <Input
                      id="customer-wallet-description"
                      className="border-slate-700 bg-[#071832] text-slate-100 placeholder:text-slate-500 focus-visible:ring-teal-400"
                      value={balanceDescription}
                      onChange={(event) => setBalanceDescription(event.target.value)}
                      disabled={customerActionsDisabled}
                    />
                  </div>
                </div>

                <Button
                  className="w-full bg-teal-500 text-white hover:bg-teal-400"
                  onClick={() => addBalanceMutation.mutate()}
                  disabled={addBalanceMutation.isPending || customerActionsDisabled || !balanceAmount}
                >
                  {addBalanceMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Wallet className="mr-2 h-4 w-4" />
                  )}
                  Add Funds
                </Button>

                <div className="grid gap-3 border-t border-slate-700 pt-3 sm:grid-cols-[1fr_auto] xl:grid-cols-1 2xl:grid-cols-[1fr_auto]">
                  <div className="space-y-1.5">
                    <Label htmlFor="customer-new-password" className="text-slate-200">New Password</Label>
                    <Input
                      id="customer-new-password"
                      type="password"
                      className="border-slate-700 bg-[#071832] text-slate-100 placeholder:text-slate-500 focus-visible:ring-teal-400"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="self-end border-slate-600 bg-[#071832] text-slate-100 hover:bg-[#10284d] hover:text-white"
                    onClick={() => passwordMutation.mutate()}
                    disabled={passwordMutation.isPending || newPassword.length < 8}
                  >
                    <KeyRound className="mr-2 h-4 w-4" />
                    Change
                  </Button>
                </div>

                {showRateTools && (
                  <div className="space-y-3 border-t border-slate-700 pt-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-teal-300" />
                        <h3 className="font-semibold text-white">Resellers/Agents Rates</h3>
                      </div>
                      {currentRateAssignment?.rateName && (
                        <Badge variant="outline" className="border-slate-600 text-slate-200">{currentRateAssignment.rateName}</Badge>
                      )}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto] xl:grid-cols-1 2xl:grid-cols-[1fr_auto]">
                      <Select
                        value={selectedRateTableId}
                        onValueChange={setSelectedRateTableId}
                        disabled={rates.length === 0 || customerActionsDisabled}
                      >
                        <SelectTrigger className="border-slate-700 bg-[#071832] text-slate-100">
                          <SelectValue placeholder="Choose rate table" />
                        </SelectTrigger>
                        <SelectContent>
                          {rates.map((rate) => (
                            <SelectItem key={rate.id} value={rate.id}>
                              {rate.name} | {Number(rate.defaultMarginPercent || 0).toFixed(2)}% markup
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        className="border-slate-600 bg-[#071832] text-slate-100 hover:bg-[#10284d] hover:text-white"
                        onClick={() => assignRateMutation.mutate()}
                        disabled={!selectedRateTableId || assignRateMutation.isPending || customerActionsDisabled}
                      >
                        {assignRateMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Layers className="mr-2 h-4 w-4" />
                        )}
                        Apply Rate
                      </Button>
                    </div>
                    {rates.length === 0 && (
                      <p className="text-xs text-slate-400">Create a rate first from Resellers/Agents Rates.</p>
                    )}
                  </div>
                )}

                <div className="mt-auto grid gap-2 border-t border-slate-700 pt-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  <Button
                    variant={detailCustomer.isBlocked || detailCustomer.isDeleted ? 'outline' : 'destructive'}
                    onClick={() =>
                      statusMutation.mutate({
                        customerId: detailCustomer.id,
                        status: detailCustomer.isBlocked || detailCustomer.isDeleted ? 'active' : 'inactive',
                      })
                    }
                    disabled={statusMutation.isPending}
                  >
                    {detailCustomer.isBlocked || detailCustomer.isDeleted ? (
                      <Power className="mr-2 h-4 w-4" />
                    ) : (
                      <Ban className="mr-2 h-4 w-4" />
                    )}
                    {detailCustomer.isBlocked || detailCustomer.isDeleted ? 'Activate' : 'Deactivate'}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => deleteCustomerMutation.mutate(detailCustomer.id)}
                    disabled={deleteCustomerMutation.isPending}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>

              <div className="flex h-full flex-col gap-3 rounded-md border border-slate-700/80 bg-[#0b1f3f] p-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-teal-300" />
                  <h3 className="font-semibold text-white">Apply Package</h3>
                </div>

                <div className="grid gap-3 sm:grid-cols-[0.8fr_1.2fr] xl:grid-cols-1 2xl:grid-cols-[0.8fr_1.2fr]">
                  <div className="space-y-1.5">
                    <Label htmlFor="customer-package-search" className="text-slate-200">Search Package</Label>
                    <Input
                      id="customer-package-search"
                      className="border-slate-700 bg-[#071832] text-slate-100 placeholder:text-slate-500 focus-visible:ring-teal-400"
                      value={packageSearch}
                      onChange={(event) => setPackageSearch(event.target.value)}
                      disabled={customerActionsDisabled}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="customer-package-select" className="text-slate-200">Package</Label>
                    <Select
                      value={selectedPackageId}
                      onValueChange={setSelectedPackageId}
                      disabled={packagesQuery.isLoading || customerActionsDisabled}
                    >
                      <SelectTrigger id="customer-package-select" className="border-slate-700 bg-[#071832] text-slate-100">
                        <SelectValue placeholder={packagesQuery.isLoading ? 'Loading Packages...' : 'Select package'} />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePackages.length === 0 ? (
                          <SelectItem value="no-active-packages" disabled>
                            No active Packages
                          </SelectItem>
                        ) : (
                          availablePackages.map((pkg) => (
                            <SelectItem key={pkg.packageId} value={pkg.packageId}>
                              {pkg.title || `${pkg.dataAmount} - ${pkg.validity} Days`} | {formatMoney(pkg.sellingPrice)}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedPackage && (
                  <div className="grid gap-2 rounded-md border border-slate-700/70 bg-[#071832] p-3 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-slate-400">Reseller Cost</p>
                      <p className="font-semibold text-white">{formatMoney(selectedPackage.wholesaleCost)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Customer Price</p>
                      <p className="font-semibold text-white">{formatMoney(selectedPackage.sellingPrice)}</p>
                    </div>
                  </div>
                )}

                <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-700 pt-3">
                  <label className="flex items-center gap-2 text-sm text-slate-200">
                    <Checkbox
                      checked={sendPackageEmail}
                      onCheckedChange={(checked) => setSendPackageEmail(checked === true)}
                      disabled={customerActionsDisabled}
                    />
                    Send installation email
                  </label>
                  <Button
                    className="bg-teal-500 text-white hover:bg-teal-400"
                    onClick={() => applyPackageMutation.mutate()}
                    disabled={applyPackageMutation.isPending || customerActionsDisabled || !selectedPackageId}
                  >
                    {applyPackageMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Package className="mr-2 h-4 w-4" />
                    )}
                    Apply Package
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-700 pt-3 xl:col-span-3">
                {showKycReminder && (
                  <Button
                    variant="outline"
                    className="border-slate-600 bg-[#0b1f3f] text-slate-100 hover:bg-[#10284d] hover:text-white"
                    onClick={() => reminderMutation.mutate('kyc')}
                    disabled={reminderMutation.isPending || customerActionsDisabled}
                  >
                    {reminderMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldAlert className="mr-2 h-4 w-4" />
                    )}
                    Send KYC Reminder Email
                  </Button>
                )}
                {showBalanceReminder && (
                  <Button
                    variant="outline"
                    className="border-slate-600 bg-[#0b1f3f] text-slate-100 hover:bg-[#10284d] hover:text-white"
                    onClick={() => reminderMutation.mutate('balance')}
                    disabled={reminderMutation.isPending || customerActionsDisabled}
                  >
                    {reminderMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <AlertTriangle className="mr-2 h-4 w-4" />
                    )}
                    Send Balance Reminder Email
                  </Button>
                )}
                <Button variant="outline" className="border-slate-600 bg-[#0b1f3f] text-slate-100 hover:bg-[#10284d] hover:text-white" onClick={() => setDetailsOpen(false)}>
                  <X className="mr-2 h-4 w-4" />
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
