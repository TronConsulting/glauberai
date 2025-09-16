'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowRight, 
  Zap, 
  BarChart3, 
  Shield, 
  Globe,
  CheckCircle,
  Star,
  MessageSquare,
  Cpu,
  Sparkles
} from 'lucide-react';

export function HeroSection() {
  // Reasoning for each routing decision
  const routingReasons = [
    "Selected Claude 3 Sonnet based on code-related keywords and programming complexity.",
    "Selected GPT-4 based on creative writing keywords and medium complexity.",
    "Selected GPT-4 Turbo for data analysis and report context.",
    "Selected Gemini Pro for science and explanation-focused query."
  ];
  const [typedText, setTypedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showResponse, setShowResponse] = useState(false);
  
  const queries = [
    "Generate a Python function to sort a list",
    "Write a creative story about AI",
    "Analyze this quarterly report data",
    "Explain quantum computing simply"
  ];

  const responses = [
    "Here's an efficient Python sorting function using the built-in sorted() method...",
    "In a world where artificial intelligence had become as common as electricity...",
    "Based on the quarterly data analysis, revenue increased by 15% compared to...",
    "Quantum computing uses quantum mechanical phenomena like superposition and entanglement..."
  ];

  // Add model info for each query type
  const modelBadges = [
    { name: "Claude 3 Sonnet", color: "bg-accent/10 text-accent" }, // Code
    { name: "GPT-4", color: "bg-primary/10 text-primary" }, // Text
    { name: "GPT-4 Turbo", color: "bg-secondary/10 text-secondary-foreground" }, // Data
    { name: "Gemini Pro", color: "bg-muted/10 text-foreground" } // Science
  ];

  useEffect(() => {
    const currentQuery = queries[currentIndex];
    if (typedText.length < currentQuery.length) {
      const timeout = setTimeout(() => {
        setTypedText(currentQuery.slice(0, typedText.length + 1));
      }, 50);
      return () => clearTimeout(timeout);
    } else {
      // Show response after typing is complete
      setTimeout(() => {
        setShowResponse(true);
      }, 500);
      
      // Reset after showing response
      setTimeout(() => {
        setShowResponse(false);
        setTypedText('');
        setCurrentIndex((prev) => (prev + 1) % queries.length);
      }, 3000);
    }
  }, [typedText, currentIndex, queries]);

  const features = [
    {
      icon: Zap,
      title: "Smart Routing",
      description: "Picks the best AI model for your needs"
    },
    {
      icon: BarChart3,
      title: "Usage Insights",
      description: "See how you're using AI and costs"
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your data stays safe with us"
    },
    {
      icon: Globe,
      title: "Always Available",
      description: "99.9% uptime worldwide"
    }
  ];

  const stats = [
    { value: "10M+", label: "Queries Handled" },
    { value: "99.9%", label: "Uptime" },
    { value: "50ms", label: "Response Time" },
    { value: "24/7", label: "Support" }
  ];

  return (
    <section className="relative py-16 md:py-20 overflow-hidden">
      {/* Natural Background Pattern */}
      <div className="absolute inset-0 bg-pattern opacity-20"></div>
      
      <div className="container relative z-10">
        {/* Main Hero Content */}
        <div className="text-center max-w-4xl mx-auto mb-12 md:mb-16">
          <Badge variant="secondary" className="mb-6 hover-scale px-3 py-1">
            <Star className="w-3 h-3 mr-1" />
            Used by 10,000+ developers
          </Badge>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            <span className="gradient-text-natural">Smart AI</span>
            <br />
            <span className="text-foreground">Routing</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Automatically route your queries to the best AI model. 
            Save money, get better results, and use AI smarter.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild size="lg" className="btn-primary px-8 py-3">
              <Link href="/auth/signup">
                Start Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="px-8 py-3">
              <Link href="/demo">
                Try Demo
              </Link>
            </Button>
          </div>
        </div>

        {/* Live Demo Section */}
        <div className="max-w-4xl mx-auto mb-12 md:mb-16">
          <Card className="gradient-bg border-natural overflow-hidden texture-noise">
            <CardContent className="p-6 md:p-8">
              <div className="text-center mb-6 md:mb-8">
                <h3 className="text-xl md:text-2xl font-bold mb-2">See How It Works</h3>
                <p className="text-muted-foreground text-sm md:text-base">
                  Watch queries get routed to the right AI model
                </p>
              </div>

              {/* Query Input Simulation + Mode Picker */}
              <div className="space-y-4 md:space-y-6">
                <div className="flex items-center space-x-3 md:space-x-4 p-3 md:p-4 bg-background/60 rounded-lg border border-border">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-mono text-xs md:text-sm text-foreground">
                      {typedText}
                      <span className="animate-pulse text-primary">|</span>
                    </div>
                  </div>
                </div>
                {/* Mode Picker Example */}
                <div className="flex flex-wrap gap-2 justify-center items-center">
                  {/* Example: Text question */}
                  <div className="flex items-center gap-2 px-3 py-1 bg-primary/5 rounded border border-primary/20">
                    <span className="font-mono text-xs text-foreground">Text/Story</span>
                    <Badge variant="outline" className="text-xs">GPT-4</Badge>
                  </div>
                  {/* Example: Code question */}
                  <div className="flex items-center gap-2 px-3 py-1 bg-accent/5 rounded border border-accent/20">
                    <span className="font-mono text-xs text-foreground">Code/Programming</span>
                    <Badge variant="outline" className="text-xs">Claude 3 Sonnet</Badge>
                  </div>
                  {/* Example: Data analysis */}
                  <div className="flex items-center gap-2 px-3 py-1 bg-secondary/5 rounded border border-secondary/20">
                    <span className="font-mono text-xs text-foreground">Data/Analysis</span>
                    <Badge variant="outline" className="text-xs">GPT-4 Turbo</Badge>
                  </div>
                  {/* Example: Science/Explanation */}
                  <div className="flex items-center gap-2 px-3 py-1 bg-muted/10 rounded border border-border">
                    <span className="font-mono text-xs text-foreground">Science/Explain</span>
                    <Badge variant="outline" className="text-xs">Gemini Pro</Badge>
                  </div>
                </div>

                {/* Routing Logic Display */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                  <div className="p-3 md:p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center space-x-2 mb-2">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      <span className="font-medium text-xs md:text-sm text-primary">Analyze</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Check query type and complexity
                    </p>
                  </div>

                  <div className="p-3 md:p-4 bg-accent/5 rounded-lg border border-accent/20">
                    <div className="flex items-center space-x-2 mb-2">
                      <Zap className="w-4 h-4 text-accent" />
                      <span className="font-medium text-xs md:text-sm text-accent">Choose</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pick the best model from 15+ options
                    </p>
                  </div>

                  <div className="p-3 md:p-4 bg-secondary/5 rounded-lg border border-secondary/20">
                    <div className="flex items-center space-x-2 mb-2">
                      <Cpu className="w-4 h-4 text-secondary-foreground" />
                      <span className="font-medium text-xs md:text-sm text-secondary-foreground">Run</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Get the best response at lowest cost
                    </p>
                  </div>
                </div>

                {/* Response Display */}
                {showResponse && (
                  <div className="fade-in">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-start space-x-3 md:space-x-4 p-3 md:p-4 bg-muted/30 rounded-lg border border-border">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 md:w-10 md:h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                            <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="text-xs md:text-sm text-foreground leading-relaxed">
                            {responses[currentIndex]}
                          </div>
                          <div className="flex items-center space-x-2 mt-2 flex-wrap">
                            <Badge variant="outline" className={`text-xs ${modelBadges[currentIndex].color}`}>{modelBadges[currentIndex].name}</Badge>
                            <Badge variant="outline" className="text-xs">$0.02</Badge>
                            <Badge variant="outline" className="text-xs">1.2s</Badge>
                          </div>
                        </div>
                      </div>
                      {/* Routing Decision Reasoning */}
                      <div className="p-3 md:p-4 bg-background/70 rounded-lg border border-border flex flex-col gap-1">
                        <div className="font-semibold text-xs md:text-sm text-foreground mb-1">Routing Decision</div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-muted-foreground">Selected Model</span>
                          <Badge variant="outline" className={`text-xs ${modelBadges[currentIndex].color}`}>{modelBadges[currentIndex].name}</Badge>
                          <span className="font-mono text-xs text-green-600">Optimal</span>
                        </div>
                        <div className="text-xs md:text-sm text-muted-foreground">Reasoning: {routingReasons[currentIndex]}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-12 md:mb-16">
          {stats.map((stat, index) => (
            <div key={index} className="text-center fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="text-2xl md:text-3xl font-bold gradient-text-natural mb-1 md:mb-2">{stat.value}</div>
              <div className="text-xs md:text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12 md:mb-16">
          {features.map((feature, index) => (
            <Card key={index} className="card-hover fade-in texture-paper" style={{ animationDelay: `${index * 0.1}s` }}>
              <CardContent className="p-4 md:p-6 text-center">
                <div className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
                  <feature.icon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2 text-sm md:text-base">{feature.title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg p-6 md:p-8 border border-primary/10">
            <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Ready to Get Started?</h2>
            <p className="text-muted-foreground mb-4 md:mb-6 max-w-md mx-auto">
              Join thousands of developers using smart AI routing
            </p>
            <Button asChild size="lg" className="btn-primary">
              <Link href="/auth/signup">
                Start Building Today
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}