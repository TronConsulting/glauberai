'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Play, 
  Zap, 
  Brain, 
  Clock,
  DollarSign,
  BarChart3,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function DemoPage() {
  const [query, setQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState('auto');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const demoQueries = [
    "Generate a Python function to sort a list",
    "Write a creative story about AI",
    "Analyze this quarterly report data",
    "Explain quantum computing simply"
  ];

  const models = [
    { id: 'auto', name: 'Auto (Recommended)', description: 'Let GlauberAI choose the best model' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Best for complex reasoning and code' },
    { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', description: 'Great for creative writing and analysis' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and cost-effective' },
    { id: 'gemini-pro', name: 'Gemini Pro', description: 'Multimodal capabilities' }
  ];

  // Models and routing logic from hero-section
  const heroModels = [
    { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', reasoning: 'Selected Claude 3 Sonnet based on code-related keywords and programming complexity.' },
    { id: 'gpt-4', name: 'GPT-4', reasoning: 'Selected GPT-4 based on creative writing keywords and medium complexity.' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', reasoning: 'Selected GPT-4 Turbo for data analysis and report context.' },
    { id: 'gemini-pro', name: 'Gemini Pro', reasoning: 'Selected Gemini Pro for science and explanation-focused query.' }
  ];

  const handleDemo = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Find which demo query is selected
    const queryIndex = demoQueries.findIndex(q => q === query);
    let selectedIdx = queryIndex !== -1 ? queryIndex : 0;

    let selectedModelId = selectedModel === 'auto' ? heroModels[selectedIdx].id : selectedModel;
    let selectedModelObj = models.find(m => m.id === selectedModelId) || heroModels[selectedIdx];
    let reasoning = selectedModel === 'auto'
      ? heroModels[selectedIdx].reasoning
      : 'User-specified model selection';

    const mockResult = {
      selectedModel: selectedModelId,
      reasoning,
      response: generateMockResponse(query),
      metrics: {
        processingTime: Math.random() * 200 + 50,
        inputTokens: Math.ceil(query.length / 4),
        outputTokens: Math.ceil(Math.random() * 500 + 100),
        estimatedCost: (Math.random() * 0.01 + 0.001).toFixed(4)
      }
    };
    setResult(mockResult);
    setIsLoading(false);
  };

  const generateMockResponse = (query: string) => {
    if (query.toLowerCase().includes('python') || query.toLowerCase().includes('function')) {
      return `def fibonacci(n):
    """Calculate the nth Fibonacci number using dynamic programming."""
    if n <= 1:
        return n
    
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    
    return b

# Example usage:
print(fibonacci(10))  # Output: 55

This implementation uses an iterative approach with O(n) time complexity and O(1) space complexity, making it efficient for large values of n.`;
    }
    
    if (query.toLowerCase().includes('quantum')) {
      return `Quantum computing is like having a magical computer that can explore multiple solutions simultaneously, rather than checking them one by one like traditional computers.

Here's a simple analogy: Imagine you're in a maze. A classical computer would try each path one at a time until it finds the exit. A quantum computer, however, could explore all paths at once and instantly know which one leads to the exit.

Key concepts:
• **Qubits**: Unlike classical bits (0 or 1), qubits can be both 0 and 1 simultaneously
• **Superposition**: The ability to exist in multiple states at once
• **Entanglement**: Qubits can be mysteriously connected across distances
• **Quantum Advantage**: Solving certain problems exponentially faster

This technology could revolutionize cryptography, drug discovery, and optimization problems.`;
    }
    
    return `This is a demonstration response showing how GlauberAI would intelligently route your query to the most appropriate AI model based on the content, complexity, and context of your request.

The system analyzes factors like:
- Keywords and domain expertise required
- Query length and complexity
- Cost optimization preferences
- Performance requirements

This ensures you get the best possible response while optimizing for both quality and cost-effectiveness.`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="py-24">
        <div className="container max-w-6xl">
          {/* Header */}
          <div className="text-center space-y-4 mb-16">
            <Badge variant="outline" className="px-4 py-2">
              Interactive Demo
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold">
              Try GlauberAI
              <span className="block gradient-text">Live Demo</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience intelligent AI routing in action. See how our system automatically 
              selects the best model for your specific query.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Section */}
            <div className="space-y-6">
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Brain className="h-5 w-5" />
                    <span>Query Input</span>
                  </CardTitle>
                  <CardDescription>
                    Enter your query and watch GlauberAI route it intelligently
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Your Query</label>
                    <Textarea
                      placeholder="Enter your query here..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      rows={4}
                      className="resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Model Preference</label>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {models.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <div>
                              <div className="font-medium">{model.name}</div>
                              <div className="text-xs text-muted-foreground">{model.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={handleDemo} 
                    disabled={!query.trim() || isLoading}
                    className="w-full"
                    size="lg"
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="spinner" />
                        <span>Processing...</span>
                      </div>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Run Demo
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Quick Examples */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-lg">Try These Examples</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {demoQueries.map((example, index) => (
                      <Button
                        key={index}
                        variant="ghost"
                        className="w-full justify-start text-left h-auto p-3"
                        onClick={() => setQuery(example)}
                      >
                        <div className="text-sm">{example}</div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Results Section */}
            <div className="space-y-6">
              {result ? (
                <>
                  {/* Routing Decision */}
                  <Card className="glass">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Zap className="h-5 w-5" />
                        <span>Routing Decision</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">Selected Model</div>
                          <Badge variant="outline" className="text-xs">
                            {models.find(m => m.id === result.selectedModel)?.name || result.selectedModel}
                          </Badge>
                        </div>
                        <Badge variant="secondary">Optimal</Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        <strong>Reasoning:</strong> {result.reasoning}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Metrics */}
                  <Card className="glass">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <BarChart3 className="h-5 w-5" />
                        <span>Performance Metrics</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-blue-500" />
                          <div>
                            <div className="text-sm font-medium">{result.metrics.processingTime.toFixed(0)}ms</div>
                            <div className="text-xs text-muted-foreground">Response Time</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-green-500" />
                          <div>
                            <div className="text-sm font-medium">${result.metrics.estimatedCost}</div>
                            <div className="text-xs text-muted-foreground">Estimated Cost</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Sparkles className="h-4 w-4 text-purple-500" />
                          <div>
                            <div className="text-sm font-medium">{result.metrics.inputTokens}</div>
                            <div className="text-xs text-muted-foreground">Input Tokens</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Sparkles className="h-4 w-4 text-orange-500" />
                          <div>
                            <div className="text-sm font-medium">{result.metrics.outputTokens}</div>
                            <div className="text-xs text-muted-foreground">Output Tokens</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Response */}
                  <Card className="glass">
                    <CardHeader>
                      <CardTitle>AI Response</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-muted/30 p-4 rounded-lg">
                        <pre className="whitespace-pre-wrap text-sm font-mono">
                          {result.response}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="glass">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Brain className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="font-semibold mb-2">Ready to Process</h3>
                    <p className="text-muted-foreground mb-6">
                      Enter a query and click "Run Demo" to see GlauberAI in action
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span>15+ Models Available</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        <span>Intelligent Routing</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* CTA */}
              <Card className="glass border-primary/20">
                <CardContent className="p-6 text-center">
                  <h3 className="font-semibold mb-2">Ready to get started?</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Sign up for free and get 1,000 queries to try GlauberAI
                  </p>
                  <Button asChild>
                    <a href="/auth/signup">
                      Start Free Trial
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}