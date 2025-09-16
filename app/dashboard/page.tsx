'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = searchParams?.get('tab');

    // If a tab param exists, route to the matching dashboard subpage if it's a separate route
    if (tab === 'query') {
      router.push('/dashboard/query');
      return;
    }
    if (tab === 'analytics') {
      router.push('/dashboard/analytics');
      return;
    }
    if (tab === 'api') {
      router.push('/dashboard/api');
      return;
    }
    if (tab === 'billing') {
      router.push('/dashboard/billing');
      return;
    }

    // Default
    router.push('/dashboard/query');
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}