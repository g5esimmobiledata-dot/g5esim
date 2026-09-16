import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Check, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useSettingByKey } from '@/hooks/useSettings';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/contexts/TranslationContext';

export function HomepagePopup() {
    const [open, setOpen] = useState(false);
    const [dontShowToday, setDontShowToday] = useState(false);
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();
    const { t } = useTranslation();

    const enabledStr = useSettingByKey('homepage_popup_enabled');
    const imageUrl = useSettingByKey('homepage_popup_image');
    const code = useSettingByKey('homepage_popup_code');
    const text = useSettingByKey('homepage_popup_text');

    useEffect(() => {
        if (enabledStr === 'true') {
            const today = new Date().toDateString();
            const hideDate = localStorage.getItem('hide_homepage_popup_date');
            if (hideDate !== today) {
                // Show popup after a short delay
                const timer = setTimeout(() => setOpen(true), 1500);
                return () => clearTimeout(timer);
            }
        } else {
            setOpen(false);
        }
    }, [enabledStr, imageUrl, code, text]);

    const handleClose = () => {
        if (dontShowToday) {
            localStorage.setItem('hide_homepage_popup_date', new Date().toDateString());
        }
        setOpen(false);
    };

    const copyCode = () => {
        if (code) {
            navigator.clipboard.writeText(code);
            setCopied(true);
            toast({ title: t('website.popup.copied', 'Code copied!') });
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) handleClose();
        }}>
            <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden border-0 bg-transparent shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]" aria-describedby={undefined}>
                <DialogHeader className="sr-only">
                    <DialogTitle>{t('website.popup.promotion', 'Promotion')}</DialogTitle>
                    <DialogDescription>{t('website.popup.description', 'Special offer popup')}</DialogDescription>
                </DialogHeader>
                <div className="relative bg-background sm:rounded-2xl overflow-hidden flex flex-col">

                    {/* Floating Close Button */}
                    <button
                        onClick={handleClose}
                        className="absolute top-3 right-3 p-2 bg-black/30 hover:bg-black/50 backdrop-blur-md rounded-full text-white transition-all z-20 shadow-sm border border-white/10"
                        aria-label={t('website.popup.close', 'Close')}
                    >
                        <X className="h-4 w-4" />
                    </button>

                    {imageUrl && (
                        <div className="w-full relative flex-shrink-0 bg-black/5">
                            {/* Gradient overlay to smoothly transition to content */}
                            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
                            <img
                                src={imageUrl}
                                alt={t('website.popup.promoImg', 'Promotion')}
                                className="w-full h-auto max-h-[50vh] object-cover"
                            />
                        </div>
                    )}

                    <div className="flex-1 relative z-10 bg-background px-6 pb-6 pt-2">
                        {(!imageUrl) && <div className="pt-8" />} {/* Add padding top if no image */}

                        <div className="space-y-6 flex flex-col items-center">
                            {text && (
                                <div className="text-center space-y-2 max-w-[90%] mx-auto">
                                    <p className="text-[1.1rem] leading-relaxed font-semibold text-foreground tracking-tight">{text}</p>
                                </div>
                            )}

                            {code && (
                                <div className="w-full bg-primary/5 rounded-xl p-4 border border-primary/20 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest text-center mb-2.5 opacity-80">
                                        {t('website.popup.exclusivePromo', 'Your Exclusive Promo Code')}
                                    </p>
                                    <div className="flex items-center justify-between gap-3 bg-background rounded-lg p-2  border-border/50 shadow-sm">
                                        <code className="text-xl font-extrabold text-foreground px-3 tracking-wider select-all">
                                            {code}
                                        </code>
                                        <Button
                                            variant={copied ? "default" : "secondary"}
                                            size="sm"
                                            onClick={copyCode}
                                            className="shrink-0 transition-all duration-300 w-24 font-medium shadow-sm"
                                        >
                                            {copied ? (
                                                <div className="flex items-center text-primary-foreground"><Check className="h-4 w-4 mr-2" /> {t('website.popup.copiedBtn', 'Copied')}</div>
                                            ) : (
                                                <div className="flex items-center"><Copy className="h-4 w-4 mr-2" /> {t('website.popup.copyBtn', 'Copy')}</div>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-center pt-2 w-full border-t border-border/40 mt-2">
                                <label className="flex items-center gap-2.5 pt-4 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors group">
                                    <Checkbox
                                        id="dontShow"
                                        checked={dontShowToday}
                                        onCheckedChange={(checked) => setDontShowToday(checked as boolean)}
                                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                    />
                                    <span className="select-none font-medium text-xs tracking-wide">{t('website.popup.dontShow', "Don't show this again today")}</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
