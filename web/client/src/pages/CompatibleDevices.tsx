import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Smartphone, Check, Search } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/contexts/TranslationContext';

type ApiDevice = {
  os: 'android' | 'ios';
  brand: string;
  name: string;
};

type DeviceCategory = {
  brand: string;
  models: string[];
};

async function fetchDevices(): Promise<ApiDevice[]> {
  const res = await fetch('/api/devices');

  if (!res.ok) {
    throw new Error('Failed to fetch devices');
  }

  const json = await res.json();
  return json.data;
}

function groupDevices(
  devices: ApiDevice[],
  os?: 'android' | 'ios',
): DeviceCategory[] {
  const map = new Map<string, Set<string>>();

  devices
    .filter(device => (os ? device.os === os : true))
    .forEach(device => {
      const brand = device.brand.trim().toUpperCase();
      const model = device.name.trim();

      if (!map.has(brand)) {
        map.set(brand, new Set());
      }

      map.get(brand)!.add(model);
    });

  return Array.from(map.entries())
    .map(([brand, models]) => ({
      brand,
      models: Array.from(models).sort(),
    }))
    .sort((a, b) => a.brand.localeCompare(b.brand));
}

function filterDevices(
  devices: DeviceCategory[],
  query: string,
): DeviceCategory[] {
  if (!query.trim()) return devices;

  const q = query.toLowerCase();

  return devices
    .map(category => {
      const brandMatch = category.brand.toLowerCase().includes(q);
      const matchedModels = category.models.filter(model =>
        model.toLowerCase().includes(q),
      );

      if (brandMatch) return category;
      if (matchedModels.length > 0) {
        return { ...category, models: matchedModels };
      }

      return null;
    })
    .filter(Boolean) as DeviceCategory[];
}

export default function CompatibleDevices() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['devices'],
    queryFn: fetchDevices,
    staleTime: 1000 * 60 * 60,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <p className="text-muted-foreground">Loading compatible devices...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <p className="text-destructive">Failed to load devices</p>
      </div>
    );
  }

  const iosDevices = filterDevices(groupDevices(data, 'ios'), search);
  const androidDevices = filterDevices(groupDevices(data, 'android'), search);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 pb-28 pt-24 sm:px-6 sm:pt-32">
        <div className="mx-auto mb-12 flex max-w-3xl flex-col items-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
            <Smartphone className="h-9 w-9" />
          </div>
          <h1 className="mb-4 text-3xl font-bold text-foreground sm:text-5xl">
            {t('website.compatibleDevices.title', 'Compatible Devices')}
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
            {t('website.compatibleDevices.description', 'Check if your device supports eSIM technology')}
          </p>
        </div>

        <Card className="mb-8 border-border bg-card text-card-foreground shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-card-foreground">
              {t('website.compatibleDevices.howToCheck', 'How to Check eSIM Support')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InstructionStep
              number="1"
              title={t('website.compatibleDevices.iphoneUsers', 'iPhone Users')}
              text={t('website.compatibleDevices.iphoneInstructions', 'Go to Settings > Cellular/Mobile Data > Add Cellular Plan. If you see this option, your iPhone supports eSIM.')}
            />
            <InstructionStep
              number="2"
              title={t('website.compatibleDevices.androidUsers', 'Android Users')}
              text={t('website.compatibleDevices.androidInstructions', 'Dial *#06# to see your IMEI. If you see an EID number, your device supports eSIM.')}
            />
          </CardContent>
        </Card>

        <div className="mx-auto mb-12 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search by brand or model (e.g. iPhone, Galaxy S24)"
              className="border-input bg-background pl-9 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
            />
          </div>
        </div>

        {iosDevices.length > 0 && (
          <Section title="Apple (iOS)" devices={iosDevices} />
        )}

        {androidDevices.length > 0 && (
          <Section title="Android Devices" devices={androidDevices} />
        )}

        {iosDevices.length === 0 && androidDevices.length === 0 && (
          <p className="mt-10 text-center text-muted-foreground">
            No devices found for "{search}"
          </p>
        )}

        <Card className="mt-12 border-primary/20 bg-primary/10 text-foreground">
          <CardContent className="pt-6 text-center text-sm">
            {t(
              'website.compatibleDevices.notListed',
              "Don't see your device? Contact our support team to verify eSIM compatibility.",
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InstructionStep({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
        {number}
      </div>
      <div>
        <h3 className="mb-1 font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function Section({
  title,
  devices,
}: {
  title: string;
  devices: DeviceCategory[];
}) {
  return (
    <>
      <h2 className="mb-6 text-2xl font-semibold text-foreground">{title}</h2>

      <div className="mb-12 space-y-6">
        {devices.map(category => (
          <Card key={category.brand} className="border-border bg-card text-card-foreground shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <Check className="h-5 w-5 text-primary" />
                {category.brand}
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {category.models.map(model => (
                  <div
                    key={model}
                    className="rounded-md bg-muted p-3 text-sm text-foreground"
                  >
                    {model}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
