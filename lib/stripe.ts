import Stripe from 'stripe';

// Initialize Stripe with your secret key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Price lookup keys for different plans
export const PRICE_LOOKUP_KEYS = {
  starter: {
    monthly: 'price_starter_monthly',
    annual: 'price_starter_annual'
  },
  professional: {
    monthly: 'price_professional_monthly',
    annual: 'price_professional_annual'
  },
  enterprise: {
    monthly: 'price_enterprise_monthly',
    annual: 'price_enterprise_annual'
  }
} as const;

// Plan configurations
export const PLANS = {
  starter: {
    name: 'Starter',
    description: 'Perfect for trying out GlauberAI',
    price: { monthly: 0, annual: 0 },
    requests: '1,000',
    features: [
      'Up to 1,000 requests/month',
      'Basic AI routing',
      '3 AI models (GPT-3.5, Claude Haiku, Gemini)',
      'Standard support',
      'Basic analytics',
      'API access'
    ]
  },
  professional: {
    name: 'Professional',
    description: 'For growing businesses and teams',
    price: { monthly: 29, annual: 290 },
    requests: '50,000',
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
    ]
  },
  enterprise: {
    name: 'Enterprise',
    description: 'For large organizations',
    price: { monthly: 299, annual: 2990 },
    requests: 'Unlimited',
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
    ]
  }
} as const;

// Utility functions
export const formatPrice = (price: { monthly: number; annual: number }, isAnnual: boolean) => {
  const currentPrice = isAnnual ? price.annual : price.monthly;
  if (currentPrice === 0) return 'Free';
  
  const monthlyEquivalent = isAnnual ? currentPrice / 12 : currentPrice;
  return `$${monthlyEquivalent.toFixed(0)}`;
};

export const getSavings = (price: { monthly: number; annual: number }) => {
  if (price.monthly === 0) return 0;
  const annualMonthly = price.annual / 12;
  const savings = ((price.monthly - annualMonthly) / price.monthly) * 100;
  return Math.round(savings);
};

export const formatDate = (timestamp: number) => {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const getStatusBadge = (status: string) => {
  switch (status) {
    case 'active':
      return { label: 'Active', className: 'bg-green-500' };
    case 'trialing':
      return { label: 'Trial', className: 'bg-blue-500' };
    case 'canceled':
      return { label: 'Canceled', className: 'bg-red-500' };
    case 'past_due':
      return { label: 'Past Due', className: 'bg-red-500' };
    default:
      return { label: status, className: 'bg-gray-500' };
  }
}; 