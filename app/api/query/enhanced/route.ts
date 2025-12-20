import { NextRequest, NextResponse } from 'next/server';
import { aiRouter } from '@/lib/ai-router';
import { ModelCategory } from '@/lib/models';

export async function POST(request: NextRequest) {
  try {
    const { query, category, preferences, constraints } = await request.json();

    // Validate input
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 }
      );
    }

    // Use the enhanced dynamic routing system
    const result = await aiRouter.processQueryEnhanced(
      query,
      (category as ModelCategory) || 'CHAT',
      preferences?.modelId, // User's preferred model
      {
        maxCost: constraints?.maxCost,
        preferFree: constraints?.preferFree || false,
        requiresSpeed: constraints?.requiresSpeed || false,
        requiresVision: constraints?.requiresVision || false,
        requiresCode: constraints?.requiresCode || query.toLowerCase().includes('code')
      },
      {
        temperature: preferences?.temperature || 0.7,
        maxTokens: preferences?.maxTokens || 2048
      }
    );

    // Return detailed response with routing information
    return NextResponse.json({
      success: result.success,
      content: result.content,
      model: result.finalModel,
      provider: result.provider,
      routing: {
        selectedModel: result.routing.selectedModel.name,
        reasoning: result.routing.reasoning,
        confidence: result.routing.confidence,
        alternatives: result.routing.alternatives.map(alt => alt.name),
        performance: {
          expectedLatency: result.routing.expectedLatency,
          performanceScore: result.routing.performanceScore,
          costEfficiencyScore: result.routing.costEfficiencyScore
        }
      },
      performance: result.performance,
      metadata: {
        tokens: result.tokens,
        cost: result.cost,
        latency: result.latency,
        attemptedModels: result.attemptedModels,
        fallbacksUsed: result.performance?.fallbacksUsed || 0
      }
    });

  } catch (error) {
    console.error('Enhanced query processing error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      fallback: true
    }, { status: 500 });
  }
}

// Example usage in your frontend:
/*
const response = await fetch('/api/query/enhanced', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: "Write a Python function to calculate fibonacci numbers",
    category: 'CODE',
    preferences: {
      temperature: 0.3, // More deterministic for code
      maxTokens: 1500
    },
    constraints: {
      preferFree: false,
      requiresCode: true,
      maxCost: 2.0 // Maximum $2 per 1k tokens
    }
  })
});

const result = await response.json();

if (result.success) {
  console.log('AI Response:', result.content);
  console.log('Model Used:', result.model);
  console.log('Routing Confidence:', result.routing.confidence);
  console.log('Cost:', `$${result.metadata.cost}`);
  console.log('Latency:', `${result.metadata.latency}ms`);
  
  if (result.performance.fallbacksUsed > 0) {
    console.log('Fallbacks used:', result.performance.fallbacksUsed);
  }
}
*/