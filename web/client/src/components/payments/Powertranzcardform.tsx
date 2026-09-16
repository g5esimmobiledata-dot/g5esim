import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Lock, CreditCard, CheckCircle, Loader2 } from 'lucide-react';

interface PowerTranzCardFormProps {
    onCardSubmit: (cardData: { pan: string; cvv: string; expiry: string }) => void;
    isLoading?: boolean;
    error?: string;
    onCancel?: () => void;
}

export function PowerTranzCardForm({
    onCardSubmit,
    isLoading = false,
    error,
    onCancel,
}: PowerTranzCardFormProps) {
    const [cardData, setCardData] = useState({ pan: '', cvv: '', expiry: '' });
    const [touched, setTouched] = useState({ pan: false, cvv: false, expiry: false });

    // ✅ LUHN ALGORITHM CHECK
    const luhnCheck = (num: string): boolean => {
        let sum = 0;
        let isEven = false;
        for (let i = num.length - 1; i >= 0; i--) {
            let digit = parseInt(num.charAt(i), 10);
            if (isEven) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            sum += digit;
            isEven = !isEven;
        }
        return sum % 10 === 0;
    };

    // ✅ PURE VALIDATION - No setState!
    const getPanError = (value: string): string => {
        const digits = value.replace(/\D/g, '');
        if (digits.length < 13) return `Card number must be at least 13 digits (${digits.length}/13)`;
        if (digits.length > 19) return 'Card number must not exceed 19 digits';
        if (!luhnCheck(digits)) return 'Card number is invalid (Luhn check failed)';
        return '';
    };

    const getCvvError = (value: string): string => {
        const digits = value.replace(/\D/g, '');
        if (digits.length < 3) return `CVV must be at least 3 digits (${digits.length}/3)`;
        if (digits.length > 4) return 'CVV must not exceed 4 digits';
        return '';
    };

    const getExpiryError = (value: string): string => {
        const digits = value.replace(/\D/g, '');
        if (digits.length !== 4) return `Expiry must be 4 digits in MMYY format (${digits.length}/4)`;

        const month = parseInt(digits.substring(0, 2), 10);
        if (month < 1 || month > 12) return 'Month must be between 01 and 12';

        const year = parseInt(digits.substring(2, 4), 10);
        const currentYear = new Date().getFullYear() % 100;
        const currentMonth = new Date().getMonth() + 1;

        if (year < currentYear || (year === currentYear && month < currentMonth)) {
            return 'Card appears to be expired';
        }

        return '';
    };

    // ✅ MEMOIZED ERROR CALCULATION (computed, not state)
    const panError = useMemo(() => getPanError(cardData.pan), [cardData.pan]);
    const cvvError = useMemo(() => getCvvError(cardData.cvv), [cardData.cvv]);
    const expiryError = useMemo(() => getExpiryError(cardData.expiry), [cardData.expiry]);

    // ✅ IS FORM VALID (computed, no setState calls)
    const isFormValid = useMemo(() => {
        return panError === '' && cvvError === '' && expiryError === '';
    }, [panError, cvvError, expiryError]);

    // ✅ FORMATTERS
    const formatPan = (value: string): string => {
        const digits = value.replace(/\D/g, '');
        return digits.replace(/(\d{4})/g, '$1 ').trim();
    };

    const formatExpiry = (value: string): string => {
        const digits = value.replace(/\D/g, '');
        if (digits.length >= 2) {
            return digits.substring(0, 2) + digits.substring(2, 4);
        }
        return digits;
    };

    // ✅ HANDLE PAN CHANGE
    const handlePanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 19);
        setCardData((prev) => ({ ...prev, pan: value }));
        setTouched((prev) => ({ ...prev, pan: true }));
    };

    // ✅ HANDLE CVV CHANGE
    const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 4);
        setCardData((prev) => ({ ...prev, cvv: value }));
        setTouched((prev) => ({ ...prev, cvv: true }));
    };

    // ✅ HANDLE EXPIRY CHANGE
    const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 4);
        setCardData((prev) => ({ ...prev, expiry: value }));
        setTouched((prev) => ({ ...prev, expiry: true }));
    };

    // ✅ HANDLE SUBMIT
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        setTouched({ pan: true, cvv: true, expiry: true });

        if (!isFormValid) {
            return;
        }

        onCardSubmit({
            pan: cardData.pan.replace(/\D/g, ''),
            cvv: cardData.cvv.replace(/\D/g, ''),
            expiry: cardData.expiry.replace(/\D/g, ''),
        });
    };

    return (
        <Card className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
            <CardContent className="p-6">
                {/* HEADER */}
                <div className="flex items-start gap-3 mb-6">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-foreground">Card Details</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Your payment will be secured with 3D Secure authentication
                        </p>
                    </div>
                </div>

                {/* ERROR ALERT */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* CARD NUMBER */}
                    <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">
                            Card Number {cardData.pan && <span className="text-xs text-green-600">✓</span>}
                        </label>
                        <div className="relative">
                            <Input
                                type="text"
                                inputMode="numeric"
                                placeholder="4012 0000 0002 0006"
                                value={formatPan(cardData.pan)}
                                onChange={handlePanChange}
                                onBlur={() => setTouched((prev) => ({ ...prev, pan: true }))}
                                className={`pl-10 ${touched.pan && panError
                                        ? 'border-red-500 focus-visible:ring-red-500'
                                        : cardData.pan.length >= 13
                                            ? 'border-green-500 focus-visible:ring-green-500'
                                            : ''
                                    }`}
                            />
                            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        </div>
                        {touched.pan && panError ? (
                            <p className="text-xs text-red-500 mt-1">{panError}</p>
                        ) : cardData.pan.length > 0 && cardData.pan.length < 13 ? (
                            <p className="text-xs text-amber-600 mt-1">
                                {13 - cardData.pan.replace(/\D/g, '').length} more digits needed
                            </p>
                        ) : cardData.pan.length >= 13 ? (
                            <p className="text-xs text-green-600 mt-1">✓ Valid card number</p>
                        ) : null}
                    </div>

                    {/* EXPIRY & CVV */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* EXPIRY */}
                        <div>
                            <label className="text-sm font-medium text-foreground mb-1 block">
                                Expiry (MMYY) {cardData.expiry && <span className="text-xs text-green-600">✓</span>}
                            </label>
                            <Input
                                type="text"
                                inputMode="numeric"
                                placeholder="1225"
                                maxLength={4}
                                value={cardData.expiry}
                                onChange={handleExpiryChange}
                                onBlur={() => setTouched((prev) => ({ ...prev, expiry: true }))}
                                className={`${touched.expiry && expiryError
                                        ? 'border-red-500 focus-visible:ring-red-500'
                                        : cardData.expiry.length === 4
                                            ? 'border-green-500 focus-visible:ring-green-500'
                                            : ''
                                    }`}
                            />
                            {touched.expiry && expiryError ? (
                                <p className="text-xs text-red-500 mt-1">{expiryError}</p>
                            ) : cardData.expiry.length > 0 && cardData.expiry.length < 4 ? (
                                <p className="text-xs text-amber-600 mt-1">{4 - cardData.expiry.length} more digits</p>
                            ) : cardData.expiry.length === 4 ? (
                                <p className="text-xs text-green-600 mt-1">✓ Valid expiry</p>
                            ) : null}
                        </div>

                        {/* CVV */}
                        <div>
                            <label className="text-sm font-medium text-foreground mb-1 block">
                                CVV {cardData.cvv && <span className="text-xs text-green-600">✓</span>}
                            </label>
                            <Input
                                type="text"
                                inputMode="numeric"
                                placeholder="323"
                                maxLength={4}
                                value={cardData.cvv}
                                onChange={handleCvvChange}
                                onBlur={() => setTouched((prev) => ({ ...prev, cvv: true }))}
                                className={`${touched.cvv && cvvError
                                        ? 'border-red-500 focus-visible:ring-red-500'
                                        : cardData.cvv.length >= 3
                                            ? 'border-green-500 focus-visible:ring-green-500'
                                            : ''
                                    }`}
                            />
                            {touched.cvv && cvvError ? (
                                <p className="text-xs text-red-500 mt-1">{cvvError}</p>
                            ) : cardData.cvv.length > 0 && cardData.cvv.length < 3 ? (
                                <p className="text-xs text-amber-600 mt-1">{3 - cardData.cvv.length} more digits</p>
                            ) : cardData.cvv.length >= 3 ? (
                                <p className="text-xs text-green-600 mt-1">✓ Valid CVV</p>
                            ) : null}
                        </div>
                    </div>

                    {/* SECURITY INFO */}
                    <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-500/10 rounded-lg border border-amber-200 dark:border-amber-800">
                        <Lock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-800 dark:text-amber-200">
                            Your card details are sent securely and protected with 3D Secure (3DS2) authentication.
                            We never store your card information.
                        </p>
                    </div>

                    {/* FORM VALIDATION STATUS */}
                    {(touched.pan || touched.cvv || touched.expiry) && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
                            <div className="flex flex-col gap-1 text-xs">
                                <div className="flex items-center gap-2">
                                    {cardData.pan.length >= 13 ? (
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                    ) : (
                                        <div className="w-4 h-4 rounded-full border border-gray-300" />
                                    )}
                                    <span className={cardData.pan.length >= 13 ? 'text-green-700' : 'text-gray-600'}>
                                        Card number valid
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {cardData.expiry.length === 4 && !expiryError ? (
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                    ) : (
                                        <div className="w-4 h-4 rounded-full border border-gray-300" />
                                    )}
                                    <span className={cardData.expiry.length === 4 && !expiryError ? 'text-green-700' : 'text-gray-600'}>
                                        Expiry valid
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {cardData.cvv.length >= 3 ? (
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                    ) : (
                                        <div className="w-4 h-4 rounded-full border border-gray-300" />
                                    )}
                                    <span className={cardData.cvv.length >= 3 ? 'text-green-700' : 'text-gray-600'}>
                                        CVV valid
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ACTION BUTTONS */}
                    <div className="flex gap-3 pt-4">
                        <Button
                            type="submit"
                            disabled={isLoading || !isFormValid}
                            className="flex-1 bg-teal-500 hover:bg-teal-600 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                'Continue to Payment'
                            )}
                        </Button>
                        {onCancel && (
                            <Button type="button" variant="outline" onClick={onCancel}>
                                Cancel
                            </Button>
                        )}
                    </div>

                    {/* TEST CARD INFO */}
                    <div className="p-2 bg-slate-100 dark:bg-slate-800/50 rounded text-xs text-slate-600 dark:text-slate-400">
                        <p className="font-medium mb-1">Test Card (Staging):</p>
                        <p>Card: 4012 0000 0002 0006</p>
                        <p>Expiry: 12/25 (enter as: 1225)</p>
                        <p>CVV: 323</p>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

export default PowerTranzCardForm;