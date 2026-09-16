import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import {
  Gift,
  Check,
  Loader2,
  Send,
  CreditCard,
  Sparkles,
  Mail,
  Globe,
  Clock,
  Wallet,
  ChevronRight,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { SiPaypal, SiApplepay, SiGooglepay } from 'react-icons/si';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import PaymentGatewayRenderer from '@/components/payments/PaymentGatewayRenderer';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { useSettingByKey } from '@/hooks/useSettings';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTranslation } from '@/contexts/TranslationContext';



function GiftCardPreview({
  amount,
  recipientName,
  message,
}: {
  amount: number;
  recipientName?: string;
  message?: string;
}) {
  const siteName = useSettingByKey('platform_name');
  const { currency, setCurrency, currencies } = useCurrency();

  const enabledCurrencies = currencies.filter((c) => c.isEnabled);
  const currentCurrency =
    enabledCurrencies.find((c) => c.code === currency) || enabledCurrencies[0] || { symbol: '$', code: 'USD' };

  const symbol = currentCurrency?.symbol || '$';
  return (
    <div className="relative w-full max-w-sm mx-auto">
      <div className="relative bg-primary-gradient rounded-2xl p-6 shadow-xl overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <Globe className="h-6 w-6 text-white" />
              <span className="font-bold text-white text-lg">{siteName}</span>
            </div>
            <Badge className="bg-white/20 text-white border-0 hover:bg-white/30">Gift Card</Badge>
          </div>

          <div className="mb-6">
            <p className="text-white/80 text-sm mb-1">Value</p>
            <p className="text-4xl font-bold text-white">
              {symbol}
              {amount || 0}
            </p>
          </div>

          {recipientName && (
            <div className="mb-4">
              <p className="text-white/80 text-sm">For</p>
              <p className="text-white font-medium">{recipientName}</p>
            </div>
          )}

          {message && (
            <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
              <p className="text-white/90 text-sm italic">"{message}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



export default function GiftCards() {
  const { toast } = useToast();
  const { isAuthenticated, user } = useUser();
  const [, setLocation] = useLocation();

  const amounts = [25, 50, 100, 200];

  const [selectedAmount, setSelectedAmount] = useState<number | null>(50);
  const [customAmount, setCustomAmount] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [message, setMessage] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [gateways, setGateways] = useState<any[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<any>(null);
  const [initResponse, setInitResponse] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { currency, setCurrency, currencies } = useCurrency();

  const enabledCurrencies = currencies.filter((c) => c.isEnabled);
  const currentCurrency =
    enabledCurrencies.find((c) => c.code === currency) || enabledCurrencies[0];

  const symbol = currentCurrency?.symbol;
  const {t} = useTranslation();

  useEffect(() => {
    apiRequest('GET', `/api/payments/gateways?currency=${currency}`)
      .then((res) => res.json())
      .then((data) => {
        setGateways(data.data || []);
        if (data.data?.length === 1) setSelectedGateway(data.data[0]);
      });
  }, [currency]);

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to purchase a gift card',
        variant: 'destructive',
      });
      setLocation('/login');
      return;
    }

    const amount = selectedAmount || parseFloat(customAmount);

    if (!amount || amount < 10) {
      toast({
        title: 'Invalid Amount',
        description: `Gift card amount must be at least ${symbol}10`,
        variant: 'destructive',
      });
      return;
    }

    if (!selectedGateway) {
      toast({
        title: 'Select payment method',
        description: 'Please choose a payment gateway',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await apiRequest('POST', '/api/payments/init-gift-card', {
        amount: amount,
        currency: currentCurrency.code,
        recipientName,
        recipientEmail,
        message,
        gatewayId: selectedGateway.id,
        email: user?.email || recipientEmail,
        name: user?.name,
      });

      const resData = await response.json();

      if (!resData.success) {
        throw new Error(resData.message || 'Failed to initialize payment');
      }

      if (selectedGateway.provider === 'powertranz' && resData.powertranz?.method === 'hpp') {
        setInitResponse({
          provider: 'powertranz',
          orderId: resData.powertranz.orderId,
          redirectData: resData.powertranz.redirectData,
          spiToken: resData.powertranz.spiToken,
        });
      } else {
        setInitResponse(resData.payment);
      }
    } catch (error: any) {
      toast({
        title: 'Purchase Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };



  const currentAmount = selectedAmount || parseFloat(customAmount) || 0;
  const siteName = useSettingByKey('platform_name');

  return (
    <div className="min-h-screen bg-background flex flex-col dark:bg-dark transition-colors duration-300 dark:text-white">
      <Helmet>
        <title>{t("website.giftcards.metaTitle", "Gift Cards - Give the Gift of Connectivity")} | {siteName} </title>
        <meta
          name="description"
          content={t(`website.giftcards.metaDescription`, `Give the gift of global connectivity with ${siteName} gift cards. Perfect for travelers and remote workers.`, { siteName })}
        />
      </Helmet>

      {/* <SiteHeader /> */}

      <main className="flex-1   ">
        <div className="relative bg-gradient-to-br from-teal-500/10 via-teal-400/5 to-background py-16 md:py-24 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
          </div>

          <div className="container mx-auto px-4 relative z-10 mt-[40px]">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-primary-light text-white px-4 py-2 rounded-full mb-6">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-medium">{t("website.giftcards.perfectGift", "Perfect Gift for Travelers")}</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                 {t("website.giftcards.title1", "Give the Gift of")}{" "} <span className="text-primary">{t("website.giftcards.title2", "Connectivity")}</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                
                {t("website.giftcards.subtitle", `Send an ${siteName} gift card to friends and family. Perfect for travelers, remote
                workers, and anyone who needs to stay connected worldwide.`, { siteName })}
              </p>

              {isAuthenticated && (
                <Button
                  variant="outline"
                  className="rounded-full px-6 border-primary/30 hover:bg-primary/5"
                  onClick={() => setLocation('/account/gift-cards')}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  {t("website.giftcards.history", "View Gift Card History")}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {
              [
 {
   icon: Gift,
   label: t("website.giftcards.instantDelivery", "Instant Delivery"),
   desc: t("website.giftcards.emailDelivery", "mail delivery in seconds")
 },
 {
   icon: Globe,
   label: t("website.giftcards.countries", "200+ Countries"),
   desc: t("website.giftcards.worldwide", "Works worldwide")
 },
 {
   icon: Clock,
   label: t("website.giftcards.neverExpires", "Never Expires"),
   desc: t("website.giftcards.useAnytime", "Use anytime")
 },
 {
   icon: Wallet,
   label: t("website.giftcards.anyAmount", "Any Amount"),
   desc: t("website.giftcards.range", "From $10 to $500")
 }
].map((feature, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center text-center p-4 rounded-xl bg-background border hover-elevate"
                >
                  <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center mb-3">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <p className="font-semibold text-sm">{feature.label}</p>
                  <p className="text-xs text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <div className="max-w-5xl mx-auto">
            <div className="space-y-8">
              {!initResponse ? (
                <div className="grid lg:grid-cols-2 gap-8">
                  <div className="order-2 lg:order-1">
                    <Card>
                      <CardHeader>
                        <CardTitle>{t("website.giftcards.purchaseTitle", "Purchase Gift Card")}</CardTitle>
                        <CardDescription>
                          {t("website.giftcards.purchaseDesc", "Select an amount and personalize your gift")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div>
                          <Label className="mb-3 block"> {t("website.giftcards.selectAmount", "Select Amount")}</Label>
                          <div className="grid grid-cols-2 gap-3">
                            {amounts.map((amount) => (
                              <Button
                                key={amount}
                                variant="outline"
                                className={`h-14 text-lg font-semibold ${selectedAmount === amount ? 'bg-primary-gradient text-white border-primary-dark hover:bg-primary-dark' : ''}`}
                                onClick={() => {
                                  setSelectedAmount(amount);
                                  setCustomAmount('');
                                }}
                                data-testid={`button-amount-${amount}`}
                              >
                                {symbol}
                                {amount}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="customAmount">
                            {t("website.giftcards.customAmount", "Or Enter Custom Amount")} ({symbol}10 - {symbol}500) 
                          </Label>
                          <Input
                            id="customAmount"
                            type="number"
                            min="10"
                            max="500"
                            placeholder="Enter amount"
                            value={customAmount}
                            onChange={(e) => {
                              setCustomAmount(e.target.value);
                              setSelectedAmount(null);
                            }}
                            data-testid="input-custom-amount"
                          />
                        </div>

                        <Separator />

                        <div className="space-y-2">
                          <Label htmlFor="recipientName">{t("website.giftcards.recipientName", "Recipient Name")}</Label>
                          <Input
                            id="recipientName"
                            placeholder="John Doe"
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            data-testid="input-recipient-name"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="recipientEmail">{t("website.giftcards.recipientEmail", "Recipient Email")}</Label>
                          <Input
                            id="recipientEmail"
                            type="email"
                            placeholder="friend@example.com"
                            value={recipientEmail}
                            onChange={(e) => setRecipientEmail(e.target.value)}
                            data-testid="input-recipient-email"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="message"> {t("website.giftcards.personalMessage", "Personal Message (Optional)")}</Label>
                          <Textarea
                            id="message"
                            placeholder="Happy travels! Stay connected wherever you go..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={3}
                            data-testid="input-message"
                          />
                        </div>

                        <Separator />

                        <div className="space-y-4">
                          <Label className="text-base font-semibold">{t("website.giftcards.paymentMethod", "Payment Method")}</Label>
                          <RadioGroup
                            value={selectedGateway?.id}
                            onValueChange={(val) => setSelectedGateway(gateways.find(g => g.id === val))}
                            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                          >
                            {gateways.map((gateway) => (
                              <div
                                key={gateway.id}
                                className={`relative flex items-center justify-between rounded-xl border-2 p-4 cursor-pointer transition-all hover:border-primary/50 ${selectedGateway?.id === gateway.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-muted bg-card'}`}
                                onClick={() => setSelectedGateway(gateway)}
                              >
                                <div className="flex items-center gap-3">
                                  <RadioGroupItem value={gateway.id} id={gateway.id} className="sr-only" />
                                  <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center border shadow-sm">
                                    {gateway.provider === 'stripe' && <CreditCard className="h-5 w-5 text-[#6366f1]" />}
                                    {gateway.provider === 'paypal' && <SiPaypal className="h-5 w-5 text-[#00457C]" />}
                                    {gateway.provider === 'razorpay' && <div className="font-bold text-xs text-primary">RZP</div>}
                                    {gateway.provider === 'powertranz' && <CreditCard className="h-5 w-5 text-gray-600" />}
                                    {!['stripe', 'paypal', 'razorpay', 'powertranz'].includes(gateway.provider) && <Wallet className="h-5 w-5" />}
                                  </div>
                                  <div>
                                    <p className="font-semibold capitalize">{gateway.provider}</p>
                                    <p className="text-xs text-muted-foreground">Secure Payment</p>
                                  </div>
                                </div>
                                {selectedGateway?.id === gateway.id && (
                                  <CheckCircle2 className="h-5 w-5 text-primary" />
                                )}
                              </div>
                            ))}
                          </RadioGroup>
                        </div>

                        <Button
                          className="w-full"
                          size="lg"
                          onClick={handlePurchase}
                          disabled={!selectedAmount && !customAmount || isProcessing}
                          data-testid="button-purchase-gift-card"
                        >
                          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                           {t("website.giftcards.continuePayment", "Continue to Payment")} - {symbol}
                          {currentAmount}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="order-1 lg:order-2 space-y-6">
                    <div className="lg:sticky lg:top-24">
                      <h3 className="text-lg font-semibold mb-4 text-center lg:text-left">
                         {t("website.giftcards.preview", "Preview")}
                      </h3>
                      <GiftCardPreview
                        amount={currentAmount}
                        recipientName={recipientName || undefined}
                        message={message || undefined}
                      />

                      <Card className="mt-6">
                        <CardHeader>
                          <CardTitle className="text-base">{t("website.giftcards.howItWorks", "How It Works")}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {
                          [
 { step:1, text: t("website.giftcards.step1", "Choose an amount or enter a custom value") },
 { step:2, text: t("website.giftcards.step2", "Add recipient details and a message") },
 { step:3, text: t("website.giftcards.step3", "Complete secure payment") },
 { step:4, text: t("website.giftcards.step4", "Recipient gets the gift card instantly via email") },
 { step:5, text: t("website.giftcards.step5", "They can use it for any eSIM package") }
].map((item) => (
                            <div key={item.step} className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold">
                                {item.step}
                              </div>
                              <p className="text-sm text-muted-foreground">{item.text}</p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              ) : (
                <Card className="max-w-lg mx-auto">
                  <CardHeader>
                    <CardTitle>{t("website.giftcards.completePurchase", "Complete Your Purchase")}</CardTitle>
                    <CardDescription>
                      {symbol}
                      {selectedAmount || customAmount} Gift Card
                      {recipientEmail && ` for ${recipientEmail}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PaymentGatewayRenderer
                      initData={initResponse}
                      email={user?.email || recipientEmail}
                    />
                    <Button
                      variant="ghost"
                      className="w-full mt-4"
                      onClick={() => setInitResponse(null)}
                    >
                       {t("website.giftcards.back", "Back")}
                    </Button>
                  </CardContent>
                </Card>
              )}

            </div>
          </div>
        </div>

        <div className="bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-center mb-8">{t("website.giftcards.faqTitle", "Frequently Asked Questions")}</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {
                [
 {
   q: t("website.giftcards.faq1q", "How are gift cards delivered?"),
   a: t("website.giftcards.faq1a", "Gift cards are delivered instantly via email to the recipient's email address you provide.")
 },
 {
   q: t("website.giftcards.faq2q", "Do gift cards expire?"),
   a: t("website.giftcards.faq2a", `No, ${siteName} gift cards never expire. The recipient can use them anytime.`, { siteName })
 },
 {
   q: t("website.giftcards.faq3q", "Can I use a gift card for multiple purchases?"),
   a: t("website.giftcards.faq3a", "Yes! The gift card balance can be used across multiple purchases until the balance is depleted.")
 },
 {
   q: t("website.giftcards.faq4q", "What if my purchase exceeds the gift card balance?"),
   a: t("website.giftcards.faq4a", "You can pay the remaining amount using any of our supported payment methods.")
 }
].map((faq, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-base">{faq.q}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{faq.a}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* <SiteFooter /> */}
    </div>
  );
}
