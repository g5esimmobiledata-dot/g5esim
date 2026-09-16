import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  CheckCircle,
  Clock,
  Filter,
  MessageSquare,
  Plus,
  Search,
  Star,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/contexts/TranslationContext";

interface ReviewStats {
  total: number;
  pending: number;
  approved: number;
  averageRating: number;
  recent: number;
}

interface Review {
  id: string;
  packageId: string;
  userId: string;
  rating: number;
  title: string;
  comment: string;
  pros: string[] | null;
  cons: string[] | null;
  isApproved: boolean;
  isVerifiedPurchase: boolean;
  createdAt: string;
  package?: {
    id: string;
    title: string;
    destination?: { flagEmoji: string };
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

interface ReviewsResponse {
  reviews: Review[];
  totalPages: number;
  total: number;
  page: number;
}

const panelClass = "overflow-hidden rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm";
const statCardClass = "rounded-md border border-slate-200 bg-white p-6 text-slate-950 shadow-sm";
const primaryButtonClass = "border-[#58cbbb] bg-[#58cbbb] text-slate-950 hover:bg-[#48bdae]";
const lightButtonClass = "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950";
const dangerButtonClass = "border-red-500 bg-red-500 text-white hover:bg-red-600";
const darkFieldClass =
  "border-[#24445f] bg-[#071b35] text-white placeholder:text-slate-400 focus-visible:ring-teal-500";
const darkSelectClass = `${darkFieldClass} [&>span]:text-white data-[placeholder]:text-slate-400`;
const selectContentClass = "border-slate-200 bg-white text-slate-900";
const selectItemClass = "focus:bg-teal-50 focus:text-slate-950";
const tabListClass = "h-auto rounded-md border border-slate-200 bg-white p-1 text-slate-700";
const tabTriggerClass =
  "rounded-md px-4 py-2 text-sm data-[state=active]:bg-[#58cbbb] data-[state=active]:text-slate-950";

function StatCard({
  title,
  value,
  icon: Icon,
  accent = "teal",
}: {
  title: string;
  value: string | number;
  icon: typeof MessageSquare;
  accent?: "teal" | "amber" | "yellow" | "emerald";
}) {
  const iconClass = {
    teal: "bg-[#58cbbb] text-slate-950",
    amber: "bg-amber-100 text-amber-700",
    yellow: "bg-yellow-100 text-yellow-700",
    emerald: "bg-emerald-100 text-emerald-700",
  }[accent];

  return (
    <Card className={statCardClass}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-teal-700">{title}</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-md ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

export default function AdminReviews() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [deleteReviewId, setDeleteReviewId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    packageId: "",
    userId: "",
    rating: "5",
    title: "",
    comment: "",
  });

  const { data: stats } = useQuery<ReviewStats>({
    queryKey: ["/api/admin/reviews/stats"],
  });

  const { data: reviewsData, isLoading } = useQuery<ReviewsResponse>({
    queryKey: [
      "/api/admin/reviews",
      { status: statusFilter, rating: ratingFilter, search: searchQuery, sortBy, page },
    ],
  });

  const approveMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      return apiRequest("POST", `/api/admin/reviews/${reviewId}/approve`, {});
    },
    onSuccess: () => {
      toast({ title: t("reviews.admin.approveSuccess", "Review approved successfully") });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews/stats"] });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error", "Error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      return apiRequest("DELETE", `/api/admin/reviews/${reviewId}`, {});
    },
    onSuccess: () => {
      toast({ title: t("reviews.admin.deleteSuccess", "Review deleted successfully") });
      setDeleteReviewId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews/stats"] });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error", "Error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: packages = [] } = useQuery({
    queryKey: ["/api/unified-packages"],
    select: (res: any) => res?.data?.data ?? [],
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/admin/customers"],
    queryFn: () => apiRequest("GET", "/api/admin/customers"),
    select: (res: any) => res?.data?.data ?? [],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/admin/reviews", data);
    },
    onSuccess: () => {
      toast({
        title: "Review Created",
        description: "Review created successfully",
      });
      setCreateDialogOpen(false);
      setReviewForm({
        packageId: "",
        userId: "",
        rating: "5",
        title: "",
        comment: "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews/stats"] });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error", "Error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleApprove = (reviewId: string) => {
    approveMutation.mutate(reviewId);
  };

  const handleDelete = (reviewId: string) => {
    setDeleteReviewId(reviewId);
  };

  const confirmDelete = () => {
    if (deleteReviewId) {
      deleteMutation.mutate(deleteReviewId);
    }
  };

  const handleCreateReview = () => {
    createMutation.mutate({
      ...reviewForm,
      rating: parseInt(reviewForm.rating),
      isApproved: true,
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl" data-testid="text-admin-reviews-title">
            {t("adminPanel.admin.reviews.title", "Review Management")}
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            {t("adminPanel.admin.reviews.description", "Manage customer reviews and maintain quality standards")}
          </p>
        </div>
        <Button className={`${primaryButtonClass} gap-2`} onClick={() => setCreateDialogOpen(true)} data-testid="button-create-review">
          <Plus className="h-4 w-4" />
          {t("adminPanel.admin.reviews.addReview", "Add Review")}
        </Button>
      </div>

      {stats && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title={t("adminPanel.admin.reviews.totalReviews", "Total Reviews")} value={stats.total} icon={MessageSquare} />
          <StatCard title={t("adminPanel.admin.reviews.pendingApproval", "Pending Approval")} value={stats.pending} icon={Clock} accent="amber" />
          <StatCard title={t("adminPanel.admin.reviews.averageRating", "Platform Average")} value={stats.averageRating.toFixed(1)} icon={Star} accent="yellow" />
          <StatCard title={t("adminPanel.admin.reviews.recentReviews", "Recent (7 days)")} value={stats.recent} icon={TrendingUp} accent="emerald" />
        </div>
      )}

      <Card className={panelClass}>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder={t("adminPanel.admin.reviews.searchPlaceholder", "Search by package name or customer email...")}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className={`${darkFieldClass} pl-10`}
                  data-testid="input-search"
                />
              </div>
            </div>
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className={`${darkSelectClass} md:w-[180px]`} data-testid="select-rating-filter">
                <SelectValue placeholder={t("adminPanel.admin.reviews.filterRating", "Filter by rating")} />
              </SelectTrigger>
              <SelectContent className={selectContentClass}>
                <SelectItem className={selectItemClass} value="all">{t("adminPanel.admin.reviews.allRatings", "All Ratings")}</SelectItem>
                <SelectItem className={selectItemClass} value="5">{t("adminPanel.admin.reviews.fiveStars", "5 Stars")}</SelectItem>
                <SelectItem className={selectItemClass} value="4">4 Stars</SelectItem>
                <SelectItem className={selectItemClass} value="3">{t("adminPanel.admin.reviews.threeStars", "3 Stars")}</SelectItem>
                <SelectItem className={selectItemClass} value="2">{t("adminPanel.admin.reviews.twoStars", "2 Stars")}</SelectItem>
                <SelectItem className={selectItemClass} value="1">{t("adminPanel.admin.reviews.oneStar", "1 Star")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className={`${darkSelectClass} md:w-[180px]`} data-testid="select-sort">
                <SelectValue placeholder={t("adminPanel.admin.reviews.sortBy", "Sort by")} />
              </SelectTrigger>
              <SelectContent className={selectContentClass}>
                <SelectItem className={selectItemClass} value="newest">{t("adminPanel.admin.reviews.sortNewest", "Newest First")}</SelectItem>
                <SelectItem className={selectItemClass} value="oldest">{t("adminPanel.admin.reviews.sortOldest", "Oldest First")}</SelectItem>
                <SelectItem className={selectItemClass} value="rating-high">{t("adminPanel.admin.reviews.sortHighRating", "Highest Rating")}</SelectItem>
                <SelectItem className={selectItemClass} value="rating-low">{t("adminPanel.admin.reviews.sortLowRating", "Lowest Rating")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className={tabListClass}>
          <TabsTrigger className={tabTriggerClass} value="pending" data-testid="tab-pending">
            {t("adminPanel.admin.reviews.pendingApproval", "Pending Approval")}
            {stats && stats.pending > 0 && (
              <Badge variant="destructive" className="ml-2">
                {stats.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger className={tabTriggerClass} value="approved" data-testid="tab-approved">
            {t("adminPanel.admin.reviews.approvedTab", "Approved")}
          </TabsTrigger>
          <TabsTrigger className={tabTriggerClass} value="all" data-testid="tab-all">
            {t("adminPanel.admin.reviews.allTab", "All Reviews")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#58cbbb]" />
            </div>
          ) : reviewsData && reviewsData.reviews && reviewsData.reviews.length > 0 ? (
            <div className="space-y-4">
              {reviewsData.reviews.map((review) => (
                <Card className={panelClass} key={review.id} data-testid={`card-review-${review.id}`}>
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-6 md:flex-row">
                      {review.package && (
                        <div className="shrink-0">
                          <div className="flex h-24 w-24 items-center justify-center rounded-md bg-slate-100 text-3xl text-slate-500">
                            {review.package.destination?.flagEmoji || <Filter className="h-8 w-8" />}
                          </div>
                        </div>
                      )}

                      <div className="flex-1">
                        <div className="mb-2 flex items-start justify-between">
                          <div>
                            <h3 className="mb-1 text-lg font-semibold text-slate-950" data-testid={`text-package-title-${review.id}`}>
                              {review.package?.title || "Package"}
                            </h3>
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <div className="flex items-center">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-4 w-4 ${
                                      star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-slate-300"
                                    }`}
                                  />
                                ))}
                              </div>
                              {review.isVerifiedPurchase && (
                                <Badge className="bg-slate-100 text-slate-700" variant="secondary" data-testid="badge-verified">
                                  {t("adminPanel.admin.reviews.verifiedPurchas", "Verified Purchase")}
                                </Badge>
                              )}
                              {review.isApproved && (
                                <Badge className="bg-emerald-50 text-emerald-700" variant="default" data-testid="badge-approved">
                                  {t("adminPanel.admin.reviews.approve", "Approved")}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <p className="mb-2 text-sm text-slate-500">
                          <span className="font-medium text-slate-700" data-testid={`text-customer-name-${review.id}`}>
                            {review.user?.name || "Anonymous"}
                          </span>{" "}
                          ({review.user?.email}) - {format(new Date(review.createdAt), "MMM dd, yyyy")}
                        </p>

                        <h4 className="mb-2 font-semibold text-slate-950" data-testid={`text-review-title-${review.id}`}>
                          {review.title}
                        </h4>
                        <p className="mb-4 line-clamp-3 text-sm text-slate-700" data-testid={`text-review-comment-${review.id}`}>
                          {review.comment}
                        </p>

                        {(review.pros?.length || review.cons?.length) && (
                          <div className="mb-4 grid gap-4 md:grid-cols-2">
                            {review.pros && review.pros.length > 0 && (
                              <div>
                                <p className="mb-1 text-sm font-semibold text-green-600">
                                  {t("adminPanel.admin.reviews.pros", "Pros")}:
                                </p>
                                <ul className="list-inside list-disc text-sm text-slate-500">
                                  {review.pros.slice(0, 2).map((pro, index) => (
                                    <li key={index}>{pro}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {review.cons && review.cons.length > 0 && (
                              <div>
                                <p className="mb-1 text-sm font-semibold text-red-600">Cons:</p>
                                <ul className="list-inside list-disc text-sm text-slate-500">
                                  {review.cons.slice(0, 2).map((con, index) => (
                                    <li key={index}>{con}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2">
                          {!review.isApproved && (
                            <Button
                              className={`${primaryButtonClass} gap-2`}
                              size="sm"
                              onClick={() => handleApprove(review.id)}
                              disabled={approveMutation.isPending}
                              data-testid={`button-approve-${review.id}`}
                            >
                              <CheckCircle className="h-4 w-4" />
                              {t("adminPanel.admin.reviews.approve", "Approve")}
                            </Button>
                          )}
                          <Button
                            className={`${dangerButtonClass} gap-2`}
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(review.id)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-${review.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                            {t("adminPanel.admin.reviews.delete", "Delete")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {reviewsData.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-4">
                  <Button className={lightButtonClass} variant="outline" onClick={() => setPage(page - 1)} disabled={page === 1} data-testid="button-prev-page">
                    Previous
                  </Button>
                  <span className="text-sm text-slate-300">
                    Page {page} of {reviewsData.totalPages}
                  </span>
                  <Button className={lightButtonClass} variant="outline" onClick={() => setPage(page + 1)} disabled={page >= reviewsData.totalPages} data-testid="button-next-page">
                    Next
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Card className={panelClass}>
              <CardContent className="p-12 text-center">
                <MessageSquare className="mx-auto mb-4 h-12 w-12 text-slate-400" />
                <h3 className="mb-2 text-lg font-semibold text-slate-950">
                  {t("adminPanel.admin.reviews.noReviews", "No reviews found")}
                </h3>
                <p className="text-sm text-slate-500">
                  {t("adminPanel.admin.reviews.noFilteredReviews", "No reviews match your filters")}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl border-slate-200 bg-white text-slate-950 [&>button]:text-slate-500">
          <DialogHeader>
            <DialogTitle className="text-slate-950">
              {t("adminPanel.admin.reviews.addReviewTitle", "Add New Review")}
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              {t("adminPanel.admin.reviews.addReviewDescription", "Create a review for a package and customer")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-slate-700">{t("adminPanel.admin.reviews.package", "Package")} *</Label>
                <Select value={reviewForm.packageId} onValueChange={(value) => setReviewForm({ ...reviewForm, packageId: value })}>
                  <SelectTrigger className={darkSelectClass} data-testid="select-package">
                    <SelectValue placeholder="Select package" />
                  </SelectTrigger>
                  <SelectContent className={selectContentClass}>
                    {packages.slice(0, 50).map((pkg: any) => (
                      <SelectItem className={selectItemClass} key={pkg.id} value={pkg.id}>
                        {pkg.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">{t("adminPanel.admin.reviews.customer", "Customer")} *</Label>
                <Select value={reviewForm.userId} onValueChange={(value) => setReviewForm({ ...reviewForm, userId: value })}>
                  <SelectTrigger className={darkSelectClass} data-testid="select-user">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent className={selectContentClass}>
                    {users?.slice(0, 50).map((user: any) => (
                      <SelectItem className={selectItemClass} key={user.id} value={user.id}>
                        {user?.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">{t("adminPanel.admin.reviews.rating", "Rating")} *</Label>
              <Select value={reviewForm.rating} onValueChange={(value) => setReviewForm({ ...reviewForm, rating: value })}>
                <SelectTrigger className={darkSelectClass} data-testid="select-rating">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={selectContentClass}>
                  <SelectItem className={selectItemClass} value="5">5 Stars - Excellent</SelectItem>
                  <SelectItem className={selectItemClass} value="4">4 Stars - Good</SelectItem>
                  <SelectItem className={selectItemClass} value="3">3 Stars - Average</SelectItem>
                  <SelectItem className={selectItemClass} value="2">2 Stars - Poor</SelectItem>
                  <SelectItem className={selectItemClass} value="1">1 Star - Very Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">{t("adminPanel.admin.reviews.reviewTitle", "Title")} *</Label>
              <Input
                className={darkFieldClass}
                value={reviewForm.title}
                onChange={(event) => setReviewForm({ ...reviewForm, title: event.target.value })}
                data-testid="input-review-title"
                placeholder="Review title"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">{t("adminPanel.admin.reviews.comment", "Comment")} *</Label>
              <Textarea
                className={`${darkFieldClass} min-h-28`}
                value={reviewForm.comment}
                onChange={(event) => setReviewForm({ ...reviewForm, comment: event.target.value })}
                data-testid="input-review-comment"
                placeholder="Write your review..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button className={lightButtonClass} variant="outline" onClick={() => setCreateDialogOpen(false)}>
              {t("adminPanel.admin.reviews.cancel", "Cancel")}
            </Button>
            <Button className={primaryButtonClass} onClick={handleCreateReview} data-testid="button-submit-review">
              {t("adminPanel.admin.reviews.createReview", "Create Review")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteReviewId !== null} onOpenChange={() => setDeleteReviewId(null)}>
        <AlertDialogContent className="border-slate-200 bg-white text-slate-950">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-950">
              {t("adminPanel.admin.reviews.deleteConfirmTitle", "Delete this review?")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
              {t("adminPanel.admin.reviews.deleteConfirmDescription", "This action cannot be undone")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={lightButtonClass} data-testid="button-cancel-delete">
              {t("adminPanel.admin.reviews.cancel", "Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction className={dangerButtonClass} onClick={confirmDelete} data-testid="button-confirm-delete">
              {t("adminPanel.admin.reviews.delete", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
