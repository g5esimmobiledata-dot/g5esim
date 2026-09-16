import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import {
  AppWindow,
  Camera,
  CalendarDays,
  CheckCircle2,
  ContactRound,
  Download,
  FileImage,
  FileText,
  Forward,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Maximize2,
  MessageCircle,
  Mic,
  Paperclip,
  Phone,
  Plus,
  Radio,
  Scan,
  Search,
  Send,
  Share2,
  Sparkles,
  Square,
  Users,
  Video,
  Volume2,
  Vote,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { connectSocket } from '@/socket/socket';

type ChatUser = {
  id: string;
  displayUserId: number | null;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  imagePath: string | null;
  chatLastSeenAt?: string | null;
  chatOnline?: boolean;
  chatPresenceHidden?: boolean;
};

type ChatAttachment = {
  name: string;
  url: string;
  type: string;
  size: number;
};

type ChatParticipant = {
  user: ChatUser;
  role: string;
  muted: boolean;
  joinedAt: string;
};

type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  messageType: string;
  body: string | null;
  attachments: ChatAttachment[];
  location?: { latitude?: number; longitude?: number; label?: string } | null;
  emoji?: { name?: string; source?: string; symbol?: string; category?: string } | null;
  call?: { kind?: string; status?: string; platform?: string; requestedAt?: string } | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  senderName?: string | null;
  senderEmail?: string | null;
};

type ChatConversation = {
  id: string;
  type: 'direct' | 'group' | 'broadcast';
  title: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  participants: ChatParticipant[];
  lastMessage: ChatMessage | null;
  unreadCount: number;
};

type ChatBootstrap = {
  currentUser: ChatUser;
  conversations: ChatConversation[];
  features: Record<string, boolean>;
};

type RealtimeToken = {
  token: string;
};

type RtcConfig = {
  iceServers: RTCIceServer[];
  iceTransportPolicy?: RTCIceTransportPolicy;
  hasTurn: boolean;
};

type NewChatType = 'direct' | 'group' | 'broadcast';
type UploadMode = 'attachment' | 'emoji' | 'recording' | 'chat-recording';
type CallMode = 'voice' | 'video' | 'group';
type CallStatus = 'incoming' | 'outgoing' | 'connecting' | 'active';
type MediaQuickFilter = 'all' | 'media' | 'images' | 'videos' | 'recordings';
type ChatRecordingKind = 'audio' | 'video';
type ShareComposerPanel = 'contact' | 'poll' | 'event' | 'ai-image' | 'fax' | null;

type ActiveCall = {
  callId: string;
  conversationId: string;
  mode: CallMode;
  status: CallStatus;
  remoteUserId: string;
  remoteName: string;
  targetUserIds: string[];
};

type EmojiCategory = {
  name: string;
  symbols: string;
};

const quickEmoji = ['😀', '❤️', '🙏', '👍', '✅'];

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    name: 'Smileys',
    symbols:
      '😀 😃 😄 😁 😆 😅 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😙 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 🤐 🤨 😐 😑 😶 😏 😒 🙄 😬 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🤧 🥵 🥶 🥴 😵 🤯',
  },
  {
    name: 'Hands',
    symbols:
      '👋 🤚 🖐 ✋ 🖖 👌 🤌 🤏 ✌ 🤞 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🤝 🙏 ✍ 💅 🤳 💪',
  },
  {
    name: 'Hearts',
    symbols: '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣ 💕 💞 💓 💗 💖 💘 💝 💟 ♥ 💌 💋 😍 🥰 😘',
  },
  {
    name: 'People',
    symbols:
      '👶 🧒 👦 👧 🧑 👨 👩 🧔 👱 👴 👵 🙍 🙎 🙅 🙆 💁 🙋 🧏 🙇 🤦 🤷 👮 🕵 💂 👷 🤴 👸 👳 👲 🧕 🤵 👰 🤰 🤱',
  },
  {
    name: 'Fun',
    symbols:
      '🎉 🎊 🎈 🎁 🎂 🕯 🎵 🎶 🎧 🎤 🎬 🎮 🕹 🎯 🎲 🧩 🎨 🖌 🏆 🥇 🥈 🥉 ⚽ 🏀 🏈 ⚾ 🎾 🏐 🎱 🏓 🏸 🥊',
  },
  {
    name: 'Travel',
    symbols:
      '🌍 🌎 🌏 🌐 🗺 🧭 🏔 ⛰ 🌋 🗻 🏕 🏖 🏜 🏝 🏞 🏟 🏛 🏗 🏘 🏠 🏢 🏬 🏥 🏦 🏨 ✈ 🛫 🛬 🚁 🚗 🚕 🚌 🚎 🏎 🚓 🚑 🚒 🚚 🚢',
  },
  {
    name: 'Food',
    symbols:
      '🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🥑 🥦 🥬 🥒 🌶 🌽 🥕 🧄 🧅 🥔 🍞 🥐 🥖 🧀 🍖 🍗 🥩 🍔 🍟 🍕 🌮 🌯 🥗 🍝 🍣 🍰 ☕',
  },
  {
    name: 'Objects',
    symbols:
      '📱 💻 🖥 ⌨ 🖱 🖨 📷 🎥 📞 ☎ 📟 📠 🔋 🔌 💡 🔦 🕯 🧯 🛢 💸 💵 💳 💎 ⚖ 🔧 🔨 🛠 ⚙ 🧰 🧲 🧪 💊 🩺 🔑 🗝 🚪 🛏 🛋',
  },
];

const FREE_EMOJI_COLLECTION = EMOJI_CATEGORIES.flatMap((category) =>
  category.symbols.split(/\s+/).map((symbol) => ({
    symbol,
    category: category.name,
  })),
);

const CALL_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
];

function userDisplayName(user?: Partial<ChatUser> | null) {
  return user?.name || user?.email || 'User';
}

function uidLabel(user?: Partial<ChatUser> | null) {
  if (!user?.displayUserId) return '';
  return `UID${String(user.displayUserId).padStart(3, '0')}`;
}

function initials(name: string) {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function bytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0 KB';
  if (value > 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(value / 1024))} KB`;
}

function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function conversationTitle(conversation: ChatConversation | undefined, currentUserId?: string) {
  if (!conversation) return 'Select Chat';
  if (conversation.title) return conversation.title;

  if (conversation.type === 'broadcast') return 'Broadcast List';
  if (conversation.type === 'group') return 'Group Chat';

  const other = conversation.participants.find(
    (participant) => participant.user.id !== currentUserId,
  )?.user;
  return userDisplayName(other);
}

function conversationSubtitle(conversation: ChatConversation | undefined, currentUserId?: string) {
  if (!conversation) return '';

  if (conversation.type === 'direct') {
    const other = conversation.participants.find(
      (participant) => participant.user.id !== currentUserId,
    )?.user;
    return [uidLabel(other), other?.role].filter(Boolean).join(' - ');
  }

  return `${conversation.participants.length} members`;
}

function messagePreview(message: ChatMessage | null) {
  if (!message) return 'No messages yet';
  const shareType =
    typeof message.metadata?.shareType === 'string' ? message.metadata.shareType : '';
  if (shareType === 'contact') return 'Shared contact';
  if (shareType === 'poll') return 'Shared poll';
  if (shareType === 'event') return 'Shared event';
  if (shareType === 'ai_image') return 'AI image request';
  if (shareType === 'fax') return 'Fax request';
  if (shareType === 'app') return 'Shared app';
  if (message.messageType === 'location') return 'Shared location';
  if (message.messageType === 'emoji') return 'Custom emoji';
  if (message.messageType.includes('call')) return message.body || 'Call invite';
  if (message.attachments?.length) return message.attachments[0]?.name || 'Attachment';
  return message.body || 'Message';
}

function attachmentKind(files: ChatAttachment[]) {
  if (!files.length) return 'text';
  if (files.every((file) => file.type.startsWith('image/'))) return 'image';
  if (files.every((file) => file.type.startsWith('video/'))) return 'video';
  if (files.every((file) => file.type.startsWith('audio/'))) return 'audio';
  return 'file';
}

function messageMatchesMediaFilter(message: ChatMessage, filter: MediaQuickFilter) {
  if (filter === 'all') return true;
  if (filter === 'recordings') return Boolean(message.metadata?.recording);

  const files = message.attachments || [];
  if (filter === 'images') return files.some((file) => file.type.startsWith('image/'));
  if (filter === 'videos') return files.some((file) => file.type.startsWith('video/'));

  return files.length > 0 || Boolean(message.metadata?.recording);
}

function mediaFilterEmptyText(filter: MediaQuickFilter) {
  if (filter === 'images') return 'No images in this chat yet.';
  if (filter === 'videos') return 'No videos in this chat yet.';
  if (filter === 'recordings') return 'No saved call recordings in this chat yet.';
  return 'No media in this chat yet.';
}

function metadataObject(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function textValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function callMessageType(mode: CallMode) {
  return mode === 'video' ? 'video_call' : mode === 'group' ? 'group_call' : 'voice_call';
}

function callMessageBody(mode: CallMode) {
  return mode === 'video'
    ? 'Video call connected'
    : mode === 'group'
      ? 'Group call connected'
      : 'Voice call connected';
}

export default function AccountChat() {
  const { toast } = useToast();
  const [selectedConversationId, setSelectedConversationId] = useState<string>('');
  const [newChatType, setNewChatType] = useState<NewChatType>('direct');
  const [newChatTitle, setNewChatTitle] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [messageText, setMessageText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState('');
  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState(
    EMOJI_CATEGORIES[0]?.name || 'Smileys',
  );
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const emojiInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const activeCallRef = useRef<ActiveCall | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const ringtoneIntervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaFailureToastRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingMimeTypeRef = useRef('');
  const recordingKindRef = useRef<'audio' | 'video'>('audio');
  const recordingShareModeRef = useRef<'chat' | 'private'>('chat');
  const recordingAudioContextRef = useRef<AudioContext | null>(null);
  const recordingSourceNodesRef = useRef<MediaStreamAudioSourceNode[]>([]);
  const messageRecorderRef = useRef<MediaRecorder | null>(null);
  const messageRecordingChunksRef = useRef<Blob[]>([]);
  const messageRecordingStreamRef = useRef<MediaStream | null>(null);
  const messageRecordingMimeTypeRef = useRef('');
  const messageRecordingKindRef = useRef<ChatRecordingKind>('audio');
  const messageRecordingCancelledRef = useRef(false);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [realtimeReady, setRealtimeReady] = useState(false);
  const [callSoundReady, setCallSoundReady] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [callConnectionState, setCallConnectionState] = useState('Idle');
  const [localAudioStatus, setLocalAudioStatus] = useState('Microphone Not Started');
  const [remoteAudioStatus, setRemoteAudioStatus] = useState('Waiting For Remote Audio');
  const [previewAttachment, setPreviewAttachment] = useState<ChatAttachment | null>(null);
  const [forwardAttachment, setForwardAttachment] = useState<ChatAttachment | null>(null);
  const [forwardConversationId, setForwardConversationId] = useState('');
  const [recordingChoiceOpen, setRecordingChoiceOpen] = useState(false);
  const [mediaQuickFilter, setMediaQuickFilter] = useState<MediaQuickFilter>('all');
  const [isRecordingCall, setIsRecordingCall] = useState(false);
  const [messageRecordingKind, setMessageRecordingKind] = useState<ChatRecordingKind | null>(null);
  const [messageRecordingStartedAt, setMessageRecordingStartedAt] = useState<number | null>(null);
  const [messageRecordingSeconds, setMessageRecordingSeconds] = useState(0);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [sharePanel, setSharePanel] = useState<ShareComposerPanel>(null);
  const [contactForm, setContactForm] = useState({ name: '', phone: '', email: '' });
  const [pollForm, setPollForm] = useState({ question: '', options: ['', '', ''] });
  const [eventForm, setEventForm] = useState({ title: '', date: '', location: '', notes: '' });
  const [aiImagePrompt, setAiImagePrompt] = useState('');
  const [faxForm, setFaxForm] = useState({ number: '', notes: '' });

  const bootstrapQuery = useQuery<ChatBootstrap>({
    queryKey: ['/api/chat/bootstrap'],
    refetchInterval: 7000,
  });

  const conversations = bootstrapQuery.data?.conversations || [];
  const currentUser = bootstrapQuery.data?.currentUser;
  const selectedConversation = conversations.find(
    (conversation) => conversation.id === selectedConversationId,
  );
  const userSearchTerm = userSearch.trim();
  const userSearchDigits = userSearchTerm.replace(/\D/g, '');
  const userSearchReady = userSearchTerm.length >= 3 || userSearchDigits.length >= 3;

  const usersQuery = useQuery<ChatUser[]>({
    queryKey: ['/api/chat/users', { search: userSearchTerm }],
    enabled: Boolean(currentUser?.id && userSearchReady),
    refetchInterval: false,
  });

  const realtimeTokenQuery = useQuery<RealtimeToken>({
    queryKey: ['/api/chat/realtime-token'],
    enabled: Boolean(currentUser?.id),
    staleTime: 1000 * 60 * 45,
  });

  const rtcConfigQuery = useQuery<RtcConfig>({
    queryKey: ['/api/chat/rtc-config'],
    enabled: Boolean(currentUser?.id),
    staleTime: 1000 * 60 * 10,
  });

  const messagesQuery = useQuery<ChatMessage[]>({
    queryKey: [`/api/chat/conversations/${selectedConversationId}/messages`],
    enabled: Boolean(selectedConversationId),
    refetchInterval: 4000,
  });

  useEffect(() => {
    if (!selectedConversationId && conversations[0]) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  useEffect(() => {
    setMediaQuickFilter('all');
    setShareMenuOpen(false);
    setSharePanel(null);
  }, [selectedConversationId]);

  useEffect(() => {
    if (!messageRecordingStartedAt) return undefined;

    const timer = window.setInterval(() => {
      setMessageRecordingSeconds((Date.now() - messageRecordingStartedAt) / 1000);
    }, 500);

    return () => window.clearInterval(timer);
  }, [messageRecordingStartedAt]);

  useEffect(
    () => () => {
      messageRecordingCancelledRef.current = true;
      if (messageRecorderRef.current && messageRecorderRef.current.state !== 'inactive') {
        messageRecorderRef.current.stop();
      }
      messageRecordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messagesQuery.data?.length, selectedConversationId]);

  useEffect(() => {
    activeCallRef.current = activeCall;
    attachMediaStreams();
  }, [activeCall]);

  useEffect(() => {
    const token = realtimeTokenQuery.data?.token;
    if (!token || !currentUser?.id) return undefined;

    const socket = connectSocket(token);
    socketRef.current = socket;
    socket.emit('chat:ready');
    setRealtimeReady(socket.connected);

    const handleConnect = () => {
      setRealtimeReady(true);
      socket.emit('chat:ready');
    };
    const handleDisconnect = () => setRealtimeReady(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('chat:call:incoming', handleIncomingCall);
    socket.on('chat:call:accepted', handleCallAccepted);
    socket.on('chat:call:offer', handleRemoteOffer);
    socket.on('chat:call:answer', handleRemoteAnswer);
    socket.on('chat:call:ice-candidate', handleRemoteIce);
    socket.on('chat:call:rejected', handleCallRejected);
    socket.on('chat:call:ended', handleCallEnded);
    socket.on('chat:call:recording-state', handleCallRecordingState);
    socket.on('chat:call:error', handleCallError);
    socket.on('chat:call:offline-notified', handleCallOfflineNotified);
    socket.on('chat:call:mobile-notified', handleCallMobileNotified);
    socket.on('chat:call:mobile-opened', handleCallMobileOpened);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('chat:call:incoming', handleIncomingCall);
      socket.off('chat:call:accepted', handleCallAccepted);
      socket.off('chat:call:offer', handleRemoteOffer);
      socket.off('chat:call:answer', handleRemoteAnswer);
      socket.off('chat:call:ice-candidate', handleRemoteIce);
      socket.off('chat:call:rejected', handleCallRejected);
      socket.off('chat:call:ended', handleCallEnded);
      socket.off('chat:call:recording-state', handleCallRecordingState);
      socket.off('chat:call:error', handleCallError);
      socket.off('chat:call:offline-notified', handleCallOfflineNotified);
      socket.off('chat:call:mobile-notified', handleCallMobileNotified);
      socket.off('chat:call:mobile-opened', handleCallMobileOpened);
    };
  }, [currentUser?.id, realtimeTokenQuery.data?.token]);

  const visibleUsers = useMemo(() => {
    if (!userSearchReady) return [];
    const users = usersQuery.data || [];
    return users.filter((user) => user.id !== currentUser?.id);
  }, [currentUser?.id, userSearchReady, usersQuery.data]);

  const selectedUsers = useMemo(
    () => visibleUsers.filter((user) => selectedUserIds.includes(user.id)),
    [selectedUserIds, visibleUsers],
  );

  const forwardConversationOptions = useMemo(
    () => conversations.filter((conversation) => conversation.id !== selectedConversationId),
    [conversations, selectedConversationId],
  );

  const filteredEmojis = useMemo(() => {
    const search = emojiSearch.trim().toLowerCase();
    return FREE_EMOJI_COLLECTION.filter((emoji) => {
      const matchesCategory =
        selectedEmojiCategory === 'All' || emoji.category === selectedEmojiCategory;
      const matchesSearch =
        !search || emoji.category.toLowerCase().includes(search) || emoji.symbol.includes(search);
      return matchesCategory && matchesSearch;
    });
  }, [emojiSearch, selectedEmojiCategory]);

  const displayedMessages = useMemo(() => {
    const messages = messagesQuery.data || [];
    return messages.filter((message) => messageMatchesMediaFilter(message, mediaQuickFilter));
  }, [mediaQuickFilter, messagesQuery.data]);

  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/chat/conversations', {
        type: newChatType,
        title: newChatType === 'direct' ? null : newChatTitle,
        participantIds: selectedUserIds,
      });
      return response.json();
    },
    onSuccess: async (response) => {
      const conversationId = response?.data?.conversationId;
      await queryClient.invalidateQueries({ queryKey: ['/api/chat/bootstrap'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/chat/conversations'] });
      if (conversationId) setSelectedConversationId(conversationId);
      setSelectedUserIds([]);
      setNewChatTitle('');
      toast({ title: 'Chat Ready', description: 'The conversation is ready to use.' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Chat Not Created',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const forwardAttachmentMutation = useMutation({
    mutationFn: async ({
      conversationId,
      file,
    }: {
      conversationId: string;
      file: ChatAttachment;
    }) => {
      const response = await apiRequest(
        'POST',
        `/api/chat/conversations/${conversationId}/messages`,
        {
          messageType: attachmentKind([file]),
          body: `Forwarded ${file.name}`,
          attachments: [file],
          metadata: {
            forwarded: true,
            originalName: file.name,
            forwardedAt: new Date().toISOString(),
          },
        },
      );
      return response.json();
    },
    onSuccess: async () => {
      setForwardAttachment(null);
      setForwardConversationId('');
      await queryClient.invalidateQueries({ queryKey: ['/api/chat/bootstrap'] });
      await queryClient.invalidateQueries({
        queryKey: [`/api/chat/conversations/${selectedConversationId}/messages`],
      });
      toast({ title: 'Forwarded', description: 'The file was forwarded to the selected chat.' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Forward Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (payload: {
      messageType: string;
      body?: string;
      attachments?: ChatAttachment[];
      location?: Record<string, unknown>;
      emoji?: Record<string, unknown>;
      call?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    }) => {
      const response = await apiRequest(
        'POST',
        `/api/chat/conversations/${selectedConversationId}/messages`,
        payload,
      );
      return response.json();
    },
    onSuccess: async () => {
      setMessageText('');
      setPendingAttachments([]);
      await queryClient.invalidateQueries({
        queryKey: [`/api/chat/conversations/${selectedConversationId}/messages`],
      });
      await queryClient.invalidateQueries({ queryKey: ['/api/chat/bootstrap'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Message Not Sent',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({
      files,
    }: {
      files: File[];
      mode: UploadMode;
      recordingKind?: 'audio' | 'video';
      recordingBody?: string;
      recordingShareMode?: 'chat' | 'private';
      chatRecordingKind?: ChatRecordingKind;
      chatRecordingBody?: string;
    }) => {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      const response = await apiRequest('POST', '/api/chat/uploads', formData);
      const payload = await response.json();
      return (payload?.data?.files || []) as ChatAttachment[];
    },
    onSuccess: (files, variables) => {
      if (!files.length) return;

      if (variables.mode === 'emoji') {
        sendMessageMutation.mutate({
          messageType: 'emoji',
          body: 'Custom emoji',
          attachments: files,
          emoji: { source: 'upload', name: files[0]?.name || 'Custom emoji' },
        });
        return;
      }

      if (variables.mode === 'recording') {
        sendMessageMutation.mutate({
          messageType: variables.recordingKind === 'video' ? 'video' : 'audio',
          body: variables.recordingBody || 'Call recording',
          attachments: files,
          metadata: {
            recording: true,
            recordingKind: variables.recordingKind || 'audio',
            recordingVisibility: variables.recordingShareMode || 'chat',
            privateRecording: variables.recordingShareMode === 'private',
            savedAt: new Date().toISOString(),
          },
        });
        return;
      }

      if (variables.mode === 'chat-recording') {
        sendMessageMutation.mutate({
          messageType: variables.chatRecordingKind === 'video' ? 'video' : 'audio',
          body:
            variables.chatRecordingBody ||
            (variables.chatRecordingKind === 'video' ? 'Video recording' : 'Voice recording'),
          attachments: files,
          metadata: {
            chatRecording: true,
            chatRecordingKind: variables.chatRecordingKind || 'audio',
            savedAt: new Date().toISOString(),
          },
        });
        return;
      }

      setPendingAttachments((current) => [...current, ...files]);
    },
    onError: (error: Error) => {
      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  async function unlockCallAudio(showToast = false) {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const context = audioContextRef.current || new AudioContextClass();
        audioContextRef.current = context;

        if (context.state === 'suspended') {
          await context.resume();
        }

        const oscillator = context.createOscillator();
        const gain = context.createGain();
        gain.gain.value = 0.0001;
        oscillator.frequency.value = 440;
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.03);
      }

      const remoteAudio = remoteAudioRef.current;
      if (remoteAudio && remoteStreamRef.current) {
        remoteAudio.srcObject = remoteStreamRef.current;
        remoteAudio.muted = false;
        remoteAudio.volume = 1;
        await remoteAudio.play();
      }

      setCallSoundReady(true);
      setAudioBlocked(false);
      return true;
    } catch {
      setAudioBlocked(true);
      if (showToast) {
        toast({
          title: 'Sound Needs Permission',
          description:
            'Tap Enable Sound again or click inside Chat so the browser allows call audio.',
          variant: 'destructive',
        });
      }
      return false;
    }
  }

  function attachMediaStreams() {
    if (remoteAudioRef.current && remoteStreamRef.current) {
      const remoteAudio = remoteAudioRef.current;
      if (remoteAudio.srcObject !== remoteStreamRef.current) {
        remoteAudio.srcObject = remoteStreamRef.current;
      }
      remoteAudio.autoplay = true;
      remoteAudio.muted = false;
      remoteAudio.volume = 1;
      setRemoteAudioStatus(
        remoteStreamRef.current.getAudioTracks().some((track) => track.readyState === 'live')
          ? 'Remote Audio Track Ready'
          : 'No Remote Audio Track Yet',
      );
      void remoteAudio
        .play()
        .then(() => {
          setAudioBlocked(false);
          setRemoteAudioStatus('Remote Audio Playing');
        })
        .catch(() => {
          setAudioBlocked(true);
          setRemoteAudioStatus('Press Play Or Enable Sound');
        });
    }

    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
      void remoteVideoRef.current.play().catch(() => undefined);
    }

    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      void localVideoRef.current.play().catch(() => undefined);
    }
  }

  function openForwardDialog(file: ChatAttachment) {
    const firstTarget =
      forwardConversationOptions[0] ||
      conversations.find((conversation) => conversation.id !== selectedConversationId);
    if (!firstTarget) {
      toast({
        title: 'No Other Chat',
        description: 'Create or open another conversation before forwarding files.',
        variant: 'destructive',
      });
      return;
    }

    setForwardAttachment(file);
    setForwardConversationId(firstTarget.id);
  }

  function supportedRecordingMime(kind: 'audio' | 'video') {
    const candidates =
      kind === 'video'
        ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
        : ['audio/webm;codecs=opus', 'audio/webm'];

    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  }

  function stopMessageRecordingStream() {
    messageRecordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    messageRecordingStreamRef.current = null;
  }

  function resetMessageRecordingState() {
    messageRecorderRef.current = null;
    messageRecordingChunksRef.current = [];
    messageRecordingMimeTypeRef.current = '';
    stopMessageRecordingStream();
    setMessageRecordingKind(null);
    setMessageRecordingStartedAt(null);
    setMessageRecordingSeconds(0);
  }

  async function startMessageRecording(kind: ChatRecordingKind) {
    if (!selectedConversationId) {
      toast({
        title: 'Select Chat',
        description: 'Open a conversation before recording a voice or video message.',
        variant: 'destructive',
      });
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || !('MediaRecorder' in window)) {
      toast({
        title: 'Recording Not Supported',
        description: 'This browser does not support voice or video recording.',
        variant: 'destructive',
      });
      return;
    }

    if (messageRecorderRef.current || messageRecordingKind) {
      toast({
        title: 'Recording Already Active',
        description: 'Stop or cancel the current recording first.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const constraints: MediaStreamConstraints =
        kind === 'video'
          ? {
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
              video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30, max: 30 },
              },
            }
          : {
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
            };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const mimeType = supportedRecordingMime(kind);
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      messageRecordingStreamRef.current = stream;
      messageRecordingChunksRef.current = [];
      messageRecordingMimeTypeRef.current = mimeType;
      messageRecordingKindRef.current = kind;
      messageRecordingCancelledRef.current = false;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) messageRecordingChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const chunks = messageRecordingChunksRef.current;
        const cancelled = messageRecordingCancelledRef.current;
        const fileKind = messageRecordingKindRef.current;
        const blobType =
          messageRecordingMimeTypeRef.current ||
          (fileKind === 'video' ? 'video/webm' : 'audio/webm');

        resetMessageRecordingState();
        if (cancelled || !chunks.length) return;

        const blob = new Blob(chunks, { type: blobType });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${fileKind === 'video' ? 'video-message' : 'voice-message'}-${timestamp}.webm`;
        const file = new File([blob], fileName, { type: blobType });

        uploadMutation.mutate({
          files: [file],
          mode: 'chat-recording',
          chatRecordingKind: fileKind,
          chatRecordingBody: fileKind === 'video' ? 'Video recording' : 'Voice recording',
        });
      };

      recorder.onerror = () => {
        messageRecordingCancelledRef.current = true;
        resetMessageRecordingState();
        toast({
          title: 'Recording Failed',
          description: 'The browser stopped the recording unexpectedly.',
          variant: 'destructive',
        });
      };

      messageRecorderRef.current = recorder;
      recorder.start(1000);
      setMessageRecordingKind(kind);
      setMessageRecordingStartedAt(Date.now());
      setMessageRecordingSeconds(0);
      toast({
        title: kind === 'video' ? 'Video Recording Started' : 'Voice Recording Started',
        description: 'Press Stop And Send when you are ready to share it in this chat.',
      });
    } catch (error: any) {
      resetMessageRecordingState();
      toast({
        title: 'Recording Blocked',
        description: error?.message || 'Microphone or camera permission was not allowed.',
        variant: 'destructive',
      });
    }
  }

  function stopMessageRecording(send = true) {
    const recorder = messageRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    messageRecordingCancelledRef.current = !send;
    recorder.stop();
    if (!send) {
      toast({ title: 'Recording Cancelled', description: 'The recording was not sent.' });
    }
  }

  async function buildRecordingStream(kind: 'audio' | 'video') {
    const tracks: MediaStreamTrack[] = [];
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;

    if (AudioContextClass) {
      recordingAudioContextRef.current?.close().catch(() => undefined);
      recordingSourceNodesRef.current = [];
      const context = new AudioContextClass();
      if (context.state === 'suspended') {
        await context.resume();
      }
      const destination = context.createMediaStreamDestination();
      const audioStreams = [localStreamRef.current, remoteStreamRef.current].filter(
        Boolean,
      ) as MediaStream[];

      audioStreams.forEach((stream) => {
        const audioTracks = stream.getAudioTracks().filter((track) => track.readyState === 'live');
        if (!audioTracks.length) return;
        const source = context.createMediaStreamSource(new MediaStream(audioTracks));
        source.connect(destination);
        recordingSourceNodesRef.current.push(source);
      });

      tracks.push(...destination.stream.getAudioTracks());
      recordingAudioContextRef.current = context;
    } else {
      tracks.push(
        ...(localStreamRef.current
          ?.getAudioTracks()
          .filter((track) => track.readyState === 'live') || []),
      );
      tracks.push(
        ...(remoteStreamRef.current
          ?.getAudioTracks()
          .filter((track) => track.readyState === 'live') || []),
      );
    }

    if (kind === 'video') {
      const videoTrack =
        remoteStreamRef.current?.getVideoTracks()[0] || localStreamRef.current?.getVideoTracks()[0];
      if (videoTrack) tracks.push(videoTrack);
    }

    if (!tracks.length) {
      throw new Error('No call media is available to record yet.');
    }

    const audioTrackCount = tracks.filter(
      (track) => track.kind === 'audio' && track.readyState === 'live',
    ).length;
    if (!audioTrackCount) {
      throw new Error('No live microphone or remote audio track is available to record yet.');
    }

    return new MediaStream(tracks);
  }

  function stopCallRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    const call = activeCallRef.current;
    if (call && recordingShareModeRef.current === 'chat') {
      socketRef.current?.emit('chat:call:recording-state', {
        callId: call.callId,
        conversationId: call.conversationId,
        toUserId: call.remoteUserId,
        targetUserIds: call.targetUserIds,
        isRecording: false,
      });
    }
    recorder.stop();
    setIsRecordingCall(false);
  }

  async function startCallRecording(shareMode: 'chat' | 'private') {
    const call = activeCallRef.current;
    if (!call) return;

    if (!('MediaRecorder' in window)) {
      toast({
        title: 'Recording Not Supported',
        description: 'This browser does not support call recording.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const kind: 'audio' | 'video' =
        call.mode === 'video' || call.mode === 'group' ? 'video' : 'audio';
      await unlockCallAudio(false);
      const stream = await buildRecordingStream(kind);
      const mimeType = supportedRecordingMime(kind);
      recordingChunksRef.current = [];
      recordingKindRef.current = kind;
      recordingMimeTypeRef.current = mimeType;
      recordingShareModeRef.current = shareMode;

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const chunks = recordingChunksRef.current;
        recordingChunksRef.current = [];
        recordingAudioContextRef.current?.close().catch(() => undefined);
        recordingAudioContextRef.current = null;
        recordingSourceNodesRef.current = [];
        mediaRecorderRef.current = null;

        if (!chunks.length) return;
        const fileKind = recordingKindRef.current;
        const blobType =
          recordingMimeTypeRef.current || (fileKind === 'video' ? 'video/webm' : 'audio/webm');
        const blob = new Blob(chunks, { type: blobType });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${fileKind === 'video' ? 'video-call' : 'voice-call'}-recording-${timestamp}.webm`;
        const file = new File([blob], fileName, { type: blobType });

        if (recordingShareModeRef.current === 'private') {
          const downloadUrl = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = downloadUrl;
          anchor.download = fileName;
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 30000);
          toast({
            title: 'Private Recording Saved',
            description:
              'The recording was downloaded and a private copy is saved in this chat for you only.',
          });
        }

        uploadMutation.mutate({
          files: [file],
          mode: 'recording',
          recordingKind: fileKind,
          recordingShareMode: recordingShareModeRef.current,
          recordingBody:
            recordingShareModeRef.current === 'private'
              ? fileKind === 'video'
                ? 'Private video call recording'
                : 'Private voice call recording'
              : fileKind === 'video'
                ? 'Video call recording'
                : 'Voice call recording',
        });
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setIsRecordingCall(true);
      setRecordingChoiceOpen(false);
      if (shareMode === 'chat') {
        socketRef.current?.emit('chat:call:recording-state', {
          callId: call.callId,
          conversationId: call.conversationId,
          toUserId: call.remoteUserId,
          targetUserIds: call.targetUserIds,
          isRecording: true,
        });
      }
      toast({
        title: 'Recording Started',
        description:
          shareMode === 'chat'
            ? 'This recording will be saved in chat for the other user to see.'
            : 'This recording will be saved privately on this device.',
      });
    } catch (error: any) {
      recordingAudioContextRef.current?.close().catch(() => undefined);
      recordingAudioContextRef.current = null;
      recordingSourceNodesRef.current = [];
      toast({
        title: 'Recording Failed',
        description: error?.message || 'Could not start call recording.',
        variant: 'destructive',
      });
    }
  }

  function stopRingtone() {
    if (ringtoneIntervalRef.current) {
      window.clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
  }

  function playRingtone() {
    if (ringtoneIntervalRef.current) return;

    const playTone = () => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;

        const context = audioContextRef.current || new AudioContextClass();
        audioContextRef.current = context;
        if (context.state === 'suspended') {
          setAudioBlocked(true);
          return;
        }

        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = 880;
        gain.gain.value = 0.08;
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.22);
        setAudioBlocked(false);
      } catch {
        setAudioBlocked(true);
      }
    };

    playTone();
    ringtoneIntervalRef.current = window.setInterval(playTone, 1300);
  }

  function closePeerConnection() {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.oniceconnectionstatechange = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  }

  function stopLocalStream() {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  }

  function finishCall(notifyPeer = false) {
    const call = activeCallRef.current;
    stopCallRecording();
    if (notifyPeer && call && socketRef.current) {
      socketRef.current.emit('chat:call:end', {
        callId: call.callId,
        conversationId: call.conversationId,
        targetUserIds: call.targetUserIds,
        toUserId: call.remoteUserId,
      });
    }

    stopRingtone();
    closePeerConnection();
    stopLocalStream();
    setActiveCall(null);
    setAudioBlocked(false);
    setCallConnectionState('Idle');
    setLocalAudioStatus('Microphone Not Started');
    setRemoteAudioStatus('Waiting For Remote Audio');
  }

  async function prepareLocalStream(mode: CallMode) {
    if (localStreamRef.current) return localStreamRef.current;

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('This browser does not support voice or video calls.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: { ideal: true },
        noiseSuppression: { ideal: true },
        autoGainControl: { ideal: true },
        sampleRate: { ideal: 48000 },
        sampleSize: { ideal: 16 },
        channelCount: { ideal: 1 },
      },
      video:
        mode === 'video' || mode === 'group'
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user',
            }
          : false,
    });

    localStreamRef.current = stream;
    const audioTracks = stream.getAudioTracks();
    setLocalAudioStatus(
      audioTracks.length
        ? audioTracks.every((track) => track.readyState === 'live' && track.enabled)
          ? 'Microphone Ready'
          : 'Microphone Track Muted'
        : 'No Microphone Track',
    );
    window.setTimeout(attachMediaStreams, 0);
    return stream;
  }

  function createPeerConnection(call: ActiveCall, remoteUserId: string) {
    closePeerConnection();
    mediaFailureToastRef.current = false;
    setCallConnectionState('Starting Media');

    const peerConnection = new RTCPeerConnection({
      iceServers: rtcConfigQuery.data?.iceServers?.length
        ? rtcConfigQuery.data.iceServers
        : CALL_ICE_SERVERS,
      iceTransportPolicy: rtcConfigQuery.data?.iceTransportPolicy || 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      iceCandidatePoolSize: 10,
    });

    localStreamRef.current?.getTracks().forEach((track) => {
      if (localStreamRef.current) {
        const sender = peerConnection.addTrack(track, localStreamRef.current);
        const parameters = sender.getParameters();
        parameters.encodings = parameters.encodings?.length ? parameters.encodings : [{}];
        parameters.encodings[0].maxBitrate = track.kind === 'audio' ? 96000 : 2500000;
        void sender.setParameters(parameters).catch(() => undefined);
      }
    });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('chat:call:ice-candidate', {
          callId: call.callId,
          conversationId: call.conversationId,
          toUserId: remoteUserId,
          candidate: event.candidate,
        });
      }
    };

    peerConnection.ontrack = (event) => {
      if (event.streams[0]) {
        remoteStreamRef.current = event.streams[0];
      } else {
        if (!remoteStreamRef.current) remoteStreamRef.current = new MediaStream();
        remoteStreamRef.current.addTrack(event.track);
      }
      setRemoteAudioStatus(
        remoteStreamRef.current.getAudioTracks().some((track) => track.readyState === 'live')
          ? 'Remote Audio Track Ready'
          : 'Waiting For Remote Audio',
      );
      attachMediaStreams();
      setActiveCall((current) =>
        current && current.callId === call.callId ? { ...current, status: 'active' } : current,
      );
    };

    const reportMediaState = () => {
      const connectionState = peerConnection.connectionState || 'new';
      const iceState = peerConnection.iceConnectionState || 'new';
      setCallConnectionState(`${connectionState} / ${iceState}`);

      if (
        !mediaFailureToastRef.current &&
        (connectionState === 'failed' || iceState === 'failed' || iceState === 'disconnected')
      ) {
        mediaFailureToastRef.current = true;
        toast({
          title: 'Call Media Not Connected',
          description:
            'Signaling is working, but audio/video media could not reach the other user. A TURN relay may be required for this network.',
          variant: 'destructive',
        });
      }
    };

    peerConnection.onconnectionstatechange = reportMediaState;
    peerConnection.oniceconnectionstatechange = reportMediaState;

    peerConnectionRef.current = peerConnection;
    return peerConnection;
  }

  function waitForRealtime(timeoutMs = 5000) {
    const socket = socketRef.current;
    if (!socket) return Promise.resolve(false);
    if (socket.connected) return Promise.resolve(true);

    socket.connect();
    return new Promise<boolean>((resolve) => {
      const timeout = window.setTimeout(() => {
        socket.off('connect', handleConnect);
        resolve(false);
      }, timeoutMs);

      const handleConnect = () => {
        window.clearTimeout(timeout);
        socket.off('connect', handleConnect);
        socket.emit('chat:ready');
        resolve(true);
      };

      socket.on('connect', handleConnect);
    });
  }

  async function startCall(mode: CallMode) {
    if (!selectedConversation || !currentUser?.id || !socketRef.current) {
      toast({
        title: 'Call Not Ready',
        description: 'Open a chat and wait for realtime connection before calling.',
        variant: 'destructive',
      });
      return;
    }

    const otherParticipants = selectedConversation.participants
      .map((participant) => participant.user)
      .filter((user) => user.id !== currentUser.id);

    if (!otherParticipants.length) {
      toast({
        title: 'No Receiver',
        description: 'Select a chat with at least one other user.',
        variant: 'destructive',
      });
      return;
    }

    const realtimeConnected = await waitForRealtime();
    if (!realtimeConnected) {
      toast({
        title: 'Realtime Not Connected',
        description: 'The call channel could not connect. Refresh Chat and try again.',
        variant: 'destructive',
      });
      return;
    }

    await unlockCallAudio(false);

    const targetUsers = mode === 'group' ? otherParticipants : [otherParticipants[0]];
    const targetUserIds = targetUsers.map((user) => user.id);
    const callId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const call: ActiveCall = {
      callId,
      conversationId: selectedConversation.id,
      mode,
      status: 'outgoing',
      remoteUserId: targetUsers[0].id,
      remoteName:
        mode === 'group' ? `${targetUsers.length} Participants` : userDisplayName(targetUsers[0]),
      targetUserIds,
    };

    setActiveCall(call);
    setCallConnectionState('Ringing');

    try {
      await prepareLocalStream(mode);
      socketRef.current.emit('chat:call:invite', {
        callId,
        conversationId: selectedConversation.id,
        mode,
        targetUserIds,
      });
    } catch (error: any) {
      finishCall(false);
      toast({
        title: 'Call Permission Needed',
        description: error?.message || 'Allow microphone and camera access to start the call.',
        variant: 'destructive',
      });
    }
  }

  async function acceptCall() {
    const call = activeCallRef.current;
    if (!call || call.status !== 'incoming' || !socketRef.current) return;

    try {
      stopRingtone();
      await unlockCallAudio(false);
      await prepareLocalStream(call.mode);
      setActiveCall({ ...call, status: 'connecting' });
      setCallConnectionState('Connecting');
      socketRef.current.emit('chat:call:accept', {
        callId: call.callId,
        conversationId: call.conversationId,
        toUserId: call.remoteUserId,
      });
    } catch (error: any) {
      rejectCall('media-denied');
      toast({
        title: 'Call Permission Needed',
        description: error?.message || 'Allow microphone and camera access to answer.',
        variant: 'destructive',
      });
    }
  }

  function rejectCall(reason = 'rejected') {
    const call = activeCallRef.current;
    if (call && socketRef.current) {
      socketRef.current.emit('chat:call:reject', {
        callId: call.callId,
        conversationId: call.conversationId,
        toUserId: call.remoteUserId,
        reason,
      });
    }
    finishCall(false);
  }

  function handleIncomingCall(payload: any) {
    if (!payload?.callId || payload.fromUserId === currentUser?.id) return;

    const existing = activeCallRef.current;
    if (existing && existing.callId !== payload.callId) {
      socketRef.current?.emit('chat:call:reject', {
        callId: payload.callId,
        conversationId: payload.conversationId,
        toUserId: payload.fromUserId,
        reason: 'busy',
      });
      return;
    }

    const mode: CallMode =
      payload.mode === 'video' || payload.mode === 'group' ? payload.mode : 'voice';

    const incomingCall: ActiveCall = {
      callId: payload.callId,
      conversationId: payload.conversationId,
      mode,
      status: 'incoming',
      remoteUserId: payload.fromUserId,
      remoteName: userDisplayName(payload.fromUser),
      targetUserIds: [payload.fromUserId],
    };

    setActiveCall(incomingCall);
    setCallConnectionState('Incoming');
    playRingtone();
    toast({
      title:
        mode === 'video'
          ? 'Incoming Video Call'
          : mode === 'group'
            ? 'Incoming Group Call'
            : 'Incoming Voice Call',
      description: `${incomingCall.remoteName} is calling you.`,
    });
  }

  async function handleCallAccepted(payload: any) {
    const call = activeCallRef.current;
    if (!call || call.callId !== payload?.callId || !socketRef.current) return;

    try {
      const remoteUserId = payload.fromUserId;
      const connectedCall = {
        ...call,
        status: 'connecting' as CallStatus,
        remoteUserId,
        remoteName: userDisplayName(payload.fromUser) || call.remoteName,
        targetUserIds: [remoteUserId],
      };
      setActiveCall(connectedCall);

      await prepareLocalStream(call.mode);
      const peerConnection = createPeerConnection(connectedCall, remoteUserId);
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socketRef.current.emit('chat:call:offer', {
        callId: connectedCall.callId,
        conversationId: connectedCall.conversationId,
        toUserId: remoteUserId,
        description: peerConnection.localDescription,
      });

      sendMessageMutation.mutate({
        messageType: callMessageType(call.mode),
        body: callMessageBody(call.mode),
        call: {
          kind: call.mode,
          status: 'connected',
          platform: 'web',
          requestedAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      finishCall(true);
      toast({
        title: 'Call Failed',
        description: error?.message || 'Could not start media connection.',
        variant: 'destructive',
      });
    }
  }

  async function handleRemoteOffer(payload: any) {
    const call = activeCallRef.current;
    if (!call || call.callId !== payload?.callId || !socketRef.current || !payload.description)
      return;

    try {
      await prepareLocalStream(call.mode);
      const peerConnection = createPeerConnection(call, payload.fromUserId);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.description));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socketRef.current.emit('chat:call:answer', {
        callId: call.callId,
        conversationId: call.conversationId,
        toUserId: payload.fromUserId,
        description: peerConnection.localDescription,
      });
      setActiveCall({ ...call, status: 'active' });
    } catch (error: any) {
      finishCall(true);
      toast({
        title: 'Call Failed',
        description: error?.message || 'Could not answer media connection.',
        variant: 'destructive',
      });
    }
  }

  async function handleRemoteAnswer(payload: any) {
    const call = activeCallRef.current;
    if (
      !call ||
      call.callId !== payload?.callId ||
      !peerConnectionRef.current ||
      !payload.description
    )
      return;

    try {
      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(payload.description),
      );
      setActiveCall({ ...call, status: 'active' });
    } catch (error: any) {
      toast({
        title: 'Call Failed',
        description: error?.message || 'Could not complete media connection.',
        variant: 'destructive',
      });
    }
  }

  async function handleRemoteIce(payload: any) {
    const call = activeCallRef.current;
    if (
      !call ||
      call.callId !== payload?.callId ||
      !peerConnectionRef.current ||
      !payload.candidate
    )
      return;

    try {
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
    } catch {
      // ICE candidates can arrive before the peer is fully ready; later candidates keep flowing.
    }
  }

  function handleCallRejected(payload: any) {
    const call = activeCallRef.current;
    if (!call || call.callId !== payload?.callId) return;
    toast({
      title: 'Call Ended',
      description: payload.reason === 'busy' ? 'The user is busy.' : 'The call was declined.',
    });
    finishCall(false);
  }

  function handleCallEnded(payload: any) {
    const call = activeCallRef.current;
    if (!call || call.callId !== payload?.callId) return;
    toast({ title: 'Call Ended', description: 'The other user ended the call.' });
    finishCall(false);
  }

  function handleCallRecordingState(payload: any) {
    const call = activeCallRef.current;
    if (!call || call.callId !== payload?.callId || payload.fromUserId === currentUser?.id) return;

    toast({
      title: payload.isRecording ? 'Call Recording Started' : 'Call Recording Stopped',
      description: payload.isRecording
        ? `${payload.fromUser?.name || 'The other user'} is recording this call and will save it in chat.`
        : `${payload.fromUser?.name || 'The other user'} stopped recording this call.`,
    });
  }

  function handleCallError(payload: any) {
    const call = activeCallRef.current;
    if (call && (!payload?.callId || payload.callId === call.callId)) {
      finishCall(false);
    }

    toast({
      title: 'Call Error',
      description: payload?.message || 'Realtime call failed.',
      variant: 'destructive',
    });
  }

  function handleCallOfflineNotified(payload: any) {
    const call = activeCallRef.current;
    if (call && (!payload?.callId || payload.callId === call.callId))
      setCallConnectionState('Waiting For Mobile');

    toast({
      title: 'Mobile Notification Sent',
      description:
        payload?.message ||
        'The receiver is not online in realtime chat yet. A mobile notification was sent.',
    });
  }

  function handleCallMobileNotified(payload: any) {
    const call = activeCallRef.current;
    if (call && (!payload?.callId || payload.callId === call.callId))
      setCallConnectionState('Waiting For Mobile');

    toast({
      title: 'Mobile Notification Sent',
      description:
        payload?.message ||
        'The receiver was notified on mobile. Keep this call open while they answer.',
    });
  }

  function handleCallMobileOpened(payload: any) {
    const call = activeCallRef.current;
    if (call && (!payload?.callId || payload.callId === call.callId))
      setCallConnectionState('Ringing On Mobile');
  }

  function toggleUser(userId: string) {
    setSelectedUserIds((current) => {
      if (newChatType === 'direct') return current.includes(userId) ? [] : [userId];
      return current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId];
    });
  }

  function startConversation() {
    if (!selectedUserIds.length) {
      toast({
        title: 'Select User',
        description: 'Choose at least one user before starting a chat.',
        variant: 'destructive',
      });
      return;
    }

    if (newChatType !== 'direct' && !newChatTitle.trim()) {
      toast({
        title: 'Name Required',
        description: 'Add a group or broadcast name.',
        variant: 'destructive',
      });
      return;
    }

    createConversationMutation.mutate();
  }

  function handleFiles(files: FileList | null, mode: UploadMode = 'attachment') {
    if (!selectedConversationId) {
      toast({
        title: 'Select Chat',
        description: 'Open a conversation before adding files.',
        variant: 'destructive',
      });
      return;
    }

    const fileList = Array.from(files || []);
    if (!fileList.length) return;
    uploadMutation.mutate({ files: fileList, mode });
  }

  function sendCurrentMessage() {
    if (!selectedConversationId || sendMessageMutation.isPending) return;

    const body = messageText.trim();
    if (!body && !pendingAttachments.length) {
      toast({
        title: 'Empty Message',
        description: 'Add text, media, location, or an attachment.',
        variant: 'destructive',
      });
      return;
    }

    sendMessageMutation.mutate({
      messageType: attachmentKind(pendingAttachments),
      body,
      attachments: pendingAttachments,
    });
  }

  function sendLocation() {
    if (!selectedConversationId) return;

    if (!navigator.geolocation) {
      toast({
        title: 'Location Not Available',
        description: 'This browser does not allow location sharing.',
        variant: 'destructive',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        sendMessageMutation.mutate({
          messageType: 'location',
          body: 'Shared location',
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
        });
      },
      (error) => {
        toast({
          title: 'Location Blocked',
          description: error.message,
          variant: 'destructive',
        });
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function ensureChatForShare() {
    if (selectedConversationId) return true;
    toast({
      title: 'Select Chat',
      description: 'Open a conversation before sharing.',
      variant: 'destructive',
    });
    return false;
  }

  function openSharePanel(panel: ShareComposerPanel) {
    if (!ensureChatForShare()) return;
    setShareMenuOpen(false);
    setSharePanel(panel);
  }

  function sendContactShare() {
    if (!ensureChatForShare()) return;
    const name = contactForm.name.trim();
    const phone = contactForm.phone.trim();
    const email = contactForm.email.trim();
    if (!name && !phone && !email) {
      toast({
        title: 'Contact Empty',
        description: 'Add a name, phone, or email before sharing the contact.',
        variant: 'destructive',
      });
      return;
    }

    sendMessageMutation.mutate({
      messageType: 'text',
      body: `Contact: ${name || phone || email}`,
      metadata: {
        shareType: 'contact',
        contact: { name, phone, email },
      },
    });
    setContactForm({ name: '', phone: '', email: '' });
    setSharePanel(null);
  }

  function sendPollShare() {
    if (!ensureChatForShare()) return;
    const question = pollForm.question.trim();
    const options = pollForm.options.map((option) => option.trim()).filter(Boolean);
    if (!question || options.length < 2) {
      toast({
        title: 'Poll Not Ready',
        description: 'Add a question and at least two options.',
        variant: 'destructive',
      });
      return;
    }

    sendMessageMutation.mutate({
      messageType: 'text',
      body: `Poll: ${question}`,
      metadata: {
        shareType: 'poll',
        poll: { question, options },
      },
    });
    setPollForm({ question: '', options: ['', '', ''] });
    setSharePanel(null);
  }

  function sendEventShare() {
    if (!ensureChatForShare()) return;
    const title = eventForm.title.trim();
    const date = eventForm.date.trim();
    const location = eventForm.location.trim();
    const notes = eventForm.notes.trim();
    if (!title || !date) {
      toast({
        title: 'Event Not Ready',
        description: 'Add an event title and date.',
        variant: 'destructive',
      });
      return;
    }

    sendMessageMutation.mutate({
      messageType: 'text',
      body: `Event: ${title}`,
      metadata: {
        shareType: 'event',
        event: { title, date, location, notes },
      },
    });
    setEventForm({ title: '', date: '', location: '', notes: '' });
    setSharePanel(null);
  }

  function sendAiImageShare() {
    if (!ensureChatForShare()) return;
    const prompt = aiImagePrompt.trim();
    if (!prompt) {
      toast({
        title: 'Prompt Required',
        description: 'Describe the AI image before sharing it.',
        variant: 'destructive',
      });
      return;
    }

    sendMessageMutation.mutate({
      messageType: 'text',
      body: `AI image: ${prompt}`,
      metadata: {
        shareType: 'ai_image',
        aiImage: { prompt, status: 'requested' },
      },
    });
    setAiImagePrompt('');
    setSharePanel(null);
  }

  function sendFaxShare() {
    if (!ensureChatForShare()) return;
    const number = faxForm.number.trim();
    const notes = faxForm.notes.trim();
    if (!number) {
      toast({
        title: 'Fax Number Required',
        description: 'Add the fax number before sharing the fax request.',
        variant: 'destructive',
      });
      return;
    }

    sendMessageMutation.mutate({
      messageType: 'text',
      body: `Fax request: ${number}`,
      metadata: {
        shareType: 'fax',
        fax: { number, notes },
      },
    });
    setFaxForm({ number: '', notes: '' });
    setSharePanel(null);
  }

  function shareAppLink() {
    if (!ensureChatForShare()) return;
    const url = window.location.origin || window.location.href;
    sendMessageMutation.mutate({
      messageType: 'text',
      body: `Shared app: ${url}`,
      metadata: {
        shareType: 'app',
        app: {
          title: 'eSIM Mobile App',
          url,
        },
      },
    });
    setShareMenuOpen(false);
  }

  function handleShareAction(action: string) {
    if (!ensureChatForShare()) return;

    setShareMenuOpen(false);

    if (action === 'photo') imageInputRef.current?.click();
    if (action === 'video') videoInputRef.current?.click();
    if (action === 'location') sendLocation();
    if (action === 'contact') openSharePanel('contact');
    if (action === 'document') fileInputRef.current?.click();
    if (action === 'poll') openSharePanel('poll');
    if (action === 'event') openSharePanel('event');
    if (action === 'ai-image') openSharePanel('ai-image');
    if (action === 'fax') openSharePanel('fax');
    if (action === 'screenshot') screenshotInputRef.current?.click();
    if (action === 'share-apps') shareAppLink();
  }

  function sendQuickEmoji(name: string) {
    if (!selectedConversationId) return;
    sendMessageMutation.mutate({
      messageType: 'emoji',
      body: name,
      emoji: { source: 'quick', symbol: name, name },
    });
  }

  function sendFreeEmoji(symbol: string, category: string) {
    if (!selectedConversationId) {
      toast({
        title: 'Select Chat',
        description: 'Open a conversation before sending emojis.',
        variant: 'destructive',
      });
      return;
    }

    sendMessageMutation.mutate({
      messageType: 'emoji',
      body: symbol,
      emoji: { source: 'free-collection', symbol, name: symbol, category },
    });
  }

  const isBusy =
    bootstrapQuery.isLoading ||
    createConversationMutation.isPending ||
    sendMessageMutation.isPending ||
    forwardAttachmentMutation.isPending ||
    uploadMutation.isPending;

  return (
    <div
      className="space-y-5"
      onPointerDownCapture={() => {
        if (!callSoundReady) void unlockCallAudio(false);
      }}
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/40 bg-cyan-300/10 text-cyan-200">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">Chat</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge className="border-emerald-300/40 bg-emerald-50 text-emerald-700">
                  Web Chat
                </Badge>
                <Badge className="border-sky-300/40 bg-sky-50 text-sky-700">Mobile App Chat</Badge>
                <Badge className="border-violet-300/40 bg-violet-50 text-violet-700">
                  Calls And Broadcast
                </Badge>
                <Badge
                  className={cn(
                    'border',
                    realtimeReady
                      ? 'border-emerald-300/40 bg-emerald-50 text-emerald-700'
                      : 'border-amber-300/40 bg-amber-50 text-amber-700',
                  )}
                >
                  {realtimeReady ? 'Live Calls Online' : 'Live Calls Connecting'}
                </Badge>
                <Badge
                  className={cn(
                    'border',
                    callSoundReady && !audioBlocked
                      ? 'border-emerald-300/40 bg-emerald-50 text-emerald-700'
                      : 'border-amber-300/40 bg-amber-50 text-amber-700',
                  )}
                >
                  {callSoundReady && !audioBlocked ? 'Call Sound Ready' : 'Tap To Enable Sound'}
                </Badge>
                <Badge
                  className={cn(
                    'border',
                    rtcConfigQuery.data?.hasTurn
                      ? 'border-emerald-300/40 bg-emerald-50 text-emerald-700'
                      : 'border-amber-300/40 bg-amber-50 text-amber-700',
                  )}
                >
                  {rtcConfigQuery.data?.hasTurn
                    ? 'TURN Relay Ready'
                    : 'TURN Relay Needed For Blocked Networks'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {isBusy ? (
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Working
          </div>
        ) : null}
      </div>

      {activeCall ? (
        <div className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-5xl rounded-xl border border-cyan-300/40 bg-slate-950 p-4 shadow-2xl md:inset-x-8 md:bottom-6">
          <audio
            ref={remoteAudioRef}
            autoPlay
            controls
            playsInline
            className="mb-3 h-9 w-full rounded-lg bg-slate-900"
          />

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-full text-slate-950',
                  activeCall.status === 'incoming' ? 'bg-amber-300' : 'bg-cyan-300',
                )}
              >
                {activeCall.mode === 'video' ? <Video className="h-6 w-6" /> : null}
                {activeCall.mode === 'group' ? <Users className="h-6 w-6" /> : null}
                {activeCall.mode === 'voice' ? <Phone className="h-6 w-6" /> : null}
              </div>
              <div>
                <div className="text-sm font-semibold uppercase tracking-wide text-cyan-200">
                  {activeCall.status === 'incoming'
                    ? 'Incoming Call'
                    : activeCall.status === 'outgoing'
                      ? 'Ringing'
                      : activeCall.status === 'connecting'
                        ? 'Connecting'
                        : 'Call Active'}
                </div>
                <div className="mt-1 text-xl font-semibold text-white">{activeCall.remoteName}</div>
                <div className="mt-1 text-sm text-slate-400">
                  {activeCall.mode === 'video'
                    ? 'Video call'
                    : activeCall.mode === 'group'
                      ? 'Group call'
                      : 'Voice call'}{' '}
                  {realtimeReady
                    ? 'is connected to realtime signaling.'
                    : 'is reconnecting to realtime signaling.'}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={cn(
                      'rounded-full border px-2 py-1',
                      callSoundReady && !audioBlocked
                        ? 'border-emerald-300/40 bg-emerald-400/10 text-emerald-200'
                        : 'border-amber-300/40 bg-amber-400/10 text-amber-200',
                    )}
                  >
                    {callSoundReady && !audioBlocked ? 'Sound Ready' : 'Sound Needs Tap'}
                  </span>
                  <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-slate-300">
                    Media: {callConnectionState}
                  </span>
                  <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-slate-300">
                    {localAudioStatus}
                  </span>
                  <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-slate-300">
                    {remoteAudioStatus}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {activeCall.status === 'active' || activeCall.status === 'connecting' ? (
                <Button
                  type="button"
                  onClick={isRecordingCall ? stopCallRecording : () => setRecordingChoiceOpen(true)}
                  className={cn(
                    'gap-2',
                    isRecordingCall
                      ? 'bg-red-500 text-white hover:bg-red-400'
                      : 'bg-white text-slate-950 hover:bg-slate-100',
                  )}
                >
                  {isRecordingCall ? <Square className="h-4 w-4" /> : <Radio className="h-4 w-4" />}
                  {isRecordingCall ? 'Stop Recording' : 'Record Call'}
                </Button>
              ) : null}
              {audioBlocked || !callSoundReady ? (
                <Button
                  type="button"
                  onClick={() => {
                    void unlockCallAudio(true).then(() => {
                      attachMediaStreams();
                      if (activeCall.status === 'incoming') playRingtone();
                    });
                  }}
                  className="gap-2 bg-amber-300 text-slate-950 hover:bg-amber-200"
                >
                  <Volume2 className="h-4 w-4" />
                  Enable Sound
                </Button>
              ) : null}
              {activeCall.status === 'incoming' ? (
                <Button
                  type="button"
                  onClick={acceptCall}
                  className="gap-2 bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                >
                  <Phone className="h-4 w-4" />
                  Answer
                </Button>
              ) : null}
              {activeCall.status === 'incoming' ? (
                <Button
                  type="button"
                  onClick={() => rejectCall()}
                  className="gap-2 bg-red-500 text-white hover:bg-red-400"
                >
                  <X className="h-4 w-4" />
                  Decline
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => finishCall(true)}
                  className="gap-2 bg-red-500 text-white hover:bg-red-400"
                >
                  <X className="h-4 w-4" />
                  End Call
                </Button>
              )}
            </div>
          </div>

          {activeCall.mode === 'video' || activeCall.mode === 'group' ? (
            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="min-h-64 w-full rounded-xl bg-black object-cover"
              />
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="h-40 w-full rounded-xl bg-black object-cover md:h-full"
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {previewAttachment ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-4">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">
                  {previewAttachment.name}
                </div>
                <div className="text-xs text-slate-400">{bytes(previewAttachment.size)}</div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewAttachment.url}
                  download={previewAttachment.name}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm font-medium text-slate-100 hover:bg-slate-800"
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => openForwardDialog(previewAttachment)}
                  className="h-9 gap-2 border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
                >
                  <Forward className="h-4 w-4" />
                  Forward
                </Button>
                <Button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  className="h-9 bg-white text-slate-950 hover:bg-slate-200"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex max-h-[calc(92vh-64px)] items-center justify-center overflow-auto bg-black p-4">
              {previewAttachment.type.startsWith('image/') ? (
                <img
                  src={previewAttachment.url}
                  alt={previewAttachment.name}
                  className="max-h-[80vh] max-w-full rounded-lg object-contain"
                />
              ) : null}
              {previewAttachment.type.startsWith('video/') ? (
                <video
                  src={previewAttachment.url}
                  controls
                  autoPlay
                  className="max-h-[80vh] max-w-full rounded-lg bg-black"
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {forwardAttachment ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-950 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Forward File</h2>
                <p className="mt-1 text-sm text-slate-400">{forwardAttachment.name}</p>
              </div>
              <Button
                type="button"
                onClick={() => setForwardAttachment(null)}
                className="h-8 w-8 bg-slate-900 p-0 text-slate-100 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <label className="mt-4 block text-sm font-medium text-slate-200">Send To Chat</label>
            <select
              value={forwardConversationId}
              onChange={(event) => setForwardConversationId(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-white"
            >
              {forwardConversationOptions.map((conversation) => (
                <option key={conversation.id} value={conversation.id}>
                  {conversationTitle(conversation, currentUser?.id)}
                </option>
              ))}
            </select>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setForwardAttachment(null)}
                className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!forwardConversationId || forwardAttachmentMutation.isPending}
                onClick={() => {
                  if (!forwardAttachment || !forwardConversationId) return;
                  forwardAttachmentMutation.mutate({
                    conversationId: forwardConversationId,
                    file: forwardAttachment,
                  });
                }}
                className="gap-2 bg-cyan-300 text-slate-950 hover:bg-cyan-200"
              >
                {forwardAttachmentMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Forward className="h-4 w-4" />
                )}
                Forward
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {recordingChoiceOpen ? (
        <div className="fixed inset-0 z-[96] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-950 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Record Call</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Choose whether the recording is visible to the other party or private on this
                  device.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => setRecordingChoiceOpen(false)}
                className="h-8 w-8 bg-slate-900 p-0 text-slate-100 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-5 grid gap-3">
              <Button
                type="button"
                onClick={() => void startCallRecording('chat')}
                className="h-auto justify-start gap-3 bg-cyan-300 px-4 py-4 text-left text-slate-950 hover:bg-cyan-200"
              >
                <Forward className="h-5 w-5 shrink-0" />
                <span>
                  <span className="block font-semibold">Show To Other Party</span>
                  <span className="block text-xs opacity-80">
                    Save the recording in this chat after you stop recording.
                  </span>
                </span>
              </Button>
              <Button
                type="button"
                onClick={() => void startCallRecording('private')}
                className="h-auto justify-start gap-3 bg-slate-900 px-4 py-4 text-left text-slate-100 hover:bg-slate-800"
              >
                <Download className="h-5 w-5 shrink-0" />
                <span>
                  <span className="block font-semibold">Private Recording</span>
                  <span className="block text-xs text-slate-400">
                    Download now and keep a private copy in this chat only for you.
                  </span>
                </span>
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid min-h-[720px] gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-xl border border-slate-700/70 bg-slate-950 shadow-2xl">
          <div className="border-b border-slate-800 p-4">
            <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-900 p-1">
              {(['direct', 'group', 'broadcast'] as NewChatType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setNewChatType(type);
                    setSelectedUserIds([]);
                  }}
                  className={cn(
                    'flex h-9 items-center justify-center gap-2 rounded-md text-xs font-semibold capitalize transition',
                    newChatType === type
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800',
                  )}
                >
                  {type === 'direct' ? <MessageCircle className="h-4 w-4" /> : null}
                  {type === 'group' ? <Users className="h-4 w-4" /> : null}
                  {type === 'broadcast' ? <Radio className="h-4 w-4" /> : null}
                  {type}
                </button>
              ))}
            </div>

            {newChatType !== 'direct' ? (
              <Input
                value={newChatTitle}
                onChange={(event) => setNewChatTitle(event.target.value)}
                placeholder={newChatType === 'group' ? 'Group name' : 'Broadcast name'}
                className="mt-3 h-10 border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
              />
            ) : null}

            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="Search by phone, email, name, or UID"
                className="h-10 border-slate-700 bg-slate-900 pl-9 text-white placeholder:text-slate-500"
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              For security, users are hidden until you search at least 3 characters by phone, email,
              name, or UID.
            </p>

            {selectedUsers.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => toggleUser(user.id)}
                    className="flex items-center gap-2 rounded-full border border-cyan-300/40 bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-100"
                  >
                    {userDisplayName(user)}
                    <X className="h-3 w-3" />
                  </button>
                ))}
              </div>
            ) : null}

            <div className="mt-3 max-h-52 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/70">
              {!userSearchReady ? (
                <div className="p-3 text-sm text-slate-400">
                  Search by phone, email, name, or UID to find a user.
                </div>
              ) : usersQuery.isLoading ? (
                <div className="flex items-center gap-2 p-3 text-sm text-slate-300">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching users
                </div>
              ) : visibleUsers.length ? (
                visibleUsers.map((user) => {
                  const selected = selectedUserIds.includes(user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => toggleUser(user.id)}
                      className={cn(
                        'flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-slate-800',
                        selected ? 'bg-teal-600/40 text-white' : 'text-slate-200',
                      )}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white">
                        {initials(userDisplayName(user))}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {userDisplayName(user)}
                        </span>
                        <span className="block truncate text-xs text-slate-400">
                          {[uidLabel(user), user.email].filter(Boolean).join(' - ')}
                        </span>
                      </span>
                      {selected ? <CheckCircle2 className="h-5 w-5 text-cyan-200" /> : null}
                    </button>
                  );
                })
              ) : (
                <div className="p-3 text-sm text-slate-400">No users found</div>
              )}
            </div>

            <Button
              type="button"
              onClick={startConversation}
              disabled={createConversationMutation.isPending}
              className="mt-3 w-full gap-2 bg-cyan-300 text-slate-950 hover:bg-cyan-200"
            >
              {createConversationMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Start Chat
            </Button>
          </div>

          <div className="max-h-[360px] overflow-y-auto p-2">
            {bootstrapQuery.isLoading ? (
              <div className="flex items-center gap-2 p-4 text-sm text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading chats
              </div>
            ) : conversations.length ? (
              conversations.map((conversation) => {
                const title = conversationTitle(conversation, currentUser?.id);
                const active = conversation.id === selectedConversationId;
                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => setSelectedConversationId(conversation.id)}
                    className={cn(
                      'mb-2 flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition',
                      active
                        ? 'border-cyan-300/60 bg-cyan-300/10 text-white'
                        : 'border-slate-800 bg-slate-900/70 text-slate-200 hover:border-slate-600',
                    )}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 to-violet-300 text-sm font-bold text-slate-950">
                      {conversation.type === 'group' ? <Users className="h-5 w-5" /> : null}
                      {conversation.type === 'broadcast' ? <Radio className="h-5 w-5" /> : null}
                      {conversation.type === 'direct' ? initials(title) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-semibold">{title}</span>
                        <span className="shrink-0 text-[11px] text-slate-500">
                          {formatDate(conversation.updatedAt)}
                        </span>
                      </span>
                      <span className="mt-1 block truncate text-xs text-slate-400">
                        {messagePreview(conversation.lastMessage)}
                      </span>
                    </span>
                    {conversation.unreadCount ? (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-400 px-1.5 text-[11px] font-bold text-slate-950">
                        {conversation.unreadCount}
                      </span>
                    ) : null}
                  </button>
                );
              })
            ) : (
              <div className="p-6 text-center text-sm text-slate-400">
                Create your first chat from the user list.
              </div>
            )}
          </div>
        </section>

        <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-700/70 bg-slate-950 shadow-2xl">
          <div className="flex min-h-20 flex-col gap-3 border-b border-slate-800 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-950">
                {selectedConversation?.type === 'group' ? <Users className="h-5 w-5" /> : null}
                {selectedConversation?.type === 'broadcast' ? <Radio className="h-5 w-5" /> : null}
                {selectedConversation?.type === 'direct' || !selectedConversation
                  ? initials(conversationTitle(selectedConversation, currentUser?.id))
                  : null}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-white">
                  {conversationTitle(selectedConversation, currentUser?.id)}
                </h2>
                <p className="truncate text-sm text-slate-400">
                  {conversationSubtitle(selectedConversation, currentUser?.id) ||
                    'Web And Mobile Chat'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(['all', 'media', 'images', 'videos', 'recordings'] as MediaQuickFilter[]).map(
                (filter) => (
                  <Button
                    key={filter}
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!selectedConversationId}
                    onClick={() => setMediaQuickFilter(filter)}
                    className={cn(
                      'gap-2 border-slate-700 text-slate-100 hover:bg-slate-800',
                      mediaQuickFilter === filter
                        ? 'bg-cyan-300 text-slate-950 hover:bg-cyan-200'
                        : 'bg-slate-900',
                    )}
                  >
                    {filter === 'all' ? <MessageCircle className="h-4 w-4" /> : null}
                    {filter === 'media' ? <Paperclip className="h-4 w-4" /> : null}
                    {filter === 'images' ? <ImageIcon className="h-4 w-4" /> : null}
                    {filter === 'videos' ? <Video className="h-4 w-4" /> : null}
                    {filter === 'recordings' ? <Radio className="h-4 w-4" /> : null}
                    {filter === 'all' ? 'All' : null}
                    {filter === 'media' ? 'All Media' : null}
                    {filter === 'images' ? 'Images' : null}
                    {filter === 'videos' ? 'Videos' : null}
                    {filter === 'recordings' ? 'Calls Recorded' : null}
                  </Button>
                ),
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                title="Voice Call"
                aria-label="Voice Call"
                disabled={!selectedConversationId}
                onClick={() => startCall('voice')}
                className="h-9 w-9 border-slate-700 bg-slate-900 p-0 text-slate-100 hover:bg-slate-800"
              >
                <Phone className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                title="Video Call"
                aria-label="Video Call"
                disabled={!selectedConversationId}
                onClick={() => startCall('video')}
                className="h-9 w-9 border-slate-700 bg-slate-900 p-0 text-slate-100 hover:bg-slate-800"
              >
                <Video className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                title="Group Call"
                aria-label="Group Call"
                disabled={!selectedConversationId}
                onClick={() => startCall('group')}
                className="h-9 w-9 border-slate-700 bg-slate-900 p-0 text-slate-100 hover:bg-slate-800"
              >
                <Users className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_34%),linear-gradient(135deg,#07111f,#10111f_55%,#08121d)] p-4">
            {!selectedConversationId ? (
              <div className="flex h-full min-h-96 items-center justify-center text-center">
                <div className="max-w-sm rounded-xl border border-slate-700 bg-slate-950/70 p-6 text-slate-300">
                  <MessageCircle className="mx-auto h-10 w-10 text-cyan-200" />
                  <h3 className="mt-3 text-lg font-semibold text-white">Open A Chat</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Choose a user or select a conversation.
                  </p>
                </div>
              </div>
            ) : messagesQuery.isLoading ? (
              <div className="flex items-center justify-center py-20 text-sm text-slate-300">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading messages
              </div>
            ) : (
              <div className="space-y-3">
                {mediaQuickFilter !== 'all' && !displayedMessages.length ? (
                  <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-6 text-center text-sm text-slate-300">
                    {mediaFilterEmptyText(mediaQuickFilter)}
                  </div>
                ) : null}
                {displayedMessages.map((message) => {
                  const own = message.senderId === currentUser?.id;
                  const shareType =
                    typeof message.metadata?.shareType === 'string'
                      ? message.metadata.shareType
                      : '';
                  const contactCard =
                    shareType === 'contact' ? metadataObject(message.metadata, 'contact') : null;
                  const pollCard =
                    shareType === 'poll' ? metadataObject(message.metadata, 'poll') : null;
                  const eventCard =
                    shareType === 'event' ? metadataObject(message.metadata, 'event') : null;
                  const aiImageCard =
                    shareType === 'ai_image' ? metadataObject(message.metadata, 'aiImage') : null;
                  const faxCard =
                    shareType === 'fax' ? metadataObject(message.metadata, 'fax') : null;
                  const appCard =
                    shareType === 'app' ? metadataObject(message.metadata, 'app') : null;
                  return (
                    <div
                      key={message.id}
                      className={cn('flex', own ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[82%] rounded-2xl px-4 py-3 shadow-lg md:max-w-[68%]',
                          own
                            ? 'rounded-br-md bg-cyan-200 text-slate-950'
                            : 'rounded-bl-md border border-slate-700 bg-slate-950/85 text-slate-100',
                        )}
                      >
                        {!own ? (
                          <div className="mb-1 text-xs font-semibold text-cyan-200">
                            {message.senderName || message.senderEmail || 'User'}
                          </div>
                        ) : null}

                        {message.call ? (
                          <div className="mb-2 flex items-center gap-2 rounded-xl bg-white/45 px-3 py-2 text-sm font-semibold text-slate-950">
                            {message.messageType === 'video_call' ? (
                              <Video className="h-4 w-4" />
                            ) : null}
                            {message.messageType === 'group_call' ? (
                              <Users className="h-4 w-4" />
                            ) : null}
                            {message.messageType === 'voice_call' ? (
                              <Phone className="h-4 w-4" />
                            ) : null}
                            {message.body || 'Call invite'}
                          </div>
                        ) : null}

                        {message.metadata?.privateRecording ? (
                          <div
                            className={cn(
                              'mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
                              own ? 'bg-white/55 text-slate-950' : 'bg-slate-800 text-slate-200',
                            )}
                          >
                            <Download className="h-3 w-3" />
                            Private Recording
                          </div>
                        ) : null}

                        {contactCard ? (
                          <div
                            className={cn(
                              'mb-2 rounded-xl px-3 py-2 text-sm',
                              own ? 'bg-white/45 text-slate-950' : 'bg-slate-800 text-slate-100',
                            )}
                          >
                            <div className="flex items-center gap-2 font-semibold">
                              <ContactRound className="h-4 w-4" />
                              Contact
                            </div>
                            <div className="mt-2 space-y-1 text-xs">
                              {textValue(contactCard.name) ? (
                                <div>{textValue(contactCard.name)}</div>
                              ) : null}
                              {textValue(contactCard.phone) ? (
                                <div>{textValue(contactCard.phone)}</div>
                              ) : null}
                              {textValue(contactCard.email) ? (
                                <div>{textValue(contactCard.email)}</div>
                              ) : null}
                            </div>
                          </div>
                        ) : null}

                        {pollCard ? (
                          <div
                            className={cn(
                              'mb-2 rounded-xl px-3 py-2 text-sm',
                              own ? 'bg-white/45 text-slate-950' : 'bg-slate-800 text-slate-100',
                            )}
                          >
                            <div className="flex items-center gap-2 font-semibold">
                              <Vote className="h-4 w-4" />
                              {textValue(pollCard.question) || 'Poll'}
                            </div>
                            <div className="mt-2 grid gap-1">
                              {Array.isArray(pollCard.options)
                                ? pollCard.options.map((option, index) => (
                                    <div
                                      key={`${message.id}-poll-${index}`}
                                      className="rounded-lg bg-white/20 px-2 py-1 text-xs"
                                    >
                                      {String(option)}
                                    </div>
                                  ))
                                : null}
                            </div>
                          </div>
                        ) : null}

                        {eventCard ? (
                          <div
                            className={cn(
                              'mb-2 rounded-xl px-3 py-2 text-sm',
                              own ? 'bg-white/45 text-slate-950' : 'bg-slate-800 text-slate-100',
                            )}
                          >
                            <div className="flex items-center gap-2 font-semibold">
                              <CalendarDays className="h-4 w-4" />
                              {textValue(eventCard.title) || 'Event'}
                            </div>
                            <div className="mt-2 space-y-1 text-xs">
                              {textValue(eventCard.date) ? (
                                <div>{textValue(eventCard.date)}</div>
                              ) : null}
                              {textValue(eventCard.location) ? (
                                <div>{textValue(eventCard.location)}</div>
                              ) : null}
                              {textValue(eventCard.notes) ? (
                                <div>{textValue(eventCard.notes)}</div>
                              ) : null}
                            </div>
                          </div>
                        ) : null}

                        {aiImageCard ? (
                          <div
                            className={cn(
                              'mb-2 rounded-xl px-3 py-2 text-sm',
                              own ? 'bg-white/45 text-slate-950' : 'bg-slate-800 text-slate-100',
                            )}
                          >
                            <div className="flex items-center gap-2 font-semibold">
                              <Sparkles className="h-4 w-4" />
                              AI Image
                            </div>
                            <div className="mt-2 text-xs">{textValue(aiImageCard.prompt)}</div>
                          </div>
                        ) : null}

                        {faxCard ? (
                          <div
                            className={cn(
                              'mb-2 rounded-xl px-3 py-2 text-sm',
                              own ? 'bg-white/45 text-slate-950' : 'bg-slate-800 text-slate-100',
                            )}
                          >
                            <div className="flex items-center gap-2 font-semibold">
                              <Scan className="h-4 w-4" />
                              Fax
                            </div>
                            <div className="mt-2 space-y-1 text-xs">
                              <div>{textValue(faxCard.number)}</div>
                              {textValue(faxCard.notes) ? (
                                <div>{textValue(faxCard.notes)}</div>
                              ) : null}
                            </div>
                          </div>
                        ) : null}

                        {appCard ? (
                          <div
                            className={cn(
                              'mb-2 rounded-xl px-3 py-2 text-sm',
                              own ? 'bg-white/45 text-slate-950' : 'bg-slate-800 text-slate-100',
                            )}
                          >
                            <div className="flex items-center gap-2 font-semibold">
                              <AppWindow className="h-4 w-4" />
                              {textValue(appCard.title) || 'Shared App'}
                            </div>
                            {textValue(appCard.url) ? (
                              <a
                                href={textValue(appCard.url)}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 block break-all text-xs underline"
                              >
                                {textValue(appCard.url)}
                              </a>
                            ) : null}
                          </div>
                        ) : null}

                        {message.location ? (
                          <a
                            href={`https://www.google.com/maps?q=${message.location.latitude},${message.location.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className={cn(
                              'mb-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold',
                              own ? 'bg-white/50 text-slate-950' : 'bg-slate-800 text-slate-100',
                            )}
                          >
                            <MapPin className="h-4 w-4" />
                            Open Location
                          </a>
                        ) : null}

                        {message.emoji ? (
                          <div
                            className={cn(
                              'mb-2 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold',
                              own
                                ? 'bg-white/45 text-slate-950'
                                : 'bg-violet-400/15 text-violet-100',
                            )}
                          >
                            <span className="text-3xl leading-none">
                              {message.emoji.symbol || message.body || message.emoji.name}
                            </span>
                            <span>{message.emoji.category || message.emoji.name || 'Emoji'}</span>
                          </div>
                        ) : null}

                        {message.body &&
                        !message.call &&
                        !message.location &&
                        !message.emoji &&
                        !shareType ? (
                          <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p>
                        ) : null}

                        {message.attachments?.length ? (
                          <div className="mt-2 grid gap-2">
                            {message.attachments.map((file) => {
                              const isImage = file.type.startsWith('image/');
                              const isVideo = file.type.startsWith('video/');
                              const isAudio = file.type.startsWith('audio/');

                              return (
                                <div
                                  key={`${message.id}-${file.url}`}
                                  className={cn(
                                    'overflow-hidden rounded-xl border',
                                    own
                                      ? 'border-white/30 bg-white/35'
                                      : 'border-slate-700 bg-slate-900/80',
                                  )}
                                >
                                  {isImage ? (
                                    <button
                                      type="button"
                                      onClick={() => setPreviewAttachment(file)}
                                      className="block w-full"
                                    >
                                      <img
                                        src={file.url}
                                        alt={file.name}
                                        className="max-h-72 w-full object-cover"
                                      />
                                    </button>
                                  ) : null}
                                  {isVideo ? (
                                    <video
                                      src={file.url}
                                      controls
                                      preload="metadata"
                                      className="max-h-72 w-full bg-black"
                                    />
                                  ) : null}
                                  {isAudio ? (
                                    <div className="p-3">
                                      <audio src={file.url} controls className="w-full" />
                                    </div>
                                  ) : null}
                                  {!isImage && !isVideo && !isAudio ? (
                                    <a
                                      href={file.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className={cn(
                                        'flex items-center gap-3 px-3 py-3 text-sm',
                                        own ? 'text-slate-950' : 'text-slate-100',
                                      )}
                                    >
                                      <FileText className="h-4 w-4" />
                                      <span className="min-w-0 flex-1 truncate">{file.name}</span>
                                      <span className="text-xs opacity-70">{bytes(file.size)}</span>
                                    </a>
                                  ) : null}

                                  <div
                                    className={cn(
                                      'flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs',
                                      own ? 'text-slate-800' : 'text-slate-300',
                                    )}
                                  >
                                    <span className="min-w-0 flex-1 truncate">
                                      {file.name} · {bytes(file.size)}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      {isImage || isVideo ? (
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setPreviewAttachment(file)}
                                          className="h-8 gap-1 border-slate-300 bg-white/90 px-2 text-slate-950 hover:bg-white"
                                        >
                                          <Maximize2 className="h-3 w-3" />
                                          View
                                        </Button>
                                      ) : null}
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openForwardDialog(file)}
                                        className="h-8 gap-1 border-slate-300 bg-white/90 px-2 text-slate-950 hover:bg-white"
                                      >
                                        <Forward className="h-3 w-3" />
                                        Forward
                                      </Button>
                                      <a
                                        href={file.url}
                                        download={file.name}
                                        className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-300 bg-white/90 px-2 text-slate-950 hover:bg-white"
                                      >
                                        <Download className="h-3 w-3" />
                                        Download
                                      </a>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : null}

                        <div
                          className={cn(
                            'mt-2 text-right text-[11px]',
                            own ? 'text-slate-700' : 'text-slate-500',
                          )}
                        >
                          {formatTime(message.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="border-t border-slate-800 bg-slate-950 p-4">
            {pendingAttachments.length ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {pendingAttachments.map((file) => (
                  <button
                    key={file.url}
                    type="button"
                    onClick={() =>
                      setPendingAttachments((current) =>
                        current.filter((item) => item.url !== file.url),
                      )
                    }
                    className="flex max-w-full items-center gap-2 rounded-full border border-cyan-300/40 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100"
                  >
                    <Paperclip className="h-3 w-3" />
                    <span className="max-w-56 truncate">{file.name}</span>
                    <X className="h-3 w-3" />
                  </button>
                ))}
              </div>
            ) : null}

            {messageRecordingKind ? (
              <div className="mb-3 flex flex-col gap-3 rounded-xl border border-cyan-300/40 bg-cyan-300/10 p-3 text-cyan-50 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-300 text-slate-950">
                    {messageRecordingKind === 'video' ? (
                      <Video className="h-5 w-5" />
                    ) : (
                      <Mic className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">
                      {messageRecordingKind === 'video'
                        ? 'Recording Video Message'
                        : 'Recording Voice Message'}
                    </div>
                    <div className="text-xs text-cyan-100/80">
                      {formatDuration(messageRecordingSeconds)} - it will be sent to this chat when
                      you stop.
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => stopMessageRecording(false)}
                    className="border-slate-600 bg-slate-950 text-slate-100 hover:bg-slate-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => stopMessageRecording(true)}
                    className="gap-2 bg-cyan-300 text-slate-950 hover:bg-cyan-200"
                  >
                    <Square className="h-4 w-4" />
                    Stop And Send
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="hidden">
              <input
                ref={imageInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(event) => handleFiles(event.target.files)}
              />
              <input
                ref={videoInputRef}
                type="file"
                multiple
                accept="video/*"
                className="hidden"
                onChange={(event) => handleFiles(event.target.files)}
              />
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(event) => handleFiles(event.target.files)}
              />
              <input
                ref={emojiInputRef}
                type="file"
                accept="image/png,image/webp,image/gif,image/svg+xml"
                className="hidden"
                onChange={(event) => handleFiles(event.target.files, 'emoji')}
              />
              <input
                ref={screenshotInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(event) => handleFiles(event.target.files)}
              />
            </div>

            {sharePanel ? (
              <div className="mb-3 rounded-xl border border-slate-700 bg-slate-900 p-3 text-slate-100">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">
                    {sharePanel === 'contact' ? 'Share Contact' : null}
                    {sharePanel === 'poll' ? 'Create Poll' : null}
                    {sharePanel === 'event' ? 'Share Event' : null}
                    {sharePanel === 'ai-image' ? 'AI Images' : null}
                    {sharePanel === 'fax' ? 'Share Fax' : null}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setSharePanel(null)}
                    className="h-8 border-slate-700 bg-slate-950 px-2 text-slate-100"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {sharePanel === 'contact' ? (
                  <div className="grid gap-2 md:grid-cols-3">
                    <Input
                      value={contactForm.name}
                      onChange={(event) =>
                        setContactForm((current) => ({ ...current, name: event.target.value }))
                      }
                      placeholder="Contact name"
                      className="border-slate-700 bg-slate-950 text-white"
                    />
                    <Input
                      value={contactForm.phone}
                      onChange={(event) =>
                        setContactForm((current) => ({ ...current, phone: event.target.value }))
                      }
                      placeholder="Phone number"
                      className="border-slate-700 bg-slate-950 text-white"
                    />
                    <div className="flex gap-2">
                      <Input
                        value={contactForm.email}
                        onChange={(event) =>
                          setContactForm((current) => ({ ...current, email: event.target.value }))
                        }
                        placeholder="Email"
                        className="border-slate-700 bg-slate-950 text-white"
                      />
                      <Button
                        type="button"
                        onClick={sendContactShare}
                        className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"
                      >
                        Send
                      </Button>
                    </div>
                  </div>
                ) : null}

                {sharePanel === 'poll' ? (
                  <div className="space-y-2">
                    <Input
                      value={pollForm.question}
                      onChange={(event) =>
                        setPollForm((current) => ({ ...current, question: event.target.value }))
                      }
                      placeholder="Poll question"
                      className="border-slate-700 bg-slate-950 text-white"
                    />
                    <div className="grid gap-2 md:grid-cols-3">
                      {pollForm.options.map((option, index) => (
                        <Input
                          key={`poll-option-${index}`}
                          value={option}
                          onChange={(event) =>
                            setPollForm((current) => ({
                              ...current,
                              options: current.options.map((item, itemIndex) =>
                                itemIndex === index ? event.target.value : item,
                              ),
                            }))
                          }
                          placeholder={`Option ${index + 1}`}
                          className="border-slate-700 bg-slate-950 text-white"
                        />
                      ))}
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        onClick={sendPollShare}
                        className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"
                      >
                        Send Poll
                      </Button>
                    </div>
                  </div>
                ) : null}

                {sharePanel === 'event' ? (
                  <div className="grid gap-2 md:grid-cols-4">
                    <Input
                      value={eventForm.title}
                      onChange={(event) =>
                        setEventForm((current) => ({ ...current, title: event.target.value }))
                      }
                      placeholder="Event title"
                      className="border-slate-700 bg-slate-950 text-white"
                    />
                    <Input
                      type="datetime-local"
                      value={eventForm.date}
                      onChange={(event) =>
                        setEventForm((current) => ({ ...current, date: event.target.value }))
                      }
                      className="border-slate-700 bg-slate-950 text-white"
                    />
                    <Input
                      value={eventForm.location}
                      onChange={(event) =>
                        setEventForm((current) => ({ ...current, location: event.target.value }))
                      }
                      placeholder="Location"
                      className="border-slate-700 bg-slate-950 text-white"
                    />
                    <div className="flex gap-2">
                      <Input
                        value={eventForm.notes}
                        onChange={(event) =>
                          setEventForm((current) => ({ ...current, notes: event.target.value }))
                        }
                        placeholder="Notes"
                        className="border-slate-700 bg-slate-950 text-white"
                      />
                      <Button
                        type="button"
                        onClick={sendEventShare}
                        className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"
                      >
                        Send
                      </Button>
                    </div>
                  </div>
                ) : null}

                {sharePanel === 'ai-image' ? (
                  <div className="flex flex-col gap-2 md:flex-row">
                    <Input
                      value={aiImagePrompt}
                      onChange={(event) => setAiImagePrompt(event.target.value)}
                      placeholder="Describe the AI image to share"
                      className="border-slate-700 bg-slate-950 text-white"
                    />
                    <Button
                      type="button"
                      onClick={sendAiImageShare}
                      className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"
                    >
                      Send
                    </Button>
                  </div>
                ) : null}

                {sharePanel === 'fax' ? (
                  <div className="grid gap-2 md:grid-cols-[1fr_2fr_auto]">
                    <Input
                      value={faxForm.number}
                      onChange={(event) =>
                        setFaxForm((current) => ({ ...current, number: event.target.value }))
                      }
                      placeholder="Fax number"
                      className="border-slate-700 bg-slate-950 text-white"
                    />
                    <Input
                      value={faxForm.notes}
                      onChange={(event) =>
                        setFaxForm((current) => ({ ...current, notes: event.target.value }))
                      }
                      placeholder="Fax notes"
                      className="border-slate-700 bg-slate-950 text-white"
                    />
                    <Button
                      type="button"
                      onClick={sendFaxShare}
                      className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"
                    >
                      Send Fax
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {showEmojiPicker ? (
              <div className="mb-3 rounded-xl border border-violet-300/30 bg-slate-900 p-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">Free Emoji Collection</div>
                    <div className="text-xs text-slate-400">
                      Select any emoji and it will send in this chat.
                    </div>
                  </div>
                  <Input
                    value={emojiSearch}
                    onChange={(event) => setEmojiSearch(event.target.value)}
                    placeholder="Search emoji"
                    className="h-9 border-slate-700 bg-slate-950 text-white placeholder:text-slate-500 md:w-64"
                  />
                </div>

                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {['All', ...EMOJI_CATEGORIES.map((category) => category.name)].map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setSelectedEmojiCategory(category)}
                      className={cn(
                        'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition',
                        selectedEmojiCategory === category
                          ? 'border-cyan-300 bg-cyan-300 text-slate-950'
                          : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500',
                      )}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                <div className="mt-3 grid max-h-52 grid-cols-8 gap-2 overflow-y-auto sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-[repeat(14,minmax(0,1fr))] xl:grid-cols-[repeat(16,minmax(0,1fr))]">
                  {filteredEmojis.map((emoji, index) => (
                    <button
                      key={`${emoji.symbol}-${emoji.category}-${index}`}
                      type="button"
                      onClick={() => sendFreeEmoji(emoji.symbol, emoji.category)}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-xl transition hover:border-cyan-300 hover:bg-cyan-300/10"
                      title={`${emoji.category} emoji`}
                    >
                      {emoji.symbol}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex gap-3">
              <div className="relative shrink-0">
                <Button
                  type="button"
                  disabled={!selectedConversationId}
                  onClick={() => setShareMenuOpen((current) => !current)}
                  className="h-full min-h-12 w-12 bg-slate-800 p-0 text-slate-100 hover:bg-slate-700"
                  title="Share"
                  aria-label="Share"
                >
                  <Plus className="h-5 w-5" />
                </Button>

                {shareMenuOpen ? (
                  <div className="absolute bottom-14 left-0 z-30 w-80 rounded-xl border border-slate-700 bg-slate-950 p-2 shadow-2xl">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleShareAction('photo')}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-800"
                      >
                        <ImageIcon className="h-4 w-4 text-cyan-200" />
                        Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShareAction('video')}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-800"
                      >
                        <Video className="h-4 w-4 text-cyan-200" />
                        Video
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShareAction('location')}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-800"
                      >
                        <MapPin className="h-4 w-4 text-emerald-200" />
                        Location
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShareAction('contact')}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-800"
                      >
                        <ContactRound className="h-4 w-4 text-violet-200" />
                        Contact
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShareAction('document')}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-800"
                      >
                        <FileText className="h-4 w-4 text-amber-200" />
                        Document
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShareAction('poll')}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-800"
                      >
                        <Vote className="h-4 w-4 text-teal-200" />
                        Poll
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShareAction('event')}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-800"
                      >
                        <CalendarDays className="h-4 w-4 text-blue-200" />
                        Event
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShareAction('ai-image')}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-800"
                      >
                        <Sparkles className="h-4 w-4 text-fuchsia-200" />
                        AI Images
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShareAction('fax')}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-800"
                      >
                        <Scan className="h-4 w-4 text-orange-200" />
                        Fax
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShareAction('screenshot')}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-800"
                      >
                        <FileImage className="h-4 w-4 text-sky-200" />
                        Screenshot
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShareAction('share-apps')}
                        className="col-span-2 flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-800"
                      >
                        <Share2 className="h-4 w-4 text-lime-200" />
                        Share Apps
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <Textarea
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendCurrentMessage();
                  }
                }}
                disabled={!selectedConversationId}
                placeholder="Type a message"
                className="min-h-12 resize-none border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
              />
              <Button
                type="button"
                variant="outline"
                title="Record Voice Message"
                aria-label="Record Voice Message"
                disabled={
                  !selectedConversationId ||
                  Boolean(activeCall) ||
                  Boolean(messageRecordingKind) ||
                  uploadMutation.isPending
                }
                onClick={() => void startMessageRecording('audio')}
                className="h-auto w-12 shrink-0 border-emerald-300/40 bg-emerald-400/10 p-0 text-emerald-100 hover:bg-emerald-400/20"
              >
                <Mic className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                title="Record Video Message"
                aria-label="Record Video Message"
                disabled={
                  !selectedConversationId ||
                  Boolean(activeCall) ||
                  Boolean(messageRecordingKind) ||
                  uploadMutation.isPending
                }
                onClick={() => void startMessageRecording('video')}
                className="h-auto w-12 shrink-0 border-cyan-300/40 bg-cyan-400/10 p-0 text-cyan-100 hover:bg-cyan-400/20"
              >
                <Camera className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                onClick={sendCurrentMessage}
                disabled={!selectedConversationId || sendMessageMutation.isPending}
                className="h-auto w-14 shrink-0 bg-cyan-300 text-slate-950 hover:bg-cyan-200"
                title="Send"
              >
                {sendMessageMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
