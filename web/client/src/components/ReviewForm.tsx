import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/contexts/TranslationContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const reviewFormSchema = z.object({
  packageId: z.string(),
  rating: z.number().min(1).max(5),
  title: z.string().min(10, "Title must be at least 10 characters"),
  comment: z.string().min(50, "Comment must be at least 50 characters"),
  pros: z.array(z.string()).optional(),
  cons: z.array(z.string()).optional(),
});

type ReviewFormData = z.infer<typeof reviewFormSchema>;

interface ReviewFormProps {
  packageId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ReviewForm({ packageId, open, onOpenChange }: ReviewFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hoveredRating, setHoveredRating] = useState(0);

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      packageId,
      rating: 0,
      title: "",
      comment: "",
      pros: [],
      cons: [],
    },
  });

  const submitReviewMutation = useMutation({
    mutationFn: async (data: ReviewFormData) => {
      // Convert pros/cons textarea to arrays
      const prosText = (form.getValues("pros") as any) as string;
      const consText = (form.getValues("cons") as any) as string;
      
      const prosArray = prosText 
        ? prosText.split("\n").filter(p => p.trim().length > 0)
        : [];
      const consArray = consText 
        ? consText.split("\n").filter(c => c.trim().length > 0)
        : [];

      return apiRequest(`/api/reviews`, {
        method: "POST",
        body: JSON.stringify({
          ...data,
          pros: prosArray,
          cons: consArray,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: t("reviews.reviewSubmitted", "Review submitted successfully!"),
        description: t("reviews.moderationNotice", "Your review will be published after moderation"),
      });
      queryClient.invalidateQueries({ queryKey: [`/api/packages/${packageId}/reviews`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packages/${packageId}/review-stats`] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: t("common.error", "Error"),
        description: error.message || "Failed to submit review",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ReviewFormData) => {
    if (data.rating === 0) {
      toast({
        title: t("common.error", "Error"),
        description: t("reviews.rating", "Rating") + " is required",
        variant: "destructive",
      });
      return;
    }
    submitReviewMutation.mutate(data);
  };

  const rating = form.watch("rating");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-review-form">
        <DialogHeader>
          <DialogTitle data-testid="text-review-form-title">
            {t("reviews.writeReview", "Write a Review")}
          </DialogTitle>
          <DialogDescription data-testid="text-review-form-description">
            {t("reviews.moderationNotice", "Your review will be published after moderation")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Star Rating */}
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid="label-rating">
                    {t("reviews.rating", "Rating")} *
                  </FormLabel>
                  <FormControl>
                    <div className="flex gap-2" data-testid="input-rating">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          data-testid={`button-star-${star}`}
                          className="focus:outline-none transition-transform hover-elevate active-elevate-2"
                          onMouseEnter={() => setHoveredRating(star)}
                          onMouseLeave={() => setHoveredRating(0)}
                          onClick={() => field.onChange(star)}
                        >
                          <Star
                            className={`h-8 w-8 ${
                              star <= (hoveredRating || rating)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Review Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid="label-title">
                    {t("reviews.reviewTitle", "Review Title")} *
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      data-testid="input-title"
                      placeholder={t("reviews.reviewTitlePlaceholder", "Summarize your experience")}
                      maxLength={200}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Review Comment */}
            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid="label-comment">
                    {t("reviews.comment", "Your Review")} *
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      data-testid="input-comment"
                      placeholder={t("reviews.commentPlaceholder", "Share your experience with this eSIM package...")}
                      rows={6}
                      maxLength={2000}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {field.value.length}/2000 characters
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Pros (Optional) */}
            <FormField
              control={form.control}
              name="pros"
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid="label-pros">
                    {t("reviews.pros", "Pros (Optional)")}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field as any}
                      data-testid="input-pros"
                      placeholder={t("reviews.prosPlaceholder", "What did you like?")}
                      rows={3}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Enter each pro on a new line
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cons (Optional) */}
            <FormField
              control={form.control}
              name="cons"
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid="label-cons">
                    {t("reviews.cons", "Cons (Optional)")}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field as any}
                      data-testid="input-cons"
                      placeholder={t("reviews.consPlaceholder", "What could be improved?")}
                      rows={3}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Enter each con on a new line
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                type="submit"
                disabled={submitReviewMutation.isPending}
                data-testid="button-submit"
              >
                {submitReviewMutation.isPending
                  ? t("reviews.submitting", "Submitting...")
                  : t("reviews.submit", "Submit Review")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
