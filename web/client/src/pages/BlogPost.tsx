import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { useRoute, Link } from 'wouter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, Clock, Share2, User } from 'lucide-react';
import { ArticleSchema } from '@/components/StructuredData';
// import { calculateReadingTime } from "@/lib/imageOptimization";
import type { BlogPost as BlogPostType } from '@shared/schema';

export default function BlogPost() {
  const [, params] = useRoute('/blog/:slug');
  const API_BASE_URL = window.location.origin;

  const { data: response, isLoading } = useQuery<{
    success: boolean;
    message: string;
    data: BlogPostType & { author: any };
  }>({
    queryKey: ['/api/blog', params?.slug],
    enabled: !!params?.slug,
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/blog/${params?.slug}`);
      if (!res.ok) throw new Error('Failed to fetch blog post');
      return res.json();
    },
  });

  // Extract post from API response
  const post = response?.data;

  console.log('post', post);

  const handleShare = async () => {
    if (navigator.share && post) {
      try {
        await navigator.share({
          title: post.title,
          text: post.excerpt,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share failed:', err);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* <SiteHeader /> */}
        <main className="flex-1">
          {/* Responsive Loading State */}
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12 max-w-4xl">
            <Skeleton className="h-8 sm:h-10 w-32 sm:w-40 mb-6 sm:mb-8" />
            <Skeleton className="h-10 sm:h-12 md:h-16 w-full sm:w-3/4 mb-4 sm:mb-6" />
            <Skeleton className="h-4 sm:h-5 w-48 sm:w-64 mb-6 sm:mb-8" />
            <Skeleton className="h-48 sm:h-64 md:h-96 w-full mb-6 sm:mb-8 rounded-lg" />
            <div className="space-y-3 sm:space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
        </main>
        {/* <SiteFooter /> */}
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col pt-[100px]">
        {/* <SiteHeader /> */}
        <main className="flex-1">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <Card className="max-w-2xl mx-auto">
              <CardContent className="text-center py-12 sm:py-16 px-4">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-4 sm:mb-6">
                  Blog post not found
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">
                  The blog post you're looking for doesn't exist or has been removed.
                </p>
                <Link href="/blog">
                  <Button className="w-full sm:w-auto">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Blog
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </main>
        {/* <SiteFooter /> */}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pt-[100px]">
      <Helmet>
        <title>{post.title} | eSIM Marketplace Blog</title>
        <meta name="description" content={post.metaDescription || post.excerpt} />
        {post.metaKeywords && post.metaKeywords.length > 0 && (
          <meta name="keywords" content={post.metaKeywords.join(', ')} />
        )}
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:type" content="article" />
        {post.featuredImage && <meta property="og:image" content={post.featuredImage} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.excerpt} />
        {post.featuredImage && <meta name="twitter:image" content={post.featuredImage} />}
      </Helmet>

      {post.publishedAt && (
        <ArticleSchema
          title={post.title}
          description={post.excerpt}
          image={post.featuredImage || undefined}
          datePublished={post.publishedAt.toString()}
          dateModified={post.updatedAt.toString()}
          authorName={post.author?.name || 'eSIM Marketplace'}
        />
      )}

      {/* <SiteHeader /> */}

      <main className="flex-1 bg-background">
        {/* Article Container - Enhanced Responsive Padding */}
        <article className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-10 lg:py-12 max-w-4xl">
          {/* Back Button - Responsive */}
          <Link href="/blog">
            <Button
              variant="ghost"
              className="mb-6 sm:mb-8 text-sm sm:text-base -ml-2 sm:-ml-3"
              data-testid="button-back-to-blog"
            >
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Back to Blog
            </Button>
          </Link>

          {/* Article Header - Enhanced Responsive Typography */}
          <header className="mb-6 sm:mb-8 md:mb-10">
            <h1
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 leading-tight"
              data-testid="text-blog-post-title"
            >
              {post.title}
            </h1>

            {/* Meta Information - Responsive Layout */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 md:gap-6 text-xs sm:text-sm text-muted-foreground mb-6 sm:mb-8">
              {/* Published Date */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="whitespace-nowrap">
                  {post.publishedAt
                    ? new Date(post.publishedAt).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Draft'}
                </span>
              </div>

              {/* Reading Time (commented out in original) */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="whitespace-nowrap">
                  {/* {calculateReadingTime(post.content)} min read */}5 min read
                </span>
              </div>

              {/* Author */}
              {post.author && (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">By {post.author.name}</span>
                </div>
              )}
            </div>

            {/* Featured Image - Responsive */}
            {post.featuredImage && (
              <div className="aspect-video w-full overflow-hidden rounded-lg sm:rounded-xl mb-6 sm:mb-8 shadow-lg">
                <img
                  src={post.featuredImage}
                  alt={post.title}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              </div>
            )}
          </header>

          {/* Article Content - Enhanced Responsive Typography with Tailwind Prose */}
          <div
            className="prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl max-w-none mb-8 sm:mb-10 md:mb-12
              prose-headings:font-bold prose-headings:text-foreground
              prose-h1:text-2xl sm:prose-h1:text-3xl lg:prose-h1:text-4xl
              prose-h2:text-xl sm:prose-h2:text-2xl lg:prose-h2:text-3xl
              prose-h3:text-lg sm:prose-h3:text-xl lg:prose-h3:text-2xl
              prose-p:text-muted-foreground prose-p:leading-relaxed
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-strong:text-foreground prose-strong:font-semibold
              prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded
              prose-pre:bg-muted prose-pre:border prose-pre:border-border
              prose-img:rounded-lg prose-img:shadow-md
              prose-blockquote:border-l-primary prose-blockquote:bg-muted/30 prose-blockquote:py-1
              prose-ul:list-disc prose-ol:list-decimal
              prose-li:text-muted-foreground prose-li:marker:text-primary
              [&>*]:break-words"
            data-testid="text-blog-post-content"
          >
            <div dangerouslySetInnerHTML={{ __html: post.content }} />
          </div>

          {/* Article Footer - Responsive Layout */}
          <footer className="border-t pt-6 sm:pt-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
              {/* Last Updated */}
              <div className="text-xs sm:text-sm text-muted-foreground">
                Last updated:{' '}
                {new Date(post.updatedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>

              {/* Share Button - Responsive */}
              {navigator.share && (
                <Button
                  variant="outline"
                  onClick={handleShare}
                  data-testid="button-share"
                  className="w-full sm:w-auto text-sm"
                >
                  <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                  Share Article
                </Button>
              )}
            </div>
          </footer>
        </article>
      </main>

      {/* <SiteFooter /> */}
    </div>
  );
}
