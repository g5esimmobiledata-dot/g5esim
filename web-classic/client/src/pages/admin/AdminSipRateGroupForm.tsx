import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronDown, Layers, Loader2, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

type Mode = 'create' | 'edit';
type RateType = 'normal_user' | 'reseller' | 'agent';

type FormState = {
  name: string;
  rateTypes: RateType[];
  resellerAccountIds: string[];
  agentAccountIds: string[];
  providerId: string;
  routingPrefix: string;
  routingType: string;
  initialIncrement: string;
  increment: string;
  markupPercent: string;
  description: string;
  status: 'active' | 'inactive';
};

type RateGroupAssignee = {
  id: string;
  displayUserId?: number;
  email?: string;
  name?: string;
  phone?: string;
  role: 'agent' | 'reseller';
  label: string;
  parentId?: string | null;
  parentName?: string | null;
  parentEmail?: string | null;
  parentRole?: string | null;
  hierarchyLabel?: string;
};

type ConciergeOverview = {
  settings: Record<string, string>;
};

type SipProviderOption = {
  value: string;
  label: string;
  description: string;
  providerType: string;
  domain: string;
  transport: string;
  port: string;
  outboundProxy: string;
  status: string;
};

const initialForm: FormState = {
  name: '',
  rateTypes: ['normal_user'],
  resellerAccountIds: [],
  agentAccountIds: [],
  providerId: '',
  routingPrefix: '',
  routingType: 'LCR',
  initialIncrement: '0',
  increment: '60',
  markupPercent: '0',
  description: '',
  status: 'active',
};

const inputClass = 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-teal-500';
const selectClass = 'border-slate-300 bg-white text-slate-900 focus:ring-teal-500';
const selectContentClass = 'border-slate-200 bg-white text-slate-900 shadow-lg';
const selectItemClass =
  'text-slate-900 focus:bg-teal-100 focus:text-slate-950 data-[highlighted]:bg-teal-100 data-[highlighted]:text-slate-950 data-[state=checked]:bg-teal-600 data-[state=checked]:text-white [&_svg]:text-current';
const primaryButtonClass = 'gap-2 bg-[#58cbbb] text-slate-950 hover:bg-[#47bcae]';
const outlineButtonClass = 'gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950';
const shellClass = 'rounded-md bg-white p-5 text-slate-950 shadow-sm lg:p-6';
const compactInputClass = 'h-8 rounded-md border-slate-700 bg-slate-950 text-sm text-white placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-teal-500';
const compactSelectClass = 'h-8 rounded-md border-slate-700 bg-slate-950 text-sm text-white focus:ring-1 focus:ring-teal-500 [&>span]:text-white';
const compactMultiTriggerClass = 'flex h-8 w-full items-center justify-between rounded-md border border-slate-700 bg-slate-950 px-3 text-left text-sm font-normal text-white hover:bg-slate-900';
const multiSelectContentClass = 'w-[var(--radix-dropdown-menu-trigger-width)] min-w-72 border-slate-200 bg-white text-slate-900 shadow-lg';
const multiSelectItemClass = 'cursor-pointer rounded-md py-2 pl-8 pr-3 text-sm text-slate-900 focus:bg-teal-100 focus:text-slate-950 data-[state=checked]:bg-teal-600 data-[state=checked]:text-white';
const compactLabelClass = 'text-sm font-medium text-slate-950';
const quickPrimaryButtonClass = 'h-8 gap-2 rounded-md border border-teal-500 bg-teal-50 px-4 text-sm font-medium text-teal-700 hover:bg-teal-100';
const quickSecondaryButtonClass = 'h-8 rounded-md border border-slate-100 bg-slate-100 px-4 text-sm font-medium text-slate-900 hover:bg-slate-200';
const rateTypeOptions: Array<{ value: RateType; label: string }> = [
  { value: 'normal_user', label: 'Normal User' },
  { value: 'reseller', label: 'Reseller' },
  { value: 'agent', label: 'Agent' },
];

const routingPolicies: Record<string, { label: string; routeOrder: string; priority: string[] }> = {
  LCR: {
    label: 'LCR - Cheapest First',
    routeOrder: 'cheapest_first_then_quality',
    priority: ['lowest_cost', 'highest_quality'],
  },
  Quality: {
    label: 'Quality First',
    routeOrder: 'quality_first_then_cost',
    priority: ['highest_quality', 'lowest_cost'],
  },
  Balanced: {
    label: 'Balanced Cost / Quality',
    routeOrder: 'balanced_cost_quality',
    priority: ['lowest_cost', 'highest_quality'],
  },
  Manual: {
    label: 'Manual Priority',
    routeOrder: 'manual_priority',
    priority: ['manual_priority'],
  },
};

async function unwrap<T>(response: Response): Promise<T> {
  const payload = await response.json();
  return (payload?.data ?? payload) as T;
}

function parseError(error: Error) {
  return error.message.replace(/^\d+:\s*/, '');
}

function rateTypeLabel(value: RateType) {
  if (value === 'reseller') return 'Reseller';
  if (value === 'agent') return 'Agent';
  return 'Normal User';
}

function parseCustomProviderOptions(settings: Record<string, string>): SipProviderOption[] {
  const raw = settings.sip_route_providers || settings.sip_providers || '';
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((provider: any) => ({
        value: String(provider.id || provider.value || provider.key || '').trim(),
        label: String(provider.label || provider.name || provider.id || '').trim(),
        description: String(provider.description || provider.domain || provider.host || 'Custom SIP Provider').trim(),
        providerType: String(provider.type || 'custom_sip').trim(),
        domain: String(provider.domain || provider.host || '').trim(),
        transport: String(provider.transport || '').trim(),
        port: String(provider.port || '').trim(),
        outboundProxy: String(provider.outboundProxy || provider.outbound_proxy || '').trim(),
        status: String(provider.status || 'active').trim(),
      }))
      .filter((provider) => provider.value && provider.label);
  } catch {
    return [];
  }
}

function buildSipProviderOptions(settings: Record<string, string>): SipProviderOption[] {
  const activeProvider = settings.sip_provisioning_provider || 'freepbx';
  const freePbxDomain = settings.freepbx_sip_domain || settings.linphone_sip_domain || settings.user_sip_domain || '';
  const astppDomain = settings.astpp_sip_domain || settings.user_sip_domain || '';
  const options: SipProviderOption[] = [
    {
      value: 'freepbx',
      label: 'FreePBX / Asterisk',
      description: freePbxDomain ? `Domain: ${freePbxDomain}` : 'Configured In SIP Configuration',
      providerType: 'freepbx',
      domain: freePbxDomain,
      transport: settings.freepbx_sip_transport || settings.user_sip_transport || '',
      port: settings.linphone_sip_port || settings.user_sip_port || '',
      outboundProxy: settings.linphone_sip_outbound_proxy || '',
      status: settings.freepbx_status || (settings.freepbx_enabled === 'false' ? 'inactive' : 'active'),
    },
    {
      value: 'astpp',
      label: 'ASTPP Community',
      description: astppDomain ? `Domain: ${astppDomain}` : settings.astpp_api_url ? `API: ${settings.astpp_api_url}` : 'Configured In SIP Configuration',
      providerType: 'astpp',
      domain: astppDomain,
      transport: settings.astpp_sip_transport || settings.user_sip_transport || '',
      port: settings.astpp_sip_port || settings.user_sip_port || '',
      outboundProxy: settings.astpp_outbound_proxy || '',
      status: settings.astpp_status || (settings.astpp_enabled === 'true' || activeProvider === 'astpp' ? 'active' : 'inactive'),
    },
    {
      value: 'local',
      label: 'Local SIP',
      description: 'Use Platform Internal SIP Routing',
      providerType: 'local',
      domain: settings.user_sip_domain || freePbxDomain || astppDomain,
      transport: settings.user_sip_transport || '',
      port: settings.user_sip_port || '',
      outboundProxy: '',
      status: 'active',
    },
    ...parseCustomProviderOptions(settings),
  ];

  const unique = new Map<string, SipProviderOption>();
  options.forEach((provider) => {
    if (!unique.has(provider.value)) unique.set(provider.value, provider);
  });

  return Array.from(unique.values()).sort((a, b) => {
    if (a.value === activeProvider) return -1;
    if (b.value === activeProvider) return 1;
    if (a.value === 'local') return 1;
    if (b.value === 'local') return -1;
    return a.label.localeCompare(b.label);
  });
}

function normalizeRateTypes(metadata: Record<string, any>, legacyReseller: string): RateType[] {
  const rawTypes = Array.isArray(metadata.rateTypes) ? metadata.rateTypes : metadata.rateType ? [metadata.rateType] : [];
  const validTypes = rawTypes.filter((type): type is RateType => type === 'normal_user' || type === 'reseller' || type === 'agent');
  if (validTypes.length > 0) return Array.from(new Set(validTypes));
  return legacyReseller ? ['reseller'] : ['normal_user'];
}

function labelsForRateTypes(rateTypes: RateType[]) {
  return rateTypes.map(rateTypeLabel).join(', ') || 'Select Rate Type';
}

function labelForAccounts(accounts: RateGroupAssignee[], ids: string[]) {
  if (ids.length === 0) return '';
  const labels = ids.map((id) => accounts.find((account) => account.id === id)?.label).filter(Boolean);
  return labels.length > 0 ? labels.join(', ') : `${ids.length} Selected`;
}

export default function AdminSipRateGroupForm({ mode, groupId }: { mode: Mode; groupId?: string }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [form, setForm] = useState<FormState>(initialForm);
  const isEdit = mode === 'edit';
  const includesNormalUsers = form.rateTypes.includes('normal_user');
  const includesResellers = form.rateTypes.includes('reseller');
  const includesAgents = form.rateTypes.includes('agent');

  const groupQuery = useQuery<{ rateGroup: FormState & { metadata?: Record<string, any> } }>({
    queryKey: [`/api/admin/sip-rate-groups/${groupId}`],
    enabled: isEdit && Boolean(groupId),
  });
  const sipSettingsQuery = useQuery<ConciergeOverview>({
    queryKey: ['/api/admin/concierge/overview'],
  });
  const resellerAssigneesQuery = useQuery<{ accounts: RateGroupAssignee[] }>({
    queryKey: ['/api/admin/sip-rate-group-assignees', { role: 'reseller' }],
    enabled: includesResellers,
  });
  const agentAssigneesQuery = useQuery<{ accounts: RateGroupAssignee[] }>({
    queryKey: ['/api/admin/sip-rate-group-assignees', { role: 'agent' }],
    enabled: includesAgents,
  });

  const resellerAssignees = resellerAssigneesQuery.data?.accounts || [];
  const agentAssignees = agentAssigneesQuery.data?.accounts || [];
  const sipSettings = sipSettingsQuery.data?.settings || {};
  const sipSettingsLoaded = Boolean(sipSettingsQuery.data?.settings);
  const sipProviderOptions = useMemo(() => buildSipProviderOptions(sipSettings), [sipSettings]);
  const defaultProviderId =
    sipProviderOptions.find((provider) => provider.value === sipSettings.sip_provisioning_provider)?.value ||
    sipProviderOptions[0]?.value ||
    '';
  const selectedProvider = sipProviderOptions.find((provider) => provider.value === form.providerId);
  const selectedResellers = form.resellerAccountIds.map((id) => (
    resellerAssignees.find((account) => account.id === id) || { id, label: id, role: 'reseller' as const }
  ));
  const selectedAgents = form.agentAccountIds.map((id) => (
    agentAssignees.find((account) => account.id === id) || { id, label: id, role: 'agent' as const }
  ));
  const selectedAccounts = [...selectedResellers, ...selectedAgents];

  useEffect(() => {
    const rateGroup = groupQuery.data?.rateGroup;
    if (!rateGroup) return;
    const metadata = rateGroup.metadata || {};
    const legacyReseller = metadata.reseller && metadata.reseller !== 'Admin' ? String(metadata.reseller) : '';
    const rateTypes = normalizeRateTypes(metadata, legacyReseller);
    const assignedAccounts = Array.isArray(metadata.assignedAccounts) ? metadata.assignedAccounts : [];
    setForm({
      ...initialForm,
      ...rateGroup,
      rateTypes,
      resellerAccountIds: Array.isArray(metadata.resellerAccountIds)
        ? metadata.resellerAccountIds
        : assignedAccounts.filter((account: any) => account?.role === 'reseller').map((account: any) => account.id).filter(Boolean),
      agentAccountIds: Array.isArray(metadata.agentAccountIds)
        ? metadata.agentAccountIds
        : assignedAccounts.filter((account: any) => account?.role === 'agent').map((account: any) => account.id).filter(Boolean),
      routingPrefix: metadata.routingPrefix || '',
      routingType: metadata.routingType || 'LCR',
      providerId: metadata.providerId || metadata.routeProvider?.id || metadata.sipProvider || metadata.provider || '',
      initialIncrement: String(metadata.initialIncrement ?? '0'),
      increment: String(metadata.increment ?? '60'),
      markupPercent: String(metadata.markupPercent ?? '0'),
    });
  }, [groupQuery.data?.rateGroup]);

  useEffect(() => {
    if (!sipSettingsLoaded || form.providerId || !defaultProviderId) return;
    setForm((current) => ({ ...current, providerId: defaultProviderId }));
  }, [defaultProviderId, form.providerId, sipSettingsLoaded]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (form.rateTypes.length === 0) {
        throw new Error('Select at least one Rate Type.');
      }

      if (includesResellers && form.resellerAccountIds.length === 0) {
        throw new Error('Select at least one Reseller for this Rate Group.');
      }

      if (includesAgents && form.agentAccountIds.length === 0) {
        throw new Error('Select at least one Agent for this Rate Group.');
      }

      if (!form.providerId) {
        throw new Error('Select a SIP Provider for this Rate Group.');
      }

      const assignedAccounts = selectedAccounts.map((account) => ({
        id: account.id,
        label: account.label,
        email: account.email || null,
        displayUserId: account.displayUserId || null,
        role: account.role,
        parentId: account.parentId || null,
        parentName: account.parentName || null,
        parentEmail: account.parentEmail || null,
        parentRole: account.parentRole || null,
      }));
      const assignedLabelParts = [
        includesNormalUsers ? 'All Normal Users' : '',
        ...assignedAccounts.map((account) => account.label),
      ].filter(Boolean);
      const assignedLabel = assignedLabelParts.join(', ');
      const firstAssignedAccount = assignedAccounts[0] || null;
      const parentLabels = Array.from(new Set(assignedAccounts.map((account) => account.parentName).filter(Boolean)));
      const provider = selectedProvider || {
        value: form.providerId,
        label: form.providerId,
        description: '',
        providerType: 'custom_sip',
        domain: '',
        transport: '',
        port: '',
        outboundProxy: '',
        status: 'active',
      };

      const body = {
        name: form.name,
        description: form.description,
        status: form.status,
        metadata: {
          rateTypes: form.rateTypes,
          rateType: form.rateTypes[0] || 'normal_user',
          rateTypeLabel: labelsForRateTypes(form.rateTypes),
          includesNormalUsers,
          resellerAccountIds: includesResellers ? form.resellerAccountIds : [],
          agentAccountIds: includesAgents ? form.agentAccountIds : [],
          assignedAccounts,
          assignedAccountId: firstAssignedAccount?.id || null,
          assignedAccountLabel: assignedLabel,
          assignedAccountEmail: firstAssignedAccount?.email || null,
          assignedAccountDisplayUserId: firstAssignedAccount?.displayUserId || null,
          assignedAccountRole: form.rateTypes.length === 1 && form.rateTypes[0] !== 'normal_user' ? form.rateTypes[0] : 'multiple',
          parentAccountId: firstAssignedAccount?.parentId || null,
          parentAccountLabel: parentLabels.join(', ') || null,
          assignmentScope: includesNormalUsers && selectedAccounts.length === 0
            ? 'all_platform_normal_users'
            : includesNormalUsers
              ? 'mixed_normal_users_and_selected_downlines'
              : 'selected_accounts_and_downlines',
          inheritanceMode: selectedAccounts.length > 0 ? 'include_downline_with_child_override' : 'platform_default',
          providerId: provider.value,
          providerName: provider.label,
          providerType: provider.providerType,
          providerDescription: provider.description,
          providerDomain: provider.domain,
          providerTransport: provider.transport,
          providerPort: provider.port,
          providerOutboundProxy: provider.outboundProxy,
          providerStatus: provider.status,
          routeProvider: {
            id: provider.value,
            name: provider.label,
            type: provider.providerType,
            domain: provider.domain,
            transport: provider.transport,
            port: provider.port,
            outboundProxy: provider.outboundProxy,
            status: provider.status,
          },
          routingPrefix: form.routingPrefix,
          routingType: form.routingType,
          routingLabel: routingPolicies[form.routingType]?.label || form.routingType,
          routeOrder: routingPolicies[form.routingType]?.routeOrder || 'cheapest_first_then_quality',
          routePriority: routingPolicies[form.routingType]?.priority || ['lowest_cost', 'highest_quality'],
          tryCheapestRouteFirst: form.routingType === 'LCR' || form.routingType === 'Balanced',
          useQualityFallback: form.routingType === 'LCR' || form.routingType === 'Balanced',
          initialIncrement: form.initialIncrement,
          increment: form.increment,
          markupPercent: form.markupPercent,
          reseller: assignedLabel,
        },
      };
      const response = isEdit
        ? await apiRequest('PATCH', `/api/admin/sip-rate-groups/${groupId}`, body)
        : await apiRequest('POST', '/api/admin/sip-rate-groups', body);
      return unwrap(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/sip-rate-groups'] });
      toast({ title: isEdit ? 'Rate Group Updated' : 'Rate Group Created', description: 'The Rate Group Was Saved Successfully.' });
      navigate('/admin/sip-configuration/tariffs');
    },
    onError: (error: Error) => {
      toast({ title: isEdit ? 'Update Failed' : 'Create Failed', description: parseError(error), variant: 'destructive' });
    },
  });

  const saveDisabled =
    saveMutation.isPending ||
    !form.name.trim() ||
    !form.providerId ||
    form.rateTypes.length === 0 ||
    (includesResellers && form.resellerAccountIds.length === 0) ||
    (includesAgents && form.agentAccountIds.length === 0);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
            <Layers className="h-8 w-8 text-cyan-300" />
            {isEdit ? 'Edit Rate Group' : 'Create Rate Group'}
          </h1>
          <p className="mt-2 text-slate-400">Group Origination Rates For Easier Routing And Pricing Management.</p>
        </div>
        <Button asChild variant="outline" className={outlineButtonClass}>
          <Link href="/admin/sip-configuration/tariffs">
            <ArrowLeft className="h-4 w-4" />
            Back To Tariff's
          </Link>
        </Button>
      </div>

      <div className={shellClass}>
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.85fr)]">
          <section className="space-y-5">
            <h2 className="text-xl font-medium text-slate-950">Rate Group Information</h2>
            <div className="grid gap-x-5 gap-y-4 2xl:grid-cols-2">
              <CompactMultiSelectField
                label="Rate Type"
                valueLabel={labelsForRateTypes(form.rateTypes)}
                options={rateTypeOptions}
                values={form.rateTypes}
                onToggle={(rateType) => {
                  setForm((current) => ({
                    ...current,
                    rateTypes: current.rateTypes.includes(rateType)
                      ? current.rateTypes.filter((item) => item !== rateType)
                      : [...current.rateTypes, rateType],
                    resellerAccountIds: rateType === 'reseller' && current.rateTypes.includes(rateType) ? [] : current.resellerAccountIds,
                    agentAccountIds: rateType === 'agent' && current.rateTypes.includes(rateType) ? [] : current.agentAccountIds,
                  }));
                }}
              />
              {includesNormalUsers ? (
                <CompactReadOnlyField label="Assigned To" value="All Normal Users" />
              ) : null}
              {includesResellers ? (
                <CompactMultiSelectField
                  label="Assign To Reseller"
                  valueLabel={labelForAccounts(resellerAssignees, form.resellerAccountIds) || 'Select Reseller'}
                  options={resellerAssignees.map((account) => ({
                    value: account.id,
                    label: account.label,
                    description: account.hierarchyLabel,
                  }))}
                  values={form.resellerAccountIds}
                  emptyLabel={resellerAssigneesQuery.isLoading ? 'Loading Resellers...' : 'No Reseller Accounts Found'}
                  onToggle={(resellerAccountId) => {
                    setForm((current) => ({
                      ...current,
                      resellerAccountIds: current.resellerAccountIds.includes(resellerAccountId)
                        ? current.resellerAccountIds.filter((item) => item !== resellerAccountId)
                        : [...current.resellerAccountIds, resellerAccountId],
                    }));
                  }}
                />
              ) : null}
              {includesAgents ? (
                <CompactMultiSelectField
                  label="Assign To Agent"
                  valueLabel={labelForAccounts(agentAssignees, form.agentAccountIds) || 'Select Agent'}
                  options={agentAssignees.map((account) => ({
                    value: account.id,
                    label: account.label,
                    description: account.hierarchyLabel,
                  }))}
                  values={form.agentAccountIds}
                  emptyLabel={agentAssigneesQuery.isLoading ? 'Loading Agents...' : 'No Agent Accounts Found'}
                  onToggle={(agentAccountId) => {
                    setForm((current) => ({
                      ...current,
                      agentAccountIds: current.agentAccountIds.includes(agentAccountId)
                        ? current.agentAccountIds.filter((item) => item !== agentAccountId)
                        : [...current.agentAccountIds, agentAccountId],
                    }));
                  }}
                />
              ) : null}
              <CompactSelectField
                label="Provider"
                value={form.providerId || 'none'}
                onChange={(providerId) => setForm((current) => ({ ...current, providerId: providerId === 'none' ? '' : providerId }))}
                triggerClassName="h-12 py-2 [&>span]:leading-tight"
              >
                <SelectItem className={selectItemClass} value="none">Select Provider</SelectItem>
                {sipProviderOptions.map((provider) => (
                  <SelectItem className={selectItemClass} key={provider.value} value={provider.value}>
                    <div className="min-w-0">
                      <div className="truncate">{provider.label}</div>
                      <div className="truncate text-xs opacity-80">{provider.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </CompactSelectField>
              <CompactField label="Name" value={form.name} onChange={(name) => setForm((current) => ({ ...current, name }))} placeholder="default" />
              <CompactField label="Routing Prefix" value={form.routingPrefix} onChange={(routingPrefix) => setForm((current) => ({ ...current, routingPrefix }))} placeholder="--" />
              <CompactSelectField label="Routing Type" value={form.routingType} onChange={(routingType) => setForm((current) => ({ ...current, routingType }))}>
                <SelectItem className={selectItemClass} value="LCR">LCR - Cheapest First</SelectItem>
                <SelectItem className={selectItemClass} value="Quality">Quality First</SelectItem>
                <SelectItem className={selectItemClass} value="Balanced">Balanced Cost / Quality</SelectItem>
                <SelectItem className={selectItemClass} value="Manual">Manual Priority</SelectItem>
              </CompactSelectField>
              <CompactField label="Initial Increment" value={form.initialIncrement} onChange={(initialIncrement) => setForm((current) => ({ ...current, initialIncrement }))} placeholder="0" />
              <CompactField label="Increment" value={form.increment} onChange={(increment) => setForm((current) => ({ ...current, increment }))} placeholder="60" />
              <CompactField label="Markup (%)" value={form.markupPercent} onChange={(markupPercent) => setForm((current) => ({ ...current, markupPercent }))} placeholder="0" />
              <CompactSelectField label="Status" value={form.status} onChange={(status) => setForm((current) => ({ ...current, status: status as FormState['status'] }))}>
                <SelectItem className={selectItemClass} value="active">Active</SelectItem>
                <SelectItem className={selectItemClass} value="inactive">Inactive</SelectItem>
              </CompactSelectField>
            </div>
            <p className="text-xs leading-5 text-slate-500">
              Normal User applies this Rate Group to all standard platform users. Reseller and Agent apply it to the selected account and its downline, while any sub reseller or sub agent can still use its own Rate Group override.
            </p>
            <div className="grid gap-2">
              <Label className={compactLabelClass}>Description:</Label>
              <Textarea
                className={`${compactInputClass} min-h-20 py-2`}
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Optional notes for this rate group"
              />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-medium text-slate-950">Quick Actions</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button asChild variant="outline" className={quickSecondaryButtonClass}>
                <Link href="/admin/sip-configuration/tariffs">Cancel</Link>
              </Button>
              <Button className={quickPrimaryButtonClass} disabled={saveDisabled} onClick={() => saveMutation.mutate()}>
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saveMutation.isPending ? 'Saving...' : 'Save Group'}
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input className={inputClass} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function CompactField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-center">
      <Label className={compactLabelClass}>{label}:</Label>
      <Input className={compactInputClass} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function CompactReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-center">
      <Label className={compactLabelClass}>{label}:</Label>
      <Input className={`${compactInputClass} opacity-90`} value={value} readOnly />
    </div>
  );
}

function CompactMultiSelectField<T extends string>({
  label,
  valueLabel,
  options,
  values,
  emptyLabel = 'No Options Found',
  onToggle,
}: {
  label: string;
  valueLabel: string;
  options: Array<{ value: T; label: string; description?: string }>;
  values: T[];
  emptyLabel?: string;
  onToggle: (value: T) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-center">
      <Label className={compactLabelClass}>{label}:</Label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className={compactMultiTriggerClass}>
            <span className="truncate">{valueLabel}</span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className={multiSelectContentClass}>
          {options.length === 0 ? (
            <DropdownMenuLabel className="px-3 py-2 text-sm font-medium text-slate-500">{emptyLabel}</DropdownMenuLabel>
          ) : (
            options.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={values.includes(option.value)}
                className={multiSelectItemClass}
                onSelect={(event) => event.preventDefault()}
                onCheckedChange={() => onToggle(option.value)}
              >
                <div className="min-w-0">
                  <div className="truncate">{option.label}</div>
                  {option.description ? <div className="truncate text-xs opacity-75">{option.description}</div> : null}
                </div>
              </DropdownMenuCheckboxItem>
            ))
          )}
          {options.length > 0 ? (
            <>
              <DropdownMenuSeparator className="bg-slate-200" />
              <DropdownMenuLabel className="px-3 py-1.5 text-xs font-normal text-slate-500">
                {values.length} Selected
              </DropdownMenuLabel>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={selectClass}>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent className={selectContentClass}>{children}</SelectContent>
      </Select>
    </div>
  );
}

function CompactSelectField({
  label,
  value,
  onChange,
  children,
  triggerClassName = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  triggerClassName?: string;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-center">
      <Label className={compactLabelClass}>{label}:</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={`${compactSelectClass} ${triggerClassName}`}>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent className={selectContentClass}>{children}</SelectContent>
      </Select>
    </div>
  );
}
