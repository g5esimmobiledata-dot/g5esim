// import { Link } from 'wouter';
// import { MessageCircle, HelpCircle } from 'lucide-react';
// import { Button } from '@/components/ui/button';
// import { Card, CardContent } from '@/components/ui/card';
// import {
//   Accordion,
//   AccordionContent,
//   AccordionItem,
//   AccordionTrigger,
// } from '@/components/ui/accordion';
// import { useTranslation } from '@/contexts/TranslationContext';
// import { useSettingByKey } from '@/hooks/useSettings';

// export function FAQWithSupport() {
//   const { t } = useTranslation();
//   const siteName = useSettingByKey('platform_name');

//   const faqs = [
//     {
//       questionKey: 'website.home.faq.q1.question',
//       answerKey: 'website.home.faq.q1.answer',
//       questionFallback: 'What is an eSIM and how does it work?',
//       answerFallback:
//         'An eSIM is a built-in digital SIM that lets you activate a mobile data plan without a physical card. Just choose a plan, scan a QR code, and connect instantly when you travel.',
//     },
//     {
//       questionKey: 'website.home.faq.q2.question',
//       answerKey: 'website.home.faq.q2.answer',
//       questionFallback: 'How do I set up my eSIM on my phone?',
//       answerFallback:
//         "After purchase, you'll receive an email with a QR code. Open your phone's settings, scan the code, and follow the quick setup guide to start using data.",
//     },
//     {
//       questionKey: 'website.home.faq.q3.question',
//       answerKey: 'website.home.faq.q3.answer',
//       questionFallback: 'Can I use my physical SIM and eSIM together?',
//       answerFallback:
//         'Yes. You can keep your regular SIM for calls and SMS while using your eSIM for data during international travel.',
//     },
//     {
//       questionKey: 'website.home.faq.q4.question',
//       answerKey: 'website.home.faq.q4.answer',
//       questionFallback: `Where does ${siteName} work? `,
//       answerFallback:
//         'Our data plans cover over 200 destinations across Europe, Asia, the Americas, and more — giving you high-speed internet without roaming fees.',
//     },
//     {
//       questionKey: 'website.home.faq.q5.question',
//       answerKey: 'website.home.faq.q5.answer',
//       questionFallback: 'Can I top up or reuse my plan?',
//       answerFallback:
//         'Yes. Some plans let you add more data or extend your validity directly from your account dashboard, so you can stay connected without buying a new QR code.',
//     },
//   ];

//   return (
//     <section className="py-16 md:py-24 bg-muted/30">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//         <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground text-center mb-12">
//           {t('website.home.faq.title', 'Frequently Asked Questions about Travel eSIMs')}
//         </h2>

//         <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
//           <Card className="lg:col-span-1 h-fit border-primary dark:border-orange-800/30 bg-gradient-to-br from-primary-50 to-amber-100/50 dark:from-primary-950/30 dark:to-amber-900/20">
//             <CardContent className="p-6">
//               <div className="h-14 w-14 rounded-2xl bg-gradient-to-r from-primary to-primary-dark flex items-center justify-center mb-4">
//                 <MessageCircle className="h-7 w-7 text-white" />
//               </div>

//               <span className="text-xs font-semibold text-primary uppercase tracking-wide">
//                 {t('website.home.faq.support.label', 'Support')}
//               </span>

//               <h3 className="text-xl font-bold text-foreground mt-2 mb-3">
//                 {t('website.home.faq.support.title', 'Need more help?')}
//               </h3>

//               <p className="text-sm text-muted-foreground mb-6">
//                 {t(
//                   'website.home.faq.support.description',
//                   "Can't find what you're looking for? Our support team is available 24/7 by email or chat to guide you through setup and troubleshooting.",
//                 )}
//               </p>

//               <Link href="/account/support">
//                 <Button
//                   variant="outline"
//                   className="w-full border-teal-300 dark:border-teal-700 hover:bg-orange-100 dark:hover:bg-orange-900/30"
//                   data-testid="button-help-center"
//                 >
//                   <HelpCircle className="h-4 w-4 mr-2" />
//                   {t('website.home.faq.support.button', 'Visit Help Center')}
//                 </Button>
//               </Link>
//             </CardContent>
//           </Card>

//           <div className="lg:col-span-2">
//             <Accordion type="single" collapsible className="space-y-3">
//               {faqs.map((faq, index) => (
//                 <AccordionItem
//                   key={index}
//                   value={`item-${index}`}
//                   className="border border-border/50 rounded-xl px-6 bg-background"
//                   data-testid={`faq-item-${index}`}
//                 >
//                   <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-5">
//                     {t(faq.questionKey, faq.questionFallback)}
//                   </AccordionTrigger>
//                   <AccordionContent className="text-muted-foreground pb-5">
//                     {t(faq.answerKey, faq.answerFallback)}
//                   </AccordionContent>
//                 </AccordionItem>
//               ))}
//             </Accordion>
//           </div>
//         </div>
//       </div>
//     </section>
//   );
// }




import { Link } from 'wouter';
import { MessageCircle, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettingByKey } from '@/hooks/useSettings';
import { useQuery } from "@tanstack/react-query";


interface Faq {
  id: string;
  question: string;
  answer: string;
}

interface FaqCategory {
  id: string;
  name: string;
  slug: string;
  faqs: Faq[];
}

export function FAQWithSupport() {
  const { t } = useTranslation();
  const siteName = useSettingByKey('platform_name');
  const FAQ_LIMIT = 3;

  const { data, isLoading } = useQuery({
    queryKey: ["/api/faqs/public"],
    queryFn: async () => {
      const res = await fetch("/api/faqs/public");
      if (!res.ok) throw new Error("Failed to fetch FAQs");
      const result = await res.json();
      return result.data;
    },
  });


  // const supportFaqs =
  //   data?.find((cat) => cat.slug === "support")?.faqs || [];


  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground text-center mb-12">
          {t('website.home.faq.title', 'Frequently Asked Questions about Travel eSIMs')}
        </h2>

        <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
          <Card className="lg:col-span-1 h-fit border-primary dark:border-orange-800/30 bg-gradient-to-br from-primary-50 to-amber-100/50 dark:from-primary-950/30 dark:to-amber-900/20">
            <CardContent className="p-6">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-r from-primary to-primary-dark flex items-center justify-center mb-4">
                <MessageCircle className="h-7 w-7 text-white" />
              </div>

              <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                {t('website.home.faq.support.label', 'Support')}
              </span>

              <h3 className="text-xl font-bold text-foreground mt-2 mb-3">
                {t('website.home.faq.support.title', 'Need more help?')}
              </h3>

              <p className="text-sm text-muted-foreground mb-6">
                {t(
                  'website.home.faq.support.description',
                  "Can't find what you're looking for? Our support team is available by email or chat to guide you through setup and troubleshooting.",
                )}
              </p>

              <Link href="/account/support">
                <Button
                  variant="outline"
                  className="w-full border-teal-300 dark:border-teal-700 hover:bg-orange-100 dark:hover:bg-orange-900/30"
                  data-testid="button-help-center"
                >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  {t('website.home.faq.support.button', 'Visit Help Center')}
                </Button>
              </Link>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-8">
            {isLoading ? (
              <p className="text-muted-foreground">Loading FAQs...</p>
            ) : (
              data?.map((category: any) => (
                <div key={category.id}>

                  {/* Category title */}
                  <div className="flex items-center justify-between mb-3 dark:text-white">
                    <h3 className="text-lg font-semibold">
                      {category.name}
                    </h3>

                    {category.faqs.length > FAQ_LIMIT && (
                      <Link href="/faq">
                        <Button variant="ghost" size="sm">
                          View More
                        </Button>
                      </Link>
                    )}
                  </div>

                  <Accordion type="single" collapsible className="space-y-3">
                    {category.faqs.slice(0, FAQ_LIMIT).map((faq: any) => (
                      <AccordionItem
                        key={faq.id}
                        value={`faq-${faq.id}`}
                        className="border border-border/50 rounded-xl px-6 bg-background"
                      >
                        <AccordionTrigger className="text-left font-semibold hover:no-underline py-5 dark:text-white">
                          {faq.question}
                        </AccordionTrigger>

                        <AccordionContent className="text-muted-foreground pb-5">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
