import { Helmet } from 'react-helmet-async';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Privacy Policy - eSIM Connect</title>
        <meta
          name="description"
          content="Read eSIM Connect's privacy policy to understand how we collect, use, and protect your personal information."
        />
      </Helmet>

      {/* <SiteHeader /> */}

      <main className="flex-1 py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-10">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
            <p className="text-muted-foreground mb-8">Last updated: December 2024</p>

            <div className="prose prose-lg dark:prose-invert max-w-none">
              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
                <p className="text-muted-foreground mb-4">
                  We collect information you provide directly to us, including:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Account information (email address, name)</li>
                  <li>Payment information (processed securely through our payment providers)</li>
                  <li>Device information for eSIM compatibility verification</li>
                  <li>Communication preferences</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
                <p className="text-muted-foreground mb-4">We use the information we collect to:</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Process and fulfill your eSIM Orders</li>
                  <li>Send you order confirmations and eSIM installation instructions</li>
                  <li>Provide customer support</li>
                  <li>Send promotional communications (with your consent)</li>
                  <li>Improve our services and develop new features</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">3. Information Sharing</h2>
                <p className="text-muted-foreground">
                  We do not sell your personal information. We may share your information with:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                  <li>eSIM providers to fulfill your Orders</li>
                  <li>Payment processors to handle transactions</li>
                  <li>Service providers who assist our operations</li>
                  <li>Legal authorities when required by law</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
                <p className="text-muted-foreground">
                  We implement appropriate technical and organizational measures to protect your
                  personal information against unauthorized Access, alteration, disclosure, or
                  destruction.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">5. Your Rights</h2>
                <p className="text-muted-foreground mb-4">You have the right to:</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Access your personal information</li>
                  <li>Correct inaccurate data</li>
                  <li>Request deletion of your data</li>
                  <li>Opt out of marketing communications</li>
                  <li>Export your data</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">6. Contact Us</h2>
                <p className="text-muted-foreground">
                  If you have questions about this Privacy Policy, please contact us at:
                  <br />
                  <a href="mailto:privacy@esim.com" className="text-primary hover:underline">
                    privacy@esim.com
                  </a>
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>

      {/* <SiteFooter /> */}
    </div>
  );
}
