"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { formatDate, getStatusBadge } from '@/lib/stripe';

interface StripeSubscription {
  id: string;
  status: string;
  current_period_start?: number;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
  price?: {
    product?: string;
    lookup_key?: string;
    nickname?: string;
  };
}

export default function BillingPage() {
  const { user, loading } = useAuth();
  const [customer, setCustomer] = useState<any | null>(null);
  const [subscriptions, setSubscriptions] = useState<StripeSubscription[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [openingPortal, setOpeningPortal] = useState(false);

  const fetchBilling = async () => {
    if (!user) return;
    setLoadingData(true);

    try {
      const res = await fetch(`/api/stripe/customer?email=${encodeURIComponent(user.email)}`);
      const data = await res.json();
      if (res.ok) {
        setCustomer(data.customer || null);
        setSubscriptions(data.subscriptions || []);
      } else {
        setCustomer(null);
        setSubscriptions([]);
      }
    } catch (err) {
      setCustomer(null);
      setSubscriptions([]);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (!loading) fetchBilling();
  }, [user, loading]);

  const openPortal = async () => {
    if (!customer && subscriptions.length === 0 && !user) return;
    setOpeningPortal(true);
    try {
      const body: any = {};
      if (customer?.id) body.customerId = customer.id;
      // fallback to customer id from user if present
      if (!body.customerId && user?.stripeCustomerId) body.customerId = user.stripeCustomerId;

      const resp = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await resp.json();
      if (resp.ok && data.url) {
        window.location.href = data.url;
      } else {
        // open pricing as fallback
        window.location.href = '/pricing';
      }
    } catch (err) {
      window.location.href = '/pricing';
    } finally {
      setOpeningPortal(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Image src="/neural.png" alt="Logo" width={28} height={28} className="object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Billing & Subscription</h1>
              <p className="text-sm text-muted-foreground">Manage your plan, invoices and payment methods</p>
            </div>
          </div>
          <div>
            <Badge variant="secondary">{user?.plan || 'Unknown'}</Badge>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Current Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <div className="text-sm text-muted-foreground">Loading billing information...</div>
            ) : subscriptions.length === 0 ? (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">No active subscriptions found.</div>
                <div className="flex gap-2">
                  <Button onClick={() => (window.location.href = '/pricing')}>Upgrade plan</Button>
                  <Button variant="outline" onClick={fetchBilling}>Refresh</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {subscriptions.map((sub) => {
                  const badge = getStatusBadge(sub.status || 'unknown');
                  return (
                    <div key={sub.id} className="flex items-center justify-between border rounded-lg p-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="font-semibold">{sub.price?.nickname || sub.id}</div>
                          <div className={`text-xs px-2 py-1 rounded text-white ${badge.className}`}>{badge.label}</div>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Period: {sub.current_period_start ? formatDate(sub.current_period_start) : '—'} — {sub.current_period_end ? formatDate(sub.current_period_end) : '—'}
                        </div>
                        {sub.cancel_at_period_end && (
                          <div className="text-xs text-orange-600 mt-1">Subscription will cancel at period end</div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button onClick={openPortal} disabled={openingPortal}>{openingPortal ? 'Opening...' : 'Manage in Stripe'}</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Methods & Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">Manage cards, billing addresses and view invoice history in the Stripe billing portal.</div>
            <div className="mt-4 flex gap-2">
              <Button onClick={openPortal}>{openingPortal ? 'Opening...' : 'Open billing portal'}</Button>
              <Button variant="outline" onClick={fetchBilling}>Refresh</Button>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
