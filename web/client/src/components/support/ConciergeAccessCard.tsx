import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'wouter';
import { CreditCard, Loader2, Mic, PhoneCall, Send, Sparkles, Square, Volume2, Wallet } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { useConcierge } from '@/hooks/useConcierge';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useTranslation } from '@/contexts/TranslationContext';

type Props = {
  enabled: boolean;
  pricingLabel: string;
  onStartRequest: () => void;
  features?: string[];
  hotlineLabel?: string;
  hotlineUrl?: string;
};

type ConciergeThreadResponse = {
  ticket: { id: string; status: string } | null;
  messages: Array<{
    id: string;
    ticketId: string;
    senderId: string | null;
    senderType: 'admin' | 'user' | 'ai';
    senderName: string;
    message: string;
    isInternal: boolean;
    createdAt: string;
  }>;
};

const defaultConciergeFeatures = [
  'WhatsApp Support',
  'Unlimited Requests & Advice',
  'Priority Assistance',
  'Travel & eSIM Guidance',
  'Cancel Anytime',
];

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString();
}

function formatConciergePrice(data: ReturnType<typeof useConcierge>['data'], fallback: string) {
  if (!data) return fallback;
  if (!data.enabled) return 'Unavailable';
  if (data.pricingMode === 'free') return 'Free';

  const amount = Number(data.fee);
  const price = Number.isFinite(amount) && amount > 0 ? `$${amount.toFixed(2)}` : fallback;
  const cycle = data.billingCycle === 'monthly' ? 'monthly' : 'one time';
  const trial =
    data.trialEnabled && data.trialAvailable
      ? ` - ${data.trialDays}-day free trial`
      : '';

  return `${price} ${cycle}${trial}`;
}

export function ConciergeAccessCard({
  enabled,
  pricingLabel,
  onStartRequest,
  features = [],
  hotlineLabel,
  hotlineUrl,
}: Props) {
  const { toast } = useToast();
  const { isAuthenticated } = useUser();
  const { languageCode } = useTranslation();
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showChatDialog, setShowChatDialog] = useState(false);
  const [draftMessage, setDraftMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioUrlRef = useRef<string | null>(null);
  const chatPanelRef = useRef<HTMLDivElement | null>(null);
  const concierge = useConcierge(enabled && isAuthenticated);
  const loading = concierge.isLoading;
  const activating = concierge.activateMutation.isPending || concierge.startTrialMutation.isPending;
  const data = concierge.data;
  const canStartRequest = data?.pricingMode === 'free' || data?.hasAccess;
  const livePricingLabel = formatConciergePrice(data, pricingLabel);
  const displayedFeatures = features.length > 0 ? features : defaultConciergeFeatures;
  const botName = data?.aiBot?.name || 'ChatGPT Concierge';
  const botReady = data?.aiBot?.ready !== false;
  const voiceEnabled = data?.voice?.enabled !== false;
  const voiceReadMode = data?.voice?.readMode || 'openai';

  const conciergeThread = useQuery<ConciergeThreadResponse>({
    queryKey: ['/api/concierge/thread'],
    enabled: enabled && isAuthenticated,
  });
  const lastAssistantMessage = useMemo(() => {
    const messages = conciergeThread.data?.messages || [];
    return [...messages].reverse().find((message) => message.senderType !== 'user' && !message.isInternal);
  }, [conciergeThread.data?.messages]);

  useEffect(() => {
    if (!enabled || !isAuthenticated || loading) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('channel') !== 'concierge') return;

    void handleOpenConcierge();
    params.delete('channel');
    const next = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${next ? `?${next}` : ''}`);
  }, [enabled, isAuthenticated, loading]);

  useEffect(() => {
    if (showChatDialog || canStartRequest) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, [showChatDialog, canStartRequest, conciergeThread.data?.messages]);

  const statusText = useMemo(() => {
    const data = concierge.data;
    if (!data) return null;
    if (data.pricingMode === 'free') return 'Concierge is available for this account.';
    if (data.isTrialActive)
      return `Free trial active until ${formatDate(data.trialEndsAt) || 'your trial end date'}.`;
    if (data.hasAccess && data.billingCycle === 'monthly') {
      return `Monthly Concierge is active.${data.nextChargeAt ? ` Next wallet charge: ${formatDate(data.nextChargeAt)}.` : ''}`;
    }
    if (data.hasAccess) return 'Concierge access is active for this account.';
    if (data.status === 'pending_payment')
      return 'Payment request sent. Support will contact you to complete Concierge activation.';
    if (data.status === 'past_due')
      return 'Concierge renewal is due. Recharge wallet or choose another payment method.';
    if (data.trialAvailable) return `Start your free ${data.trialDays}-day trial before paying.`;
    return 'Activate VIP Concierge to start a priority support request.';
  }, [concierge.data]);

  if (!enabled) return null;

  const handleStartTrial = async () => {
    try {
      await concierge.startTrialMutation.mutateAsync();
      toast({
        title: 'Free trial started',
        description: 'Concierge trial is active now. You can open concierge chat.',
      });
    } catch (error: any) {
      toast({
        title: 'Could not start trial',
        description: error.message || 'Failed to start Concierge free trial',
        variant: 'destructive',
      });
    }
  };

  const handleActivate = async (paymentMethod: 'wallet' | 'other') => {
    try {
      await concierge.activateMutation.mutateAsync(paymentMethod);
      setShowActivateDialog(false);
      toast({
        title: paymentMethod === 'wallet' ? 'Concierge activated' : 'Payment request created',
        description:
          paymentMethod === 'wallet'
            ? 'Concierge access is active now.'
            : 'Support will contact you to complete Concierge payment.',
      });
    } catch (error: any) {
      toast({
        title: 'Activation failed',
        description: error.message || 'Failed to activate Concierge',
        variant: 'destructive',
      });
    }
  };

  const startThreadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/concierge/thread/start', {});
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/concierge/thread'] });
      setShowChatDialog(true);
    },
    onError: (error: any) => {
      toast({
        title: 'Unable to start Concierge',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/concierge/thread/message', {
        message: draftMessage.trim(),
      });
      return response.json();
    },
    onSuccess: async () => {
      setDraftMessage('');
      await queryClient.invalidateQueries({ queryKey: ['/api/concierge/thread'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Unable to send message',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const sendVoiceMutation = useMutation({
    mutationFn: async (audioBlob: Blob) => {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'concierge-voice.webm');
      formData.append('languageCode', languageCode || 'en');
      const response = await apiRequest('POST', '/api/concierge/thread/voice', formData);
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/concierge/thread'] });
      toast({
        title: 'Voice sent',
        description: 'Your voice message was transcribed and sent to Concierge.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Voice message failed',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleOpenConcierge = async () => {
    if (!canStartRequest) {
      setShowActivateDialog(true);
      return;
    }

    if (conciergeThread.data?.ticket) {
      setShowChatDialog(true);
      return;
    }

    try {
      await startThreadMutation.mutateAsync();
    } catch {
      onStartRequest();
    }
  };

  const handleSendMessage = () => {
    if (!draftMessage.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate();
  };

  const startVoiceRecording = async () => {
    if (!voiceEnabled) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast({
        title: 'Voice is not available',
        description: 'This browser does not support microphone recording.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        audioChunksRef.current = [];
        if (audioBlob.size > 0) sendVoiceMutation.mutate(audioBlob);
      };

      recorder.start();
      setIsRecording(true);
    } catch (error: any) {
      toast({
        title: 'Microphone blocked',
        description: error.message || 'Allow microphone access to send a voice message.',
        variant: 'destructive',
      });
    }
  };

  const stopVoiceRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const playAssistantVoice = async () => {
    if (!voiceEnabled) return;
    const text = lastAssistantMessage?.message?.trim();
    if (!text || isSpeaking) return;

    setIsSpeaking(true);
    try {
      if (voiceReadMode === 'browser' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = languageCode || 'en';
        utterance.rate = 0.92;
        utterance.pitch = 1;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
        return;
      }

      const response = await apiRequest('POST', '/api/concierge/voice/speak', {
        text,
        languageCode: languageCode || 'en',
      });
      const audioBlob = await response.blob();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrlRef.current);
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => setIsSpeaking(false);
      await audio.play();
    } catch (error: any) {
      setIsSpeaking(false);
      toast({
        title: 'Voice playback failed',
        description: error.message || 'Could not create the voice reply.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Card className="border-lime-200 bg-gradient-to-r from-lime-50 to-amber-50 text-slate-950 shadow-xl shadow-black/10">
        <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-lime-300 text-slate-950 shadow-sm">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">VIP Concierge</h2>
              <p className="mt-1 text-sm text-slate-600">
                {isAuthenticated
                  ? statusText || 'ChatGPT-powered help for package guidance, activation, and travel support.'
                  : 'Sign in to start your Concierge free trial or paid activation.'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Powered by {botName}
              </p>
              {isAuthenticated && !botReady && (
                <p className="mt-1 text-xs text-amber-700">
                  Add an OpenAI API key in admin settings to enable ChatGPT replies.
                </p>
              )}
              <p className="mt-2 text-xs font-medium uppercase tracking-wide text-lime-700">
                {livePricingLabel}
              </p>
              {displayedFeatures.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {displayedFeatures.slice(0, 5).map((feature) => (
                    <span
                      key={feature}
                      className="rounded-full border border-slate-300 bg-white/90 px-3 py-1 text-xs text-slate-700"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {hotlineUrl && (
              <Button
                type="button"
                variant="outline"
                disabled={loading || !canStartRequest}
                onClick={() => {
                  if (!canStartRequest) return;
                  window.location.assign(hotlineUrl);
                }}
                className="gap-2 border-lime-500/50 bg-white/90 text-slate-950 hover:bg-lime-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PhoneCall className="h-4 w-4" />
                {hotlineLabel || '24/7 Hotline'}
              </Button>
            )}
            {!isAuthenticated ? (
              <Button asChild type="button" className="gap-2 bg-lime-300 text-slate-950 hover:bg-lime-200">
                <Link href="/login">
                  <PhoneCall className="h-4 w-4" />
                  Sign In for VIP Concierge
                </Link>
              </Button>
            ) : loading ? (
              <Button type="button" disabled className="gap-2 bg-lime-300 text-slate-950">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </Button>
            ) : canStartRequest ? (
              <Button
                type="button"
                onClick={() => chatPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="gap-2 bg-lime-300 text-slate-950 hover:bg-lime-200"
              >
                <PhoneCall className="h-4 w-4" />
                Open Chat Screen
              </Button>
            ) : (
              <>
                {data?.trialAvailable && (
                  <Button
                    type="button"
                    onClick={handleStartTrial}
                    disabled={activating}
                    variant="outline"
                    className="gap-2 border-lime-500/50 bg-white/90 text-slate-950 hover:bg-lime-50"
                  >
                    {concierge.startTrialMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Start Free Trial
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={() => setShowActivateDialog(true)}
                  disabled={activating}
                  className="gap-2 bg-lime-300 text-slate-950 hover:bg-lime-200"
                >
                  <PhoneCall className="h-4 w-4" />
                  Activate VIP Concierge
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {isAuthenticated && canStartRequest && (
        <Card ref={chatPanelRef} className="mt-4 overflow-hidden border-blue-300/10 bg-[#0b1226]/90 text-white shadow-xl shadow-black/10">
          <CardContent className="p-0">
            <div className="flex flex-col border-b border-white/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-lime-300" />
                  <h3 className="text-lg font-semibold">ChatGPT VIP Screen</h3>
                </div>
                <p className="mt-1 text-sm text-slate-400">
                  Ask any question. VIP Concierge uses your configured OpenAI API key and answers inside this screen.
                </p>
              </div>
              {voiceEnabled && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={playAssistantVoice}
                  disabled={!lastAssistantMessage || isSpeaking}
                  className="mt-3 gap-2 border-white/15 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white md:mt-0"
                >
                  {isSpeaking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
                  Voice Reply
                </Button>
              )}
            </div>

            <div className="min-h-[420px] max-h-[62vh] space-y-4 overflow-y-auto bg-slate-950/40 px-5 py-5">
              {conciergeThread.isLoading || sendMessageMutation.isPending || sendVoiceMutation.isPending ? (
                <div className="flex justify-center py-4 text-sm text-slate-400">
                  {(conciergeThread.isLoading || sendMessageMutation.isPending || sendVoiceMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {conciergeThread.isLoading ? 'Loading ChatGPT screen...' : 'Thinking...'}
                </div>
              ) : (conciergeThread.data?.messages?.length || 0) === 0 ? (
                <div className="mx-auto flex max-w-xl flex-col items-center justify-center py-16 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-300 text-slate-950">
                    <Sparkles className="h-7 w-7" />
                  </div>
                  <h4 className="mt-4 text-xl font-semibold">Ask ChatGPT anything</h4>
                  <p className="mt-2 text-sm text-slate-400">
                    Start with a question about travel, eSIM setup, business, writing, or anything else you need.
                  </p>
                </div>
              ) : (
                conciergeThread.data?.messages.map((message) => {
                  const isOutbound = message.senderType === 'user';
                  return (
                    <div key={message.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                          isOutbound
                            ? 'bg-lime-300 text-slate-950'
                            : 'border border-white/10 bg-slate-900 text-slate-100'
                        }`}
                      >
                        <div className={`mb-1 text-xs font-semibold ${isOutbound ? 'text-slate-700' : 'text-lime-200'}`}>
                          {isOutbound ? 'You' : botName}
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed">{message.message}</p>
                        <p className={`mt-2 text-[11px] ${isOutbound ? 'text-slate-700' : 'text-slate-500'}`}>
                          {new Date(message.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-white/10 bg-[#0b1226] p-4">
              <Textarea
                value={draftMessage}
                onChange={(e) => setDraftMessage(e.target.value)}
                placeholder="Ask ChatGPT anything..."
                rows={4}
                disabled={sendMessageMutation.isPending}
                className="resize-none border-white/15 bg-slate-950/70 text-white placeholder:text-slate-500"
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <div className="mt-3 flex justify-end gap-2">
                {voiceEnabled && (
                  <Button
                    type="button"
                    variant={isRecording ? 'destructive' : 'outline'}
                    onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                    disabled={sendVoiceMutation.isPending || sendMessageMutation.isPending}
                    className="gap-2 border-white/15 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
                  >
                    {sendVoiceMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isRecording ? (
                      <Square className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                    {isRecording ? 'Stop' : 'Talk'}
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!draftMessage.trim() || sendMessageMutation.isPending}
                  className="gap-2 bg-lime-300 text-slate-950 hover:bg-lime-200"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate VIP Concierge</DialogTitle>
            <DialogDescription>
              {data?.billingCycle === 'monthly'
                ? 'Choose how to pay the Concierge monthly fee.'
                : 'Choose how to pay the Concierge one-time fee.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            <button
              type="button"
              onClick={() => handleActivate('wallet')}
              disabled={activating}
              className="rounded-xl border border-border bg-muted/30 p-4 text-left transition hover:border-lime-400"
            >
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-lime-600" />
                <div>
                  <p className="font-medium">Pay from Wallet</p>
                  <p className="text-sm text-muted-foreground">
                    Charge {livePricingLabel} from the user wallet balance now.
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleActivate('other')}
              disabled={activating}
              className="rounded-xl border border-border bg-muted/30 p-4 text-left transition hover:border-lime-400"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-lime-600" />
                <div>
                  <p className="font-medium">Other Payment Method</p>
                  <p className="text-sm text-muted-foreground">
                    Create a support payment request so the team can complete Concierge activation manually.
                  </p>
                </div>
              </div>
            </button>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowActivateDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showChatDialog} onOpenChange={setShowChatDialog}>
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-hidden border-slate-200 bg-white p-0 text-slate-950 shadow-2xl dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50">
          <DialogHeader className="border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle className="text-slate-950 dark:text-white">Concierge</DialogTitle>
                <DialogDescription className="text-slate-500 dark:text-slate-400">
                  Chat or talk with the concierge team directly inside the app.
                </DialogDescription>
              </div>
              {voiceEnabled && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={playAssistantVoice}
                  disabled={!lastAssistantMessage || isSpeaking}
                  className="gap-2 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  {isSpeaking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
                  Voice
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="max-h-[52vh] space-y-3 overflow-y-auto bg-slate-50 px-6 py-4 dark:bg-slate-900">
            {conciergeThread.isLoading || startThreadMutation.isPending ? (
              <div className="flex items-center justify-center py-10 text-sm text-slate-500 dark:text-slate-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading concierge chat...
              </div>
            ) : (conciergeThread.data?.messages?.length || 0) === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                No messages yet. Start your concierge conversation here.
              </div>
            ) : (
              conciergeThread.data?.messages.map((message) => {
                const isOutbound = message.senderType === 'user';
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                        isOutbound
                          ? 'bg-lime-300 text-slate-950'
                          : 'border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.message}</p>
                      <p className={`mt-2 text-[11px] ${isOutbound ? 'text-slate-700' : 'text-slate-500 dark:text-slate-400'}`}>
                        {new Date(message.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-col gap-3">
              <Textarea
                value={draftMessage}
                onChange={(e) => setDraftMessage(e.target.value)}
                placeholder="Type your concierge message..."
                rows={4}
                disabled={sendMessageMutation.isPending}
                className="resize-none border-slate-200 bg-white text-slate-950 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:placeholder:text-slate-500"
              />
              <div className="flex justify-end">
                {voiceEnabled && (
                  <Button
                    type="button"
                    variant={isRecording ? 'destructive' : 'outline'}
                    onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                    disabled={sendVoiceMutation.isPending || sendMessageMutation.isPending}
                    className="mr-2 gap-2 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    {sendVoiceMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isRecording ? (
                      <Square className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                    {isRecording ? 'Stop' : 'Talk'}
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!draftMessage.trim() || sendMessageMutation.isPending}
                  className="gap-2 bg-lime-300 text-slate-950 hover:bg-lime-200"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
