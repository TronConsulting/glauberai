import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  await clearAuthCookie();
  return NextResponse.json({ message: 'Signed out' });
} 