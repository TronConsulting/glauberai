# Stripe Setup Guide for GlauberAI

This guide will help you set up Stripe payments for your GlauberAI application.

## Prerequisites

1. A Stripe account (sign up at https://stripe.com)
2. Stripe CLI installed (optional, for automated setup)

## Environment Variables

Add these to your `.env.local` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Price Lookup Keys (will be created below)
STRIPE_STARTER_MONTHLY_PRICE=price_starter_monthly
STRIPE_STARTER_ANNUAL_PRICE=price_starter_annual
STRIPE_PROFESSIONAL_MONTHLY_PRICE=price_professional_monthly
STRIPE_PROFESSIONAL_ANNUAL_PRICE=price_professional_annual
STRIPE_ENTERPRISE_MONTHLY_PRICE=price_enterprise_monthly
STRIPE_ENTERPRISE_ANNUAL_PRICE=price_enterprise_annual
```

## Setup Methods

### Method 1: Automated Setup (Recommended)

1. Install Stripe CLI:
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Windows
   # Download from https://github.com/stripe/stripe-cli/releases
   
   # Linux
   # Download from https://github.com/stripe/stripe-cli/releases
   ```

2. Login to Stripe:
   ```bash
   stripe login
   ```

3. Run the setup script:
   ```bash
   node scripts/fix-stripe-prices.js
   ```

### Method 2: Manual Setup

If the automated script doesn't work, follow these manual steps:

#### Step 1: Create Products

1. Go to [Stripe Dashboard > Products](https://dashboard.stripe.com/products)
2. Click "Add product" and create these products:

**Starter Plan**
- Name: `Starter Plan`
- Description: `Perfect for trying out GlauberAI`
- Pricing: `$0/month`

**Professional Plan**
- Name: `Professional Plan`
- Description: `For growing businesses and teams`
- Pricing: `$39/month`

**Enterprise Plan**
- Name: `Enterprise Plan`
- Description: `For large organizations`
- Pricing: `$299/month`

#### Step 2: Create Prices with Lookup Keys

For each product, create prices with these exact lookup keys:

**Starter Plan Prices:**
- Monthly: `price_starter_monthly` ($0/month)
- Annual: `price_starter_annual` ($0/year)

**Professional Plan Prices:**
- Monthly: `price_professional_monthly` ($39/month)
- Annual: `price_professional_annual` ($390/year)

**Enterprise Plan Prices:**
- Monthly: `price_enterprise_monthly` ($299/month)
- Annual: `price_enterprise_annual` ($2,990/year)

#### Step 3: Set Lookup Keys

For each price you created:

1. Click on the price in the Stripe dashboard
2. Scroll down to "Additional options"
3. In the "Lookup key" field, enter the exact lookup key (e.g., `price_starter_monthly`)
4. Click "Save"

#### Step 4: Get API Keys

1. Go to [Stripe Dashboard > Developers > API keys](https://dashboard.stripe.com/apikeys)
2. Copy your publishable key and secret key
3. Add them to your `.env.local` file

#### Step 5: Set Up Webhooks

1. Go to [Stripe Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Set the endpoint URL to: `https://yourdomain.com/api/stripe/webhook`
4. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the webhook secret and add it to your `.env.local` file

## Testing

### Test the Checkout Flow

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Go to the pricing page and click "Get Started" on any plan
3. You should be redirected to Stripe Checkout
4. Use Stripe's test card numbers:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`

### Test Webhooks (Local Development)

1. Start the Stripe CLI webhook listener:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

2. Copy the webhook secret from the CLI output and update your `.env.local`

## Troubleshooting

### Common Issues

**"Price not found" Error**
- Make sure the lookup keys are exactly as specified
- Check that the prices are active in Stripe dashboard
- Verify the environment variables are set correctly

**Webhook Errors**
- Ensure the webhook endpoint URL is correct
- Check that the webhook secret matches
- Verify the selected events are correct

**Checkout Not Working**
- Check browser console for JavaScript errors
- Verify Stripe publishable key is correct
- Ensure the price lookup keys exist in Stripe

### Getting Help

1. Check the [Stripe Documentation](https://stripe.com/docs)
2. Review the [Stripe API Reference](https://stripe.com/docs/api)
3. Check the application logs for detailed error messages

## Production Deployment

When deploying to production:

1. Switch to live mode in Stripe dashboard
2. Update environment variables with live keys
3. Update webhook endpoint URL to your production domain
4. Test the complete payment flow with real cards

## Security Notes

- Never commit your Stripe secret keys to version control
- Use environment variables for all sensitive configuration
- Enable webhook signature verification in production
- Regularly rotate your API keys
- Monitor your Stripe dashboard for suspicious activity

## Files Modified/Created

- `/api/stripe/checkout/route.ts` - Checkout session creation
- `/api/stripe/portal/route.ts` - Billing portal management
- `/api/stripe/webhook/route.ts` - Webhook event handling
- `/api/stripe/customer/route.ts` - Customer management
- `/app/dashboard/billing/page.tsx` - Billing dashboard
- `/app/pricing/page.tsx` - Updated pricing with Stripe integration
- `/lib/stripe.ts` - Stripe configuration and utilities
- `env.example` - Environment variables template 