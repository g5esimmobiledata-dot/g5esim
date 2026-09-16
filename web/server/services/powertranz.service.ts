// powertranz.service.ts - CORRECTED VERSION

import axios from 'axios';
import crypto from 'crypto';

const POWERTRANZ_API_URL = 'https://staging.ptranz.com';

interface PowerTranzSpiSaleParams {
    merchantId: string;
    merchantPassword: string;
    amount: number;
    orderId: string;
    currency: string;
    email?: string;
    name?: string;
    card: {
        pan: string;
        cvv: string;
        expiry: string; // Format: MMYY from frontend
    };
}

interface PowerTranzConfirmParams {
    spiToken: string;
}

/**
 * Initialize PowerTranz SPI Auth with 3D Secure
 */
export async function initPowertranzSpiSale(params: PowerTranzSpiSaleParams) {
    const {
        merchantId,
        merchantPassword,
        amount,
        orderId,
        currency,
        email,
        name,
        card,
    } = params;

    // Validate card data format
    if (!card.pan || card.pan.length < 13 || card.pan.length > 19) {
        throw new Error('Invalid card number length');
    }

    if (!card.cvv || card.cvv.length < 3 || card.cvv.length > 4) {
        throw new Error('Invalid CVV length');
    }

    if (!card.expiry || card.expiry.length !== 4) {
        throw new Error('Invalid expiry format (must be MMYY)');
    }

    // Convert currency to ISO numeric code
    const currencyCodeMap: Record<string, string> = {
        USD: '840',
        EUR: '978',
        GBP: '826',
        INR: '356',
        CAD: '124',
        AUD: '036',
    };

    const currencyCode = currencyCodeMap[currency.toUpperCase()];
    if (!currencyCode) {
        throw new Error(`Unsupported currency: ${currency}`);
    }

    // Format expiry from MMYY to YYMM (PowerTranz format)
    const month = card.expiry.substring(0, 2);
    const year = card.expiry.substring(2, 4);
    const formattedExpiry = year + month; // YYMM format (e.g., "2612" for Dec 2026)

    // Generate unique transaction identifier
    const transactionId = crypto.randomUUID();

    const requestBody = {
        TransactionIdentifier: transactionId,
        TotalAmount: amount, // ⚠️ Keep as decimal, NOT cents (per documentation)
        CurrencyCode: currencyCode,
        ThreeDSecure: true,
        Source: {
            CardPan: card.pan.replace(/\s/g, ''), // Remove spaces
            CardCvv: card.cvv,
            CardExpiration: formattedExpiry, // YYMM format
            CardholderName: name || 'Guest',
        },
        OrderIdentifier: orderId,
        AddressMatch: false,
        ExtendedData: {
            ThreeDSecure: {
                ChallengeWindowSize: 4, // Full page
                ChallengeIndicator: '03', // Challenge requested if mandate
            },
            MerchantResponseUrl: `${process.env.BASE_URL}/api/payments/powertranz/3ds-response`,
        },
    };

    console.log('🔥 PowerTranz SPI Auth request:', {
        url: `${POWERTRANZ_API_URL}/Api/spi/Auth`,
        transactionId,
        orderId,
        amount,
        currencyCode,
        expiry: formattedExpiry,
        cardLast4: card.pan.substring(card.pan.length - 4),
    });

    try {
        const response = await axios.post(
            `${POWERTRANZ_API_URL}/Api/spi/Auth`,
            requestBody,
            {
                headers: {
                    'accept': 'application/json',
                    'content-type': 'application/json',
                    'PowerTranz-PowerTranzId': merchantId,
                    'PowerTranz-PowerTranzPassword': merchantPassword,
                },
            }
        );

        console.log('✅ PowerTranz SPI Auth response:', {
            TransactionType: response.data.TransactionType,
            Approved: response.data.Approved,
            IsoResponseCode: response.data.IsoResponseCode,
            ResponseMessage: response.data.ResponseMessage,
            hasSpiToken: !!response.data.SpiToken,
            hasRedirectData: !!response.data.RedirectData,
        });

        // Check if 3DS is required (SP4 = SPI Preprocessing complete)
        if (response.data.IsoResponseCode === 'SP4' && response.data.RedirectData) {
            return {
                success: true,
                IsoResponseCode: response.data.IsoResponseCode,
                redirectData: response.data.RedirectData, // HTML for 3DS challenge
                spiToken: response.data.SpiToken, // Used for payment confirmation
                transactionId: response.data.TransactionIdentifier,
                responseMessage: response.data.ResponseMessage,
            };
        }

        // If approved without 3DS (rare for new cards)
        if (response.data.Approved) {
            return {
                success: true,
                approved: true,
                transactionId: response.data.TransactionIdentifier,
            };
        }

        // If declined or error
        throw new Error(response.data.ResponseMessage || 'Payment declined');
    } catch (error: any) {
        console.error('❌ PowerTranz SPI Auth error:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message,
        });

        // Extract meaningful error message
        const errorMessage =
            error.response?.data?.ResponseMessage ||
            error.response?.data?.message ||
            error.response?.data?.error ||
            error.message ||
            'PowerTranz payment initialization failed';

        throw new Error(errorMessage);
    }
}

/**
 * Confirm PowerTranz payment after 3DS authentication
 * FIXED: Now includes merchant authentication headers
 * Note: SpiToken has a lifespan of 5 minutes
 */
export async function confirmPowertranzPayment(params: {
    spiToken: string;
    merchantId: string;
    merchantPassword: string;
}) {
    const { spiToken, merchantId, merchantPassword } = params;

    console.log('🔥 Confirming PowerTranz payment with SpiToken:', {
        spiToken: spiToken.substring(0, 20) + '...',
        hasMerchantId: !!merchantId,
        hasMerchantPassword: !!merchantPassword,
        expiresIn: '~5 minutes from Auth call',
    });

    try {
        const response = await axios.post(
            `${POWERTRANZ_API_URL}/api/spi/payment`,
            JSON.stringify(spiToken), // Send SpiToken as JSON string
            {
                headers: {
                    'accept': 'application/json',
                    'content-type': 'application/json',
                    // ✅ CRITICAL: Add merchant auth headers
                    'PowerTranz-PowerTranzId': merchantId,
                    'PowerTranz-PowerTranzPassword': merchantPassword,
                },
            }
        );

        console.log('✅ PowerTranz payment confirmation response:', {
            TransactionType: response.data.TransactionType,
            Approved: response.data.Approved,
            IsoResponseCode: response.data.IsoResponseCode,
            ResponseMessage: response.data.ResponseMessage,
            TransactionIdentifier: response.data.TransactionIdentifier,
            TotalAmount: response.data.TotalAmount,
        });

        return {
            Approved: response.data.Approved,
            TransactionType: response.data.TransactionType,
            IsoResponseCode: response.data.IsoResponseCode,
            ResponseMessage: response.data.ResponseMessage,
            TransactionIdentifier: response.data.TransactionIdentifier,
            TotalAmount: response.data.TotalAmount,
            CurrencyCode: response.data.CurrencyCode,
            CardBrand: response.data.CardBrand,
            RiskManagement: response.data.RiskManagement,
        };
    } catch (error: any) {
        console.error('❌ PowerTranz payment confirmation error:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message,
        });

        const errorMessage =
            error.response?.data?.ResponseMessage ||
            error.response?.data?.message ||
            error.message ||
            'PowerTranz payment confirmation failed';

        throw new Error(errorMessage);
    }
}

/**
 * Refund PowerTranz payment
 */
export async function refundPowertranzPayment(params: {
    merchantId: string;
    merchantPassword: string;
    transactionIdentifier: string;
    amount: number;
    currencyCode: string;
}) {
    const { merchantId, merchantPassword, transactionIdentifier, amount, currencyCode } = params;

    console.log('🔥 Refunding PowerTranz payment:', {
        transactionIdentifier,
        amount,
        currencyCode,
    });

    try {
        const response = await axios.post(
            `${POWERTRANZ_API_URL}/api/spi/refund`,
            {
                TransactionIdentifier: transactionIdentifier,
                TotalAmount: amount,
                CurrencyCode: currencyCode,
            },
            {
                headers: {
                    'accept': 'application/json',
                    'content-type': 'application/json',
                    'PowerTranz-PowerTranzId': merchantId,
                    'PowerTranz-PowerTranzPassword': merchantPassword,
                },
            }
        );

        console.log('✅ PowerTranz refund response:', {
            Approved: response.data.Approved,
            TransactionIdentifier: response.data.TransactionIdentifier,
            ResponseMessage: response.data.ResponseMessage,
        });

        return {
            success: response.data.Approved,
            transactionId: response.data.TransactionIdentifier,
            message: response.data.ResponseMessage,
        };
    } catch (error: any) {
        console.error('❌ PowerTranz refund error:', {
            status: error.response?.status,
            data: error.response?.data,
        });

        throw new Error(
            error.response?.data?.ResponseMessage || 'PowerTranz refund failed'
        );
    }
}