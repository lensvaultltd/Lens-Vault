import { Router } from 'express';
import pricingService from '../../services/pricingService';

const router = Router();

/**
 * GET /api/pricing/region
 * Get pricing for user's region based on IP or provided country code
 */
router.get('/region', async (req, res) => {
    try {
        const countryCode = req.query.country as string;

        let pricing;
        if (countryCode) {
            pricing = pricingService.calculateRegionalPricing(countryCode);
        } else {
            // Detect from IP (in production, use req.ip with a geolocation service)
            // For now, default to US
            pricing = pricingService.calculateRegionalPricing('US');
        }

        res.json({
            success: true,
            pricing
        });
    } catch (error: any) {
        console.error('Pricing region error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get regional pricing',
            error: error.message
        });
    }
});

/**
 * GET /api/pricing/compare
 * Get pricing comparison with competitors
 */
router.get('/compare', async (req, res) => {
    try {
        const countryCode = (req.query.country as string) || 'US';
        const pricing = pricingService.calculateRegionalPricing(countryCode);

        res.json({
            success: true,
            comparison: {
                lensVault: {
                    premium: pricing.prices.premium.annual,
                    family: pricing.prices.family.annual,
                    currency: pricing.currency
                },
                competitors: {
                    '1password': {
                        premium: pricingService.COMPETITOR_PRICES.premium['1password'],
                        family: pricingService.COMPETITOR_PRICES.family['1password']
                    },
                    lastpass: {
                        premium: pricingService.COMPETITOR_PRICES.premium.lastpass
                    },
                    bitwarden: {
                        premium: pricingService.COMPETITOR_PRICES.premium.bitwarden,
                        family: pricingService.COMPETITOR_PRICES.family.bitwarden
                    }
                },
                savings: pricing.savings
            }
        });
    } catch (error: any) {
        console.error('Pricing compare error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get pricing comparison',
            error: error.message
        });
    }
});

/**
 * GET /api/pricing/countries
 * Get list of supported countries with their pricing
 */
router.get('/countries', async (req, res) => {
    try {
        const countries = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IN', 'NG', 'BR', 'MX', 'ZA', 'CN', 'JP'];
        const pricingByCountry = countries.map(code => ({
            code,
            pricing: pricingService.calculateRegionalPricing(code)
        }));

        res.json({
            success: true,
            countries: pricingByCountry
        });
    } catch (error: any) {
        console.error('Pricing countries error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get country pricing',
            error: error.message
        });
    }
});

export default router;
