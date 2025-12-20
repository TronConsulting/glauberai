import { z } from 'zod';
import { Model, ModelSchema, ModelProvider, ModelCategory } from './models';

// Extended model schema for dynamic models with performance metrics
export const DynamicModelSchema = ModelSchema.extend({
  // Performance tracking
  averageLatency: z.number().default(0),
  successRate: z.number().min(0).max(1).default(1),
  totalRequests: z.number().default(0),
  totalFailures: z.number().default(0),
  lastUsed: z.number().default(0),
  
  // Dynamic configuration
  isCustom: z.boolean().default(false),
  dateAdded: z.number().default(() => Date.now()),
  addedBy: z.string().optional(),
  
  // Advanced capabilities
  customEndpoint: z.string().optional(),
  authHeaders: z.record(z.string()).optional(),
  requestFormat: z.enum(['openai', 'anthropic', 'custom']).default('openai'),
  
  // Performance thresholds
  maxLatencyMs: z.number().default(30000),
  minSuccessRate: z.number().min(0).max(1).default(0.8),
  
  // Auto-scaling and load balancing
  isLoadBalanced: z.boolean().default(false),
  weight: z.number().min(0).default(1),
  
  // Feature flags
  experimentalFeatures: z.array(z.string()).default([])
});

export type DynamicModel = z.infer<typeof DynamicModelSchema>;

// Performance metrics interface
export interface ModelPerformanceMetrics {
  modelId: string;
  averageLatency: number;
  successRate: number;
  totalRequests: number;
  totalFailures: number;
  lastUsed: number;
  costEfficiency: number; // success rate / cost ratio
  responseQuality: number; // based on user feedback if available
}

// Dynamic model configuration
export interface DynamicModelConfig {
  models: DynamicModel[];
  performanceMetrics: Record<string, ModelPerformanceMetrics>;
  lastUpdated: number;
  version: string;
}

export class DynamicModelRegistry {
  private static instance: DynamicModelRegistry;
  private models: Map<string, DynamicModel> = new Map();
  private performanceMetrics: Map<string, ModelPerformanceMetrics> = new Map();
  private configVersion: string = '1.0.0';
  private lastUpdated: number = Date.now();
  
  // Event listeners for model changes
  private listeners: Set<(models: DynamicModel[]) => void> = new Set();

  private constructor() {
    this.initializeRegistry();
  }

  public static getInstance(): DynamicModelRegistry {
    if (!DynamicModelRegistry.instance) {
      DynamicModelRegistry.instance = new DynamicModelRegistry();
    }
    return DynamicModelRegistry.instance;
  }

  /**
   * Initialize the registry with existing models
   */
  private async initializeRegistry(): Promise<void> {
    console.log('🚀 Initializing Dynamic Model Registry...');
    
    try {
      // Load from persistent storage if available
      await this.loadFromStorage();
      
      // Initialize performance metrics for existing models
      this.initializePerformanceMetrics();
      
      console.log(`✅ Registry initialized with ${this.models.size} models`);
    } catch (error) {
      console.warn('⚠️ Could not load from storage, using defaults:', error);
      this.initializeWithDefaults();
    }
  }

  /**
   * Initialize with default models (fallback)
   */
  private initializeWithDefaults(): void {
    // This would typically load from the existing ALL_MODELS array
    // For now, we'll set up the structure
    console.log('📦 Initializing with default model configuration');
  }

  /**
   * Add a new model dynamically
   */
  public async addModel(modelConfig: Partial<DynamicModel>): Promise<{ success: boolean; error?: string; model?: DynamicModel }> {
    try {
      // Validate the model configuration
      const validatedModel = DynamicModelSchema.parse({
        ...modelConfig,
        isCustom: true,
        dateAdded: Date.now()
      });

      // Check for duplicate IDs
      if (this.models.has(validatedModel.id)) {
        return {
          success: false,
          error: `Model with ID '${validatedModel.id}' already exists`
        };
      }

      // Test the model to ensure it's working
      const testResult = await this.testModelConnection(validatedModel);
      if (!testResult.success) {
        return {
          success: false,
          error: `Model connection test failed: ${testResult.error}`
        };
      }

      // Add to registry
      this.models.set(validatedModel.id, validatedModel);
      
      // Initialize performance metrics
      this.initializeModelMetrics(validatedModel.id);
      
      // Save to storage
      await this.saveToStorage();
      
      // Notify listeners
      this.notifyListeners();

      console.log(`✅ Added new model: ${validatedModel.name} (${validatedModel.provider})`);
      
      return {
        success: true,
        model: validatedModel
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Remove a model dynamically
   */
  public async removeModel(modelId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const model = this.models.get(modelId);
      if (!model) {
        return {
          success: false,
          error: `Model with ID '${modelId}' not found`
        };
      }

      // Only allow removal of custom models by default
      if (!model.isCustom) {
        console.warn(`⚠️ Attempted to remove built-in model: ${modelId}`);
        return {
          success: false,
          error: 'Cannot remove built-in models'
        };
      }

      this.models.delete(modelId);
      this.performanceMetrics.delete(modelId);
      
      await this.saveToStorage();
      this.notifyListeners();

      console.log(`🗑️ Removed model: ${model.name}`);
      
      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update model configuration
   */
  public async updateModel(modelId: string, updates: Partial<DynamicModel>): Promise<{ success: boolean; error?: string; model?: DynamicModel }> {
    try {
      const existingModel = this.models.get(modelId);
      if (!existingModel) {
        return {
          success: false,
          error: `Model with ID '${modelId}' not found`
        };
      }

      const updatedModel = DynamicModelSchema.parse({
        ...existingModel,
        ...updates,
        id: modelId // Prevent ID changes
      });

      this.models.set(modelId, updatedModel);
      await this.saveToStorage();
      this.notifyListeners();

      console.log(`🔄 Updated model: ${updatedModel.name}`);
      
      return {
        success: true,
        model: updatedModel
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get all models with current performance data
   */
  public getModelsWithPerformance(): Array<DynamicModel & { performance: ModelPerformanceMetrics }> {
    return Array.from(this.models.values()).map(model => ({
      ...model,
      performance: this.performanceMetrics.get(model.id) || this.createDefaultMetrics(model.id)
    }));
  }

  /**
   * Get best performing models for a category
   */
  public getBestPerformingModels(
    category?: ModelCategory,
    limit: number = 5,
    criteria: 'latency' | 'success_rate' | 'cost_efficiency' = 'success_rate'
  ): DynamicModel[] {
    let models = Array.from(this.models.values());
    
    if (category) {
      models = models.filter(m => m.category === category);
    }

    // Filter out disabled or poorly performing models
    models = models.filter(m => {
      const metrics = this.performanceMetrics.get(m.id);
      return m.enabled && 
             metrics && 
             metrics.successRate >= m.minSuccessRate &&
             (metrics.totalRequests === 0 || metrics.averageLatency <= m.maxLatencyMs);
    });

    // Sort by performance criteria
    models.sort((a, b) => {
      const metricsA = this.performanceMetrics.get(a.id)!;
      const metricsB = this.performanceMetrics.get(b.id)!;
      
      switch (criteria) {
        case 'latency':
          return metricsA.averageLatency - metricsB.averageLatency;
        case 'success_rate':
          return metricsB.successRate - metricsA.successRate;
        case 'cost_efficiency':
          return metricsB.costEfficiency - metricsA.costEfficiency;
        default:
          return b.priority - a.priority;
      }
    });

    return models.slice(0, limit);
  }

  /**
   * Record performance metrics for a model
   */
  public recordModelPerformance(
    modelId: string,
    latency: number,
    success: boolean,
    cost?: number
  ): void {
    let metrics = this.performanceMetrics.get(modelId);
    
    if (!metrics) {
      metrics = this.createDefaultMetrics(modelId);
      this.performanceMetrics.set(modelId, metrics);
    }

    // Update metrics
    metrics.totalRequests += 1;
    if (!success) {
      metrics.totalFailures += 1;
    }
    
    metrics.successRate = (metrics.totalRequests - metrics.totalFailures) / metrics.totalRequests;
    metrics.averageLatency = ((metrics.averageLatency * (metrics.totalRequests - 1)) + latency) / metrics.totalRequests;
    metrics.lastUsed = Date.now();
    
    // Calculate cost efficiency
    if (cost !== undefined && cost > 0) {
      metrics.costEfficiency = metrics.successRate / cost;
    }

    // Auto-disable model if performance is too poor
    const model = this.models.get(modelId);
    if (model && metrics.successRate < model.minSuccessRate && metrics.totalRequests >= 10) {
      console.warn(`⚠️ Auto-disabling model ${model.name} due to poor performance (${(metrics.successRate * 100).toFixed(1)}% success rate)`);
      model.enabled = false;
      this.saveToStorage();
    }
  }

  /**
   * Test model connection and basic functionality
   */
  private async testModelConnection(model: DynamicModel): Promise<{ success: boolean; error?: string; latency?: number }> {
    const startTime = Date.now();
    
    try {
      // This would implement actual testing logic based on provider
      console.log(`🧪 Testing model connection: ${model.name}`);
      
      // Simulate API test (replace with actual implementation)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const latency = Date.now() - startTime;
      return {
        success: true,
        latency
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
        latency: Date.now() - startTime
      };
    }
  }

  /**
   * Initialize performance metrics for a model
   */
  private initializeModelMetrics(modelId: string): void {
    if (!this.performanceMetrics.has(modelId)) {
      this.performanceMetrics.set(modelId, this.createDefaultMetrics(modelId));
    }
  }

  /**
   * Initialize performance metrics for all models
   */
  private initializePerformanceMetrics(): void {
    Array.from(this.models.values()).forEach(model => {
      this.initializeModelMetrics(model.id);
    });
  }

  /**
   * Create default metrics for a model
   */
  private createDefaultMetrics(modelId: string): ModelPerformanceMetrics {
    return {
      modelId,
      averageLatency: 0,
      successRate: 1,
      totalRequests: 0,
      totalFailures: 0,
      lastUsed: 0,
      costEfficiency: 1,
      responseQuality: 0.8 // Default assumption
    };
  }

  /**
   * Add event listener for model changes
   */
  public onModelsChanged(callback: (models: DynamicModel[]) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of model changes
   */
  private notifyListeners(): void {
    const models = Array.from(this.models.values());
    this.listeners.forEach(callback => {
      try {
        callback(models);
      } catch (error) {
        console.error('Error in model change listener:', error);
      }
    });
  }

  /**
   * Get registry statistics
   */
  public getRegistryStats(): {
    totalModels: number;
    customModels: number;
    enabledModels: number;
    averageSuccessRate: number;
    mostUsedModel: string | null;
    providers: Record<ModelProvider, number>;
    categories: Record<ModelCategory, number>;
  } {
    const models = Array.from(this.models.values());
    const metrics = Array.from(this.performanceMetrics.values());
    
    const providers: Record<string, number> = {};
    const categories: Record<string, number> = {};
    
    models.forEach(model => {
      providers[model.provider] = (providers[model.provider] || 0) + 1;
      categories[model.category] = (categories[model.category] || 0) + 1;
    });
    
    const averageSuccessRate = metrics.length > 0 
      ? metrics.reduce((sum, m) => sum + m.successRate, 0) / metrics.length 
      : 1;
    
    const mostUsedModel = metrics
      .sort((a, b) => b.totalRequests - a.totalRequests)[0]?.modelId || null;

    return {
      totalModels: models.length,
      customModels: models.filter(m => m.isCustom).length,
      enabledModels: models.filter(m => m.enabled).length,
      averageSuccessRate,
      mostUsedModel,
      providers: providers as Record<ModelProvider, number>,
      categories: categories as Record<ModelCategory, number>
    };
  }

  /**
   * Save configuration to persistent storage
   */
  private async saveToStorage(): Promise<void> {
    try {
      const config: DynamicModelConfig = {
        models: Array.from(this.models.values()),
        performanceMetrics: Object.fromEntries(this.performanceMetrics),
        lastUpdated: Date.now(),
        version: this.configVersion
      };

      // In a real implementation, this would save to a database or file
      if (typeof window !== 'undefined') {
        localStorage.setItem('glauber-dynamic-models', JSON.stringify(config));
      }
      
      this.lastUpdated = Date.now();
    } catch (error) {
      console.error('Failed to save model configuration:', error);
    }
  }

  /**
   * Load configuration from persistent storage
   */
  private async loadFromStorage(): Promise<void> {
    try {
      let configStr: string | null = null;
      
      if (typeof window !== 'undefined') {
        configStr = localStorage.getItem('glauber-dynamic-models');
      }
      
      if (!configStr) return;
      
      const config: DynamicModelConfig = JSON.parse(configStr);
      
      // Load models
      this.models.clear();
      for (const model of config.models) {
        const validatedModel = DynamicModelSchema.parse(model);
        this.models.set(validatedModel.id, validatedModel);
      }
      
      // Load performance metrics
      this.performanceMetrics.clear();
      for (const [modelId, metrics] of Object.entries(config.performanceMetrics)) {
        this.performanceMetrics.set(modelId, metrics);
      }
      
      this.lastUpdated = config.lastUpdated;
      this.configVersion = config.version;
      
    } catch (error) {
      console.error('Failed to load model configuration:', error);
      throw error;
    }
  }

  /**
   * Export configuration for backup or sharing
   */
  public exportConfiguration(): DynamicModelConfig {
    return {
      models: Array.from(this.models.values()),
      performanceMetrics: Object.fromEntries(Array.from(this.performanceMetrics.entries())),
      lastUpdated: this.lastUpdated,
      version: this.configVersion
    };
  }

  /**
   * Import configuration from backup
   */
  public async importConfiguration(config: DynamicModelConfig): Promise<{ success: boolean; imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;
    
    try {
      for (const modelConfig of config.models) {
        const result = await this.addModel(modelConfig);
        if (result.success) {
          imported++;
        } else {
          errors.push(`${modelConfig.name}: ${result.error}`);
        }
      }
      
      return {
        success: errors.length === 0,
        imported,
        errors
      };
      
    } catch (error) {
      return {
        success: false,
        imported,
        errors: [error instanceof Error ? error.message : 'Import failed']
      };
    }
  }
}

// Export singleton instance
export const dynamicModelRegistry = DynamicModelRegistry.getInstance();