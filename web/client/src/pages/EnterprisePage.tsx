import { useState } from 'react';
import { useLocation } from 'wouter';
import { Helmet } from 'react-helmet-async';
import { Building2, TrendingDown, HeadphonesIcon, CreditCard, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { apiRequest } from '@/lib/queryClient';
import { useTranslation } from '@/contexts/TranslationContext';

export default function EnterprisePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { isAuthenticated } = useUser();
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    billingAddress: '',
    taxId: '',
    estimatedVolume: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to apply for an enterprise account',
        variant: 'destructive',
      });
      setLocation('/login');
      return;
    }

    setIsSubmitting(true);

    try {
      await apiRequest('POST', '/api/enterprise/apply', {
        companyName: formData.companyName,
        contactName: formData.contactName,
        email: formData.email,
        phone: formData.phone,
        billingAddress: formData.billingAddress,
        taxId: formData.taxId,
      });

      toast({
        title: 'Application Submitted',
        description:
          'Your enterprise account application has been received. Our team will review it shortly.',
      });

      setLocation('/profile');
    } catch (error: any) {
      toast({
        title: 'Application Failed',
        description: error.message || 'Failed to submit application. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <>
      <Helmet>
        <title>Enterprise Solutions - Bulk eSIM Packages | eSIM Global</title>
        <meta
          name="description"
          content="Enterprise eSIM solutions with volume discounts, dedicated support, and flexible payment terms. Perfect for businesses with high connectivity needs."
        />
      </Helmet>

      <div className="min-h-screen bg-background mt-[50px] max-w-6xl mx-auto">
        <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-background py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <Building2 className="h-16 w-16 mx-auto mb-6 text-primary" />
              <h1 className="text-4xl md:text-5xl font-bold mb-6">Enterprise eSIM Solutions</h1>
              <p className="text-xl text-muted-foreground mb-8">
                Power your business with bulk eSIM Packages, volume discounts, and dedicated
                support. Perfect for travel agencies, remote teams, and businesses with global
                operations.
              </p>
              <Button size="lg" onClick={() => setShowForm(true)} data-testid="button-apply-now">
                Apply Now
              </Button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Enterprise Solutions?</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <Card>
              <CardHeader>
                <TrendingDown className="h-10 w-10 mb-4 text-primary" />
                <CardTitle>Volume Discounts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Save up to 30% with bulk purchases. The more you buy, the more you save.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <HeadphonesIcon className="h-10 w-10 mb-4 text-primary" />
                <CardTitle>Dedicated Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Get priority support with a dedicated account manager for your team.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CreditCard className="h-10 w-10 mb-4 text-primary" />
                <CardTitle>Flexible Payment</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Invoice billing, credit terms, and customized payment schedules available.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Building2 className="h-10 w-10 mb-4 text-primary" />
                <CardTitle>Custom Solutions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Tailored Packages and pricing designed specifically for your business needs.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-center mb-8">Features & Benefits</h2>

            <div className="space-y-4">
              {[
                'Volume-based pricing tiers with significant discounts',
                'Dedicated account manager and priority support',
                'Flexible payment terms and invoice billing',
                'Custom package creation for your specific needs',
                'Bulk order management dashboard',
                'Advanced reporting and analytics',
                'API Access for integration with your systems',
                'Credit line options for qualified Accounts',
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {showForm && (
            <div className="max-w-2xl mx-auto" id="application-form">
              <Card>
                <CardHeader>
                  <CardTitle>Enterprise Account Application</CardTitle>
                  <CardDescription>
                    Fill out the form below to apply for an enterprise account. Our team will review
                    your application and get back to you within 1-2 business days.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="companyName">Company Name *</Label>
                        <Input
                          id="companyName"
                          name="companyName"
                          value={formData.companyName}
                          onChange={handleChange}
                          required
                          data-testid="input-company-name"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="contactName">Contact Name *</Label>
                        <Input
                          id="contactName"
                          name="contactName"
                          value={formData.contactName}
                          onChange={handleChange}
                          required
                          data-testid="input-contact-name"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Business Email *</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          data-testid="input-email"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleChange}
                          data-testid="input-phone"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="billingAddress">Billing Address</Label>
                      <Textarea
                        id="billingAddress"
                        name="billingAddress"
                        value={formData.billingAddress}
                        onChange={handleChange}
                        rows={3}
                        data-testid="input-billing-address"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="taxId">Tax ID / VAT Number</Label>
                        <Input
                          id="taxId"
                          name="taxId"
                          value={formData.taxId}
                          onChange={handleChange}
                          data-testid="input-tax-id"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="estimatedVolume">Estimated Monthly Volume</Label>
                        <Input
                          id="estimatedVolume"
                          name="estimatedVolume"
                          placeholder="e.g., 50-100 eSIMs/month"
                          value={formData.estimatedVolume}
                          onChange={handleChange}
                          data-testid="input-estimated-volume"
                        />
                      </div>
                    </div>

                    <div className="pt-4">
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isSubmitting}
                        data-testid="button-submit-application"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          'Submit Application'
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
