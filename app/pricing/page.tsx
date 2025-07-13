'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { toast } from 'sonner';
import { 
  Check, 
  ArrowRight, 
  Zap, 
  Crown, 
  Building,
  Star,
  X,
  CreditCard,
  Loader2
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  fullName?: string;
  plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  stripeCustomerId?: string;
}

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Get current user
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };
    
    fetchUser();
  }, []);

  const plans = [
    {
      name: 'Starter',
      description: 'Perfect for trying out GlauberAI',
      price: { monthly: 0, annual: 0 },
      requests: '1,000',
      icon: Zap,
      popular: false,
      features: [
        'Up to 1,000 requests/month',
        'Basic AI routing',
        '3 AI models (GPT-3.5, Claude Haiku, Gemini)',
        'Standard support',
        'Basic analytics',
        'API access'
      ],
      limitations: [
        'No advanced routing rules',
        'Limited model selection',
        'Basic support only'
      ]
    },
    {
      name: 'Professional',
      description: 'For growing businesses and teams',
      price: { monthly: 39, annual: 390 },
      requests: '50,000',
      icon: Star,
      popular: true,
      features: [
        'Up to 50,000 requests/month',
        'Advanced AI routing',
        'All 15+ AI models',
        'Priority support',
        'Advanced analytics & insights',
        'Custom routing rules',
        'Webhook integrations',
        'Team collaboration',
        'Usage alerts',
        'Export data'
      ],
      limitations: []
    },
    {
      name: 'Enterprise',
      description: 'For large organizations',
      price: { monthly: 299, annual: 2990 },
      requests: 'Unlimited',
      icon: Building,
      popular: false,
      features: [
        'Unlimited requests',
        'Custom AI routing logic',
        'All AI models + custom models',
        'Dedicated support manager',
        'Advanced analytics & reporting',
        'Custom integrations',
        'SSO & SAML',
        'SLA guarantee (99.9%)',
        'White-label options',
        'On-premise deployment',
        'Custom contracts',
        'Training & onboarding'
      ],
      limitations: []
    }
  ];

  const formatPrice = (price: { monthly: number; annual: number }) => {
    const currentPrice = isAnnual ? price.annual : price.monthly;
    if (currentPrice === 0) return 'Free';
    
    const monthlyEquivalent = isAnnual ? currentPrice / 12 : currentPrice;
    return `$${monthlyEquivalent.toFixed(0)}`;
  };

  const getSavings = (price: { monthly: number; annual: number }) => {
    if (price.monthly === 0) return 0;
    const annualMonthly = price.annual / 12;
    const savings = ((price.monthly - annualMonthly) / price.monthly) * 100;
    return Math.round(savings);
  };

  const handleSubscribe = async (planName: string) => {
    if (planName === 'Starter') {
      // Starter plan is free, redirect to signup
      window.location.href = '/auth/signup';
      return;
    }

    // Check if user is logged in
    if (!user) {
      toast.error('Please sign in to subscribe to a plan');
      return;
    }

    setLoading(planName);
    
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planName.toLowerCase(),
          billingCycle: isAnnual ? 'annual' : 'monthly',
          email: user.email,
          userId: user.id
        })
      });

      const data = await response.json();

      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout process');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="py-24">
        <div className="container">
          <div className="text-center space-y-4 mb-16">
            <Badge variant="outline" className="px-4 py-2">
              Pricing
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold">
              Simple, transparent
              <span className="block gradient-text">pricing for everyone</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start free, scale as you grow. No hidden fees, no surprises.
            </p>
          </div>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center space-x-4 mb-12">
            <span className={`text-sm font-medium ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
              Monthly
            </span>
            <Switch
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
              className="data-[state=checked]:bg-primary"
            />
            <span className={`text-sm font-medium ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
              Annual
            </span>
            <Badge variant="secondary" className="ml-2">
              Save up to 17%
            </Badge>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
            {plans.map((plan) => (
              <Card key={plan.name} className={`relative overflow-hidden ${
                plan.popular 
                  ? 'border-primary shadow-lg shadow-primary/20 scale-105' 
                  : 'glass'
              }`}>
                {plan.popular && (
                  <div className="absolute top-0 right-6">
                    <div className="bg-primary text-primary-foreground px-4 py-1 text-xs font-medium rounded-b-lg">
                      Most Popular
                    </div>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      plan.popular 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-primary/10 text-primary'
                    }`}>
                      <plan.icon className="w-6 h-6" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="text-base">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Pricing */}
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-4xl font-bold">
                        {formatPrice(plan.price)}
                      </span>
                      {plan.price.monthly > 0 && (
                        <span className="text-muted-foreground">
                          /{isAnnual ? 'mo' : 'month'}
                        </span>
                      )}
                    </div>
                    
                    {isAnnual && plan.price.monthly > 0 && (
                      <div className="mt-1">
                        <span className="text-sm text-muted-foreground line-through">
                          ${plan.price.monthly}/mo
                        </span>
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Save {getSavings(plan.price)}%
                        </Badge>
                      </div>
                    )}
                    
                    <div className="text-sm text-muted-foreground mt-2">
                      {plan.requests} requests included
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-5 h-5 bg-green-500/10 rounded-full flex items-center justify-center mt-0.5">
                          <Check className="w-3 h-3 text-green-500" />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {feature}
                        </span>
                      </div>
                    ))}
                    
                    {plan.limitations.map((limitation, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-5 h-5 bg-red-500/10 rounded-full flex items-center justify-center mt-0.5">
                          <X className="w-3 h-3 text-red-500" />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {limitation}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>

                <CardFooter className="pt-6">
                  <Button 
                    className={`w-full ${plan.popular ? '' : 'variant-outline'}`}
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => handleSubscribe(plan.name)}
                    disabled={loading === plan.name}
                  >
                    {loading === plan.name ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {plan.name === 'Starter' ? 'Get Started' : (
                          <>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Subscribe Now
                          </>
                        )}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* FAQ Section */}
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                {
                  question: "Can I change plans anytime?",
                  answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately and we'll prorate the billing."
                },
                {
                  question: "What happens if I exceed my quota?",
                  answer: "We'll notify you when you're approaching your limit. You can upgrade your plan or purchase additional requests as needed."
                },
                {
                  question: "Do you offer refunds?",
                  answer: "Yes, we offer a 30-day money-back guarantee for all paid plans. No questions asked."
                },
                {
                  question: "Is there a free trial?",
                  answer: "Yes! Our Starter plan is completely free with 1,000 requests per month. No credit card required."
                }
              ].map((faq, index) => (
                <Card key={index} className="glass">
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-2">{faq.question}</h3>
                    <p className="text-muted-foreground text-sm">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}