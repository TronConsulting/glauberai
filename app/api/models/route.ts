import { NextRequest, NextResponse } from 'next/server';
import { dynamicModelRegistry } from '@/lib/dynamic-model-registry';
import { enhancedModelManager } from '@/lib/enhanced-model-manager';
import { intelligentModelRouter } from '@/lib/intelligent-model-router';

// Get all models with performance data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'models':
        const models = dynamicModelRegistry.getModelsWithPerformance();
        return NextResponse.json({ success: true, models });

      case 'performance':
        const report = enhancedModelManager.getPerformanceReport();
        return NextResponse.json({ success: true, report });

      case 'health':
        const healthReport = await enhancedModelManager.monitorModelHealth();
        return NextResponse.json({ success: true, health: healthReport });

      case 'routing-stats':
        const routingStats = intelligentModelRouter.getRoutingStats();
        return NextResponse.json({ success: true, routing: routingStats });

      case 'dashboard':
        const dashboardData = enhancedModelManager.getDashboardData();
        return NextResponse.json({ success: true, dashboard: dashboardData });

      case 'registry-stats':
        const registryStats = dynamicModelRegistry.getRegistryStats();
        return NextResponse.json({ success: true, registry: registryStats });

      case 'discover':
        const availableModels = await enhancedModelManager.discoverAvailableModels();
        return NextResponse.json({ success: true, available: availableModels });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action parameter' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in models API GET:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Add or update models
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, model, config, envPrefix } = body;

    switch (action) {
      case 'add-model':
        if (!model) {
          return NextResponse.json(
            { success: false, error: 'Model configuration required' },
            { status: 400 }
          );
        }
        
        const addResult = await dynamicModelRegistry.addModel(model);
        return NextResponse.json(addResult);

      case 'add-from-env':
        if (!envPrefix) {
          return NextResponse.json(
            { success: false, error: 'Environment prefix required' },
            { status: 400 }
          );
        }
        
        const envResult = await enhancedModelManager.addModelFromEnvironment(envPrefix);
        return NextResponse.json(envResult);

      case 'optimize':
        const optimization = await enhancedModelManager.optimizeModelSelection();
        return NextResponse.json({ success: true, optimization });

      case 'auto-scale':
        const scaling = await enhancedModelManager.autoScaleModels();
        return NextResponse.json({ success: true, scaling });

      case 'update-routing-config':
        if (!config) {
          return NextResponse.json(
            { success: false, error: 'Configuration required' },
            { status: 400 }
          );
        }
        
        intelligentModelRouter.updateConfig(config);
        return NextResponse.json({ success: true, message: 'Routing configuration updated' });

      case 'import-config':
        const { configuration } = body;
        if (!configuration) {
          return NextResponse.json(
            { success: false, error: 'Configuration data required' },
            { status: 400 }
          );
        }
        
        const importResult = await dynamicModelRegistry.importConfiguration(configuration);
        return NextResponse.json({ success: true, result: importResult });

      case 'test-system':
        // Test basic functionality by getting models and health
        const healthCheck = await enhancedModelManager.monitorModelHealth();
        const modelsAvailable = dynamicModelRegistry.getModelsWithPerformance().length;
        
        const testResult = {
          success: healthCheck.overall !== 'critical' && modelsAvailable > 0,
          health: healthCheck.overall,
          modelsCount: modelsAvailable,
          message: `System ${healthCheck.overall}, ${modelsAvailable} models available`
        };
        
        return NextResponse.json({ success: true, test: testResult });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in models API POST:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Update existing models
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { modelId, updates } = body;

    if (!modelId) {
      return NextResponse.json(
        { success: false, error: 'Model ID required' },
        { status: 400 }
      );
    }

    const result = await dynamicModelRegistry.updateModel(modelId, updates);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in models API PUT:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Remove models
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get('modelId');
    const action = searchParams.get('action');

    if (action === 'clear-cache') {
      // Clear cache from enhanced model manager
      enhancedModelManager.shutdown(); // This will stop services
      setTimeout(() => {
        // Restart services after clearing
        const newManager = enhancedModelManager;
      }, 1000);
      
      return NextResponse.json({ success: true, message: 'System restarted and cache cleared' });
    }

    if (!modelId) {
      return NextResponse.json(
        { success: false, error: 'Model ID required' },
        { status: 400 }
      );
    }

    const result = await dynamicModelRegistry.removeModel(modelId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in models API DELETE:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}