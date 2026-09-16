import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Globe, Wifi, Calendar, Check, ArrowLeft, Star, ThumbsUp, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/contexts/TranslationContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ReviewForm from "@/components/ReviewForm";
import { trackPackageView } from "@/lib/analytics";
import type { Destination, Review } from "@shared/schema";

export default function PackageDetails() {
  const { t } = useTranslation();
  const { currency, currencies } = useCurrency();
  const { user } = useUser();
  const { toast } = useToast();
  const { slug } = useParams();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [reviewsPage, setReviewsPage] = useState(1);

  const getCurrencySymbol = (currencyCode: string) => {
    return currencies.find(c => c.code === currencyCode)?.symbol || "$";
  };

  const { data: pkg, isLoading} = useQuery<any>({
    queryKey: [`/api/unified-packages/slug/${slug}`, { currency }],
  });

  // Get reviews for this package
  const { data: reviewsData } = useQuery({
    queryKey: [`/api/packages/${pkg?.id}/reviews`, { rating: ratingFilter === "all" ? undefined : ratingFilter, page: reviewsPage }],
    enabled: !!pkg?.id,
  });

  // Get review statistics
  const { data: reviewStats } = useQuery({
    queryKey: [`/api/packages/${pkg?.id}/review-stats`],
    enabled: !!pkg?.id,
  });

  // Check if user has purchased this package
  const { data: userOrders } = useQuery({
    queryKey: ["/api/customer/orders"],
    enabled: !!user,
  });

  const hasPurchased = userOrders?.some((order: any) => 
    order.packageId === pkg?.id && order.status === "completed"
  );

  const hasReviewed = reviewsData?.reviews?.some((review: any) => 
    review.userId === user?.id
  );

  // Track package view
  useEffect(() => {
    if (pkg?.id) {
      trackPackageView(pkg.id, pkg.title);
    }
  }, [pkg?.id, pkg?.title]);

  // Mark review as helpful
  const helpfulMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      return apiRequest(`/api/reviews/${reviewId}/helpful`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: t("reviews.thanksForFeedback", "Thanks for your feedback!"),
      });
      queryClient.invalidateQueries({ queryKey: [`/api/packages/${pkg?.id}/reviews`] });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error", "Error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">{t('packageDetails.notFound', 'Package not found')}</h2>
          <Link href="/destinations">
            <Button>{t('packageDetails.browseDestinations', 'Browse Destinations')}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{pkg.title} - {pkg.destination?.name} eSIM | YourBrand</title>
        <meta name="description" content={`Get ${pkg.dataAmount} of data for ${pkg.validity} days in ${pkg.destination?.name}. Instant activation, starting at ${getCurrencySymbol(pkg.currency)}${pkg.price}.`} />
        <meta property="og:title" content={`${pkg.title} - ${pkg.destination?.name} eSIM | YourBrand`} />
        <meta property="og:description" content={`Get ${pkg.dataAmount} of data for ${pkg.validity} days in ${pkg.destination?.name}. Instant activation, starting at ${getCurrencySymbol(pkg.currency)}${pkg.price}.`} />
        <meta property="og:type" content="website" />
      </Helmet>
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link href="/destinations">
            <div className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors cursor-pointer" data-testid="link-back">
              <ArrowLeft className="h-4 w-4" />
              {t('packageDetails.backToDestinations', 'Back to Destinations')}
            </div>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Package Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-6xl">{pkg.destination?.flagEmoji || "🌍"}</span>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">{pkg.title}</h1>
                <p className="text-lg text-muted-foreground">{pkg.destination?.name}</p>
              </div>
            </div>
            {pkg.isUnlimited && (
              <Badge variant="secondary" className="text-sm">{t('packageDetails.unlimitedData', 'Unlimited Data')}</Badge>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Package Details */}
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('packageDetails.planDetails', 'Plan Details')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                      <Wifi className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{t('packageDetails.dataAmount', 'Data Amount')}</div>
                      <div className="text-sm text-muted-foreground">{pkg.dataAmount}</div>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{t('packageDetails.validity', 'Validity')}</div>
                      <div className="text-sm text-muted-foreground">{pkg.validity} {t('packageDetails.days', 'days')}</div>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                      <Globe className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{t('packageDetails.coverage', 'Coverage')}</div>
                      <div className="text-sm text-muted-foreground">
                        {pkg.type === "local" ? t('packageDetails.local', 'Local') : pkg.type === "regional" ? t('packageDetails.regional', 'Regional') : t('packageDetails.global', 'Global')}
                      </div>
                    </div>
                  </div>

                  {pkg.operator && (
                    <>
                      <Separator />
                      <div>
                        <div className="font-medium mb-1">{t('packageDetails.networkOperator', 'Network Operator')}</div>
                        <div className="text-sm text-muted-foreground">{pkg.operator}</div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('packageDetails.whatsIncluded', "What's Included")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{t('packageDetails.instantDelivery', 'Instant eSIM delivery via email')}</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{t('packageDetails.qrCode', 'QR code for easy installation')}</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{t('packageDetails.installationGuide', 'Step-by-step installation guide')}</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{t('packageDetails.support247', '24/7 customer support')}</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{t('packageDetails.autoActivation', 'Automatic activation at destination')}</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{t('packageDetails.topUpOptions', 'Top-up options available')}</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Purchase Card */}
            <div>
              <Card className="sticky top-24">
                <CardContent className="p-6">
                  <div className="mb-6">
                    <div className="text-sm text-muted-foreground mb-1">{t('packageDetails.totalPrice', 'Total Price')}</div>
                    <div className="text-4xl font-bold text-primary">{getCurrencySymbol(pkg.currency)}{pkg.price}</div>
                    <div className="text-sm text-muted-foreground">{pkg.currency}</div>
                  </div>

                  <Button
                    className="w-full mb-4"
                    size="lg"
                    onClick={() => setLocation(`/checkout/${pkg.slug}`)}
                    data-testid="button-buy-now"
                  >
                    {t('packageDetails.buyNow', 'Buy Now')}
                  </Button>

                  <div className="text-xs text-muted-foreground text-center">
                    {t('packageDetails.guaranteeText', 'Instant delivery • Secure payment • 7-day money-back guarantee')}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="mt-12">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold mb-2" data-testid="text-reviews-title">
                  {t("reviews.title", "Customer Reviews")}
                </h2>
                {reviewStats && reviewStats.total > 0 && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-5 w-5 ${
                              star <= Math.round(reviewStats.average)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-lg font-semibold" data-testid="text-average-rating">
                        {reviewStats.average}
                      </span>
                    </div>
                    <span className="text-muted-foreground" data-testid="text-review-count">
                      {t("reviews.basedOn", "Based on {{count}} reviews", { count: reviewStats.total })}
                    </span>
                  </div>
                )}
              </div>
              {user && hasPurchased && !hasReviewed && (
                <Button
                  onClick={() => setReviewFormOpen(true)}
                  data-testid="button-write-review"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {t("reviews.writeReview", "Write a Review")}
                </Button>
              )}
            </div>

            {/* Rating Distribution */}
            {reviewStats && reviewStats.total > 0 && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>{t("reviews.ratingDistribution", "Rating Distribution")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const count = reviewStats.distribution[rating] || 0;
                    const percentage = reviewStats.total > 0 ? (count / reviewStats.total) * 100 : 0;
                    return (
                      <div key={rating} className="flex items-center gap-4">
                        <button
                          className="flex items-center gap-2 min-w-20 hover-elevate active-elevate-2"
                          onClick={() => setRatingFilter(rating.toString())}
                          data-testid={`button-filter-${rating}-stars`}
                        >
                          <span className="text-sm font-medium">{rating}</span>
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        </button>
                        <Progress value={percentage} className="flex-1" />
                        <span className="text-sm text-muted-foreground min-w-16 text-right">
                          {count} ({Math.round(percentage)}%)
                        </span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Filter Tabs */}
            {reviewStats && reviewStats.total > 0 && (
              <div className="mb-6">
                <Tabs value={ratingFilter} onValueChange={setRatingFilter}>
                  <TabsList>
                    <TabsTrigger value="all" data-testid="tab-all-ratings">
                      {t("reviews.allRatings", "All Ratings")}
                    </TabsTrigger>
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <TabsTrigger key={rating} value={rating.toString()} data-testid={`tab-${rating}-stars`}>
                        {rating} <Star className="h-3 w-3 ml-1 fill-yellow-400 text-yellow-400" />
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            )}

            {/* Reviews List */}
            {reviewsData && reviewsData.reviews && reviewsData.reviews.length > 0 ? (
              <div className="space-y-6">
                {reviewsData.reviews.map((review: any) => (
                  <Card key={review.id} data-testid={`card-review-${review.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-4 w-4 ${
                                    star <= review.rating
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-muted-foreground"
                                  }`}
                                />
                              ))}
                            </div>
                            {review.isVerifiedPurchase && (
                              <Badge variant="secondary" data-testid="badge-verified-purchase">
                                {t("reviews.verifiedPurchase", "Verified Purchase")}
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-semibold text-lg mb-1" data-testid={`text-review-title-${review.id}`}>
                            {review.title}
                          </h3>
                          <p className="text-sm text-muted-foreground" data-testid={`text-review-author-${review.id}`}>
                            {review.user?.name || "Anonymous"} • {format(new Date(review.createdAt), "MMM dd, yyyy")}
                          </p>
                        </div>
                      </div>

                      <p className="text-sm mb-4" data-testid={`text-review-comment-${review.id}`}>
                        {review.comment}
                      </p>

                      {review.pros && review.pros.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm font-semibold text-green-600 mb-2">
                            {t("reviews.pros", "Pros")}:
                          </p>
                          <ul className="list-disc list-inside space-y-1">
                            {review.pros.map((pro: string, index: number) => (
                              <li key={index} className="text-sm text-muted-foreground">
                                {pro}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {review.cons && review.cons.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm font-semibold text-red-600 mb-2">
                            {t("reviews.cons", "Cons")}:
                          </p>
                          <ul className="list-disc list-inside space-y-1">
                            {review.cons.map((con: string, index: number) => (
                              <li key={index} className="text-sm text-muted-foreground">
                                {con}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex items-center gap-4 pt-4 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => user ? helpfulMutation.mutate(review.id) : toast({
                            title: t("common.error", "Error"),
                            description: "Please sign in to mark reviews as helpful",
                            variant: "destructive",
                          })}
                          disabled={!user || helpfulMutation.isPending}
                          data-testid={`button-helpful-${review.id}`}
                        >
                          <ThumbsUp className="h-4 w-4 mr-2" />
                          {t("reviews.helpful", "Helpful")} ({review.helpfulCount})
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Load More Button */}
                {reviewsData.totalPages > reviewsPage && (
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      onClick={() => setReviewsPage(reviewsPage + 1)}
                      data-testid="button-load-more"
                    >
                      {t("reviews.loadMore", "Load More Reviews")}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2" data-testid="text-no-reviews">
                    {t("reviews.noReviews", "No reviews yet")}
                  </h3>
                  <p className="text-muted-foreground mb-4" data-testid="text-no-reviews-desc">
                    {t("reviews.noReviewsDesc", "Be the first to review this package!")}
                  </p>
                  {user && hasPurchased && (
                    <Button onClick={() => setReviewFormOpen(true)} data-testid="button-be-first-review">
                      {t("reviews.writeReview", "Write a Review")}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Review Form Modal */}
      {pkg && (
        <ReviewForm
          packageId={pkg.id}
          open={reviewFormOpen}
          onOpenChange={setReviewFormOpen}
        />
      )}
    </div>
  );
}
