import { useState } from 'react';
import { Link } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Headphones,
  Inbox,
  Loader2,
  Mic,
  PhoneCall,
  Send,
  Smartphone,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

type UsageBilling = {
  rates: {
    smsOutbound: string;
    smsInbound: string;
    voiceOutbound: string;
    voiceInbound: string;
  };
  canSendSms: boolean;
  canReceiveSms: boolean;
  canStartOutboundCall: boolean;
  canReceiveInboundCall: boolean;
};

type MyDidNumber = {
  id: string;
  msisdn: string;
  countryCode: string;
  status: string;
  assignedAt: string;
  billing?: UsageBilling | null;
  routing?: {
    type?: 'none' | 'international' | 'sip' | 'voicemail';
    destination?: string | null;
  } | null;
  pricing?: {
    monthlyFee?: string;
    smsFee?: string;
    voiceFee?: string;
  } | null;
};

type SmsMessage = {
  id: string;
  direction: 'inbound' | 'outbound';
  fromNumber: string;
  toNumber: string;
  text: string;
  status: string;
  createdAt: string;
};

type VoiceCall = {
  id: string;
  direction: 'inbound' | 'outbound';
  fromNumber: string;
  toNumber: string;
  status: string;
  createdAt: string;
};

type Voicemail = {
  id: string;
  fromNumber: string;
  toNumber: string;
  recordingUrl?: string | null;
  recordingUuid?: string | null;
  durationSeconds?: number;
  status: string;
  createdAt: string;
};

type MyDidsWorkspace = {
  enabled: boolean;
  hasCredentials: boolean;
  walletBalance?: string;
  numbers: MyDidNumber[];
  selectedNumber: MyDidNumber | null;
  messages: SmsMessage[];
  receivingMessages: SmsMessage[];
  sendingMessages: SmsMessage[];
  voiceCalls: VoiceCall[];
  voicemails: Voicemail[];
};

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString();
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === 'active' || normalized === 'sent' || normalized === 'received' || normalized === 'recorded') {
    return 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100';
  }
  if (normalized === 'failed' || normalized === 'suspended') {
    return 'border-red-300/25 bg-red-400/10 text-red-100';
  }
  return 'border-blue-300/20 bg-blue-400/10 text-blue-100';
}

function hasNativeVoiceBridge() {
  const w = window as any;
  return Boolean(w.ReactNativeWebView || w.flutter_inappwebview || w.EsimVoiceBridge || w.VoiceBridge);
}

function notifyNativeVoiceBridge(session: any, number: string, fromNumber?: string) {
  const message = JSON.stringify({
    type: 'eroaming_voice',
    event: 'start_outbound_call',
    number,
    fromNumber,
    session,
    customData: session?.customData || null,
    metadata: {
      backend: session?.backend || 'vonage',
      virtualNumberId: session?.virtualNumberId || null,
      callRecordId: session?.callRecordId || null,
    },
  });
  const w = window as any;

  if (w.ReactNativeWebView) w.ReactNativeWebView.postMessage(message);
  if (w.flutter_inappwebview) w.flutter_inappwebview.callHandler('onVoiceEvent', message);
  if (w.EsimVoiceBridge?.startOutboundCall) w.EsimVoiceBridge.startOutboundCall(message);
  if (w.VoiceBridge?.startOutboundCall) w.VoiceBridge.startOutboundCall(message);
  window.parent?.postMessage(message, '*');
}

export default function MyDIDs({ selectedId = '' }: { selectedId?: string }) {
  const { toast } = useToast();
  const [sendTo, setSendTo] = useState('');
  const [messageText, setMessageText] = useState('');
  const [dialNumber, setDialNumber] = useState('');
  const [callStatus, setCallStatus] = useState('Ready');

  const queryKey = selectedId ? ['/api/vonage/numbers', selectedId] : ['/api/vonage/numbers'];
  const { data, isLoading, error } = useQuery<MyDidsWorkspace>({
    queryKey,
    queryFn: async () => {
      const url = selectedId ? `/api/vonage/numbers/${selectedId}` : '/api/vonage/numbers';
      const response = await fetch(url, { credentials: 'include' });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.message || "Could not load My DID's");
      }
      return json.data as MyDidsWorkspace;
    },
  });

  const selectedNumber = data?.selectedNumber || null;
  const billing = selectedNumber?.billing || null;
  const numbers = data?.numbers || [];
  const totalActive = numbers.filter((number) => number.status === 'active').length;
  const inboundMessages = data?.receivingMessages || [];
  const outboundMessages = data?.sendingMessages || [];
  const voiceCalls = data?.voiceCalls || [];
  const voicemails = data?.voicemails || [];

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!selectedNumber) throw new Error('Select a DID first');
      const response = await apiRequest('POST', `/api/vonage/numbers/${selectedNumber.id}/messages/send`, {
        to: sendTo,
        text: messageText,
      });
      const json = await response.json();
      return json.data ?? json;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/vonage/numbers'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/vonage/dashboard'] });
      setMessageText('');
      toast({
        title: 'SMS Sent',
        description: 'The message was sent from the selected DID.',
      });
    },
    onError: (mutationError: any) => {
      toast({
        title: 'SMS Failed',
        description: mutationError.message || 'Could not send SMS from this DID.',
        variant: 'destructive',
      });
    },
  });

  const voiceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedNumber) throw new Error('Select a DID first');
      if (!hasNativeVoiceBridge()) {
        throw new Error('Live calls must be started from the Android or iOS app voice engine.');
      }

      const response = await apiRequest('POST', `/api/vonage/numbers/${selectedNumber.id}/voice/session`, {
        direction: 'outbound',
        to: dialNumber,
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.message || 'Could not create the voice session');
      return json.data;
    },
    onSuccess: async (session) => {
      notifyNativeVoiceBridge(session, dialNumber, selectedNumber?.msisdn);
      setCallStatus('Calling Through Mobile App');
      await queryClient.invalidateQueries({ queryKey: ['/api/vonage/numbers'] });
      toast({
        title: 'Calling',
        description: `Calling ${dialNumber} from ${selectedNumber?.msisdn}.`,
      });
    },
    onError: (mutationError: any) => {
      setCallStatus('Native App Required');
      toast({
        title: 'Call Failed',
        description: mutationError.message || 'Could not start this call.',
        variant: 'destructive',
      });
    },
  });

  const appendDialDigit = (digit: string) => setDialNumber((current) => `${current}${digit}`);

  if (isLoading) {
    return (
      <div className="flex min-h-[28rem] items-center justify-center text-white">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-300" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-300/20 bg-red-950/30 text-white">
        <CardHeader>
          <CardTitle>My DID's</CardTitle>
          <CardDescription className="text-red-100">{(error as Error).message}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6 text-white">
      <div className="flex flex-col gap-3 rounded-2xl border border-blue-300/10 bg-slate-950/80 p-5 shadow-xl shadow-black/20 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-cyan-200">
            <Smartphone className="h-4 w-4" />
            My DID's
          </div>
          <h1 className="mt-2 text-3xl font-semibold">Bought DID Numbers</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Manage each Vonage DID for SMS, receiving messages, outgoing calls, and Voice Mail.
          </p>
        </div>
        <Button asChild className="w-fit bg-blue-900 text-white hover:bg-blue-800">
          <Link href="/account/virtual-numbers">Buy More DID's</Link>
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: 'Bought DID Numbers', value: numbers.length, icon: Smartphone },
          { label: 'Active DID Numbers', value: totalActive, icon: PhoneCall },
          { label: 'Receiving SMS', value: inboundMessages.length, icon: Inbox },
          { label: 'Voice Mail', value: voicemails.length, icon: Mic },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="rounded-xl border border-blue-300/10 bg-[#0b1226]/90 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-300">{metric.label}</p>
                  <div className="mt-1 text-2xl font-semibold">{metric.value}</div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {numbers.length === 0 ? (
        <Card className="border-blue-300/10 bg-blue-950/25 text-white shadow-xl shadow-black/20">
          <CardHeader>
            <CardTitle>No Bought DID's Yet</CardTitle>
            <CardDescription className="text-cyan-50/75">
              Buy or assign a Vonage DID first, then it will show here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="bg-blue-900 text-white hover:bg-blue-800">
              <Link href="/account/virtual-numbers">Open eRoaming's</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
          <Card className="border-blue-300/10 bg-blue-950/25 text-white shadow-xl shadow-black/20">
            <CardHeader>
              <CardTitle>DID Numbers</CardTitle>
              <CardDescription className="text-cyan-50/75">Click any DID to open its dedicated page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {numbers.map((number) => {
                const active = number.id === selectedNumber?.id;
                return (
                  <Link key={number.id} href={`/account/my-dids/${number.id}`} className="block">
                    <div className={`rounded-xl border p-4 transition ${active ? 'border-cyan-300/50 bg-cyan-400/10' : 'border-blue-300/10 bg-slate-950/45 hover:border-cyan-300/30 hover:bg-slate-900'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">{number.msisdn}</div>
                          <div className="mt-1 text-xs text-slate-300">{number.countryCode} - Assigned {formatDate(number.assignedAt)}</div>
                        </div>
                        <ArrowRight className="mt-1 h-4 w-4 text-cyan-200" />
                      </div>
                      <div className={`mt-3 inline-flex rounded-full border px-2 py-1 text-xs capitalize ${statusClass(number.status)}`}>
                        {number.status}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-blue-300/10 bg-blue-950/25 text-white shadow-xl shadow-black/20">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>{selectedNumber?.msisdn || 'Select A DID'}</CardTitle>
                  <CardDescription className="mt-1 text-cyan-50/75">
                    {selectedNumber ? `${selectedNumber.countryCode} DID Workspace` : 'Choose a DID from the list.'}
                  </CardDescription>
                </div>
                {selectedNumber && (
                  <div className={`w-fit rounded-full border px-3 py-1 text-xs capitalize ${statusClass(selectedNumber.status)}`}>
                    {selectedNumber.status}
                  </div>
                )}
              </div>
            </CardHeader>
            {selectedNumber && (
              <CardContent>
                <div className="mb-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-blue-300/10 bg-slate-950/45 p-3">
                    <div className="text-xs text-slate-400">SMS Outbound</div>
                    <div className="mt-1 font-semibold">${billing?.rates.smsOutbound || selectedNumber.pricing?.smsFee || '0.00'}</div>
                  </div>
                  <div className="rounded-xl border border-blue-300/10 bg-slate-950/45 p-3">
                    <div className="text-xs text-slate-400">Voice Outbound</div>
                    <div className="mt-1 font-semibold">${billing?.rates.voiceOutbound || selectedNumber.pricing?.voiceFee || '0.00'}</div>
                  </div>
                  <div className="rounded-xl border border-blue-300/10 bg-slate-950/45 p-3">
                    <div className="text-xs text-slate-400">Routing</div>
                    <div className="mt-1 font-semibold capitalize">{selectedNumber.routing?.type || 'None'}</div>
                  </div>
                </div>

                <Tabs defaultValue="sending" className="space-y-4">
                  <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 border border-blue-300/10 bg-slate-950/60 p-1">
                    <TabsTrigger value="sending" className="data-[state=active]:bg-blue-900 data-[state=active]:text-white">
                      <Send className="mr-2 h-4 w-4" />
                      Sending SMS
                    </TabsTrigger>
                    <TabsTrigger value="receiving" className="data-[state=active]:bg-blue-900 data-[state=active]:text-white">
                      <Inbox className="mr-2 h-4 w-4" />
                      Receiving SMS
                    </TabsTrigger>
                    <TabsTrigger value="calls" className="data-[state=active]:bg-blue-900 data-[state=active]:text-white">
                      <PhoneCall className="mr-2 h-4 w-4" />
                      Outgoing Calls
                    </TabsTrigger>
                    <TabsTrigger value="voicemail" className="data-[state=active]:bg-blue-900 data-[state=active]:text-white">
                      <Headphones className="mr-2 h-4 w-4" />
                      Voice Mail
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="sending" className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
                      <div className="space-y-3 rounded-xl border border-blue-300/10 bg-slate-950/45 p-4">
                        <div className="space-y-2">
                          <Label htmlFor="did-send-to">Recipient Number</Label>
                          <Input
                            id="did-send-to"
                            value={sendTo}
                            onChange={(event) => setSendTo(event.target.value)}
                            placeholder="+15551234567"
                            className="border-blue-300/15 bg-slate-950/70 text-white placeholder:text-slate-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="did-message">Message</Label>
                          <Textarea
                            id="did-message"
                            value={messageText}
                            onChange={(event) => setMessageText(event.target.value)}
                            rows={4}
                            className="border-blue-300/15 bg-slate-950/70 text-white placeholder:text-slate-500"
                          />
                        </div>
                        <Button
                          className="bg-blue-900 text-white hover:bg-blue-800"
                          onClick={() => sendMutation.mutate()}
                          disabled={sendMutation.isPending || !billing?.canSendSms || !sendTo.trim() || !messageText.trim()}
                        >
                          {sendMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                          Send SMS
                        </Button>
                        {!billing?.canSendSms && <p className="text-sm text-red-200">Wallet balance is required before sending SMS.</p>}
                      </div>
                      <div className="rounded-xl border border-blue-300/10 bg-slate-950/45 p-4">
                        <div className="text-xs uppercase tracking-wide text-slate-400">Sending From</div>
                        <div className="mt-2 text-lg font-semibold">{selectedNumber.msisdn}</div>
                        <div className="mt-4 text-xs uppercase tracking-wide text-slate-400">Sent SMS</div>
                        <div className="mt-2 text-2xl font-semibold">{outboundMessages.length}</div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="receiving" className="space-y-3">
                    {inboundMessages.length === 0 ? (
                      <div className="rounded-xl border border-blue-300/10 bg-slate-950/45 p-4 text-sm text-cyan-50/75">No received SMS for this DID yet.</div>
                    ) : (
                      inboundMessages.map((message) => (
                        <div key={message.id} className="rounded-xl border border-blue-300/10 bg-slate-950/45 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-semibold">From {message.fromNumber}</div>
                            <div className="text-xs text-slate-400">{formatDate(message.createdAt)}</div>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-100">{message.text}</p>
                          <div className={`mt-3 inline-flex rounded-full border px-2 py-1 text-xs capitalize ${statusClass(message.status)}`}>
                            {message.status}
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="calls" className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                      <div className="space-y-3 rounded-xl border border-blue-300/10 bg-slate-950/45 p-4">
                        <Label htmlFor="did-dial-number">Call Number</Label>
                        <Input
                          id="did-dial-number"
                          value={dialNumber}
                          onChange={(event) => setDialNumber(event.target.value)}
                          placeholder="+15551234567"
                          className="h-12 border-blue-300/15 bg-slate-950/70 text-lg text-white placeholder:text-slate-500"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '0', '#'].map((digit) => (
                            <Button
                              key={digit}
                              type="button"
                              variant="outline"
                              className="h-11 border-blue-300/15 bg-slate-950/50 text-lg text-white hover:bg-blue-500/20 hover:text-white"
                              onClick={() => appendDialDigit(digit)}
                            >
                              {digit}
                            </Button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            className="flex-1 bg-blue-900 text-white hover:bg-blue-800"
                            onClick={() => voiceMutation.mutate()}
                            disabled={voiceMutation.isPending || !billing?.canStartOutboundCall || !dialNumber.trim()}
                          >
                            {voiceMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PhoneCall className="mr-2 h-4 w-4" />}
                            Call
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="border-blue-300/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
                            onClick={() => setDialNumber((current) => current.slice(0, -1))}
                          >
                            Delete
                          </Button>
                        </div>
                        {!billing?.canStartOutboundCall && <p className="text-sm text-red-200">Wallet balance is required before starting calls.</p>}
                      </div>
                      <div className="rounded-xl border border-blue-300/10 bg-slate-950/45 p-4">
                        <div className="text-xs uppercase tracking-wide text-slate-400">Calling From</div>
                        <div className="mt-2 text-lg font-semibold">{selectedNumber.msisdn}</div>
                        <div className="mt-4 text-xs uppercase tracking-wide text-slate-400">Call Status</div>
                        <div className="mt-2 text-sm font-semibold">{callStatus}</div>
                        {!hasNativeVoiceBridge() && (
                          <p className="mt-4 rounded-lg border border-amber-300/20 bg-amber-400/10 p-3 text-xs text-amber-100">
                            Browser preview cannot place live calls. Open this page inside the Android or iOS app.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold">Outgoing Call History</h3>
                      {voiceCalls.length === 0 ? (
                        <div className="rounded-xl border border-blue-300/10 bg-slate-950/45 p-4 text-sm text-cyan-50/75">No outgoing calls from this DID yet.</div>
                      ) : (
                        voiceCalls.map((call) => (
                          <div key={call.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-300/10 bg-slate-950/45 p-4">
                            <div>
                              <div className="font-semibold">To {call.toNumber || 'Unknown'}</div>
                              <div className="mt-1 text-xs text-slate-400">{formatDate(call.createdAt)}</div>
                            </div>
                            <div className={`rounded-full border px-2 py-1 text-xs capitalize ${statusClass(call.status)}`}>{call.status.replace(/_/g, ' ')}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="voicemail" className="space-y-3">
                    {voicemails.length === 0 ? (
                      <div className="rounded-xl border border-blue-300/10 bg-slate-950/45 p-4 text-sm text-cyan-50/75">No Voice Mail for this DID yet.</div>
                    ) : (
                      voicemails.map((voicemail) => (
                        <div key={voicemail.id} className="rounded-xl border border-blue-300/10 bg-slate-950/45 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold">From {voicemail.fromNumber}</div>
                              <div className="mt-1 text-xs text-slate-400">{formatDate(voicemail.createdAt)}</div>
                            </div>
                            <div className={`rounded-full border px-2 py-1 text-xs capitalize ${statusClass(voicemail.status)}`}>{voicemail.status}</div>
                          </div>
                          <div className="mt-3 text-sm text-slate-300">Duration: {voicemail.durationSeconds || 0}s</div>
                          {voicemail.recordingUrl && (
                            <a
                              href={voicemail.recordingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-flex rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-300/20"
                            >
                              Open Recording
                            </a>
                          )}
                        </div>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
