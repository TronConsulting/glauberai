import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signJwt, setAuthCookie } from '@/lib/auth';
import { auditLogger, getIpAddress, getUserAgent } from '@/lib/audit-log';
import { rateLimiter, RATE_LIMITS } from '@/lib/rate-limit';
import { validateEmail, ValidationError } from '@/lib/validation';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

export async function POST(req: NextRequest) {
  const ipAddress = getIpAddress(req);
  const userAgent = getUserAgent(req);

  // Rate limit by IP
  const rateLimitResult = await rateLimiter.checkLimit(
    `login:${ipAddress}`,
    RATE_LIMITS.LOGIN
  );

  if (!rateLimitResult.allowed) {
    await auditLogger.log({
      action: 'security.rate_limit_exceeded',
      resource: 'signin',
      ipAddress,
      userAgent,
      status: 'blocked',
      severity: 'warning',
    });

    return NextResponse.json(
      {
        error: 'Too many login attempts. Please try again later.',
        resetAt: rateLimitResult.resetAt,
      },
      { status: 429 }
    );
  }

  try {
    const { email, password } = await req.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    let validatedEmail: string;
    try {
      validatedEmail = validateEmail(email);
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      throw error;
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: validatedEmail },
      select: {
        id: true,
        email: true,
        password: true,
        fullName: true,
        plan: true,
        failedLoginCount: true,
        lockedUntil: true,
      },
    });

    if (!user) {
      // Don't reveal that user doesn't exist
      await auditLogger.log({
        action: 'auth.failed_login',
        resource: 'user',
        ipAddress,
        userAgent,
        status: 'failure',
        metadata: { email: validatedEmail, reason: 'user_not_found' },
      });

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await auditLogger.log({
        userId: user.id,
        action: 'auth.failed_login',
        resource: 'user',
        resourceId: user.id,
        ipAddress,
        userAgent,
        status: 'blocked',
        metadata: { reason: 'account_locked', lockedUntil: user.lockedUntil },
      });

      return NextResponse.json(
        {
          error: 'Too many failed login attempts. Please try again later.',
        },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // Increment failed login count atomically
      const newFailedCount = user.failedLoginCount + 1;
      const shouldLock = newFailedCount >= MAX_FAILED_ATTEMPTS;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: { increment: 1 },
          lockedUntil: shouldLock
            ? new Date(Date.now() + LOCKOUT_DURATION)
            : null,
        },
      });

      await auditLogger.log({
        userId: user.id,
        action: 'auth.failed_login',
        resource: 'user',
        resourceId: user.id,
        ipAddress,
        userAgent,
        status: 'failure',
        metadata: {
          reason: 'invalid_password',
          failedAttempts: newFailedCount,
          accountLocked: shouldLock,
        },
      });

      if (shouldLock) {
        return NextResponse.json(
          {
            error: 'Too many failed login attempts. Please try again later.',
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Reset failed login count
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    });

    // Create JWT token
    const token = await signJwt({
      id: user.id,
      email: user.email,
      plan: user.plan,
    });

    // Create session
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Set auth cookie
    await setAuthCookie(token);

    // Log successful login
    await auditLogger.log({
      userId: user.id,
      sessionId: session.id,
      action: 'auth.login',
      resource: 'user',
      resourceId: user.id,
      ipAddress,
      userAgent,
      status: 'success',
    });

    return NextResponse.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        plan: user.plan,
      },
    });
  } catch (error) {
    console.error('Login error:', error);

    await auditLogger.log({
      action: 'auth.failed_login',
      ipAddress,
      userAgent,
      status: 'failure',
      severity: 'error',
      metadata: { error: error instanceof Error ? error.message : 'Unknown' },
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
