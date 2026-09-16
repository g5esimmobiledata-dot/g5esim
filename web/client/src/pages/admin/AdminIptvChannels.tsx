import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Ban, Film, ListVideo, Loader2, RefreshCw, Search, Tv } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

type ProviderName = 'iotv' | 'tvplus';
type ContentType = 'live' | 'vod' | 'series';

type ChannelCategory = {
  category: string;
  total: number;
  active: number;
  blocked: number;
};

type ChannelItem = {
  id: string;
  name: string;
  category: string;
  countryCode: string;
  quality: string;
  active: boolean;
  metadata?: Record<string, any>;
};

type ChannelContentResponse = {
  provider: ProviderName;
  contentType: ContentType;
  selectedCategory: string;
  categories: ChannelCategory[];
  channels: ChannelItem[];
  totals: { live: number; vod: number; series: number };
};

function initialProvider(): ProviderName {
  if (typeof window === 'undefined') return 'iotv';
  return new URLSearchParams(window.location.search).get('provider') === 'tvplus' ? 'tvplus' : 'iotv';
}

function providerDisplayName(provider: ProviderName) {
  return provider === 'iotv' ? 'IPTV Reseller Hub Provider' : 'TVPLUS';
}

function contentTypeLabel(contentType: ContentType) {
  if (contentType === 'vod') return 'Movies';
  if (contentType === 'series') return 'Series';
  return 'Live TV';
}

function channelLogo(channel: ChannelItem) {
  return String(channel.metadata?.streamIcon || channel.metadata?.icon || channel.metadata?.cover || channel.metadata?.logo || '').trim();
}

const lightPanelClass = 'overflow-hidden rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm';
const lightInputClass =
  'border-[#24445f] bg-[#071b35] text-white placeholder:text-slate-400 focus-visible:ring-teal-500';
const lightOutlineButtonClass =
  'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950';
const primaryButtonClass = 'bg-[#58cbbb] text-slate-950 hover:bg-[#47bcae]';

export default function AdminIptvChannels() {
  const { toast } = useToast();
  const [provider, setProvider] = useState<ProviderName>(initialProvider);
  const [contentType, setContentType] = useState<ContentType>('live');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');

  const contentQuery = useQuery<ChannelContentResponse>({
    queryKey: ['/api/admin/iptv/bouquets/content', { provider, contentType, category: selectedCategory, search }],
  });

  useEffect(() => {
    setSelectedCategory('');
  }, [provider, contentType]);

  const setProviderAndUrl = (next: ProviderName) => {
    setProvider(next);
    window.history.replaceState(null, '', `${window.location.pathname}?provider=${next}`);
  };

  const syncProviderContent = useMutation({
    mutationFn: async (source: 'player' | 'dino' = 'player') => {
      const response = await apiRequest('POST', '/api/admin/iptv/channels/sync', { provider, source });
      return response.json();
    },
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/admin/iptv/bouquets/content'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/iptv/channels'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/iptv/dashboard'] }),
      ]);
      const data = response?.data || {};
      toast({
        title: 'Channels synced',
        description: `${data.liveCount || 0} live, ${data.movieCount || 0} movies, and ${data.seriesCount || 0} series were synced.`,
      });
    },
    onError: (error: any) => {
      toast({ title: 'Sync failed', description: error.message || 'Could not sync provider content.', variant: 'destructive' });
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ category, active }: { category: string; active: boolean }) => {
      const response = await apiRequest('PATCH', '/api/admin/iptv/bouquets/category', { provider, contentType, category, active });
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/iptv/bouquets/content'] });
      toast({ title: 'Category saved', description: 'The channel category visibility was updated.' });
    },
    onError: (error: any) => {
      toast({ title: 'Save failed', description: error.message || 'Could not update this category.', variant: 'destructive' });
    },
  });

  const updateChannel = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const response = await apiRequest('PATCH', `/api/admin/iptv/channels/${id}`, { active });
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/iptv/bouquets/content'] });
    },
    onError: (error: any) => {
      toast({ title: 'Save failed', description: error.message || 'Could not update this channel.', variant: 'destructive' });
    },
  });

  const data = contentQuery.data;
  const categories = data?.categories || [];
  const activeCategory = selectedCategory || data?.selectedCategory || categories[0]?.category || '';
  const categoryRow = categories.find((item) => item.category === activeCategory);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Tv className="h-4 w-4" />
            IPTV Services
          </div>
          <h1 className="mt-2 text-3xl font-bold text-white">Channels</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Open provider channel categories, block a full category, or block individual channels one by one.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className={`h-10 rounded-md border px-3 text-sm ${lightInputClass}`}
            value={provider}
            onChange={(event) => setProviderAndUrl(event.target.value as ProviderName)}
          >
            <option value="iotv">IPTV Reseller Hub Provider</option>
            <option value="tvplus">TVPLUS</option>
          </select>
          {provider === 'iotv' && (
            <Button className={primaryButtonClass} onClick={() => syncProviderContent.mutate('player')} disabled={syncProviderContent.isPending}>
              {syncProviderContent.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Sync Reseller Hub Channels
            </Button>
          )}
          {provider === 'tvplus' && (
            <Button className={primaryButtonClass} onClick={() => syncProviderContent.mutate('player')} disabled={syncProviderContent.isPending}>
              {syncProviderContent.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Sync TVPLUS Player API
            </Button>
          )}
        </div>
      </div>

      <Card className={lightPanelClass}>
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-white p-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button className={contentType === 'live' ? primaryButtonClass : lightOutlineButtonClass} variant={contentType === 'live' ? 'default' : 'outline'} onClick={() => setContentType('live')}>
              Live TV ({data?.totals.live || 0})
            </Button>
            <Button className={contentType === 'vod' ? primaryButtonClass : lightOutlineButtonClass} variant={contentType === 'vod' ? 'default' : 'outline'} onClick={() => setContentType('vod')}>
              <Film className="mr-2 h-4 w-4" />
              Movies ({data?.totals.vod || 0})
            </Button>
            <Button className={contentType === 'series' ? primaryButtonClass : lightOutlineButtonClass} variant={contentType === 'series' ? 'default' : 'outline'} onClick={() => setContentType('series')}>
              Series ({data?.totals.series || 0})
            </Button>
          </div>
          <div className="relative min-w-[260px] xl:w-[520px]">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input className={`pl-9 ${lightInputClass}`} placeholder="Search e.g. USA, HBO, Sports, Formula..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
        </div>

        <div className="grid min-h-[34rem] lg:grid-cols-[320px_1fr]">
          <aside className="border-r border-slate-200 bg-slate-50 p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Categories</div>
              <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">{providerDisplayName(provider)}</Badge>
            </div>
            <div className="max-h-[42rem] space-y-2 overflow-y-auto pr-1">
              {categories.map((category) => {
                const active = category.category === activeCategory;
                const blocked = category.active === 0;
                return (
                  <button
                    key={category.category}
                    className={`flex w-full items-center justify-between rounded-md border px-3 py-3 text-left text-sm text-slate-800 transition ${active ? 'border-teal-500 bg-teal-50 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-100'} ${blocked ? 'opacity-60' : ''}`}
                    onClick={() => setSelectedCategory(category.category)}
                  >
                    <span className="min-w-0 truncate font-medium">{category.category || 'Uncategorized'}</span>
                    <span className="ml-2 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{category.total}</span>
                  </button>
                );
              })}
              {!contentQuery.isLoading && categories.length === 0 && (
                <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500">
                  {provider === 'tvplus'
                    ? 'No TVPLUS channels found. Import or create one real TVPLUS M3U account, then run Sync TVPLUS Player API.'
                    : 'No channel categories found. Sync the provider channels first.'}
                </div>
              )}
            </div>
          </aside>

          <section className="p-4">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  {contentTypeLabel(contentType)} - {activeCategory || 'No Category'}
                </h2>
                <p className="text-sm text-slate-500">
                  {categoryRow?.total || 0} item(s), {categoryRow?.blocked || 0} blocked
                </p>
              </div>
              {activeCategory && (
                <Button
                  className={categoryRow?.active === 0 ? primaryButtonClass : ''}
                  variant={categoryRow?.active === 0 ? 'default' : 'destructive'}
                  onClick={() => updateCategory.mutate({ category: activeCategory, active: categoryRow?.active === 0 })}
                  disabled={updateCategory.isPending}
                >
                  <Ban className="mr-2 h-4 w-4" />
                  {categoryRow?.active === 0 ? 'Unblock Category' : 'Block Category'}
                </Button>
              )}
            </div>

            {contentQuery.isLoading ? (
              <div className="flex min-h-[20rem] items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
                {(data?.channels || []).map((channel) => {
                  const logo = channelLogo(channel);
                  return (
                    <div key={channel.id} className={`flex min-h-[72px] items-center gap-3 rounded-md border p-3 text-slate-900 ${channel.active ? 'border-slate-200 bg-white hover:bg-slate-50' : 'border-rose-200 bg-rose-50 opacity-75'}`}>
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-700">
                        {logo ? <img src={logo} alt="" className="h-full w-full object-contain" /> : channel.quality || <ListVideo className="h-4 w-4 text-slate-500" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-950">{channel.name}</div>
                        <div className="truncate text-xs text-slate-500">{channel.category}</div>
                      </div>
                      <Switch checked={channel.active} onCheckedChange={(active) => updateChannel.mutate({ id: channel.id, active })} />
                    </div>
                  );
                })}
                {(data?.channels || []).length === 0 && (
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500 xl:col-span-2 2xl:col-span-3">
                    {provider === 'tvplus'
                      ? 'No TVPLUS channels found yet. TVPLUS Player API sync requires a real TVPLUS M3U username/password.'
                      : 'No channels found in this category.'}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </Card>
    </div>
  );
}
