import { Helmet } from 'react-helmet-async';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Terms of Service - eSIM Connect</title>
        <meta
          name="description"
          content="Read eSIM Connect's terms of service to understand the rules and conditions for using our eSIM Marketplace platform."
        />
      </Helmet>

      {/* <SiteHeader /> */}

      <main className="flex-1 py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-10 ">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
            <p className="text-muted-foreground mb-8">Last updated: December 2024</p>

            <div className="prose prose-lg dark:prose-invert max-w-none">
              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
                <p className="text-muted-foreground">
                  By accessing and using eSIM Connect, you agree to be bound by these Terms of
                  Service. If you do not agree to these terms, please do not use our services.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">2. Services Description</h2>
                <p className="text-muted-foreground">
                  eSIM Connect provides digital eSIM data plans for international travel. Our
                  service allows you to purchase, activate, and manage eSIM profiles directly from
                  your compatible device.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">3. Account Registration</h2>
                <p className="text-muted-foreground mb-4">To use our services, you must:</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Be at least 18 years old or have parental consent</li>
                  <li>Provide accurate and complete registration information</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Notify us immediately of any unauthorized Access</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">4. Purchases and Payments</h2>
                <p className="text-muted-foreground mb-4">
                  All purchases are final once the eSIM QR code has been delivered. Prices are
                  displayed in various currencies and include applicable taxes. We accept major
                  credit cards and other payment methods as displayed at checkout.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">5. eSIM Activation</h2>
                <p className="text-muted-foreground">
                  eSIM activation requires a compatible device. It is your responsibility to verify
                  device compatibility before purchase. Once activated, eSIM profiles cannot be
                  transferred to another device.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">6. Usage Policies</h2>
                <p className="text-muted-foreground mb-4">
                  You agree to use our services only for lawful purposes. Prohibited activities
                  include:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Reselling eSIM products without authorization</li>
                  <li>Using services for illegal activities</li>
                  <li>Attempting to circumvent security measures</li>
                  <li>Interfering with other users' Access to services</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">7. Limitation of Liability</h2>
                <p className="text-muted-foreground">
                  eSIM Connect shall not be liable for any indirect, incidental, special,
                  consequential, or punitive damages arising from your use of our services. Network
                  coverage and speeds are subject to carrier availability and local conditions.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">8. Changes to Terms</h2>
                <p className="text-muted-foreground">
                  We reserve the right to modify these terms at any time. Continued use of our
                  services after changes constitutes acceptance of the modified terms.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">9. Contact Information</h2>
                <p className="text-muted-foreground">
                  For questions about these Terms of Service, please contact us at:
                  <br />
                  <a href="mailto:legal@esim.com" className="text-primary hover:underline">
                    legal@esim.com
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
