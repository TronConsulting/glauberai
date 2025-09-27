import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signJwt, setAuthCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { email, password, fullName } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'User already exists.' }, { status: 409 });
  }
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hashed, fullName },
  });
  // Set JWT cookie
  const token = await signJwt({ id: user.id, email: user.email, fullName: user.fullName });
  await setAuthCookie(token);
  return NextResponse.json({ id: user.id, email: user.email, fullName: user.fullName });
}
