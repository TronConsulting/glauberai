import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

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
        error: 'Price not found for the selected plan' 
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
    return NextResponse.json({ 
      error: 'Failed to create checkout session' 
    }, { status: 500 });
  }
} 