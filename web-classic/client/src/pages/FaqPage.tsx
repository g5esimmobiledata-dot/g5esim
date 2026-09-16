import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';

import { Loader2, ChevronDown, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';

interface Faq {
  id: string;
  question: string;
  answer: string;
  position: number;
  views: number;
}

interface FaqCategory {
  id: string;
  name: string;
  slug: string;
  faqs: Faq[];
}

export default function FaqPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['/api/faqs/public'],
    queryFn: async () => {
      const response = await fetch('/api/faqs/public');
      if (!response.ok) throw new Error('Failed to fetch FAQs');
      const result = await response.json();
      return result.data as FaqCategory[];
    },
  });

  // Filter FAQs based on search query
  const filteredCategories = data
    ?.map((category) => ({
      ...category,
      faqs: category.faqs.filter(
        (faq) =>
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    }))
    .filter((category) => category.faqs.length > 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Frequently Asked Questions - eSIM Connect</title>
        <meta
          name="description"
          content="Find answers to commonly asked questions about eSIM Connect services, pricing, and support."
        />
      </Helmet>

      {/* <SiteHeader /> */}

      <main className="flex-1 py-16 md:py-24 dark:bg-dark dark:text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center my-12 ">
              <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
              <p className="text-xl text-muted-foreground mb-8">
                Find answers to common questions about our eSIM servicesss
              </p>

              {/* Search Box */}
              <div className="relative max-w-xl mx-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search FAQs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* FAQ Categories */}
            {!isLoading && filteredCategories && filteredCategories.length > 0 ? (
              <div className="space-y-8 dark:text-white">
                {filteredCategories.map((category) => (
                  <div key={category.id} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-semibold">{category.name}</h2>
                      <Badge variant="secondary">{category.faqs.length}</Badge>
                    </div>

                    <Accordion type="single" collapsible className="space-y-2">
                      {category.faqs.map((faq, index) => (
                        <AccordionItem
                          key={faq.id}
                          value={`faq-${faq.id}`}
                          className="border rounded-lg px-6 bg-card"
                        >
                          <AccordionTrigger className="hover:no-underline py-4 dark:text-white">
                            <div className="flex items-start gap-3 text-left">
                              <span className="text-sm font-semibold text-muted-foreground mt-1">
                                {index + 1}.
                              </span>
                              <span className="font-medium">{faq.question}</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground pl-8 pr-4 pb-4">
                            <div
                              dangerouslySetInnerHTML={{ __html: faq.answer }}
                              className="prose prose-sm dark:prose-invert max-w-none"
                            />
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                ))}
              </div>
            ) : (
              !isLoading && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">
                    {searchQuery
                      ? 'No FAQs found matching your search.'
                      : 'No FAQs available at the moment.'}
                  </p>
                </div>
              )
            )}

            {/* Still Have Questions Section */}
            <div className="mt-16 p-8 bg-muted rounded-lg text-center">
              <h3 className="text-2xl font-semibold mb-3">Still have questions?</h3>
              <p className="text-muted-foreground mb-6">
                Can't find the answer you're looking for? Our support team is here to help.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/contact"
                  className="inline-flex items-center justify-center px-6 py-2 bg-primary-gradient text-white rounded-xl "
                >
                  Contact Support
                </a>
                {/* <a
                  href="/contact"
                  className="inline-flex items-center justify-center px-6 py-2 border border-input rounded-md hover:bg-slate-100 hover:border-2  hover:border-primary-dark hover:text-accent-foreground transition-colors"
                >
                  Visit Help Center
                </a> */}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* <SiteFooter /> */}
    </div>
  );
}
