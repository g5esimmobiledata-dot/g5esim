import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Mail, Send, Trash2, Edit, Power } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

export default function AdminEmailMarketing() {
  const [activeTab, setActiveTab] = useState('campaigns');
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  const [showAutomationDialog, setShowAutomationDialog] = useState(false);
  const { toast } = useToast();

  // Campaign state
  const [campaignName, setCampaignName] = useState('');
  const [campaignSubject, setCampaignSubject] = useState('');
  const [campaignContent, setCampaignContent] = useState('');

  // Automation state
  const [automationName, setAutomationName] = useState('');
  const [automationTrigger, setAutomationTrigger] = useState('welcome');
  const [automationSubject, setAutomationSubject] = useState('');
  const [automationContent, setAutomationContent] = useState('');
  const [automationDelay, setAutomationDelay] = useState(0);

  const { data: campaigns, isLoading: campaignsLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/email/campaigns'],
  });

  const { data: automations, isLoading: automationsLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/email/automations'],
  });

  const { data: subscriptions, isLoading: subscriptionsLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/email/subscriptions'],
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/admin/email/campaigns', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/email/campaigns'] });
      toast({ title: 'Campaign created successfully' });
      setShowCampaignDialog(false);
      resetCampaignForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create campaign',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createAutomationMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/admin/email/automations', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/email/automations'] });
      toast({ title: 'Automation created successfully' });
      setShowAutomationDialog(false);
      resetAutomationForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create automation',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const toggleAutomationMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('POST', `/api/admin/email/automations/${id}/toggle`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/email/automations'] });
      toast({ title: 'Automation updated' });
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/admin/email/campaigns/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/email/campaigns'] });
      toast({ title: 'Campaign deleted' });
    },
  });

  const deleteAutomationMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/admin/email/automations/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/email/automations'] });
      toast({ title: 'Automation deleted' });
    },
  });

  const resetCampaignForm = () => {
    setCampaignName('');
    setCampaignSubject('');
    setCampaignContent('');
  };

  const resetAutomationForm = () => {
    setAutomationName('');
    setAutomationTrigger('welcome');
    setAutomationSubject('');
    setAutomationContent('');
    setAutomationDelay(0);
  };

  const handleCreateCampaign = () => {
    if (!campaignName || !campaignSubject || !campaignContent) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    createCampaignMutation.mutate({
      name: campaignName,
      subject: campaignSubject,
      content: campaignContent,
    });
  };

  const handleCreateAutomation = () => {
    if (!automationName || !automationSubject || !automationContent) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    createAutomationMutation.mutate({
      name: automationName,
      trigger: automationTrigger,
      subject: automationSubject,
      content: automationContent,
      delayMinutes: automationDelay,
    });
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Email Marketing - Admin Dashboard</title>
      </Helmet>

      <div>
        <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">
          Email Marketing
        </h1>
        <p className="text-muted-foreground mt-1">Manage campaigns, automations, and subscribers</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-email-marketing">
          <TabsTrigger value="campaigns" data-testid="tab-campaigns">
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="automations" data-testid="tab-automations">
            Automations
          </TabsTrigger>
          <TabsTrigger value="subscribers" data-testid="tab-subscribers">
            Subscribers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-6">
          <div className="flex flex-col md:flex-row gap-3 justify-between items-start">
            <h2 className="text-xl font-semibold">Email Campaigns</h2>
            <Dialog open={showCampaignDialog} onOpenChange={setShowCampaignDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-campaign">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Email Campaign</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="campaign-name">Campaign Name</Label>
                    <Input
                      id="campaign-name"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      placeholder="Summer Sale 2025"
                      data-testid="input-campaign-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="campaign-subject">Email Subject</Label>
                    <Input
                      id="campaign-subject"
                      value={campaignSubject}
                      onChange={(e) => setCampaignSubject(e.target.value)}
                      placeholder="Get 20% off all eSIM Packages"
                      data-testid="input-campaign-subject"
                    />
                  </div>
                  <div>
                    <Label htmlFor="campaign-content">Email Content</Label>
                    <Textarea
                      id="campaign-content"
                      value={campaignContent}
                      onChange={(e) => setCampaignContent(e.target.value)}
                      placeholder="Email body content here..."
                      rows={8}
                      data-testid="textarea-campaign-content"
                    />
                  </div>
                  <Button
                    onClick={handleCreateCampaign}
                    disabled={createCampaignMutation.isPending}
                    data-testid="button-save-campaign"
                  >
                    {createCampaignMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Campaign'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {campaignsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : campaigns && campaigns.length > 0 ? (
            <div className="grid gap-4">
              {campaigns.map((campaign: any) => (
                <Card key={campaign.id} data-testid={`campaign-${campaign.id}`}>
                  <CardContent className="flex items-center justify-between p-6">
                    <div className="flex-1">
                      <h3 className="font-semibold" data-testid={`campaign-name-${campaign.id}`}>
                        {campaign.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">{campaign.subject}</p>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Status: {campaign.status}</span>
                        <span>Recipients: {campaign.recipientCount || 0}</span>
                        <span>Opens: {campaign.openedCount || 0}</span>
                        <span>Clicks: {campaign.clickedCount || 0}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteCampaignMutation.mutate(campaign.id)}
                      disabled={deleteCampaignMutation.isPending}
                      data-testid={`button-delete-campaign-${campaign.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No campaigns created yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="automations" className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <h2 className="text-xl font-semibold">Email Automations</h2>
            <Dialog open={showAutomationDialog} onOpenChange={setShowAutomationDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-automation">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Automation
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Email Automation</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="automation-name">Automation Name</Label>
                    <Input
                      id="automation-name"
                      value={automationName}
                      onChange={(e) => setAutomationName(e.target.value)}
                      placeholder="Welcome Email"
                      data-testid="input-automation-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="automation-trigger">Trigger</Label>
                    <Select value={automationTrigger} onValueChange={setAutomationTrigger}>
                      <SelectTrigger
                        id="automation-trigger"
                        data-testid="select-automation-trigger"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="welcome">Welcome (New User)</SelectItem>
                        <SelectItem value="abandoned_cart">Abandoned Cart</SelectItem>
                        <SelectItem value="order_completed">Order Completed</SelectItem>
                        <SelectItem value="no_purchase_30days">No Purchase in 30 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="automation-delay">Delay (minutes)</Label>
                    <Input
                      id="automation-delay"
                      type="number"
                      value={automationDelay}
                      onChange={(e) => setAutomationDelay(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      data-testid="input-automation-delay"
                    />
                  </div>
                  <div>
                    <Label htmlFor="automation-subject">Email Subject</Label>
                    <Input
                      id="automation-subject"
                      value={automationSubject}
                      onChange={(e) => setAutomationSubject(e.target.value)}
                      placeholder="Welcome to our platform!"
                      data-testid="input-automation-subject"
                    />
                  </div>
                  <div>
                    <Label htmlFor="automation-content">Email Content</Label>
                    <Textarea
                      id="automation-content"
                      value={automationContent}
                      onChange={(e) => setAutomationContent(e.target.value)}
                      placeholder="Email body content here..."
                      rows={8}
                      data-testid="textarea-automation-content"
                    />
                  </div>
                  <Button
                    onClick={handleCreateAutomation}
                    disabled={createAutomationMutation.isPending}
                    data-testid="button-save-automation"
                  >
                    {createAutomationMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Automation'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {automationsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : automations && automations.length > 0 ? (
            <div className="grid gap-4">
              {automations.map((automation: any) => (
                <Card key={automation.id} data-testid={`automation-${automation.id}`}>
                  <CardContent className="flex items-center justify-between p-6">
                    <div className="flex-1">
                      <h3
                        className="font-semibold"
                        data-testid={`automation-name-${automation.id}`}
                      >
                        {automation.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">{automation.subject}</p>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Trigger: {automation.trigger}</span>
                        <span>Delay: {automation.delayMinutes || 0} min</span>
                        <span className={automation.enabled ? 'text-green-600' : 'text-gray-400'}>
                          {automation.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleAutomationMutation.mutate(automation.id)}
                        disabled={toggleAutomationMutation.isPending}
                        data-testid={`button-toggle-automation-${automation.id}`}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteAutomationMutation.mutate(automation.id)}
                        disabled={deleteAutomationMutation.isPending}
                        data-testid={`button-delete-automation-${automation.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Send className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No automations created yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="subscribers" className="space-y-6">
          <h2 className="text-xl font-semibold">Email Subscribers</h2>

          {subscriptionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>
                  Total Subscribers: {subscriptions?.filter((s: any) => s.subscribed).length || 0}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {subscriptions && subscriptions.length > 0 ? (
                  <div className="space-y-2">
                    {subscriptions.map((sub: any) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                        data-testid={`subscription-${sub.id}`}
                      >
                        <div>
                          <p className="font-medium" data-testid={`subscription-email-${sub.id}`}>
                            {sub.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {sub.subscribed ? 'Subscribed' : 'Unsubscribed'}
                            {' • '}
                            {new Date(sub.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div
                          className={`text-xs px-2 py-1 rounded ${sub.subscribed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
                        >
                          {sub.subscribed ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No subscribers yet</p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
