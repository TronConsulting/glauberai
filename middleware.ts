import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from './lib/auth';

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('glauberai_token')?.value;
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  const { pathname } = req.nextUrl;
  let jwtValid = false;

  if (token && secret) {
    const decoded = await verifyJwt(token);
    jwtValid = !!decoded;
  }

  if (pathname.startsWith('/dashboard')) {
    if (!jwtValid) {
      const url = req.nextUrl.clone();
      url.pathname = '/auth/signin';
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
}; 
