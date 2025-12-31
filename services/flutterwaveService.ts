import axios from 'axios';

/**
 * Flutterwave Payment Service
 * Handles international payments for countries not supported by Paystack
 */

// Flutterwave API configuration
const FLUTTERWAVE_API_URL = 'https://api.flutterwave.com/v3';

/**
 * Flutterwave supported currencies (150+ countries)
 * Much broader than Paystack's 5 currencies
 */
export const FLUTTERWAVE_CURRENCIES = [
    'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR',
    'NGN', 'GHS', 'KES', 'ZAR', 'UGX', 'TZS', 'RWF', 'ZMW',
    'XAF', 'XOF', 'EGP', 'MAD', 'MUR', 'MWK', 'SLL', 'GMD'
];

/**
 * Generate Flutterwave payment configuration
 */
export const generateFlutterwaveConfig = (
    email: string,
    amount: number,
    currency: string,
    planId: string,
    billingCycle: 'monthly' | 'yearly'
) => {
    const txRef = `LV-${planId}-${Date.now()}`;

    return {
        public_key: import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY || '',
        tx_ref: txRef,
        amount: amount,
        currency: currency,
        payment_options: 'card,mobilemoney,ussd,banktransfer',
        customer: {
            email: email,
            name: email.split('@')[0],
        },
        customizations: {
            title: 'Lens Vault Subscription',
            description: `${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan - ${billingCycle}`,
            logo: 'https://lensvault.com/logo.png',
        },
        meta: {
            plan_id: planId,
            billing_cycle: billingCycle,
            consumer_id: email,
        },
    };
};

/**
 * Verify Flutterwave payment on backend
 */
export const verifyFlutterwavePayment = async (
    transactionId: string,
    planId: string,
    billingCycle: 'monthly' | 'yearly'
): Promise<{ success: boolean; message: string }> => {
    try {
        const response = await axios.post('/api/billing/verify-flutterwave', {
            transaction_id: transactionId,
            plan_id: planId,
            billing_cycle: billingCycle,
        });

        return response.data;
    } catch (error: any) {
        console.error('Flutterwave verification error:', error);
        return {
            success: false,
            message: error.response?.data?.error || 'Payment verification failed',
        };
    }
};

/**
 * Determine which payment gateway to use based on currency
 * Paystack for African currencies, Flutterwave for international
 */
export const selectPaymentGateway = (currency: string): 'paystack' | 'flutterwave' => {
    const paystackCurrencies = ['NGN', 'GHS', 'ZAR', 'KES'];

    if (paystackCurrencies.includes(currency)) {
        return 'paystack';
    }

    return 'flutterwave';
};

/**
 * Check if Flutterwave is configured
 */
export const isFlutterwaveConfigured = (): boolean => {
    const publicKey = import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY;
    return !!publicKey && publicKey.length > 0;
};

/**
 * Get payment gateway display name
 */
export const getPaymentGatewayName = (gateway: 'paystack' | 'flutterwave'): string => {
    return gateway === 'paystack' ? 'Paystack' : 'Flutterwave';
};

/**
 * Get supported payment methods for gateway
 */
export const getPaymentMethods = (gateway: 'paystack' | 'flutterwave'): string[] => {
    if (gateway === 'paystack') {
        return ['Card', 'Bank Transfer', 'USSD'];
    }
    return ['Card', 'Mobile Money', 'Bank Transfer', 'USSD'];
};
