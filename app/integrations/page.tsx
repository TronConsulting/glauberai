import React from 'react';

export default function IntegrationsPage() {
  return (
    <main className="container py-24">
      <h1 className="text-4xl font-bold mb-4">Integrations</h1>
      <p className="text-lg text-muted-foreground mb-8">GlauberAI integrates with leading AI providers and developer tools to maximize flexibility and performance.</p>
      <ul className="list-disc pl-6 space-y-2">
        <li>OpenAI</li>
        <li>Anthropic</li>
        <li>Google</li>
        <li>Cohere</li>
        <li>Mistral</li>
        <li>Stability AI</li>
        <li>Stripe</li>
        <li>Prisma/PostgreSQL</li>
      </ul>
    </main>
  );
} 