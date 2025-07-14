"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { 
  TrendingUp, 
  Zap, 
  Target, 
  Eye, 
  Image as ImageIcon, 
  Crown,
  AlertTriangle,
  CheckCircle,
  Info,
  Clock,
  RefreshCw
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';

interface QueryData {
  id: string;
  query: string;
  model: string;
  timestamp: string;
  contentType: string;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [usage, setUsage] = useState<any>(null);
  const [recentQueries, setRecentQueries] = useState<QueryData[]>([]);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  const fetchData = async () => {
    try {
      if (!user) {
        router.push('/auth/signin');
        return;
      }
      
      // Fetch usage data
      const usageRes = await fetch('/api/usage');
      if (usageRes.ok) {
        const { usage } = await usageRes.json();
        setUsage(usage);
      }

      // Fetch recent queries
      const queriesRes = await fetch('/api/queries');
      if (queriesRes.ok) {
        const { queries } = await queriesRes.json();
        setRecentQueries(queries);
      }
    } catch {
      router.push('/auth/signin');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [router]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
  };

  const getContentTypeIcon = (contentType: string) => {
    switch (contentType) {
      case 'image': return <ImageIcon className="h-4 w-4 text-pink-500" />;
      case 'code': return <Zap className="h-4 w-4 text-blue-500" />;
      case 'creative': return (
        <div className="h-4 w-4">
          <Image 
            src="/neural.png" 
            alt="Neural Logo" 
            width={16} 
            height={16} 
            className="object-contain"
          />
        </div>
      );
      case 'math': return <Target className="h-4 w-4 text-green-500" />;
      case 'analysis': return <Eye className="h-4 w-4 text-orange-500" />;
      default: return (
        <div className="h-4 w-4">
          <Image 
            src="/neural.png" 
            alt="Neural Logo" 
            width={16} 
            height={16} 
            className="object-contain"
          />
        </div>
      );
    }
  };

  const getModelUsageStats = () => {
    const modelStats = recentQueries.reduce((acc, query) => {
      if (!acc[query.model]) {
        acc[query.model] = { count: 0 };
      }
      acc[query.model].count++;
      return acc;
    }, {} as Record<string, { count: number }>);

    return Object.entries(modelStats).map(([model, stats]) => ({
      model,
      count: stats.count
    })).sort((a, b) => b.count - a.count);
  };

  const getContentTypeStats = () => {
    const contentTypeStats = recentQueries.reduce((acc, query) => {
      if (!acc[query.contentType]) {
        acc[query.contentType] = { count: 0 };
      }
      acc[query.contentType].count++;
      return acc;
    }, {} as Record<string, { count: number }>);

    return Object.entries(contentTypeStats).map(([type, stats]) => ({
      type,
      count: stats.count
    })).sort((a, b) => b.count - a.count);
  };

  const getUpgradeSuggestions = () => {
    const suggestions = [];
    
    if (usage?.usagePercentage > 80) {
      suggestions.push({
        type: 'usage',
        title: 'High Usage Alert',
        description: 'You\'re approaching your monthly limit. Consider upgrading for unlimited access.',
        priority: 'high'
      });
    }

    const imageQueries = recentQueries.filter(q => q.contentType === 'image').length;
    if (imageQueries > 0 && usage?.plan.name === 'Starter') {
      suggestions.push({
        type: 'feature',
        title: 'Image Generation Usage',
        description: 'You\'re using image generation. Upgrade to access higher quality models.',
        priority: 'medium'
      });
    }

    return suggestions;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  const modelStats = getModelUsageStats();
  const contentTypeStats = getContentTypeStats();
  const upgradeSuggestions = getUpgradeSuggestions();

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto py-10 px-4 space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Image 
                  src="/neural.png" 
                  alt="Neural Logo" 
                  width={32} 
                  height={32} 
                  className="object-contain"
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
                <p className="text-muted-foreground">Track your AI usage and model performance</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          
          {usage && (
            <div className="flex items-center gap-4 text-sm">
              <span>Current Plan: <Badge variant="outline">{usage.plan.name}</Badge></span>
              <span>Usage: {usage.currentUsage}/{usage.planLimit} requests</span>
              <Progress value={usage.usagePercentage} className="w-32" />
            </div>
          )}
        </div>

        {/* Upgrade Suggestions */}
        {upgradeSuggestions.length > 0 && (
          <div className="space-y-3">
            {upgradeSuggestions.map((suggestion, idx) => (
              <Alert key={idx} className={suggestion.priority === 'high' ? 'border-red-200 bg-red-50/50' : 'border-orange-200 bg-orange-50/50'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold">{suggestion.title}</span>
                    <span className="ml-2">{suggestion.description}</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowUpgradeDialog(true)}
                  >
                    Upgrade
                  </Button>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5">
                  <Image 
                    src="/neural.png" 
                    alt="Neural Logo" 
                    width={20} 
                    height={20} 
                    className="object-contain"
                  />
                </div>
                <span className="text-sm font-medium">Total Queries</span>
              </div>
              <div className="text-2xl font-bold mt-2">{recentQueries.length}</div>
              <div className="text-xs text-muted-foreground mt-1">This month</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium">Models Used</span>
              </div>
              <div className="text-2xl font-bold mt-2">{modelStats.length}</div>
              <div className="text-xs text-muted-foreground mt-1">Different AI models</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-500" />
                <span className="text-sm font-medium">Content Types</span>
              </div>
              <div className="text-2xl font-bold mt-2">{contentTypeStats.length}</div>
              <div className="text-xs text-muted-foreground mt-1">Different types of content</div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Tabs */}
        <Tabs defaultValue="recent" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="recent">Recent Queries</TabsTrigger>
            <TabsTrigger value="models">Model Usage</TabsTrigger>
            <TabsTrigger value="content">Content Types</TabsTrigger>
          </TabsList>

          <TabsContent value="recent" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Queries</CardTitle>
              </CardHeader>
              <CardContent>
                {recentQueries.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No queries found. Start using the query interface to see your analytics.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Query</TableHead>
                        <TableHead>Model Used</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentQueries.map((query) => (
                        <TableRow key={query.id}>
                          <TableCell className="max-w-xs">
                            <div className="truncate" title={query.query}>
                              {query.query}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{query.model}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getContentTypeIcon(query.contentType)}
                              <span className="capitalize">{query.contentType}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatTimestamp(query.timestamp)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="models" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Model Usage Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                {modelStats.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No model usage data available.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Model</TableHead>
                        <TableHead>Usage Count</TableHead>
                        <TableHead>Usage %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {modelStats.map((stat) => (
                        <TableRow key={stat.model}>
                          <TableCell className="font-medium">{stat.model}</TableCell>
                          <TableCell>{stat.count}</TableCell>
                          <TableCell>
                            <Progress value={(stat.count / recentQueries.length) * 100} className="w-16" />
                            <span className="text-xs ml-2">{((stat.count / recentQueries.length) * 100).toFixed(0)}%</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Content Type Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                {contentTypeStats.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No content type data available.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {contentTypeStats.map((stat) => (
                      <div key={stat.type} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getContentTypeIcon(stat.type)}
                          <div>
                            <div className="font-semibold capitalize">{stat.type}</div>
                            <div className="text-sm text-muted-foreground">{stat.count} queries</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{((stat.count / recentQueries.length) * 100).toFixed(0)}%</div>
                          <div className="text-xs text-muted-foreground">of total usage</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Upgrade Dialog */}
        <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                Upgrade Your Plan
              </DialogTitle>
              <DialogDescription>
                Based on your usage patterns, here are the best plans for you.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors cursor-pointer">
                  <CardHeader>
                    <CardTitle className="text-lg">Professional</CardTitle>
                    <div className="text-2xl font-bold">$39<span className="text-sm font-normal text-muted-foreground">/month</span></div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li>• 50,000 requests/month</li>
                      <li>• All AI models</li>
                      <li>• Advanced routing</li>
                      <li>• Priority support</li>
                    </ul>
                    <Button className="w-full mt-4">Upgrade to Professional</Button>
                  </CardContent>
                </Card>
                
                <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors cursor-pointer">
                  <CardHeader>
                    <CardTitle className="text-lg">Enterprise</CardTitle>
                    <div className="text-2xl font-bold">$299<span className="text-sm font-normal text-muted-foreground">/month</span></div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li>• Unlimited requests</li>
                      <li>• Custom AI models</li>
                      <li>• Dedicated support</li>
                      <li>• SLA guarantee</li>
                    </ul>
                    <Button className="w-full mt-4">Upgrade to Enterprise</Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
} 