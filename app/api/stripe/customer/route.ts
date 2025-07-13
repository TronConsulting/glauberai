import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    const email = searchParams.get('email');

    if (!customerId && !email) {
      return NextResponse.json({ 
        error: 'Missing customerId or email' 
      }, { status: 400 });
    }

    let customer;
    let subscriptions;

    if (customerId) {
      customer = await stripe.customers.retrieve(customerId);
      subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
        expand: ['data.default_payment_method']
      });
    } else if (email) {
      const customers = await stripe.customers.list({
        email: email,
        limit: 1
      });
      
      if (customers.data.length === 0) {
        return NextResponse.json({ 
          error: 'Customer not found' 
        }, { status: 404 });
      }

      customer = customers.data[0];
      subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'all',
        expand: ['data.default_payment_method']
      });
    }

    return NextResponse.json({
      customer,
      subscriptions: subscriptions?.data || []
    });
  } catch (error) {
    console.error('Stripe Customer error:', error);
    return NextResponse.json({ 
      error: 'Failed to retrieve customer information' 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, name, metadata } = await req.json();
    
    if (!email) {
      return NextResponse.json({ 
        error: 'Email is required' 
      }, { status: 400 });
    }

    const customer = await stripe.customers.create({
      email,
      name,
      metadata
    });

    return NextResponse.json({ customer });
  } catch (error) {
    console.error('Stripe Customer creation error:', error);
    return NextResponse.json({ 
      error: 'Failed to create customer' 
    }, { status: 500 });
  }
} 