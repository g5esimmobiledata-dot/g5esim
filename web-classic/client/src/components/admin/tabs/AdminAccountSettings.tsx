import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle ,CardDescription} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Shield, Save } from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";

export function AdminAccountSettings() {
    const { toast } = useToast();
    const {t} = useTranslation();
    const [email, setEmail] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");

    const mutation = useMutation({
        mutationFn: () =>
            apiRequest("PUT", "/api/admin/account", {
                email: email || undefined,
                currentPassword,
                newPassword: newPassword || undefined,
            }),
        onSuccess: () => {
            toast({ title: "Success", description: "Account updated successfully" });
            setCurrentPassword("");
            setNewPassword("");
        },
        onError: (err: any) => {
            toast({
                title: "Error",
                description: err.message || "Failed to update account",
                variant: "destructive",
            });
        },
    });

    return (
        <Card className="border-0 shadow-xl">
            <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-xl bg-gradient-to-br from-[var(--primary-hex)] to-[var(--primary-second-hex)] flex items-center justify-center shadow-lg">
                        <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-black" />
                    </div>
                    <div className="space-y-1">
                        <CardTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[var(--primary-hex)] to-[var(--primary-second-hex)] bg-clip-text text-transparent">
                             {t("adminPanel.admin.settings.account.title","Account & Security")}
                        </CardTitle>
                        <CardDescription className="text-sm sm:text-base md:text-lg text-[var(--primary-hex)]/70 leading-relaxed">
                          {t(
   "adminPanel.admin.settings.account.description",
   "Manage your authentication methods and password policies."
 )}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>


            {/* Adjusted padding: p-4 for mobile, p-8 for desktop */}
            <CardContent className="space-y-6 p-4 sm:p-8">
                <div className="space-y-2">
                    <Label className="text-sm sm:text-base"> {t("adminPanel.admin.settings.account.email","Email")}</Label>
                    <Input
                        className="h-11 sm:h-10" // Slightly taller touch target on mobile
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t("adminPanel.admin.settings.account.newEmail","New email")}
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-sm sm:text-base">{t("adminPanel.admin.settings.account.currentPassword","Current Password")} *</Label>
                    <Input
                        className="h-11 sm:h-10"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                       placeholder={t(
 "adminPanel.admin.settings.account.currentPasswordPlaceholder",
 "Enter current password"
)}
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-sm sm:text-base">{t("adminPanel.admin.settings.account.newPassword","New Password")}</Label>
                    <Input
                        className="h-11 sm:h-10"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={t(
 "adminPanel.admin.settings.account.newPasswordPlaceholder",
 "New password (min 6 chars)"
)}
                    />
                </div>

                {/* Button: Full width on mobile (w-full), auto width on desktop (sm:w-max) */}
                <Button
                    onClick={() => mutation.mutate()}
                    disabled={mutation.isPending}
                    className="w-full sm:w-max gap-2 h-12 px-8 text-lg bg-gradient-to-r from-[var(--primary-hex)] to-[var(--primary-second-hex)] shadow-lg"
                >
                    {mutation.isPending ? (
                        <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                           {t("adminPanel.admin.settings.account.saving","Saving...")}
                        </>
                    ) : (
                        <>
                            <Save className="h-5 w-5" />
                          {t("adminPanel.admin.settings.account.update","Update Account")}
                        </>
                    )}
                </Button>
            </CardContent>

        </Card>
    );
}
