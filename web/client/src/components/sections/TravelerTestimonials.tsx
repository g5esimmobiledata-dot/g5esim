import { Link } from 'wouter';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import useEmblaCarousel from 'embla-carousel-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettingByKey } from '@/hooks/useSettings';

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'
          }`}
        />
      ))}
    </div>
  );
}

interface Testimonial {
  name: string;
  handle: string;
  rating: number;
  content: string;
  initials: string;
}

function TestimonialCard({ testimonial, index }: { testimonial: Testimonial; index: number }) {
  const { t } = useTranslation();

  return (
    <Card className="h-full border-border/50 dark:bg-slate-900/85 dark:ring-1 dark:ring-white/10" data-testid={`testimonial-card-${index}`}>
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-12 w-12 bg-gradient-to-br from-primary to-primary-light">
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary-light text-white font-semibold">
              {testimonial.initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h4 className="font-semibold text-foreground">{testimonial.name}</h4>
            <p className="text-xs text-muted-foreground">{testimonial.handle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded">
            Trustpilot
          </span>
          <StarRating rating={testimonial.rating} />
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed text-justify">{testimonial.content}</p>
      </CardContent>
    </Card>
  );
}

export function TravelerTestimonials() {
  const { t } = useTranslation();
  const siteName = useSettingByKey('platform_name');
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'start',
    slidesToScroll: 1,
  });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const testimonials: Testimonial[] = [
    {
      name: 'Sarah Chen',
      handle: '@sarahchen_travels',
      rating: 5,
      content: t(
        'website.home.testimonials.t1',
        `I used ${siteName} during my trip to Japan and it worked perfectly from the moment I landed. Setup took less than two minutes and the data speed was amazing!`,
      ),
      initials: 'SC',
    },
    {
      name: 'Marcus Weber',
      handle: '@marcusweber',
      rating: 5,
      content: t(
        'website.home.testimonials.t2',
        'Super easy to install and no roaming fees. I stayed connected through my entire Europe trip without switching SIM cards. Totally worth it!',
      ),
      initials: 'MW',
    },
    {
      name: 'Priya Sharma',
      handle: '@priyasharma',
      rating: 4,
      content: t(
        'website.home.testimonials.t3',
        'I bought my plan online before traveling to Thailand. The QR code arrived instantly, and the connection was fast everywhere I went — beaches, cities, even remote areas.',
      ),
      initials: 'PS',
    },
    {
      name: 'James Mitchell',
      handle: '@jamesmitchell',
      rating: 4,
      content: t(
        'website.home.testimonials.t4',
        `I was surprised how smooth everything was. ${siteName} saved me from buying local SIMs and hunting for Wi-Fi. Great coverage and fair pricing.`,
      ),
      initials: 'JM',
    },
    {
      name: 'Emma Thompson',
      handle: '@emmathompson',
      rating: 4,
      content: t(
        'website.home.testimonials.t5',
        `I've tried other eSIMs before, but ${siteName} was by far the easiest to activate. Customer support helped me within minutes when I had a question.`,
      ),
      initials: 'ET',
    },
    {
      name: 'Luca Rossi',
      handle: '@lucarossi',
      rating: 5,
      content: t(
        'website.home.testimonials.t6',
        "I used it across France, Belgium, and Italy with one single plan. The signal was strong, and I didn't have to worry about extra charges.",
      ),
      initials: 'LR',
    },
  ];

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
            {t('website.home.testimonials.title', `What travelers say about ${siteName}`)}
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex md:hidden gap-2">
              <Button
                size="icon"
                variant="outline"
                onClick={scrollPrev}
                disabled={!canScrollPrev}
                className="rounded-full"
                data-testid="button-testimonial-prev"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={scrollNext}
                disabled={!canScrollNext}
                className="rounded-full"
                data-testid="button-testimonial-next"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Link href="/destinations">
              <Button
                variant="outline"
                className="rounded-full"
                data-testid="button-view-all-destinations"
              >
                {t('website.home.testimonials.viewAll', 'View all destinations')}
              </Button>
            </Link>
          </div>
        </div>

        <div className="md:hidden overflow-hidden" ref={emblaRef}>
          <div className="flex gap-4">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="flex-shrink-0 w-[85%]">
                <TestimonialCard testimonial={testimonial} index={index} />
              </div>
            ))}
          </div>
        </div>

        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={index} testimonial={testimonial} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
