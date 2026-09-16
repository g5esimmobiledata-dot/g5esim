import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bell, Check, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from '@/contexts/TranslationContext';

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  metadata: Record<string, any> | null;
  createdAt: string;
}

export default function Notifications() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['/api/notifications', 'v2'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/notifications');
      return res.json();
    },
    select: (res: any) => ({
      notifications: res?.data?.notifications ?? [],
      unreadCount: res?.data?.unreadCount ?? 0,
    }),
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  // Filter notifications based on selected filters
  const filteredNotifications = notifications.filter((notification) => {
    if (typeFilter !== 'all' && notification.type !== typeFilter) return false;
    if (statusFilter === 'unread' && notification.read) return false;
    if (statusFilter === 'read' && !notification.read) return false;
    return true;
  });

  // Paginate filtered results
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleFilterChange = (filterType: 'status' | 'type', value: string) => {
    if (filterType === 'status') {
      setStatusFilter(value);
    } else {
      setTypeFilter(value);
    }
    setCurrentPage(1);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await apiRequest('PATCH', `/api/notifications/${notificationId}/read`, {});
      await queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    } catch (error) {
      toast({
        title: t('common.error', 'Error'),
        description: t('notifications.markAsReadFailed', 'Failed to mark notification as read'),
        variant: 'destructive',
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiRequest('PATCH', '/api/notifications/read-all', {});
      await queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: t('common.success', 'Success'),
        description: t('notifications.allMarkedAsRead', 'All notifications marked as read'),
      });
    } catch (error) {
      toast({
        title: t('common.error', 'Error'),
        description: t(
          'notifications.markAllAsReadFailed',
          'Failed to mark all notifications as read',
        ),
        variant: 'destructive',
      });
    }
  };

  const getNotificationTypeColor = (type: string) => {
    switch (type) {
      case 'welcome':
        return 'bg-primary/10 text-primary';
      case 'purchase':
      case 'installation':
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'topup':
        return 'bg-teal-500/10 text-teal-700 dark:text-teal-400';
      case 'expiring':
      case 'expired':
        return 'bg-orange-500/10 text-orange-700 dark:text-orange-400';
      case 'ticket_reply':
        return 'bg-teal-500/10 text-teal-700 dark:text-teal-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <>
      <Helmet>
        <title>Notifications | eSIM Global</title>
        <meta
          name="description"
          content="View all your notifications and stay updated on your eSIM Orders, top-ups, and support tickets."
        />
      </Helmet>

      <div className="min-h-screen flex flex-col  ">
        {/* <SiteHeader /> */}
        <main className="flex-1 bg-background ">
          <div className="container mx-auto px-4 py-8 max-w-4xl pt-[100px] md:pt-[150px]">
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1
                    className="text-3xl font-semibold mb-2 text-foreground"
                    data-testid="text-page-title"
                  >
                    {t('notifications.title', 'Notifications')}
                  </h1>
                  <p className="text-muted-foreground" data-testid="text-page-description">
                    {t(
                      'notifications.description',
                      'Stay updated on your eSIM orders, top-ups, and support tickets',
                    )}
                  </p>
                </div>
                {unreadCount > 0 && (
                  <Button onClick={handleMarkAllAsRead} data-testid="button-mark-all-read-page">
                    <Check className="h-4 w-4 mr-2" />
                    {t('notifications.markAllAsRead', 'Mark all as read')}
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {t('notifications.filters', 'Filters:')}
                  </span>
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  <SelectTrigger
                    className="w-40 text-foreground"
                    data-testid="select-status-filter"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t('notifications.allStatus', 'All Status')}
                    </SelectItem>
                    <SelectItem value="unread">
                      {t('notifications.unreadOnly', 'Unread Only')}
                    </SelectItem>
                    <SelectItem value="read">{t('notifications.readOnly', 'Read Only')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={typeFilter}
                  onValueChange={(value) => handleFilterChange('type', value)}
                >
                  <SelectTrigger className="w-48 text-foreground" data-testid="select-type-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('notifications.allTypes', 'All Types')}</SelectItem>
                    <SelectItem value="welcome">
                      {t('notifications.type.welcome', 'Welcome')}
                    </SelectItem>
                    <SelectItem value="purchase">
                      {t('notifications.type.purchase', 'Purchase')}
                    </SelectItem>
                    <SelectItem value="installation">
                      {t('notifications.type.installation', 'Installation')}
                    </SelectItem>
                    <SelectItem value="topup">{t('notifications.type.topup', 'Top-up')}</SelectItem>
                    <SelectItem value="expiring">
                      {t('notifications.type.expiring', 'Expiring')}
                    </SelectItem>
                    <SelectItem value="ticket_reply">
                      {t('notifications.type.ticketReply', 'Ticket Reply')}
                    </SelectItem>
                    <SelectItem value="custom">
                      {t('notifications.type.custom', 'Custom')}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {(typeFilter !== 'all' || statusFilter !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTypeFilter('all');
                      setStatusFilter('all');
                      setCurrentPage(1);
                    }}
                    data-testid="button-clear-filters"
                  >
                    {t('notifications.clearFilters', 'Clear filters')}
                  </Button>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {t('notifications.loading', 'Loading notifications...')}
                </p>
              </div>
            ) : notifications.length === 0 ? (
              <Card className="p-12">
                <div className="text-center">
                  <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2" data-testid="text-no-notifications">
                    {t('notifications.noNotifications', 'No notifications yet')}
                  </h3>
                  <p className="text-muted-foreground">
                    {t(
                      'notifications.noNotificationsDesc',
                      "You'll see notifications here when there's activity on your account",
                    )}
                  </p>
                </div>
              </Card>
            ) : filteredNotifications.length === 0 ? (
              <Card className="p-12">
                <div className="text-center">
                  <Filter className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2" data-testid="text-no-match-filters">
                    {t('notifications.noMatch', 'No notifications match your filters')}
                  </h3>
                  <p className="text-muted-foreground mb-4" data-testid="text-filter-help">
                    {t(
                      'notifications.tryAdjusting',
                      'Try adjusting your filters to see more results',
                    )}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTypeFilter('all');
                      setStatusFilter('all');
                      setCurrentPage(1);
                    }}
                    data-testid="button-clear-all-filters"
                  >
                    {t('notifications.clearAllFilters', 'Clear all filters')}
                  </Button>
                </div>
              </Card>
            ) : (
              <>
                <div className="space-y-3">
                  {paginatedNotifications.map((notification) => (
                    <Card
                      key={notification.id}
                      className={`p-4 hover-elevate transition-all ${
                        !notification.read ? 'bg-accent/10' : ''
                      }`}
                      data-testid={`notification-card-${notification.id}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3
                              className={`text-base font-medium ${
                                !notification.read ? 'font-semibold' : ''
                              }`}
                              data-testid={`notification-title-${notification.id}`}
                            >
                              {notification.title}
                            </h3>
                            <Badge
                              variant="secondary"
                              className={getNotificationTypeColor(notification.type)}
                              data-testid={`notification-type-${notification.id}`}
                            >
                              {notification.type}
                            </Badge>
                            {!notification.read && (
                              <div
                                className="h-2 w-2 rounded-full bg-primary flex-shrink-0"
                                data-testid={`notification-unread-indicator-${notification.id}`}
                              />
                            )}
                          </div>
                          <p
                            className="text-sm text-muted-foreground mb-3"
                            data-testid={`notification-message-${notification.id}`}
                          >
                            {notification.message}
                          </p>
                          <p
                            className="text-xs text-muted-foreground"
                            data-testid={`notification-time-${notification.id}`}
                          >
                            {formatDistanceToNow(new Date(notification.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsRead(notification.id)}
                            data-testid={`button-mark-read-${notification.id}`}
                          >
                            {t('notifications.markAsRead', 'Mark as read')}
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-6 border-t">
                    <p className="text-sm text-muted-foreground">
                      {t(
                        'notifications.showing',
                        'Showing {{start}}-{{end}} of {{total}} notifications',
                        {
                          start: startIndex + 1,
                          end: Math.min(endIndex, filteredNotifications.length),
                          total: filteredNotifications.length,
                        },
                      )}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        data-testid="button-prev-page"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        {t('notifications.previous', 'Previous')}
                      </Button>
                      <span className="text-sm font-medium">
                        {t('notifications.pageOf', 'Page {{current}} of {{total}}', {
                          current: currentPage,
                          total: totalPages,
                        })}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        data-testid="button-next-page"
                      >
                        {t('notifications.next', 'Next')}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
        {/* <SiteFooter /> */}
      </div>
    </>
  );
}
