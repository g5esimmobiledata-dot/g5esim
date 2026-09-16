import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Helmet } from 'react-helmet-async';
import { Link } from 'wouter';
import { Globe, User, Phone, MapPin, Mail, Shield, Bell, AlertCircle, Camera, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ThemeToggle';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useTranslation } from '@/contexts/TranslationContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select';
import ReactCountryFlag from 'react-country-flag';

import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
  CommandEmpty,
} from '@/components/ui/command';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserProfile {
  id: string;
  displayUserId?: number;
  email: string;
  name?: string;
  phone?: string;
  whatsappNumber?: string;
  address?: string;
  destination?: string;
  currency?: string;
  role?: 'customer' | 'agent' | 'reseller';
  kycStatus: string;
  kycRejectionReason?: string;
  notifyLowData: boolean;
  notifyExpiring: boolean;
  imagePath?: string;
  referralBalance?: string;
  createdAt: string;
  isFromGoogle?: boolean;
}

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10).optional(),
  whatsappNumber: z.string().optional(),
  address: z.string().min(5).optional(),
  destination: z.string().optional(),
  currency: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function Profile() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [notifyLowData, setNotifyLowData] = useState(true);
  const [notifyExpiring, setNotifyExpiring] = useState(true);
  const [countryOpen, setCountryOpen] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const { currencies } = useCurrency();

  const { data: user, isLoading } = useQuery<UserProfile>({
    queryKey: ['/api/customer/profile'],
  });

  const { data: destinations, isLoading: loadingDest } = useQuery({
    queryKey: ['/api/destinations'],
  });

  // console.log(destinations, currencies, loadingDest);

  // Update notification preferences when user data is loaded
  useEffect(() => {
    if (user) {
      setNotifyLowData(user.notifyLowData);
      setNotifyExpiring(user.notifyExpiring);
    }
  }, [user]);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: {
      name: user?.name || '',
      phone: user?.phone || '',
      whatsappNumber: user?.whatsappNumber || '',
      address: user?.address || '',
      destination: user?.destination || '',
      currency: user?.currency || '',
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const formData = new FormData();

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });

      if (profileImage) {
        formData.append('profileImage', profileImage);
      }

      return await apiRequest('PUT', '/api/customer/profile', formData);
    },
    onSuccess: () => {
      setProfileImage(null);
      setPreview(null);
      queryClient.invalidateQueries({ queryKey: ['/api/customer/profile'] });
      toast({
        title: t('website.profile.profileUpdated', 'Profile Updated'),
        description: t(
          'website.profile.profileUpdatedDesc',
          'Your profile information has been saved successfully.',
        ),
      });
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  useEffect(() => {
    if (!profileImage) return;
    const objectUrl = URL.createObjectURL(profileImage);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [profileImage]);

  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: { notifyLowData: boolean; notifyExpiring: boolean }) => {
      return await apiRequest('PATCH', '/api/customer/notification-preferences', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customer/profile'] });
      toast({
        title: t('website.profile.preferencesUpdated', 'Preferences Updated'),
        description: t(
          'website.profile.preferencesUpdatedDesc',
          'Your notification preferences have been saved successfully.',
        ),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('website.profile.updateFailed', 'Update Failed'),
        description:
          error.message ||
          t('website.profile.notificationUpdateFailed', 'Failed to update notification preferences'),
        variant: 'destructive',
      });
    },
  });

  const handleNotificationChange = async (
    field: 'notifyLowData' | 'notifyExpiring',
    value: boolean,
  ) => {
    if (field === 'notifyLowData') {
      setNotifyLowData(value);
      await updateNotificationsMutation.mutateAsync({ notifyLowData: value, notifyExpiring });
    } else {
      setNotifyExpiring(value);
      await updateNotificationsMutation.mutateAsync({ notifyLowData, notifyExpiring: value });
    }
  };

  const getKycStatusBadge = (status: string | undefined) => {
    console.log('KYC Status:', status);
    const variants = {
      pending: {
        variant: 'outline' as const,
        label: t('website.profile.kycPending', 'Pending'),
        className: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
      },
      submitted: {
        variant: 'outline' as const,
        label: t('website.profile.kycSubmitted', 'Submitted'),
        className: '',
      },
      approved: {
        variant: 'default' as const,
        label: t('website.profile.kycApproved', 'Approved'),
        className: '',
      },
      verified: {
        variant: 'default' as const,
        label: t('website.profile.kycVerified', 'Verified'),
        className: '',
      },
      rejected: {
        variant: 'destructive' as const,
        label: t('website.profile.kycRejected', 'Rejected'),
        className: '',
      },
    };
    return variants[(status || 'pending') as keyof typeof variants] || variants.pending;
  };

  const getFlagEmoji = (code: string) =>
    code.toUpperCase().replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));

  const canManageWhatsapp = user?.role === 'agent' || user?.role === 'reseller';

  return (
    <div className="flex-1">
      <Helmet>
        <title>My Profile </title>
        <meta name="description" content="Manage your profile information and account settings" />
      </Helmet>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-foreground">
          {t('website.profile.title', 'My Profile')}
        </h1>
        <p className="text-muted-foreground">
          {t('website.profile.description', 'Manage your account information and settings')}
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Account Overview */}
          <Card>
            <CardHeader >
              <CardTitle>{t('website.profile.accountOverview', 'Account Overview')}</CardTitle>
              <CardDescription>
                {t(
                  'website.profile.accountOverviewDesc',
                  'Your account status and verification information',
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="flex items-center gap-4 rounded-lg border p-4">
                  <div className="relative h-20 w-20 shrink-0">
                    {/* Avatar */}
                    <label htmlFor="profileImage" className="cursor-pointer">
                      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border bg-muted">
                        {preview || user?.imagePath ? (
                          <img
                            src={preview || (user?.imagePath?.startsWith('http') ? user.imagePath : `/${user?.imagePath}`)}
                            className="h-full w-full object-cover"
                            alt="Profile"
                          />
                        ) : (
                          <User className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>

                      {/* Camera Icon Overlay */}
                      <div className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-teal-500 p-1.5 text-white shadow hover:bg-teal-600">
                        <Camera className="h-4 w-4" />
                      </div>
                    </label>

                    {/* Hidden input */}
                    <input
                      id="profileImage"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setProfileImage(e.target.files?.[0] || null)}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-lg font-semibold">
                      {user?.name || t('website.profile.noNameSet', 'No name set')}
                      {user?.isFromGoogle && (
                        <Badge variant="outline" className="h-5 bg-blue-50 text-[10px] text-blue-600 border-blue-200">
                          Google
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                      <div className="flex min-w-0 items-center gap-2">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{user?.email}</span>
                      </div>
                      {user?.displayUserId && (
                        <div className="w-fit rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                          ID: #{user.displayUserId}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">
                        {t('website.profile.kycVerification', 'KYC Verification')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t('website.profile.kycVerificationDesc', 'Identity verification status')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={getKycStatusBadge(user?.kycStatus).variant}
                      className={getKycStatusBadge(user?.kycStatus).className}
                      data-testid="badge-kyc-status"
                    >
                      {getKycStatusBadge(user?.kycStatus).label}
                    </Badge>
                    {user?.kycStatus !== 'approved' && (
                      <Link href="/account/kyc">
                        <Button variant="outline" size="sm" data-testid="button-verify-kyc">
                          {user?.kycStatus === 'pending'
                            ? t('website.profile.submitKYC', 'Submit KYC')
                            : t('website.profile.viewStatus', 'View Status')}
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-1">
                  <div>
                    <div className="mb-1 text-xs text-muted-foreground">
                      {t('website.profile.referralBalance', 'Referral Balance')}
                    </div>
                    <div className="text-xl font-bold text-teal-600">
                      ${user?.referralBalance || '0.00'}
                    </div>
                  </div>
                  {user?.createdAt && (
                    <div className="text-xs text-muted-foreground">
                      {t('website.profile.memberSince', 'Member since')}: {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              {user?.kycStatus === 'rejected' && user?.kycRejectionReason && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="font-medium text-destructive mb-1">
                    {t('website.profile.kycRejectionReason', 'KYC Rejection Reason')}
                  </div>
                  <div className="text-sm">{user.kycRejectionReason}</div>
                </div>
              )}

            </CardContent>
          </Card>

          {/* Profile Information Form */}
          <Card>
            <CardHeader>
              <CardTitle>{t('website.profile.profileInfo', 'Profile Information')}</CardTitle>
              <CardDescription>
                {t('website.profile.profileInfoDesc', 'Update your personal details')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('website.profile.fullName', 'Full Name')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('website.profile.namePlaceholder', 'John Doe')}
                            {...field}
                            data-testid="input-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('website.profile.phoneNumber', 'Phone Number')}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder={t('website.profile.phonePlaceholder', '+1 234 567 8900')}
                              className="pl-10"
                              {...field}
                              type="tel"
                              inputMode="numeric"
                              maxLength={12}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                field.onChange(value);
                              }}
                              data-testid="input-phone"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2 xl:col-span-3">
                        <FormLabel>{t('website.profile.address', 'Address')}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Textarea
                              placeholder={t(
                                'website.profile.addressPlaceholder',
                                '123 Main St, City, Country',
                              )}
                              className="pl-10 min-h-20"
                              {...field}
                              data-testid="input-address"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="destination"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex h-5 items-center">
                          {t('website.profile.country', 'Country')}
                        </FormLabel>

                        <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className="h-10 w-full justify-between"
                            >
                              {field.value
                                ? destinations?.find((d: any) => d.id === field.value)?.name
                                : t('website.profile.selectCountry', 'Select country')}
                              <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>

                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Search country..." />
                              <CommandEmpty>No country found.</CommandEmpty>
                              <CommandList>
                                {destinations?.map((country: any) => (
                                  <CommandItem
                                    key={country.id}
                                    value={country.name}
                                    onSelect={() => {
                                      field.onChange(country.id);
                                      setCountryOpen(false); // ✅ auto close
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        field.value === country.id ? 'opacity-100' : 'opacity-0',
                                      )}
                                    />
                                    <ReactCountryFlag
                                      svg
                                      countryCode={country.countryCode}
                                      style={{ width: '1.25em', height: '1.25em' }}
                                      className="mr-2"
                                    />
                                    {country.name}
                                  </CommandItem>
                                ))}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex h-5 items-center">
                          {t('website.profile.currency', 'Currency')}
                        </FormLabel>

                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className="h-10 w-full justify-between"
                            >
                              {field.value
                                ? currencies?.find((c: any) => c.id === field.value)?.code
                                : t('website.profile.selectCurrency', 'Select currency')}
                              <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>

                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Search currency..." />
                              <CommandEmpty>No currency found.</CommandEmpty>
                              <CommandList>
                                {currencies?.map((currency: any) => (
                                  <CommandItem
                                    key={currency.id}
                                    value={currency.code}
                                    onSelect={() => field.onChange(currency.id)}
                                  >
                                    <Check
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        field.value === currency.id ? 'opacity-100' : 'opacity-0',
                                      )}
                                    />
                                    {currency.symbol} {currency.code} — {currency.name}
                                  </CommandItem>
                                ))}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {canManageWhatsapp && (
                    <FormField
                      control={form.control}
                      name="whatsappNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex h-5 items-center gap-2 whitespace-nowrap">
                            <MessageCircle className="h-4 w-4 text-green-500" />
                            WhatsApp Support Number
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="+971501234567"
                              className="h-10"
                              {...field}
                              data-testid="input-whatsapp-number"
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            Customers will use this number to contact you on WhatsApp for support.
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      className="bg-teal-500 hover:bg-teal-600 text-white"
                      data-testid="button-save-profile"
                    >
                      {updateProfileMutation.isPending
                        ? t('website.profile.saving', 'Saving...')
                        : t('website.profile.saveChanges', 'Save Changes')}
                    </Button>
                    <Link href="/my-orders">
                      <Button type="button" variant="outline" data-testid="button-cancel">
                        {t('website.common.cancel', 'Cancel')}
                      </Button>
                    </Link>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                {t('website.profile.notificationPreferences', 'Notification Preferences')}
              </CardTitle>
              <CardDescription>
                {t(
                  'website.profile.notificationPreferencesDesc',
                  'Manage how you receive alerts about your eSIMs',
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="flex min-h-[136px] items-start justify-between gap-4 rounded-lg border p-4">
                <div className="min-w-0 flex-1">
                  <Label htmlFor="notify-low-data" className="font-medium cursor-pointer">
                    {t('website.profile.lowDataAlerts', 'Low Data Alerts')}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t(
                      'website.profile.lowDataAlertsDesc',
                      'Receive email notifications when your eSIM reaches 75% or 90% data usage',
                    )}
                  </p>
                </div>
                <Switch
                  id="notify-low-data"
                  checked={notifyLowData}
                  onCheckedChange={(value) => handleNotificationChange('notifyLowData', value)}
                  disabled={updateNotificationsMutation.isPending}
                  data-testid="switch-notify-low-data"
                />
              </div>

              <div className="flex min-h-[136px] items-start justify-between gap-4 rounded-lg border p-4">
                <div className="min-w-0 flex-1">
                  <Label htmlFor="notify-expiring" className="font-medium cursor-pointer">
                    {t('website.profile.expiryAlerts', 'Expiry Alerts')}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t(
                      'website.profile.expiryAlertsDesc',
                      'Get notified when your eSIM is about to expire (3 days and 1 day before expiration)',
                    )}
                  </p>
                </div>
                <Switch
                  id="notify-expiring"
                  checked={notifyExpiring}
                  onCheckedChange={(value) => handleNotificationChange('notifyExpiring', value)}
                  disabled={updateNotificationsMutation.isPending}
                  data-testid="switch-notify-expiring"
                />
              </div>

              {/* Info */}
              <div className="flex min-h-[136px] gap-3 rounded-lg bg-teal-50 p-4 dark:bg-teal-950/30 md:col-span-2 xl:col-span-1">
                <AlertCircle className="h-5 w-5 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    {t(
                      'website.profile.notificationInfo',
                      'These notifications help you manage your data usage and avoid service interruptions. You can change these preferences at any time.',
                    )}
                  </p>
                </div>
              </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>{t('website.profile.quickActions', 'Quick Actions')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <Link href="/account/orders">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  data-testid="link-orders"
                >
                  <User className="h-4 w-4 mr-2" />
                  {t('website.profile.viewMyOrders', 'View My Orders')}
                </Button>
              </Link>
              <a target="_blank" rel="noopener noreferrer" href="/account/support">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  data-testid="link-support"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  {t('website.profile.contactSupport', 'Contact Support')}
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
