# Stripe Payment Integration Setup Guide

This guide will help you set up Stripe payments for your GlauberAI application.

## Prerequisites

1. A Stripe account (sign up at [stripe.com](https://stripe.com))
2. Node.js and npm installed
3. Your GlauberAI application running

## Step 1: Get Your Stripe API Keys

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to **Developers** → **API keys**
3. Copy your **Publishable key** and **Secret key**
4. For testing, use the test keys (they start with `pk_test_` and `sk_test_`)

## Step 2: Set Up Environment Variables

1. Copy `env.example` to `.env.local`
2. Add your Stripe keys:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 3: Create Products and Prices in Stripe

You need to create products and prices in your Stripe dashboard that match the plans in your application.

### Option A: Use Stripe Dashboard

1. Go to **Products** in your Stripe Dashboard
2. Create three products:
   - **Starter Plan** (Free)
   - **Professional Plan** ($39/month, $390/year)
   - **Enterprise Plan** ($299/month, $2990/year)

3. For each paid product, create two prices:
   - Monthly recurring price
   - Annual recurring price

4. **Important**: Set the lookup keys exactly as follows:
   - `price_starter_monthly` (for Starter monthly - $0)
   - `price_starter_annual` (for Starter annual - $0)
   - `price_professional_monthly` (for Professional monthly - $39)
   - `price_professional_annual` (for Professional annual - $390)
   - `price_enterprise_monthly` (for Enterprise monthly - $299)
   - `price_enterprise_annual` (for Enterprise annual - $2990)

### Option B: Use Stripe CLI (Recommended)

Install the Stripe CLI and run these commands:

```bash
# Install Stripe CLI
# macOS: brew install stripe/stripe-cli/stripe
# Windows: Download from https://github.com/stripe/stripe-cli/releases

# Login to Stripe
stripe login

# Create products and prices
stripe products create --name="Starter Plan" --description="Perfect for trying out GlauberAI"

stripe products create --name="Professional Plan" --description="For growing businesses and teams"

stripe products create --name="Enterprise Plan" --description="For large organizations"

# Create prices (replace PRODUCT_ID with actual product IDs from above)
stripe prices create \
  --product=prod_xxxxx \
  --unit-amount=0 \
  --currency=usd \
  --recurring-interval=month \
  --lookup-key=price_starter_monthly

stripe prices create \
  --product=prod_xxxxx \
  --unit-amount=0 \
  --currency=usd \
  --recurring-interval=year \
  --lookup-key=price_starter_annual

stripe prices create \
  --product=prod_yyyyy \
  --unit-amount=3900 \
  --currency=usd \
  --recurring-interval=month \
  --lookup-key=price_professional_monthly

stripe prices create \
  --product=prod_yyyyy \
  --unit-amount=39000 \
  --currency=usd \
  --recurring-interval=year \
  --lookup-key=price_professional_annual

stripe prices create \
  --product=prod_zzzzz \
  --unit-amount=29900 \
  --currency=usd \
  --recurring-interval=month \
  --lookup-key=price_enterprise_monthly

stripe prices create \
  --product=prod_zzzzz \
  --unit-amount=299000 \
  --currency=usd \
  --recurring-interval=year \
  --lookup-key=price_enterprise_annual
```

## Step 4: Set Up Webhooks

Webhooks are essential for handling subscription events (payments, cancellations, etc.).

### Option A: Use Stripe CLI (Recommended for Development)

```bash
# Forward webhooks to your local development server
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Copy the webhook signing secret from the output
# It will look like: whsec_xxxxxxxxxxxxxxxxxxxxx
# Add this to your .env.local as STRIPE_WEBHOOK_SECRET
```

### Option B: Use Stripe Dashboard (For Production)

1. Go to **Developers** → **Webhooks** in your Stripe Dashboard
2. Click **Add endpoint**
3. Set the endpoint URL to: `https://yourdomain.com/api/stripe/webhook`
4. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.trial_will_end`
5. Copy the webhook signing secret and add it to your environment variables

## Step 5: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Visit your pricing page: `http://localhost:3000/pricing`

3. Try subscribing to a plan (use Stripe test card numbers):
   - **Success**: `4242 4242 4242 4242`
   - **Decline**: `4000 0000 0000 0002`
   - **Requires authentication**: `4000 0025 0000 3155`

4. Check that:
   - Checkout redirects to Stripe
   - Payment succeeds/fails as expected
   - You're redirected back to the billing page
   - Subscription status is updated

## Step 6: Database Integration (Optional)

To store subscription data in your database, you'll need to:

1. Create a `subscriptions` table in your database
2. Update the webhook handlers in `/api/stripe/webhook/route.ts`
3. Create database functions to update subscription status

Example Prisma schema:

```prisma
model Subscription {
  id                String   @id @default(cuid())
  stripeCustomerId  String   @unique
  stripePriceId     String
  stripeSubscriptionId String @unique
  status            String
  plan              String
  billingCycle      String
  currentPeriodEnd  DateTime
  cancelAtPeriodEnd Boolean  @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  user              User     @relation(fields: [userId], references: [id])
  userId            String
}

model User {
  id            String        @id @default(cuid())
  email         String        @unique
  name          String?
  stripeCustomerId String?    @unique
  subscriptions Subscription[]
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}
```

## Step 7: Production Deployment

1. **Update environment variables** with production Stripe keys
2. **Set up production webhooks** in Stripe Dashboard
3. **Update webhook endpoint URL** to your production domain
4. **Test with real cards** (small amounts) before going live
5. **Monitor webhook events** in Stripe Dashboard

## Troubleshooting

### Common Issues

1. **"Price not found" error**
   - Check that lookup keys match exactly
   - Verify prices are created in Stripe Dashboard

2. **Webhook signature verification failed**
   - Ensure `STRIPE_WEBHOOK_SECRET` is correct
   - Check that webhook endpoint URL is accessible

3. **Checkout session creation fails**
   - Verify `STRIPE_SECRET_KEY` is correct
   - Check that all required fields are provided

4. **Customer not found**
   - Ensure customer is created before creating subscription
   - Check that email is provided correctly

### Testing Tools

- **Stripe CLI**: `stripe logs tail` to see API requests
- **Stripe Dashboard**: Monitor events and payments
- **Test Cards**: Use Stripe's test card numbers for safe testing

## Security Best Practices

1. **Never expose secret keys** in client-side code
2. **Always verify webhook signatures**
3. **Use HTTPS** in production
4. **Implement proper error handling**
5. **Log payment events** for debugging
6. **Use Stripe's test mode** during development

## Support

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com)
- [Stripe Discord](https://discord.gg/stripe)

## Files Modified/Created

- `/api/stripe/checkout/route.ts` - Checkout session creation
- `/api/stripe/portal/route.ts` - Billing portal management
- `/api/stripe/webhook/route.ts` - Webhook event handling
- `/api/stripe/customer/route.ts` - Customer management
- `/app/dashboard/billing/page.tsx` - Billing dashboard
- `/app/pricing/page.tsx` - Updated pricing with Stripe integration
- `/lib/stripe.ts` - Stripe configuration and utilities
- `env.example` - Environment variables template 