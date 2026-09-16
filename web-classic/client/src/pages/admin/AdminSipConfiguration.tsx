import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, Phone, RefreshCw, Save, Settings, Smartphone, Wifi, WifiOff } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from '@/contexts/TranslationContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

type ConciergeOverview = {
  settings: Record<string, string>;
};

type SipConnectionTest = {
  status: 'online' | 'offline';
  online: boolean;
  message: string;
  checkedAt: string;
};

type ProvisionMissingResult = {
  requestedLimit: number;
  scanned: number;
  provisioned: number;
  failed: number;
};

type Draft = {
  sipEnabled: boolean;
  sipLabel: string;
  sipUri: string;
  sipServer: string;
  sipExtension: string;
  sipUsername: string;
  sipTransport: string;
  sipPassword: string;
  sipPasswordSaved: boolean;
  sipProvisioningProvider: 'freepbx' | 'astpp';
  freePbxEnabled: boolean;
  freePbxProvisioningMode: string;
  freePbxDomain: string;
  freePbxTransport: string;
  freePbxContext: string;
  freePbxAllowCodecs: string;
  freePbxVoicemailExtension: string;
  astppEnabled: boolean;
  astppApiUrl: string;
  astppApiAuthToken: string;
  astppAdminId: string;
  astppAdminToken: string;
  astppSipDomain: string;
  astppSipProfileId: string;
  astppResellerId: string;
  astppSipTransport: string;
  astppSipPort: string;
  astppOutboundProxy: string;
  linphoneSipPort: string;
  linphoneOutboundProxy: string;
};

const defaultDraft: Draft = {
  sipEnabled: true,
  sipLabel: 'Free SIP Call',
  sipUri: '',
  sipServer: '',
  sipExtension: '',
  sipUsername: '',
  sipTransport: 'udp',
  sipPassword: '',
  sipPasswordSaved: false,
  sipProvisioningProvider: 'freepbx',
  freePbxEnabled: true,
  freePbxProvisioningMode: 'realtime',
  freePbxDomain: '',
  freePbxTransport: 'transport-tls',
  freePbxContext: 'from-internal',
  freePbxAllowCodecs: 'opus,ulaw,alaw',
  freePbxVoicemailExtension: '*98',
  astppEnabled: false,
  astppApiUrl: '',
  astppApiAuthToken: '',
  astppAdminId: '',
  astppAdminToken: '',
  astppSipDomain: '',
  astppSipProfileId: '1',
  astppResellerId: '0',
  astppSipTransport: 'udp',
  astppSipPort: '5060',
  astppOutboundProxy: '',
  linphoneSipPort: '5061',
  linphoneOutboundProxy: '',
};

function unwrap<T>(payload: any): T {
  return (payload?.data ?? payload) as T;
}

function parseError(error: Error) {
  return error.message.replace(/^\d+:\s*/, '');
}

function statusClasses(status: string) {
  if (status === 'online') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'offline') return 'border-red-200 bg-red-50 text-red-700';
  return 'border-slate-200 bg-slate-100 text-slate-700';
}

function connectionLabel(status: string, onlineLabel: string, offlineLabel: string, notTestedLabel: string) {
  if (status === 'online') return onlineLabel;
  if (status === 'offline') return offlineLabel;
  return notTestedLabel;
}

const panelClass = 'border-slate-200 bg-white text-slate-950 shadow-sm';
const cardTitleClass = 'flex items-center gap-2 text-xl text-slate-950';
const cardDescriptionClass = 'text-sm text-slate-500';
const labelClass = 'text-sm text-slate-700';
const darkFieldClass =
  'mt-2 border-slate-700 bg-[#071b33] text-white placeholder:text-slate-400 focus-visible:ring-teal-400';
const darkSelectClass =
  'mt-2 border-slate-700 bg-[#071b33] text-white focus:ring-teal-400 focus-visible:ring-teal-400';
const darkSelectContentClass = 'border-slate-700 bg-[#071b33] text-white';
const lightBoxClass = 'rounded-lg border border-slate-200 bg-slate-50 p-4';
const primaryButtonClass = 'gap-2 bg-teal-300 text-slate-950 hover:bg-teal-200';
const outlineButtonClass = 'gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50';

export default function AdminSipConfiguration() {
  const { toast } = useToast();
  const { t, isRTL } = useTranslation();
  const tr = (key: string, english: string, arabic: string, params?: Record<string, string | number>) =>
    t(key, isRTL ? arabic : english, params);
  const translateStatusMessage = (message: string) => {
    const trimmed = message.trim();
    const knownMessageKeys: Record<string, string> = {
      'ASTPP API has not been tested yet.': 'adminPanel.admin.sip.message.astppApiNotTested',
      'ASTPP provisioning is disabled.': 'adminPanel.admin.sip.message.astppProvisioningDisabled',
      'ASTPP provisioning is not enabled.': 'adminPanel.admin.sip.message.astppProvisioningNotEnabled',
      'ASTPP API URL, auth token, admin id, and admin token are required.': 'adminPanel.admin.sip.message.astppCredentialsRequired',
      'ASTPP SIP domain is required.': 'adminPanel.admin.sip.message.astppDomainRequired',
      'ASTPP API accepted the admin token and customer endpoint request.': 'adminPanel.admin.sip.message.astppAccepted',
      'ASTPP customer and SIP device were provisioned.': 'adminPanel.admin.sip.message.astppProvisioned',
      'Connection has not been tested yet.': 'adminPanel.admin.sip.message.connectionNotTested',
      'FreePBX realtime provisioning has not been tested yet.': 'adminPanel.admin.sip.message.freePbxNotTested',
      'FreePBX realtime provisioning is disabled.': 'adminPanel.admin.sip.message.freePbxDisabled',
      'FreePBX SIP domain is not configured.': 'adminPanel.admin.sip.message.freePbxDomainMissing',
      'No active FreePBX registration contact found for this SIP account.': 'adminPanel.admin.sip.message.freePbxNoContact',
      'SIP domain is not configured.': 'adminPanel.admin.sip.message.sipDomainMissing',
      'SIP server is not configured.': 'adminPanel.admin.sip.message.sipServerMissing',
      'SIP registration succeeded.': 'adminPanel.admin.sip.message.sipRegistrationSucceeded',
      'SIP registration succeeded with the stored credentials.': 'adminPanel.admin.sip.message.sipRegistrationStoredSucceeded',
      'SIP registration failed. Check the SIP username or password.': 'adminPanel.admin.sip.message.sipRegistrationFailedCredentials',
      'SIP server requested authentication but did not provide a nonce.': 'adminPanel.admin.sip.message.sipNonceMissing',
      'Unable to reach the SIP server.': 'adminPanel.admin.sip.message.sipServerUnreachable',
      'Unable to verify ASTPP provisioning.': 'adminPanel.admin.sip.message.astppVerifyFailed',
      'Unable to verify FreePBX realtime provisioning.': 'adminPanel.admin.sip.message.freePbxVerifyFailed',
    };
    const exactKey = knownMessageKeys[trimmed];
    if (exactKey) return t(exactKey, trimmed);

    const freePbxReachableMatch = trimmed.match(/^FreePBX realtime tables are reachable for (.+)\.$/);
    if (freePbxReachableMatch) {
      return t('adminPanel.admin.sip.message.freePbxReachable', 'FreePBX realtime tables are reachable for {domain}.', { domain: freePbxReachableMatch[1] });
    }
    const domainResolvedMatch = trimmed.match(/^Domain resolved for (.+) SIP on (.+)\.$/);
    if (domainResolvedMatch) {
      return t('adminPanel.admin.sip.message.domainResolved', 'Domain resolved for {transport} SIP on {target}.', {
        transport: domainResolvedMatch[1],
        target: domainResolvedMatch[2],
      });
    }
    const freePbxModeMatch = trimmed.match(/^FreePBX provisioning mode is (.+); realtime mode is required for automatic SIP accounts\.$/);
    if (freePbxModeMatch) {
      return t('adminPanel.admin.sip.message.freePbxModeInvalid', 'FreePBX provisioning mode is {mode}; realtime mode is required for automatic SIP accounts.', {
        mode: freePbxModeMatch[1],
      });
    }
    const sipBeforeAuthMatch = trimmed.match(/^SIP server returned (.+) before authentication\.$/);
    if (sipBeforeAuthMatch) {
      return t('adminPanel.admin.sip.message.sipBeforeAuth', 'SIP server returned {response} before authentication.', { response: sipBeforeAuthMatch[1] });
    }
    const sipResponseMatch = trimmed.match(/^SIP registration failed with response (.+)\.$/);
    if (sipResponseMatch) {
      return t('adminPanel.admin.sip.message.sipResponseFailed', 'SIP registration failed with response {response}.', { response: sipResponseMatch[1] });
    }
    const sipTimeoutMatch = trimmed.match(/^SIP server did not respond within (.+)\.$/);
    if (sipTimeoutMatch) {
      return t('adminPanel.admin.sip.message.sipTimeout', 'SIP server did not respond within {duration}.', { duration: sipTimeoutMatch[1] });
    }

    if (!isRTL) return message;
    const knownMessages: Record<string, string> = {
      'ASTPP API has not been tested yet.': 'لم يتم اختبار واجهة ASTPP بعد.',
      'ASTPP provisioning is disabled.': 'إنشاء حسابات ASTPP معطل.',
      'ASTPP provisioning is not enabled.': 'إنشاء حسابات ASTPP غير مفعل.',
      'ASTPP API URL, auth token, admin id, and admin token are required.': 'رابط ASTPP ومفتاح المصادقة ومعرف المدير ورمز المدير مطلوبة.',
      'ASTPP SIP domain is required.': 'نطاق SIP الخاص بـ ASTPP مطلوب.',
      'ASTPP API accepted the admin token and customer endpoint request.': 'قبلت واجهة ASTPP رمز المدير وطلب نقطة نهاية العميل.',
      'ASTPP customer and SIP device were provisioned.': 'تم إنشاء عميل ASTPP وجهاز SIP.',
      'Connection has not been tested yet.': 'لم يتم اختبار الاتصال بعد.',
      'FreePBX realtime provisioning has not been tested yet.': 'لم يتم اختبار إنشاء حسابات FreePBX Realtime بعد.',
      'FreePBX realtime provisioning is disabled.': 'إنشاء حسابات FreePBX Realtime معطل.',
      'FreePBX SIP domain is not configured.': 'لم يتم إعداد نطاق SIP الخاص بـ FreePBX.',
      'No active FreePBX registration contact found for this SIP account.': 'لم يتم العثور على تسجيل FreePBX نشط لهذا حساب SIP.',
      'SIP domain is not configured.': 'لم يتم إعداد نطاق SIP.',
      'SIP server is not configured.': 'لم يتم إعداد خادم SIP.',
      'SIP registration succeeded.': 'تم تسجيل SIP بنجاح.',
      'SIP registration succeeded with the stored credentials.': 'تم تسجيل SIP بنجاح باستخدام بيانات الدخول المحفوظة.',
      'SIP registration failed. Check the SIP username or password.': 'فشل تسجيل SIP. تحقق من اسم المستخدم أو كلمة المرور.',
      'SIP server requested authentication but did not provide a nonce.': 'طلب خادم SIP المصادقة لكنه لم يرسل قيمة nonce.',
      'Unable to reach the SIP server.': 'تعذر الوصول إلى خادم SIP.',
      'Unable to verify ASTPP provisioning.': 'تعذر التحقق من إنشاء حسابات ASTPP.',
      'Unable to verify FreePBX realtime provisioning.': 'تعذر التحقق من إنشاء حسابات FreePBX Realtime.',
    };
    const freePbxReachable = trimmed.match(/^FreePBX realtime tables are reachable for (.+)\.$/);
    if (freePbxReachable) return `جداول FreePBX Realtime متاحة للنطاق ${freePbxReachable[1]}.`;
    const domainResolved = trimmed.match(/^Domain resolved for (.+) SIP on (.+)\.$/);
    if (domainResolved) return `تم حل النطاق لاتصال SIP عبر ${domainResolved[1]} على ${domainResolved[2]}.`;
    const freePbxMode = trimmed.match(/^FreePBX provisioning mode is (.+); realtime mode is required for automatic SIP accounts\.$/);
    if (freePbxMode) return `وضع إنشاء حسابات FreePBX هو ${freePbxMode[1]}؛ وضع Realtime مطلوب لإنشاء حسابات SIP تلقائيا.`;
    const sipBeforeAuth = trimmed.match(/^SIP server returned (.+) before authentication\.$/);
    if (sipBeforeAuth) return `أعاد خادم SIP الاستجابة ${sipBeforeAuth[1]} قبل المصادقة.`;
    const sipResponse = trimmed.match(/^SIP registration failed with response (.+)\.$/);
    if (sipResponse) return `فشل تسجيل SIP مع الاستجابة ${sipResponse[1]}.`;
    const sipTimeout = trimmed.match(/^SIP server did not respond within (.+)\.$/);
    if (sipTimeout) return `لم يستجب خادم SIP خلال ${sipTimeout[1]}.`;
    return knownMessages[trimmed] || message;
  };
  const [settingsDraft, setSettingsDraft] = useState<Draft>(defaultDraft);

  const overviewQuery = useQuery<ConciergeOverview>({
    queryKey: ['/api/admin/concierge/overview'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/concierge/overview');
      return unwrap<ConciergeOverview>(await response.json());
    },
  });

  useEffect(() => {
    const settings = overviewQuery.data?.settings;
    if (!settings) return;
    setSettingsDraft({
      sipEnabled: settings.concierge_sip_enabled !== 'false',
      sipLabel: settings.concierge_sip_label || defaultDraft.sipLabel,
      sipUri: settings.concierge_sip_uri || '',
      sipServer: settings.concierge_sip_server || '',
      sipExtension: settings.concierge_sip_extension || '',
      sipUsername: settings.concierge_sip_username || '',
      sipTransport: settings.concierge_sip_transport || 'udp',
      sipPassword: '',
      sipPasswordSaved: settings.concierge_sip_password_saved === 'true',
      sipProvisioningProvider: settings.sip_provisioning_provider === 'astpp' ? 'astpp' : 'freepbx',
      freePbxEnabled: settings.freepbx_enabled !== 'false',
      freePbxProvisioningMode: settings.freepbx_provisioning_mode || 'realtime',
      freePbxDomain: settings.freepbx_sip_domain || settings.linphone_sip_domain || settings.concierge_sip_server || '',
      freePbxTransport: settings.freepbx_sip_transport || 'transport-tls',
      freePbxContext: settings.freepbx_context || 'from-internal',
      freePbxAllowCodecs: settings.freepbx_allow_codecs || defaultDraft.freePbxAllowCodecs,
      freePbxVoicemailExtension: settings.freepbx_voicemail_extension || settings.linphone_voicemail_extension || '*98',
      astppEnabled: settings.astpp_enabled === 'true' || settings.sip_provisioning_provider === 'astpp',
      astppApiUrl: settings.astpp_api_url || '',
      astppApiAuthToken: settings.astpp_api_auth_token || '',
      astppAdminId: settings.astpp_admin_id || '',
      astppAdminToken: settings.astpp_admin_token || '',
      astppSipDomain: settings.astpp_sip_domain || '',
      astppSipProfileId: settings.astpp_sip_profile_id || '1',
      astppResellerId: settings.astpp_reseller_id || '0',
      astppSipTransport: settings.astpp_sip_transport || 'udp',
      astppSipPort: settings.astpp_sip_port || '5060',
      astppOutboundProxy: settings.astpp_outbound_proxy || '',
      linphoneSipPort: settings.linphone_sip_port || '5061',
      linphoneOutboundProxy: settings.linphone_sip_outbound_proxy || '',
    });
  }, [overviewQuery.data?.settings]);

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const activeDomain = settingsDraft.sipProvisioningProvider === 'astpp' ? settingsDraft.astppSipDomain : settingsDraft.freePbxDomain;
      const activePort = settingsDraft.sipProvisioningProvider === 'astpp' ? settingsDraft.astppSipPort : settingsDraft.linphoneSipPort;
      const activeTransport =
        settingsDraft.sipProvisioningProvider === 'astpp'
          ? settingsDraft.astppSipTransport
          : settingsDraft.freePbxTransport.includes('tls')
            ? 'tls'
            : settingsDraft.sipTransport;
      const settings = [
        ['concierge_sip_enabled', String(settingsDraft.sipEnabled)],
        ['concierge_sip_label', settingsDraft.sipLabel],
        ['concierge_sip_uri', settingsDraft.sipUri],
        ['concierge_sip_server', settingsDraft.sipServer],
        ['concierge_sip_extension', settingsDraft.sipExtension],
        ['concierge_sip_username', settingsDraft.sipUsername],
        ['concierge_sip_transport', settingsDraft.sipTransport],
        ['sip_provisioning_provider', settingsDraft.sipProvisioningProvider],
        ['freepbx_enabled', String(settingsDraft.freePbxEnabled)],
        ['freepbx_provisioning_mode', settingsDraft.freePbxProvisioningMode],
        ['freepbx_sip_domain', settingsDraft.freePbxDomain],
        ['freepbx_sip_transport', settingsDraft.freePbxTransport],
        ['freepbx_context', settingsDraft.freePbxContext],
        ['freepbx_allow_codecs', settingsDraft.freePbxAllowCodecs],
        ['freepbx_voicemail_extension', settingsDraft.freePbxVoicemailExtension],
        ['astpp_enabled', String(settingsDraft.astppEnabled || settingsDraft.sipProvisioningProvider === 'astpp')],
        ['astpp_api_url', settingsDraft.astppApiUrl],
        ['astpp_api_auth_token', settingsDraft.astppApiAuthToken],
        ['astpp_admin_id', settingsDraft.astppAdminId],
        ['astpp_admin_token', settingsDraft.astppAdminToken],
        ['astpp_sip_domain', settingsDraft.astppSipDomain],
        ['astpp_sip_profile_id', settingsDraft.astppSipProfileId],
        ['astpp_reseller_id', settingsDraft.astppResellerId],
        ['astpp_sip_transport', settingsDraft.astppSipTransport],
        ['astpp_sip_port', settingsDraft.astppSipPort],
        ['astpp_outbound_proxy', settingsDraft.astppOutboundProxy],
        ['voice_backend', 'linphone'],
        ['linphone_enabled', 'true'],
        ['linphone_sip_domain', activeDomain],
        ['linphone_sip_port', activePort],
        ['linphone_sip_transport', activeTransport],
        ['linphone_sip_outbound_proxy', settingsDraft.sipProvisioningProvider === 'astpp' ? settingsDraft.astppOutboundProxy : settingsDraft.linphoneOutboundProxy],
        ['linphone_voicemail_extension', settingsDraft.freePbxVoicemailExtension],
        ['user_sip_domain', activeDomain],
        ['user_sip_transport', activeTransport],
        ['user_sip_port', activePort],
      ];
      if (settingsDraft.sipPassword.trim()) {
        settings.push(['concierge_sip_password', settingsDraft.sipPassword.trim()]);
      }

      await Promise.all(
        settings.map(([key, value]) =>
          apiRequest('PUT', `/api/admin/settings/${key}`, { value, category: 'concierge' }),
        ),
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/concierge/overview'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      toast({
        title: tr('adminPanel.admin.sip.toast.savedTitle', 'SIP configuration saved', 'تم حفظ إعدادات SIP'),
        description: tr(
          'adminPanel.admin.sip.toast.savedDescription',
          'Provisioning and call-center SIP settings were updated.',
          'تم تحديث إعدادات إنشاء حسابات SIP ومركز الاتصال.',
        ),
      });
    },
    onError: (error: Error) => {
      toast({ title: tr('adminPanel.admin.sip.toast.saveFailed', 'Save failed', 'فشل الحفظ'), description: parseError(error), variant: 'destructive' });
    },
  });

  const testSipConnectionMutation = useMutation({
    mutationFn: async () => {
      const server = settingsDraft.sipServer.trim();
      const extension = settingsDraft.sipExtension.trim();
      const response = await apiRequest('POST', '/api/admin/concierge/sip/test', {
        server,
        username: settingsDraft.sipUsername,
        extension,
        uri: settingsDraft.sipUri.trim() || (extension && server ? `sip:${extension}@${server}` : ''),
        transport: settingsDraft.sipTransport,
      });
      return unwrap<SipConnectionTest>(await response.json());
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/concierge/overview'] });
      toast({
        title: result.online
          ? tr('adminPanel.admin.sip.toast.sipOnline', 'SIP is online', 'اتصال SIP متصل')
          : tr('adminPanel.admin.sip.toast.sipOffline', 'SIP is offline', 'اتصال SIP غير متصل'),
        description: translateStatusMessage(result.message),
        variant: result.online ? 'default' : 'destructive',
      });
    },
    onError: (error: Error) => toast({ title: tr('adminPanel.admin.sip.toast.connectionTestFailed', 'Connection test failed', 'فشل اختبار الاتصال'), description: parseError(error), variant: 'destructive' }),
  });

  const testFreePbxMutation = useMutation({
    mutationFn: async () => unwrap<SipConnectionTest>(await (await apiRequest('POST', '/api/admin/freepbx/test', {})).json()),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/concierge/overview'] });
      toast({
        title: result.online
          ? tr('adminPanel.admin.sip.toast.freePbxReady', 'FreePBX is ready', 'FreePBX جاهز')
          : tr('adminPanel.admin.sip.toast.freePbxNotReady', 'FreePBX is not ready', 'FreePBX غير جاهز'),
        description: translateStatusMessage(result.message),
        variant: result.online ? 'default' : 'destructive',
      });
    },
    onError: (error: Error) => toast({ title: tr('adminPanel.admin.sip.toast.freePbxTestFailed', 'FreePBX test failed', 'فشل اختبار FreePBX'), description: parseError(error), variant: 'destructive' }),
  });

  const testAstppMutation = useMutation({
    mutationFn: async () => unwrap<SipConnectionTest>(await (await apiRequest('POST', '/api/admin/astpp/test', {})).json()),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/concierge/overview'] });
      toast({
        title: result.online
          ? tr('adminPanel.admin.sip.toast.astppReady', 'ASTPP is ready', 'ASTPP جاهز')
          : tr('adminPanel.admin.sip.toast.astppNotReady', 'ASTPP is not ready', 'ASTPP غير جاهز'),
        description: translateStatusMessage(result.message),
        variant: result.online ? 'default' : 'destructive',
      });
    },
    onError: (error: Error) => toast({ title: tr('adminPanel.admin.sip.toast.astppTestFailed', 'ASTPP test failed', 'فشل اختبار ASTPP'), description: parseError(error), variant: 'destructive' }),
  });

  const provisionMissingSipMutation = useMutation({
    mutationFn: async () => unwrap<ProvisionMissingResult>(await (await apiRequest('POST', '/api/admin/astpp/provision-missing', { limit: 200 })).json()),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/concierge/overview'] });
      toast({
        title: tr('adminPanel.admin.sip.toast.provisionMissingDone', 'SIP accounts synced', 'تمت مزامنة حسابات SIP'),
        description: tr(
          'adminPanel.admin.sip.toast.provisionMissingSummary',
          '{provisioned} ready, {failed} failed, {scanned} checked.',
          'تم إنشاء {provisioned}، فشل {failed}، تم فحص {scanned}.',
          {
            provisioned: result.provisioned,
            failed: result.failed,
            scanned: result.scanned,
          },
        ),
        variant: result.failed ? 'destructive' : 'default',
      });
    },
    onError: (error: Error) => toast({
      title: tr('adminPanel.admin.sip.toast.provisionMissingFailed', 'SIP sync failed', 'فشلت مزامنة SIP'),
      description: parseError(error),
      variant: 'destructive',
    }),
  });

  const settings = overviewQuery.data?.settings || {};
  const generatedSipUri = useMemo(() => {
    if (!settingsDraft.sipExtension.trim() || !settingsDraft.sipServer.trim()) return '';
    return `sip:${settingsDraft.sipExtension.trim()}@${settingsDraft.sipServer.trim()}`;
  }, [settingsDraft.sipExtension, settingsDraft.sipServer]);
  const activeSipUri = settingsDraft.sipUri.trim() || generatedSipUri;
  const sipStatus = testSipConnectionMutation.data?.status || settings.concierge_sip_status || 'unknown';
  const freePbxStatus = testFreePbxMutation.data?.status || settings.freepbx_status || 'unknown';
  const astppStatus = testAstppMutation.data?.status || settings.astpp_status || 'unknown';
  const readyLabel = tr('adminPanel.admin.sip.status.ready', 'Ready', 'جاهز');
  const onlineLabel = tr('adminPanel.admin.sip.status.online', 'Online', 'متصل');
  const offlineLabel = tr('adminPanel.admin.sip.status.offline', 'Offline', 'غير متصل');
  const notTestedLabel = tr('adminPanel.admin.sip.status.notTested', 'Not tested', 'لم يتم الاختبار');
  const statusLabel = tr('adminPanel.admin.sip.status.label', 'Status', 'الحالة');
  const lastCheckedLabel = tr('adminPanel.admin.sip.status.lastChecked', 'Last checked', 'آخر فحص');
  const notConfiguredLabel = tr('adminPanel.admin.sip.status.notConfigured', 'Not configured', 'غير مهيأ');

  return (
    <div className="space-y-6 p-6 lg:p-8" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold">
              <Phone className="h-8 w-8 text-cyan-300" />
              {tr('adminPanel.admin.sip.title', 'SIP Configuration', 'إعدادات SIP')}
            </h1>
            <p className="mt-2 text-slate-400">
              {tr(
                'adminPanel.admin.sip.description',
                'Configure automatic SIP account provisioning and the shared call-center account.',
                'قم بإعداد إنشاء حسابات SIP تلقائيا وحساب مركز الاتصال المشترك.',
              )}
            </p>
          </div>
          <Button className={primaryButtonClass} onClick={() => saveSettingsMutation.mutate()} disabled={saveSettingsMutation.isPending || overviewQuery.isLoading}>
            {saveSettingsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {tr('adminPanel.admin.sip.saveButton', 'Save SIP Configuration', 'حفظ إعدادات SIP')}
          </Button>
        </div>

        <Card className={panelClass}>
          <CardHeader>
            <CardTitle className={cardTitleClass}>
              <Settings className="h-5 w-5 text-teal-500" />
              {tr('adminPanel.admin.sip.provider.title', 'SIP Provisioning Provider', 'مزود إنشاء حسابات SIP')}
            </CardTitle>
            <CardDescription className={cardDescriptionClass}>
              {tr(
                'adminPanel.admin.sip.provider.description',
                'Choose which PBX platform creates customer SIP accounts automatically.',
                'اختر منصة PBX التي تنشئ حسابات SIP للعملاء تلقائيا.',
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className={labelClass}>{tr('adminPanel.admin.sip.provider.label', 'Provider', 'المزود')}</Label>
              <Select
                value={settingsDraft.sipProvisioningProvider}
                onValueChange={(sipProvisioningProvider: 'freepbx' | 'astpp') =>
                  setSettingsDraft((current) => ({
                    ...current,
                    sipProvisioningProvider,
                    astppEnabled: sipProvisioningProvider === 'astpp' ? true : current.astppEnabled,
                  }))
                }
              >
                <SelectTrigger className={darkSelectClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={darkSelectContentClass}>
                  <SelectItem value="freepbx">{tr('adminPanel.admin.sip.provider.freepbx', 'FreePBX / Asterisk Realtime', 'FreePBX / Asterisk Realtime')}</SelectItem>
                  <SelectItem value="astpp">{tr('adminPanel.admin.sip.provider.astpp', 'ASTPP Community', 'ASTPP Community')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className={labelClass}>{tr('adminPanel.admin.sip.provider.activeDomain', 'Active SIP Domain', 'نطاق SIP النشط')}</Label>
              <Input readOnly className={darkFieldClass} value={settingsDraft.sipProvisioningProvider === 'astpp' ? settingsDraft.astppSipDomain : settingsDraft.freePbxDomain} placeholder="sip.yourdomain.com" />
            </div>
          </CardContent>
        </Card>

        <Card className={panelClass}>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className={cardTitleClass}>
                  <Settings className="h-5 w-5 text-teal-500" />
                  {tr('adminPanel.admin.sip.astpp.title', 'ASTPP Community', 'مجتمع ASTPP')}
                </CardTitle>
                <CardDescription className={cardDescriptionClass}>
                  {tr(
                    'adminPanel.admin.sip.astpp.description',
                    'Provision ASTPP customers and FreeSWITCH SIP devices through the Community API add-on.',
                    'أنشئ عملاء ASTPP وأجهزة FreeSWITCH SIP من خلال إضافة واجهة مجتمع ASTPP.',
                  )}
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Badge className={`w-fit gap-1.5 border px-3 py-1 ${statusClasses(astppStatus)}`}>
                  {astppStatus === 'online' ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                  {connectionLabel(astppStatus, readyLabel, offlineLabel, notTestedLabel)}
                </Badge>
                <Button type="button" size="sm" className={primaryButtonClass} onClick={() => testAstppMutation.mutate()} disabled={testAstppMutation.isPending || !settingsDraft.astppEnabled}>
                  {testAstppMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {tr('adminPanel.admin.sip.astpp.testButton', 'Test ASTPP', 'اختبار ASTPP')}
                </Button>
                <Button type="button" size="sm" variant="outline" className={outlineButtonClass} onClick={() => provisionMissingSipMutation.mutate()} disabled={provisionMissingSipMutation.isPending || !settingsDraft.astppEnabled}>
                  {provisionMissingSipMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {tr('adminPanel.admin.sip.astpp.syncUsersButton', 'Sync Users SIP', 'مزامنة SIP للمستخدمين')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`${lightBoxClass} flex items-center justify-between`}>
              <div>
                <Label className={labelClass}>{tr('adminPanel.admin.sip.astpp.enableLabel', 'Enable ASTPP Provisioning', 'تفعيل إنشاء حسابات ASTPP')}</Label>
                <p className="mt-1 text-xs text-slate-500">
                  {tr(
                    'adminPanel.admin.sip.astpp.enableDescription',
                    'New customer SIP accounts will be created as ASTPP SIP devices.',
                    'سيتم إنشاء حسابات SIP الجديدة للعملاء كأجهزة SIP في ASTPP.',
                  )}
                </p>
              </div>
              <Switch checked={settingsDraft.astppEnabled} onCheckedChange={(astppEnabled) => setSettingsDraft((current) => ({ ...current, astppEnabled }))} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={tr('adminPanel.admin.sip.astpp.apiUrl', 'ASTPP API URL', 'رابط واجهة ASTPP')} value={settingsDraft.astppApiUrl} placeholder="https://sip.yourdomain.com" onChange={(astppApiUrl) => setSettingsDraft((current) => ({ ...current, astppApiUrl }))} />
              <Field label={tr('adminPanel.admin.sip.astpp.sipDomain', 'SIP Domain', 'نطاق SIP')} value={settingsDraft.astppSipDomain} placeholder="sip.yourdomain.com" onChange={(astppSipDomain) => setSettingsDraft((current) => ({ ...current, astppSipDomain }))} />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label={tr('adminPanel.admin.sip.astpp.authToken', 'X-Auth-Token', 'رمز X-Auth-Token')} value={settingsDraft.astppApiAuthToken} placeholder={tr('adminPanel.admin.sip.astpp.authTokenPlaceholder', 'ASTPP API token', 'رمز واجهة ASTPP')} onChange={(astppApiAuthToken) => setSettingsDraft((current) => ({ ...current, astppApiAuthToken }))} />
              <Field label={tr('adminPanel.admin.sip.astpp.adminId', 'Admin Account ID', 'معرف حساب المدير')} value={settingsDraft.astppAdminId} placeholder="1" onChange={(astppAdminId) => setSettingsDraft((current) => ({ ...current, astppAdminId }))} />
              <Field label={tr('adminPanel.admin.sip.astpp.adminToken', 'Admin Account Token', 'رمز حساب المدير')} value={settingsDraft.astppAdminToken} placeholder={tr('adminPanel.admin.sip.astpp.adminTokenPlaceholder', 'Encrypted account token', 'رمز الحساب المشفر')} onChange={(astppAdminToken) => setSettingsDraft((current) => ({ ...current, astppAdminToken }))} />
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <Field label={tr('adminPanel.admin.sip.astpp.profileId', 'SIP Profile ID', 'معرف ملف SIP')} value={settingsDraft.astppSipProfileId} placeholder="1" onChange={(astppSipProfileId) => setSettingsDraft((current) => ({ ...current, astppSipProfileId }))} />
              <Field label={tr('adminPanel.admin.sip.astpp.resellerId', 'Reseller ID', 'معرف الموزع')} value={settingsDraft.astppResellerId} placeholder="0" onChange={(astppResellerId) => setSettingsDraft((current) => ({ ...current, astppResellerId }))} />
              <TransportSelect label={tr('adminPanel.admin.sip.astpp.transport', 'SIP Transport', 'نقل SIP')} value={settingsDraft.astppSipTransport} onChange={(astppSipTransport) => setSettingsDraft((current) => ({ ...current, astppSipTransport }))} />
              <Field label={tr('adminPanel.admin.sip.astpp.port', 'SIP Port', 'منفذ SIP')} value={settingsDraft.astppSipPort} placeholder="5060" onChange={(astppSipPort) => setSettingsDraft((current) => ({ ...current, astppSipPort }))} />
            </div>
            <Field label={tr('adminPanel.admin.sip.astpp.outboundProxy', 'Outbound Proxy', 'الوسيط الصادر')} value={settingsDraft.astppOutboundProxy} placeholder="sip:sip.yourdomain.com;transport=udp" onChange={(astppOutboundProxy) => setSettingsDraft((current) => ({ ...current, astppOutboundProxy }))} />
            <StatusPanel
              status={astppStatus}
              message={translateStatusMessage(testAstppMutation.data?.message || settings.astpp_status_message || 'ASTPP API has not been tested yet.')}
              checkedAt={testAstppMutation.data?.checkedAt || settings.astpp_last_checked_at}
              onlineLabel={readyLabel}
              offlineLabel={offlineLabel}
              notTestedLabel={notTestedLabel}
              statusLabel={statusLabel}
              lastCheckedLabel={lastCheckedLabel}
            />
          </CardContent>
        </Card>

        <Card className={panelClass}>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className={cardTitleClass}>
                  <Settings className="h-5 w-5 text-teal-500" />
                  {tr('adminPanel.admin.sip.freePbx.title', 'FreePBX / Asterisk', 'FreePBX / Asterisk')}
                </CardTitle>
                <CardDescription className={cardDescriptionClass}>
                  {tr(
                    'adminPanel.admin.sip.freePbx.description',
                    'Provision real Linphone SIP accounts using Asterisk PJSIP realtime tables.',
                    'أنشئ حسابات Linphone SIP حقيقية باستخدام جداول Asterisk PJSIP Realtime.',
                  )}
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Badge className={`w-fit gap-1.5 border px-3 py-1 ${statusClasses(freePbxStatus)}`}>
                  {freePbxStatus === 'online' ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                  {connectionLabel(freePbxStatus, readyLabel, offlineLabel, notTestedLabel)}
                </Badge>
                <Button type="button" size="sm" className={primaryButtonClass} onClick={() => testFreePbxMutation.mutate()} disabled={testFreePbxMutation.isPending || !settingsDraft.freePbxEnabled}>
                  {testFreePbxMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {tr('adminPanel.admin.sip.freePbx.testButton', 'Test FreePBX', 'اختبار FreePBX')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`${lightBoxClass} flex items-center justify-between`}>
              <div>
                <Label className={labelClass}>{tr('adminPanel.admin.sip.freePbx.enableLabel', 'Enable Real SIP Provisioning', 'تفعيل إنشاء حسابات SIP الحقيقية')}</Label>
                <p className="mt-1 text-xs text-slate-500">
                  {tr(
                    'adminPanel.admin.sip.freePbx.enableDescription',
                    'New customer SIP accounts will be created as real Asterisk endpoints.',
                    'سيتم إنشاء حسابات SIP الجديدة للعملاء كنقاط نهاية حقيقية في Asterisk.',
                  )}
                </p>
              </div>
              <Switch checked={settingsDraft.freePbxEnabled} onCheckedChange={(freePbxEnabled) => setSettingsDraft((current) => ({ ...current, freePbxEnabled }))} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={tr('adminPanel.admin.sip.freePbx.domain', 'SIP Domain', 'نطاق SIP')} value={settingsDraft.freePbxDomain} placeholder="sip.yourdomain.com" onChange={(freePbxDomain) => setSettingsDraft((current) => ({ ...current, freePbxDomain, sipServer: freePbxDomain }))} />
              <div>
                <Label className={labelClass}>{tr('adminPanel.admin.sip.freePbx.provisioningMode', 'Provisioning Mode', 'وضع الإنشاء')}</Label>
                <Select value={settingsDraft.freePbxProvisioningMode} onValueChange={(freePbxProvisioningMode) => setSettingsDraft((current) => ({ ...current, freePbxProvisioningMode }))}>
                  <SelectTrigger className={darkSelectClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={darkSelectContentClass}>
                    <SelectItem value="realtime">{tr('adminPanel.admin.sip.freePbx.modeRealtime', 'Asterisk Realtime', 'Asterisk Realtime')}</SelectItem>
                    <SelectItem value="manual">{tr('adminPanel.admin.sip.freePbx.modeManual', 'Manual PBX', 'PBX يدوي')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label={tr('adminPanel.admin.sip.freePbx.transportName', 'PJSIP Transport Name', 'اسم نقل PJSIP')} value={settingsDraft.freePbxTransport} placeholder="transport-tls" onChange={(freePbxTransport) => setSettingsDraft((current) => ({ ...current, freePbxTransport }))} />
              <Field label={tr('adminPanel.admin.sip.freePbx.dialContext', 'Dial Context', 'سياق الاتصال')} value={settingsDraft.freePbxContext} placeholder="from-internal" onChange={(freePbxContext) => setSettingsDraft((current) => ({ ...current, freePbxContext }))} />
              <Field label={tr('adminPanel.admin.sip.freePbx.linphonePort', 'Linphone SIP Port', 'منفذ Linphone SIP')} value={settingsDraft.linphoneSipPort} placeholder="5061" onChange={(linphoneSipPort) => setSettingsDraft((current) => ({ ...current, linphoneSipPort }))} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={tr('adminPanel.admin.sip.freePbx.allowedCodecs', 'Allowed Codecs', 'الترميزات المسموحة')} value={settingsDraft.freePbxAllowCodecs} placeholder="opus,ulaw,alaw" onChange={(freePbxAllowCodecs) => setSettingsDraft((current) => ({ ...current, freePbxAllowCodecs }))} />
              <Field label={tr('adminPanel.admin.sip.freePbx.voicemailExtension', 'Voicemail Extension', 'امتداد البريد الصوتي')} value={settingsDraft.freePbxVoicemailExtension} placeholder="*98" onChange={(freePbxVoicemailExtension) => setSettingsDraft((current) => ({ ...current, freePbxVoicemailExtension }))} />
            </div>
            <Field label={tr('adminPanel.admin.sip.freePbx.outboundProxy', 'Outbound Proxy', 'الوسيط الصادر')} value={settingsDraft.linphoneOutboundProxy} placeholder="sip:sip.yourdomain.com;transport=tls" onChange={(linphoneOutboundProxy) => setSettingsDraft((current) => ({ ...current, linphoneOutboundProxy }))} />
            <StatusPanel
              status={freePbxStatus}
              message={translateStatusMessage(testFreePbxMutation.data?.message || settings.freepbx_status_message || 'FreePBX realtime provisioning has not been tested yet.')}
              checkedAt={testFreePbxMutation.data?.checkedAt || settings.freepbx_last_checked_at}
              onlineLabel={readyLabel}
              offlineLabel={offlineLabel}
              notTestedLabel={notTestedLabel}
              statusLabel={statusLabel}
              lastCheckedLabel={lastCheckedLabel}
            />
          </CardContent>
        </Card>

        <Card className={panelClass}>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className={cardTitleClass}>
                  <Smartphone className="h-5 w-5 text-teal-500" />
                  {tr('adminPanel.admin.sip.shared.title', 'Shared Call Center SIP Account', 'حساب SIP المشترك لمركز الاتصال')}
                </CardTitle>
                <CardDescription className={cardDescriptionClass}>
                  {tr(
                    'adminPanel.admin.sip.shared.description',
                    'Store one support SIP registration and use it for every active VIP Concierge call.',
                    'احفظ تسجيل SIP واحد للدعم واستخدمه لكل مكالمة كونسيرج VIP نشطة.',
                  )}
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Badge className={`w-fit gap-1.5 border px-3 py-1 ${statusClasses(sipStatus)}`}>
                  {sipStatus === 'online' ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                  {connectionLabel(sipStatus, onlineLabel, offlineLabel, notTestedLabel)}
                </Badge>
                <Button type="button" size="sm" className={primaryButtonClass} onClick={() => testSipConnectionMutation.mutate()} disabled={testSipConnectionMutation.isPending || !settingsDraft.sipServer.trim()}>
                  {testSipConnectionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {tr('adminPanel.admin.sip.shared.testButton', 'Test Connection', 'اختبار الاتصال')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`${lightBoxClass} flex items-center justify-between`}>
              <Label className={labelClass}>{tr('adminPanel.admin.sip.shared.enableLabel', 'Enable Call Center SIP Call', 'تفعيل مكالمة SIP لمركز الاتصال')}</Label>
              <Switch checked={settingsDraft.sipEnabled} onCheckedChange={(sipEnabled) => setSettingsDraft((current) => ({ ...current, sipEnabled }))} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={tr('adminPanel.admin.sip.shared.buttonLabel', 'Button Label', 'تسمية الزر')} value={settingsDraft.sipLabel} placeholder={tr('adminPanel.admin.sip.shared.buttonPlaceholder', 'Free SIP Call', 'مكالمة SIP مجانية')} onChange={(sipLabel) => setSettingsDraft((current) => ({ ...current, sipLabel }))} />
              <Field label={tr('adminPanel.admin.sip.shared.customerAddress', 'Customer Call Address', 'عنوان اتصال العميل')} value={settingsDraft.sipUri} placeholder="support@pbx.example.com or 1001@pbx.example.com" onChange={(sipUri) => setSettingsDraft((current) => ({ ...current, sipUri }))} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={tr('adminPanel.admin.sip.shared.serverDomain', 'SIP Server / Domain', 'خادم / نطاق SIP')} value={settingsDraft.sipServer} placeholder="pbx.example.com" onChange={(sipServer) => setSettingsDraft((current) => ({ ...current, sipServer }))} />
              <Field label={tr('adminPanel.admin.sip.shared.supportExtension', 'Support Extension', 'امتداد الدعم')} value={settingsDraft.sipExtension} placeholder="1001" onChange={(sipExtension) => setSettingsDraft((current) => ({ ...current, sipExtension }))} />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label={tr('adminPanel.admin.sip.shared.username', 'Registration Username', 'اسم مستخدم التسجيل')} value={settingsDraft.sipUsername} placeholder="1001" onChange={(sipUsername) => setSettingsDraft((current) => ({ ...current, sipUsername }))} />
              <Field
                label={tr('adminPanel.admin.sip.shared.password', 'Registration Password', 'كلمة مرور التسجيل')}
                type="password"
                value={settingsDraft.sipPassword}
                placeholder={
                  settingsDraft.sipPasswordSaved
                    ? tr('adminPanel.admin.sip.shared.savedPasswordPlaceholder', 'Saved - enter new password to replace', 'محفوظة - أدخل كلمة مرور جديدة للاستبدال')
                    : tr('adminPanel.admin.sip.shared.passwordPlaceholder', 'SIP account password', 'كلمة مرور حساب SIP')
                }
                onChange={(sipPassword) => setSettingsDraft((current) => ({ ...current, sipPassword }))}
              />
              <TransportSelect label={tr('adminPanel.admin.sip.shared.transport', 'Transport', 'النقل')} value={settingsDraft.sipTransport} onChange={(sipTransport) => setSettingsDraft((current) => ({ ...current, sipTransport }))} />
            </div>
            <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-slate-700">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium">
                    {tr('adminPanel.admin.sip.shared.targetLabel', 'Call center target', 'هدف مركز الاتصال')}: {activeSipUri || notConfiguredLabel}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {tr(
                      'adminPanel.admin.sip.shared.targetDescription',
                      'All Concierge users call this same shared SIP account. Use these credentials in Linphone or Zoiper on the call-center device.',
                      'كل مستخدمي الكونسيرج يتصلون بنفس حساب SIP المشترك. استخدم هذه البيانات في Linphone أو Zoiper على جهاز مركز الاتصال.',
                    )}
                  </p>
                </div>
                {generatedSipUri && (
                  <Button type="button" variant="outline" size="sm" className={outlineButtonClass} onClick={() => setSettingsDraft((current) => ({ ...current, sipUri: generatedSipUri }))}>
                    {tr('adminPanel.admin.sip.shared.useGeneratedUri', 'Use Generated URI', 'استخدام الرابط المولد')}
                  </Button>
                )}
              </div>
            </div>
            <StatusPanel
              status={sipStatus}
              message={translateStatusMessage(testSipConnectionMutation.data?.message || settings.concierge_sip_status_message || 'Connection has not been tested yet.')}
              checkedAt={testSipConnectionMutation.data?.checkedAt || settings.concierge_sip_last_checked_at}
              onlineLabel={onlineLabel}
              offlineLabel={offlineLabel}
              notTestedLabel={notTestedLabel}
              statusLabel={statusLabel}
              lastCheckedLabel={lastCheckedLabel}
            />
            <p className="text-xs text-slate-500">
              {tr(
                'adminPanel.admin.sip.shared.securityNote',
                'Customers never receive the registration username or password. Web and mobile only open the call-center {protocol} link after VIP Concierge is active.',
                'لا يحصل العملاء أبدا على اسم مستخدم التسجيل أو كلمة المرور. يفتح الويب والموبايل رابط {protocol} لمركز الاتصال فقط بعد تفعيل كونسيرج VIP.',
                { protocol: 'sip:' },
              )}
            </p>
          </CardContent>
        </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <Label className={labelClass}>{label}</Label>
      <Input type={type} className={darkFieldClass} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function TransportSelect({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <Label className={labelClass}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={darkSelectClass}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={darkSelectContentClass}>
          <SelectItem value="udp">UDP</SelectItem>
          <SelectItem value="tcp">TCP</SelectItem>
          <SelectItem value="tls">TLS</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function StatusPanel({
  status,
  message,
  checkedAt,
  onlineLabel = 'Ready',
  offlineLabel = 'Offline',
  notTestedLabel = 'Not tested',
  statusLabel = 'Status',
  lastCheckedLabel = 'Last checked',
}: {
  status: string;
  message: string;
  checkedAt?: string;
  onlineLabel?: string;
  offlineLabel?: string;
  notTestedLabel?: string;
  statusLabel?: string;
  lastCheckedLabel?: string;
}) {
  const label = connectionLabel(status, onlineLabel, offlineLabel, notTestedLabel);
  return (
    <div className={`rounded-lg border p-3 text-sm ${statusClasses(status)}`}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-medium">{statusLabel}: {label}</p>
        {checkedAt && <p className="text-xs opacity-75">{lastCheckedLabel}: {new Date(checkedAt).toLocaleString()}</p>}
      </div>
      <p className="mt-1 text-xs opacity-80">{message}</p>
    </div>
  );
}
