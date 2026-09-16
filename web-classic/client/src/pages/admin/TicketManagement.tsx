import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Archive,
  ArchiveRestore,
  Search,
  Trash,
  ArrowRight,
  Headphones,
  Mail,
  Calendar,
  Tag,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Languages,
  Loader2,
  Sparkles,
  Volume2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAdmin } from '@/hooks/use-admin';
import { useTranslation } from '@/contexts/TranslationContext';
import { connectSocket } from '../../socket/socket';

interface AdminUser {
  id: string;
  username: string;
  role: string;
}

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  userId: string;
  userName: string;
  assignedToId?: string | null;
  assignedToName?: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  closedAt?: string | null;
}

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

interface TicketDetailsResponse {
  ticket: Ticket;
  messages: Message[];
}

type SupportTicketsSystemProps = {
  channel?: 'support' | 'concierge';
};

const translationLanguages = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'Arabic' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'hi', label: 'Hindi' },
  { code: 'pl', label: 'Polish' },
  { code: 'sv', label: 'Swedish' },
];

export default function SupportTicketsSystem({
  channel = 'support',
}: SupportTicketsSystemProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [translationLanguage, setTranslationLanguage] = useState('en');
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, string>>({});
  const [translatingMessageId, setTranslatingMessageId] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isTranslatingAll, setIsTranslatingAll] = useState(false);
  const [isTranslatingReply, setIsTranslatingReply] = useState(false);
  const [isPolishingReply, setIsPolishingReply] = useState(false);
  const audioUrlRef = useRef<string | null>(null);
  const { toast } = useToast();
  const { user } = useAdmin();
  const { t } = useTranslation();
  const [liveMessages, setLiveMessages] = useState<Message[]>([]);
  const tt = (key: string, fallback: string, params?: Record<string, string | number>) =>
    t(`adminPanel.admin.tickets.${key}`, fallback, params);

  const [createFormData, setCreateFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
  });

  const itemsPerPage = 25;
  const isAdmin = ['admin', 'superadmin', 'super_admin'].includes(String(user?.role || ''));

  // Fetch tickets
  const buildQueryKey = () => {
    const params: any = { page: currentPage, limit: itemsPerPage };
    if (searchQuery) params.search = searchQuery;
    if (statusFilter !== 'all') params.status = statusFilter;
    if (priorityFilter !== 'all') params.priority = priorityFilter;
    return ['/api/admin/support-tickets', params];
  };

  const { data: ticketsData, isLoading } = useQuery({
    queryKey: [
      '/api/admin/support-tickets',
      currentPage,
      searchQuery,
      statusFilter,
      priorityFilter,
      channel,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (searchQuery) params.append('search', searchQuery);
      if (channel === 'concierge') params.append('channel', 'concierge');

      const res = await apiRequest('GET', `/api/admin/support-tickets?${params.toString()}`);

      return res.json();
    },
  });

  // const tickets: Ticket[] = ticketsData?.data?.tickets || [];
  const tickets: Ticket[] = ticketsData?.data?.tickets || [];

  const totalPages = Math.ceil((ticketsData?.pagination?.total || 0) / itemsPerPage);

  // Fetch single ticket with messages
  const { data: ticketDetails, refetch: refetchTicketDetails } = useQuery<TicketDetailsResponse>({
    queryKey: ['/api/admin/support-tickets', selectedTicketId],
    queryFn: async () => {
      if (!selectedTicketId) return null;
      const res = await apiRequest('GET', `/api/admin/support-tickets/${selectedTicketId}`);
      const json = await res.json();
      return json.data;
    },
    enabled: !!selectedTicketId,
  });

  useEffect(() => {
    if (ticketDetails?.messages) {
      setLiveMessages(ticketDetails.messages);
    }
  }, [ticketDetails?.messages]);

  useEffect(() => {
    setTranslatedMessages({});
  }, [selectedTicketId, translationLanguage]);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, []);

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
            senderName: data.senderType === 'user' ? 'User' : 'You',
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

  // Fetch all admins for assignment (admin only)
  const { data: adminsData } = useQuery({
    queryKey: ['/api/admins'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admins?limit=100');
      return res.json();
    },
    enabled: isAdmin,
  });

  const adminUsers: AdminUser[] = adminsData?.admins || [];

  // Create ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: async (data: typeof createFormData) => {
      return await apiRequest('POST', '/api/tickets', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
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

  // Update ticket mutation (admin only)
  const updateTicketMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest('PUT', `/api/admin/support-tickets/${id}`, data);
    },
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support-tickets'] });
      refetchTicketDetails();
      if (channel === 'concierge' && variables.data?.status === 'closed' && statusFilter !== 'closed') {
        setSelectedTicketId(null);
      }
      toast({ title: 'Success', description: 'Ticket updated successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update ticket',
        variant: 'destructive',
      });
    },
  });

  // Add message mutation
  const addMessageMutation = useMutation({
    mutationFn: async ({
      ticketId,
      message,
      isInternal,
    }: {
      ticketId: string;
      message: string;
      isInternal: boolean;
    }) => {
      return await apiRequest('POST', `/api/admin/support-tickets/${ticketId}/messages`, {
        message,
        isInternal,
      });
    },
    onSuccess: () => {
      refetchTicketDetails();
      setNewMessage('');
      setIsInternalNote(false);
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

  // Delete ticket mutation (admin only)
  const deleteTicketMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/tickets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      setSelectedTicketId(null);
      toast({ title: 'Success', description: 'Ticket deleted successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete ticket',
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

  const handleUpdateStatus = (status: string) => {
    if (!selectedTicketId) return;
    updateTicketMutation.mutate({ id: selectedTicketId, data: { status } });
  };

  const handleArchiveTicket = (ticketId = selectedTicketId) => {
    if (!ticketId) return;
    updateTicketMutation.mutate({ id: ticketId, data: { status: 'closed' } });
  };

  const handleRestoreTicket = (ticketId = selectedTicketId) => {
    if (!ticketId) return;
    updateTicketMutation.mutate({ id: ticketId, data: { status: 'open', priority: 'high' } });
  };

  const handleUpdatePriority = (priority: string) => {
    if (!selectedTicketId) return;
    updateTicketMutation.mutate({ id: selectedTicketId, data: { priority } });
  };

  const handleAssignTicket = (value: string) => {
    if (!selectedTicketId) return;
    const selectedAdmin = adminUsers.find((admin) => admin.id === value);
    updateTicketMutation.mutate({
      id: selectedTicketId,
      data: {
        assignedToId: value === 'unassigned' ? null : value,
        assignedToName: value === 'unassigned' ? null : selectedAdmin?.username,
      },
    });
  };

  const handleSendMessage = () => {
    if (!selectedTicketId || !newMessage.trim()) return;
    addMessageMutation.mutate({
      ticketId: selectedTicketId,
      message: newMessage.trim(),
      isInternal: isInternalNote,
    });
  };

  const handleDeleteTicket = (ticketId: string, ticketTitle: string) => {
    if (confirm(`Are you sure you want to delete ticket "${ticketTitle}"?`)) {
      deleteTicketMutation.mutate(ticketId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-teal-100 text-teal-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertTriangle className="w-4 h-4 text-teal-500" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'resolved':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'closed':
        return <XCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    if (isConcierge && status === 'closed') return tt('status.archived', 'Archived');
    switch (status) {
      case 'open':
        return tt('status.open', 'Open');
      case 'in_progress':
        return tt('status.inProgress', 'In Progress');
      case 'resolved':
        return tt('status.resolved', 'Resolved');
      case 'closed':
        return tt('status.closed', 'Closed');
      default:
        return status.replace('_', ' ');
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'low':
        return tt('priority.low', 'Low');
      case 'medium':
        return tt('priority.medium', 'Medium');
      case 'high':
        return tt('priority.high', 'High');
      case 'urgent':
        return tt('priority.urgent', 'Urgent');
      default:
        return priority;
    }
  };

  const getTicketTitleLabel = (title: string) => {
    if (title === 'AI Voice Concierge Request') {
      return tt('canned.aiVoiceConciergeRequest', 'AI Voice Concierge Request');
    }
    return title;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId);
  const isConcierge = channel === 'concierge';
  const pageTitle = channel === 'concierge' ? 'Concierge Inbox' : 'Support Tickets';
  const pageDescription =
    channel === 'concierge'
      ? 'Manage concierge conversations and reply to users in real time'
      : 'Manage customer support tickets and inquiries';

  const translateText = async (text: string) => {
    const response = await apiRequest('POST', '/api/admin/translate', {
      text,
      targetLanguage: translationLanguage,
    });
    const payload = await response.json();
    return String(payload?.data?.translatedText || payload?.translatedText || '').trim();
  };

  const handleTranslateMessage = async (message: Message) => {
    if (!message.message.trim()) return;
    setTranslatingMessageId(message.id);
    try {
      const translatedText = await translateText(message.message);
      setTranslatedMessages((current) => ({ ...current, [message.id]: translatedText }));
    } catch (error: any) {
      toast({
        title: tt('toast.translationFailed', 'Translation failed'),
        description: error.message || tt('toast.translateMessageFailed', 'Could not translate this message'),
        variant: 'destructive',
      });
    } finally {
      setTranslatingMessageId(null);
    }
  };

  const handleTranslateAllMessages = async () => {
    const messages = liveMessages.filter((message) => message.message.trim());
    if (messages.length === 0) return;
    setIsTranslatingAll(true);
    try {
      const entries = await Promise.all(
        messages.map(async (message) => [message.id, await translateText(message.message)] as const),
      );
      setTranslatedMessages((current) => ({
        ...current,
        ...Object.fromEntries(entries),
      }));
    } catch (error: any) {
      toast({
        title: tt('toast.translationFailed', 'Translation failed'),
        description: error.message || tt('toast.translateConversationFailed', 'Could not translate the conversation'),
        variant: 'destructive',
      });
    } finally {
      setIsTranslatingAll(false);
    }
  };

  const handleTranslateReply = async () => {
    if (!newMessage.trim()) return;
    setIsTranslatingReply(true);
    try {
      const translatedText = await translateText(newMessage);
      setNewMessage(translatedText);
    } catch (error: any) {
      toast({
        title: tt('toast.translationFailed', 'Translation failed'),
        description: error.message || tt('toast.translateReplyFailed', 'Could not translate your reply'),
        variant: 'destructive',
      });
    } finally {
      setIsTranslatingReply(false);
    }
  };

  const handlePolishReply = async () => {
    if (!newMessage.trim()) return;
    setIsPolishingReply(true);
    try {
      const response = await apiRequest('POST', '/api/admin/grammar/polish', {
        text: newMessage,
      });
      const payload = await response.json();
      const correctedText = String(payload?.data?.correctedText || payload?.correctedText || '').trim();
      if (correctedText) setNewMessage(correctedText);
    } catch (error: any) {
      toast({
        title: tt('toast.grammarFailed', 'Grammar correction failed'),
        description: error.message || tt('toast.polishReplyFailed', 'Could not polish your reply'),
        variant: 'destructive',
      });
    } finally {
      setIsPolishingReply(false);
    }
  };

  const speakWithBrowser = (text: string, id: string) => {
    const value = text.trim();
    if (!value) return;
    if (!('speechSynthesis' in window)) {
      toast({
        title: tt('toast.voiceNotSupported', 'Voice not supported'),
        description: tt('toast.voiceNotSupportedDescription', 'This browser does not support text-to-speech playback.'),
        variant: 'destructive',
      });
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(value);
    utterance.lang = translationLanguage === 'auto' ? 'en-US' : translationLanguage;
    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);
    setSpeakingMessageId(id);
    window.speechSynthesis.speak(utterance);
  };

  const handleSpeakText = async (text: string, id: string) => {
    const value = text.trim();
    if (!value) return;

    window.speechSynthesis?.cancel();
    setSpeakingMessageId(id);

    try {
      const response = await apiRequest('POST', '/api/admin/voice/speak', { text: value });
      const audioBlob = await response.blob();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrlRef.current);
      audio.onended = () => setSpeakingMessageId(null);
      audio.onerror = () => {
        setSpeakingMessageId(null);
        toast({
          title: tt('toast.professionalVoiceFailed', 'Professional voice failed'),
          description: tt('toast.professionalVoiceFallback', 'Use the Browser button for local device speech, or configure OpenAI for natural voice.'),
          variant: 'destructive',
        });
      };
      await audio.play();
    } catch (error: any) {
      setSpeakingMessageId(null);
      toast({
        title: tt('toast.professionalVoiceUnavailable', 'Professional voice unavailable'),
        description:
          error.message === 'OpenAI not configured'
            ? tt('toast.openAiNotConfigured', 'Add OPENAI_API_KEY to .env and restart the server. Browser voice is separate and will sound robotic.')
            : error.message || tt('toast.browserVoiceFallback', 'Use the Browser button for local device speech.'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div
      className={
        isConcierge
          ? 'w-full transition-colors dark:text-white'
          : 'min-h-screen w-full bg-gray-50 dark:bg-gray-900 transition-colors dark:text-white'
      }
    >
      <div className={isConcierge ? 'w-full' : 'w-full px-0 py-0'}>
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {channel === 'concierge'
                ? pageTitle
                : t?.('adminPanel.admin.tickets.title', 'Support Tickets')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {channel === 'concierge'
                ? pageDescription
                : t?.(
                    'adminPanel.admin.tickets.description',
                    'Manage customer support tickets and inquiries',
                  )}
            </p>
          </div>
          {/* <Button onClick={() => setShowCreateDialog(true)} className="">
            {t?.('adminPanel.admin.tickets.button.create', 'Create Ticket')}
          </Button> */}
        </div>

        {/* Stats Cards */}

        <div className="grid gap-4 md:grid-cols-4 mb-8">
          {/* Open */}
          <Card className="border-0 bg-gradient-to-br from-teal-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 shadow-lg p-6">
            <p className="text-sm font-medium text-teal-600 dark:text-teal-400">
              {t('adminPanel.admin.tickets.stats.open', 'Open')}
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {tickets?.filter((t) => t.status === 'open').length || 0}
            </h3>
          </Card>

          {/* In Progress */}
          <Card className="border-0 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-gray-800 dark:to-gray-900 shadow-lg p-6">
            <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
              {t('adminPanel.admin.tickets.stats.inProgress', 'In Progress')}
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {tickets?.filter((t) => t.status === 'in_progress').length || 0}
            </h3>
          </Card>

          {/* Resolved */}
          <Card className="border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900 shadow-lg p-6">
            <p className="text-sm font-medium text-green-600 dark:text-green-400">
              {t('adminPanel.admin.tickets.stats.resolved', 'Resolved')}
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {tickets?.filter((t) => t.status === 'resolved').length || 0}
            </h3>
          </Card>

          {/* Urgent */}
          <Card className="border-0 bg-gradient-to-br from-red-50 to-pink-50 dark:from-gray-800 dark:to-gray-900 shadow-lg p-6">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              {t('adminPanel.admin.tickets.stats.urgent', 'Urgent')}
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {tickets?.filter((t) => t.priority === 'urgent').length || 0}
            </h3>
          </Card>
        </div>

        <div
          className={
            isConcierge
              ? 'grid w-full grid-cols-1 gap-4 xl:grid-cols-[minmax(320px,0.36fr)_minmax(0,1fr)]'
              : 'grid w-full grid-cols-1 gap-4 xl:grid-cols-[minmax(360px,0.32fr)_minmax(0,1fr)]'
          }
        >
          {/* Tickets List */}
          <div className="min-w-0">
            {/* Filters and Search */}

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />

                <input
                  type="text"
                  placeholder={t(
                    'adminPanel.admin.tickets.search.placeholder',
                    'Search tickets...',
                  )}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 
      bg-white dark:bg-gray-900 
      border border-gray-300 dark:border-gray-600 
      text-gray-900 dark:text-gray-200
      placeholder-gray-400 dark:placeholder-gray-500
      rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="flex space-x-2 mt-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="flex-1 px-3 py-2 
      bg-white dark:bg-gray-900
      border border-gray-300 dark:border-gray-600
      text-gray-900 dark:text-gray-200
      rounded-lg text-sm"
                >
                  <option value="all">
                    {t('adminPanel.admin.tickets.filter.allStatus', 'All Status')}
                  </option>
                  <option value="open">{t('adminPanel.admin.tickets.stats.open', 'Open')}</option>
                  <option value="in_progress">
                    {t('adminPanel.admin.tickets.stats.inProgress', 'In Progress')}
                  </option>
                  <option value="resolved">
                    {t('adminPanel.admin.tickets.stats.resolved', 'Resolved')}
                  </option>
                  <option value="closed">
                    {isConcierge ? tt('status.archived', 'Archived') : tt('status.closed', 'Closed')}
                  </option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="flex-1 px-3 py-2 
      bg-white dark:bg-gray-900
      border border-gray-300 dark:border-gray-600
      text-gray-900 dark:text-gray-200
      rounded-lg text-sm"
                >
                  <option value="all">
                    {' '}
                    {t('adminPanel.admin.tickets.filter.allPriority', 'All Priority')}
                  </option>
                  <option value="low"> {t('adminPanel.admin.tickets.priority.low', 'Low')}</option>
                  <option value="medium">
                    {t('adminPanel.admin.tickets.priority.medium', 'Medium')}
                  </option>
                  <option value="high">
                    {' '}
                    {t('adminPanel.admin.tickets.priority.high', 'High')}
                  </option>
                  <option value="urgent">
                    {' '}
                    {t('adminPanel.admin.tickets.priority.urgent', 'Urgent')}
                  </option>
                </select>
              </div>
            </div>

            {/* Tickets */}
            {isLoading ? (
              <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center dark:text-white">
                <div className="text-gray-500">
                  {t('adminPanel.admin.tickets.loading', 'Loading tickets...')}
                </div>
              </div>
            ) : (
              <div className={isConcierge ? 'flex-1 max-h-[640px] overflow-y-auto pr-1' : 'flex-1 max-h-[500px] overflow-y-auto pr-2'}>
                <div className="space-y-3">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicketId(ticket.id)}
                      className={`bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border 
  ${
    selectedTicketId === ticket.id
      ? 'border-green-500 ring-2 ring-green-200 dark:ring-green-900'
      : 'border-gray-200 dark:border-gray-700'
  } 
  hover:border-green-500 dark:hover:border-green-400 transition-all cursor-pointer`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2 flex-wrap">
                          {getStatusIcon(ticket.status)}

                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}
                          >
                            {getStatusLabel(ticket.status)}
                          </span>

                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}
                          >
                            {getPriorityLabel(ticket.priority)}
                          </span>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </span>
                          {isConcierge && isAdmin && (
                            ticket.status === 'closed' ? (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleRestoreTicket(ticket.id);
                                }}
                                className="inline-flex items-center gap-1 rounded-md border border-cyan-400/40 px-2.5 py-1 text-xs font-medium text-cyan-200 hover:bg-cyan-400/10"
                              >
                                <ArchiveRestore className="h-3.5 w-3.5" />
                                {tt('actions.return', 'Return')}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleArchiveTicket(ticket.id);
                                }}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-500/60 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700/60"
                              >
                                <Archive className="h-3.5 w-3.5" />
                                {tt('actions.archiveIt', 'Archive it')}
                              </button>
                            )
                          )}
                        </div>
                      </div>

                      <h3 className="font-medium text-gray-900 dark:text-gray-200 mb-2">
                        {getTicketTitleLabel(ticket.title)}
                      </h3>

                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-300 text-xs font-semibold">
                          {ticket.userName.charAt(0).toUpperCase()}
                        </div>

                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {ticket.userName}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>
                          {tt('list.updated', 'Updated {time}', {
                            time: new Date(ticket.updatedAt).toLocaleTimeString(),
                          })}
                        </span>

                        {isAdmin && ticket.assignedToName && (
                          <span className="text-green-600 dark:text-green-400 font-medium">
                            → {ticket.assignedToName}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {tickets.length === 0 && (
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 text-center">
                      <Headphones className="w-12 h-12 text-gray-300 dark:text-gray-500 mx-auto mb-4" />

                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200 mb-2">
                        {t('adminPanel.admin.tickets.empty.title', 'No tickets found')}
                      </h3>

                      <p className="text-gray-500 dark:text-gray-400">
                        {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                          ? t(
                              'adminPanel.admin.tickets.empty.filtered',
                              'Try adjusting your search or filter criteria',
                            )
                          : t(
                              'adminPanel.admin.tickets.empty.allResolved',
                              'All support tickets have been resolved!',
                            )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                <div className="text-sm text-gray-600">
                  {t('adminPanel.admin.tickets.pagination.page', 'Page')} {currentPage}{' '}
                  {t('adminPanel.admin.tickets.pagination.of', 'of')} {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                  >
                    {t('adminPanel.admin.tickets.pagination.previous', 'Previous')}
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                  >
                    {t('adminPanel.admin.tickets.pagination.next', 'Next')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Ticket Details */}
          <div className="min-w-0">
            {selectedTicketId && selectedTicket ? (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-200 rounded-xl shadow-sm overflow-hidden">
                {/* Ticket Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {getTicketTitleLabel(selectedTicket.title)}
                      </h2>

                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedTicket.status)}`}
                      >
                        {getStatusLabel(selectedTicket.status)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {isConcierge && isAdmin && (
                        selectedTicket.status === 'closed' ? (
                          <button
                            type="button"
                            onClick={() => handleRestoreTicket(selectedTicket.id)}
                            className="inline-flex items-center gap-2 rounded-md border border-cyan-400/40 px-4 py-2 text-sm text-cyan-200 transition hover:bg-cyan-400/10"
                          >
                            <ArchiveRestore className="h-4 w-4" />
                            {tt('actions.returnToActive', 'Return to Active')}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleArchiveTicket(selectedTicket.id)}
                            className="inline-flex items-center gap-2 rounded-md border border-slate-500/70 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-700/70"
                          >
                            <Archive className="h-4 w-4" />
                            {tt('actions.archiveIt', 'Archive it')}
                          </button>
                        )
                      )}
                      <button
                        onClick={() => refetchTicketDetails()}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition text-sm"
                      >
                        🔄 {t('adminPanel.admin.tickets.actions.refresh', 'Refresh')}
                      </button>

                      {isAdmin && (
                        <button
                          onClick={() =>
                            handleDeleteTicket(selectedTicket.id, selectedTicket.title)
                          }
                          className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30"
                        >
                          <Trash className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">
                        {t('adminPanel.admin.tickets.details.creator', 'Creator')}:
                      </span>

                      <div className="flex items-center mt-1">
                        <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-300 text-xs font-semibold mr-2">
                          {selectedTicket.userName.charAt(0).toUpperCase()}
                        </div>

                        <span className="font-medium text-gray-900 dark:text-gray-200">
                          {selectedTicket.userName}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-500 dark:text-gray-400">
                        {t('adminPanel.admin.tickets.details.details', 'Details')}:
                      </span>

                      <div className="flex items-center mt-1">
                        <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-1" />
                        <span className="text-gray-900 dark:text-gray-200">
                          {new Date(selectedTicket.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center mt-1">
                        <Tag className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-1" />
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(selectedTicket.priority)}`}
                        >
                          {getPriorityLabel(selectedTicket.priority)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Admin Controls */}
                  {isAdmin && (
                    <div className="flex gap-4 flex-wrap">
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                          {t('adminPanel.admin.tickets.form.status', 'Status')}
                        </label>

                        <select
                          value={ticketDetails?.ticket?.status || selectedTicket.status}
                          onChange={(e) => handleUpdateStatus(e.target.value)}
                          className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-200 rounded-lg text-sm"
                        >
                          <option value="open">
                            {t('adminPanel.admin.tickets.stats.open', 'Open')}
                          </option>
                          <option value="in_progress">
                            {t('adminPanel.admin.tickets.stats.inProgress', 'In Progress')}
                          </option>
                          <option value="resolved">
                            {t('adminPanel.admin.tickets.stats.resolved', 'Resolved')}
                          </option>
                          <option value="closed">
                            {isConcierge ? tt('status.archived', 'Archived') : tt('status.closed', 'Closed')}
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                          {t('adminPanel.admin.tickets.form.priority', 'Priority')}
                        </label>

                        <select
                          value={ticketDetails?.ticket?.priority || selectedTicket.priority}
                          onChange={(e) => handleUpdatePriority(e.target.value)}
                          className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-200 rounded-lg text-sm"
                        >
                          <option value="low">
                            {' '}
                            {t('adminPanel.admin.tickets.priority.low', 'Low')}
                          </option>
                          <option value="medium">
                            {t('adminPanel.admin.tickets.priority.medium', 'Medium')}
                          </option>
                          <option value="high">
                            {' '}
                            {t('adminPanel.admin.tickets.priority.high', 'High')}
                          </option>
                          <option value="urgent">
                            {' '}
                            {t('adminPanel.admin.tickets.priority.urgent', 'Urgent')}
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                          {t('adminPanel.admin.tickets.assign.assignTo', 'Assign To')}
                        </label>

                        <select
                          value={ticketDetails?.ticket?.assignedToId || 'unassigned'}
                          onChange={(e) => handleAssignTicket(e.target.value)}
                          className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-200 rounded-lg text-sm"
                        >
                          <option value="unassigned">
                            {t('adminPanel.admin.tickets.assign.unassigned', 'Unassigned')}
                          </option>

                          {adminUsers.map((admin) => (
                            <option key={admin.id} value={admin.id}>
                              {admin.username}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  <div className="mt-4">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {t('adminPanel.admin.tickets.details.description', 'Description')}:
                    </span>

                    <p className="mt-2 text-sm text-gray-900 dark:text-gray-200 whitespace-pre-wrap">
                      {selectedTicket.description}
                    </p>
                  </div>
                </div>

                {/* Conversation */}
                <div className="p-6 bg-gray-50 dark:bg-gray-900 max-h-[300px] overflow-y-auto">
                  <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <h3 className="font-medium text-gray-900 dark:text-gray-200">
                      {t('adminPanel.admin.tickets.conversation.title', 'Conversation')}
                    </h3>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                        <Languages className="h-4 w-4" />
                        {tt('conversation.translateTo', 'Translate to')}
                      </label>
                      <select
                        value={translationLanguage}
                        onChange={(event) => setTranslationLanguage(event.target.value)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                      >
                        {translationLanguages.map((language) => (
                          <option key={language.code} value={language.code}>
                            {language.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleTranslateAllMessages}
                        disabled={isTranslatingAll || liveMessages.length === 0}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                      >
                        {isTranslatingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
                        {tt('conversation.translateAll', 'Translate all')}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {!liveMessages || liveMessages.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                        {t('adminPanel.admin.tickets.conversation.noMessages', 'No messages yet')}
                      </p>
                    ) : (
                      liveMessages.map((msg: Message) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-md px-4 py-3 rounded-lg shadow-sm
              
              ${
                msg.isInternal
                  ? 'bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700'
                  : msg.senderId === user?.id
                    ? 'bg-green-500 text-white'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
              }
              
              `}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`text-xs font-semibold ${msg.senderId === user?.id && !msg.isInternal ? 'text-green-100' : 'text-gray-700 dark:text-gray-300'}`}
                              >
                                {msg.senderName}
                              </span>

                              {msg.isInternal && (
                                <span className="text-xs px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-700 text-amber-800 dark:text-amber-200">
                                  {tt('conversation.internal', 'Internal')}
                                </span>
                              )}
                            </div>

                            <p
                              className={`text-sm whitespace-pre-wrap ${msg.senderId === user?.id && !msg.isInternal ? 'text-white' : 'text-gray-900 dark:text-gray-200'}`}
                            >
                              {msg.message}
                            </p>

                            {translatedMessages[msg.id] && (
                              <div
                                className={`mt-3 rounded-lg border px-3 py-2 text-sm whitespace-pre-wrap ${
                                  msg.senderId === user?.id && !msg.isInternal
                                    ? 'border-white/30 bg-white/15 text-white'
                                    : 'border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100'
                                }`}
                              >
                                <div className="mb-1 flex items-center gap-1 text-xs font-semibold opacity-80">
                                  <Languages className="h-3 w-3" />
                                  {tt('conversation.translation', 'Translation')}
                                </div>
                                {translatedMessages[msg.id]}
                              </div>
                            )}

                            <div
                              className={`mt-2 flex flex-wrap items-center gap-2 text-xs ${msg.senderId === user?.id && !msg.isInternal ? 'text-green-100' : 'text-gray-500 dark:text-gray-400'}`}
                            >
                              <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                              <button
                                type="button"
                                onClick={() => handleTranslateMessage(msg)}
                                disabled={translatingMessageId === msg.id}
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 transition disabled:opacity-60 ${
                                  msg.senderId === user?.id && !msg.isInternal
                                    ? 'bg-white/15 text-white hover:bg-white/25'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                                }`}
                              >
                                {translatingMessageId === msg.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Languages className="h-3 w-3" />
                                )}
                                {tt('conversation.translate', 'Translate')}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSpeakText(translatedMessages[msg.id] || msg.message, msg.id)}
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 transition ${
                                  msg.senderId === user?.id && !msg.isInternal
                                    ? 'bg-white/15 text-white hover:bg-white/25'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                                }`}
                              >
                                <Volume2 className="h-3 w-3" />
                                {speakingMessageId === msg.id
                                  ? tt('conversation.reading', 'Reading')
                                  : tt('conversation.readIt', 'Read it')}
                              </button>
                              <button
                                type="button"
                                onClick={() => speakWithBrowser(translatedMessages[msg.id] || msg.message, `${msg.id}-browser`)}
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 transition ${
                                  msg.senderId === user?.id && !msg.isInternal
                                    ? 'bg-white/15 text-white hover:bg-white/25'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                                }`}
                              >
                                {tt('conversation.browser', 'Browser')}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Reply Box */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-start space-x-2">
                    <textarea
                      placeholder={t(
                        'adminPanel.admin.tickets.reply.placeholder',
                        'Type your reply...',
                      )}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                      rows={3}
                    />

                    <button
                      type="button"
                      onClick={handleTranslateReply}
                      disabled={!newMessage.trim() || isTranslatingReply || isPolishingReply}
                      className="rounded-lg border border-gray-300 bg-white p-3 text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                      title={tt('reply.translateTitle', 'Translate reply before sending')}
                    >
                      {isTranslatingReply ? <Loader2 className="h-5 w-5 animate-spin" /> : <Languages className="h-5 w-5" />}
                    </button>

                    <button
                      type="button"
                      onClick={handlePolishReply}
                      disabled={!newMessage.trim() || isPolishingReply || isTranslatingReply}
                      className="rounded-lg border border-gray-300 bg-white p-3 text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                      title={tt('reply.polishTitle', 'Correct grammar and make reply professional')}
                    >
                      {isPolishingReply ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSpeakText(newMessage, 'reply-draft')}
                      disabled={!newMessage.trim()}
                      className="rounded-lg border border-gray-300 bg-white p-3 text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                      title={tt('reply.readTitle', 'Read reply aloud')}
                    >
                      <Volume2 className="h-5 w-5" />
                    </button>

                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || addMessageMutation.isPending}
                      className="bg-green-500 text-white p-3 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="internal"
                          checked={isInternalNote}
                          onChange={(e) => setIsInternalNote(e.target.checked)}
                          className="rounded border-gray-300 dark:border-gray-600 text-green-500 bg-white dark:bg-gray-800"
                        />

                        <label
                          htmlFor="internal"
                          className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer"
                        >
                          {t(
                            'adminPanel.admin.tickets.reply.internalNote',
                            'Internal note (not visible to user)',
                          )}
                        </label>
                      </div>
                    )}

                    <div className="flex space-x-2 ml-auto">
                      {selectedTicket.status !== 'resolved' && isAdmin && (
                        <button
                          onClick={() => handleUpdateStatus('resolved')}
                          className="px-3 py-1 text-sm bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800"
                        >
                          {t('adminPanel.admin.tickets.actions.resolve', 'Resolve Ticket')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 dark:text-gray-300  p-12 rounded-xl shadow-sm border border-gray-200 text-center">
                <Headphones className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg dark:text-gray-300 font-medium text-gray-900 mb-2">
                  {t('adminPanel.admin.tickets.noSelection.title', 'No ticket selected')}
                </h3>
                <p className="text-gray-500 mb-4">
                  {t(
                    'adminPanel.admin.tickets.noSelection.description',
                    'Select a ticket from the list to view details',
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Ticket Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {t('adminPanel.admin.tickets.dialog.createTitle', 'Create New Ticket')}
            </DialogTitle>
            <DialogDescription>
              {t(
                'adminPanel.admin.tickets.dialog.createDescription',
                "Submit a new support ticket. We'll get back to you as soon as possible.",
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-sm font-medium">
                {t('adminPanel.admin.tickets.form.title', 'Title *')}
              </Label>
              <Input
                id="title"
                value={createFormData.title}
                onChange={(e) => setCreateFormData({ ...createFormData, title: e.target.value })}
                placeholder={t(
                  'adminPanel.admin.tickets.form.titlePlaceholder',
                  'Brief description of the issue',
                )}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="description" className="text-sm font-medium">
                {t('adminPanel.admin.tickets.form.description', 'Description *')}
              </Label>
              <textarea
                id="description"
                value={createFormData.description}
                onChange={(e) =>
                  setCreateFormData({ ...createFormData, description: e.target.value })
                }
                placeholder={t(
                  'adminPanel.admin.tickets.form.descriptionPlaceholder',
                  'Detailed description of the issue',
                )}
                rows={5}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <Label htmlFor="priority" className="text-sm font-medium">
                {t('adminPanel.admin.tickets.form.priority', 'Priority')}
              </Label>
              <select
                id="priority"
                value={createFormData.priority}
                onChange={(e) =>
                  setCreateFormData({ ...createFormData, priority: e.target.value as any })
                }
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="low"> {t('adminPanel.admin.tickets.priority.low', 'Low')}</option>
                <option value="medium">
                  {t('adminPanel.admin.tickets.priority.medium', 'Medium')}
                </option>
                <option value="high"> {t('adminPanel.admin.tickets.priority.high', 'High')}</option>
                <option value="urgent">
                  {' '}
                  {t('adminPanel.admin.tickets.priority.urgent', 'Urgent')}
                </option>
              </select>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <button
              onClick={() => setShowCreateDialog(false)}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              {tt('actions.cancel', 'Cancel')}
            </button>
            <button
              onClick={handleCreateTicket}
              disabled={createTicketMutation.isPending}
              className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50"
            >
              {createTicketMutation.isPending
                ? tt('actions.creating', 'Creating...')
                : tt('actions.create', 'Create Ticket')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
