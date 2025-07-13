import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

export async function POST(req: NextRequest) {
  try {
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
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe Portal error:', error);
    return NextResponse.json({ 
      error: 'Failed to create billing portal session' 
    }, { status: 500 });
  }
} 