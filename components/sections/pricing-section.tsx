'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Check, 
  ArrowRight, 
  Zap, 
  Crown, 
  Building,
  Star
} from 'lucide-react';

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);

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

  return (
    <section id="pricing" className="py-16 md:py-24 bg-gradient-to-b from-muted/20 to-background">
      <div className="container">
        <div className="text-center space-y-4 mb-12 md:mb-16">
          <Badge variant="outline" className="px-3 py-1">
            Pricing
          </Badge>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold">
            Simple, transparent
            <span className="block gradient-text-natural">pricing for everyone</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Start free, scale as you grow. No hidden fees, no surprises.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center space-x-3 md:space-x-4 mb-8 md:mb-12">
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
          <Badge variant="secondary" className="ml-2 text-xs">
            Save up to 17%
          </Badge>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card key={plan.name} className={`relative overflow-hidden texture-paper ${
              plan.popular 
                ? 'border-primary shadow-medium scale-105' 
                : ''
            }`}>
              {plan.popular && (
                <div className="absolute top-0 right-4 md:right-6">
                  <div className="bg-primary text-primary-foreground px-3 md:px-4 py-1 text-xs font-medium rounded-b-lg">
                    Most Popular
                  </div>
                </div>
              )}

              <CardHeader className="text-center pb-3 md:pb-4">
                <div className="flex justify-center mb-3 md:mb-4">
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center ${
                    plan.popular 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-primary/10 text-primary'
                  }`}>
                    <plan.icon className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                </div>
                <CardTitle className="text-xl md:text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-sm md:text-base">
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 md:space-y-6">
                {/* Pricing */}
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-3xl md:text-4xl font-bold">
                      {formatPrice(plan.price)}
                    </span>
                    {plan.price.monthly > 0 && (
                      <span className="text-muted-foreground text-sm md:text-base">
                        /{isAnnual ? 'mo' : 'month'}
                      </span>
                    )}
                  </div>
                  
                  {isAnnual && plan.price.monthly > 0 && (
                    <div className="mt-1">
                      <span className="text-xs md:text-sm text-muted-foreground line-through">
                        ${plan.price.monthly}/mo
                      </span>
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Save {getSavings(plan.price)}%
                      </Badge>
                    </div>
                  )}
                  
                  <div className="text-xs md:text-sm text-muted-foreground mt-2">
                    {plan.requests} requests included
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-2 md:space-y-3">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start space-x-2 md:space-x-3">
                      <div className="flex-shrink-0 w-4 h-4 md:w-5 md:h-5 bg-green-500/10 rounded-full flex items-center justify-center mt-0.5">
                        <Check className="w-2.5 h-2.5 md:w-3 md:h-3 text-green-500" />
                      </div>
                      <span className="text-xs md:text-sm text-muted-foreground">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>

              <CardFooter className="pt-4 md:pt-6">
                <Button 
                  className={`w-full ${plan.popular ? '' : 'variant-outline'}`}
                  variant={plan.popular ? 'default' : 'outline'}
                  asChild
                >
                  <Link href="/auth/signup">
                    {plan.name === 'Starter' ? 'Get Started' : 'Start Free Trial'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Enterprise Contact */}
        <div className="text-center mt-12 md:mt-16">
          <Card className="max-w-2xl mx-auto texture-noise">
            <CardContent className="p-6 md:p-8">
              <div className="space-y-3 md:space-y-4">
                <Crown className="w-10 h-10 md:w-12 md:h-12 text-primary mx-auto" />
                <h3 className="text-xl md:text-2xl font-bold">Need something custom?</h3>
                <p className="text-muted-foreground text-sm md:text-base">
                  We offer custom plans for large enterprises with specific requirements.
                  Contact our sales team to discuss your needs.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
                  <Button variant="outline" asChild>
                    <Link href="/contact">Contact Sales</Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link href="/enterprise">Learn More</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}