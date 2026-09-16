import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Link } from 'wouter';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Calendar, Clock, BookOpen, ArrowRight, TrendingUp } from 'lucide-react';
import { calculateReadingTime } from '@/lib/imageOptimization';
import type { BlogPost } from '@shared/schema';
import { useTranslation } from '@/contexts/TranslationContext';

export default function Blog() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { t } = useTranslation();
  const limit = 10;

  const { data, isLoading } = useQuery<{
    posts: BlogPost[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>({
    queryKey: ['/api/blog', { page, search, limit }],
  });

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const featuredPost = data?.posts?.[0];
  const remainingPosts = data?.posts?.slice(1) || [];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50 dark:bg-background">
      <Helmet>
        <title>{t("website.blog.metaTitle", "eSIM Travel Blog - Tips, Guides & Destination Insights | eSIM Marketplace")}</title>
        <meta
          name="description"
          content={t("website.blog.metaDescription", "Explore our travel blog for eSIM guides, destination tips, and digital nomad resources. Learn how to stay connected while traveling globally.")}
        />
        <meta property="og:title" content={t("website.blog.ogTitle", "eSIM Travel Blog - Tips & Guides")} />
        <meta
          property="og:description"
          content={t("website.blog.ogDescription", "Travel tips, eSIM guides, and destination insights for digital nomads and travelers.")}
        />
        <meta property="og:type" content="website" />
      </Helmet>

      <main className="flex-1">
        {/* Header/Hero Section */}
        <section className="relative pt-24 pb-20 md:pt-32 md:pb-28 overflow-hidden bg-white dark:bg-slate-950/20">
          {/* Advanced Background Decorations */}
          <div className="absolute inset-0 z-0">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl delay-700 animate-pulse"></div>
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
          </div>

          <div className="containers relative z-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-2xl"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-6 border border-primary/20">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{t("website.blog.badge", "The Travel Hub")}</span>
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 tracking-tight text-slate-900 dark:text-white leading-[1.1]">
                  Insights for <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">Global Travelers</span>
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
                  {t("website.blog.description", "Unlock the best travel experiences with our expert guides on eSIM technology, hidden gems, and staying connected across the globe.")}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="w-full md:max-w-md"
              >
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-2xl blur opacity-75 group-focus-within:opacity-100 transition duration-500"></div>
                  <div className="relative flex items-center">
                    <Search className="absolute left-4 h-5 w-5 text-slate-400" />
                    <Input
                      placeholder={t("website.blog.search", "Search guides, tips...")}
                      value={search}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-12 pr-4 h-14 text-base border-border bg-white dark:bg-slate-900 rounded-xl shadow-sm focus-visible:ring-primary h-14"
                    />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="pb-24 pt-4">
          <div className="containers">
            {isLoading ? (
              <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="overflow-hidden border-none shadow-sm rounded-2xl">
                    <Skeleton className="aspect-video w-full" />
                    <CardContent className="p-6">
                      <Skeleton className="h-4 w-20 mb-4" />
                      <Skeleton className="h-8 w-full mb-3" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : data && data.posts.length > 0 ? (
              <>
                {/* Featured Post - Only on Page 1 and when not searching */}
                {page === 1 && !search && featuredPost && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12"
                  >
                    <Link href={`/blog/${featuredPost.slug}`}>
                      <div className="group relative bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl hover:shadow-2xl transition-all duration-500 cursor-pointer flex flex-col lg:flex-row min-h-[450px]">
                        <div className="lg:w-3/5 relative overflow-hidden">
                          {featuredPost.featuredImage ? (
                            <img
                              src={featuredPost.featuredImage}
                              alt={featuredPost.title}
                              className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                            />
                          ) : (
                            <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                              <BookOpen className="w-16 h-16 text-slate-300" />
                            </div>
                          )}
                          <div className="absolute top-6 left-6">
                            <span className="px-4 py-1.5 rounded-full bg-primary text-white text-xs font-bold shadow-lg flex items-center gap-2">
                              <TrendingUp className="w-3.5 h-3.5" />
                              LATEST FEATURE
                            </span>
                          </div>
                        </div>
                        <div className="lg:w-2/5 p-8 lg:p-12 flex flex-col justify-center">
                          <div className="flex items-center gap-4 text-xs font-medium text-slate-400 mb-6 uppercase tracking-widest">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-primary" />
                              {featuredPost.publishedAt ? new Date(featuredPost.publishedAt).toLocaleDateString() : 'Draft'}
                            </span>
                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-primary" />
                              {calculateReadingTime(featuredPost.content)} min read
                            </span>
                          </div>
                          <h2 className="text-3xl lg:text-4xl font-extrabold mb-6 group-hover:text-primary transition-colors leading-tight text-slate-900 dark:text-white line-clamp-3">
                            {featuredPost.title}
                          </h2>
                          <p className="text-slate-600 dark:text-slate-400 mb-8 line-clamp-3 text-lg leading-relaxed">
                            {featuredPost.excerpt}
                          </p>
                          <div className="flex items-center text-primary font-bold gap-2 group/btn">
                            READ FULL ARTICLE
                            <ArrowRight className="w-5 h-5 transform group-hover/btn:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                )}

                {/* Main Grid */}
                <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {(page === 1 && !search ? remainingPosts : data.posts).map((post, index) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    >
                      <Link href={`/blog/${post.slug}`}>
                        <Card className="group h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 cursor-pointer flex flex-col">
                          <div className="relative aspect-[16/10] overflow-hidden">
                            {post.featuredImage ? (
                              <img
                                src={post.featuredImage}
                                alt={post.title}
                                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <BookOpen className="w-10 h-10 text-slate-300" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="absolute bottom-4 left-4 flex gap-2">
                              <span className="px-3 py-1 rounded-md bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm text-[10px] font-bold text-slate-900 dark:text-white uppercase tracking-tighter shadow-sm border border-slate-100 dark:border-slate-800">
                                Travel
                              </span>
                            </div>
                          </div>
                          <CardContent className="p-6 flex-1 flex flex-col">
                            <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-400 mb-4 uppercase tracking-wider">
                              <span className="flex items-center gap-1.5">
                                <Calendar className="w-3 h-3 text-primary" />
                                {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : 'Draft'}
                              </span>
                              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-primary" />
                                {calculateReadingTime(post.content)} min
                              </span>
                            </div>
                            <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors leading-tight line-clamp-2 text-slate-900 dark:text-white flex-1">
                              {post.title}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 line-clamp-2 leading-relaxed">
                              {post.excerpt}
                            </p>
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                              <span className="text-primary text-xs font-bold flex items-center gap-1">
                                READ MORE <ArrowRight className="w-3 h-3" />
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </div>

                {/* Pagination */}
                {data.pagination.totalPages > 1 && (
                  <div className="mt-20 flex justify-center items-center gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        setPage((p) => Math.max(1, p - 1));
                      }}
                      disabled={page === 1}
                      className="rounded-xl h-12 w-12 p-0 hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      <ArrowRight className="w-5 h-5 rotate-180" />
                    </Button>

                    <div className="flex items-center gap-1 px-4 py-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                      {Array.from({ length: Math.min(5, data.pagination.totalPages) }, (_, i) => {
                        let pageNum = page;
                        if (page <= 3) pageNum = i + 1;
                        else if (page >= data.pagination.totalPages - 2) pageNum = data.pagination.totalPages - 4 + i;
                        else pageNum = page - 2 + i;

                        if (pageNum <= 0 || pageNum > data.pagination.totalPages) return null;

                        return (
                          <Button
                            key={pageNum}
                            variant={page === pageNum ? 'default' : 'ghost'}
                            onClick={() => {
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                              setPage(pageNum);
                            }}
                            className={`h-10 w-10 p-0 rounded-lg font-bold text-sm ${page === pageNum ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'hover:bg-primary/5 hover:text-primary'}`}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="ghost"
                      onClick={() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        setPage((p) => Math.min(data.pagination.totalPages, p + 1));
                      }}
                      disabled={page === data.pagination.totalPages}
                      className="rounded-xl h-12 w-12 p-0 hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-32 bg-white dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800"
              >
                <div className="mb-6 inline-flex p-6 rounded-full bg-slate-50 dark:bg-slate-800">
                  <Search className="w-12 h-12 text-slate-300" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No matches found</h3>
                <p className="text-slate-500 mb-8 max-w-sm mx-auto">We couldn't find any articles matching "{search}". Try searching for something else.</p>
                <Button
                  variant="outline"
                  onClick={() => setSearch('')}
                  className="rounded-xl px-8"
                >
                  Clear search
                </Button>
              </motion.div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
