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
    description: 'Perfect for getting started with AI',
    price: { monthly: 0, annual: 0 },
    requests: '100',
    features: [
      '100 requests/month',
      'Free & open-source models (Llama, Mistral, GPT-2)',
      'Smart AI routing',
      'Standard support',
      'Basic analytics'
    ]
  },
  professional: {
    name: 'Professional',
    description: 'For individuals and small teams',
    price: { monthly: 49, annual: 490 },
    requests: '500',
    features: [
      '500 requests/month',
      'Advanced AI routing',
      'Free + Basic tier models (GPT-4o Mini, Claude Haiku, Gemini Flash)',
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
    price: { monthly: 499, annual: 4990 },
    requests: '5,000',
    features: [
      '5,000 requests/month',
      'All 60+ AI models including GPT-4o, Claude Opus, DALL-E 3',
      'Custom AI routing logic',
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