import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  Info,
  Trash2,
  Smartphone,
  Home,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { useTranslation } from '@/contexts/TranslationContext';
import { AccountLayout } from '@/components/layout/AccountLayout';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  email: string;
  name?: string;
  kycStatus: string;
  kycRejectionReason?: string;
}

interface KycDocument {
  id: string;
  documentType: string;
  status: string;
  createdAt: string;
}

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function KYCSubmission() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>('');
  const [kycBlockedModal, setKycBlockedModal] = useState(false);

  const { data: user } = useQuery<User>({
    queryKey: ['/api/customer/profile'],
  });

  const { data: documents, isLoading } = useQuery<KycDocument[]>({
    queryKey: ['/api/kyc/documents'],
  });

  const canResubmitKyc = user?.kycStatus === 'rejected' || user?.kycStatus === 'pending';

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/customer/kyc/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/kyc/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customer/profile'] });
      setSelectedFile(null);
      setDocumentType('');
      toast({
        title: t('website.kyc.documentUploaded', 'Document Uploaded'),
        description: t(
          'website.kyc.documentUploadedDesc',
          'Your KYC document has been submitted for review.',
        ),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('website.kyc.uploadFailed', 'Upload Failed'),
        description: error.message || t('website.kyc.uploadFailedDesc', 'Failed to upload document'),
        variant: 'destructive',
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: t('website.kyc.fileTooLarge', 'File Too Large'),
          description: t('website.kyc.fileTooLargeDesc', 'Please select a file smaller than 10MB'),
          variant: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canResubmitKyc) {
      setKycBlockedModal(true);
      return;
    }
    if (!selectedFile || !documentType) {
      toast({
        title: t('website.kyc.missingInformation', 'Missing Information'),
        description: t('website.kyc.missingInformationDesc', 'Please select a document type and file'),
        variant: 'destructive',
      });
      return;
    }

    const formData = new FormData();
    formData.append('document', selectedFile);
    formData.append('documentType', documentType);

    uploadMutation.mutate(formData);
  };

  const getStatusInfo = (status: string | undefined) => {
    switch (status) {
      case 'approved':
      case 'verified':
        return {
          icon: <CheckCircle className="h-8 w-8 text-green-500" />,
          title: t('website.kyc.verificationApproved', 'Verification Approved'),
          desc: t('website.kyc.approvedDesc', 'Your identity has been verified successfully'),
          color: 'bg-green-50/50 dark:bg-green-900/10 border-green-200/50 dark:border-green-800/50',
          badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
          label: t('website.kyc.status.approved', 'Approved'),
        };
      case 'rejected':
        return {
          icon: <XCircle className="h-8 w-8 text-red-500" />,
          title: t('website.kyc.verificationRejected', 'Verification Rejected'),
          desc: t('website.kyc.rejectedDesc', 'Please submit new documents'),
          color: 'bg-red-50/50 dark:bg-red-900/10 border-red-200/50 dark:border-red-800/50',
          badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
          label: t('website.kyc.status.rejected', 'Rejected'),
        };
      case 'submitted':
        return {
          icon: <Clock className="h-8 w-8 text-orange-500" />,
          title: t('website.kyc.underReview', 'Under Review'),
          desc: t('website.kyc.submittedDesc', 'Our team is reviewing your documents'),
          color: 'bg-orange-50/50 dark:bg-orange-900/10 border-orange-200/50 dark:border-orange-800/50',
          badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
          label: t('website.kyc.status.submitted', 'Submitted'),
        };
      default:
        return {
          icon: <AlertCircle className="h-8 w-8 text-primary" />,
          title: t('website.kyc.verificationPending', 'Verification Pending'),
          desc: t('website.kyc.pendingDesc', 'Submit your documents to get verified'),
          color: 'bg-primary/5 dark:bg-primary/10 border-primary/20 dark:border-primary/30',
          badge: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light',
          label: t('website.kyc.status.pending', 'Not Submitted'),
        };
    }
  };

  const statusInfo = getStatusInfo(user?.kycStatus);

  return (
    <>
      <Helmet>
        <title>KYC Verification | eSIM Connect</title>
        <meta
          name="description"
          content="Complete your identity verification to unlock all features"
        />
      </Helmet>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8 pb-0"
      >
        {/* Header Section */}
        <section>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {t('website.kyc.title', 'KYC Verification')}
              </h1>
              <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
                {t('website.kyc.description', 'Complete your identity verification to ensure account security and unlock premium features.')}
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-full border border-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">Secure Verification</span>
            </div>
          </div>
        </section>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-primary/20 animate-pulse"></div>
                <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-t-4 border-primary animate-spin"></div>
              </div>
              <p className="text-muted-foreground font-medium animate-pulse">
                {t('website.kyc.loading', 'Syncing verification status...')}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            {/* Main Content Area */}
            <div className="xl:col-span-8 space-y-8">
              {/* Status Card */}
              <motion.div variants={itemVariants}>
                <Card className={cn("overflow-hidden border-2 transition-all duration-300 backdrop-blur-sm shadow-lg", statusInfo.color)}>
                  <CardContent className="p-0">
                    <div className="flex flex-col sm:flex-row items-center gap-6 p-6 sm:p-8">
                      <div className="flex-shrink-0 p-4 bg-card rounded-2xl shadow-sm border border-white/40">
                        {statusInfo.icon}
                      </div>
                      <div className="flex-1 text-center sm:text-left">
                        <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 mb-2">
                          <h2 className="text-xl font-bold text-foreground">{statusInfo.title}</h2>
                          <Badge className={cn("px-3 py-0.5 font-semibold uppercase tracking-wider text-[10px] border-none shadow-sm", statusInfo.badge)}>
                            {statusInfo.label}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground leading-relaxed italic">
                          {statusInfo.desc}
                        </p>
                      </div>
                    </div>
                    {user?.kycStatus === 'rejected' && user?.kycRejectionReason && (
                      <div className="bg-red-500/10 border-t border-red-200/50 dark:border-red-900/30 p-6">
                        <div className="flex gap-3">
                          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-red-700 dark:text-red-400 text-sm mb-1 uppercase tracking-wide">Rejection Reason</p>
                            <p className="text-red-600/90 dark:text-red-400/90 text-sm leading-relaxed">{user.kycRejectionReason}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Upload Form */}
              {canResubmitKyc && (
                <motion.div variants={itemVariants}>
                  <Card className="border-none shadow-xl bg-gradient-to-b from-card to-background overflow-hidden relative rounded-[24px]">
                    <div className="absolute top-0 left-0 w-1 bg-primary h-full opacity-50 rounded-l-[24px]" />
                    <CardHeader className="pb-4 sm:px-7 pt-6">
                      <CardTitle className="text-2xl font-bold tracking-tight">{t('website.kyc.uploadDocuments', 'Identity Submission')}</CardTitle>
                      <CardDescription className="text-sm font-medium">
                        Choose a document type and upload a clear high-quality image.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="sm:px-7 pb-6">
                      <form
                        onSubmit={handleSubmit}
                        className="space-y-6 rounded-[24px] bg-muted/60 p-4 sm:p-5 overflow-hidden border border-primary/10"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
                          <div className="space-y-4">
                            <Label htmlFor="documentType" className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-2">
                              {t('kyc.documentType', '1. Document Type')}
                            </Label>
                            <Select value={documentType} onValueChange={setDocumentType}>
                              <SelectTrigger className="h-[52px] text-base transition-all hover:border-primary/50 focus:ring-primary/20 shadow-sm border-2 rounded-xl">
                                <SelectValue placeholder={t('website.kyc.selectDocumentType', 'Select document type')} />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-2">
                                <SelectItem value="passport" className="py-4 cursor-pointer focus:bg-primary/5 transition-colors">
                                  <div className="flex items-center gap-3 uppercase tracking-wide font-bold text-xs">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                      <FileText className="h-4 w-4" />
                                    </div>
                                    {t('kyc.passport', 'Passport')}
                                  </div>
                                </SelectItem>
                                <SelectItem value="national_id" className="py-4 cursor-pointer focus:bg-primary/5 transition-colors">
                                  <div className="flex items-center gap-3 uppercase tracking-wide font-bold text-xs">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                      <ShieldCheck className="h-4 w-4" />
                                    </div>
                                    {t('website.kyc.nationalId', 'National ID Card')}
                                  </div>
                                </SelectItem>
                                <SelectItem value="drivers_license" className="py-4 cursor-pointer focus:bg-primary/5 transition-colors">
                                  <div className="flex items-center gap-3 uppercase tracking-wide font-bold text-xs">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                      <Smartphone className="h-4 w-4" />
                                    </div>
                                    {t('website.kyc.driversLicense', "Driver's License")}
                                  </div>
                                </SelectItem>
                                <SelectItem value="proof_of_address" className="py-4 cursor-pointer focus:bg-primary/5 transition-colors">
                                  <div className="flex items-center gap-3 uppercase tracking-wide font-bold text-xs">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                      <Home className="h-4 w-4" />
                                    </div>
                                    {t('website.kyc.proofOfAddress', 'Proof of Address')}
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-4">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-2">
                              {t('kyc.uploadFile', '2. Identity File')}
                            </Label>
                            <div className={cn(
                              "relative group border-2 border-dashed rounded-xl transition-all duration-300 min-h-[108px] flex items-center justify-center",
                              selectedFile ? "border-primary bg-primary/5 p-4 shadow-inner" : "border-muted-foreground/20 hover:border-primary/50 p-5 md:p-6 hover:bg-muted"
                            )}>
                              <AnimatePresence mode="wait">
                                {selectedFile ? (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="flex items-center justify-between gap-4 w-full"
                                  >
                                    <div className="flex items-center gap-4">
                                      <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-inner">
                                        <FileText className="h-7 w-7" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-bold text-foreground truncate max-w-[150px] sm:max-w-xs">{selectedFile.name}</p>
                                        <p className="text-xs font-semibold text-primary uppercase tracking-tighter">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready to verify</p>
                                      </div>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors h-12 w-12 rounded-xl"
                                      onClick={() => setSelectedFile(null)}
                                    >
                                      <Trash2 className="h-6 w-6" />
                                    </Button>
                                  </motion.div>
                                ) : (
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center space-y-4 w-full"
                                  >
                                    <div className="mx-auto w-14 h-14 rounded-2xl bg-muted flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-500 shadow-sm">
                                      <Upload className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </div>
                                    <div>
                                      <Label htmlFor="file-upload" className="cursor-pointer block">
                                        <span className="text-primary font-bold hover:underline underline-offset-8 text-lg tracking-tight">
                                          {t('website.kyc.clickToUpload', 'Click to upload')}
                                        </span>
                                      </Label>
                                      <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-[0.2em] font-bold">
                                        {t('website.kyc.fileFormat', 'JPEG, PNG or PDF (MAX 10MB)')}
                                      </p>
                                    </div>
                                    <input
                                      id="file-upload"
                                      type="file"
                                      className="hidden"
                                      accept="image/jpeg,image/png,application/pdf"
                                      onChange={handleFileChange}
                                    />
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </div>

                        <div className="bg-muted rounded-2xl p-5 sm:p-6 border-2 border-primary/10 shadow-inner relative overflow-hidden group">
                          <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-500">
                            <ShieldCheck className="h-32 w-32" />
                          </div>
                          <div className="flex flex-col sm:flex-row gap-5 relative z-10">
                            <div className="w-11 h-11 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0 shadow-sm border border-primary/20">
                              <Info className="h-[22px] w-[22px] text-primary" />
                            </div>
                            <div className="space-y-4 flex-1">
                              <p className="font-bold text-foreground uppercase tracking-widest text-xs">
                                Verification Checklist
                              </p>
                              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                                {[
                                  t('kyc.requirement1', 'Government-issued photo identification'),
                                  t('kyc.requirement2', 'High resolution and fully readable text'),
                                  t('kyc.requirement3', 'All four corners clearly visible'),
                                  t('kyc.requirement4', 'Optimized lighting without glares'),
                                ].map((req, i) => (
                                  <li key={i} className="flex items-start gap-3 text-sm font-medium text-foreground/80 lowercase first-letter:uppercase">
                                    <CheckCircle className="h-4 w-4 text-primary/60 mt-0.5 flex-shrink-0" />
                                    {req}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>

                        <Button
                          type="submit"
                          className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20 transition-all active:scale-[0.97] rounded-2xl overflow-hidden group relative"
                          disabled={!selectedFile || !documentType || uploadMutation.isPending}
                        >
                          <div className="absolute inset-0 bg-muted/40 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />                          {uploadMutation.isPending ? (
                            <div className="flex items-center gap-3 relative z-10">
                              <div className="h-6 w-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                              {t('kyc.uploading', 'Processing...')}
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 relative z-10">
                              {t('kyc.submitForReview', 'Submit for Verification')}
                              <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform duration-500" />
                            </div>
                          )}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Submitted Documents */}
              {documents && documents.length > 0 && (
                <motion.div variants={itemVariants}>
                  <Card className="border-2 shadow-xl rounded-2xl overflow-hidden">
                    <CardHeader className="flex flex-col sm:flex-row items-center justify-between pb-8 sm:px-8 pt-8 gap-4 border-b bg-muted/20">
                      <div className="text-center sm:text-left">
                        <CardTitle className="text-2xl font-bold tracking-tight">{t('website.kyc.submittedDocuments', 'Submission History')}</CardTitle>
                        <CardDescription className="font-medium mt-1 text-sm">{t('website.kyc.submittedDocumentsDesc', 'Review your uploaded identity proof records.')}</CardDescription>
                      </div>
                      <Badge variant="outline" className="h-10 px-6 font-bold uppercase tracking-widest text-[10px] rounded-full border-2 bg-background shadow-sm">
                        {documents.length} Records
                      </Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y-2">
                        {documents.map((doc: any, index: number) => {
                          const docStatus = doc.status === 'approved' ? 'default' : doc.status === 'rejected' ? 'destructive' : 'secondary';
                          const statusLabel = doc.status === 'approved' ? 'Verified' : doc.status === 'rejected' ? 'Rejected' : 'In Review';

                          return (
                            <motion.div
                              key={doc.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="flex items-center justify-between p-6 sm:p-8 hover:bg-primary/[0.03] transition-all group flex-wrap gap-4"
                            >
                              <div className="flex items-center gap-5">
                                <div className={cn(
                                  "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg border-2 transition-transform duration-500 group-hover:scale-105",
                                  doc.status === 'approved' ? "bg-green-50/80 border-green-200/50 text-green-500" :
                                    doc.status === 'rejected' ? "bg-red-50/80 border-red-200/50 text-red-500" :
                                      "bg-orange-50/80 border-orange-200/50 text-orange-500 shadow-orange-500/10"
                                )}>
                                  {doc.status === 'approved' ? <ShieldCheck className="h-7 w-7" /> :
                                    doc.status === 'rejected' ? <XCircle className="h-7 w-7" /> :
                                      <Clock className="h-7 w-7" />}
                                </div>
                                <div>
                                  <p className="font-bold text-foreground uppercase tracking-widest text-sm">{doc.documentType.replace(/_/g, ' ')}</p>
                                  <p className="text-xs font-semibold text-muted-foreground mt-1 uppercase tracking-tighter">
                                    {t('kyc.uploaded', 'SUBMITTED ON')} {new Date(doc.createdAt).toLocaleDateString(undefined, {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {doc.filePath && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 px-4 font-bold border-2 rounded-xl"
                                    onClick={() => {
                                      let url = doc.filePath;
                                      if (url.includes('uploads\\kyc\\')) {
                                        url = '/' + url.split('uploads\\kyc\\')[1].replace(/\\/g, '/');
                                        url = '/uploads/kyc' + url;
                                      } else if (url.includes('uploads/kyc/')) {
                                        url = '/' + url.split('uploads/kyc/')[1];
                                        url = '/uploads/kyc' + url;
                                      } else if (!url.startsWith('/')) {
                                        url = '/' + url;
                                      }
                                      window.open(url, '_blank');
                                    }}
                                  >
                                    View Document
                                  </Button>
                                )}
                                <Badge variant={docStatus} className="h-9 px-4 font-bold uppercase tracking-widest text-[10px] rounded-xl shadow-lg border-none">
                                  {statusLabel}
                                </Badge>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>

            {/* Sidebar Information / Tips */}
            <div className="xl:col-span-4 space-y-8">
              <motion.div variants={itemVariants}>
                <Card className="bg-primary text-primary-foreground border-none shadow-2xl overflow-hidden relative group rounded-3xl min-h-[300px] flex flex-col justify-between">
                  {/* Decorative Elements */}
                  <div className="absolute top-0 right-0 p-12 opacity-15 rotate-12 group-hover:rotate-45 group-hover:scale-125 transition-all duration-1000 ease-in-out">
                    <ShieldCheck className="h-48 w-48 text-primary-foreground" />
                  </div>
                  <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-muted/40 rounded-full blur-3xl" />

                  <CardHeader className="relative z-10 pt-10 sm:px-10">
                    <CardTitle className="text-3xl font-bold text-primary-foreground leading-tight uppercase tracking-tighter italic">
                      Why Should You Verify?
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 relative z-10 sm:px-10 pb-10">
                    <div className="space-y-4">
                      {[
                        'Instant order activation & worldwide delivery',
                        'Unlimited transaction volume limits',
                        '24/7 Priority VIP support priority lane',
                        'Advanced biometric account secondary layer',
                      ].map((benefit, i) => (
                        <div key={i} className="flex gap-4 items-start group/item">
                          <div className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center flex-shrink-0 group-hover/item:scale-125 transition-transform">
                            <CheckCircle className="h-3 w-3 text-primary-foreground" />
                          </div>
                          <p className="text-sm font-bold text-primary-foreground/95 leading-snug">{benefit}</p>
                        </div>
                      ))}
                    </div>
                    <div className="pt-8 border-t border-primary-foreground/20">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_10px_#4ade80]" />
                        <p className="text-[10px] text-primary-foreground/70 leading-relaxed font-bold uppercase tracking-widest italic">
                          GDPR & PRIVACY SHIELD COMPLIANT
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card className="border-2 shadow-lg border-muted/50 rounded-2xl overflow-hidden group">
                  <div className="absolute inset-0 bg-muted/40 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />                  <CardHeader className="pb-4 relative z-10 pt-8 sm:px-8">
                    <CardTitle className="text-xl font-bold flex items-center gap-3 tracking-tight">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-orange-500" />
                      </div>
                      Processing Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative z-10 sm:px-8 pb-8">
                    <p className="text-sm font-medium text-muted-foreground leading-relaxed italic">
                      Most identity verifications are reviewed by our team within <span className="text-foreground font-bold not-italic px-1 underline decoration-primary decoration-2 underline-offset-4">2-12 hours</span>. We'll alert you instantly via email once updated.
                    </p>
                    <div className="mt-8 p-5 rounded-2xl bg-muted/40 border-2 border-muted flex items-center gap-5 transition-transform hover:scale-[1.02]">
                      <div className="relative">
                        <div className="h-3 w-3 rounded-full bg-green-500 animate-ping absolute opacity-75" />
                        <div className="h-3 w-3 rounded-full bg-green-500 relative shadow-[0_0_10px_#22c55e]" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground">Verification Team Online</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        )}
      </motion.div>

      <Dialog open={kycBlockedModal} onOpenChange={setKycBlockedModal}>
        <DialogContent className="sm:max-w-[500px] border-none shadow-2xl rounded-3xl overflow-hidden p-0">
          <div className="h-2 bg-primary w-full" />
          <div className="p-8">
            <DialogHeader>
              <div className="mx-auto w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 shadow-inner border border-primary/10 rotate-3 transition-transform hover:rotate-0">
                <ShieldCheck className="h-10 w-10 text-primary" />
              </div>
              <DialogTitle className="text-center text-3xl font-bold tracking-tighter uppercase italic">Verification In Progress</DialogTitle>
              <DialogDescription className="text-center text-base pt-4 font-medium leading-relaxed">
                {user?.kycStatus === 'submitted' &&
                  'Your documents are currently flowing through our high-security processing lane. We typically finalize reviews in under 24 hours.'}

                {user?.kycStatus === 'pending' &&
                  'Unlock your full account potential by submitting your identity documents for our compliance team to review.'}

                {user?.kycStatus === 'approved' &&
                  'System authorized! You have complete, unrestricted Access to all premium features and services.'}

                {user?.kycStatus === 'verified' && 'Identity verified successfully. We have verified your credentials and no further action is required.'}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="sm:justify-center pt-8">
              <Button
                onClick={() => setKycBlockedModal(false)}
                className="w-full sm:w-48 h-14 font-bold uppercase tracking-widest text-xs shadow-xl shadow-primary/20 rounded-2xl transition-all active:scale-95"
              >
                Acknowledge
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
