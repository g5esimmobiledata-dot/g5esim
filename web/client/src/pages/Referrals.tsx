import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import {
  Users,
  CheckCircle,
  DollarSign,
  Clock,
  Copy,
  Mail,
  Share2,
  Gift,
  ChevronDown,
  CreditCard,
  Calendar,
  Tag,
  TrendingUp,
  Award,
  CircleIcon,
  Ticket,
} from 'lucide-react';
import { SiWhatsapp, SiX, SiFacebook } from 'react-icons/si';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/contexts/TranslationContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { getCurrencySymbol } from '@/lib/currency';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { useUser } from '@/hooks/use-user';
import { cn } from '@/lib/utils';

interface ReferralProgram {
  id: string;
  userId: string;
  referralCode: string;
  totalReferrals: number;
  totalEarnings: string;
  createdAt: string;
  updatedAt: string;
}

interface Referral {
  id: string;
  referrerId: string;
  referredId: string;
  referralCode: string;
  status: string;
  rewardAmount: string | null;
  rewardPaid: boolean;
  completedAt: string | null;
  createdAt: string;
  referredUserEmail?: string;
}

interface ReferralSettings {
  enabled: boolean;
  rewardType: string;
  rewardValue: string;
  referredUserDiscount: string;
  minOrderAmount?: string;
}

interface GiftCard {
  id: string;
  code: string;
  amount: string;
  currency: string;
  balance: string;
  status: string;
  theme: string;
  message: string | null;
  recipientName: string | null;
  recipientEmail: string | null;
  expiresAt: string;
  redeemedAt: string | null;
  createdAt: string;
}

interface RedeemFormData {
  amount: string;
  currency: string;
  message: string;
  theme: string;
}

const initialRedeemFormData: RedeemFormData = {
  amount: '',
  currency: 'USD',
  message: '',
  theme: 'default',
};

const themes = [
  { value: 'default', label: 'Default' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'travel', label: 'Travel' },
  { value: 'thank-you', label: 'Thank You' },
  { value: 'celebration', label: 'Celebration' },
];

function generateGiftCardCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'GC-';
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (i < 3) result += '-';
  }
  return result;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

export default function Referrals() {
  const { t } = useTranslation();
  const { currencies } = useCurrency();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [termsOpen, setTermsOpen] = useState(false);
  const [isRedeemDialogOpen, setIsRedeemDialogOpen] = useState(false);
  const [formData, setFormData] = useState<RedeemFormData>(initialRedeemFormData);
  const [activeTab, setActiveTab] = useState('referrals');
  const { user } = useUser();

  // Fetch referral program data
  const { data: program, isLoading: programLoading } = useQuery<ReferralProgram>({
    queryKey: ['/api/referrals/my-program'],
  });

  // Fetch referral history
  const { data: referralsData, isLoading: referralsLoading } = useQuery<{ referrals: Referral[] }>({
    queryKey: ['/api/referrals/my-referrals'],
  });

  const referrals = referralsData?.referrals || [];

  // Fetch redeemed gift cards
  const { data: giftCardsData, isLoading: giftCardsLoading } = useQuery<{ giftCardsData: GiftCard[] }>({
    queryKey: ['/api/referrals/my-gift-cards'],
  });

  const giftCards = giftCardsData?.giftCardsData || [];

  // Fetch settings to show reward info
  const { data: settings } = useQuery<ReferralSettings>({
    queryKey: ['/api/referrals/settings'],
  });

  const shareUrl = program ? `${window.location.origin}/login?ref=${program.referralCode}` : '';

  // Calculate stats
  const successfulReferrals = referrals?.filter((r) => r.status === 'completed').length;
  const pendingRewards = referrals
    ?.filter((r) => r.status === 'completed' && !r.rewardPaid && r.rewardAmount)
    .reduce((sum, r) => sum + parseFloat(r.rewardAmount || '0'), 0);

  // Redeem balance to gift card mutation
  const redeemMutation = useMutation({
    mutationFn: async (data: RedeemFormData) => {
      return apiRequest('POST', '/api/referrals/redeem-to-gift-card', {
        code: generateGiftCardCode(),
        amount: parseFloat(data.amount),
        currency: data.currency,
        message: data.message || null,
        theme: data.theme,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/referrals/my-program'] });
      queryClient.invalidateQueries({ queryKey: ['/api/referrals/my-gift-cards'] });
      setIsRedeemDialogOpen(false);
      setFormData(initialRedeemFormData);
      toast({
        title: 'Success!',
        description: 'Your balance has been converted to a gift card',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Copy to clipboard
  const copyToClipboard = async (text: string, type: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: type === 'code' ? 'Code copied!' : 'Link copied!',
        description:
          type === 'code'
            ? 'Referral code copied to clipboard'
            : 'Referral link copied to clipboard',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  // Share functions
  const shareEmail = () => {
    const subject = encodeURIComponent(`Join me on eSIM Connect!`);
    const body = encodeURIComponent(
      `I'm using eSIM Connect for affordable travel data. Use my code ${program?.referralCode} to get ${settings?.referredUserDiscount}% off your first order!\n\n${shareUrl}`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      `Join me on eSIM Connect! Use code ${program?.referralCode} for ${settings?.referredUserDiscount}% off: ${shareUrl}`,
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareTwitter = () => {
    const text = encodeURIComponent(
      `Get ${settings?.referredUserDiscount}% off your first eSIM on @eSIMGlobal with my code ${program?.referralCode}! ${shareUrl}`,
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  const shareFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      '_blank',
    );
  };

  // Mask email address
  const maskEmail = (email: string) => {
    const [name, domain] = email.split('@');
    if (name.length <= 1) return email;
    return `${name[0]}***@${domain}`;
  };

  const rewardText =
    settings?.rewardType === 'percentage'
      ? `${settings.rewardValue}%`
      : `${getCurrencySymbol('USD', currencies)}${settings?.rewardValue}`;

  const handleRedeemSubmit = () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    const availableBalance = parseFloat(program?.totalEarnings || '0');
    if (parseFloat(formData.amount) > availableBalance) {
      toast({
        title: 'Insufficient balance',
        description: 'Amount exceeds your available balance',
        variant: 'destructive',
      });
      return;
    }

    redeemMutation.mutate(formData);
  };

  if (programLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid gap-6 md:grid-cols-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-8 pb-10"
    >
      <Helmet>
        <title>{String(t('userPanel.referrals.title', 'Referrals'))} - eSIM Connect</title>
        <meta
          name="description"
          content={String(t('userPanel.referrals.subtitle', 'Earn rewards by referring friends'))}
        />
      </Helmet>

      {/* Hero Section */}
      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-500 p-8 md:p-12 text-white shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <Badge className="bg-white/20 hover:bg-white/30 text-white border-none mb-4 backdrop-blur-md px-4 py-1">
            <Gift className="w-4 h-4 mr-2" />
            {t('userPanel.referrals.badge', 'Exclusive Program')}
          </Badge>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight leading-tight">
            {t('userPanel.referrals.heroTitle', 'Invite Your Friends & Get Rewarded')}
          </h1>
          <p className="text-teal-50 text-base mb-8 opacity-90 leading-relaxed">
            {t('userPanel.referrals.heroSubtitle', 'Share the love for eSIM Connect and earn rewards for every friend who joins. It\'s a win-win for everyone!')}
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/20">
              <div className="p-2 bg-white/20 rounded-xl">
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-teal-100 font-medium uppercase tracking-wider">{t('referrals.you_earn', 'You Earn')}</p>
                <p className="text-xl font-bold">{rewardText}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/20">
              <div className="p-2 bg-white/20 rounded-xl">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-teal-100 font-medium uppercase tracking-wider">{t('referrals.friends_get', 'Friends Get')}</p>
                <p className="text-xl font-bold">{settings?.referredUserDiscount}% OFF</p>
              </div>
            </div>
          </div>
        </div>

        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-64 h-64 bg-teal-400/20 rounded-full blur-3xl" />
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-12 right-12 hidden lg:block opacity-20"
        >
          <Gift className="w-32 h-32" />
        </motion.div>
      </motion.div>

      {/* Stats Quick Overview */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: t('userPanel.referrals.totalReferrals'), value: program?.totalReferrals || 0, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: t('userPanel.referrals.successfulReferrals'), value: successfulReferrals, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: t('userPanel.referrals.totalEarnings'), value: `${getCurrencySymbol('USD', currencies)}${parseFloat(program?.totalEarnings || '0').toFixed(2)}`, icon: DollarSign, color: 'text-teal-600', bg: 'bg-teal-600/10' },
          { label: t('userPanel.referrals.pendingRewards'), value: `${getCurrencySymbol('USD', currencies)}${pendingRewards.toFixed(2)}`, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        ].map((stat, i) => (
          <Card key={i} className="border border-slate-700 bg-slate-900/85 text-white shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-teal-400/50 hover:bg-slate-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-3 rounded-2xl", stat.bg)}>
                  <stat.icon className={cn("w-6 h-6", stat.color)} />
                </div>
                {i === 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-teal-200 hover:bg-teal-500/15 hover:text-teal-100"
                    onClick={() => setIsRedeemDialogOpen(true)}
                  >
                    Redeem
                  </Button>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-300 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold tracking-tight text-white">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch mb-8">
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="h-full overflow-hidden border border-slate-700/70 bg-slate-950 text-slate-50 shadow-xl">
            <div className="h-2 bg-gradient-to-r from-teal-500 to-emerald-500" />
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold text-white">{t('userPanel.referrals.yourCode', 'Your Referral Program')}</CardTitle>
              <CardDescription className="text-slate-300">{t('userPanel.referrals.shareVia', 'Share this code or link with your friends to start earning.')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 pt-4">
              <div className="relative flex flex-col items-center justify-center space-y-6 rounded-3xl border border-slate-700 bg-slate-900/80 p-8 text-center">
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-300">Personal Invite Code</p>
                  <p className="text-4xl font-black tracking-widest text-white md:text-5xl">
                    {program?.referralCode}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 justify-center">
                  <Button
                    variant="outline"
                    size="lg"
                    className="group/btn h-14 rounded-2xl border-2 border-slate-600 bg-slate-950 px-8 text-slate-100 transition-all hover:border-teal-400 hover:bg-teal-400/10 hover:text-white"
                    onClick={() => copyToClipboard(program?.referralCode || '', 'code')}
                  >
                    <Copy className="mr-3 h-5 w-5 text-slate-300 transition-colors group-hover/btn:text-teal-300" />
                    <span className="font-semibold">{t('userPanel.referrals.copyCode', 'Copy Code')}</span>
                  </Button>
                  <Button
                    variant="default"
                    size="lg"
                    className="h-14 rounded-2xl bg-teal-600 px-8 text-white shadow-lg shadow-teal-500/20 transition-all hover:bg-teal-500"
                    onClick={() => copyToClipboard(shareUrl, 'link')}
                  >
                    <Share2 className="h-5 w-5 mr-3" />
                    <span className="font-semibold">{t('userPanel.referrals.copyLink', 'Copy Link')}</span>
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <p className="flex items-center justify-center gap-4 text-center text-sm font-semibold uppercase tracking-wider text-slate-300">
                  <span className="h-[1px] flex-1 bg-slate-600" />
                  Quick Share
                  <span className="h-[1px] flex-1 bg-slate-600" />
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { name: 'Email', icon: Mail, action: shareEmail, color: 'hover:border-slate-300 hover:bg-slate-700 hover:text-white' },
                    { name: 'WhatsApp', icon: SiWhatsapp, action: shareWhatsApp, color: 'hover:border-emerald-300 hover:bg-emerald-500/15 hover:text-emerald-200' },
                    { name: 'Twitter', icon: SiX, action: shareTwitter, color: 'hover:border-slate-300 hover:bg-slate-700 hover:text-white' },
                    { name: 'Facebook', icon: SiFacebook, action: shareFacebook, color: 'hover:border-blue-300 hover:bg-blue-500/15 hover:text-blue-200' },
                  ].map((platform) => (
                    <button
                      key={platform.name}
                      onClick={platform.action}
                      className={cn(
                        "group flex flex-col items-center justify-center rounded-2xl border border-slate-700 bg-slate-900/90 p-4 text-slate-100 transition-all duration-300",
                        platform.color
                      )}
                    >
                      <platform.icon className="w-6 h-6 mb-2 transition-transform group-hover:scale-110" />
                      <span className="text-xs font-semibold">{platform.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="lg:col-span-1">
          <Card className="h-full border-none shadow-lg bg-teal-900 text-teal-50 overflow-hidden flex flex-col">
            <CardHeader className="bg-teal-800/50 shrink-0">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Quick Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              <div className="relative h-full">
                <div className="absolute left-[31px] top-8 bottom-8 w-[2px] bg-teal-700/50" />
                <div className="p-8 h-full flex flex-col justify-between relative">
                  {[
                    { title: t('userPanel.referrals.step1Title', 'Share Code'), desc: t('userPanel.referrals.step1Desc', 'Send your unique code to friends.'), icon: Share2 },
                    { title: t('userPanel.referrals.step2Title', 'Friend Joins'), desc: t('userPanel.referrals.step2Desc', 'Friend gets discount on their first order.'), icon: Users },
                    { title: t('userPanel.referrals.step3Title', 'Get Rewarded'), desc: t('userPanel.referrals.step3Desc', 'You receive cash rewards for each referral.'), icon: Gift },
                  ].map((step, idx) => (
                    <div key={idx} className="flex gap-6 group">
                      <div className="w-4 h-4 rounded-full bg-teal-500 ring-8 ring-teal-500/20 z-10 mt-1.5 peer group-hover:scale-110 transition-transform" />
                      <div className="space-y-1">
                        <h4 className="font-bold text-teal-100 uppercase text-xs tracking-widest">{idx + 1}. {step.title}</h4>
                        <p className="text-xs text-teal-200/70 leading-relaxed font-medium">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={itemVariants} className="space-y-8">
        <Card className="border-none shadow-lg bg-white dark:bg-zinc-900/50 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full h-16 grid grid-cols-2 rounded-none bg-transparent border-b p-0">
              <TabsTrigger
                value="referrals"
                className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-teal-500 data-[state=active]:bg-teal-500/5 transition-all text-base font-semibold"
              >
                <Users className="w-4 h-4 mr-2" />
                {t('referrals.history_tab', 'Referral Activity')}
              </TabsTrigger>
              <TabsTrigger
                value="giftcards"
                className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-teal-500 data-[state=active]:bg-teal-500/5 transition-all text-base font-semibold"
              >
                <Award className="w-4 h-4 mr-2" />
                {t('referrals.giftcards_tab', 'Gift Cards')}
              </TabsTrigger>
            </TabsList>
            <div className="p-6">
              <AnimatePresence mode="wait">
                {activeTab === 'referrals' && (
                  <motion.div
                    key="referrals-tab"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {referralsLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                      </div>
                    ) : referrals.length === 0 ? (
                      <div className="text-center py-16 space-y-4">
                        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto">
                          <Users className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <div className="max-w-xs mx-auto">
                          <h3 className="text-lg font-bold mb-1">No invitations yet</h3>
                          <p className="text-sm text-muted-foreground">Start by sharing your referral code with friends and family!</p>
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                            <tr>
                              <th className="py-4 px-6 text-left">Invited Friend</th>
                              <th className="py-4 px-6 text-left">Status</th>
                              <th className="py-4 px-6 text-left">Your Reward</th>
                              <th className="py-4 px-6 text-left">Joined Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {referrals.map((referral) => (
                              <tr key={referral.id} className="hover:bg-muted/30 transition-colors group">
                                <td className="py-4 px-6">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-xs uppercase">
                                      {referral.referredUserEmail?.[0] || 'U'}
                                    </div>
                                    <span className="font-medium">{referral.referredUserEmail ? maskEmail(referral.referredUserEmail) : 'Anonymous'}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <Badge
                                    variant="secondary"
                                    className={cn(
                                      "rounded-full px-3 py-0.5",
                                      referral.status === 'completed' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                    )}
                                  >
                                    {referral.status === 'completed' ? 'Completed' : 'Pending'}
                                  </Badge>
                                </td>
                                <td className="py-4 px-6 font-bold text-teal-600">
                                  {referral.rewardAmount ? `${getCurrencySymbol('USD', currencies)}${parseFloat(referral.rewardAmount).toFixed(2)}` : '-'}
                                </td>
                                <td className="py-4 px-6 text-muted-foreground">
                                  {format(new Date(referral.createdAt), 'MMM d, yyyy')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'giftcards' && (
                  <motion.div
                    key="giftcards-tab"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {giftCardsLoading ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2].map(i => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
                      </div>
                    ) : giftCards.length === 0 ? (
                      <div className="text-center py-16 space-y-4">
                        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto">
                          <Award className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <div className="max-w-xs mx-auto">
                          <h3 className="text-lg font-bold mb-1">No gift cards redeemed</h3>
                          <p className="text-sm text-muted-foreground">Convert your referral earnings into gift cards to use on your next purchase!</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {giftCards.map((card) => (
                          <Card key={card.id} className="group relative border-2 border-teal-500/10 hover:border-teal-500/30 transition-all overflow-hidden bg-gradient-to-br from-white to-teal-50/10 dark:from-zinc-900 dark:to-teal-900/10 h-full flex flex-col">
                            <div className="absolute top-0 right-0 p-2">
                              <Badge variant={card.status === 'active' ? 'default' : 'secondary'} className="rounded-full bg-teal-500">
                                {card.status}
                              </Badge>
                            </div>
                            <CardHeader className="pb-2">
                              <div className="flex items-center gap-2 text-teal-600 mb-1">
                                <Ticket className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-widest leading-none">Gift Voucher</span>
                              </div>
                              <CardTitle className="text-lg font-mono tracking-tight">{card.code}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-4">
                              <div className="flex items-baseline justify-between">
                                <p className="text-sm text-muted-foreground font-medium">Available Balance</p>
                                <p className="text-xl font-bold text-teal-600">
                                  {getCurrencySymbol(card.currency, currencies)}{parseFloat(card.balance).toFixed(2)}
                                </p>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-4">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5" />
                                  Exp: {format(new Date(card.expiresAt), 'MMM d, yy')}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <CircleIcon className="w-3.5 h-3.5 fill-current" />
                                  {card.amount === card.balance ? 'Full' : 'Partial'}
                                </div>
                              </div>
                            </CardContent>
                            <CardFooter className="pt-0">
                              <Button
                                variant="outline"
                                className="w-full rounded-xl border-dashed hover:border-solid hover:bg-teal-50 dark:hover:bg-teal-900/20"
                                onClick={() => copyToClipboard(card.code, 'code')}
                              >
                                <Copy className="w-4 h-4 mr-2" />
                                Copy Code
                              </Button>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Tabs>
        </Card>

        {settings && (
          <Card className="border-none shadow-md bg-white dark:bg-zinc-900/50 overflow-hidden">
            <Collapsible open={termsOpen} onOpenChange={setTermsOpen}>
              <CollapsibleTrigger className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors">
                <span className="font-bold text-sm tracking-tight">{t('userPanel.referrals.termsAndConditions', 'Rules & Terms')}</span>
                <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", termsOpen && "rotate-180")} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-5 pt-0 border-t bg-muted/20">
                  <ul className="space-y-4 text-xs font-semibold text-muted-foreground/80 leading-relaxed uppercase tracking-wider">
                    <li className="flex gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                      Valid for new accounts only
                    </li>
                    <li className="flex gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                      Min order {getCurrencySymbol('USD', currencies)}{parseFloat(settings.minOrderAmount || '0').toFixed(0)}
                    </li>
                    <li className="flex gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                      Rewards granted after first order
                    </li>
                    <li className="flex gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                      Program subject to change
                    </li>
                  </ul>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )}
      </motion.div>

      <Dialog open={isRedeemDialogOpen} onOpenChange={setIsRedeemDialogOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
          <div className="h-32 bg-gradient-to-br from-teal-600 to-emerald-500 flex items-center justify-center p-6 text-white text-center">
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-black">Convert Earnings</DialogTitle>
              <DialogDescription className="text-teal-50 opacity-90 font-medium">
                Turn your rewards into shopping power
              </DialogDescription>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div className="bg-slate-50 dark:bg-zinc-800 ring-1 ring-slate-100 dark:ring-zinc-700 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70 mb-0.5 tracking-widest">Available Balance</p>
                <p className="text-xl font-black text-teal-600">
                  {getCurrencySymbol('USD', currencies)}{parseFloat(program?.totalEarnings || '0').toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-teal-100 dark:bg-teal-900/30 rounded-xl">
                <DollarSign className="w-6 h-6 text-teal-600" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount to Convert</Label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="h-14 rounded-2xl pl-12 text-lg font-bold border-2 focus-visible:ring-teal-500 focus-visible:border-teal-500"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">
                    $
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Choose Theme</Label>
                <Select
                  value={formData.theme}
                  onValueChange={(value) => setFormData({ ...formData, theme: value })}
                >
                  <SelectTrigger className="h-14 rounded-2xl border-2 text-sm font-semibold">
                    <SelectValue placeholder="Select a theme" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {themes.map((theme) => (
                      <SelectItem key={theme.value} value={theme.value}>
                        {theme.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-2">
              <Button
                className="w-full h-14 rounded-2xl bg-teal-600 hover:bg-teal-700 text-base font-bold shadow-lg shadow-teal-500/20 gap-2"
                onClick={handleRedeemSubmit}
                disabled={redeemMutation.isPending || !formData.amount}
              >
                {redeemMutation.isPending ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" />
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Convert to Gift Card
                  </>
                )}
              </Button>
              <p className="text-[10px] text-center mt-4 text-muted-foreground font-medium italic">
                * Gift cards are generated instantly and valid for 365 days.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
