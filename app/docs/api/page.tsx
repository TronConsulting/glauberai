import React from 'react';

export default function APIReferencePage() {
  return (
    <main className="container py-24">
      <h1 className="text-4xl font-bold mb-4">API Reference</h1>
      <p className="text-lg text-muted-foreground mb-8">Explore GlauberAI's API endpoints and integration guides.</p>
      <ul className="list-disc pl-6 space-y-2">
        <li>Authentication: <code>/api/auth/*</code></li>
        <li>AI Query: <code>/api/query</code></li>
        <li>Usage: <code>/api/usage</code></li>
        <li>Billing: <code>/api/billing/*</code></li>
        <li>Files: <code>/api/files/*</code></li>
      </ul>
      <p className="mt-8">See the <a href="/docs" className="underline text-primary">full documentation</a> for more details.</p>
    </main>
  );
} 