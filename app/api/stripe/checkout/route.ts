import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

// Only initialize Stripe if we have a secret key
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' }) : null;

// Define price lookup keys for different plans
const PRICE_LOOKUP_KEYS = {
  starter: {
    monthly: 'price_starter_monthly',
    annual: 'price_starter_annual'
  },
  professional: {
    monthly: 'price_professional_monthly',
    annual: 'price_professional_annual'
  },
  enterprise: {
    monthly: 'price_enterprise_monthly',
    annual: 'price_enterprise_annual'
  }
};

export async function POST(req: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json({ 
        error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY in your environment variables.',
        demo: true
      }, { status: 503 });
    }

    const { plan, billingCycle, email, customerId } = await req.json();
    
    if (!plan || !billingCycle || !email) {
      return NextResponse.json({ 
        error: 'Missing required fields: plan, billingCycle, email' 
      }, { status: 400 });
    }

    const lookupKey = PRICE_LOOKUP_KEYS[plan as keyof typeof PRICE_LOOKUP_KEYS]?.[billingCycle as 'monthly' | 'annual'];
    
    if (!lookupKey) {
      return NextResponse.json({ 
        error: 'Invalid plan or billing cycle' 
      }, { status: 400 });
    }

    // Get the price from Stripe using the lookup key
    const prices = await stripe.prices.list({
      lookup_keys: [lookupKey],
      expand: ['data.product']
    });

    if (!prices.data.length) {
      return NextResponse.json({ 
        error: `Price not found for lookup key: ${lookupKey}. Please create this price in your Stripe dashboard.`,
        lookupKey,
        plan,
        billingCycle
      }, { status: 404 });
    }

    const price = prices.data[0];

    // Create or get customer
    let customer;
    if (customerId) {
      customer = await stripe.customers.retrieve(customerId as string);
    } else {
      customer = await stripe.customers.create({
        email,
        metadata: {
          plan,
          billingCycle
        }
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price: price.id,
        quantity: 1,
      }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/cancel`,
      metadata: {
        plan,
        billingCycle,
        customerId: customer.id
      },
      subscription_data: {
        metadata: {
          plan,
          billingCycle,
          customerId: customer.id
        }
      }
    });

    return NextResponse.json({ 
      url: session.url,
      sessionId: session.id,
      customerId: customer.id
    });
  } catch (error) {
    console.error('Stripe Checkout error:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('No such price')) {
        return NextResponse.json({ 
          error: 'Price not found. Please create the required prices in your Stripe dashboard.',
          details: error.message
        }, { status: 404 });
      }
      if (error.message.includes('Invalid API key')) {
        return NextResponse.json({ 
          error: 'Invalid Stripe API key. Please check your STRIPE_SECRET_KEY environment variable.',
          details: error.message
        }, { status: 401 });
      }
    }
    
    return NextResponse.json({ 
      error: 'Failed to create checkout session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 