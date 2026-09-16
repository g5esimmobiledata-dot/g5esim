import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import {
  Gift,
  Check,
  Loader2,
  Wallet,
  Copy,
  CheckCircle2,
} from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { apiRequest } from '@/lib/queryClient';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AccountGiftCards() {
  const { toast } = useToast();
  const { isAuthenticated, user } = useUser();
  const { t } = useTranslation();

  const [redemptionCode, setRedemptionCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { currency, currencies } = useCurrency();
  const enabledCurrencies = currencies.filter((c) => c.isEnabled);
  const currentCurrency = enabledCurrencies.find((c) => c.code === currency) || enabledCurrencies[0];
  const symbol = currentCurrency?.symbol || '$';

  const { data: myCards, isLoading, refetch } = useQuery({
    queryKey: ['/api/gift-cards/my-cards'],
    enabled: isAuthenticated,
  });

  const cards = (myCards as any)?.data || (Array.isArray(myCards) ? myCards : []);

  const userId = user?.id
  const userEmail = user?.email

  const purchasedCards = cards.filter(
    (c: any) => c.purchasedBy === userId
  )

  const receivedCards = cards.filter(
    (c: any) =>
      c.redeemedBy === userId ||
      c.recipientEmail?.includes(userEmail)
  )

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleRedeem = async () => {
    if (!redemptionCode) {
      toast({
        title: 'Code Required',
        description: 'Please enter a gift card code',
        variant: 'destructive',
      });
      return;
    }

    setIsRedeeming(true);

    try {
      const response: any = await apiRequest('POST', '/api/gift-cards/apply', {
        code: redemptionCode,
      });

      toast({
        title: 'Gift Card Redeemed!',
        description: `${symbol}${response.amount} has been added to your account.`,
      });

      setRedemptionCode('');
      refetch();
    } catch (error: any) {
      toast({
        title: 'Redemption Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsRedeeming(false);
    }
  };


  const renderCards = (list: any[], type: "purchase" | "receive") => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (list.length === 0) {
      return (
        <div className="text-center py-12">
          <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-foreground">
            No Gift Cards
          </h3>
          <p className="text-muted-foreground mt-1">
            No cards available in this category.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {list.map((card: any) => (
          <div
            key={card.id}
            className="flex items-center justify-between p-4 rounded-xl border bg-card hover-elevate transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary-gradient flex items-center justify-center shadow-inner">
                <Gift className="h-6 w-6 text-white" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-lg text-foreground">
                    {symbol}
                    {card.amount}
                  </p>

                  <Badge
                    variant={card.status === "active" ? "default" : "secondary"}
                    className={
                      card.status === "active"
                        ? "bg-green-500 hover:bg-green-600"
                        : ""
                    }
                  >
                    {card.status}
                  </Badge>
                </div>

                {/* <p className="text-sm text-muted-foreground mt-0.5">
                Balance remaining: {symbol}
                {card.balance}
              </p> */}

                {type === "purchase" ? (
                  <div className="text-sm text-muted-foreground">
                    Sent to:
                    <span className="font-medium text-foreground ml-1">
                      {card.recipientName || "Self"}
                    </span>
                    {card.recipientEmail && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({card.recipientEmail})
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Sent by:
                    <span className="font-medium text-foreground ml-1">
                      {card.purchaser?.name || card.purchaser?.email || "Unknown"}
                    </span>
                    {card.purchaser?.email && card.purchaser?.name && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({card.purchaser.email})
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono text-muted-foreground">
                {card.code}
              </code>

              <Button
                size="icon"
                variant="ghost"
                onClick={() => copyCode(card.code)}
                title="Copy Code"
              >
                {copiedCode === card.code ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      <Helmet>
        <title>{t('website.account.giftcards.title', 'Gift Cards')} - eSIM Connect</title>
      </Helmet>

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {t('website.account.giftcards.title', 'Gift Cards')}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t('website.account.giftcards.desc', 'Manage your gift cards or redeem new codes')}
        </p>
      </div>

      <div className="gap-8">


        <div className="">
          {/* History */}
          {/* <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                History
              </CardTitle>
              <CardDescription>
                Your purchased and received gift cardss
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : cards.length === 0 ? (
                <div className="text-center py-12">
                  <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-foreground">No Gift Cards Yet</h3>
                  <p className="text-muted-foreground mt-1">
                    You haven't bought or received any gift cards yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cards.map((card: any) => (
                    <div
                      key={card.id}
                      className="flex items-center justify-between p-4 rounded-xl border bg-card hover-elevate transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary-gradient flex items-center justify-center shadow-inner">
                          <Gift className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-lg text-foreground">
                              {symbol}
                              {card.amount}
                            </p>
                            <Badge
                              variant={card.status === 'active' ? 'default' : 'secondary'}
                              className={card.status === 'active' ? 'bg-green-500 hover:bg-green-600' : ''}
                            >
                              {card.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            Balance remaining: {symbol}
                            {card.balance}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono text-muted-foreground">
                          {card.code}
                        </code>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copyCode(card.code)}
                          title="Copy Code"
                        >
                          {copiedCode === card.code ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card> */}


          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                History
              </CardTitle>
              <CardDescription>
                Your purchased and received gift cards
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Tabs defaultValue="purchase" className="w-full">

                <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted p-1 rounded-lg">

                  <TabsTrigger value="purchase">
                    Purchased ({purchasedCards.length})
                  </TabsTrigger>

                  <TabsTrigger value="receive">
                    Received ({receivedCards.length})
                  </TabsTrigger>

                </TabsList>

                <TabsContent value="purchase">
                  {renderCards(purchasedCards, "purchase")}
                </TabsContent>

                <TabsContent value="receive">
                  {renderCards(receivedCards, "receive")}
                </TabsContent>

              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div >
  );
}
