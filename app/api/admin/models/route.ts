import { NextRequest, NextResponse } from 'next/server';
import { getAuthCookie, verifyJwt } from '@/lib/auth';
import { openSourceModelManager } from '@/lib/opensource-models';
import { huggingFaceClient } from '@/lib/huggingface-client';
import { openSourceAIRouter } from '@/lib/opensource-router';

// Redirect to the new opensource admin endpoint
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'models';
  
  // Redirect to the new opensource admin endpoint with the same parameters
  const opensourceUrl = new URL('/api/admin/opensource', req.url);
  opensourceUrl.searchParams.set('action', action);
  
  // Copy all search params
  searchParams.forEach((value, key) => {
    if (key !== 'action') {
      opensourceUrl.searchParams.set(key, value);
    }
  });
  
  return NextResponse.redirect(opensourceUrl.toString());
}

export async function POST(req: NextRequest) {
  // Redirect POST requests to the new opensource admin endpoint
  const opensourceUrl = new URL('/api/admin/opensource', req.url);
  return NextResponse.redirect(opensourceUrl.toString(), { status: 307 });
}