import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useState } from 'react';

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

export function NotificationBell() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  // Fetch notifications with auto-refresh every 30 seconds
  const { data, isLoading } = useQuery<{
    notifications: Notification[];
    unreadCount: number;
  }>({
    queryKey: ['/api/notifications'],
    refetchInterval: 30000, // 30 seconds
  });

  const notifications = data?.notifications || [];
  const unreadCount = notifications?.filter((n: { read: any }) => !n.read).length || 0;

  // Get recent 5 notifications
  const recentNotifications = notifications.slice(0, 5);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await apiRequest('PATCH', `/api/notifications/${notificationId}/read`, {});
      await queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read',
        variant: 'destructive',
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiRequest('PATCH', '/api/notifications/read-all', {});
      await queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to mark all notifications as read',
        variant: 'destructive',
      });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
          <Bell className="h-5 w-5 text-foreground" />
          {unreadCount > 0 && (
            <span
              className="
              absolute 
              -top-1 
              -right-1
              h-4 
              min-w-4 
              px-1 
              text-[10px] 
              flex 
              items-center 
              justify-center 
              rounded-full 
              bg-destructive 
              text-white 
              font-medium
            "
              data-testid="badge-unread-count"
            >
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" data-testid="popover-notifications">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-base" data-testid="text-notifications-title">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              data-testid="button-mark-all-read"
            >
              Mark all as read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : recentNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground" data-testid="text-no-notifications">
                No notifications yet
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {recentNotifications.map(
                (notification: {
                  id: Key | null | undefined;
                  read: any;
                  title:
                    | string
                    | number
                    | boolean
                    | ReactElement<any, string | JSXElementConstructor<any>>
                    | Iterable<ReactNode>
                    | ReactPortal
                    | null
                    | undefined;
                  message:
                    | string
                    | number
                    | boolean
                    | ReactElement<any, string | JSXElementConstructor<any>>
                    | Iterable<ReactNode>
                    | ReactPortal
                    | null
                    | undefined;
                  createdAt: string | number | Date;
                }) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover-elevate cursor-pointer transition-colors ${
                      !notification.read ? 'bg-muted/50' : ''
                    }`}
                    onClick={() => {
                      if (!notification.read) {
                        handleMarkAsRead(notification.id);
                      }
                    }}
                    data-testid={`notification-item-${notification.id}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4
                        className={`text-sm font-medium ${
                          !notification.read ? 'font-semibold' : ''
                        }`}
                        data-testid={`notification-title-${notification.id}`}
                      >
                        {notification.title}
                      </h4>
                      {!notification.read && (
                        <div
                          className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1"
                          data-testid={`notification-unread-indicator-${notification.id}`}
                        />
                      )}
                    </div>
                    <p
                      className="text-sm text-muted-foreground mb-2 line-clamp-2"
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
                ),
              )}
            </div>
          )}
        </ScrollArea>

        {recentNotifications.length > 0 && (
          <div className="p-3 border-t">
            <Link href="/notifications">
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setOpen(false)}
                data-testid="button-view-all-notifications"
              >
                View all notifications
              </Button>
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
