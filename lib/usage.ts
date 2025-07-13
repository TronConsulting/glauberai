import { supabase } from './supabase';

export const PLAN_LIMITS = {
  STARTER: {
    name: 'Starter',
    tokens: 1000,
    price: 0,
    features: [
      'Up to 1,000 tokens/month',
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

export async function getUserUsage(userId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // Get user's current plan
  const { data: user, error: userError } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    throw new Error('User not found');
  }

  // Get requests for current month
  const { data: requests, error: requestsError } = await supabase
    .from('requests')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', startOfMonth.toISOString());

  if (requestsError) {
    throw new Error('Failed to fetch usage data');
  }

  const currentUsage = requests?.length || 0;
  const planLimit = PLAN_LIMITS[user.plan as keyof typeof PLAN_LIMITS]?.tokens || 1000;
  const isUnlimited = planLimit === -1;
  const remainingRequests = isUnlimited ? -1 : Math.max(0, planLimit - currentUsage);
  const usagePercentage = isUnlimited ? 0 : (currentUsage / planLimit) * 100;

  return {
    user,
    currentUsage,
    planLimit,
    remainingRequests,
    usagePercentage,
    isUnlimited,
    plan: PLAN_LIMITS[user.plan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.STARTER
  };
}

export async function canMakeRequest(userId: string): Promise<{ allowed: boolean; reason?: string; usage?: any }> {
  try {
    const usage = await getUserUsage(userId);
    
    if (usage.isUnlimited) {
      return { allowed: true, usage };
    }
    
    if (usage.currentUsage >= usage.planLimit) {
      return { 
        allowed: false, 
        reason: `You've reached your monthly limit of ${usage.planLimit} tokens. Please upgrade your plan to continue.`,
        usage 
      };
    }
    
    return { allowed: true, usage };
  } catch (error) {
    console.error('Error checking user usage:', error);
    return { allowed: false, reason: 'Unable to verify usage limits. Please try again.' };
  }
}

export async function recordRequest(userId: string, query: string, model: string, tokens: number, cost: number = 0) {
  const { data, error } = await supabase
    .from('requests')
    .insert({
      user_id: userId,
      query,
      model_used: model,
      input_tokens: tokens,
      cost,
      was_cached: false
    })
    .select()
    .single();

  if (error) {
    throw new Error('Failed to record request');
  }

  return data;
}

export function getUpgradeOptions(currentPlan: string) {
  const plans = Object.entries(PLAN_LIMITS);
  return plans.filter(([plan]) => plan !== currentPlan).map(([plan, details]) => ({
    plan,
    ...details
  }));
} 