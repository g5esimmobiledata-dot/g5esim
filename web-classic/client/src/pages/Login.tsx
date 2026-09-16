import { useState, useEffect } from 'react';
import {
  Mail,
  Lock,
  ArrowLeft,
  X,
  Gift,
  Globe,
  Shield,
  Zap,
  Clock,
  Eye,
  EyeOff,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Link, useLocation } from 'wouter';
import { useTranslation } from '@/contexts/TranslationContext';
import { useQuery } from '@tanstack/react-query';
import { useSettingByKey } from '@/hooks/useSettings';
import { signInWithGoogle } from "@/lib/firebase";
import { FcGoogle } from 'react-icons/fc';
import ReCAPTCHA from 'react-google-recaptcha';
import { useRef } from 'react';


interface ReferralSettings {
  enabled: boolean;
  referredUserDiscount: string;
}

interface PublicSettings {
  registration_bonus_enabled?: string;
  registration_bonus_amount?: string;
  currency?: string;
}

import { SEOHead } from '@/components/SEOHead';

function getSafeRedirectPath(fallback = '/account/dashboard') {
  const redirect = new URLSearchParams(window.location.search).get('redirect');
  if (!redirect) return fallback;

  if (redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.startsWith('/login')) {
    if (redirect === '/account' || redirect === '/account/' || redirect === '/account/profile' || redirect === '/profile') {
      return '/account/dashboard';
    }

    return redirect;
  }

  return fallback;
}

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showSigninPassword, setShowSigninPassword] = useState(false);
  const [signupStep, setSignupStep] = useState<'email' | 'otp' | 'details'>('email');
  const [forgotStep, setForgotStep] = useState<'email' | 'reset'>('email');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorOtp, setTwoFactorOtp] = useState('');
  const [showTwoFactorOtp, setShowTwoFactorOtp] = useState(false);
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [showReferralBanner, setShowReferralBanner] = useState(false);

  const recaptchaRef = useRef<ReCAPTCHA | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);


  const VITE_RECAPTCHA_SITE_KEY = useSettingByKey('recaptcha_site_key');
  const RecaptchaEnabled = useSettingByKey('recaptcha_enabled');

  const isCaptchaEnabled = RecaptchaEnabled === 'true' || RecaptchaEnabled === true;

  console.log('VITE_RECAPTCHA_SITE_KEY', VITE_RECAPTCHA_SITE_KEY);
  console.log('RecaptchaEnabled', RecaptchaEnabled);

  const logo = useSettingByKey('logo');
  const platformName = useSettingByKey('platform_name') || 'G5eSIM Mobile';
  const platformTagline = useSettingByKey('platform_tagline') || 'Remove the boundaries';

  const { data: settings } = useQuery<ReferralSettings>({
    queryKey: ['/api/referrals/settings'],
  });

  const { data: publicSettings } = useQuery<PublicSettings>({
    queryKey: ['/api/public/settings'],
  });

  const registrationBonusAmount = Number(publicSettings?.registration_bonus_amount || 0);
  const registrationBonusEnabled =
    publicSettings?.registration_bonus_enabled === 'true' && registrationBonusAmount > 0;

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');

    if (refCode) {
      const upperRefCode = refCode.toUpperCase();
      setReferralCode(upperRefCode);
      setShowReferralBanner(true);
      localStorage.setItem('pendingReferralCode', upperRefCode);
    }
  }, []);

  const resetForms = () => {
    setSignupStep('email');
    setForgotStep('email');
    setShowForgotPassword(false);
    setShowSigninPassword(false);
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setName('');
  };

  // ✅ Cleanup effect
  useEffect(() => {
    return () => {
      setIsLoading(false);
    };
  }, []);


  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: t('common.error', 'Error'),
        description: t('website.login.enterEmailPassword', 'Please enter email and password'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isCaptchaEnabled && !captchaToken) {
        toast({
          title: t('website.login.captchaRequired', 'Captcha Required'),
          description: t('website.login.verifyHuman', 'Please verify you are human'),
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      await apiRequest('POST', '/api/auth/login-password', {
        email,
        password,
        ...(showTwoFactorOtp && twoFactorOtp ? { twoFactorOtp } : {}),
        captchaToken,
      });

      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });

      // Clear form
      setEmail('');
      setPassword('');
      setTwoFactorOtp('');
      setShowTwoFactorOtp(false);
      recaptchaRef.current?.reset();
      setCaptchaToken(null);

      toast({
        title: t('common.success', 'Success!'),
        description: t('website.login.loginSuccess', 'Login successful! Redirecting...'),
        duration: 1500,
      });


      const timer2 = setTimeout(() => {
        const redirectPath = getSafeRedirectPath('/account/dashboard');
        if (`${window.location.pathname}${window.location.search}` !== redirectPath) {
          window.location.href = redirectPath;
        }
      }, 1200);

      return () => {
        // clearTimeout(timer1);
        clearTimeout(timer2);
      };
    } catch (error: any) {
      let errorMessage = 'Invalid email or password';
      try {
        const match = error.message?.match(/\d+:\s*(.+)/);
        if (match) {
          const parsed = JSON.parse(match[1]);
          errorMessage = parsed.message || errorMessage;
        }
      } catch { }

      toast({
        title: t('website.login.loginFailed', 'Login Failed'),
        description: errorMessage,
        variant: 'destructive',
        duration: 5000,
      });

      if (errorMessage.toLowerCase().includes('authenticator')) {
        setShowTwoFactorOtp(true);
      } else if (errorMessage.toLowerCase().includes('two-factor')) {
        setShowTwoFactorOtp(true);
        try {
          await apiRequest('POST', '/api/auth/send-otp', { email, purpose: 'login' });
          toast({
            title: '2FA Code Sent',
            description: 'Enter the verification code sent to your email.',
          });
        } catch {
          // Keep the original login error visible.
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendSignupOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      await apiRequest('POST', '/api/auth/send-otp', { email, purpose: 'login' });
      setSignupStep('otp');
      toast({
        title: t('checkout.otpSent', 'OTP Sent'),
        description: t('checkout.checkEmail', 'Check your email for the verification code.'),
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send OTP',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySignupOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;

    setIsLoading(true);
    try {
      const res = await apiRequest('POST', '/api/auth/verify-otp', { email, otp });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Invalid OTP code');
      }

      setSignupStep('details');
      toast({
        title: t('website.login.emailVerified', 'Email Verified'),
        description: t('website.login.completeSetupMsg', 'Now complete your account setup'),
      });
    } catch (error: any) {
      toast({
        title: t('common.error', 'Error'),
        description: error.message || 'Invalid OTP code',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !newPassword || !confirmPassword) return;

    if (newPassword !== confirmPassword) {
      toast({
        title: t('common.error', 'Error'),
        description: t('website.login.passwordNotMatch', 'Passwords do not match'),
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: t('common.error', 'Error'),
        description: t('website.login.passwordMinLength', 'Password must be at least 8 characters'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest('PATCH', '/api/user/profile', { name });

      await apiRequest('POST', '/api/auth/set-password', {
        name: name,
        password: newPassword,
        confirmPassword: confirmPassword,
      });

      const pendingCode = localStorage.getItem('pendingReferralCode');
      if (pendingCode) {
        try {
          await apiRequest('POST', '/api/referrals/signup', {
            code: pendingCode,
          });

          localStorage.removeItem('pendingReferralCode');
        } catch (refError) {
          console.log('referror', refError);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });

      toast({
        title: t('website.login.accountCreated', 'Account Created'),
        description: t('website.login.accountReady', 'Your account is ready!'),
      });

      setLocation(getSafeRedirectPath('/account/dashboard'));
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to complete signup',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      await apiRequest('POST', '/api/auth/forgot-password', { email });
      setForgotStep('reset');
      toast({
        title: t('website.login.resetCodeSent', 'Reset Code Sent'),
        description: t(
          'website.login.resetCodeSentDesc',
          'If an account exists, a reset code has been sent to your email.'
        ),
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send reset code',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !newPassword || !confirmPassword) return;

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest('POST', '/api/auth/reset-password', {
        email,
        otp,
        newPassword,
        confirmPassword,
      });

      toast({
        title: t('website.login.passwordReset', 'Password Reset'),
        description: t(
          'website.login.passwordResetDesc',
          'Your password has been reset. You can now login.'
        ),
      });

      setShowForgotPassword(false);
      resetForms();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset password',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const platformBenefits = [
    {
      icon: Globe,
      title: t('website.login.globalCoverage', 'Global Coverage'),
      description: t(
        'website.login.globalCoverageDesc',
        'Access mobile data in 190+ countries worldwide'
      ),
    },
    {
      icon: Zap,
      title: t('website.login.instantActivation', 'Instant Activation'),
      description: t(
        'website.login.instantActivationDesc',
        'Get connected in seconds with QR code setup'
      ),
    },
    {
      icon: Shield,
      title: t('website.login.secureReliable', 'Secure & Reliable'),
      description: t(
        'website.login.secureReliableDesc',
        'Enterprise-grade security for your data'
      ),
    },
    {
      icon: Clock,
      title: t('website.login.support247', '24/7 Support'),
      description: t(
        'website.login.support247Desc',
        'Our team is always here to help you'
      ),
    }
  ];






  const handleGoogleLogin = async () => {
    setIsLoading(true);

    try {
      const result =
        await signInWithGoogle();

      const idToken =
        await result.user.getIdToken();

      await apiRequest(
        "POST",
        "/api/auth/web/login-with-google",
        {
          idToken,
          referralCode:
            localStorage.getItem(
              "pendingReferralCode"
            ),
        }
      );

      window.location.href = getSafeRedirectPath('/account/dashboard');
    } catch (err) {
      console.error(
        "Google login error",
        err
      );

      toast({
        title: t('website.login.googleLoginUnavailable', 'Google login unavailable'),
        description:
          err instanceof Error
            ? err.message
            : t('website.login.googleLoginFailed', 'Google login failed. Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderGoogleLoginOption = () => (
    <>
      <div className="didww-auth-divider">
        <span className="didww-auth-divider-line" />
        <span className="didww-auth-divider-text">
          {t('website.login.orContinueWith', 'OR CONTINUE WITH')}
        </span>
        <span className="didww-auth-divider-line" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="didww-google-login w-full"
        onClick={handleGoogleLogin}
        disabled={isLoading}
        data-testid="button-google-login"
      >
        <FcGoogle className="didww-google-login-icon" />
        <span className="didww-google-login-label">
          {t('login.continueGoogle', 'Continue with Google')}
        </span>
      </Button>
    </>
  );




  return (
    <div className="didww-auth-page flex min-h-screen bg-white text-slate-950">
      {/* Left Side - Brand Panel */}
      <div className="didww-auth-brand relative hidden flex-1 overflow-hidden p-12 lg:flex lg:flex-col lg:items-center lg:justify-center">
        <Link href="/">
          <div className="cursor-pointer text-center text-white" data-testid="link-logo">
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

      {/* Right Side - Auth Forms */}
      <div className="didww-auth-panel flex min-h-screen w-full items-start justify-center bg-white p-6 text-slate-950 lg:w-[448px] lg:flex-none lg:p-8">
        <div className="flex min-h-[calc(100vh-4rem)] w-full max-w-[386px] flex-col">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/">
              <div
                className="inline-flex items-center gap-2 cursor-pointer"
                data-testid="link-logo-mobile"
              >
                <Globe className="h-8 w-8 text-[#204a83]" />
                <span className="text-2xl font-semibold text-slate-950">{platformName}</span>
              </div>
            </Link>
          </div>

          <Link href="/">
            <div
              className="hidden"
              data-testid="link-back-home"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('checkout.backToHome', 'Back to Home')}
            </div>
          </Link>

          <div className="hidden">
            <h2 className="text-2xl font-semibold text-white">{t('website.login.welcome', "Welcome")}</h2>
            <p className="mt-1 text-slate-400">
              {t('website.login.subtitle', 'Sign in to your account or create a new one')}
            </p>
          </div>

          {/* Referral Banner */}
          {showReferralBanner && referralCode && (
            <Alert
              className="relative mb-6 border-teal-300/30 bg-teal-300/10 text-slate-100"
              data-testid="alert-referral-banner"
            >
              <Gift className="h-4 w-4 text-teal-300" />
              <AlertDescription className="pr-8">
                <span className="font-semibold text-teal-200">
                  {t('referrals.youveBeenReferred', {
                    discount: settings?.referredUserDiscount || 0,
                  })}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 h-6 w-6 text-slate-300 hover:bg-teal-300/10 hover:text-white"
                  onClick={() => {
                    setShowReferralBanner(false);
                    localStorage.removeItem('pendingReferralCode');
                  }}
                  data-testid="button-dismiss-referral"
                >
                  <X className="h-4 w-4" />
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <Tabs
            value={authTab}
            onValueChange={(v) => {
              setAuthTab(v as any);
              resetForms();
            }}
          >
            <TabsList className="didww-auth-tabs grid w-full grid-cols-2 border-b border-slate-200 bg-transparent p-0">
              <TabsTrigger value="signin" className="rounded-none border-b-2 border-transparent bg-transparent py-4 text-slate-900 shadow-none data-[state=active]:border-[#2f63ad] data-[state=active]:bg-transparent data-[state=active]:text-[#064a9f] data-[state=active]:shadow-none" data-testid="tab-signin">
                {t('website.login.signin', 'Sign in')}
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-none border-b-2 border-transparent bg-transparent py-4 text-slate-900 shadow-none data-[state=active]:border-[#2f63ad] data-[state=active]:bg-transparent data-[state=active]:text-[#064a9f] data-[state=active]:shadow-none" data-testid="tab-signup">
                {t('website.login.register', 'Register')}
              </TabsTrigger>
            </TabsList>

            {/* Sign In - Password with Forgot Password Flow */}
            <TabsContent value="signin">
              {!showForgotPassword ? (
                <form
                  onSubmit={(event) => {
                    if (!showSigninPassword) {
                      event.preventDefault();
                      if (!email.trim()) {
                        toast({
                          title: t('common.error', 'Error'),
                          description: t('website.login.emailRequired', 'Please enter your email'),
                          variant: 'destructive',
                        });
                        return;
                      }
                      setShowSigninPassword(true);
                      return;
                    }
                    handlePasswordLogin(event);
                  }}
                  className="didww-login-form space-y-6 bg-white p-0 shadow-none"
                >
                  <div className="relative">
                    <label htmlFor="email-signin" className="sr-only">
                      {t('website.login.email', "Email")}
                    </label>
                    <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    <Input
                      id="email-signin"
                      type="email"
                      placeholder={t('website.login.email', 'Email')}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (showSigninPassword) setShowSigninPassword(false);
                      }}
                      className="didww-login-input bg-white pl-12 text-slate-950 placeholder:text-slate-400"
                      autoComplete="email"
                      required
                      data-testid="input-email-signin"
                    />
                  </div>

                  {showSigninPassword && (
                    <div className="relative">
                      <label htmlFor="password-signin" className="sr-only">
                        {t('website.login.password', 'Password')}
                      </label>
                      <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                      <Input
                        id="password-signin"
                        type={showPassword ? 'text' : 'password'}
                        placeholder={t('website.login.enterPassword', 'Enter your password')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="didww-login-input bg-white pl-12 pr-12 text-slate-950 placeholder:text-slate-400"
                        autoComplete="current-password"
                        required
                        data-testid="input-password-signin"
                      />
                      <button
                        type="button"
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#2f63ad]"
                        onClick={() => setShowPassword(!showPassword)}
                        data-testid="button-toggle-password"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  )}

                  {showTwoFactorOtp && (
                    <Input
                      id="two-factor-otp"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Enter 6-digit code"
                      value={twoFactorOtp}
                      onChange={(event) => setTwoFactorOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="didww-login-input bg-white text-center text-slate-950 tracking-[0.4em]"
                      data-testid="input-two-factor-otp"
                    />
                  )}

                  {isCaptchaEnabled && VITE_RECAPTCHA_SITE_KEY && showSigninPassword && (
                    <div className="w-full flex justify-center overflow-hidden">
                      <div className="transform scale-90 sm:scale-100 origin-center">
                        <ReCAPTCHA
                          ref={recaptchaRef}
                          sitekey={VITE_RECAPTCHA_SITE_KEY}
                          onChange={(token) => setCaptchaToken(token)}
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="didww-login-submit w-full"
                    disabled={isLoading}
                    data-testid="button-signin"
                  >
                    {showSigninPassword
                      ? isLoading
                        ? t('website.login.signingIn', 'Signing in...')
                        : t('website.login.signInButton', 'Sign in')
                      : t('common.continue', 'Continue')}
                  </Button>

                  {renderGoogleLoginOption()}

                  <button
                    type="button"
                    className="mx-auto block text-sm font-medium text-[#2f63ad] hover:underline"
                    onClick={() => setShowForgotPassword(true)}
                    data-testid="link-forgot-password"
                  >
                    {t('website.login.forgotPassword', 'Forgot password?')}
                  </button>
                </form>
              ) : (
                <Card className="didww-auth-card border-0 bg-white text-slate-950 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-white">
                      {forgotStep === 'email' ? t('website.login.resetPassword', 'Reset Password') : t('website.login.setNewPassword', 'Set New Password')}
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      {forgotStep === 'email'
                        ? t('website.login.enterEmailReset', 'Enter your email to receive a reset code')
                        : t('website.login.enterCodePassword', `Enter the code sent to ${email} and your new password`)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {forgotStep === 'email' ? (
                      <form onSubmit={handleForgotPassword} className="space-y-4">
                        <div>
                          <label htmlFor="email-forgot" className="text-sm font-medium mb-2 block">
                            Email
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                              id="email-forgot"
                              type="email"
                              placeholder="you@example.com"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="didww-login-input bg-white pl-10 text-slate-950 placeholder:text-slate-400"
                              autoComplete="email"
                              required
                              data-testid="input-email-forgot"
                            />
                          </div>
                        </div>
                        <Button
                          type="submit"
                            className="didww-login-submit w-full"
                          disabled={isLoading}
                          data-testid="button-forgot-submit"
                        >
                          {isLoading ? t('website.login.sending', 'Sending...') : t('website.login.sendResetCode', 'Send Reset Code')}
                        </Button>
                        <p className="didww-auth-switch mt-2 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-center text-sm text-slate-500">
                        {t("website.login.rememberPassword", "Remember your password?")}{' '}
                          <button
                            type="button"
                            className="inline-flex h-auto items-center bg-transparent p-0 text-sm font-medium text-[#2f63ad] hover:bg-transparent hover:underline"
                            onClick={() => {
                              setShowForgotPassword(false);
                              resetForms();
                            }}
                            data-testid="link-back-signin"
                          >
                            {t("website.login.signInButtonSign", "Sign in")}
                          </button>
                        </p>
                      </form>
                    ) : (
                      <form onSubmit={handleResetPassword} className="space-y-4">
                        <div>
                          <label htmlFor="reset-otp" className="text-sm font-medium mb-2 block">
                            {t('website.login.resetCode', 'Reset Code')}
                          </label>
                          <Input
                            id="reset-otp"
                            type="text"
                            placeholder="Enter 6-digit code"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            maxLength={6}
                            className="border-slate-700 bg-[#09142a] text-center text-lg tracking-widest text-white placeholder:text-slate-500"
                            autoComplete="one-time-code"
                            required
                            data-testid="input-reset-otp"
                          />
                        </div>
                        <div>
                          <label htmlFor="new-password" className="text-sm font-medium mb-2 block">
                            {t('website.login.newPassword', 'New Password')}
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                              id="new-password"
                              type={showNewPassword ? 'text' : 'password'}
                              placeholder="Min 8 characters"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="border-slate-700 bg-[#09142a] pl-10 pr-10 text-white placeholder:text-slate-500"
                              autoComplete="new-password"
                              required
                              data-testid="input-new-password"
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              data-testid="button-toggle-new-password"
                            >
                              {showNewPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label
                            htmlFor="confirm-password-reset"
                            className="text-sm font-medium mb-2 block"
                          >
                            {t('website.login.confirmPassword', 'Confirm Password')}
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                              id="confirm-password-reset"
                              type={showConfirmPassword ? 'text' : 'password'}
                              placeholder="Confirm your new password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="border-slate-700 bg-[#09142a] pl-10 pr-10 text-white placeholder:text-slate-500"
                              autoComplete="new-password"
                              required
                              data-testid="input-confirm-password-reset"
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              data-testid="button-toggle-confirm-password-reset"
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                        <Button
                          type="submit"
                          className="w-full bg-teal-400 text-slate-950 hover:bg-teal-300"
                          disabled={isLoading}
                          data-testid="button-reset-password"
                        >
                          {isLoading ? 'Resetting...' : 'Reset Password'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full text-slate-300 hover:bg-slate-800 hover:text-white"
                          onClick={() => setForgotStep('email')}
                          data-testid="button-back-forgot"
                        >
                          Use different email
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Sign Up - OTP then Name/Password */}
            <TabsContent value="signup">
              <Card className="didww-auth-card border-0 bg-white text-slate-950 shadow-none">
                <CardHeader>
                  <CardTitle className="text-white">
                    {signupStep === 'email' && t('website.login.createAccount', 'Create Account')}
                    {signupStep === 'otp' && 'Verify Email'}
                    {signupStep === 'details' && 'Complete Setup'}
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    {signupStep === 'email' && t('website.login.enterEmailStart', 'Enter your email to get started')}
                    {signupStep === 'otp' && `Enter the code sent to ${email}`}
                    {signupStep === 'details' && 'Enter your name and create a password'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {registrationBonusEnabled && (
                    <Alert className="mb-4 border-teal-300/30 bg-teal-300/10 text-slate-100">
                      <Gift className="h-4 w-4 text-teal-300" />
                      <AlertDescription>
                        New Customers get ${registrationBonusAmount.toFixed(2)} wallet credit after registration.
                      </AlertDescription>
                    </Alert>
                  )}

                  {signupStep === 'email' && (
                    <form onSubmit={handleSendSignupOTP} className="space-y-4">
                      <div>
                        <label htmlFor="email-signup" className="text-sm font-medium mb-2 block">
                          Email
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <Input
                            id="email-signup"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="didww-login-input bg-white pl-10 text-slate-950 placeholder:text-slate-400"
                            autoComplete="email"
                            required
                            data-testid="input-email-signup"
                          />
                        </div>
                      </div>
                      <Button
                        type="submit"
                        className="didww-login-submit w-full"
                        disabled={isLoading}
                        data-testid="button-send-signup-otp"
                      >
                        {isLoading ? 'Sending...' : 'Continue'}
                      </Button>

                      {renderGoogleLoginOption()}

                      <p className="didww-auth-switch mt-2 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-center text-sm text-slate-500">
                        {t("website.checkout.haveAccount", "Already have an account?")}{' '}
                        <button
                          type="button"
                          className="inline-flex h-auto items-center bg-transparent p-0 text-sm font-medium text-[#2f63ad] hover:bg-transparent hover:underline"
                          onClick={() => {
                            setAuthTab('signin');
                            resetForms();
                          }}
                          data-testid="link-goto-signin"
                        >
                          {t('website.login.signin', 'Sign in')}
                        </button>
                      </p>
                    </form>
                  )}

                  {signupStep === 'otp' && (
                    <form onSubmit={handleVerifySignupOTP} className="space-y-4">
                      <div>
                        <label htmlFor="otp-signup" className="text-sm font-medium mb-2 block">
                          Verification Code
                        </label>
                        <Input
                          id="otp-signup"
                          type="text"
                          placeholder="Enter 6-digit code"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          maxLength={6}
                          className="didww-login-input bg-white text-center text-slate-950 placeholder:text-slate-400"
                          autoComplete="one-time-code"
                          required
                          data-testid="input-otp-signup"
                        />
                      </div>
                      <Button
                        type="submit"
                        className="didww-login-submit w-full"
                        disabled={isLoading}
                        data-testid="button-verify-signup-otp"
                      >
                        {isLoading ? 'Verifying...' : 'Verify Email'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full text-slate-300 hover:bg-slate-800 hover:text-white"
                        onClick={() => setSignupStep('email')}
                        data-testid="button-back-signup-email"
                      >
                        Use different email
                      </Button>
                    </form>
                  )}

                  {signupStep === 'details' && (
                    <form onSubmit={handleCompleteSignup} className="space-y-4">
                      <div>
                        <label htmlFor="name-signup" className="text-sm font-medium mb-2 block">
                          Full Name
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <Input
                            id="name-signup"
                            type="text"
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="didww-login-input bg-white pl-10 text-slate-950 placeholder:text-slate-400"
                            autoComplete="name"
                            required
                            data-testid="input-name-signup"
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="password-signup" className="text-sm font-medium mb-2 block">
                          Password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <Input
                            id="password-signup"
                            type={showNewPassword ? 'text' : 'password'}
                            placeholder="Min 8 characters"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="didww-login-input bg-white pl-10 pr-10 text-slate-950 placeholder:text-slate-400"
                            autoComplete="new-password"
                            required
                            data-testid="input-password-signup"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            data-testid="button-toggle-password-signup"
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label
                          htmlFor="confirm-password-signup"
                          className="text-sm font-medium mb-2 block"
                        >
                          Confirm Password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <Input
                            id="confirm-password-signup"
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Confirm your password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="didww-login-input bg-white pl-10 pr-10 text-slate-950 placeholder:text-slate-400"
                            autoComplete="new-password"
                            required
                            data-testid="input-confirm-password-signup"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            data-testid="button-toggle-confirm-password"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <Button
                        type="submit"
                        className="didww-login-submit w-full"
                        disabled={isLoading}
                        data-testid="button-complete-signup"
                      >
                        {isLoading ? 'Creating Account...' : 'Create Account'}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>




          <div className="mt-auto grid grid-cols-3 gap-3 pt-10 text-center text-sm text-[#2f63ad]">
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
