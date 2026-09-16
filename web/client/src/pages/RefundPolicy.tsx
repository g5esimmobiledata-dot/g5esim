import { Helmet } from 'react-helmet-async';

import { useSettingByKey } from '@/hooks/useSettings';

export default function RefundPolicy() {
  const siteName = useSettingByKey('platform_name');
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Refund Policy - eSIM {siteName}</title>
        <meta
          name="description"
          content={`Learn about eSIM ${siteName}'s refund policy, including eligibility, process, and timelines for refund requests.`}
        />
      </Helmet>

      <main className="flex-1 py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-10">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold mb-8">Refund Policy</h1>
            <p className="text-muted-foreground mb-8">Last updated: December 2024</p>

            <div className="prose prose-lg dark:prose-invert max-w-none">
              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">1. Refund Eligibility</h2>
                <p className="text-muted-foreground mb-4">
                  We offer refunds under the following conditions:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>The eSIM has not been activated or installed on any device</li>
                  <li>No data has been consumed from the plan</li>
                  <li>The refund is requested within 30 days of purchase</li>
                  <li>The purchase was made in error or the device is not compatible</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">2. Non-Refundable Situations</h2>
                <p className="text-muted-foreground mb-4">Refunds are not available when:</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>The eSIM has been activated and any data has been used</li>
                  <li>More than 30 days have passed since purchase</li>
                  <li>
                    The request is due to change of travel plans (eSIMs can be used for future
                    trips)
                  </li>
                  <li>Network coverage issues in specific areas (coverage varies by location)</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">3. How to Request a Refund</h2>
                <p className="text-muted-foreground mb-4">To request a refund:</p>
                <ol className="list-decimal pl-6 text-muted-foreground space-y-2">
                  <li>Contact our support team at support@esim.com</li>
                  <li>Provide your order number and email address</li>
                  <li>Explain the reason for your refund request</li>
                  <li>Our team will review and respond within 2-3 business days</li>
                </ol>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">4. Refund Processing</h2>
                <p className="text-muted-foreground">
                  Once Approved, refunds are processed within 5-10 business days. The refund will be
                  credited to your original payment method. Please note that your bank may take
                  additional time to reflect the refund in your account.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">5. Partial Refunds</h2>
                <p className="text-muted-foreground">
                  In some cases, we may offer partial refunds or credits for future purchases. This
                  is evaluated on a case-by-case basis and may apply to situations where there were
                  significant service issues beyond your control.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">6. Contact Us</h2>
                <p className="text-muted-foreground">
                  If you have questions about our refund policy, please contact us at:
                  <br />
                  <a href="mailto:support@esim.com" className="text-primary hover:underline">
                    support@esim.com
                  </a>
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
