import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Gift, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type CurrentUser = {
  id: string;
  email: string;
  role?: string | null;
};

function formatVoucherCode(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1-');
}

function getRedeemCode() {
  const params = new URLSearchParams(window.location.search);
  const queryCode = params.get('code') || params.get('redeemVoucher') || params.get('voucherCode');
  if (queryCode) return formatVoucherCode(queryCode);

  const parts = window.location.pathname.split('/').filter(Boolean);
  const lastPart = parts[parts.length - 1] || '';
  if (lastPart && lastPart !== 'redeem-voucher' && lastPart !== 'redeem') {
    return formatVoucherCode(decodeURIComponent(lastPart));
  }

  return '';
}

async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const response = await fetch('/api/auth/me', { credentials: 'include' });
  if (response.status === 401) return null;
  if (!response.ok) return null;

  const json = await response.json();
  if (json && typeof json === 'object' && json.success === true && 'data' in json) {
    return json.data || null;
  }

  return json || null;
}

export default function VoucherRedeem() {
  const [, setLocation] = useLocation();
  const voucherCode = useMemo(getRedeemCode, []);
  const returnPath = `${window.location.pathname}${window.location.search}`;
  const { data: user, isLoading } = useQuery({
    queryKey: ['/api/auth/me', 'voucher-redeem'],
    queryFn: fetchCurrentUser,
    retry: false,
  });

  useEffect(() => {
    if (isLoading || !user || !voucherCode) return;

    const walletPath = user.role === 'reseller' ? '/reseller/wallet' : '/account/wallet';
    setLocation(`${walletPath}?redeemVoucher=${encodeURIComponent(voucherCode)}`);
  }, [isLoading, setLocation, user, voucherCode]);

  const loginUrl = `/login?redirect=${encodeURIComponent(returnPath)}`;

  if (!voucherCode) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Voucher Link Missing</CardTitle>
            <CardDescription>This QR code does not include a voucher code.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/account/wallet">Open Wallet</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || user) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <CardTitle>Opening Voucher</CardTitle>
            <CardDescription>We are preparing your wallet redemption.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Gift className="h-6 w-6" />
          </div>
          <CardTitle>Redeem Wallet Voucher</CardTitle>
          <CardDescription>Sign in or create an account to add this voucher to your wallet.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-muted/40 p-3 text-center font-mono text-sm">
            {voucherCode}
          </div>
          <Button asChild className="w-full">
            <Link href={loginUrl}>Sign In to Redeem</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
