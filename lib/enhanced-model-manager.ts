import { 
  DynamicModel, 
  DynamicModelRegistry, 
  dynamicModelRegistry,
  ModelPerformanceMetrics 
} from './dynamic-model-registry';
import { 
  IntelligentModelRouter, 
  IntelligentRoutingConfig,
  intelligentModelRouter,
  RoutingDecision 
} from './intelligent-model-router';
import { Model, ALL_MODELS, ModelCategory, ModelProvider } from './models';
import { modelManager } from './model-manager';

export interface EnhancedModelManager {
  // Model discovery and management
  discoverAvailableModels(): Promise<DynamicModel[]>;
  addModelFromEnvironment(envPrefix: string): Promise<{ success: boolean; model?: DynamicModel; error?: string }>;
  
  // Performance monitoring
  getPerformanceReport(): ModelPerformanceReport;
  optimizeModelSelection(): Promise<OptimizationResult>;
  
  // Dynamic routing
  routeIntelligently(query: string, category: ModelCategory, constraints?: any): RoutingDecision;
  
  // Auto-scaling and health
  monitorModelHealth(): Promise<HealthReport>;
  autoScaleModels(): Promise<ScalingResult>;
}

export interface ModelPerformanceReport {
  summary: {
    totalModels: number;
    activeModels: number;
    averageSuccessRate: number;
    averageLatency: number;
    totalCost: number;
    totalRequests: number;
  };
  topPerformers: Array<{
    model: DynamicModel;
    metrics: ModelPerformanceMetrics;
    score: number;
  }>;
  underPerformers: Array<{
    model: DynamicModel;
    issues: string[];
    recommendations: string[];
  }>;
  recommendations: {
    modelsToAdd: string[];
    modelsToRemove: string[];
    configChanges: Record<string, any>;
  };
}

export interface OptimizationResult {
  optimizationsApplied: number;
  modelsDisabled: string[];
  modelsEnabled: string[];
  configUpdates: Record<string, any>;
  estimatedSavings: {
    costReduction: number;
    latencyReduction: number;
    reliabilityImprovement: number;
  };
}

export interface HealthReport {
  overall: 'healthy' | 'warning' | 'critical';
  models: Array<{
    modelId: string;
    status: 'healthy' | 'warning' | 'critical' | 'offline';
    issues: string[];
    uptime: number;
    lastChecked: number;
  }>;
  alerts: Array<{
    level: 'info' | 'warning' | 'error';
    message: string;
    modelId?: string;
    timestamp: number;
  }>;
}

export interface ScalingResult {
  action: 'scale_up' | 'scale_down' | 'rebalance' | 'none';
  changes: Array<{
    modelId: string;
    oldPriority: number;
    newPriority: number;
    reason: string;
  }>;
  expectedImpact: string;
}

export class EnhancedModelManager implements EnhancedModelManager {
  private static instance: EnhancedModelManager;
  private healthCheckInterval?: NodeJS.Timeout;
  private performanceOptimizationInterval?: NodeJS.Timeout;
  private lastHealthCheck = 0;
  private lastOptimization = 0;
  
  // Performance tracking
  private globalMetrics = {
    totalRequests: 0,
    totalCost: 0,
    totalLatency: 0,
    totalErrors: 0
  };

  private constructor() {
    this.initializeEnhancedManager();
  }

  public static getInstance(): EnhancedModelManager {
    if (!EnhancedModelManager.instance) {
      EnhancedModelManager.instance = new EnhancedModelManager();
    }
    return EnhancedModelManager.instance;
  }

  /**
   * Initialize the enhanced manager
   */
  private async initializeEnhancedManager(): Promise<void> {
    console.log('🚀 Initializing Enhanced Model Manager...');
    
    try {
      // Discover and migrate existing models to dynamic system
      await this.migrateExistingModels();
      
      // Start monitoring services
      this.startHealthMonitoring();
      this.startPerformanceOptimization();
      
      // Initialize with environment models
      await this.discoverModelsFromEnvironment();
      
      console.log('✅ Enhanced Model Manager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Enhanced Model Manager:', error);
    }
  }

  /**
   * Migrate existing models to the dynamic system
   */
  private async migrateExistingModels(): Promise<void> {
    console.log('📦 Migrating existing models to dynamic system...');
    
    for (const model of ALL_MODELS) {
      try {
        const dynamicModel: Partial<DynamicModel> = {
          ...model,
          isCustom: false,
          dateAdded: Date.now(),
          addedBy: 'system_migration'
        };
        
        await dynamicModelRegistry.addModel(dynamicModel);
      } catch (error) {
        console.warn(`⚠️ Failed to migrate model ${model.name}:`, error);
      }
    }
  }

  /**
   * Discover available models from environment variables
   */
  public async discoverAvailableModels(): Promise<DynamicModel[]> {
    console.log('🔍 Discovering available models...');
    
    const availableModels = dynamicModelRegistry.getModelsWithPerformance()
      .map(m => m as DynamicModel);
    
    // Filter by API key availability
    const validModels = availableModels.filter(model => {
      if (model.costPer1kTokens === 0) return true; // Free models
      return Boolean(model.apiKey); // Paid models need API keys
    });
    
    console.log(`✅ Discovered ${validModels.length} available models`);
    return validModels;
  }

  /**
   * Auto-discover models from environment variables
   */
  private async discoverModelsFromEnvironment(): Promise<void> {
    const envVars = process.env;
    const discoveredModels: Array<{ prefix: string; key: string }> = [];
    
    // Look for API keys in environment
    Object.keys(envVars).forEach(key => {
      if (key.endsWith('_API_KEY') && envVars[key] && !envVars[key]?.includes('your_')) {
        const prefix = key.replace('_API_KEY', '').toLowerCase();
        discoveredModels.push({ prefix, key });
      }
    });
    
    console.log(`🔍 Found ${discoveredModels.length} potential model providers in environment`);
    
    // Try to add models for discovered providers
    for (const { prefix } of discoveredModels) {
      try {
        await this.addModelFromEnvironment(prefix);
      } catch (error) {
        console.warn(`⚠️ Could not add model for ${prefix}:`, error);
      }
    }
  }

  /**
   * Add a model based on environment variable prefix
   */
  public async addModelFromEnvironment(envPrefix: string): Promise<{ success: boolean; model?: DynamicModel; error?: string }> {
    try {
      const apiKey = process.env[`${envPrefix.toUpperCase()}_API_KEY`];
      if (!apiKey || apiKey.includes('your_')) {
        return {
          success: false,
          error: `API key not found or invalid for ${envPrefix}`
        };
      }

      // Try to detect model configuration based on provider
      const modelConfig = this.detectModelConfig(envPrefix, apiKey);
      if (!modelConfig) {
        return {
          success: false,
          error: `Could not detect model configuration for ${envPrefix}`
        };
      }

      const result = await dynamicModelRegistry.addModel(modelConfig);
      return result;

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Detect model configuration based on environment prefix
   */
  private detectModelConfig(prefix: string, apiKey: string): Partial<DynamicModel> | null {
    const normalizedPrefix = prefix.toLowerCase();
    
    // Map of provider prefixes to model configurations
    const providerConfigs: Record<string, Partial<DynamicModel>> = {
      'openai': {
        id: `openai-${Date.now()}`,
        name: 'OpenAI GPT (Auto-detected)',
        provider: 'openai',
        modelId: 'gpt-3.5-turbo',
        apiKey,
        costPer1kTokens: 0.5,
        category: 'CHAT',
        supportsChat: true,
        supportsCode: true
      },
      'anthropic': {
        id: `anthropic-${Date.now()}`,
        name: 'Claude (Auto-detected)',
        provider: 'anthropic',
        modelId: 'claude-3-haiku-20240307',
        apiKey,
        costPer1kTokens: 0.25,
        category: 'REASONING',
        supportsChat: true,
        supportsCode: true
      },
      'google': {
        id: `google-${Date.now()}`,
        name: 'Gemini (Auto-detected)',
        provider: 'google',
        modelId: 'gemini-1.5-flash',
        apiKey,
        costPer1kTokens: 0.075,
        category: 'FAST',
        supportsChat: true,
        supportsCode: true,
        supportsVision: true
      },
      'groq': {
        id: `groq-${Date.now()}`,
        name: 'Groq (Auto-detected)',
        provider: 'groq',
        modelId: 'llama3-70b-8192',
        apiKey,
        costPer1kTokens: 0.59,
        category: 'FAST',
        supportsChat: true,
        supportsCode: true
      },
      'huggingface': {
        id: `hf-${Date.now()}`,
        name: 'HuggingFace (Auto-detected)',
        provider: 'huggingface',
        modelId: 'microsoft/phi-2',
        apiKey,
        costPer1kTokens: 0,
        category: 'FAST',
        supportsChat: true,
        supportsCode: true
      }
    };

    return providerConfigs[normalizedPrefix] || null;
  }

  /**
   * Get comprehensive performance report
   */
  public getPerformanceReport(): ModelPerformanceReport {
    const modelsWithPerformance = dynamicModelRegistry.getModelsWithPerformance();
    
    // Calculate summary statistics
    const totalModels = modelsWithPerformance.length;
    const activeModels = modelsWithPerformance.filter(m => m.enabled && m.performance.totalRequests > 0).length;
    
    const totalRequests = modelsWithPerformance.reduce((sum, m) => sum + m.performance.totalRequests, 0);
    const totalLatency = modelsWithPerformance.reduce((sum, m) => sum + (m.performance.averageLatency * m.performance.totalRequests), 0);
    const averageLatency = totalRequests > 0 ? totalLatency / totalRequests : 0;
    
    const totalSuccessRate = modelsWithPerformance.reduce((sum, m) => sum + m.performance.successRate, 0);
    const averageSuccessRate = totalModels > 0 ? totalSuccessRate / totalModels : 0;
    
    const totalCost = modelsWithPerformance.reduce((sum, m) => {
      const cost = (m.performance.totalRequests * m.costPer1kTokens * 1.3) / 1000; // Estimate
      return sum + cost;
    }, 0);

    // Identify top performers
    const topPerformers = modelsWithPerformance
      .filter(m => m.performance.totalRequests >= 5)
      .map(model => {
        const score = (model.performance.successRate * 0.4) + 
                     ((1 - Math.min(model.performance.averageLatency / 10000, 1)) * 0.3) +
                     (model.performance.costEfficiency * 0.3);
        
        return { model, metrics: model.performance, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // Identify underperformers
    const underPerformers = modelsWithPerformance
      .filter(m => {
        if (m.performance.totalRequests < 5) return false;
        return m.performance.successRate < 0.8 || 
               m.performance.averageLatency > 15000;
      })
      .map(model => {
        const issues: string[] = [];
        const recommendations: string[] = [];
        
        if (model.performance.successRate < 0.8) {
          issues.push(`Low success rate: ${(model.performance.successRate * 100).toFixed(1)}%`);
          recommendations.push('Consider checking API key validity or model availability');
        }
        
        if (model.performance.averageLatency > 15000) {
          issues.push(`High latency: ${(model.performance.averageLatency / 1000).toFixed(1)}s`);
          recommendations.push('Consider using a faster alternative or optimizing requests');
        }
        
        return { model, issues, recommendations };
      });

    // Generate recommendations
    const modelsToAdd: string[] = [];
    const modelsToRemove: string[] = [];
    const configChanges: Record<string, any> = {};

    // Recommend free models if none exist
    if (!modelsWithPerformance.some(m => m.costPer1kTokens === 0)) {
      modelsToAdd.push('Add free models like HuggingFace models for cost-effective fallbacks');
    }

    // Recommend removing consistently failing models
    underPerformers.forEach(up => {
      if (up.model.performance.successRate < 0.5 && up.model.performance.totalRequests > 20) {
        modelsToRemove.push(up.model.id);
      }
    });

    // Recommend performance optimizations
    if (averageLatency > 5000) {
      configChanges.preferFastModels = true;
    }

    if (totalCost > 10) { // $10 threshold
      configChanges.preferCostEfficient = true;
    }

    return {
      summary: {
        totalModels,
        activeModels,
        averageSuccessRate,
        averageLatency,
        totalCost,
        totalRequests
      },
      topPerformers,
      underPerformers,
      recommendations: {
        modelsToAdd,
        modelsToRemove,
        configChanges
      }
    };
  }

  /**
   * Optimize model selection and configuration
   */
  public async optimizeModelSelection(): Promise<OptimizationResult> {
    console.log('🎯 Optimizing model selection...');
    
    const report = this.getPerformanceReport();
    let optimizationsApplied = 0;
    const modelsDisabled: string[] = [];
    const modelsEnabled: string[] = [];
    const configUpdates: Record<string, any> = {};

    // Disable underperforming models
    for (const underPerformer of report.underPerformers) {
      const performance = dynamicModelRegistry.getModelsWithPerformance()
        .find(m => m.id === underPerformer.model.id)?.performance;
      
      if (performance && performance.successRate < 0.6 && performance.totalRequests > 10) {
        await dynamicModelRegistry.updateModel(underPerformer.model.id, { enabled: false });
        modelsDisabled.push(underPerformer.model.id);
        optimizationsApplied++;
      }
    }

    // Enable top performers that might be disabled
    for (const topPerformer of report.topPerformers) {
      if (!topPerformer.model.enabled) {
        await dynamicModelRegistry.updateModel(topPerformer.model.id, { enabled: true });
        modelsEnabled.push(topPerformer.model.id);
        optimizationsApplied++;
      }
    }

    // Update router configuration
    const currentConfig = intelligentModelRouter.getConfig();
    const newConfig: Partial<IntelligentRoutingConfig> = { ...currentConfig };
    
    if (report.summary.averageLatency > 5000) {
      newConfig.preferCostEfficient = false; // Prioritize speed over cost
      configUpdates.prioritizeSpeed = true;
      optimizationsApplied++;
    }
    
    if (report.summary.totalCost > 50) { // $50 threshold
      newConfig.preferCostEfficient = true;
      configUpdates.preferCostEfficient = true;
      optimizationsApplied++;
    }

    if (Object.keys(configUpdates).length > 0) {
      intelligentModelRouter.updateConfig(newConfig);
    }

    // Calculate estimated improvements
    const estimatedSavings = {
      costReduction: modelsDisabled.length * 0.1, // Estimate 10% cost reduction per disabled model
      latencyReduction: configUpdates.prioritizeSpeed ? 0.2 : 0,
      reliabilityImprovement: modelsDisabled.length * 0.05 // Estimate 5% reliability improvement
    };

    this.lastOptimization = Date.now();
    
    console.log(`✅ Applied ${optimizationsApplied} optimizations`);
    
    return {
      optimizationsApplied,
      modelsDisabled,
      modelsEnabled,
      configUpdates,
      estimatedSavings
    };
  }

  /**
   * Route query using intelligent routing
   */
  public routeIntelligently(query: string, category: ModelCategory, constraints: any = {}): RoutingDecision {
    return intelligentModelRouter.routeQuery(query, category, constraints);
  }

  /**
   * Monitor model health
   */
  public async monitorModelHealth(): Promise<HealthReport> {
    console.log('🏥 Monitoring model health...');
    
    const models = dynamicModelRegistry.getModelsWithPerformance();
    const modelHealths: HealthReport['models'] = [];
    const alerts: HealthReport['alerts'] = [];
    
    let healthyCount = 0;
    let warningCount = 0;
    let criticalCount = 0;

    for (const model of models) {
      const health = this.assessModelHealth(model);
      modelHealths.push(health);
      
      switch (health.status) {
        case 'healthy':
          healthyCount++;
          break;
        case 'warning':
          warningCount++;
          alerts.push({
            level: 'warning',
            message: `Model ${model.name} has performance issues: ${health.issues.join(', ')}`,
            modelId: model.id,
            timestamp: Date.now()
          });
          break;
        case 'critical':
        case 'offline':
          criticalCount++;
          alerts.push({
            level: 'error',
            message: `Model ${model.name} is in critical state: ${health.issues.join(', ')}`,
            modelId: model.id,
            timestamp: Date.now()
          });
          break;
      }
    }

    // Determine overall health
    let overall: HealthReport['overall'] = 'healthy';
    if (criticalCount > 0 || (warningCount > healthyCount)) {
      overall = 'critical';
    } else if (warningCount > 0) {
      overall = 'warning';
    }

    // Add system-level alerts
    if (healthyCount === 0) {
      alerts.push({
        level: 'error',
        message: 'No healthy models available!',
        timestamp: Date.now()
      });
    }

    if (models.length === 0) {
      alerts.push({
        level: 'error',
        message: 'No models configured in the system',
        timestamp: Date.now()
      });
    }

    this.lastHealthCheck = Date.now();

    return {
      overall,
      models: modelHealths,
      alerts
    };
  }

  /**
   * Assess individual model health
   */
  private assessModelHealth(model: DynamicModel & { performance: ModelPerformanceMetrics }): HealthReport['models'][0] {
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' | 'offline' = 'healthy';
    
    const perf = model.performance;
    const hoursSinceLastUse = (Date.now() - perf.lastUsed) / (1000 * 60 * 60);

    // Check if model is enabled
    if (!model.enabled) {
      issues.push('Model is disabled');
      status = 'offline';
    }

    // Check API key availability
    if (model.costPer1kTokens > 0 && !model.apiKey) {
      issues.push('Missing API key');
      status = 'offline';
    }

    // Check success rate
    if (perf.totalRequests > 5) {
      if (perf.successRate < 0.5) {
        issues.push(`Very low success rate: ${(perf.successRate * 100).toFixed(1)}%`);
        status = 'critical';
      } else if (perf.successRate < 0.8) {
        issues.push(`Low success rate: ${(perf.successRate * 100).toFixed(1)}%`);
        if (status === 'healthy') status = 'warning';
      }
    }

    // Check latency
    if (perf.averageLatency > 30000) {
      issues.push(`Very high latency: ${(perf.averageLatency / 1000).toFixed(1)}s`);
      if (status !== 'critical') status = 'critical';
    } else if (perf.averageLatency > 15000) {
      issues.push(`High latency: ${(perf.averageLatency / 1000).toFixed(1)}s`);
      if (status === 'healthy') status = 'warning';
    }

    // Check if model hasn't been used recently (potential configuration issue)
    if (hoursSinceLastUse > 72 && perf.totalRequests > 0) { // 3 days
      issues.push('Model not used recently');
      if (status === 'healthy') status = 'warning';
    }

    const uptime = perf.totalRequests > 0 ? perf.successRate : 1.0;

    return {
      modelId: model.id,
      status,
      issues,
      uptime,
      lastChecked: Date.now()
    };
  }

  /**
   * Auto-scale models based on demand and performance
   */
  public async autoScaleModels(): Promise<ScalingResult> {
    console.log('📈 Auto-scaling models...');
    
    const stats = intelligentModelRouter.getRoutingStats();
    const report = this.getPerformanceReport();
    
    const changes: ScalingResult['changes'] = [];
    let action: ScalingResult['action'] = 'none';

    // Analyze load distribution
    const totalRequests = Object.values(stats.modelUsageDistribution).reduce((sum, count) => sum + count, 0);
    const modelCount = Object.keys(stats.modelUsageDistribution).length;
    const averageLoad = totalRequests / Math.max(modelCount, 1);

    // Scale up if failure rate is high
    if (stats.failureRate > 0.2) {
      action = 'scale_up';
      
      // Enable some disabled models or increase priority of reliable ones
      const topPerformers = report.topPerformers.slice(0, 2);
      for (const performer of topPerformers) {
        if (performer.model.priority > 10) {
          const newPriority = Math.max(1, performer.model.priority - 10);
          await dynamicModelRegistry.updateModel(performer.model.id, { priority: newPriority });
          
          changes.push({
            modelId: performer.model.id,
            oldPriority: performer.model.priority,
            newPriority,
            reason: 'Increased priority due to high failure rate'
          });
        }
      }
    }

    // Scale down if too many models with low usage
    const lowUsageModels = report.topPerformers.filter(tp => {
      const usage = stats.modelUsageDistribution[tp.model.id] || 0;
      return usage < averageLoad * 0.1; // Less than 10% of average
    });

    if (lowUsageModels.length > 3) {
      action = action === 'none' ? 'scale_down' : 'rebalance';
      
      // Reduce priority of low-usage models
      for (const model of lowUsageModels.slice(0, 2)) {
        const newPriority = Math.min(100, model.model.priority + 20);
        await dynamicModelRegistry.updateModel(model.model.id, { priority: newPriority });
        
        changes.push({
          modelId: model.model.id,
          oldPriority: model.model.priority,
          newPriority,
          reason: 'Reduced priority due to low usage'
        });
      }
    }

    // Rebalance if load is uneven
    const maxUsage = Math.max(...Object.values(stats.modelUsageDistribution));
    const minUsage = Math.min(...Object.values(stats.modelUsageDistribution));
    
    if (maxUsage > minUsage * 10 && modelCount > 1) { // Very uneven distribution
      action = action === 'none' ? 'rebalance' : action;
      // The routing system will naturally rebalance based on updated priorities
    }

    let expectedImpact = 'No changes needed';
    if (changes.length > 0) {
      expectedImpact = `Applied ${changes.length} priority adjustments to improve ${action}`;
    }

    return {
      action,
      changes,
      expectedImpact
    };
  }

  /**
   * Start health monitoring service
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Check health every 15 minutes
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.monitorModelHealth();
      } catch (error) {
        console.error('Health monitoring error:', error);
      }
    }, 15 * 60 * 1000);

    console.log('🏥 Health monitoring service started');
  }

  /**
   * Start performance optimization service
   */
  private startPerformanceOptimization(): void {
    if (this.performanceOptimizationInterval) {
      clearInterval(this.performanceOptimizationInterval);
    }

    // Optimize every 30 minutes
    this.performanceOptimizationInterval = setInterval(async () => {
      try {
        await this.optimizeModelSelection();
        await this.autoScaleModels();
      } catch (error) {
        console.error('Performance optimization error:', error);
      }
    }, 30 * 60 * 1000);

    console.log('🎯 Performance optimization service started');
  }

  /**
   * Get system dashboard data
   */
  public getDashboardData(): {
    summary: ModelPerformanceReport['summary'];
    health: HealthReport['overall'];
    routing: ReturnType<typeof intelligentModelRouter.getRoutingStats>;
    registry: ReturnType<typeof dynamicModelRegistry.getRegistryStats>;
    recommendations: string[];
  } {
    const performanceReport = this.getPerformanceReport();
    const routingStats = intelligentModelRouter.getRoutingStats();
    const registryStats = dynamicModelRegistry.getRegistryStats();
    
    // Compile recommendations
    const recommendations: string[] = [
      ...performanceReport.recommendations.modelsToAdd,
      ...routingStats.recommendations
    ];

    return {
      summary: performanceReport.summary,
      health: 'healthy', // Would come from actual health check
      routing: routingStats,
      registry: registryStats,
      recommendations
    };
  }

  /**
   * Shutdown services
   */
  public shutdown(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.performanceOptimizationInterval) {
      clearInterval(this.performanceOptimizationInterval);
    }
    console.log('🛑 Enhanced Model Manager services stopped');
  }
}

// Export singleton instance
export const enhancedModelManager = EnhancedModelManager.getInstance();