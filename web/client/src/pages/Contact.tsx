import { useState, useRef } from 'react';
import { SEOHead } from '@/components/SEOHead';
import { Mail, MessageSquare, Clock, MapPin, Send, Loader2 } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import { useSettingByKey } from '@/hooks/useSettings';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';


export default function Contact() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const { toast } = useToast();
  const recaptchaRef = useRef<ReCAPTCHA | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const email = useSettingByKey('email') || 'email@domain.com';
  // Dynamic settings (same as login page)
  const RECAPTCHA_SITE_KEY = useSettingByKey('recaptcha_site_key') || '';
  const RecaptchaEnabled = useSettingByKey('recaptcha_enabled') || false;

  const isCaptchaEnabled = RecaptchaEnabled === 'true' || RecaptchaEnabled === true;


  const contactInfo = [
    {
      icon: Mail,
      title: 'Email Us',
      description: email,
      detail: 'We respond within 24 hours',
    },
    {
      icon: MessageSquare,
      title: 'Live Chat',
      description: 'Available',
      detail: 'Instant support for urgent issues',
    },
    {
      icon: Clock,
      title: 'Response Time',
      description: 'Within 2 hours',
      detail: 'For urgent connectivity issues',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    /* ---------------- CAPTCHA VALIDATION ---------------- */
    if (isCaptchaEnabled && !captchaToken) {
      toast({
        title: 'Captcha Required',
        description: 'Please verify you are human',
        variant: 'destructive',
      });
      return;
    }
    /* ---------------------------------------------------- */

    setIsSubmitting(true);

    try {
      // 🔹 API call example
      await apiRequest('POST', '/api/contact', {
        ...formData,
        captchaToken,
      });

      toast({
        title: 'Message sent!',
        description: "We'll get back to you within 24 hours.",
      });

      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
      });

      // Reset captcha
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title="Contact Us - eSIM Connect"
        description="Get in touch with eSIM Connect support. We're here to help with your eSIM questions, technical issues, and more."
      />

      {/* <SiteHeader /> */}

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-[150px]">
        <div className="absolute inset-0  opacity-95" />
        <div className="relative containers mx-auto px-4 sm:px-6 lg:px-8    ">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold  text-foreground mb-4">
              Get in Touch
            </h1>
            <p className="text-lg  text-muted-foreground">Have a question? We're here to help.</p>
          </div>
        </div>
      </section>

      <main className="flex-1 py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            {/* Contact Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
              {contactInfo.map((item, index) => (
                <Card key={index} className="p-6 text-center" data-testid={`contact-info-${index}`}>
                  <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-4">
                    <item.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                  <p className="text-primary font-medium mb-1">{item.description}</p>
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                </Card>
              ))}
            </div>

            {/* Contact Form */}
            <div className="max-w-2xl mx-auto">
              <Card className="p-8">
                <h2 className="text-2xl font-bold mb-6">Send us a message</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        placeholder="Your name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        data-testid="input-contact-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        data-testid="input-contact-email"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="How can we help?"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      required
                      data-testid="input-contact-subject"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Tell us more about your question or issue..."
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                      data-testid="input-contact-message"
                    />
                  </div>

                  {isCaptchaEnabled && RECAPTCHA_SITE_KEY && (
                    <div className="w-full flex justify-center my-3">
                      <div className="max-w-[304px] w-full flex justify-center overflow-hidden rounded-md">
                        <ReCAPTCHA
                          ref={recaptchaRef}
                          sitekey={RECAPTCHA_SITE_KEY}
                          onChange={(token) => setCaptchaToken(token)}
                        />
                      </div>
                    </div>
                  )}
                  <Button
                    type="submit"
                    className="w-full gradient-primary"
                    disabled={isSubmitting}
                    data-testid="button-contact-submit"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* <SiteFooter /> */}
    </div>
  );
}
