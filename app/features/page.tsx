import React from 'react';

export default function FeaturesPage() {
  return (
    <main className="container py-24">
      <h1 className="text-4xl font-bold mb-4">Features</h1>
      <p className="text-lg text-muted-foreground mb-8">Explore the key features of GlauberAI that make it a powerful AI model routing platform.</p>
      <ul className="list-disc pl-6 space-y-2">
        <li>Intelligent AI model routing</li>
        <li>File upload and storage</li>
        <li>Multi-provider AI integration</li>
        <li>Real-time analytics</li>
        <li>Stripe-powered subscription management</li>
        <li>Usage limits and tiered pricing</li>
        <li>Secure authentication</li>
        <li>API access</li>
      </ul>
    </main>
  );
} 