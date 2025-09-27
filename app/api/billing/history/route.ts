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
    const billingRecords = await prisma.billing.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10 // Limit to last 10 records
    });

    return NextResponse.json(billingRecords.map(record => ({
      id: record.id,
      plan: record.plan,
      amount: record.amount,
      status: record.status,
      period: record.period,
      startDate: record.startDate,
      endDate: record.endDate,
      createdAt: record.createdAt
    })));
  } catch (error) {
    console.error('Error fetching billing history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
