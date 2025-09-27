'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Search, 
  Plus, 
  Settings, 
  Eye, 
  Trash2, 
  Activity, 
  Zap, 
  Globe, 
  Code, 
  Image as ImageIcon,
  Video,
  Mic,
  Brain,
  Server,
  Cloud,
  Monitor,
  Sparkles,
  Wind
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { COMPREHENSIVE_MODELS, ModelConfig } from '@/lib/ai-routing';

// Create simplified categories for the UI
const MODEL_CATEGORIES = {
  'text_generation': 'Text Generation',
  'code_generation': 'Code Generation', 
  'image_generation': 'Image Generation',
  'multimodal': 'Multimodal',
  'open_source': 'Open Source',
  'free_tier': 'Free Tier'
};

const PROVIDER_INFO = {
  'openai': { name: 'OpenAI' },
  'anthropic': { name: 'Anthropic' },
  'google': { name: 'Google' },
  'cohere': { name: 'Cohere' },
  'mistral': { name: 'Mistral' },
  'huggingface': { name: 'Hugging Face' },
  'groq': { name: 'Groq' },
  'together': { name: 'Together AI' },
  'deepinfra': { name: 'DeepInfra' },
  'replicate': { name: 'Replicate' },
  'openrouter': { name: 'OpenRouter' },
  'perplexity': { name: 'Perplexity' },
  'fireworks': { name: 'Fireworks' },
  'stability': { name: 'Stability AI' },
  'ollama': { name: 'Ollama' },
  'custom': { name: 'Custom' },
  'local': { name: 'Local' }
};

export default function ModelsPage() {
  const [models, setModels] = useState<ModelConfig[]>(COMPREHENSIVE_MODELS);
  const [filteredModels, setFilteredModels] = useState<ModelConfig[]>(COMPREHENSIVE_MODELS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelConfig | null>(null);
  const [customModels, setCustomModels] = useState<any[]>([]);
  
  // Calculate model statistics
  const modelStats = {
    total: models.length,
    textModels: models.filter(m => !m.supportsImages && !m.supportsVision).length,
    imageModels: models.filter(m => m.supportsImages).length,
    visionModels: models.filter(m => m.supportsVision).length,
    codeModels: models.filter(m => m.supportsCode).length,
    openSource: models.filter(m => m.isOpenSource).length,
    providers: Array.from(new Set(models.map(m => m.provider))).length
  };

  // Filter models based on search and filters
  useEffect(() => {
    let filtered = models;

    if (searchTerm) {
      filtered = filtered.filter(model => 
        model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        model.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
        model.strengths.some(strength => strength.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (selectedProvider !== 'all') {
      filtered = filtered.filter(model => model.provider === selectedProvider);
    }

    if (selectedCategory !== 'all') {
      switch (selectedCategory) {
        case 'text_generation':
          filtered = filtered.filter(model => !model.supportsImages && !model.supportsVision);
          break;
        case 'code_generation':
          filtered = filtered.filter(model => model.supportsCode);
          break;
        case 'image_generation':
          filtered = filtered.filter(model => model.supportsImages);
          break;
        case 'multimodal':
          filtered = filtered.filter(model => model.supportsVision || model.supportsAudio || model.supportsVideo);
          break;
        case 'open_source':
          filtered = filtered.filter(model => model.isOpenSource);
          break;
        case 'free_tier':
          filtered = filtered.filter(model => model.costPer1kInput === 0 || model.provider === 'ollama' || model.provider === 'huggingface');
          break;
      }
    }

    setFilteredModels(filtered);
  }, [models, searchTerm, selectedCategory, selectedProvider]);

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'openai': return <Brain className="h-4 w-4 text-green-600" />;
      case 'anthropic': return <Brain className="h-4 w-4 text-orange-600" />;
      case 'google': return <Globe className="h-4 w-4 text-blue-600" />;
      case 'huggingface': return <Code className="h-4 w-4 text-yellow-600" />;
      case 'groq': return <Zap className="h-4 w-4 text-purple-600" />;
      case 'together': return <Activity className="h-4 w-4 text-indigo-600" />;
      case 'deepinfra': return <Server className="h-4 w-4 text-emerald-600" />;
      case 'replicate': return <ImageIcon className="h-4 w-4 text-pink-600" />;
      case 'openrouter': return <Globe className="h-4 w-4 text-slate-600" />;
      case 'perplexity': return <Search className="h-4 w-4 text-teal-600" />;
      case 'cohere': return <Brain className="h-4 w-4 text-blue-500" />;
      case 'mistral': return <Wind className="h-4 w-4 text-red-600" />;
      case 'fireworks': return <Sparkles className="h-4 w-4 text-orange-500" />;
      case 'stability': return <ImageIcon className="h-4 w-4 text-violet-600" />;
      case 'custom': return <Server className="h-4 w-4 text-gray-600" />;
      case 'ollama': return <Monitor className="h-4 w-4 text-blue-700" />;
      case 'local': return <Monitor className="h-4 w-4 text-gray-700" />;
      default: return <Cloud className="h-4 w-4 text-gray-500" />;
    }
  };

  const getCapabilityIcons = (model: ModelConfig) => {
    const icons = [];
    if (model.supportsCode) icons.push(<Code key="code" className="h-3 w-3" />);
    if (model.supportsImages) icons.push(<ImageIcon key="image" className="h-3 w-3" />);
    if (model.supportsVision) icons.push(<Eye key="vision" className="h-3 w-3" />);
    if (model.supportsAudio) icons.push(<Mic key="audio" className="h-3 w-3" />);
    if (model.supportsVideo) icons.push(<Video key="video" className="h-3 w-3" />);
    if (model.supportsStreaming) icons.push(<Activity key="stream" className="h-3 w-3" />);
    return icons;
  };

  const testModel = async (model: ModelConfig) => {
    try {
      const response = await fetch('/api/models/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId: model.id })
      });
      
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Success', description: `${model.name} is working properly (${data.latency}ms)` });
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to test model', variant: 'destructive' });
    }
  };

  const ModelCard = ({ model }: { model: ModelConfig }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getProviderIcon(model.provider)}
            <div>
              <CardTitle className="text-lg">{model.name}</CardTitle>
              <p className="text-sm text-muted-foreground capitalize">{model.provider}</p>
            </div>
          </div>
          <div className="flex gap-1 flex-wrap">
            {model.isOpenSource && <Badge variant="secondary">Open Source</Badge>}
            {model.costPer1kInput === 0 && <Badge variant="default" className="bg-green-600">Free</Badge>}
            {model.costPer1kInput > 0 && model.costPer1kInput <= 0.1 && <Badge variant="default" className="bg-blue-600">Cheap</Badge>}
            {model.requiresGPU && <Badge variant="outline">GPU</Badge>}
            {(model.provider === 'groq' || model.provider === 'deepinfra') && <Badge variant="outline" className="text-purple-600 border-purple-600">Fast</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Capabilities:</span>
            <div className="flex gap-1">
              {getCapabilityIcons(model)}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="font-medium">Max Tokens:</span>
              <span className="ml-1">{model.maxTokens.toLocaleString()}</span>
            </div>
            <div>
              <span className="font-medium">Context:</span>
              <span className="ml-1">{model.contextWindow.toLocaleString()}</span>
            </div>
            <div>
              <span className="font-medium">Input Cost:</span>
              <span className="ml-1">${model.costPer1kInput}/1k</span>
            </div>
            <div>
              <span className="font-medium">Output Cost:</span>
              <span className="ml-1">${model.costPer1kOutput}/1k</span>
            </div>
          </div>

          <div>
            <span className="text-sm font-medium">Best for:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {model.bestFor.slice(0, 3).map((use) => (
                <Badge key={use} variant="outline" className="text-xs">
                  {use}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => testModel(model)}
              className="flex-1"
            >
              <Activity className="h-3 w-3 mr-1" />
              Test
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSelectedModel(model)}
              className="flex-1"
            >
              <Settings className="h-3 w-3 mr-1" />
              Configure
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const AddCustomModelDialog = () => (
    <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Custom Model</DialogTitle>
          <DialogDescription>
            Configure a custom model endpoint or deploy a new model
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="model-name">Model Name</Label>
              <Input id="model-name" placeholder="My Custom Model" />
            </div>
            <div>
              <Label htmlFor="provider">Provider</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom Endpoint</SelectItem>
                  <SelectItem value="huggingface">Hugging Face</SelectItem>
                  <SelectItem value="ollama">Ollama (Local)</SelectItem>
                  <SelectItem value="replicate">Replicate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="endpoint">API Endpoint</Label>
            <Input id="endpoint" placeholder="https://api.example.com/v1/chat/completions" />
          </div>
          
          <div>
            <Label htmlFor="api-key">API Key (Optional)</Label>
            <Input id="api-key" type="password" placeholder="Your API key" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="max-tokens">Max Tokens</Label>
              <Input id="max-tokens" type="number" placeholder="4096" />
            </div>
            <div>
              <Label htmlFor="context-window">Context Window</Label>
              <Input id="context-window" type="number" placeholder="4096" />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Capabilities</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Switch id="streaming" />
                <Label htmlFor="streaming">Streaming</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="vision" />
                <Label htmlFor="vision">Vision</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="code" />
                <Label htmlFor="code">Code Generation</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="images" />
                <Label htmlFor="images">Image Generation</Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button>Add Model</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Model Ecosystem</h1>
          <p className="text-muted-foreground">
            Explore {modelStats.total} AI models across {modelStats.providers} providers including text generation, image creation, vision analysis, and code assistance
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Custom Model
        </Button>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium">Total Models</span>
            </div>
            <div className="text-2xl font-bold mt-2">{modelStats.total}</div>
            <div className="text-xs text-muted-foreground mt-1">All providers</div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-pink-500" />
              <span className="text-sm font-medium">Image Generation</span>
            </div>
            <div className="text-2xl font-bold mt-2">{modelStats.imageModels}</div>
            <div className="text-xs text-muted-foreground mt-1">DALL-E, Midjourney, SD</div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-purple-500" />
              <span className="text-sm font-medium">Vision Analysis</span>
            </div>
            <div className="text-2xl font-bold mt-2">{modelStats.visionModels}</div>
            <div className="text-xs text-muted-foreground mt-1">Image understanding</div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Code className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">Code Models</span>
            </div>
            <div className="text-2xl font-bold mt-2">{modelStats.codeModels}</div>
            <div className="text-xs text-muted-foreground mt-1">Programming help</div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-500" />
              <span className="text-sm font-medium">Open Source</span>
            </div>
            <div className="text-2xl font-bold mt-2">{modelStats.openSource}</div>
            <div className="text-xs text-muted-foreground mt-1">Free to use</div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium">Providers</span>
            </div>
            <div className="text-2xl font-bold mt-2">{modelStats.providers}</div>
            <div className="text-xs text-muted-foreground mt-1">AI companies</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Featured Models Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Featured Capabilities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-pink-100 rounded-lg">
                <ImageIcon className="h-5 w-5 text-pink-600" />
              </div>
              <div>
                <h4 className="font-semibold">Image Generation</h4>
                <p className="text-sm text-muted-foreground">Create stunning visuals with DALL-E 3's photorealism, Midjourney's artistic flair, or Stable Diffusion's speed</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Eye className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h4 className="font-semibold">Vision Analysis</h4>
                <p className="text-sm text-muted-foreground">Analyze images with GPT-4o Vision and Gemini Pro Vision for detailed descriptions and insights</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Zap className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h4 className="font-semibold">Open Source & Free Models</h4>
                <p className="text-sm text-muted-foreground">Access HuggingFace, Groq, DeepInfra, and local Ollama models. Some with free tiers, others from $0.08/1M tokens</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search models..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Providers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                {Object.entries(PROVIDER_INFO).map(([key, info]) => (
                  <SelectItem key={key} value={key}>{info.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.keys(MODEL_CATEGORIES).map((category) => (
                  <SelectItem key={category} value={category}>
                    {category.replace('_', ' ').toLowerCase().replace(/^./, c => c.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Models Grid */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All Models</TabsTrigger>
          <TabsTrigger value="text">Text Generation</TabsTrigger>
          <TabsTrigger value="code">Code Generation</TabsTrigger>
          <TabsTrigger value="image">Image Generation</TabsTrigger>
          <TabsTrigger value="multimodal">Multimodal</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredModels.map((model) => (
              <ModelCard key={model.id} model={model} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="text" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredModels
              .filter(m => !m.supportsImages && !m.supportsVision)
              .map((model) => (
                <ModelCard key={model.id} model={model} />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="code" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredModels
              .filter(m => m.supportsCode)
              .map((model) => (
                <ModelCard key={model.id} model={model} />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="image" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredModels
              .filter(m => m.supportsImages)
              .map((model) => (
                <ModelCard key={model.id} model={model} />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="multimodal" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredModels
              .filter(m => m.supportsVision || m.supportsAudio || m.supportsVideo)
              .map((model) => (
                <ModelCard key={model.id} model={model} />
              ))}
          </div>
        </TabsContent>
      </Tabs>

      <AddCustomModelDialog />
    </div>
  );
}