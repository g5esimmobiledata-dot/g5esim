import { lazy, Suspense } from 'react';
import { Switch, Route, Redirect } from 'wouter';
import { AdminLayout } from './AdminLayout';
import AdminPriceBrackets from '@/pages/admin/AdminPriceBrackets';

const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminStatistics = lazy(() => import('@/pages/admin/AdminStatistics'));
const OrderManagement = lazy(() => import('@/pages/admin/OrderManagement'));
const AdminOrderEsim = lazy(() => import('@/pages/admin/AdminOrderEsim'));
const CustomEsimOrders = lazy(() => import('@/pages/admin/CustomEsimOrders'));
const CustomerManagement = lazy(() => import('@/pages/admin/CustomerManagement'));
const KYCManagement = lazy(() => import('@/pages/admin/KYCManagement'));
const PackageManagement = lazy(() => import('@/pages/admin/PackageManagement'));
const TicketManagement = lazy(() => import('@/pages/admin/TicketManagement'));
const AdminConcierge = lazy(() => import('@/pages/admin/AdminConcierge'));
const AdminSipConfiguration = lazy(() => import('@/pages/admin/AdminSipConfiguration'));
const AdminSipUsers = lazy(() => import('@/pages/admin/AdminSipUsers'));
const AdminSipUserForm = lazy(() => import('@/pages/admin/AdminSipUserForm'));
const AdminSipTariffs = lazy(() => import('@/pages/admin/AdminSipTariffs'));
const AdminSipOriginationDestinations = lazy(() => import('@/pages/admin/AdminSipOriginationDestinations'));
const AdminSipTariffForm = lazy(() => import('@/pages/admin/AdminSipTariffForm'));
const AdminSipRateGroupForm = lazy(() => import('@/pages/admin/AdminSipRateGroupForm'));
const AdminSipRegistrationProfiles = lazy(() => import('@/pages/admin/AdminSipRegistrationProfiles'));
const AdminSipRegistrationProfileForm = lazy(() => import('@/pages/admin/AdminSipRegistrationProfileForm'));
const Analytics = lazy(() => import('@/pages/admin/Analytics'));
const ApiDocs = lazy(() => import('@/pages/admin/ApiDocs'));
const Settings = lazy(() => import('@/pages/admin/Settings'));
const Providers = lazy(() => import('@/pages/admin/Providers'));
const UnifiedPackages = lazy(() => import('@/pages/admin/Packages'));
const MasterTopups = lazy(() => import('@/pages/admin/MasterTopups'));
const MasterRegions = lazy(() => import('@/pages/admin/MasterRegions'));
const MasterCountries = lazy(() => import('@/pages/admin/MasterCountries'));
const AdminTopupsPage = lazy(() => import('@/pages/admin/Topups'));
const NotificationHistory = lazy(() => import('@/pages/admin/NotificationHistory'));
const EmailTemplates = lazy(() => import('@/pages/admin/EmailTemplates'));
const AdminReviews = lazy(() => import('@/pages/admin/AdminReviews'));
const AdminReferrals = lazy(() => import('@/pages/admin/AdminReferrals'));
const AdminBlog = lazy(() => import('@/pages/admin/AdminBlog'));
const AdminEnterprise = lazy(() => import('@/pages/admin/AdminEnterprise'));
const AdminGiftCards = lazy(() => import('@/pages/admin/AdminGiftCards'));
const AdminAdvancedAnalytics = lazy(() => import('@/pages/admin/AdminAnalytics'));
const AdminEmailMarketing = lazy(() => import('@/pages/admin/AdminEmailMarketing'));
const AdminVouchers = lazy(() => import('@/pages/admin/AdminVouchers'));
const AdminMemberRewards = lazy(() => import('@/pages/admin/AdminMemberRewards'));
const FailoverSettings = lazy(() => import('@/pages/admin/FailoverSettings'));
const AdminCurrencies = lazy(() => import('@/pages/admin/Currencies'));
const AdminLanguages = lazy(() => import('@/pages/admin/AdminLanguages'));
const AdminTranslations = lazy(() => import('@/pages/admin/AdminTranslations'));
const BannerManagement = lazy(() => import('@/pages/admin/BannerManagement'));
const PagesManagement = lazy(() => import('@/pages/admin/PagesManagement'));
const FaqManagement = lazy(() => import('@/pages/admin/FaqManagement'));
const PaymentGatewayManagement = lazy(() => import('@/pages/admin/PaymentGatewayManagement'));
const AdminRates = lazy(() => import('@/pages/admin/AdminRates'));
const AdminInvoices = lazy(() => import('@/pages/admin/AdminInvoices'));
const AdminOptions = lazy(() => import('@/pages/admin/AdminOptions'));
const AdminModules = lazy(() => import('@/pages/admin/AdminModules'));
const AdminVirtualNumbers = lazy(() => import('@/pages/admin/AdminVirtualNumbers'));
const AdminTransactions = lazy(() => import('@/pages/admin/AdminTransactions'));
const AdminDebitCards = lazy(() => import('@/pages/admin/AdminDebitCards'));
const AdminSudoAfricaCards = lazy(() => import('@/pages/admin/AdminSudoAfricaCards'));
const AdminIptv = lazy(() => import('@/pages/admin/AdminIptv'));
const AdminIptvProvider = lazy(() => import('@/pages/admin/AdminIptvProvider'));
const AdminIptvProviderPackages = lazy(() => import('@/pages/admin/AdminIptvProviderPackages'));
const AdminIptvUsers = lazy(() => import('@/pages/admin/AdminIptvUsers'));
const AdminIptvChannels = lazy(() => import('@/pages/admin/AdminIptvChannels'));
const AdminIptvOrders = lazy(() => import('@/pages/admin/AdminIptvOrders'));
const SecurityCenter = lazy(() => import('@/pages/SecurityCenter'));

export default function AdminShell() {
  return (
    <AdminLayout>
      <Suspense fallback={<div className="p-6 dark:text-white">Loading...</div>}>
        <Switch>
          {/* default */}
          <Route path="/admin">
            <Redirect to="/admin/dashboard" />
          </Route>

          <Route path="/admin/dashboard" component={AdminDashboard} />
          <Route path="/admin/statistics" component={AdminStatistics} />

          {/* ✅ MOST SPECIFIC FIRST */}
          <Route path="/admin/orders" component={OrderManagement} />
          <Route path="/admin/manual-orders" component={CustomEsimOrders} />
          <Route path="/admin/purchase-orders" component={AdminOrderEsim} />

          <Route path="/admin/customers/users/create">
            <CustomerManagement
              roleFilter="customer"
              title="User Management"
              description="View and manage regular platform users"
              createMode
            />
          </Route>
          <Route path="/admin/customers/users/:customerId/customer-details">
            {(params) => (
              <CustomerManagement
                roleFilter="customer"
                title="User Management"
                description="View and manage regular platform users"
                detailsCustomerId={params.customerId}
                detailsView="customerDetails"
              />
            )}
          </Route>
          <Route path="/admin/customers/users/:customerId">
            {(params) => (
              <CustomerManagement
                roleFilter="customer"
                title="User Management"
                description="View and manage regular platform users"
                detailsCustomerId={params.customerId}
              />
            )}
          </Route>
          <Route path="/admin/customers/users">
            <CustomerManagement
              roleFilter="customer"
              title="User Management"
              description="View and manage regular platform users"
            />
          </Route>
          <Route path="/admin/customers/agents/create">
            <CustomerManagement
              roleFilter="agent"
              title="Agent Management"
              description="View and manage Agent Accounts"
              createMode
            />
          </Route>
          <Route path="/admin/customers/agents/:customerId/customer-details">
            {(params) => (
              <CustomerManagement
                roleFilter="agent"
                title="Agent Management"
                description="View and manage Agent Accounts"
                detailsCustomerId={params.customerId}
                detailsView="customerDetails"
              />
            )}
          </Route>
          <Route path="/admin/customers/agents/:customerId">
            {(params) => (
              <CustomerManagement
                roleFilter="agent"
                title="Agent Management"
                description="View and manage Agent Accounts"
                detailsCustomerId={params.customerId}
              />
            )}
          </Route>
          <Route path="/admin/customers/agents">
            <CustomerManagement
              roleFilter="agent"
              title="Agent Management"
              description="View and manage Agent Accounts"
            />
          </Route>
          <Route path="/admin/customers/resellers/create">
            <CustomerManagement
              roleFilter="reseller"
              title="Reseller Management"
              description="View and manage Reseller Accounts"
              createMode
            />
          </Route>
          <Route path="/admin/customers/resellers/:customerId/customer-details">
            {(params) => (
              <CustomerManagement
                roleFilter="reseller"
                title="Reseller Management"
                description="View and manage Reseller Accounts"
                detailsCustomerId={params.customerId}
                detailsView="customerDetails"
              />
            )}
          </Route>
          <Route path="/admin/customers/resellers/:customerId">
            {(params) => (
              <CustomerManagement
                roleFilter="reseller"
                title="Reseller Management"
                description="View and manage Reseller Accounts"
                detailsCustomerId={params.customerId}
              />
            )}
          </Route>
          <Route path="/admin/customers/resellers">
            <CustomerManagement
              roleFilter="reseller"
              title="Reseller Management"
              description="View and manage Reseller Accounts"
            />
          </Route>
          <Route path="/admin/customers">
            <Redirect to="/admin/customers/users" />
          </Route>
          <Route path="/admin/kyc" component={KYCManagement} />
          <Route path="/admin/security/2fa">
            <SecurityCenter section="2fa" />
          </Route>
          <Route path="/admin/security/ip-logs">
            <SecurityCenter section="ip-logs" />
          </Route>
          <Route path="/admin/security">
            <Redirect to="/admin/security/2fa" />
          </Route>
          <Route path="/admin/packages" component={PackageManagement} />
          <Route path="/admin/tickets" component={TicketManagement} />
          <Route path="/admin/concierge" component={AdminConcierge} />
          <Route path="/admin/sip-users/create">
            <AdminSipUserForm mode="create" />
          </Route>
          <Route path="/admin/sip-users/:sipUserId/edit">
            {(params) => <AdminSipUserForm mode="edit" accountId={params.sipUserId} />}
          </Route>
          <Route path="/admin/sip-users" component={AdminSipUsers} />
          <Route path="/admin/sip-configuration/tariffs/create">
            <AdminSipTariffForm mode="create" />
          </Route>
          <Route path="/admin/sip-configuration/tariffs/rate-groups/create">
            <AdminSipRateGroupForm mode="create" />
          </Route>
          <Route path="/admin/sip-configuration/tariffs/rate-groups/:groupId/edit">
            {(params) => <AdminSipRateGroupForm mode="edit" groupId={params.groupId} />}
          </Route>
          <Route path="/admin/sip-configuration/tariffs/internal/:tariffId">
            {(params) => (
              <AdminSipOriginationDestinations
                tariffId={params.tariffId}
                config={{
                  tariffType: 'internal',
                  parentKind: 'internal_tariff',
                  destinationKind: 'internal_destination',
                  routeSegment: 'internal',
                  tariffLabel: 'Internal Tariff',
                  exportLabel: 'Internal Rates',
                  filePrefix: 'Internal_Rates',
                }}
              />
            )}
          </Route>
          <Route path="/admin/sip-configuration/tariffs/origination/:tariffId">
            {(params) => <AdminSipOriginationDestinations tariffId={params.tariffId} />}
          </Route>
          <Route path="/admin/sip-configuration/tariffs/:tariffId/edit">
            {(params) => <AdminSipTariffForm mode="edit" tariffId={params.tariffId} />}
          </Route>
          <Route path="/admin/sip-configuration/tariffs" component={AdminSipTariffs} />
          <Route path="/admin/sip-configuration/registration-profiles/create">
            <AdminSipRegistrationProfileForm mode="create" />
          </Route>
          <Route path="/admin/sip-configuration/registration-profiles/:profileId/edit">
            {(params) => <AdminSipRegistrationProfileForm mode="edit" profileId={params.profileId} />}
          </Route>
          <Route path="/admin/sip-configuration/registration-profiles" component={AdminSipRegistrationProfiles} />
          <Route path="/admin/sip-configuration" component={AdminSipConfiguration} />
          <Route path="/admin/analytics" component={Analytics} />
          <Route path="/admin/api-docs" component={ApiDocs} />
          <Route path="/admin/settings" component={Settings} />
          <Route path="/admin/modules" component={AdminModules} />
          <Route path="/admin/settings/modules" component={AdminModules} />
          <Route path="/admin/options" component={AdminOptions} />
          <Route path="/admin/transactions/vonage">
            <AdminTransactions mode="vonage" virtualProviderSlug="vonage" />
          </Route>
          <Route path="/admin/transactions/virtual/all">
            <AdminTransactions mode="vonage" virtualProviderSlug="all" />
          </Route>
          <Route path="/admin/transactions/virtual/:providerSlug">
            {(params) => <AdminTransactions mode="vonage" virtualProviderSlug={params.providerSlug} />}
          </Route>
          <Route path="/admin/transactions/customers">
            <AdminTransactions mode="customers" />
          </Route>
          <Route path="/admin/transactions/vouchers">
            <AdminTransactions mode="vouchers" />
          </Route>
          <Route path="/admin/transactions/esim/all">
            <AdminTransactions mode="esim" providerSlug="all" />
          </Route>
          <Route path="/admin/transactions/esim/airalo">
            <AdminTransactions mode="esim" providerSlug="airalo" />
          </Route>
          <Route path="/admin/transactions/esim/esim-go">
            <AdminTransactions mode="esim" providerSlug="esim-go" />
          </Route>
          <Route path="/admin/transactions/esim/esim-access">
            <AdminTransactions mode="esim" providerSlug="esim-access" />
          </Route>
          <Route path="/admin/transactions/esim/:providerSlug">
            {(params) => <AdminTransactions mode="esim" providerSlug={params.providerSlug} />}
          </Route>
          <Route path="/admin/transactions">
            <Redirect to="/admin/transactions/vonage" />
          </Route>
          <Route path="/admin/virtual-numbers/dashboard">
            <AdminVirtualNumbers section="dashboard" />
          </Route>
          <Route path="/admin/virtual-numbers/providers">
            <AdminVirtualNumbers section="providers" />
          </Route>
          <Route path="/admin/virtual-numbers/numbers/:countryCode">
            <AdminVirtualNumbers section="country-numbers" />
          </Route>
          <Route path="/admin/virtual-numbers/numbers">
            <AdminVirtualNumbers section="numbers" />
          </Route>
          <Route path="/admin/virtual-numbers/bought-dids">
            <AdminVirtualNumbers section="bought-dids" />
          </Route>
          <Route path="/admin/virtual-numbers/pricing/:msisdn">
            <AdminVirtualNumbers section="pricing" />
          </Route>
          <Route path="/admin/virtual-numbers/cost-price">
            <AdminVirtualNumbers section="cost-price" />
          </Route>
          <Route path="/admin/virtual-numbers/logs">
            <AdminVirtualNumbers section="logs" />
          </Route>
          <Route path="/admin/virtual-numbers/pending">
            <AdminVirtualNumbers section="pending" />
          </Route>
          <Route path="/admin/virtual-numbers/active">
            <AdminVirtualNumbers section="active" />
          </Route>
          <Route path="/admin/virtual-numbers">
            <Redirect to="/admin/virtual-numbers/dashboard" />
          </Route>
          <Route path="/admin/debit-cards/sudo-africa" component={AdminSudoAfricaCards} />
          <Route path="/admin/debit-cards" component={AdminDebitCards} />
          <Route path="/admin/iptv/provider" component={AdminIptvProvider} />
          <Route path="/admin/iptv/bouquets">
            <AdminIptvProviderPackages mode="bouquets" />
          </Route>
          <Route path="/admin/iptv/cost-price">
            <AdminIptvProviderPackages mode="cost-price" />
          </Route>
          <Route path="/admin/iptv/channels" component={AdminIptvChannels} />
          <Route path="/admin/iptv/orders" component={AdminIptvOrders} />
          <Route path="/admin/iptv/users" component={AdminIptvUsers} />
          <Route path="/admin/iptv/settings" component={AdminIptv} />
          <Route path="/admin/iptv" component={AdminIptv} />
          <Route path="/admin/providers" component={Providers} />
          <Route path="/admin/unified-packages" component={UnifiedPackages} />
          <Route path="/admin/master-topups" component={MasterTopups} />
          <Route path="/admin/master-regions" component={MasterRegions} />
          <Route path="/admin/master-countries" component={MasterCountries} />
          <Route path="/admin/topups" component={AdminTopupsPage} />
          <Route path="/admin/push-notifications" component={NotificationHistory} />
          <Route path="/admin/notifications" component={NotificationHistory} />
          <Route path="/admin/email-templates" component={EmailTemplates} />
          <Route path="/admin/reviews" component={AdminReviews} />
          <Route path="/admin/referrals" component={AdminReferrals} />
          <Route path="/admin/member-rewards" component={AdminMemberRewards} />
          <Route path="/admin/blog" component={AdminBlog} />
          <Route path="/admin/enterprise" component={AdminEnterprise} />
          <Route path="/admin/gift-cards" component={AdminGiftCards} />
          <Route path="/admin/advanced-analytics" component={AdminAdvancedAnalytics} />
          <Route path="/admin/email-marketing" component={AdminEmailMarketing} />
          <Route path="/admin/vouchers/create">
            <AdminVouchers createOnly />
          </Route>
          <Route path="/admin/vouchers" component={AdminVouchers} />
          <Route path="/admin/failover-settings" component={FailoverSettings} />
          <Route path="/admin/currencies" component={AdminCurrencies} />
          <Route path="/admin/languages" component={AdminLanguages} />
          <Route path="/admin/translations" component={AdminTranslations} />
          <Route path="/admin/banner-management" component={BannerManagement} />
          <Route path="/admin/pages" component={PagesManagement} />
          <Route path="/admin/faq-management" component={FaqManagement} />
          <Route path="/admin/payment-gateway/create" component={PaymentGatewayManagement} />
          <Route path="/admin/payment-gateway/:gatewayId/edit" component={PaymentGatewayManagement} />
          <Route path="/admin/payment-gateway" component={PaymentGatewayManagement} />
          <Route path="/admin/price-brackets" component={AdminPriceBrackets} />
          <Route path="/admin/rates" component={AdminRates} />
          <Route path="/admin/invoices" component={AdminInvoices} />
        </Switch>
      </Suspense>
    </AdminLayout>
  );
}
