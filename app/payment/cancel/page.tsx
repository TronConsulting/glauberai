'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  XCircle, 
  ArrowLeft, 
  CreditCard,
  RefreshCw
} from 'lucide-react';

export default function PaymentCancelPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-24">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          {/* Cancel Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
          </div>

          {/* Cancel Message */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold">Payment Canceled</h1>
            <p className="text-xl text-muted-foreground">
              No worries! You can try again anytime. Your card hasn't been charged.
            </p>
          </div>

          {/* Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>What Happened?</CardTitle>
              <CardDescription>
                Your payment process was interrupted or canceled
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-left">
              <div className="flex items-start space-x-3">
                <CreditCard className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <h4 className="font-medium">No Charges Made</h4>
                  <p className="text-sm text-muted-foreground">
                    Your payment method hasn't been charged. You can try again whenever you're ready.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <RefreshCw className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <h4 className="font-medium">Try Again</h4>
                  <p className="text-sm text-muted-foreground">
                    You can restart the payment process at any time from the pricing page.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Common Reasons */}
          <Card>
            <CardHeader>
              <CardTitle>Common Reasons for Cancellation</CardTitle>
            </CardHeader>
            <CardContent className="text-left space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-muted-foreground rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-muted-foreground">
                  Changed your mind about the plan or pricing
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-muted-foreground rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-muted-foreground">
                  Wanted to review the terms before committing
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-muted-foreground rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-muted-foreground">
                  Technical issues or browser problems
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-muted-foreground rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-muted-foreground">
                  Needed to check with your team or budget
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/pricing">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Pricing
              </Link>
            </Button>
            <Button variant="outline" asChild size="lg">
              <Link href="/dashboard">
                Go to Dashboard
              </Link>
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