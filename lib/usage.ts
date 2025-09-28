export const PLAN_LIMITS = {
  STARTER: {
    name: 'Starter',
    tokens: 10000,
    price: 0,
    features: [
      'Up to 10,000 tokens/month',
      'Smart AI routing',
      'All AI models',
      'Standard support',
      'Basic analytics'
    ]
  },
  PROFESSIONAL: {
    name: 'Professional',
    tokens: 1000000, // effectively unlimited for now
    price: 39,
    features: [
      'Up to 1,000,000 tokens/month',
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
  ENTERPRISE: {
    name: 'Enterprise',
    tokens: -1, // Unlimited
    price: 299,
    features: [
      'Unlimited tokens',
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
};

export function getUpgradeOptions(currentPlan: string) {
  const plans = Object.entries(PLAN_LIMITS);
  return plans.filter(([plan]) => plan !== currentPlan).map(([plan, details]) => ({
    plan,
    ...details
  }));
} 