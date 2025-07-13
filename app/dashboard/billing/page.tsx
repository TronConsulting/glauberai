'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Calendar, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface Subscription {
  id: string;
  status: string;
  current_period_end: number;
  cancel_at_period_end: boolean;
  metadata: {
    plan: string;
    billingCycle: string;
  };
}

interface Customer {
  id: string;
  email: string;
  name?: string;
}

export default function BillingPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    // Check for success/cancel parameters
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    const sessionId = searchParams.get('session_id');

    if (success === '1') {
      toast.success('Payment successful! Your subscription is now active.');
    } else if (canceled === '1') {
      toast.error('Payment was canceled.');
    }

    // Load customer data (in a real app, this would come from your auth system)
    loadCustomerData();
  }, [searchParams]);

  const loadCustomerData = async () => {
    try {
      // In a real app, you'd get the user's email from your auth context
      const userEmail = 'demo@example.com'; // Replace with actual user email
      
      const response = await fetch(`/api/stripe/customer?email=${userEmail}`);
      const data = await response.json();

      if (response.ok) {
        setCustomer(data.customer);
        setSubscriptions(data.subscriptions);
        
        // Find active subscription
        const active = data.subscriptions.find((sub: Subscription) => 
          ['active', 'trialing'].includes(sub.status)
        );
        setActiveSubscription(active || null);
      } else {
        console.error('Failed to load customer data:', data.error);
      }
    } catch (error) {
      console.error('Error loading customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      if (!customer) {
        toast.error('Customer information not found');
        return;
      }

      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: customer.id })
      });

      const data = await response.json();

      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        toast.error('Failed to open billing portal');
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
      toast.error('Failed to open billing portal');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-500">Trial</Badge>;
      case 'canceled':
        return <Badge variant="destructive">Canceled</Badge>;
      case 'past_due':
        return <Badge variant="destructive">Past Due</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPlanDisplayName = (plan: string) => {
    switch (plan) {
      case 'starter':
        return 'Starter';
      case 'professional':
        return 'Professional';
      case 'enterprise':
        return 'Enterprise';
      default:
        return plan;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-24">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading billing information...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-24">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Billing & Subscription</h1>
            <p className="text-xl text-muted-foreground">
              Manage your subscription and billing information
            </p>
          </div>

          {/* Current Subscription */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>Current Subscription</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeSubscription ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {getPlanDisplayName(activeSubscription.metadata.plan)} Plan
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {activeSubscription.metadata.billingCycle === 'annual' ? 'Annual' : 'Monthly'} billing
                      </p>
                    </div>
                    {getStatusBadge(activeSubscription.status)}
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Next billing date</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(activeSubscription.current_period_end)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Billing cycle</p>
                        <p className="text-sm text-muted-foreground">
                          {activeSubscription.metadata.billingCycle === 'annual' ? 'Annual' : 'Monthly'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {activeSubscription.cancel_at_period_end && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <p className="text-sm text-yellow-800">
                          Your subscription will be canceled at the end of the current billing period.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No active subscription</h3>
                  <p className="text-muted-foreground mb-4">
                    You don't have an active subscription. Choose a plan to get started.
                  </p>
                  <Button asChild>
                    <a href="/pricing">View Plans</a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Billing Actions */}
          {activeSubscription && (
            <Card>
              <CardHeader>
                <CardTitle>Billing Management</CardTitle>
                <CardDescription>
                  Manage your payment methods, view invoices, and update your subscription
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleManageBilling} className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Manage Billing
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Subscription History */}
          {subscriptions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Subscription History</CardTitle>
                <CardDescription>
                  Your past and current subscriptions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {subscriptions.map((subscription) => (
                    <div key={subscription.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">
                          {getPlanDisplayName(subscription.metadata.plan)} Plan
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {subscription.metadata.billingCycle === 'annual' ? 'Annual' : 'Monthly'} • 
                          Ends {formatDate(subscription.current_period_end)}
                        </p>
                      </div>
                      {getStatusBadge(subscription.status)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Customer Information */}
          {customer && (
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{customer.email}</p>
                  </div>
                  {customer.name && (
                    <div>
                      <p className="text-sm font-medium">Name</p>
                      <p className="text-sm text-muted-foreground">{customer.name}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">Customer ID</p>
                    <p className="text-sm text-muted-foreground font-mono">{customer.id}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 