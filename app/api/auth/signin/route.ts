import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signJwt, setAuthCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid password.' }, { status: 401 });
  }
  // Set JWT cookie
  const token = await signJwt({ id: user.id, email: user.email, fullName: user.fullName });
  await setAuthCookie(token);
  return NextResponse.json({ id: user.id, email: user.email, fullName: user.fullName });
}
