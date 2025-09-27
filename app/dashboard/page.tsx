'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  MessageSquare, 
  BarChart3, 
  CreditCard, 
  Settings, 
  Sparkles,
  Image as ImageIcon,
  Code,
  Globe,
  Users,
  Zap,
  ArrowRight,
  Star,
  Palette,
  Camera
} from 'lucide-react';
import { COMPREHENSIVE_MODELS } from '@/lib/ai-routing';
import { useAuth } from '@/hooks/use-auth';

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalModels: 0,
    textModels: 0,
    imageModels: 0,
    visionModels: 0,
    codeModels: 0,
    openSourceModels: 0
  });

  useEffect(() => {
    // Calculate model statistics
    const totalModels = COMPREHENSIVE_MODELS.length;
    const textModels = COMPREHENSIVE_MODELS.filter(m => !m.supportsImages && !m.supportsVision).length;
    const imageModels = COMPREHENSIVE_MODELS.filter(m => m.supportsImages).length;
    const visionModels = COMPREHENSIVE_MODELS.filter(m => m.supportsVision).length;
    const codeModels = COMPREHENSIVE_MODELS.filter(m => m.supportsCode).length;
    const openSourceModels = COMPREHENSIVE_MODELS.filter(m => m.isOpenSource).length;

    setStats({
      totalModels,
      textModels,
      imageModels,
      visionModels,
      codeModels,
      openSourceModels
    });
  }, []);

  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab && tab !== 'overview') {
      if (tab === 'query') router.push('/dashboard/query');
      else if (tab === 'analytics') router.push('/dashboard/analytics');
      else if (tab === 'api') router.push('/dashboard/api');
      else if (tab === 'billing') router.push('/dashboard/billing');
      else if (tab === 'models') router.push('/dashboard/models');
      else if (tab === 'settings') router.push('/dashboard/settings');
    }
  }, [router, searchParams]);

  const quickActions = [
    {
      title: 'Start New Query',
      description: 'Ask questions, generate content, or analyze files',
      icon: MessageSquare,
      href: '/dashboard/query',
      color: 'bg-blue-500'
    },
    {
      title: 'Browse AI Models',
      description: `Explore ${stats.totalModels}+ AI models across all providers`,
      icon: Brain,
      href: '/dashboard/models',
      color: 'bg-purple-500',
      badge: `${stats.totalModels} models`
    },
    {
      title: 'Generate Images',
      description: 'Create art with DALL-E 3, Midjourney, Stable Diffusion',
      icon: Palette,
      href: '/dashboard/query?mode=image',
      color: 'bg-pink-500',
      badge: `${stats.imageModels} models`
    },
    {
      title: 'Code Assistant',
      description: 'Programming help with specialized code models',
      icon: Code,
      href: '/dashboard/query?mode=code',
      color: 'bg-green-500',
      badge: `${stats.codeModels} models`
    }
  ];

  const modelCategories = [
    {
      title: 'Text Generation',
      count: stats.textModels,
      icon: MessageSquare,
      examples: 'GPT-4, Claude 3, Gemini Pro',
      color: 'text-blue-600 bg-blue-50'
    },
    {
      title: 'Image Generation',
      count: stats.imageModels,
      icon: ImageIcon,
      examples: 'DALL-E 3, Midjourney, Stable Diffusion',
      color: 'text-pink-600 bg-pink-50'
    },
    {
      title: 'Vision Analysis',
      count: stats.visionModels,
      icon: Camera,
      examples: 'GPT-4o Vision, Gemini Pro Vision',
      color: 'text-purple-600 bg-purple-50'
    },
    {
      title: 'Code Generation',
      count: stats.codeModels,
      icon: Code,
      examples: 'GPT-4 Turbo, Claude 3 Opus',
      color: 'text-green-600 bg-green-50'
    }
  ];

  const providers = [
    { name: 'OpenAI', models: 4, color: 'bg-green-100 text-green-800' },
    { name: 'Anthropic', models: 3, color: 'bg-orange-100 text-orange-800' },
    { name: 'Together AI', models: 2, color: 'bg-purple-100 text-purple-800' },
    { name: 'Groq', models: 2, color: 'bg-blue-100 text-blue-800' },
    { name: 'OpenRouter', models: 1, color: 'bg-indigo-100 text-indigo-800' },
    { name: 'HuggingFace', models: 'Unlimited', color: 'bg-yellow-100 text-yellow-800' },
    { name: 'Replicate', models: 1, color: 'bg-pink-100 text-pink-800' },
    { name: 'Others', models: stats.totalModels - 13, color: 'bg-gray-100 text-gray-800' }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.fullName || 'User'}! Access {stats.totalModels}+ AI models including open source options via Together AI, Groq, OpenRouter, HuggingFace & Replicate.
          </p>
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          {user?.plan || 'STARTER'} Plan
        </Badge>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(action.href)}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${action.color}`}>
                  <action.icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{action.title}</h3>
                    {action.badge && <Badge variant="outline" className="text-xs">{action.badge}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Model Categories Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Model Ecosystem
            <Badge variant="secondary">{stats.totalModels} Total Models</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {modelCategories.map((category, index) => (
              <div key={index} className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg ${category.color}`}>
                    <category.icon className="h-4 w-4" />
                  </div>
                  <Badge variant="outline">{category.count}</Badge>
                </div>
                <h4 className="font-semibold text-sm">{category.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">{category.examples}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Provider Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              AI Providers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {providers.map((provider, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="font-medium">{provider.name}</span>
                  <Badge className={provider.color}>{provider.models} models</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Featured Capabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-pink-500" />
                  <span>Image Generation</span>
                </div>
                <span className="text-sm text-muted-foreground">DALL-E 3, Midjourney, Stable Diffusion</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-purple-500" />
                  <span>Vision Analysis</span>
                </div>
                <span className="text-sm text-muted-foreground">GPT-4o Vision, Gemini Pro Vision</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-green-500" />
                  <span>Code Generation</span>
                </div>
                <span className="text-sm text-muted-foreground">GPT-4 Turbo, Claude 3 Opus</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-500" />
                  <span>Open Source</span>
                </div>
                <span className="text-sm text-muted-foreground">{stats.openSourceModels} models available</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Get Started Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">Ready to explore AI capabilities?</h3>
              <p className="text-muted-foreground mb-4">
                Try image generation, code assistance, or ask questions to our {stats.totalModels}+ AI models.
              </p>
              <Button onClick={() => router.push('/dashboard/query')} className="mr-3">
                Start Querying <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => router.push('/dashboard/models')}>
                Browse Models
              </Button>
            </div>
            <div className="hidden md:block">
              <Sparkles className="h-20 w-20 text-blue-300" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}