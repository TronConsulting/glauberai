import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' }) : null;

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const plan = session.metadata?.plan;
  const billingCycle = session.metadata?.billingCycle;

  if (!userId || !plan || !billingCycle) {
    console.error('Missing metadata in checkout session');
    return;
  }

  // Update user plan
  await prisma.user.update({
    where: { id: userId },
    data: { 
      plan: plan.toUpperCase() as 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
    }
  });

  // Create billing record
  await prisma.billing.create({
    data: {
      userId,
      plan: plan.toUpperCase() as 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE',
      amount: session.amount_total || 0,
      status: 'paid',
      period: billingCycle,
      startDate: new Date(),
      endDate: new Date(Date.now() + (billingCycle === 'annual' ? 365 : 30) * 24 * 60 * 60 * 1000)
    }
  });
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  const plan = subscription.metadata?.plan;
  const billingCycle = subscription.metadata?.billingCycle;

  if (!userId || !plan || !billingCycle) {
    console.error('Missing metadata in subscription');
    return;
  }

  // Create subscription record
  await prisma.subscription.create({
    data: {
      userId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0]?.price.id || '',
      stripeCustomerId: subscription.customer as string,
      status: subscription.status,
      plan: plan.toUpperCase() as 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE',
      billingCycle,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    }
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error('Missing userId in subscription metadata');
    return;
  }

  // Update subscription record
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      updatedAt: new Date()
    }
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error('Missing userId in subscription metadata');
    return;
  }

  // Update subscription status
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: 'canceled',
      updatedAt: new Date()
    }
  });

  // Reset user plan to starter
  await prisma.user.update({
    where: { id: userId },
    data: { plan: 'STARTER' }
  });
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  
  if (!subscriptionId) return;

  const subscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId }
  });

  if (!subscription) return;

  // Create billing record
  await prisma.billing.create({
    data: {
      userId: subscription.userId,
      plan: subscription.plan,
      amount: invoice.amount_paid,
      status: 'paid',
      period: subscription.billingCycle,
      startDate: subscription.currentPeriodStart,
      endDate: subscription.currentPeriodEnd
    }
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  
  if (!subscriptionId) return;

  const subscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId }
  });

  if (!subscription) return;

  // Create failed billing record
  await prisma.billing.create({
    data: {
      userId: subscription.userId,
      plan: subscription.plan,
      amount: invoice.amount_due,
      status: 'failed',
      period: subscription.billingCycle,
      startDate: subscription.currentPeriodStart,
      endDate: subscription.currentPeriodEnd
    }
  });
} 