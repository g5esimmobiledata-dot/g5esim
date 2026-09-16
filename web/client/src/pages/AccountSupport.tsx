import { useState, useEffect, useRef } from 'react';
import {
  Send,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Headphones,
  Plus,
  Mail,
  MessageCircle,
  BookOpen,
  RefreshCw,
  PhoneCall,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useTranslation } from '@/contexts/TranslationContext';
import { connectSocket } from '@/socket/socket';
import { useRoleModuleAccess } from '@/hooks/useRoleModuleAccess';
import { useUser } from '@/hooks/use-user';
import { useConcierge } from '@/hooks/useConcierge';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import { getConciergePricingLabel, isWhatsAppSupportAvailable } from '@/lib/supportAvailability';
import { ConciergeAccessCard } from '@/components/support/ConciergeAccessCard';
import { WhatsAppChatDialog } from '@/components/support/WhatsAppChatDialog';

interface Message {
  id: string;
  ticketId: string;
  senderId: string;
  senderType: string;
  senderName: string;
  message: string;
  isInternal: boolean;
  createdAt: string;
}

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  userId: string;
  userName: string;
  assignedToName?: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
}

type PublicSettings = {
  support_whatsapp_number?: string;
  support_whatsapp_enabled?: string;
  support_whatsapp_mode?: string;
  support_whatsapp_schedule_enabled?: string;
  support_whatsapp_start_time?: string;
  support_whatsapp_end_time?: string;
  support_whatsapp_working_days?: string;
  timezone?: string;
  concierge_enabled?: string;
  concierge_pricing_mode?: string;
  concierge_billing_cycle?: string;
  concierge_fee?: string;
  concierge_trial_enabled?: string;
  concierge_trial_days?: string;
  concierge_features?: string;
  concierge_hotline_enabled?: string;
  concierge_hotline_label?: string;
  concierge_hotline_number?: string;
  concierge_hotline_url?: string;
  concierge_sip_enabled?: string;
  concierge_sip_label?: string;
};

type StorefrontInfo = {
  whatsappNumber?: string | null;
};

type WhatsAppThread = {
  enabled: boolean;
  mode: 'link' | 'cloud_api';
  phoneNumber: string;
  hasCloudApi: boolean;
  userPhone: string;
  messages: Array<{
    id: string;
    direction: 'inbound' | 'outbound';
    fromNumber: string;
    toNumber: string;
    text: string;
    status: string;
    createdAt: string;
  }>;
};

type ConciergeSipInfo = {
  enabled: boolean;
  label: string;
  uri?: string | null;
};

export default function AccountSupport() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user } = useUser();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [liveMessages, setLiveMessages] = useState<Message[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [sipCalling, setSipCalling] = useState(false);

  interface PaginatedTickets {
    data: Ticket[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }

  const [createFormData, setCreateFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
  });
  const { enabled: conciergeEnabled } = useRoleModuleAccess('concierge');

  // Fetch user's tickets - uses default queryFn which handles standardized API responses
  // API returns tickets array directly (unwrapped from {success, data})
  const {
    data: ticketsResponse,
    refetch: refetchTickets,
    isLoading,
  } = useQuery<PaginatedTickets>({
    queryKey: ['/api/customer/tickets', page, limit],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/customer/tickets?page=${page}&limit=${limit}`);
      const json = await res.json();
      return json.data;
    },
    keepPreviousData: true,
  });

  useEffect(() => {
    setPage(1);
  }, [limit]);

  // Filter tickets by status on client side
  // const tickets: Ticket[] = (ticketsRaw || []).filter(t =>
  //   statusFilter === "all" ? true : t.status === statusFilter
  // );

  const ticketsRaw = ticketsResponse?.data || [];

  const tickets: Ticket[] = ticketsRaw.filter((t) =>
    statusFilter === 'all' ? true : t.status === statusFilter,
  );

  const totalPages = ticketsResponse?.pagination.totalPages || 1;

  // Build detail URL - only construct when we have a valid ID
  const ticketDetailUrl = selectedTicketId ? `/api/ticket/${selectedTicketId}` : null;

  const { data: replies } = useQuery<Message[]>({
    queryKey: ['/api/customer/tickets/replies', selectedTicketId],
    enabled: !!selectedTicketId,
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/customer/tickets/${selectedTicketId}/replies`);
      const json = await res.json();
      return json.data;
    },
  });

  // Fetch single ticket with messages - uses default queryFn
  // API returns single ticket object with messages
  const { data: ticketDetails, refetch: refetchTicketDetails } = useQuery<Ticket>({
    queryKey: [ticketDetailUrl],
    enabled: !!ticketDetailUrl,
  });

  const { data: settings } = useQuery<PublicSettings>({
    queryKey: ['/api/public/settings'],
  });

  const { data: storefront } = useQuery<StorefrontInfo | null>({
    queryKey: ['/api/reseller/storefront/current'],
  });

  const { data: whatsappThread } = useQuery<WhatsAppThread>({
    queryKey: ['/api/whatsapp/thread'],
    enabled: !!user,
  });

  useEffect(() => {
    if (replies) {
      setLiveMessages(replies);
    }
  }, [replies]);

  useEffect(() => {
    if (!selectedTicketId) return;

    const socket = connectSocket();

    // 🔌 join ticket room
    socket.emit('join_ticket', { ticketId: selectedTicketId });

    // 📩 receive realtime messages
    socket.on('ticket_message', (data) => {
      /*
      {
        ticketId,
        replyId,
        senderType: "user" | "admin",
        message,
        createdAt
      }
    */

      // prevent duplicates
      setLiveMessages((prev) => {
        const exists = prev.some((m) => m.id === data.replyId);
        if (exists) return prev;

        return [
          ...prev,
          {
            id: data.replyId,
            ticketId: data.ticketId,
            senderId: '',
            senderType: data.senderType,
            senderName: data.senderType === 'admin' ? 'Support' : 'You',
            message: data.message,
            isInternal: false,
            createdAt: data.createdAt,
          },
        ];
      });
    });

    return () => {
      socket.emit('leave_ticket', { ticketId: selectedTicketId });
      socket.off('ticket_message');
    };
  }, [selectedTicketId]);

  // Create ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: async (data: typeof createFormData) => {
      const res = await apiRequest('POST', '/api/customer/tickets', data);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed to create ticket');
      return json;
    },
    onSuccess: () => {
      refetchTickets();
      toast({ title: 'Success', description: 'Ticket created successfully' });
      setShowCreateDialog(false);
      setCreateFormData({ title: '', description: '', priority: 'medium' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create ticket',
        variant: 'destructive',
      });
    },
  });

  // Add message mutation
  const addMessageMutation = useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: string; message: string }) => {
      const res = await apiRequest('POST', `/api/customer/tickets/${ticketId}/reply`, {
        message,
        isInternal: false,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed to send message');
      return json;
    },
    onSuccess: () => {
      refetchTickets();
      refetchTicketDetails();
      setNewMessage('');
      toast({ title: 'Success', description: 'Message sent successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    },
  });

  const handleCreateTicket = () => {
    if (!createFormData.title || !createFormData.description) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }
    createTicketMutation.mutate(createFormData);
  };

  const handleCreateConciergeRequest = () => {
    setCreateFormData({
      title: 'VIP Concierge Request',
      description:
        'I would like help from VIP Concierge.\n\nPlease contact me and assist with my eSIM, travel, package, or activation question.',
      priority: 'high',
    });
    setShowCreateDialog(true);
  };

  const handleSendMessage = () => {
    if (!selectedTicketId || !newMessage.trim()) return;
    addMessageMutation.mutate({
      ticketId: selectedTicketId,
      message: newMessage.trim(),
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'closed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertTriangle className="w-4 h-4" />;
      case 'in_progress':
        return <Clock className="w-4 h-4" />;
      case 'resolved':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'closed':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId);
  const whatsappAvailable = isWhatsAppSupportAvailable(settings || {});
  const conciergePricingLabel = getConciergePricingLabel(settings || {});
  const conciergeGloballyEnabled = settings?.concierge_enabled !== 'false';
  const vipConcierge = useConcierge(Boolean(conciergeEnabled && conciergeGloballyEnabled && user));
  const vipConciergeHasAccess = Boolean(
    vipConcierge.data?.pricingMode === 'free' || vipConcierge.data?.hasAccess,
  );
  const vipConciergeLocked = Boolean(
    conciergeEnabled && conciergeGloballyEnabled && user && !vipConcierge.isLoading && !vipConciergeHasAccess,
  );
  const { data: conciergeSip } = useQuery<ConciergeSipInfo>({
    queryKey: ['/api/concierge/sip'],
    enabled: Boolean(user && vipConciergeHasAccess),
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/concierge/sip');
      const json = await res.json();
      return json.data;
    },
  });
  const conciergeFeatures = String(settings?.concierge_features || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
  const conciergeHotlineUrl =
    settings?.concierge_hotline_enabled !== 'false'
      ? settings?.concierge_hotline_url ||
        (settings?.concierge_hotline_number
          ? `tel:${settings.concierge_hotline_number.replace(/[^\d+]/g, '')}`
          : '')
      : '';
  const sipUrl = conciergeSip?.enabled && conciergeSip.uri ? conciergeSip.uri : '';
  const sipPublicEnabled = Boolean(sipUrl);
  const whatsappUrl = buildWhatsAppUrl(
    whatsappAvailable
      ? storefront?.whatsappNumber ||
      ((user?.role === 'agent' || user?.role === 'reseller') ? user?.whatsappNumber : '') ||
      settings?.support_whatsapp_number ||
      ''
      : '',
    'Hello, I need help with eSIM support.',
  );
  const dashboardCardClass = 'border-blue-300/10 bg-[#0b1226]/80 text-white shadow-xl shadow-black/10';
  const mutedDashboardCardClass = 'border-blue-300/10 bg-slate-900/70 text-white shadow-xl shadow-black/10';

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('channel') !== 'whatsapp') return;
    if (vipConcierge.isLoading) return;

    if (vipConciergeLocked) {
      toast({
        title: 'VIP Concierge required',
        description: 'Activate VIP Concierge before opening the WhatsApp VIP channel.',
      });
      params.delete('channel');
      const next = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${next ? `?${next}` : ''}`);
      return;
    }

    if (vipConciergeHasAccess) {
      setShowWhatsAppDialog(true);
    }
  }, [toast, vipConcierge.isLoading, vipConciergeHasAccess, vipConciergeLocked]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveMessages]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" data-testid="text-support-title">
            {t?.('website.support.myTickets', 'VIP Concierge')}
          </h1>
          <p className="mt-1 text-slate-300">
            {t?.('website.support.manageTickets', 'Use VIP Concierge for premium help, or create a Free Support ticket at no cost.')}
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="gap-2 bg-teal-500 hover:bg-teal-600 text-white"
          data-testid="button-new-ticket"
        >
          <Plus className="w-4 h-4" />
          {t?.('website.support.createTicket', 'Free Support Ticket')}
        </Button>
      </div>

      <Card className={dashboardCardClass}>
        <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
              <Headphones className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Free Support</h2>
              <p className="mt-1 text-sm text-slate-300">
                Create a standard support ticket for account, order, eSIM, and service questions. No cost, no wallet charge.
              </p>
              <p className="mt-2 text-xs font-medium uppercase tracking-wide text-cyan-200">
                $0.00 Free
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => setShowCreateDialog(true)}
            className="gap-2 bg-cyan-300 text-slate-950 hover:bg-cyan-200"
          >
            <Plus className="h-4 w-4" />
            Create Free Ticket
          </Button>
        </CardContent>
      </Card>

      {whatsappUrl && (
        <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-lime-50 text-slate-950 shadow-xl shadow-black/10">
          <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500 text-white shadow-sm">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-950">WhatsApp</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {vipConciergeLocked
                    ? 'WhatsApp VIP access unlocks after VIP Concierge activation.'
                    : 'Need a faster conversation? Chat directly on WhatsApp.'}
                </p>
                {vipConciergeLocked && (
                  <p className="mt-2 text-xs font-medium uppercase tracking-wide text-amber-700">
                    VIP Concierge payment required
                  </p>
                )}
              </div>
            </div>
            <Button
              type="button"
              disabled={vipConcierge.isLoading || vipConciergeLocked}
              className="gap-2 bg-green-500 text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => {
                if (vipConciergeLocked) return;
                if (whatsappThread?.hasCloudApi) {
                  setShowWhatsAppDialog(true);
                  queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/thread'] });
                  return;
                }

                window.location.assign(whatsappUrl);
              }}
              data-testid="button-open-whatsapp-support"
            >
              <MessageCircle className="h-4 w-4" />
              {vipConciergeLocked ? 'Locked' : 'WhatsApp'}
            </Button>
          </CardContent>
        </Card>
      )}

      {sipPublicEnabled && (
        <Card className="border-sky-200 bg-gradient-to-r from-sky-50 to-cyan-50 text-slate-950 shadow-xl shadow-black/10">
          <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500 text-white shadow-sm">
                <PhoneCall className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Call Center</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {vipConciergeLocked
                    ? 'SIP calling unlocks after VIP Concierge activation.'
                    : sipCalling
                      ? 'Calling.......'
                      : 'Tap to call the support team.'}
                </p>
                {vipConciergeLocked && (
                  <p className="mt-2 text-xs font-medium uppercase tracking-wide text-amber-700">
                    VIP Concierge payment required
                  </p>
                )}
              </div>
            </div>
            <Button
              type="button"
              disabled={vipConcierge.isLoading || vipConciergeLocked || !sipUrl}
              className="gap-2 bg-sky-500 text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => {
                if (!sipUrl || vipConciergeLocked) return;
                setSipCalling(true);
                window.setTimeout(() => setSipCalling(false), 15000);
                window.location.assign(sipUrl);
              }}
            >
              <PhoneCall className="h-4 w-4" />
              {vipConciergeLocked ? (
                'Locked'
              ) : sipCalling ? (
                <span className="flex flex-col leading-tight">
                  <span>Calling.......</span>
                  <span>Call Center</span>
                </span>
              ) : (
                'Call Center'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {whatsappThread?.hasCloudApi && vipConciergeHasAccess && (
        <Card className={dashboardCardClass}>
          <CardHeader>
            <CardTitle className="text-lg">WhatsApp</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!whatsappThread.userPhone ? (
              <p className="text-sm text-slate-400">
                Add your phone number in profile so inbound WhatsApp messages can be linked to your account.
              </p>
            ) : whatsappThread.messages.length === 0 ? (
              <p className="text-sm text-slate-400">
                No synced WhatsApp messages yet. Start the chat from the WhatsApp button and replies will appear here when Meta delivers them to the webhook.
              </p>
            ) : (
              whatsappThread.messages.map((message) => (
                <div key={message.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                    <span className="capitalize">{message.direction}</span>
                    <span>{new Date(message.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{message.text}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {whatsappThread?.hasCloudApi && vipConciergeHasAccess && (
        <WhatsAppChatDialog
          open={showWhatsAppDialog}
          onOpenChange={setShowWhatsAppDialog}
          userPhone={whatsappThread.userPhone}
          messages={whatsappThread.messages}
        />
      )}

      {conciergeEnabled && conciergeGloballyEnabled && (
        <ConciergeAccessCard
          enabled={conciergeEnabled && conciergeGloballyEnabled}
          pricingLabel={conciergePricingLabel}
          features={conciergeFeatures}
          hotlineLabel={settings?.concierge_hotline_label || '24/7 Hotline'}
          hotlineUrl={conciergeHotlineUrl}
          onStartRequest={handleCreateConciergeRequest}
        />
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className={dashboardCardClass} data-testid="card-stat-open">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-300">Open</p>
                <h3 className="text-2xl font-bold mt-1" data-testid="text-count-open">
                  {tickets?.filter((t) => t.status === 'open').length || 0}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={dashboardCardClass} data-testid="card-stat-in-progress">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-300">In Progress</p>
                <h3 className="text-2xl font-bold mt-1" data-testid="text-count-in-progress">
                  {tickets?.filter((t) => t.status === 'in_progress').length || 0}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={dashboardCardClass} data-testid="card-stat-resolved">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-300">Resolved</p>
                <h3 className="text-2xl font-bold mt-1" data-testid="text-count-resolved">
                  {tickets?.filter((t) => t.status === 'resolved').length || 0}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={dashboardCardClass} data-testid="card-stat-total">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-300">Total</p>
                <h3 className="text-2xl font-bold mt-1" data-testid="text-count-total">
                  {tickets?.length || 0}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                <Headphones className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tickets List */}
        <div className="lg:col-span-1 space-y-4">
          {/* Status Filter */}

          <div className="flex items-center gap-3 mb-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 rounded-lg border border-white/15 bg-slate-950/50 px-3 py-2 text-sm text-white"
            >
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="rounded-lg border border-white/15 bg-slate-950/50 px-2 py-2 text-sm text-white"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          {/* Tickets */}
          {isLoading ? (
            <Card className={dashboardCardClass}>
              <CardContent className="p-8 text-center">
                <div className="text-slate-400">Loading tickets...</div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
              {tickets.map((ticket) => (
                <Card
                  key={ticket.id}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={`cursor-pointer border-blue-300/10 bg-[#0b1226]/80 text-white shadow-lg shadow-black/10 transition-all hover:border-lime-300/40 hover:bg-slate-900 ${selectedTicketId === ticket.id ? 'ring-2 ring-lime-300/70 border-lime-300/40 bg-lime-300/10' : ''
                    }`}
                  data-testid={`card-ticket-${ticket.id}`}
                >
                  <CardContent className="p-4 space-y-2">
                    {/* Status Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(ticket.status)}
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(ticket.status)}`}
                        >
                          {ticket.status.replace('_', ' ')}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(ticket.priority)}`}
                        >
                          {ticket.priority}
                        </span>
                      </div>

                      <span className="text-xs text-slate-400">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-medium text-sm line-clamp-2">{ticket.title}</h3>

                    {/* Footer */}
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Updated {new Date(ticket.updatedAt).toLocaleTimeString()}</span>

                      {ticket.assignedToName && (
                        <span className="text-orange-600 font-medium">{ticket.assignedToName}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {tickets.length === 0 && (
                <Card className={dashboardCardClass}>
                  <CardContent className="p-8 text-center">
                    <Headphones className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No tickets found</h3>
                    <p className="text-slate-400 mb-4">
                      {statusFilter !== 'all'
                        ? 'Try adjusting your filter'
                        : 'Create your first support ticket'}
                    </p>
                    <Button
                      onClick={() => setShowCreateDialog(true)}
                      className="gap-2 bg-teal-500 hover:bg-teal-600 text-white"
                      data-testid="button-create-first-ticket"
                    >
                      <Plus className="w-4 h-4" />
                      Create Ticket
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>

            <span className="text-sm text-slate-300">
              Page <span className="font-medium">{page}</span> of {totalPages}
            </span>

            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>

        {/* Ticket Details */}
        <div className="lg:col-span-2">
          {selectedTicketId && selectedTicket ? (
            <Card className={`sticky top-6 ${mutedDashboardCardClass}`}>
              <CardHeader className="border-b border-white/10">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 flex-wrap">
                    <CardTitle className="text-white">{selectedTicket.title}</CardTitle>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedTicket.status)}`}
                    >
                      {selectedTicket.status.replace('_', ' ')}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchTicketDetails()}
                    className="gap-2 border-white/15 bg-transparent text-slate-100 hover:bg-white/10 hover:text-white"
                    data-testid="button-refresh-ticket"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                {/* Ticket Info */}
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div>
                    <span className="text-slate-400">Created:</span>
                    <div className="font-medium mt-1">
                      {new Date(selectedTicket.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Priority:</span>
                    <div className="mt-1">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(selectedTicket.priority)}`}
                      >
                        {selectedTicket.priority}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <span className="text-xs text-slate-400 uppercase tracking-wide">
                    Description
                  </span>
                  <p className="mt-2 text-sm whitespace-pre-wrap leading-relaxed">
                    {selectedTicket.description}
                  </p>
                </div>

                {/* Conversation */}
                <div className="border-t border-white/10 pt-6 flex flex-col h-[500px]">
                  <h3 className="font-medium mb-3">Conversation</h3>

                  <div className="flex-1 space-y-4 overflow-y-auto px-1 pr-2 mb-4">
                    {!liveMessages || liveMessages.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-12">
                        No messages yet. Start the conversation!
                      </p>
                    ) : (
                      liveMessages.map((msg: Message) => {
                        const isUser = msg.senderType === 'user';

                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${isUser
                                  ? 'bg-orange-500 text-white rounded-br-sm'
                                  : 'bg-slate-800 text-slate-100 rounded-bl-sm'
                                }`}
                            >
                              {/* Header */}
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium opacity-80">
                                  {msg.senderName}
                                </span>

                                {!isUser && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500">
                                    Support
                                  </span>
                                )}
                              </div>

                              {/* Message */}
                              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                {msg.message}
                              </p>

                              {/* Time */}
                              <div className="text-[10px] text-right mt-1 opacity-60">
                                {new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Reply Box */}
                  <div className="border-t border-white/10 pt-3 flex items-end gap-2">
                    <Textarea
                      placeholder="Type your reply..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1 resize-none rounded-xl border-white/15 bg-slate-950/60 text-white placeholder:text-slate-500"
                      rows={2}
                    />

                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || addMessageMutation.isPending}
                      className="h-10 px-4 rounded-xl bg-teal-500 hover:bg-teal-600 text-white"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className={dashboardCardClass}>
              <CardContent className="p-12 text-center">
                <Headphones className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No ticket selected</h3>
                <p className="text-slate-400 mb-4">
                  Select a ticket from the list to view details and conversation
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>


      {/* Create Ticket Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Support Ticket</DialogTitle>
            <DialogDescription>
              Describe your issue and we'll get back to you as soon as possible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={createFormData.title}
                onChange={(e) => setCreateFormData({ ...createFormData, title: e.target.value })}
                placeholder="Brief description of your issue"
                className="mt-1"
                data-testid="input-ticket-title"
              />
            </div>
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={createFormData.description}
                onChange={(e) =>
                  setCreateFormData({ ...createFormData, description: e.target.value })
                }
                placeholder="Please provide detailed information about your issue"
                rows={5}
                className="mt-1"
                data-testid="input-ticket-description"
              />
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                value={createFormData.priority}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent',
                  })
                }
                className="w-full px-4 py-2 mt-1 border rounded-md bg-background"
                data-testid="select-ticket-priority"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              data-testid="button-cancel-ticket"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTicket}
              disabled={createTicketMutation.isPending}
              className="bg-teal-500 hover:bg-teal-600 text-white"
              data-testid="button-submit-ticket"
            >
              {createTicketMutation.isPending ? 'Creating...' : 'Create Ticket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

