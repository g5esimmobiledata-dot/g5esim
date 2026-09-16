import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Info } from 'lucide-react';
import type { EmailTemplate } from '@shared/schema';
import { useTranslation } from '@/contexts/TranslationContext';

export default function EmailTemplates() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const eventTypeOptions = [
    {
      value: 'welcome',
      label: t('admin.emailTemplates.eventTypes.welcome', 'Welcome Email'),
      variables: ['customer_name', 'customer_email', 'platform_name'],
    },
    {
      value: 'esim_purchased',
      label: t('admin.emailTemplates.eventTypes.esimPurchased', 'eSIM Purchased'),
      variables: [
        'customer_name',
        'order_number',
        'esim_iccid',
        'country',
        'data_amount',
        'validity_days',
        'price',
        'qr_code_url',
      ],
    },
    {
      value: 'topup_purchased',
      label: t('admin.emailTemplates.eventTypes.topupPurchased', 'Top-up Purchased'),
      variables: ['customer_name', 'topup_id', 'esim_iccid', 'country', 'data_amount', 'price'],
    },
    {
      value: 'low_data_75',
      label: t('admin.emailTemplates.eventTypes.lowData75', 'Low Data Alert (75%)'),
      variables: [
        'customer_name',
        'esim_iccid',
        'country',
        'data_used_percentage',
        'data_remaining',
        'topup_link',
      ],
    },
    {
      value: 'low_data_90',
      label: t('admin.emailTemplates.eventTypes.lowData90', 'Low Data Alert (90%)'),
      variables: [
        'customer_name',
        'esim_iccid',
        'country',
        'data_used_percentage',
        'data_remaining',
        'topup_link',
      ],
    },
    {
      value: 'expiring_3days',
      label: t('admin.emailTemplates.eventTypes.expiring3days', 'Expiring Soon (3 days)'),
      variables: [
        'customer_name',
        'esim_iccid',
        'country',
        'expiry_date',
        'days_until_expiry',
        'topup_link',
      ],
    },
    {
      value: 'expiring_1day',
      label: t('admin.emailTemplates.eventTypes.expiring1day', 'Expiring Soon (1 day)'),
      variables: [
        'customer_name',
        'esim_iccid',
        'country',
        'expiry_date',
        'days_until_expiry',
        'topup_link',
      ],
    },
    {
      value: 'custom',
      label: t('admin.emailTemplates.eventTypes.custom', 'Custom Email'),
      variables: ['customer_name', 'customer_email'],
    },
  ];

  const templateFormSchema = z.object({
    eventType: z
      .string()
      .min(1, t('admin.emailTemplates.validation.eventTypeRequired', 'Event type is required')),
    name: z.string().min(1, t('admin.emailTemplates.validation.nameRequired', 'Name is required')),
    subject: z
      .string()
      .min(1, t('admin.emailTemplates.validation.subjectRequired', 'Subject is required')),
    body: z.string().min(1, t('admin.emailTemplates.validation.bodyRequired', 'Body is required')),
    isActive: z.boolean(),
  });

  type TemplateFormData = z.infer<typeof templateFormSchema>;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);

  const { data: templates, isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ['/api/admin/email-templates'],
  });

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      eventType: '',
      name: '',
      subject: '',
      body: '',
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const payload = {
        ...data,
        variables: selectedVariables,
      };
      return apiRequest('POST', '/api/admin/email-templates', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/email-templates'] });
      toast({
        title: t('admin.emailTemplates.success', 'Success'),
        description: t(
          'admin.emailTemplates.createdSuccess',
          'Email template created successfully',
        ),
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: t('admin.emailTemplates.error', 'Error'),
        description:
          error.message ||
          t('admin.emailTemplates.createFailed', 'Failed to create email template'),
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: TemplateFormData & { id: string }) => {
      const { id, ...payload } = data;
      return apiRequest('PUT', `/api/admin/email-templates/${id}`, {
        ...payload,
        variables: selectedVariables,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/email-templates'] });
      toast({
        title: t('admin.emailTemplates.success', 'Success'),
        description: t(
          'admin.emailTemplates.updatedSuccess',
          'Email template updated successfully',
        ),
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: t('admin.emailTemplates.error', 'Error'),
        description:
          error.message ||
          t('admin.emailTemplates.updateFailed', 'Failed to update email template'),
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/admin/email-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/email-templates'] });
      toast({
        title: t('admin.emailTemplates.success', 'Success'),
        description: t(
          'admin.emailTemplates.deletedSuccess',
          'Email template deleted successfully',
        ),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('admin.emailTemplates.error', 'Error'),
        description:
          error.message ||
          t('admin.emailTemplates.deleteFailed', 'Failed to delete email template'),
        variant: 'destructive',
      });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTemplate(null);
    setSelectedVariables([]);
    form.reset();
  };

  const handleOpenCreateDialog = () => {
    setEditingTemplate(null);
    setSelectedVariables([]);
    form.reset({
      eventType: '',
      name: '',
      subject: '',
      body: '',
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setSelectedVariables(template.variables || []);
    form.reset({
      eventType: template.eventType,
      name: template.name,
      subject: template.subject,
      body: template.body,
      isActive: template.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (
      confirm(
        t(
          'admin.emailTemplates.confirmDelete',
          'Are you sure you want to delete this email template?',
        ),
      )
    ) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (data: TemplateFormData) => {
    if (editingTemplate) {
      updateMutation.mutate({ ...data, id: editingTemplate.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEventTypeChange = (eventType: string) => {
    const option = eventTypeOptions.find((opt) => opt.value === eventType);
    if (option) {
      setSelectedVariables(option.variables);
    }
  };

  return (
    <>
      <Helmet>
        <title>{String(t('admin.emailTemplates.pageTitle', 'Email Templates - Admin'))}</title>
      </Helmet>

      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {t('admin.emailTemplates.title', 'Email Templates')}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t(
                'admin.emailTemplates.description',
                'Customize email templates for all platform events with variable support',
              )}
            </p>
          </div>
          <Button onClick={handleOpenCreateDialog} data-testid="button-create-template">
            <Plus className="h-4 w-4 mr-2" />
            {t('admin.emailTemplates.createTemplate', 'Create Template')}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('admin.emailTemplates.allTemplates', 'All Templates')}</CardTitle>
            <CardDescription>
              {t(
                'admin.emailTemplates.cardDescription',
                'Manage email templates for welcome emails, purchase confirmations, usage alerts, and custom communications',
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                {t('admin.emailTemplates.loadingTemplates', 'Loading templates...')}
              </div>
            ) : !templates || templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t(
                  'admin.emailTemplates.noTemplates',
                  'No email templates found. Create your first template to get started.',
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.emailTemplates.name', 'Name')}</TableHead>
                    <TableHead>{t('admin.emailTemplates.eventType', 'Event Type')}</TableHead>
                    <TableHead>{t('admin.emailTemplates.subject', 'Subject')}</TableHead>
                    <TableHead>{t('admin.emailTemplates.status', 'Status')}</TableHead>
                    <TableHead>{t('admin.emailTemplates.variables', 'Variables')}</TableHead>
                    <TableHead>{t('admin.emailTemplates.lastUpdated', 'Last Updated')}</TableHead>
                    <TableHead className="text-right">
                      {t('admin.emailTemplates.actions', 'Actions')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell
                        className="font-medium"
                        data-testid={`text-template-name-${template.id}`}
                      >
                        {template.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {eventTypeOptions.find((opt) => opt.value === template.eventType)
                            ?.label || template.eventType}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={template.subject}>
                        {template.subject}
                      </TableCell>
                      <TableCell>
                        <Badge variant={template.isActive ? 'default' : 'secondary'}>
                          {template.isActive
                            ? t('admin.emailTemplates.active', 'Active')
                            : t('admin.emailTemplates.inactive', 'Inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {template.variables?.length || 0}{' '}
                          {t('admin.emailTemplates.variablesCount', 'variables')}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(template.updatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditDialog(template)}
                          data-testid={`button-edit-${template.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(template.id)}
                          data-testid={`button-delete-${template.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate
                ? t('admin.emailTemplates.editTemplate', 'Edit Email Template')
                : t('admin.emailTemplates.createTemplate', 'Create Email Template')}
            </DialogTitle>
            <DialogDescription>
              {t(
                'admin.emailTemplates.dialogDescription',
                'Customize email content with variable placeholders like {{customer_name}} for personalization',
              )}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="eventType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.emailTemplates.form.eventType', 'Event Type')}</FormLabel>
                    <Select
                      disabled={!!editingTemplate}
                      onValueChange={(value) => {
                        field.onChange(value);
                        handleEventTypeChange(value);
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-event-type">
                          <SelectValue
                            placeholder={t(
                              'admin.emailTemplates.form.selectEventType',
                              'Select event type',
                            )}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {eventTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t(
                        'admin.emailTemplates.form.eventTypeHelp',
                        'The event that triggers this email',
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('admin.emailTemplates.form.templateName', 'Template Name')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t(
                          'admin.emailTemplates.form.templateNamePlaceholder',
                          'e.g., Welcome Email',
                        )}
                        data-testid="input-name"
                      />
                    </FormControl>
                    <FormDescription>
                      {t(
                        'admin.emailTemplates.form.templateNameHelp',
                        'Internal name to identify this template',
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('admin.emailTemplates.form.emailSubject', 'Email Subject')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t(
                          'admin.emailTemplates.form.subjectPlaceholder',
                          'e.g., Welcome to {{platform_name}}, {{customer_name}}!',
                        )}
                        data-testid="input-subject"
                      />
                    </FormControl>
                    <FormDescription>
                      {t(
                        'admin.emailTemplates.form.subjectHelp',
                        'Subject line with variable placeholders',
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('admin.emailTemplates.form.emailBody', 'Email Body (HTML)')}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={t(
                          'admin.emailTemplates.form.bodyPlaceholder',
                          'Enter HTML email content with {{variable}} placeholders...',
                        )}
                        rows={10}
                        className="font-mono text-sm"
                        data-testid="input-body"
                      />
                    </FormControl>
                    <FormDescription>
                      {t(
                        'admin.emailTemplates.form.bodyHelp',
                        'HTML content with variable placeholders',
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedVariables.length > 0 && (
                <div className="bg-muted p-4 rounded-md">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-2">
                        {t('admin.emailTemplates.form.availableVariables', 'Available Variables:')}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedVariables.map((variable) => (
                          <Badge key={variable} variant="secondary" className="font-mono text-xs">
                            {`{{${variable}}}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        {t('admin.emailTemplates.form.active', 'Active')}
                      </FormLabel>
                      <FormDescription>
                        {t(
                          'admin.emailTemplates.form.activeHelp',
                          'Enable or disable this email template',
                        )}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  data-testid="button-cancel"
                >
                  {t('admin.emailTemplates.form.cancel', 'Cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save"
                >
                  {editingTemplate
                    ? t('admin.emailTemplates.form.updateTemplate', 'Update Template')
                    : t('admin.emailTemplates.form.createTemplate', 'Create Template')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
