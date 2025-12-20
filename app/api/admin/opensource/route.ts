import { NextRequest, NextResponse } from 'next/server';

// Redirect to the new unified admin system endpoint
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  
  // Redirect to the new unified admin system endpoint
  const systemUrl = new URL('/api/admin/system', req.url);
  
  // Copy all search params
  searchParams.forEach((value, key) => {
    systemUrl.searchParams.set(key, value);
  });
  
  return NextResponse.redirect(systemUrl.toString());
}

export async function POST(req: NextRequest) {
  // Redirect POST requests to the new unified admin system endpoint
  const systemUrl = new URL('/api/admin/system', req.url);
  return NextResponse.redirect(systemUrl.toString(), { status: 307 });
}