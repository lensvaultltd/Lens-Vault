import { supabase } from '../lib/supabase';

/**
 * Geo-Based Dynamic Pricing Service
 * 
 * Strategy: Always be cheaper than competitors in every market
 * Uses PPP (Purchasing Power Parity) to adjust prices regionally
 */

// Base prices in USD (annual)
const BASE_PRICES_USD = {
    premium: 29.99,  // vs 1Password $35.88, LastPass $36, Bitwarden $10
    family: 49.99,   // vs 1Password $59.88, Bitwarden $40
    business: 89.99  // per user/year
};

// Competitor prices for comparison (annual USD)
const COMPETITOR_PRICES = {
    premium: {
        '1password': 35.88,
        'lastpass': 36.00,
        'bitwarden': 10.00
    },
    family: {
        '1password': 59.88,
        'bitwarden': 40.00
    }
};

// PPP adjustment factors by country (relative to USD = 1.0)
// Source: IMF, World Bank 2025 projections
const PPP_FACTORS: Record<string, number> = {
    // High-income countries
    'US': 1.00,
    'CH': 1.15,  // Switzerland
    'NO': 1.10,  // Norway
    'LU': 1.12,  // Luxembourg
    'SG': 0.95,  // Singapore
    'AU': 0.92,  // Australia
    'CA': 0.90,  // Canada
    'GB': 0.88,  // United Kingdom
    'DE': 0.85,  // Germany
    'FR': 0.85,  // France
    'JP': 0.83,  // Japan
    'IT': 0.82,  // Italy
    'ES': 0.80,  // Spain

    // Middle-income countries
    'CN': 0.55,  // China
    'BR': 0.50,  // Brazil
    'RU': 0.48,  // Russia
    'MX': 0.52,  // Mexico
    'TR': 0.45,  // Turkey
    'ZA': 0.48,  // South Africa
    'AR': 0.42,  // Argentina
    'PL': 0.58,  // Poland
    'TH': 0.50,  // Thailand
    'MY': 0.52,  // Malaysia

    // Lower-income countries (Africa, South Asia)
    'IN': 0.35,  // India
    'PK': 0.30,  // Pakistan
    'BD': 0.28,  // Bangladesh
    'NG': 0.38,  // Nigeria
    'KE': 0.40,  // Kenya
    'EG': 0.35,  // Egypt
    'PH': 0.42,  // Philippines
    'VN': 0.38,  // Vietnam
    'ID': 0.45,  // Indonesia

    // Default for unlisted countries
    'DEFAULT': 0.70
};

// Currency symbols and codes
const CURRENCY_INFO: Record<string, { code: string; symbol: string; decimals: number }> = {
    'US': { code: 'USD', symbol: '$', decimals: 2 },
    'GB': { code: 'GBP', symbol: '£', decimals: 2 },
    'EU': { code: 'EUR', symbol: '€', decimals: 2 },
    'JP': { code: 'JPY', symbol: '¥', decimals: 0 },
    'IN': { code: 'INR', symbol: '₹', decimals: 0 },
    'CN': { code: 'CNY', symbol: '¥', decimals: 2 },
    'BR': { code: 'BRL', symbol: 'R$', decimals: 2 },
    'AU': { code: 'AUD', symbol: 'A$', decimals: 2 },
    'CA': { code: 'CAD', symbol: 'C$', decimals: 2 },
    'NG': { code: 'NGN', symbol: '₦', decimals: 0 },
    'ZA': { code: 'ZAR', symbol: 'R', decimals: 2 },
    'DEFAULT': { code: 'USD', symbol: '$', decimals: 2 }
};

// Exchange rates (approximate, should be fetched from API in production)
const EXCHANGE_RATES: Record<string, number> = {
    'USD': 1.00,
    'EUR': 0.92,
    'GBP': 0.79,
    'JPY': 149.50,
    'INR': 83.20,
    'CNY': 7.24,
    'BRL': 4.97,
    'AUD': 1.52,
    'CAD': 1.36,
    'NGN': 1580.00,
    'ZAR': 18.50,
};

export interface RegionalPricing {
    countryCode: string;
    countryName: string;
    currency: {
        code: string;
        symbol: string;
    };
    prices: {
        premium: {
            monthly: number;
            annual: number;
            annualMonthly: number; // annual/12
        };
        family: {
            monthly: number;
            annual: number;
            annualMonthly: number;
        };
        business: {
            monthly: number;
            annual: number;
        };
    };
    savings: {
        premium: {
            vs1Password: number; // percentage
            vsLastPass: number;
            vsBitwarden: number;
        };
        family: {
            vs1Password: number;
            vsBitwarden: number;
        };
    };
    displayPrices: {
        premium: string;
        family: string;
        business: string;
    };
}

/**
 * Calculate regional pricing based on country code
 */
export function calculateRegionalPricing(countryCode: string): RegionalPricing {
    const pppFactor = PPP_FACTORS[countryCode] || PPP_FACTORS['DEFAULT'];

    // Determine currency based on country
    let currencyKey = countryCode;
    if (['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'IE', 'FI', 'GR'].includes(countryCode)) {
        currencyKey = 'EU';
    }
    const currencyInfo = CURRENCY_INFO[currencyKey] || CURRENCY_INFO['DEFAULT'];
    const exchangeRate = EXCHANGE_RATES[currencyInfo.code] || 1.0;

    // Calculate base prices in local currency
    const premiumAnnual = BASE_PRICES_USD.premium * pppFactor * exchangeRate;
    const familyAnnual = BASE_PRICES_USD.family * pppFactor * exchangeRate;
    const businessAnnual = BASE_PRICES_USD.business * pppFactor * exchangeRate;

    // Round to appropriate decimals
    const round = (num: number) => {
        return currencyInfo.decimals === 0
            ? Math.round(num)
            : Math.round(num * 100) / 100;
    };

    const prices = {
        premium: {
            annual: round(premiumAnnual),
            monthly: round(premiumAnnual / 12 * 1.2), // 20% more expensive monthly
            annualMonthly: round(premiumAnnual / 12)
        },
        family: {
            annual: round(familyAnnual),
            monthly: round(familyAnnual / 12 * 1.2),
            annualMonthly: round(familyAnnual / 12)
        },
        business: {
            annual: round(businessAnnual),
            monthly: round(businessAnnual / 12)
        }
    };

    // Calculate savings vs competitors (in USD for comparison)
    const premiumUSD = BASE_PRICES_USD.premium * pppFactor;
    const familyUSD = BASE_PRICES_USD.family * pppFactor;

    const savings = {
        premium: {
            vs1Password: Math.round(((COMPETITOR_PRICES.premium['1password'] - premiumUSD) / COMPETITOR_PRICES.premium['1password']) * 100),
            vsLastPass: Math.round(((COMPETITOR_PRICES.premium.lastpass - premiumUSD) / COMPETITOR_PRICES.premium.lastpass) * 100),
            vsBitwarden: Math.round(((COMPETITOR_PRICES.premium.bitwarden - premiumUSD) / COMPETITOR_PRICES.premium.bitwarden) * 100)
        },
        family: {
            vs1Password: Math.round(((COMPETITOR_PRICES.family['1password'] - familyUSD) / COMPETITOR_PRICES.family['1password']) * 100),
            vsBitwarden: Math.round(((COMPETITOR_PRICES.family.bitwarden - familyUSD) / COMPETITOR_PRICES.family.bitwarden) * 100)
        }
    };

    // Format display prices
    const formatPrice = (price: number) => {
        const formatted = currencyInfo.decimals === 0
            ? price.toLocaleString()
            : price.toFixed(currencyInfo.decimals);
        return `${currencyInfo.symbol}${formatted}`;
    };

    return {
        countryCode,
        countryName: getCountryName(countryCode),
        currency: {
            code: currencyInfo.code,
            symbol: currencyInfo.symbol
        },
        prices,
        savings,
        displayPrices: {
            premium: formatPrice(prices.premium.annualMonthly),
            family: formatPrice(prices.family.annualMonthly),
            business: formatPrice(prices.business.monthly)
        }
    };
}

/**
 * Get country name from code
 */
function getCountryName(code: string): string {
    const names: Record<string, string> = {
        'US': 'United States',
        'GB': 'United Kingdom',
        'CA': 'Canada',
        'AU': 'Australia',
        'DE': 'Germany',
        'FR': 'France',
        'IT': 'Italy',
        'ES': 'Spain',
        'IN': 'India',
        'NG': 'Nigeria',
        'CN': 'China',
        'JP': 'Japan',
        'BR': 'Brazil',
        'MX': 'Mexico',
        'ZA': 'South Africa',
        // Add more as needed
    };
    return names[code] || code;
}

/**
 * Detect user's country from IP address
 * Uses multiple fallback methods
 */
export async function detectUserCountry(): Promise<string> {
    try {
        // Try IP geolocation API
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        return data.country_code || 'US';
    } catch (error) {
        console.error('Failed to detect country:', error);
        // Fallback to browser locale
        const locale = navigator.language || 'en-US';
        const countryCode = locale.split('-')[1] || 'US';
        return countryCode.toUpperCase();
    }
}

/**
 * Get pricing for user's detected location
 */
export async function getUserPricing(): Promise<RegionalPricing> {
    const countryCode = await detectUserCountry();
    return calculateRegionalPricing(countryCode);
}

export default {
    calculateRegionalPricing,
    detectUserCountry,
    getUserPricing,
    BASE_PRICES_USD,
    COMPETITOR_PRICES
};
