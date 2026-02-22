import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt, getAuthCookie } from './auth';
import { prisma } from './prisma';
import { auditLogger, getIpAddress, getUserAgent } from './audit-log';
import { rateLimiter, RATE_LIMITS } from './rate-limit';

export interface AuthContext {
  user: {
    id: string;
    email: string;
    fullName: string | null;
    plan: string;
  };
  session: {
    id: string;
    ipAddress: string;
    userAgent: string;
  };
}

export class AuthenticationError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export const authenticateRequest = async (
  req: NextRequest
): Promise<AuthContext> => {
  const token = await getAuthCookie();

  if (!token) {
    throw new AuthenticationError('Not authenticated');
  }

  const decoded = await verifyJwt(token);

  if (!decoded || typeof decoded === 'string') {
    throw new AuthenticationError('Invalid token');
  }

  const userId = typeof decoded === 'object' && 'id' in decoded
    ? String(decoded.id)
    : null;

  if (!userId) {
    throw new AuthenticationError('Invalid token payload');
  }

  // Get user from database
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      plan: true,
      lockedUntil: true,
    },
  });

  if (!user) {
    throw new AuthenticationError('User not found', 404);
  }

  // Check if account is locked
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AuthenticationError(
      `Account locked until ${user.lockedUntil.toISOString()}`,
      403
    );
  }

  const ipAddress = getIpAddress(req);
  const userAgent = getUserAgent(req);

  // Verify or create session
  const session = await prisma.session.findFirst({
    where: {
      userId: user.id,
      token,
      expiresAt: { gte: new Date() },
    },
  });

  if (!session) {
    // Create new session
    const newSession = await prisma.session.create({
      data: {
        userId: user.id,
        token,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        plan: user.plan,
      },
      session: {
        id: newSession.id,
        ipAddress,
        userAgent,
      },
    };
  }

  // Update last activity
  await prisma.session.update({
    where: { id: session.id },
    data: { lastActivity: new Date() },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      plan: user.plan,
    },
    session: {
      id: session.id,
      ipAddress,
      userAgent,
    },
  };
};

export const requireAuth = (
  handler: (req: NextRequest, ctx: AuthContext) => Promise<NextResponse>
) => {
  return async (req: NextRequest) => {
    try {
      const ctx = await authenticateRequest(req);
      return await handler(req, ctx);
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.statusCode }
        );
      }

      console.error('Authentication error:', error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 500 }
      );
    }
  };
};

export const withRateLimit = (
  config: { requests: number; window: string },
  getIdentifier: (req: NextRequest, ctx?: AuthContext) => string
) => {
  return (
    handler: (req: NextRequest, ctx?: AuthContext) => Promise<NextResponse>
  ) => {
    return async (req: NextRequest, ctx?: AuthContext) => {
      const identifier = getIdentifier(req, ctx);
      const result = await rateLimiter.checkLimit(identifier, config);

      if (!result.allowed) {
        const ipAddress = getIpAddress(req);
        const userAgent = getUserAgent(req);

        // Log rate limit violation
        await auditLogger.log({
          userId: ctx?.user.id,
          action: 'security.rate_limit_exceeded',
          ipAddress,
          userAgent,
          status: 'blocked',
          severity: 'warning',
          metadata: {
            identifier,
            limit: result.limit,
            resetAt: result.resetAt,
          },
        });

        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            limit: result.limit,
            resetAt: result.resetAt,
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': result.limit.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': result.resetAt.toISOString(),
              'Retry-After': Math.ceil(
                (result.resetAt.getTime() - Date.now()) / 1000
              ).toString(),
            },
          }
        );
      }

      const response = await handler(req, ctx);

      // Add rate limit headers to response
      response.headers.set('X-RateLimit-Limit', result.limit.toString());
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      response.headers.set('X-RateLimit-Reset', result.resetAt.toISOString());

      return response;
    };
  };
};
