'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { toast } from 'sonner';
import { 
  CreditCard, 
  Calendar, 
  DollarSign, 
  CheckCircle, 
  XCircle,
  Clock,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface User {
  id: string;
  email: string;
  fullName?: string;
  plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  stripeCustomerId?: string;
}

interface Subscription {
  id: string;
  stripeSubscriptionId: string;
  plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  status: string;
  billingCycle: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface BillingRecord {
  id: string;
  plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  amount: number;
  status: string;
  period: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export default function BillingPage() {
  const { user, loading } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [billingHistory, setBillingHistory] = useState<BillingRecord[]>([]);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      // Fetch subscription data
      const subscriptionResponse = await fetch('/api/billing/subscription');
      if (subscriptionResponse.ok) {
        const subscriptionData = await subscriptionResponse.json();
        setSubscription(subscriptionData);
      }
      
      // Fetch billing history
      const historyResponse = await fetch('/api/billing/history');
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setBillingHistory(historyData);
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      toast.error('Failed to load subscription information');
    }
  };

  const openBillingPortal = async () => {
    if (!user?.stripeCustomerId) {
      toast.error('No billing information available');
      return;
    }

    setPortalLoading(true);
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: user.stripeCustomerId })
      });

      const data = await response.json();
      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Failed to open billing portal');
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
      toast.error('Failed to open billing portal');
    } finally {
      setPortalLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100); // Convert from cents
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'canceled':
        return <Badge variant="destructive">Canceled</Badge>;
      case 'past_due':
        return <Badge className="bg-yellow-500">Past Due</Badge>;
      case 'paid':
        return <Badge className="bg-green-500">Paid</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="py-24">
          <div className="container">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="py-24">
        <div className="container">
          <div className="space-y-8">
            {/* Header */}
            <div className="space-y-4">
              <h1 className="text-4xl font-bold">Billing & Subscription</h1>
              <p className="text-muted-foreground">
                Manage your subscription and view billing history
              </p>
            </div>

            {/* Current Plan */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Current Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg capitalize">{user?.plan?.toLowerCase()} Plan</h3>
                    <p className="text-muted-foreground">
                      {user?.plan === 'STARTER' ? 'Free tier' : user?.plan === 'PROFESSIONAL' ? 'Professional plan (paid)' : user?.plan === 'ENTERPRISE' ? 'Enterprise plan (paid)' : 'Paid subscription'}
                    </p>
                  </div>
                  {user?.plan !== 'STARTER' && (
                    <Button 
                      onClick={openBillingPortal}
                      disabled={portalLoading || !user?.stripeCustomerId}
                    >
                      {portalLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        'Manage Subscription'
                      )}
                    </Button>
                  )}
                </div>

                {subscription && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Status</p>
                      {getStatusBadge(subscription.status)}
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Billing Cycle</p>
                      <p className="font-medium capitalize">{subscription.billingCycle}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Next Billing</p>
                      <p className="font-medium">{formatDate(subscription.currentPeriodEnd)}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upgrade Plan for Free Users */}
            {user?.plan === 'STARTER' && (
              <Card>
                <CardHeader>
                  <CardTitle>Upgrade Your Plan</CardTitle>
                  <CardDescription>
                    Unlock more features and higher usage limits by upgrading your plan.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="default"
                    size="lg"
                    onClick={() => window.location.href = '/pricing'}
                  >
                    View Plans & Upgrade
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Billing History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Billing History
                </CardTitle>
                <CardDescription>
                  Your recent billing transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {billingHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No billing history available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {billingHistory.map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <p className="font-medium capitalize">{record.plan.toLowerCase()} Plan</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(record.startDate)} - {formatDate(record.endDate)}
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="font-medium">{formatCurrency(record.amount)}</p>
                          {getStatusBadge(record.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
} 