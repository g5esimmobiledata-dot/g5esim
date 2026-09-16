import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock, Mail } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useTranslation } from '@/contexts/TranslationContext';
import { SEOHead } from '@/components/SEOHead';
import { useSettingByKey } from '@/hooks/useSettings';

export default function AdminLogin() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await apiRequest('POST', '/api/admin/login', {
        email,
        password,
      });

      const response: any = await res.json();

      const admin = response?.data?.admin;

      if (!admin) {
        throw new Error('Invalid login response');
      }

      toast({
        title: t('admin.login.loginSuccessTitle', 'Login Successful'),
        description: t('admin.login.loginSuccessDesc', 'Welcome back, {{name}}!').replace(
          '{{name}}',
          admin.name,
        ),
      });

      // refresh admin auth state
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/me'] });

      setLocation('/admin/dashboard');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('admin.login.loginFailedTitle', 'Login Failed'),
        description: error.message || t('admin.login.loginFailedDesc', 'Invalid email or password'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginOLD = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await apiRequest('POST', '/api/admin/login', {
        email,
        password,
      });
      const response: any = await res.json();

      toast({
        title: t('admin.login.loginSuccessTitle', 'Login Successful'),
        description: t('admin.login.loginSuccessDesc', 'Welcome back, {{name}}!').replace(
          '{{name}}',
          response.admin.name,
        ),
      });

      // Invalidate admin auth cache so AdminGuard gets fresh data
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/me'] });

      setLocation('/admin/dashboard');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('admin.login.loginFailedTitle', 'Login Failed'),
        description: error.message || t('admin.login.loginFailedDesc', 'Invalid email or password'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const showDemoLogin = useSettingByKey('show_demo_login');
  const logo = useSettingByKey('logo');
  const platformName = useSettingByKey('platform_name') || 'G5eSIM Mobile';
  const platformTagline = useSettingByKey('platform_tagline') || 'Remove the boundaries';

  return (
    <div className="didww-auth-page flex min-h-screen bg-white text-slate-950">
      <SEOHead
        title={String(t('admin.login.pageTitle', 'Admin Login'))}
        description={String(t('admin.login.description', 'Enter your credentials to access the admin panel'))}
        noIndex={true}
        noFollow={true}
      />

      <div className="didww-auth-brand relative hidden flex-1 overflow-hidden p-12 lg:flex lg:flex-col lg:items-center lg:justify-center">
        <Link href="/">
          <div className="cursor-pointer text-center text-white">
            {logo ? (
              <img className="mx-auto max-h-28 max-w-[380px] object-contain" src={logo} alt={platformName} />
            ) : (
              <h1 className="text-6xl font-semibold tracking-[0.04em] text-white xl:text-7xl">
                {platformName}
              </h1>
            )}
            <p className="mt-4 text-2xl font-light tracking-tight text-white/95 xl:text-3xl">
              {platformTagline}
            </p>
          </div>
        </Link>

        <p className="absolute bottom-8 left-0 right-0 text-center text-xs text-white/70">
          Copyright 2026 {platformName}. All rights reserved.
        </p>
      </div>

      <div className="didww-auth-panel flex min-h-screen w-full items-start justify-center bg-white p-6 text-slate-950 lg:w-[448px] lg:flex-none lg:p-8">
        <div className="flex min-h-[calc(100vh-4rem)] w-full max-w-[386px] flex-col">
          <Card className="didww-admin-login-card mt-[30vh] border-0 bg-white text-slate-950 shadow-none">
            <CardHeader className="hidden">
              <CardTitle className="text-2xl text-center" data-testid="text-admin-login-title">
                {t('admin.login.title', 'Admin Login')}
              </CardTitle>
              <CardDescription className="text-center text-slate-600">
                {t('admin.login.description', 'Enter your credentials to access the admin panel')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <form onSubmit={handleLogin} className="didww-admin-login-form space-y-6 bg-white p-0 shadow-none">
                <div className="sr-only">
                  <Label htmlFor="email" className="text-slate-900">
                    {t('admin.login.emailLabel', 'Email')}
                  </Label>
                </div>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    className="admin-login-input didww-login-input bg-white pl-12 text-slate-950 placeholder:text-slate-400"
                    placeholder={t('admin.login.emailPlaceholder', 'admin@example.com')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    data-testid="input-admin-email"
                  />
                </div>

                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="password"
                    type="password"
                    className="admin-login-input didww-login-input bg-white pl-12 text-slate-950 placeholder:text-slate-400"
                    placeholder={t('admin.login.passwordPlaceholder', 'Enter your password')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    data-testid="input-admin-password"
                  />
                </div>

                <Button
                  type="submit"
                  className="didww-login-submit w-full"
                  disabled={isLoading}
                  data-testid="button-admin-login"
                >
                  {isLoading
                    ? t('admin.login.loggingIn', 'Logging in...')
                    : t('admin.login.loginButton', 'Login')}
                </Button>
              </form>

              {showDemoLogin === 'true' && (
                <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4 text-slate-950">
                  <p className="text-center text-sm text-slate-600">
                    {t('admin.login.testCredentialsTitle', 'Default credentials for testing:')}
                  </p>
                  <div className="mt-2 space-y-1 text-sm font-mono text-center">
                    <p>
                      {t('admin.login.testEmail', 'Email:')}{' '}
                      <span className="font-semibold">demo@diploy.in</span>
                    </p>
                    <p>
                      {t('admin.login.testPassword', 'Password:')}{' '}
                      <span className="font-semibold">Demo@123</span>
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-auto grid grid-cols-3 gap-3 pt-10 text-center text-xs text-[#2f63ad]">
            <Link href="/support">
              <span className="cursor-pointer hover:underline">Help and Support</span>
            </Link>
            <Link href="/pages/privacy-policy">
              <span className="cursor-pointer hover:underline">Privacy Notice</span>
            </Link>
            <Link href="/pages/terms-and-condition">
              <span className="cursor-pointer hover:underline">Terms & Agreements</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
