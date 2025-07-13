import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' }) : null;

export async function POST(req: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json({ 
        error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY in your environment variables.',
        demo: true
      }, { status: 503 });
    }

    const { customerId, sessionId } = await req.json();
    
    if (!customerId && !sessionId) {
      return NextResponse.json({ 
        error: 'Missing customerId or sessionId' 
      }, { status: 400 });
    }

    let customer;
    
    if (sessionId) {
      // Get customer from checkout session
      const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
      customer = checkoutSession.customer as string;
    } else {
      customer = customerId;
    }

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customer as string,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe Portal error:', error);
    return NextResponse.json({ 
      error: 'Failed to create billing portal session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 