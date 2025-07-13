#!/usr/bin/env node

/**
 * Stripe Setup Script
 * 
 * This script helps you create the required products and prices in Stripe
 * with the correct lookup keys for the GlauberAI application.
 * 
 * Usage:
 * 1. Make sure you have the Stripe CLI installed and logged in
 * 2. Run: node scripts/setup-stripe.js
 * 3. Follow the prompts to create products and prices
 */

const { execSync } = require('child_process');

console.log('🚀 GlauberAI Stripe Setup Script');
console.log('================================\n');

// Check if Stripe CLI is installed
try {
  execSync('stripe --version', { stdio: 'pipe' });
} catch (error) {
  console.error('❌ Stripe CLI is not installed or not in PATH');
  console.log('Please install it first: https://stripe.com/docs/stripe-cli');
  process.exit(1);
}

// Check if user is logged in
try {
  execSync('stripe config --list', { stdio: 'pipe' });
} catch (error) {
  console.error('❌ You are not logged in to Stripe CLI');
  console.log('Please run: stripe login');
  process.exit(1);
}

console.log('✅ Stripe CLI is ready\n');

const products = [
  {
    name: 'Starter Plan',
    description: 'Perfect for trying out GlauberAI',
    prices: [
      { amount: 0, interval: 'month', lookupKey: 'price_starter_monthly' },
      { amount: 0, interval: 'year', lookupKey: 'price_starter_annual' }
    ]
  },
  {
    name: 'Professional Plan',
    description: 'For growing businesses and teams',
    prices: [
      { amount: 3900, interval: 'month', lookupKey: 'price_professional_monthly' }, // $39.00
      { amount: 39000, interval: 'year', lookupKey: 'price_professional_annual' }   // $390.00
    ]
  },
  {
    name: 'Enterprise Plan',
    description: 'For large organizations',
    prices: [
      { amount: 29900, interval: 'month', lookupKey: 'price_enterprise_monthly' }, // $299.00
      { amount: 299000, interval: 'year', lookupKey: 'price_enterprise_annual' }   // $2990.00
    ]
  }
];

async function createProducts() {
  console.log('📦 Creating products and prices...\n');
  
  for (const product of products) {
    console.log(`Creating product: ${product.name}`);
    
    try {
      // Create product
      const productOutput = execSync(
        `stripe products create --name="${product.name}" --description="${product.description}"`,
        { encoding: 'utf8' }
      );
      
      // Extract product ID from output
      const productMatch = productOutput.match(/prod_[a-zA-Z0-9]+/);
      if (!productMatch) {
        console.error(`❌ Failed to create product: ${product.name}`);
        continue;
      }
      
      const productId = productMatch[0];
      console.log(`✅ Product created: ${productId}`);
      
      // Create prices for this product
      for (const price of product.prices) {
        try {
          const priceOutput = execSync(
            `stripe prices create --product=${productId} --unit-amount=${price.amount} --currency=usd --recurring-interval=${price.interval} --lookup-key=${price.lookupKey}`,
            { encoding: 'utf8' }
          );
          
          const priceMatch = priceOutput.match(/price_[a-zA-Z0-9]+/);
          if (priceMatch) {
            console.log(`  ✅ Price created: ${priceMatch[0]} (${price.lookupKey})`);
          } else {
            console.log(`  ⚠️  Price may have been created but ID not found: ${price.lookupKey}`);
          }
        } catch (error) {
          console.log(`  ⚠️  Price may already exist: ${price.lookupKey}`);
        }
      }
      
      console.log('');
    } catch (error) {
      console.error(`❌ Error creating product ${product.name}:`, error.message);
    }
  }
}

async function verifySetup() {
  console.log('🔍 Verifying setup...\n');
  
  const requiredLookupKeys = [
    'price_starter_monthly',
    'price_starter_annual',
    'price_professional_monthly',
    'price_professional_annual',
    'price_enterprise_monthly',
    'price_enterprise_annual'
  ];
  
  for (const lookupKey of requiredLookupKeys) {
    try {
      const output = execSync(
        `stripe prices list --lookup-keys=${lookupKey}`,
        { encoding: 'utf8' }
      );
      
      if (output.includes(lookupKey)) {
        console.log(`✅ ${lookupKey} - Found`);
      } else {
        console.log(`❌ ${lookupKey} - Missing`);
      }
    } catch (error) {
      console.log(`❌ ${lookupKey} - Error checking`);
    }
  }
}

async function main() {
  try {
    await createProducts();
    await verifySetup();
    
    console.log('\n🎉 Setup complete!');
    console.log('\nNext steps:');
    console.log('1. Make sure your environment variables are set:');
    console.log('   - STRIPE_SECRET_KEY');
    console.log('   - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
    console.log('   - STRIPE_WEBHOOK_SECRET (optional for development)');
    console.log('2. Test the checkout flow in your application');
    console.log('3. Set up webhooks for production');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

main(); 