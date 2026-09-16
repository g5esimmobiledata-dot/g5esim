// powertranz-hpp.service.ts - PowerTranz Hosted Payment Page Integration

import axios from 'axios';
import crypto from 'crypto';

const POWERTRANZ_API_URL = 'https://staging.ptranz.com'; // Change to production when ready

interface PowerTranzHppParams {
    merchantId: string;
    merchantPassword: string;
    amount: number;
    orderId: string;
    currency: string;
    email?: string;
    name?: string;
    phone?: string;
}

interface PowerTranzHppResponse {
    success: boolean;
    redirectUrl?: string;
    pageSetCode?: string;
    hppToken?: string;
    error?: string;
    responseMessage?: string;
}

/**
 * Initialize PowerTranz Hosted Payment Page (HPP)
 * This creates a hosted page for payment processing without handling card data directly
 * 
 * HPP Flow:
 * 1. Send request to PowerTranz with amount, currency, order info
 * 2. PowerTranz returns a redirect URL
 * 3. User is redirected to PowerTranz HPP (hosted by PowerTranz)
 * 4. User completes payment on hosted page
 * 5. PowerTranz redirects back to merchant callback URL with result
 */
export async function initPowertranzHpp(params: PowerTranzHppParams): Promise<PowerTranzHppResponse> {
    const {
        merchantId,
        merchantPassword,
        amount,
        orderId,
        currency,
        email,
        name,
        phone,
    } = params;

    // Validate required parameters
    if (!amount || amount <= 0) {
        throw new Error('Invalid amount');
    }

    if (!orderId) {
        throw new Error('Order ID is required');
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

    // Generate unique transaction identifier
    const transactionId = crypto.randomUUID();

    // Build the HPP request payload
    // Reference: https://powertranz.readme.io/docs/hosted-payment-page-hpp
    const requestBody = {
        TransactionIdentifier: transactionId,
        TotalAmount: amount, // Keep as decimal, NOT cents
        CurrencyCode: currencyCode,
        OrderIdentifier: orderId,
        ThreeDSecure: true,
        // ✅ HPP Configuration
        ExtendedData: {
            HostedPage: {
                PageSet: 'esimmaster', // Or custom page set name if configured
                PageName: 'checkout', // Standard payment page
                ReturnUrl: `${process.env.BASE_URL}/api/payments/powertranz/hpp-callback`, // Where to return after payment
                CancelUrl: `${process.env.BASE_URL}/api/payments/powertranz/hpp-cancel`, // Where to go if user cancels
                NotificationUrl: `${process.env.BASE_URL}/api/payments/powertranz/hpp-notify`, // Server-to-server notification
            },
        },

        // Optional: Customer information (pre-fills form on HPP)
        ...(email && {
            CustomerEmail: email,
        }),
        ...(name && {
            CustomerName: name,
        }),
        ...(phone && {
            CustomerPhone: phone,
        }),

        // Additional metadata
        ReferenceNumber: orderId,
        Description: `Payment for Order ${orderId}`,
    };

    console.log('🔥 PowerTranz HPP initialization request:', {
        url: `${POWERTRANZ_API_URL}/api/hpp/init`,
        transactionId,
        orderId,
        amount,
        currencyCode,
    });

    console.log(requestBody)

    try {
        // Send request to PowerTranz HPP endpoint
        const response = await axios.post(
            `${POWERTRANZ_API_URL}/api/spi/auth`,
            requestBody,
            {
                headers: {
                    'accept': 'application/json',
                    'content-type': 'application/json',
                    'PowerTranz-PowerTranzId': merchantId,
                    'PowerTranz-PowerTranzPassword': merchantPassword,
                },
                timeout: 10000, // 10 second timeout
            }
        );

        console.log('✅ PowerTranz HPP initialization response:', {
            status: response.status,
            hasRedirectUrl: !!response.data.RedirectUrl,
            hasPageSetCode: !!response.data.PageSetCode,
            transactionId: response.data.TransactionIdentifier,
        });

        // PowerTranz returns a redirect URL to the hosted payment page
        if (response.data.RedirectUrl) {
            return {
                success: true,
                redirectUrl: response.data.RedirectUrl,
                pageSetCode: response.data.PageSetCode,
                hppToken: response.data.HppToken, // Token to identify this HPP session
            };
        }

        throw new Error(response.data.ResponseMessage || 'HPP initialization failed');

    } catch (error: any) {
        console.error('❌ PowerTranz HPP initialization error:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message,
        });

        const errorMessage =
            error.response?.data?.ResponseMessage ||
            error.response?.data?.message ||
            error.message ||
            'PowerTranz HPP initialization failed';

        throw new Error(errorMessage);
    }
}

/**
 * Process HPP Callback Response
 * Called by PowerTranz after user completes payment on hosted page
 * This verifies the payment and updates order status
 */
export function processHppCallbackResponse(responseData: any): {
    success: boolean;
    approved: boolean;
    transactionId?: string;
    orderId?: string;
    amount?: number;
    message?: string;
    error?: string;
} {
    console.log('🔐 Processing HPP callback response:', {
        hasApproved: !!responseData.Approved,
        hasTransactionId: !!responseData.TransactionIdentifier,
        IsoResponseCode: responseData.IsoResponseCode,
    });

    try {
        const {
            Approved,
            TransactionIdentifier,
            OrderIdentifier,
            TotalAmount,
            ResponseMessage,
            IsoResponseCode,
            RiskManagement,
        } = responseData;

        // Check if payment was successful
        const isApproved = Approved === true || Approved === 'true';

        if (isApproved) {
            // Additional 3DS verification check if present
            if (RiskManagement?.ThreeDSecure) {
                const threeDSData = RiskManagement.ThreeDSecure;
                // Check 3DS response code
                if (threeDSData.ResponseCode !== '3D0' && IsoResponseCode !== '3D0') {
                    return {
                        success: false,
                        approved: false,
                        error: threeDSData.CardholderInfo || 'Authentication failed',
                        message: '3D Secure authentication failed',
                    };
                }
            }

            console.log('✅ HPP payment approved:', {
                transactionId: TransactionIdentifier,
                orderId: OrderIdentifier,
                amount: TotalAmount,
            });

            return {
                success: true,
                approved: true,
                transactionId: TransactionIdentifier,
                orderId: OrderIdentifier,
                amount: TotalAmount,
                message: ResponseMessage || 'Payment approved',
            };
        } else {
            console.warn('⚠️ HPP payment declined:', {
                IsoResponseCode,
                ResponseMessage,
            });

            return {
                success: true, // Request was successful, but payment was declined
                approved: false,
                transactionId: TransactionIdentifier,
                orderId: OrderIdentifier,
                message: ResponseMessage || 'Payment was declined',
                error: ResponseMessage,
            };
        }

    } catch (error: any) {
        console.error('❌ Error processing HPP callback:', error.message);
        return {
            success: false,
            approved: false,
            error: error.message,
        };
    }
}

/**
 * Verify HPP Callback Authenticity
 * Optional: Verify that callback came from PowerTranz
 */
export function verifyHppCallbackSignature(
    callbackData: any,
    expectedSignature: string,
    merchantPassword: string
): boolean {
    try {
        // Create a canonical string from the callback data
        const canonicalString = JSON.stringify({
            TransactionIdentifier: callbackData.TransactionIdentifier,
            OrderIdentifier: callbackData.OrderIdentifier,
            Approved: callbackData.Approved,
            TotalAmount: callbackData.TotalAmount,
        });

        // Create signature using merchant password as key
        const crypto = require('crypto');
        const signature = crypto
            .createHmac('sha256', merchantPassword)
            .update(canonicalString)
            .digest('hex');

        return signature === expectedSignature;
    } catch (error) {
        console.error('❌ Error verifying HPP callback signature:', error);
        return false;
    }
}