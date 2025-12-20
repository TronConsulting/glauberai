import { Model, ALL_MODELS, API_KEY_MAPPINGS, ModelProvider, ModelCategory } from './models';

interface ModelValidation {
  isValid: boolean;
  errors: string[];
  hasApiKey: boolean;
}

interface SystemStatus {
  totalModels: number;
  availableModels: number;
  freeModels: number;
  paidModels: number;
  providers: ModelProvider[];
  categories: ModelCategory[];
  lastUpdate: number;
}

export class ModelManager {
  private static instance: ModelManager;
  private availableModels: Model[] = [];
  private modelCache = new Map<string, Model>();
  private providerStatus = new Map<ModelProvider, boolean>();
  private lastApiKeyCheck = 0;
  private readonly API_KEY_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.initializeModels();
  }

  public static getInstance(): ModelManager {
    if (!ModelManager.instance) {
      ModelManager.instance = new ModelManager();
    }
    return ModelManager.instance;
  }

  /**
   * Initialize models by detecting available API keys and caching available models
   */
  private initializeModels(): void {
    console.log('🔍 Initializing Model Manager...');
    
    // Check API key availability
    this.checkApiKeyAvailability();
    
    // Filter and cache available models
    this.cacheAvailableModels();
    
    console.log(`✅ Model Manager initialized with ${this.availableModels.length} available models`);
  }

  /**
   * Check which API keys are available in environment variables
   */
  private checkApiKeyAvailability(): void {
    this.providerStatus.clear();
    
    for (const [provider, envVar] of Object.entries(API_KEY_MAPPINGS)) {
      const apiKey = process.env[envVar];
      const hasKey = Boolean(apiKey && apiKey.length > 0 && !apiKey.includes('your_') && !apiKey.includes('_here'));
      
      this.providerStatus.set(provider as ModelProvider, hasKey);
      
      if (hasKey) {
        console.log(`✅ ${provider.toUpperCase()} API key detected`);
      } else {
        console.log(`❌ ${provider.toUpperCase()} API key not found or invalid`);
      }
    }
    
    this.lastApiKeyCheck = Date.now();
  }

  /**
   * Cache models that have valid API keys or are free
   */
  private cacheAvailableModels(): void {
    this.availableModels = [];
    this.modelCache.clear();
    
    for (const model of ALL_MODELS) {
      const validation = this.validateModel(model);
      
      if (validation.isValid) {
        // Add API key to model if available
        const apiKey = this.getApiKeyForProvider(model.provider);
        const modelWithKey = apiKey ? { ...model, apiKey } : model;
        
        this.availableModels.push(modelWithKey);
        this.modelCache.set(model.id, modelWithKey);
        
        console.log(`📦 Cached model: ${model.name} (${model.provider})`);
      } else {
        console.log(`❌ Skipped model: ${model.name} - ${validation.errors.join(', ')}`);
      }
    }

    // Sort by priority (lower number = higher priority)
    this.availableModels.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get API key for a specific provider
   */
  private getApiKeyForProvider(provider: ModelProvider): string | undefined {
    const envVar = API_KEY_MAPPINGS[provider];
    return envVar ? process.env[envVar] : undefined;
  }

  /**
   * Validate if a model can be used (has API key or is free)
   */
  public validateModel(model: Model): ModelValidation {
    const errors: string[] = [];
    
    // Check if provider has API key (for paid models)
    const hasApiKey = this.providerStatus.get(model.provider) || false;
    const isFree = model.costPer1kTokens === 0;
    
    if (!isFree && !hasApiKey) {
      errors.push(`Missing API key for ${model.provider}`);
    }
    
    if (!model.enabled) {
      errors.push('Model is disabled');
    }
    
    if (!model.modelId) {
      errors.push('Missing model ID');
    }

    // HuggingFace models need API URL
    if (model.provider === 'huggingface' && !model.apiUrl) {
      errors.push('Missing API URL for HuggingFace model');
    }

    return {
      isValid: errors.length === 0,
      errors,
      hasApiKey
    };
  }

  /**
   * Refresh API key detection and model cache
   */
  public refreshModels(force = false): void {
    const shouldRefresh = force || (Date.now() - this.lastApiKeyCheck) > this.API_KEY_CACHE_DURATION;
    
    if (shouldRefresh) {
      console.log('🔄 Refreshing model cache...');
      this.initializeModels();
    }
  }

  /**
   * Get all available models
   */
  public getAllModels(): Model[] {
    this.refreshModels();
    return [...this.availableModels];
  }

  /**
   * Get models by category
   */
  public getModelsByCategory(category: ModelCategory): Model[] {
    return this.availableModels.filter(model => model.category === category);
  }

  /**
   * Get models by provider
   */
  public getModelsByProvider(provider: ModelProvider): Model[] {
    return this.availableModels.filter(model => model.provider === provider);
  }

  /**
   * Get free models only
   */
  public getFreeModels(): Model[] {
    return this.availableModels.filter(model => model.costPer1kTokens === 0);
  }

  /**
   * Get paid models only
   */
  public getPaidModels(): Model[] {
    return this.availableModels.filter(model => model.costPer1kTokens > 0);
  }

  /**
   * Get model by ID
   */
  public getModelById(id: string): Model | null {
    this.refreshModels();
    return this.modelCache.get(id) || null;
  }

  /**
   * Get the best model for a specific task
   */
  public getBestModelForTask(
    category: ModelCategory,
    preferences: {
      maxCost?: number;
      preferFree?: boolean;
      requiresVision?: boolean;
      requiresCode?: boolean;
      requiresSpeed?: boolean;
    } = {}
  ): Model | null {
    let candidates = this.getModelsByCategory(category);
    
    // Apply filters
    if (preferences.preferFree) {
      const freeModels = candidates.filter(m => m.costPer1kTokens === 0);
      if (freeModels.length > 0) candidates = freeModels;
    }
    
    if (preferences.maxCost !== undefined) {
      candidates = candidates.filter(m => m.costPer1kTokens <= preferences.maxCost!);
    }
    
    if (preferences.requiresVision) {
      candidates = candidates.filter(m => m.supportsVision);
    }
    
    if (preferences.requiresCode) {
      candidates = candidates.filter(m => m.supportsCode);
    }
    
    if (preferences.requiresSpeed) {
      candidates = candidates.filter(m => m.category === 'FAST' || m.strengths.includes('fast'));
    }
    
    // Return highest priority (lowest number)
    return candidates.length > 0 ? candidates[0] : null;
  }

  /**
   * Get fallback model (most reliable free model)
   */
  public getFallbackModel(): Model | null {
    const freeModels = this.getFreeModels();
    return freeModels.find(m => m.id === 'gpt2') || freeModels[freeModels.length - 1] || null;
  }

  /**
   * Get default model (best available model)
   */
  public getDefaultModel(): Model | null {
    return this.availableModels.length > 0 ? this.availableModels[0] : null;
  }

  /**
   * Get system status
   */
  public getSystemStatus(): SystemStatus {
    this.refreshModels();
    
    const providers = [...new Set(this.availableModels.map(m => m.provider))];
    const categories = [...new Set(this.availableModels.map(m => m.category))];
    const freeModels = this.getFreeModels();
    const paidModels = this.getPaidModels();
    
    return {
      totalModels: ALL_MODELS.length,
      availableModels: this.availableModels.length,
      freeModels: freeModels.length,
      paidModels: paidModels.length,
      providers: providers as ModelProvider[],
      categories: categories as ModelCategory[],
      lastUpdate: this.lastApiKeyCheck
    };
  }

  /**
   * Get provider status
   */
  public getProviderStatus(): Record<ModelProvider, boolean> {
    this.refreshModels();
    return Object.fromEntries(this.providerStatus) as Record<ModelProvider, boolean>;
  }

  /**
   * Get models with performance estimates
   */
  public getModelsWithEstimates(): Array<Model & { estimatedLatency: string; costEstimate: string }> {
    return this.availableModels.map(model => ({
      ...model,
      estimatedLatency: this.estimateLatency(model),
      costEstimate: this.estimateCost(model)
    }));
  }

  /**
   * Estimate model latency based on size and provider
   */
  private estimateLatency(model: Model): string {
    if (model.provider === 'groq') return 'very fast';
    if (model.strengths.includes('fast') || model.category === 'FAST') return 'fast';
    if (model.modelSize?.includes('70B') || model.modelSize?.includes('65B')) return 'slow';
    if (model.modelSize?.includes('13B') || model.modelSize?.includes('15')) return 'medium';
    if (model.modelSize?.includes('7B') || model.modelSize?.includes('3B')) return 'fast';
    if (model.modelSize?.includes('124M') || model.modelSize?.includes('780M')) return 'very fast';
    return 'medium';
  }

  /**
   * Estimate cost category
   */
  private estimateCost(model: Model): string {
    if (model.costPer1kTokens === 0) return 'free';
    if (model.costPer1kTokens < 1) return 'low cost';
    if (model.costPer1kTokens < 3) return 'medium cost';
    return 'high cost';
  }

  /**
   * Clear cache and force refresh
   */
  public clearCache(): void {
    this.modelCache.clear();
    this.availableModels = [];
    this.providerStatus.clear();
    this.lastApiKeyCheck = 0;
    console.log('🧹 Model cache cleared');
  }

  /**
   * Test if a specific model is working
   */
  public async testModel(modelId: string): Promise<{ success: boolean; error?: string; latency?: number }> {
    const model = this.getModelById(modelId);
    if (!model) {
      return { success: false, error: 'Model not found' };
    }

    const validation = this.validateModel(model);
    if (!validation.isValid) {
      return { success: false, error: validation.errors.join(', ') };
    }

    // Model is valid - actual testing would be done by the AI client
    return { success: true, latency: 0 };
  }
}

// Export singleton instance
export const modelManager = ModelManager.getInstance();