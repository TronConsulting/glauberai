import { NextRequest, NextResponse } from 'next/server';
import { getAuthCookie, verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { aiRouter } from '@/lib/ai-router';

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
    // Fetch user's recent requests from the database
    const requests = await prisma.request.findMany({
      where: {
        userId
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20 // Limit to 20 most recent queries
    });

    // Transform requests to match the expected format
    const queries = requests.map(request => {
      // Analyze the query to determine content type
      const analysis = aiRouter.analyzeQuery(request.query);
      
      return {
        id: request.id,
        query: request.query,
        model: request.model,
        timestamp: request.createdAt.toISOString(),
        contentType: analysis.type || 'CHAT'
      };
    });

    return NextResponse.json({ queries });
  } catch (error) {
    console.error('Error fetching queries:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
