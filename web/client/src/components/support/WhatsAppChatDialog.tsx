import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

type WhatsAppMessage = {
  id: string;
  direction: 'inbound' | 'outbound';
  fromNumber: string;
  toNumber: string;
  text: string;
  status: string;
  createdAt: string;
};

type WhatsAppChatDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userPhone?: string;
  messages: WhatsAppMessage[];
};

export function WhatsAppChatDialog({
  open,
  onOpenChange,
  userPhone,
  messages,
}: WhatsAppChatDialogProps) {
  const { toast } = useToast();
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, [open, messages]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/whatsapp/send', { text: draft.trim() });
      return res.json();
    },
    onSuccess: () => {
      setDraft('');
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/thread'] });
      toast({ title: 'WhatsApp message sent' });
    },
    onError: (error: any) => {
      toast({
        title: 'Unable to send WhatsApp message',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSend = () => {
    if (!draft.trim() || sendMutation.isPending) return;
    sendMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-500" />
            WhatsApp
          </DialogTitle>
          <DialogDescription>
            {userPhone
              ? 'Chat with support directly inside the app.'
              : 'Add your phone number in profile before using in-app WhatsApp chat.'}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[52vh] space-y-3 overflow-y-auto bg-muted/30 px-6 py-4">
          {messages.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-background px-4 py-6 text-center text-sm text-muted-foreground">
              No messages yet. Send the first WhatsApp message from here.
            </div>
          ) : (
            messages.map((message) => {
              const isOutbound = message.direction === 'outbound';
              return (
                <div
                  key={message.id}
                  className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      isOutbound
                        ? 'bg-green-500 text-white'
                        : 'border bg-background text-foreground'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.text}</p>
                    <p
                      className={`mt-2 text-[11px] ${
                        isOutbound ? 'text-green-50/90' : 'text-muted-foreground'
                      }`}
                    >
                      {new Date(message.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t px-6 py-4">
          <div className="flex flex-col gap-3">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                userPhone ? 'Type your WhatsApp message...' : 'Add your phone number in profile first'
              }
              disabled={!userPhone || sendMutation.isPending}
              rows={4}
            />
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleSend}
                disabled={!userPhone || !draft.trim() || sendMutation.isPending}
                className="gap-2 bg-green-500 text-white hover:bg-green-600"
              >
                <Send className="h-4 w-4" />
                {sendMutation.isPending ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
