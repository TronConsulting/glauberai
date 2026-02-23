'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, TrendingUp, Zap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface UsageMeterProps {
  currentUsage: number;
  limit: number;
  planName: string;
  showUpgradePrompt?: boolean;
  compact?: boolean;
}

export function UsageMeter({
  currentUsage,
  limit,
  planName,
  showUpgradePrompt = true,
  compact = false
}: UsageMeterProps) {
  const percentage = Math.min((currentUsage / limit) * 100, 100);
  const remaining = Math.max(limit - currentUsage, 0);
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            <span className="text-muted-foreground">
              {currentUsage.toLocaleString()} / {limit.toLocaleString()} requests
            </span>
            <span className={`font-medium ${isAtLimit ? 'text-destructive' : isNearLimit ? 'text-yellow-500' : 'text-primary'}`}>
              {percentage.toFixed(0)}%
            </span>
          </div>
          <Progress
            value={percentage}
            className={cn(
              'h-2',
              isAtLimit && '[&>div]:bg-destructive',
              isNearLimit && '[&>div]:bg-yellow-500'
            )}
          />
        </div>
      </div>
    );
  }

  return (
    <Card className="glass">
      <CardContent className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Usage This Month</h3>
          </div>
          <div className="text-sm text-muted-foreground">{planName} Plan</div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <div>
              <span className="text-2xl font-bold">{currentUsage.toLocaleString()}</span>
              <span className="text-muted-foreground text-sm ml-1">
                / {limit.toLocaleString()} requests
              </span>
            </div>
            <div className={`text-lg font-semibold ${
              isAtLimit ? 'text-destructive' : isNearLimit ? 'text-yellow-500' : 'text-primary'
            }`}>
              {percentage.toFixed(0)}%
            </div>
          </div>
          <Progress
            value={percentage}
            className={cn(
              'h-3',
              isAtLimit && '[&>div]:bg-destructive',
              isNearLimit && '[&>div]:bg-yellow-500'
            )}
          />
          <div className="mt-1 text-sm text-muted-foreground">
            {remaining.toLocaleString()} requests remaining
          </div>
        </div>

        {/* Alerts */}
        {isAtLimit && showUpgradePrompt && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>You've reached your monthly limit</span>
              <Link href="/pricing">
                <Button size="sm" variant="outline">
                  Upgrade Plan
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {!isAtLimit && isNearLimit && showUpgradePrompt && (
          <Alert>
            <TrendingUp className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>You're approaching your limit</span>
              <Link href="/pricing">
                <Button size="sm" variant="outline">
                  View Plans
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Model Tier Info */}
        <div className="pt-2 border-t text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Available Models:</span>
            <span className="font-medium text-foreground">
              {planName === 'Starter' ? 'Free tier only' :
               planName === 'Professional' ? 'Free + Basic tier' :
               'All 60+ models'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
