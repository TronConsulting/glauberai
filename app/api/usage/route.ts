import { NextRequest, NextResponse } from 'next/server';
import { getAuthCookie, verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const token = await getAuthCookie();
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const decoded = await verifyJwt(token);
  if (!decoded || typeof decoded === 'string') {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const userId = typeof decoded === 'object' && 'id' in decoded ? String(decoded.id) : null;
  if (!userId) {
    return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
  }

  try {
    // Get user and their requests for this month
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        plan: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Count tokens for this month
    const currentTokens = await prisma.request.aggregate({
      _sum: { tokens: true },
      where: {
        userId: user.id,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    });
    const tokensUsed = currentTokens._sum.tokens || 0;

    // Calculate usage based on plan
    const planTokenLimits: Record<string, number> = {
      STARTER: 1000,
      PROFESSIONAL: 1000000,
      ENTERPRISE: -1 // Unlimited
    };
    const planLimit = planTokenLimits[user.plan] || 1000;
    const isUnlimited = user.plan === 'ENTERPRISE';
    const usagePercentage = isUnlimited ? 0 : (tokensUsed / planLimit) * 100;
    const remainingTokens = isUnlimited ? -1 : Math.max(0, planLimit - tokensUsed);

    const usage = {
      tokensUsed,
      planLimit,
      remainingTokens,
      usagePercentage: isUnlimited || planLimit === -1 ? 0 : usagePercentage,
      isUnlimited,
      currentUsage: tokensUsed,
      remainingRequests: isUnlimited ? -1 : remainingTokens,
      plan: {
        name: user.plan,
        tokens: planLimit,
        price: user.plan === 'PROFESSIONAL' ? 39 : 0,
        features: user.plan === 'STARTER' ? [
          'Up to 1,000 tokens/month',
          'Smart AI routing',
          'All AI models',
          'Standard support',
          'Basic analytics'
        ] : user.plan === 'PROFESSIONAL' ? [
          'Up to 1,000,000 tokens/month',
          'Smart AI routing',
          'All AI models',
          'Priority support',
          'Advanced analytics',
          'Custom integrations'
        ] : [
          'Unlimited tokens',
          'Smart AI routing',
          'All AI models',
          'Dedicated support',
          'Advanced analytics',
          'Custom integrations',
          'SLA guarantee'
        ]
      }
    };

    return NextResponse.json({ usage });
  } catch (error) {
    console.error('Error fetching usage:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 
