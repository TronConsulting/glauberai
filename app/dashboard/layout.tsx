import React from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export const metadata = {
  title: 'Dashboard - GlauberAI',
};

export default function DashboardRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
}
