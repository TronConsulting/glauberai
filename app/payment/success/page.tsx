'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  ArrowRight, 
  CreditCard,
  Calendar,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const { refreshUser } = useAuth();

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    if (sessionId) {
      // In a real app, you'd fetch subscription details from your API
      // For now, we'll simulate a successful subscription
      setTimeout(() => {
        setSubscription({
          plan: 'Professional',
          billingCycle: 'monthly',
          status: 'active',
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
        });
        setLoading(false);
      }, 1000);
    } else {
      setLoading(false);
    }

    toast.success('Payment successful! Your subscription is now active.');
  }, [searchParams]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your subscription details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-24">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
          </div>

          {/* Success Message */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold">Payment Successful!</h1>
            <p className="text-xl text-muted-foreground">
              Thank you for subscribing to GlauberAI. Your subscription is now active.
            </p>
          </div>

          {/* Subscription Details */}
          {subscription && (
            <Card className="text-left">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Subscription Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Plan</span>
                  <Badge variant="secondary">{subscription.plan}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Billing Cycle</span>
                  <span className="text-muted-foreground capitalize">{subscription.billingCycle}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Status</span>
                  <Badge className="bg-green-500">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Next Billing Date</span>
                  <span className="text-muted-foreground">{subscription.nextBillingDate}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle>What's Next?</CardTitle>
              <CardDescription>
                Here's what you can do now that your subscription is active
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <Zap className="w-5 h-5 text-primary mt-0.5" />
                <div className="text-left">
                  <h4 className="font-medium">Start Using GlauberAI</h4>
                  <p className="text-sm text-muted-foreground">
                    Access your dashboard and start making AI-powered requests
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Calendar className="w-5 h-5 text-primary mt-0.5" />
                <div className="text-left">
                  <h4 className="font-medium">Manage Your Subscription</h4>
                  <p className="text-sm text-muted-foreground">
                    View billing history, update payment methods, and manage your plan
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/dashboard">
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" onClick={() => window.location.href = '/dashboard?tab=billing'}>
              Manage Billing
            </Button>
          </div>

          {/* Support */}
          <div className="text-sm text-muted-foreground">
            Need help? Contact our support team at{' '}
            <a href="mailto:support@glauberai.com" className="text-primary hover:underline">
              support@glauberai.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading payment details...</p>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PaymentSuccessContent />
    </Suspense>
  );
} 