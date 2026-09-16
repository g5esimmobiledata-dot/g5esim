// pages/DynamicPage.tsx
import { useRoute, Redirect } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface PageData {
  id: string;
  slug: string;
  title: string;
  content: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatPageContent = (content: string) => {
  const trimmed = content.trim();

  if (!trimmed) return '';

  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return trimmed;
  }

  return trimmed
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('');
};

export default function DynamicPage() {
  const [match, params] = useRoute<{ slug: string }>('/pages/:slug');
  const slug = params?.slug;

  const { data, isLoading, error } = useQuery({
    queryKey: ['page-by-slug', slug],
    queryFn: async () => {
      const response = await fetch(`/api/pages/slug/${encodeURIComponent(slug || '')}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Page not found');
        }
        throw new Error('Failed to fetch page');
      }

      const result = await response.json();
      return result.data as PageData;
    },
    enabled: !!slug,
  });

  if (!match) {
    return <Redirect to="/404" />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors">
        <main className="flex-1 flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors">
        <main className="flex-1 py-16 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {error instanceof Error ? error.message : 'Failed to load page'}
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!data) {
    return <Redirect to="/404" />;
  }

  const pageContent = formatPageContent(data.content || '');

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors">
      <Helmet>
        <title>{data.metaTitle || data.title}</title>
        {data.metaDescription && <meta name="description" content={data.metaDescription} />}
      </Helmet>

      <main className="flex-1 py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold mb-8 text-foreground">{data.title}</h1>

            <p className="text-muted-foreground mb-8">
              Last updated:{' '}
              {new Date(data.updatedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>

            <div
              className="prose prose-lg prose-slate max-w-none dark:prose-invert prose-a:text-primary prose-a:underline prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground dark:prose-headings:text-white dark:prose-p:text-slate-200 dark:prose-li:text-slate-200 dark:prose-strong:text-white dark:prose-blockquote:text-slate-200 dark:prose-blockquote:border-slate-700 dark:[&_span]:!text-inherit"
              dangerouslySetInnerHTML={{
                __html: pageContent,
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
