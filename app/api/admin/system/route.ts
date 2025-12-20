import { NextRequest, NextResponse } from 'next/server';
import { getAuthCookie, verifyJwt } from '@/lib/auth';
import { modelManager } from '@/lib/model-manager';
import { aiRouter } from '@/lib/ai-router';
import { aiClient } from '@/lib/ai-client';

export async function GET(req: NextRequest) {
  const token = await getAuthCookie();
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const decoded = await verifyJwt(token);
  if (!decoded || typeof decoded === 'string') {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'status';

  try {
    switch (action) {
      case 'status':
        return handleGetStatus();
      case 'models':
        return handleListModels();
      case 'providers':
        return handleListProviders();
      case 'test':
        return handleTestSystem();
      case 'health':
        return handleHealthCheck();
      case 'refresh':
        return handleRefreshModels();
      default:
        return handleGetStatus();
    }
  } catch (error) {
    console.error('Admin system API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleGetStatus() {
  const systemStatus = aiRouter.getSystemStatus();
  const providerStatus = modelManager.getProviderStatus();
  const cacheStatus = aiClient.getCacheStatus();
  
  return NextResponse.json({
    status: 'operational',
    timestamp: Date.now(),
    system: systemStatus,
    providers: providerStatus,
    cache: cacheStatus,
    recommendations: generateRecommendations(systemStatus, providerStatus)
  });
}

async function handleListModels() {
  const allModels = modelManager.getAllModels();
  const modelsWithEstimates = modelManager.getModelsWithEstimates();
  const systemStatus = modelManager.getSystemStatus();

  const modelsByProvider = allModels.reduce((acc, model) => {
    if (!acc[model.provider]) acc[model.provider] = [];
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, typeof allModels>);

  const modelsByCategory = allModels.reduce((acc, model) => {
    if (!acc[model.category]) acc[model.category] = [];
    acc[model.category].push(model);
    return acc;
  }, {} as Record<string, typeof allModels>);

  return NextResponse.json({
    models: modelsWithEstimates,
    summary: {
      total: systemStatus.totalModels,
      available: systemStatus.availableModels,
      free: systemStatus.freeModels,
      paid: systemStatus.paidModels,
      byProvider: Object.entries(modelsByProvider).map(([provider, models]) => ({
        provider,
        count: models.length,
        available: models.filter(m => m.enabled).length
      })),
      byCategory: Object.entries(modelsByCategory).map(([category, models]) => ({
        category,
        count: models.length,
        available: models.filter(m => m.enabled).length
      }))
    },
    fallbackModel: modelManager.getFallbackModel()?.id || null,
    defaultModel: modelManager.getDefaultModel()?.id || null
  });
}

async function handleListProviders() {
  const providerStatus = modelManager.getProviderStatus();
  const modelsByProvider = modelManager.getAllModels().reduce((acc, model) => {
    if (!acc[model.provider]) acc[model.provider] = [];
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, any[]>);

  const providerDetails = Object.entries(providerStatus).map(([provider, hasApiKey]) => ({
    provider,
    hasApiKey,
    isConfigured: hasApiKey,
    modelCount: modelsByProvider[provider]?.length || 0,
    availableModels: modelsByProvider[provider]?.filter(m => m.enabled).length || 0,
    freeModels: modelsByProvider[provider]?.filter(m => m.costPer1kTokens === 0).length || 0,
    paidModels: modelsByProvider[provider]?.filter(m => m.costPer1kTokens > 0).length || 0,
    capabilities: {
      vision: modelsByProvider[provider]?.some(m => m.supportsVision) || false,
      code: modelsByProvider[provider]?.some(m => m.supportsCode) || false,
      streaming: modelsByProvider[provider]?.some(m => m.supportsStreaming) || false,
      multimodal: modelsByProvider[provider]?.some(m => m.category === 'MULTIMODAL') || false
    }
  }));

  return NextResponse.json({
    providers: providerDetails,
    summary: {
      total: providerDetails.length,
      configured: providerDetails.filter(p => p.hasApiKey).length,
      withModels: providerDetails.filter(p => p.modelCount > 0).length
    }
  });
}

async function handleTestSystem() {
  console.log('🧪 Starting comprehensive system test...');
  
  try {
    // Test the routing system
    const routingTest = await aiRouter.testSystem();
    
    // Test individual providers
    const providerStatus = modelManager.getProviderStatus();
    const providerTests = [];
    
    for (const [provider, hasApiKey] of Object.entries(providerStatus)) {
      if (hasApiKey) {
        try {
          const connectionTest = await aiClient.testConnection(provider);
          providerTests.push({
            provider,
            success: connectionTest.success,
            error: connectionTest.error
          });
        } catch (error) {
          providerTests.push({
            provider,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      } else {
        providerTests.push({
          provider,
          success: false,
          error: 'No API key configured'
        });
      }
    }
    
    const allTestsSuccessful = routingTest.success && providerTests.every(t => t.success);
    
    return NextResponse.json({
      success: allTestsSuccessful,
      timestamp: Date.now(),
      tests: {
        routing: routingTest,
        providers: providerTests
      },
      systemStatus: aiRouter.getSystemStatus(),
      recommendations: allTestsSuccessful 
        ? ['System is operating normally'] 
        : [
            'Some components failed testing',
            'Check API key configuration',
            'Verify network connectivity',
            'Review error logs for details'
          ]
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Test failed',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

async function handleHealthCheck() {
  const systemStatus = modelManager.getSystemStatus();
  const providerStatus = modelManager.getProviderStatus();
  
  const isHealthy = systemStatus.availableModels > 0 && 
                   Object.values(providerStatus).some(status => status);
  
  const issues = [];
  if (systemStatus.availableModels === 0) {
    issues.push('No models available');
  }
  if (!Object.values(providerStatus).some(status => status)) {
    issues.push('No API keys configured');
  }
  if (systemStatus.freeModels === 0) {
    issues.push('No free models available as fallback');
  }

  return NextResponse.json({
    healthy: isHealthy,
    timestamp: Date.now(),
    status: isHealthy ? 'healthy' : 'unhealthy',
    details: {
      availableModels: systemStatus.availableModels,
      configuredProviders: Object.values(providerStatus).filter(Boolean).length,
      freeModels: systemStatus.freeModels,
      paidModels: systemStatus.paidModels
    },
    issues: isHealthy ? [] : issues,
    recommendations: isHealthy 
      ? ['System is healthy and operational']
      : [
          'Configure at least one API key',
          'Ensure HuggingFace is configured for free fallback models',
          'Check network connectivity',
          'Verify model configurations'
        ]
  });
}

async function handleRefreshModels() {
  try {
    console.log('🔄 Refreshing model cache...');
    
    // Force refresh
    modelManager.refreshModels(true);
    aiRouter.clearCache();
    
    const newStatus = modelManager.getSystemStatus();
    
    return NextResponse.json({
      success: true,
      message: 'Models refreshed successfully',
      timestamp: Date.now(),
      modelsFound: newStatus.availableModels,
      providersConfigured: newStatus.providers.length,
      systemStatus: newStatus
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to refresh models',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function generateRecommendations(
  systemStatus: any, 
  providerStatus: Record<string, boolean>
): string[] {
  const recommendations: string[] = [];

  const configuredProviders = Object.values(providerStatus).filter(Boolean).length;
  
  if (configuredProviders === 0) {
    recommendations.push('🔑 Configure at least one API key to enable AI functionality');
  } else if (configuredProviders === 1) {
    recommendations.push('🔧 Consider adding more providers for redundancy and better capabilities');
  }

  if (!providerStatus.huggingface) {
    recommendations.push('🆓 Add HuggingFace API key for free open-source models');
  }

  if (systemStatus.freeModels === 0) {
    recommendations.push('💰 No free models available - all requests will incur costs');
  }

  if (systemStatus.availableModels < 5) {
    recommendations.push('🚀 Add more models for better task-specific performance');
  }

  if (!Object.entries(providerStatus).some(([provider, hasKey]) => 
    hasKey && ['openai', 'anthropic', 'google'].includes(provider))) {
    recommendations.push('⭐ Consider adding premium providers (OpenAI, Anthropic, Google) for highest quality');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ System is well-configured and ready for production use');
  }

  return recommendations;
}

// POST endpoint for administrative actions
export async function POST(req: NextRequest) {
  const token = await getAuthCookie();
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const decoded = await verifyJwt(token);
  if (!decoded || typeof decoded === 'string') {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, data } = body;

    switch (action) {
      case 'clear_cache':
        return handleClearCache();
      case 'test_model':
        return handleTestSpecificModel(data?.modelId);
      case 'test_query':
        return handleTestQuery(data?.query, data?.modelId);
      case 'refresh_models':
        return handleRefreshModels();
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin system POST API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleClearCache() {
  try {
    aiRouter.clearCache();
    
    return NextResponse.json({ 
      success: true, 
      message: 'All caches cleared successfully',
      timestamp: Date.now()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to clear cache',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function handleTestSpecificModel(modelId: string) {
  if (!modelId) {
    return NextResponse.json({ error: 'Model ID is required' }, { status: 400 });
  }

  const model = modelManager.getModelById(modelId);
  if (!model) {
    return NextResponse.json({ error: `Model not found: ${modelId}` }, { status: 404 });
  }

  try {
    const testResult = await modelManager.testModel(modelId);
    
    if (testResult.success) {
      // Try a real call
      const response = await aiClient.callModel(
        model, 
        'Hello! Please respond with "Test successful" to confirm you are working.',
        { maxTokens: 20 }
      );
      
      return NextResponse.json({
        modelId,
        modelName: model.name,
        provider: model.provider,
        testResult: {
          success: response.success,
          content: response.content,
          tokens: response.tokens,
          cost: response.cost,
          latency: response.latency,
          error: response.error
        },
        timestamp: Date.now()
      });
    } else {
      return NextResponse.json({
        modelId,
        modelName: model.name,
        provider: model.provider,
        testResult,
        timestamp: Date.now()
      });
    }
  } catch (error) {
    return NextResponse.json({
      modelId,
      modelName: model.name,
      provider: model.provider,
      success: false,
      error: error instanceof Error ? error.message : 'Test failed',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

async function handleTestQuery(query: string, modelId?: string) {
  if (!query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  try {
    const result = await aiRouter.processQueryEnhanced(query, 'CHAT', modelId);

    return NextResponse.json({
      query,
      requestedModel: modelId || 'auto',
      result: {
        success: result.success,
        content: result.content,
        finalModel: result.finalModel,
        attemptedModels: result.attemptedModels,
        tokens: result.tokens,
        cost: result.cost,
        latency: result.latency,
        routing: result.routing
      },
      timestamp: Date.now()
    });
  } catch (error) {
    return NextResponse.json({
      query,
      requestedModel: modelId || 'auto',
      success: false,
      error: error instanceof Error ? error.message : 'Query test failed',
      timestamp: Date.now()
    }, { status: 500 });
  }
}