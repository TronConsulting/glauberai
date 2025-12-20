'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  RefreshCw, 
  Plus, 
  Settings, 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Zap,
  DollarSign,
  Clock,
  Brain,
  Download,
  Upload
} from 'lucide-react';

interface ModelData {
  id: string;
  name: string;
  provider: string;
  category: string;
  enabled: boolean;
  costPer1kTokens: number;
  performance?: {
    successRate: number;
    averageLatency: number;
    totalRequests: number;
  };
  isCustom: boolean;
}

interface DashboardData {
  summary: {
    totalModels: number;
    activeModels: number;
    averageSuccessRate: number;
    averageLatency: number;
    totalCost: number;
    totalRequests: number;
  };
  health: 'healthy' | 'warning' | 'critical';
  recommendations: string[];
}

export default function DynamicModelDashboard() {
  const [models, setModels] = useState<ModelData[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModel, setShowAddModel] = useState(false);
  const [newModel, setNewModel] = useState({
    name: '',
    provider: 'openai',
    modelId: '',
    apiKey: '',
    category: 'CHAT',
    costPer1kTokens: 0
  });

  const fetchData = async () => {
    try {
      setRefreshing(true);
      
      // Fetch models
      const modelsRes = await fetch('/api/models?action=models');
      const modelsData = await modelsRes.json();
      
      // Fetch dashboard data
      const dashboardRes = await fetch('/api/models?action=dashboard');
      const dashData = await dashboardRes.json();
      
      if (modelsData.success && dashData.success) {
        setModels(modelsData.models);
        setDashboardData(dashData.dashboard);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const addModel = async () => {
    try {
      const response = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-model',
          model: {
            ...newModel,
            id: `${newModel.provider}-${Date.now()}`,
            isCustom: true,
            enabled: true,
            supportsChat: true,
            supportsCode: newModel.category === 'CODE'
          }
        })
      });
      
      const result = await response.json();
      if (result.success) {
        await fetchData();
        setShowAddModel(false);
        setNewModel({
          name: '',
          provider: 'openai',
          modelId: '',
          apiKey: '',
          category: 'CHAT',
          costPer1kTokens: 0
        });
      }
    } catch (error) {
      console.error('Error adding model:', error);
    }
  };

  const toggleModel = async (modelId: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/models', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId,
          updates: { enabled }
        })
      });
      
      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Error toggling model:', error);
    }
  };

  const removeModel = async (modelId: string) => {
    try {
      const response = await fetch(`/api/models?modelId=${modelId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Error removing model:', error);
    }
  };

  const optimizeSystem = async () => {
    try {
      const response = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'optimize' })
      });
      
      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Error optimizing system:', error);
    }
  };

  const autoDiscover = async () => {
    try {
      const response = await fetch('/api/models?action=discover');
      const result = await response.json();
      
      if (result.success) {
        await fetchData();
      }
    } catch (error) {
      console.error('Error discovering models:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dynamic Model Management</h1>
          <p className="text-gray-600">Manage and monitor your AI models intelligently</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={fetchData}
            disabled={refreshing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowAddModel(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Model
          </Button>
          <Button onClick={optimizeSystem} variant="secondary">
            <TrendingUp className="h-4 w-4 mr-2" />
            Optimize
          </Button>
          <Button onClick={autoDiscover} variant="secondary">
            <Activity className="h-4 w-4 mr-2" />
            Auto-Discover
          </Button>
        </div>
      </div>

      {/* System Overview */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Models</p>
                  <p className="text-2xl font-bold">{dashboardData.summary.totalModels}</p>
                </div>
                <Brain className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Models</p>
                  <p className="text-2xl font-bold">{dashboardData.summary.activeModels}</p>
                </div>
                <Zap className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Success Rate</p>
                  <p className="text-2xl font-bold">
                    {(dashboardData.summary.averageSuccessRate * 100).toFixed(1)}%
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Latency</p>
                  <p className="text-2xl font-bold">
                    {(dashboardData.summary.averageLatency / 1000).toFixed(1)}s
                  </p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* System Health Alert */}
      {dashboardData && dashboardData.health !== 'healthy' && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>System Health: {dashboardData.health}</AlertTitle>
          <AlertDescription>
            {dashboardData.recommendations.join(', ')}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="models" className="space-y-4">
        <TabsList>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-4">
          <div className="grid gap-4">
            {models.map((model) => (
              <Card key={model.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h3 className="font-semibold">{model.name}</h3>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <span>{model.provider}</span>
                          <Badge variant="secondary">{model.category}</Badge>
                          {model.isCustom && <Badge variant="outline">Custom</Badge>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      {model.performance && (
                        <div className="text-right text-sm">
                          <div className="flex items-center space-x-2">
                            <span>{(model.performance.successRate * 100).toFixed(1)}% success</span>
                            <span>{(model.performance.averageLatency / 1000).toFixed(1)}s avg</span>
                            <span>{model.performance.totalRequests} requests</span>
                          </div>
                          <Progress 
                            value={model.performance.successRate * 100} 
                            className="w-20 h-2 mt-1"
                          />
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={model.enabled}
                          onCheckedChange={(enabled) => toggleModel(model.id, enabled)}
                        />
                        
                        {model.isCustom && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeModel(model.id)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Models</CardTitle>
                <CardDescription>Models with the best success rates and latency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {models
                    .filter(m => m.performance && m.performance.totalRequests > 0)
                    .sort((a, b) => (b.performance?.successRate || 0) - (a.performance?.successRate || 0))
                    .slice(0, 5)
                    .map((model, index) => (
                      <div key={model.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">#{index + 1}</span>
                          <span>{model.name}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {model.performance && (model.performance.successRate * 100).toFixed(1)}%
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Analysis</CardTitle>
                <CardDescription>Model usage and cost breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Total Estimated Cost</span>
                    <span className="font-semibold">
                      ${dashboardData?.summary.totalCost.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Requests</span>
                    <span>{dashboardData?.summary.totalRequests.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Cost per Request</span>
                    <span>
                      ${((dashboardData?.summary.totalCost || 0) / Math.max(dashboardData?.summary.totalRequests || 1, 1)).toFixed(4)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Intelligent Routing Settings</CardTitle>
              <CardDescription>Configure how queries are routed to models</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Performance Optimization</Label>
                  <Switch defaultChecked />
                  <p className="text-sm text-gray-600">Use performance metrics for routing</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Cost Efficiency</Label>
                  <Switch />
                  <p className="text-sm text-gray-600">Prefer cost-effective models</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Load Balancing</Label>
                  <Switch defaultChecked />
                  <p className="text-sm text-gray-600">Distribute load across models</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Auto-scaling</Label>
                  <Switch defaultChecked />
                  <p className="text-sm text-gray-600">Automatically adjust model priorities</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Model Modal */}
      {showAddModel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add New Model</CardTitle>
              <CardDescription>Configure a new AI model for intelligent routing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Model Name</Label>
                <Input
                  value={newModel.name}
                  onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                  placeholder="e.g., GPT-4 Custom"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select
                  value={newModel.provider}
                  onValueChange={(value) => setNewModel({ ...newModel, provider: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="groq">Groq</SelectItem>
                    <SelectItem value="huggingface">HuggingFace</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Model ID</Label>
                <Input
                  value={newModel.modelId}
                  onChange={(e) => setNewModel({ ...newModel, modelId: e.target.value })}
                  placeholder="e.g., gpt-4-turbo"
                />
              </div>
              
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={newModel.apiKey}
                  onChange={(e) => setNewModel({ ...newModel, apiKey: e.target.value })}
                  placeholder="Your API key"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={newModel.category}
                  onValueChange={(value) => setNewModel({ ...newModel, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CHAT">Chat</SelectItem>
                    <SelectItem value="CODE">Code</SelectItem>
                    <SelectItem value="REASONING">Reasoning</SelectItem>
                    <SelectItem value="CREATIVE">Creative</SelectItem>
                    <SelectItem value="FAST">Fast</SelectItem>
                    <SelectItem value="VISION">Vision</SelectItem>
                    <SelectItem value="MULTIMODAL">Multimodal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Cost per 1K Tokens ($)</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={newModel.costPer1kTokens}
                  onChange={(e) => setNewModel({ ...newModel, costPer1kTokens: parseFloat(e.target.value) || 0 })}
                  placeholder="0.002"
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button onClick={addModel} className="flex-1">
                  Add Model
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAddModel(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}