import React, { useState, useEffect } from 'react';
import { usePaystackPayment } from 'react-paystack';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Check, X, ChevronDown, ChevronUp, Shield as ShieldIcon, Globe, TrendingDown } from 'lucide-react';
import { Subscription } from '../types';
import { Switch } from './ui/switch';
import { useToast } from './ui/use-toast';
import { getUserPricing, calculateRegionalPricing } from '../services/pricingService';
import type { RegionalPricing } from '../services/pricingService';
import FlutterwaveButton from './FlutterwaveButton';
import { selectPaymentGateway, verifyFlutterwavePayment } from '../services/flutterwaveService';

interface BillingProps {
  subscription: Subscription;
  onPlanChange: (plan: 'free' | 'premium' | 'family' | 'business') => void;
  email: string;
}

// Paystack supported currencies (African markets)
const PAYSTACK_CURRENCIES = ['NGN', 'GHS', 'ZAR', 'KES'];

const PlanFeature: React.FC<{ text: string; included: boolean }> = ({ text, included }) => (
  <li className="flex items-start gap-3 text-sm">
    {included ? (
      <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
    ) : (
      <X className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
    )}
    <span className={included ? 'text-foreground' : 'text-muted-foreground'}>{text}</span>
  </li>
);

const VISIBLE_FEATURES = 4;

// Helper component to use the hook for each plan button
const PaystackButtonWrapper = ({
  email,
  amount,
  currency,
  planId,
  disabled,
  onSuccess,
  onClose,
  isCurrent,
  isLoading,
  buttonText
}: any) => {
  const config = {
    reference: (new Date()).getTime().toString(),
    email: email,
    amount: Math.round(amount * 100), // Amount in kobo/cents
    currency: currency,
    publicKey: (import.meta as any).env.VITE_PAYSTACK_PUBLIC_KEY || '',
  };

  const initializePayment = usePaystackPayment(config);

  return (
    <Button
      className="w-full bg-gradient-accent"
      onClick={() => {
        if (planId === 'free') {
          onSuccess({ reference: 'free-switch' });
        } else {
          // @ts-ignore
          initializePayment(onSuccess, onClose);
        }
      }}
      disabled={disabled}
    >
      {isLoading ? 'Processing...' : buttonText}
    </Button>
  );
};

const Billing: React.FC<BillingProps> = ({ subscription, onPlanChange, email }) => {
  const [isYearly, setIsYearly] = useState(false);
  const [expandedFeatures, setExpandedFeatures] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [regionalPricing, setRegionalPricing] = useState<RegionalPricing | null>(null);
  const [loadingPricing, setLoadingPricing] = useState(true);
  const [showPricing, setShowPricing] = useState(false);
  const [paymentGateway, setPaymentGateway] = useState<'paystack' | 'flutterwave'>('paystack');
  const { toast } = useToast();

  // Fetch regional pricing on mount
  useEffect(() => {
    async function fetchPricing() {
      try {
        setLoadingPricing(true);
        const pricing = await getUserPricing();
        setRegionalPricing(pricing);
      } catch (error) {
        console.error('Failed to fetch pricing:', error);
        // Fallback to Nigeria pricing
        setRegionalPricing(calculateRegionalPricing('NG'));
      } finally {
        setLoadingPricing(false);
      }
    }
    fetchPricing();
  }, []);

  // Select payment gateway based on currency
  useEffect(() => {
    if (regionalPricing) {
      const gateway = selectPaymentGateway(regionalPricing.currency.code);
      setPaymentGateway(gateway);

      if (gateway === 'flutterwave') {
        console.log(`Using Flutterwave for ${regionalPricing.currency.code} payments`);
      }
    }
  }, [regionalPricing]);

  const toggleFeatures = (planId: string) => {
    setExpandedFeatures(prev => ({ ...prev, [planId]: !prev[planId] }));
  };

  const handlePaystackSuccess = async (reference: any, planId: string) => {
    try {
      setIsLoading(true);
      const { apiService } = await import('../services/apiService');
      const { supabase } = await import('../lib/supabase');

      // 1. Verify payment with backend
      const result = await apiService.verifyPayment(reference.reference, planId, isYearly ? 'yearly' : 'monthly');

      if (result.success) {
        // 2. Calculate subscription end date
        const now = new Date();
        const endDate = new Date(now);
        if (isYearly) {
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
          endDate.setMonth(endDate.getMonth() + 1);
        }

        // 3. Update Supabase immediately - THIS IS THE KEY CHANGE!
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error: updateError } = await supabase
            .from('users')
            .update({
              subscription_plan: planId,
              subscription_status: 'active',
              subscription_ends_at: endDate.toISOString(),
              last_payment_reference: reference.reference
            })
            .eq('id', user.id);

          if (updateError) {
            console.error('Failed to update subscription in Supabase:', updateError);
            toast({
              title: 'Warning',
              description: 'Payment successful but subscription update failed. Please contact support.',
              variant: 'destructive'
            });
            return;
          }
        }

        // 4. Show success message
        toast({
          title: 'Payment Successful! 🎉',
          description: `Your ${planId.charAt(0).toUpperCase() + planId.slice(1)} plan is now active!`,
          variant: 'default',
          duration: 5000
        });

        // 5. Update local state
        onPlanChange(planId as any);

        // 6. Reload to show new features
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast({ title: 'Verification Failed', description: result.message, variant: 'destructive' });
      }
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Payment verification failed', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaystackClose = () => {
    setIsLoading(false);
    console.log('Payment closed');
  };

  const handleFlutterwaveSuccess = async (response: any, planId: string) => {
    try {
      setIsLoading(true);
      const { apiService } = await import('../services/apiService');
      const { supabase } = await import('../lib/supabase');

      // Verify payment with backend
      const result = await verifyFlutterwavePayment(
        response.transaction_id,
        planId,
        isYearly ? 'yearly' : 'monthly'
      );

      if (result.success) {
        // Calculate subscription end date
        const now = new Date();
        const endDate = new Date(now);
        if (isYearly) {
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
          endDate.setMonth(endDate.getMonth() + 1);
        }

        // Update Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error: updateError } = await supabase
            .from('users')
            .update({
              subscription_plan: planId,
              subscription_status: 'active',
              subscription_ends_at: endDate.toISOString(),
              last_payment_reference: response.transaction_id
            })
            .eq('id', user.id);

          if (updateError) {
            console.error('Failed to update subscription:', updateError);
            toast({
              title: 'Warning',
              description: 'Payment successful but subscription update failed. Please contact support.',
              variant: 'destructive'
            });
            return;
          }
        }

        toast({
          title: 'Payment Successful! 🎉',
          description: `Your ${planId.charAt(0).toUpperCase() + planId.slice(1)} plan is now active!`,
          variant: 'default',
          duration: 5000
        });

        onPlanChange(planId as any);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast({ title: 'Verification Failed', description: result.message, variant: 'destructive' });
      }
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Payment verification failed', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFlutterwaveClose = () => {
    setIsLoading(false);
    console.log('Flutterwave payment closed');
  };

  if (loadingPricing || !regionalPricing) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Get payment currency
  const paymentCurrency = regionalPricing.currency.code;

  // Define plans with dynamic pricing
  const plans = [
    {
      name: 'Free Plan',
      id: 'free' as const,
      price: `${regionalPricing.currency.symbol}0`,
      priceSuffix: '/ month',
      yearlyPrice: `${regionalPricing.currency.symbol}0 / year`,
      amount: 0,
      description: 'For basic personal use.',
      features: [
        { text: 'Store unlimited passwords', included: true },
        { text: 'Sync across 1 Device', included: true },
        { text: 'Strong password generator', included: true },
        { text: 'Family & Sharing', included: false },
        { text: 'Dark web email breach monitoring', included: false },
        { text: 'Priority support', included: false },
      ],
    },
    {
      name: 'Premium Plan',
      id: 'premium' as const,
      price: regionalPricing.displayPrices.premium,
      priceSuffix: '/ month',
      yearlyPrice: `${regionalPricing.currency.symbol}${regionalPricing.prices.premium.annual.toLocaleString()} / year`,
      amount: isYearly ? regionalPricing.prices.premium.annual : regionalPricing.prices.premium.monthly,
      savings: regionalPricing.savings.premium,
      description: 'For professionals and remote workers.',
      features: [
        { text: 'Store unlimited passwords', included: true },
        { text: 'Auto-fill passwords & 2FA codes', included: true },
        { text: 'Sync across up to 3 devices', included: true },
        { text: 'Dark web email breach monitoring', included: true },
        { text: 'Secure notes & document storage', included: true },
        { text: 'Emergency access recovery', included: true },
        { text: 'Encrypted cloud backup', included: true },
        { text: 'Priority password reset support', included: true },
      ],
      isMostPopular: true,
    },
    {
      name: 'Family Plan',
      id: 'family' as const,
      price: regionalPricing.displayPrices.family,
      priceSuffix: '/ month',
      yearlyPrice: `${regionalPricing.currency.symbol}${regionalPricing.prices.family.annual.toLocaleString()} / year`,
      amount: isYearly ? regionalPricing.prices.family.annual : regionalPricing.prices.family.monthly,
      savings: regionalPricing.savings.family,
      description: 'For your whole family.',
      features: [
        { text: 'All Premium features', included: true },
        { text: 'Up to 5 user accounts', included: true },
        { text: 'Up to 15 devices', included: true },
        { text: 'Shared family password vault', included: true },
        { text: 'Secure sharing (Netflix, DSTV, etc.)', included: true },
        { text: 'Parental account oversight (optional)', included: true },
        { text: 'Dark web monitoring for the entire family', included: true },
      ],
    },
    {
      name: 'Business Plan',
      id: 'business' as const,
      price: regionalPricing.displayPrices.business,
      priceSuffix: '/ month',
      yearlyPrice: `${regionalPricing.currency.symbol}${regionalPricing.prices.business.annual.toLocaleString()} / year`,
      amount: isYearly ? regionalPricing.prices.business.annual : regionalPricing.prices.business.monthly,
      description: 'For small businesses up to 10 users.',
      features: [
        { text: 'All Family features', included: true },
        { text: '10 user seats', included: true },
        { text: 'Up to 30 devices', included: true },
        { text: 'Role-based access controls', included: true },
        { text: 'Audit logs & login tracking', included: true },
        { text: 'Staff password hygiene scoring', included: true },
        { text: 'Dark web domain monitoring', included: true },
        { text: 'Admin dashboard', included: true },
      ],
    },
  ];

  return (
    <div className="space-y-8">

      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Your Lens Vault Protection Level</CardTitle>
          <CardDescription>
            Manage your password vault, security features, and billing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <h3 className="font-semibold text-lg">
                {plans.find(p => p.id === subscription.plan)?.name}
                {subscription.status === 'trialing' && <Badge variant="secondary" className="ml-2">Trial</Badge>}
              </h3>
              {subscription.status === 'trialing' && subscription.trialEndsAt && (
                <p className="text-sm text-muted-foreground mt-1">
                  Trial ends on {new Date(subscription.trialEndsAt).toLocaleDateString()}.
                </p>
              )}
            </div>
            <Button variant="outline" onClick={() => setShowPricing(!showPricing)}>
              {showPricing ? 'Hide Pricing' : 'Manage Subscription'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Billing Cycle Toggle - Only show when showPricing is true */}
      {showPricing && (
        <div className="text-center">
          <div className="flex justify-center items-center gap-4 my-8">
            <span className={!isYearly ? 'font-semibold text-primary' : 'text-muted-foreground'}>Monthly</span>
            <Switch checked={isYearly} onCheckedChange={setIsYearly} />
            <span className={isYearly ? 'font-semibold text-primary' : 'text-muted-foreground'}>
              Yearly <Badge variant="secondary">Save up to 17%</Badge>
            </span>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            {plans.map(plan => {
              const isCurrent = subscription.plan === plan.id;
              const isExpanded = !!expandedFeatures[plan.id];
              const topFeatures = plan.features.slice(0, VISIBLE_FEATURES);
              const otherFeatures = plan.features.slice(VISIBLE_FEATURES);

              return (
                <Card key={plan.id} className={`flex flex-col rounded-xl p-6 text-left card-lift-hover ${plan.isMostPopular ? 'card-glow border-primary/50' : ''}`}>
                  {plan.isMostPopular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-accent">
                      Recommended
                    </Badge>
                  )}
                  <div className="flex-grow">
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground h-10 mt-1">{plan.description}</p>
                    <div className="my-6">
                      <span className="text-4xl font-bold">
                        {isYearly ? plan.yearlyPrice.split(' ')[0] : plan.price}
                      </span>
                      <span className="text-muted-foreground">
                        {isYearly ? ' / year' : plan.priceSuffix}
                      </span>
                    </div>

                    {/* Removed competitor comparison to avoid legal issues */}

                    <ul className="space-y-3">
                      {topFeatures.map((feature, i) => (
                        <PlanFeature key={`top-${i}`} text={feature.text} included={feature.included} />
                      ))}
                    </ul>

                    {otherFeatures.length > 0 && (
                      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-96' : 'max-h-0'}`}>
                        <div className="border-t my-4"></div>
                        <ul className="space-y-3">
                          {otherFeatures.map((feature, i) => (
                            <PlanFeature key={`other-${i}`} text={feature.text} included={feature.included} />
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="mt-6">
                    {otherFeatures.length > 0 && (
                      <Button variant="ghost" size="sm" className="w-full mb-3 text-muted-foreground" onClick={() => toggleFeatures(plan.id)}>
                        {isExpanded ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                        {isExpanded ? 'Show less' : `Show all ${plan.features.length} features`}
                      </Button>
                    )}
                    {paymentGateway === 'paystack' ? (
                      <PaystackButtonWrapper
                        email={email}
                        amount={plan.amount}
                        currency={paymentCurrency}
                        planId={plan.id}
                        disabled={isCurrent || isLoading}
                        onSuccess={(ref: any) => handlePaystackSuccess(ref, plan.id)}
                        onClose={handlePaystackClose}
                        isCurrent={isCurrent}
                        isLoading={isLoading}
                        buttonText={isCurrent ? 'Current Plan' : `Switch to ${plan.name}`}
                      />
                    ) : (
                      <FlutterwaveButton
                        email={email}
                        amount={plan.amount}
                        currency={paymentCurrency}
                        planId={plan.id}
                        billingCycle={isYearly ? 'yearly' : 'monthly'}
                        disabled={isCurrent || isLoading}
                        onSuccess={(response: any) => handleFlutterwaveSuccess(response, plan.id)}
                        onClose={handleFlutterwaveClose}
                        isLoading={isLoading}
                        buttonText={isCurrent ? 'Current Plan' : `Switch to ${plan.name}`}
                      />
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Security Footer - Only show Paystack badge when pricing is visible */}
      {showPricing && (
        <div className="mt-12 text-center text-sm text-muted-foreground space-y-2">
          <div className="flex items-center justify-center gap-2">
            <ShieldIcon className="h-4 w-4 text-green-500" />
            <p>Secure checkout powered by {paymentGateway === 'paystack' ? 'Paystack' : 'Flutterwave'}.</p>
          </div>
          <p>100% encrypted passwords. Zero-knowledge infrastructure.</p>
          {paymentGateway === 'paystack' ? (
            <p className="text-xs">African markets: NGN, GHS, ZAR, KES</p>
          ) : (
            <p className="text-xs">International payments: 150+ countries supported</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Billing;
