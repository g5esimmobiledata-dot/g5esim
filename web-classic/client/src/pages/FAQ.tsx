import { FAQSection, CTABanner } from '@/components/marketing';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { SEOHead } from '@/components/SEOHead';

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title="FAQ - Frequently Asked Questions | eSIM Connect"
        description="Find answers to common questions about eSIM Connect. Learn about eSIM technology, installation, compatibility, and troubleshooting."
      />

      {/* <SiteHeader /> */}

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Frequently Asked Questions</h1>
            <p className="text-lg text-muted-foreground mb-8">
              Find answers to common questions about eSIM Connect
            </p>

            {/* Search Bar */}
            <div className="max-w-xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search for answers..."
                  className="pl-12 h-12 text-base"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-faq-search"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <FAQSection showTitle={false} />

      {/* CTA */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
          <p className="text-muted-foreground mb-6">
            Our support team is available 24/7 to help you.
          </p>
          <a href="/contact">
            <button
              className="gradient-primary text-white px-8 py-3 rounded-lg font-semibold"
              data-testid="button-contact-support"
            >
              Contact Support
            </button>
          </a>
        </div>
      </section>

      {/* <SiteFooter /> */}
    </div>
  );
}
