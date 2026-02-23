export const PLAN_LIMITS = {
  STARTER: {
    name: 'Starter',
    requests: 100, // Monthly request limit
    price: 0,
    modelTiers: ['FREE'], // Only free models
    features: [
      '100 requests/month',
      'Free & open-source models',
      'Basic AI routing',
      'Standard support',
      'Basic analytics'
    ]
  },
  PROFESSIONAL: {
    name: 'Professional',
    requests: 500, // Monthly request limit
    price: 49,
    modelTiers: ['FREE', 'BASIC'], // Free + Basic tier models
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
  ENTERPRISE: {
    name: 'Enterprise',
    requests: 5000, // Monthly request limit
    price: 499,
    modelTiers: ['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE'], // All models
    features: [
      '5,000 requests/month',
      'Custom AI routing logic',
      'All 60+ AI models including GPT-4o, Claude Opus, DALL-E 3',
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