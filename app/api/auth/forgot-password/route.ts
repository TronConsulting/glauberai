import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';

const TOKEN_TTL_MINUTES = 60;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getResetBaseUrl() {
  const base =
    process.env.RESET_PASSWORD_URL_BASE ||
    (process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`
      : '');

  if (!base) {
    throw new Error('RESET_PASSWORD_URL_BASE or NEXT_PUBLIC_APP_URL must be set');
  }

  return base;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body?.email === 'string' ? normalizeEmail(body.email) : '';

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return a generic response to avoid account enumeration
    const response = NextResponse.json({
      message: 'If an account with that email exists, you will receive a password reset email soon.'
    });

    if (!user) {
      return response;
    }

    // Invalidate previous tokens
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt
      }
    });

    const resetUrl = `${getResetBaseUrl()}?token=${rawToken}`;
    await sendPasswordResetEmail({ to: email, resetUrl });

    return response;
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
