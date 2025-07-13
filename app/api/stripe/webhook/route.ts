import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
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
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      
      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Subscription created:', subscription.id);
  // TODO: Update user's subscription status in your database
  // await updateUserSubscription(subscription.customer as string, {
  //   status: subscription.status,
  //   plan: subscription.metadata.plan,
  //   billingCycle: subscription.metadata.billingCycle,
  //   currentPeriodEnd: new Date(subscription.current_period_end * 1000)
  // });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id);
  // TODO: Update user's subscription status in your database
  // await updateUserSubscription(subscription.customer as string, {
  //   status: subscription.status,
  //   plan: subscription.metadata.plan,
  //   billingCycle: subscription.metadata.billingCycle,
  //   currentPeriodEnd: new Date(subscription.current_period_end * 1000)
  // });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id);
  // TODO: Update user's subscription status in your database
  // await updateUserSubscription(subscription.customer as string, {
  //   status: 'canceled',
  //   plan: null,
  //   billingCycle: null,
  //   currentPeriodEnd: null
  // });
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Payment succeeded:', invoice.id);
  // TODO: Handle successful payment
  // - Update user's payment status
  // - Send confirmation email
  // - Update usage limits
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Payment failed:', invoice.id);
  // TODO: Handle failed payment
  // - Send payment failure notification
  // - Update user's payment status
  // - Consider downgrading subscription
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  console.log('Trial will end:', subscription.id);
  // TODO: Send trial ending notification
  // - Send email to user about trial ending
  // - Offer discount or upgrade options
} 