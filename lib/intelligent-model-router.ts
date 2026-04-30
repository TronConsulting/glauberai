import { Model, ModelCategory } from './models';
import { DynamicModel, DynamicModelRegistry, dynamicModelRegistry, ModelPerformanceMetrics } from './dynamic-model-registry';

export interface IntelligentRoutingConfig {
  // Performance-based routing
  usePerformanceMetrics: boolean;
  
  // Load balancing
  enableLoadBalancing: boolean;
  
  // Fallback behavior
  maxFailuresBeforeFallback: number;
  
  // Cost optimization
  preferCostEfficient: boolean;
  costThreshold?: number;
  
  // Quality preferences
  prioritizeQuality: boolean;
  qualityThreshold?: number;
  
  // Experimental features
  enableExperimentalModels: boolean;
}

export interface RoutingDecision {
  selectedModel: DynamicModel;
  reasoning: string[];
  confidence: number;
  alternatives: DynamicModel[];
  performanceScore: number;
  costEfficiencyScore: number;
  expectedLatency: number;
  fallbackChain: DynamicModel[];
}

export class IntelligentModelRouter {
  private static instance: IntelligentModelRouter;
  private config: IntelligentRoutingConfig = {
    usePerformanceMetrics: true,
    enableLoadBalancing: true,
    maxFailuresBeforeFallback: 3,
    preferCostEfficient: false,
    prioritizeQuality: true,
    enableExperimentalModels: false
  };
  
  // Real-time tracking
  private recentFailures = new Map<string, number>();
  private loadBalancingWeights = new Map<string, number>();
  private lastRoutingDecision = new Map<string, RoutingDecision>();

  private constructor() {
    this.initializeRouter();
  }

  public static getInstance(): IntelligentModelRouter {
    if (!IntelligentModelRouter.instance) {
      IntelligentModelRouter.instance = new IntelligentModelRouter();
    }
    return IntelligentModelRouter.instance;
  }

  /**
   * Initialize the router and set up model monitoring
   */
  private initializeRouter(): void {
    console.log('🧠 Initializing Intelligent Model Router...');
    
    // Listen for model changes
    dynamicModelRegistry.onModelsChanged(() => {
      this.updateLoadBalancingWeights();
    });
    
    this.updateLoadBalancingWeights();
    console.log('✅ Intelligent Router initialized');
  }

  /**
   * Route a query to the best available model based on intelligent analysis
   */
  public routeQuery(
    query: string,
    category: ModelCategory,
    constraints: {
      maxCost?: number;
      preferFree?: boolean;
      requiresVision?: boolean;
      requiresCode?: boolean;
      requiresSpeed?: boolean;
      userPreference?: string;
    } = {},
    customConfig?: Partial<IntelligentRoutingConfig>
  ): RoutingDecision {
    
    const config = { ...this.config, ...customConfig };
    const reasoning: string[] = [];
    
    // Get available models with performance data
    const modelsWithPerformance = dynamicModelRegistry.getModelsWithPerformance();
    
    // Apply basic filters
    let candidates = this.applyBasicFilters(modelsWithPerformance, category, constraints, reasoning);
    
    // Apply performance-based filtering if enabled
    if (config.usePerformanceMetrics) {
      candidates = this.applyPerformanceFilters(candidates, reasoning);
    }
    
    // Apply cost filtering
    if (constraints.maxCost !== undefined || config.preferCostEfficient) {
      candidates = this.applyCostFilters(candidates, constraints, config, reasoning);
    }
    
    // Handle user preference
    if (constraints.userPreference) {
      const preferred = candidates.find(c => c.id === constraints.userPreference);
      if (preferred) {
        reasoning.push(`Using user preference: ${preferred.name}`);
        return this.createRoutingDecision(preferred, candidates, reasoning, config);
      } else {
        reasoning.push(`User preference ${constraints.userPreference} not available, routing intelligently`);
      }
    }
    
    // Smart selection based on multiple criteria
    const selectedModel = this.selectBestModel(candidates, query, config, reasoning);
    
    if (!selectedModel) {
      throw new Error('No suitable models available for this request');
    }
    
    const decision = this.createRoutingDecision(selectedModel, candidates, reasoning, config);
    
    // Cache the decision for analysis
    this.lastRoutingDecision.set(query.slice(0, 100), decision);
    
    return decision;
  }

  /**
   * Apply basic filters for requirements
   */
  private applyBasicFilters(
    models: Array<DynamicModel & { performance: ModelPerformanceMetrics }>,
    category: ModelCategory,
    constraints: any,
    reasoning: string[]
  ): Array<DynamicModel & { performance: ModelPerformanceMetrics }> {
    
    let candidates = models.filter(m => {
      // Must be enabled
      if (!m.enabled) return false;
      
      // Must not have too many recent failures
      const failures = this.recentFailures.get(m.id) || 0;
      if (failures >= this.config.maxFailuresBeforeFallback) return false;
      
      // Must have API key if not free
      if (m.costPer1kTokens > 0 && !m.apiKey) return false;
      
      // Category preference (but not strict)
      // We'll prefer the right category but allow others
      
      // Feature requirements
      if (constraints.requiresVision && !m.supportsVision) return false;
      if (constraints.requiresCode && !m.supportsCode) return false;
      
      return true;
    });
    
    reasoning.push(`Filtered to ${candidates.length} available models`);
    
    // Prioritize by category match
    candidates = candidates.sort((a, b) => {
      const aMatches = a.category === category;
      const bMatches = b.category === category;
      
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
      
      // Secondary sort by priority
      return a.priority - b.priority;
    });
    
    if (candidates.some(c => c.category === category)) {
      reasoning.push(`Found models matching category: ${category}`);
    }
    
    return candidates;
  }

  /**
   * Apply performance-based filtering
   */
  private applyPerformanceFilters(
    candidates: Array<DynamicModel & { performance: ModelPerformanceMetrics }>,
    reasoning: string[]
  ): Array<DynamicModel & { performance: ModelPerformanceMetrics }> {
    
    // Filter out models with poor performance using a lower sample threshold for faster adaptation
    const filtered = candidates.filter(m => {
      const perf = m.performance;
      
      if (perf.totalRequests > 3 && perf.successRate < Math.max(m.minSuccessRate * 0.95, 0.5)) {
        return false;
      }
      
      if (perf.totalRequests > 2 && perf.averageLatency > Math.max(m.maxLatencyMs * 1.2, 5000)) {
        return false;
      }
      
      return true;
    });
    
    if (filtered.length !== candidates.length) {
      reasoning.push(`Filtered out ${candidates.length - filtered.length} models due to poor performance`);
    }
    
    return filtered;
  }

  /**
   * Apply cost-based filtering
   */
  private applyCostFilters(
    candidates: Array<DynamicModel & { performance: ModelPerformanceMetrics }>,
    constraints: any,
    config: IntelligentRoutingConfig,
    reasoning: string[]
  ): Array<DynamicModel & { performance: ModelPerformanceMetrics }> {
    
    if (constraints.preferFree) {
      const freeModels = candidates.filter(m => m.costPer1kTokens === 0);
      if (freeModels.length > 0) {
        reasoning.push(`Preferring free models`);
        return freeModels;
      }
    }
    
    if (constraints.maxCost !== undefined) {
      const filtered = candidates.filter(m => m.costPer1kTokens <= constraints.maxCost);
      if (filtered.length !== candidates.length) {
        reasoning.push(`Filtered by max cost: $${constraints.maxCost}/1k tokens`);
      }
      return filtered;
    }
    
    if (config.preferCostEfficient) {
      // Sort by cost efficiency
      candidates.sort((a, b) => b.performance.costEfficiency - a.performance.costEfficiency);
      reasoning.push(`Sorted by cost efficiency`);
    }
    
    return candidates;
  }

  /**
   * Select the best model using intelligent scoring
   */
  private selectBestModel(
    candidates: Array<DynamicModel & { performance: ModelPerformanceMetrics }>,
    query: string,
    config: IntelligentRoutingConfig,
    reasoning: string[]
  ): DynamicModel | null {
    
    if (candidates.length === 0) return null;
    if (candidates.length === 1) {
      reasoning.push(`Only one model available: ${candidates[0].name}`);
      return candidates[0];
    }
    
    // Calculate scores for each candidate
    const scoredCandidates = candidates.map(candidate => {
      const score = this.calculateModelScore(candidate, query, config);
      return { ...candidate, score };
    });
    
    // Sort by score (highest first)
    scoredCandidates.sort((a, b) => b.score - a.score);
    
    // Apply load balancing if enabled
    if (config.enableLoadBalancing) {
      const selected = this.applyLoadBalancing(scoredCandidates.slice(0, 3));
      reasoning.push(`Selected ${selected.name} via intelligent load balancing`);
      return selected;
    }
    
    const selected = scoredCandidates[0];
    reasoning.push(`Selected ${selected.name} with score: ${selected.score.toFixed(2)}`);
    return selected;
  }

  /**
   * Calculate a comprehensive score for a model
   */
  private calculateModelScore(
    model: DynamicModel & { performance: ModelPerformanceMetrics },
    query: string,
    config: IntelligentRoutingConfig
  ): number {
    let score = 0;
    const queryTags = this.extractQueryTags(query);
    const strengths = model.strengths.map(s => s.toLowerCase());

    score += (100 - model.priority) * 0.12;

    if (config.usePerformanceMetrics) {
      score += model.performance.successRate * 25;
      if (model.performance.totalRequests > 0) {
        const latencyScore = Math.max(0, 25 - (model.performance.averageLatency / 1000));
        score += latencyScore;
      } else {
        score += 12;
      }
    }

    if (config.preferCostEfficient) {
      score += model.performance.costEfficiency * 20;
    }

    if (config.prioritizeQuality) {
      score += model.performance.responseQuality * 20;
    }

    const hoursSinceLastUse = (Date.now() - model.performance.lastUsed) / (1000 * 60 * 60);
    if (hoursSinceLastUse < 24) {
      score += Math.max(0, 10 - hoursSinceLastUse);
    }

    const addStrength = (patterns: RegExp[], weight: number) => {
      if (patterns.some(pattern => strengths.some(str => pattern.test(str)))) {
        score += weight;
      }
    };

    if (queryTags.includes('code')) {
      addStrength([/code|programming|debug|software|instruction/], 18);
      if (model.supportsCode) score += 15;
    }
    if (queryTags.includes('vision')) {
      addStrength([/vision|image|visual|multimodal|photo/], 18);
      if (model.supportsVision) score += 15;
    }
    if (queryTags.includes('reasoning')) {
      addStrength([/reasoning|analysis|complex|chain-of-thought|math/], 18);
    }
    if (queryTags.includes('creative')) {
      addStrength([/creative|story|marketing|copy|high-quality/], 16);
    }
    if (queryTags.includes('summarize')) {
      addStrength([/concise|summary|instruction|analysis/], 12);
    }
    if (queryTags.includes('translate')) {
      addStrength([/multilingual|translation|language/], 12);
    }
    if (queryTags.includes('math')) {
      addStrength([/math|algorithms|science|statistics/], 12);
    }

    if (query.toLowerCase().includes('fast') && model.category === 'FAST') score += 10;

    const weight = this.loadBalancingWeights.get(model.id) || 1;
    score *= weight;

    return score;
  }

  /**
   * Apply load balancing to distribute load across similar models
   */
  private applyLoadBalancing(
    topModels: Array<DynamicModel & { performance: ModelPerformanceMetrics; score: number }>
  ): DynamicModel {
    
    if (topModels.length === 1) return topModels[0];
    
    // If top models have similar scores, balance the load
    const topScore = topModels[0].score;
    const similarModels = topModels.filter(m => m.score >= topScore * 0.9);
    
    if (similarModels.length === 1) {
      return similarModels[0];
    }
    
    // Select based on recent usage and weights
    let selected = similarModels[0];
    let lowestRecentUsage = Infinity;
    
    for (const model of similarModels) {
      const hoursIdle = (Date.now() - model.performance.lastUsed) / (1000 * 60 * 60);
      if (hoursIdle < lowestRecentUsage) {
        lowestRecentUsage = hoursIdle;
        selected = model;
      }
    }
    
    return selected;
  }

  /**
   * Create the final routing decision object
   */
  private createRoutingDecision(
    selectedModel: DynamicModel,
    allCandidates: Array<DynamicModel & { performance: ModelPerformanceMetrics }>,
    reasoning: string[],
    config: IntelligentRoutingConfig
  ): RoutingDecision {
    
    // Get alternatives (other good options)
    const alternatives = allCandidates
      .filter(m => m.id !== selectedModel.id)
      .slice(0, 3)
      .map(m => ({ ...m })); // Remove performance data for clean response
    
    // Build fallback chain
    const fallbackChain = this.buildIntelligentFallbackChain(selectedModel, allCandidates);
    
    // Calculate scores
    const performance = dynamicModelRegistry.getModelsWithPerformance()
      .find(m => m.id === selectedModel.id)?.performance;
    
    const performanceScore = performance ? 
      (performance.successRate * 0.7 + (1 - Math.min(performance.averageLatency / 5000, 1)) * 0.3) : 0.8;
    
    const costEfficiencyScore = performance?.costEfficiency || 
      (selectedModel.costPer1kTokens === 0 ? 1 : 1 / selectedModel.costPer1kTokens);
    
    const expectedLatency = performance?.averageLatency || this.estimateLatency(selectedModel);
    
    return {
      selectedModel,
      reasoning,
      confidence: Math.min(0.95, performanceScore + 0.1),
      alternatives,
      performanceScore,
      costEfficiencyScore,
      expectedLatency,
      fallbackChain
    };
  }

  /**
   * Build an intelligent fallback chain
   */
  private buildIntelligentFallbackChain(
    primary: DynamicModel,
    allCandidates: Array<DynamicModel & { performance: ModelPerformanceMetrics }>
  ): DynamicModel[] {
    
    const chain: DynamicModel[] = [];
    
    // Add similar models from same provider
    const sameProvider = allCandidates.filter(m => 
      m.id !== primary.id && 
      m.provider === primary.provider &&
      m.category === primary.category
    ).slice(0, 1);
    chain.push(...sameProvider);
    
    // Add models from same category but different providers
    const sameCategory = allCandidates.filter(m => 
      m.id !== primary.id && 
      m.provider !== primary.provider &&
      m.category === primary.category &&
      !chain.some(c => c.id === m.id)
    ).slice(0, 1);
    chain.push(...sameCategory);
    
    // Add free models as final fallback
    const freeModels = allCandidates.filter(m =>
      m.costPer1kTokens === 0 &&
      m.id !== primary.id &&
      !chain.some(c => c.id === m.id)
    ).slice(0, 1);
    chain.push(...freeModels);
    
    return chain.map(m => ({ ...m })); // Clean response
  }

  /**
   * Record the result of a model call for performance tracking
   */
  public recordModelResult(
    modelId: string,
    success: boolean,
    latency: number,
    cost?: number,
    quality?: number
  ): void {
    
    // Update dynamic registry
    dynamicModelRegistry.recordModelPerformance(modelId, latency, success, cost);
    
    // Update local failure tracking
    if (success) {
      this.recentFailures.delete(modelId);
    } else {
      const failures = this.recentFailures.get(modelId) || 0;
      this.recentFailures.set(modelId, failures + 1);
    }
    
    // Update load balancing weights
    this.updateLoadBalancingWeights();
  }

  /**
   * Update load balancing weights based on recent performance
   */
  private updateLoadBalancingWeights(): void {
    const models = dynamicModelRegistry.getModelsWithPerformance();
    
    models.forEach(model => {
      let weight = 1.0;
      
      // Reduce weight for models with recent failures
      const failures = this.recentFailures.get(model.id) || 0;
      if (failures > 0) {
        weight *= Math.pow(0.7, failures);
      }
      
      // Increase weight for models with good recent performance
      if (model.performance.successRate > 0.9 && model.performance.totalRequests > 5) {
        weight *= 1.2;
      }
      
      // Reduce weight for slow models
      if (model.performance.averageLatency > 10000) {
        weight *= 0.8;
      }
      
      this.loadBalancingWeights.set(model.id, weight);
    });
  }

  /**
   * Estimate latency for a model without performance data
   */
  private estimateLatency(model: DynamicModel): number {
    // Base estimates by provider and model size
    let baseLatency = 2000; // 2 seconds default
    
    if (model.provider === 'groq') baseLatency = 500;
    else if (model.provider === 'openai') baseLatency = 1500;
    else if (model.provider === 'anthropic') baseLatency = 2500;
    else if (model.provider === 'google') baseLatency = 2000;
    else if (model.provider === 'huggingface') baseLatency = 5000;
    
    // Adjust for model size
    if (model.modelSize?.includes('70B')) baseLatency *= 2;
    else if (model.modelSize?.includes('13B')) baseLatency *= 1.3;
    else if (model.modelSize?.includes('7B')) baseLatency *= 1.1;
    
    return baseLatency;
  }

  private extractQueryTags(query: string): string[] {
    const text = query.toLowerCase();
    const tags: string[] = [];

    const test = (tag: string, pattern: RegExp) => {
      if (pattern.test(text)) tags.push(tag);
    };

    test('code', /\b(code|function|class|debug|program|script|python|javascript|typescript|java|rust|go|swift|kotlin)\b/);
    test('vision', /\b(image|photo|picture|visual|screenshot|diagram|vision|visionary|multimodal)\b/);
    test('reasoning', /\b(analyze|evaluate|compare|critique|assess|why|strategy|planning|logic|reasoning|decision)\b/);
    test('creative', /\b(write|create|story|poem|marketing|blog|article|copy|generate|creative)\b/);
    test('summarize', /\b(summariz(e|ation)|summary|condense|recap|abstract)\b/);
    test('translate', /\b(translate|translation|language|localize|multilingual)\b/);
    test('math', /\b(calculate|solve|math|statistics|probability|formula|algebra|geometry|statistics)\b/);
    test('fast', /\b(urgent|quick|fast|asap|immediately|now|real-time)\b/);
    test('explain', /\b(explain|walk through|teach|describe|demonstrate)\b/);
    test('planning', /\b(plan|roadmap|workflow|project|strategy|design)\b/);

    return Array.from(new Set(tags));
  }

  /**
   * Get routing statistics and performance insights
   */
  public getRoutingStats(): {
    totalRoutingDecisions: number;
    modelUsageDistribution: Record<string, number>;
    averageDecisionConfidence: number;
    failureRate: number;
    topPerformingModels: Array<{ modelId: string; score: number }>;
    recommendations: string[];
  } {
    
    const modelUsage: Record<string, number> = {};
    let totalDecisions = 0;
    let totalConfidence = 0;
    let totalFailures = 0;
    
    // Count usage from recent failures and decisions
    this.recentFailures.forEach((failures, modelId) => {
      totalFailures += failures;
    });
    
    // Calculate statistics
    const models = dynamicModelRegistry.getModelsWithPerformance();
    models.forEach(model => {
      if (model.performance.totalRequests > 0) {
        modelUsage[model.id] = model.performance.totalRequests;
        totalDecisions += model.performance.totalRequests;
      }
    });
    
    const averageSuccessRate = models.length > 0 
      ? models.reduce((sum, m) => sum + m.performance.successRate, 0) / models.length
      : 1;
    
    const failureRate = 1 - averageSuccessRate;
    
    // Top performing models
    const topPerforming = models
      .map(m => ({
        modelId: m.id,
        score: m.performance.successRate * 0.6 + m.performance.costEfficiency * 0.4
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (failureRate > 0.1) {
      recommendations.push('Consider adding more reliable models to improve success rate');
    }
    
    if (Object.keys(modelUsage).length < 3) {
      recommendations.push('Consider adding more model diversity for better load distribution');
    }
    
    const freeModels = models.filter(m => m.costPer1kTokens === 0);
    if (freeModels.length === 0) {
      recommendations.push('Consider adding free models as fallbacks to reduce costs');
    }
    
    return {
      totalRoutingDecisions: totalDecisions,
      modelUsageDistribution: modelUsage,
      averageDecisionConfidence: 0.85, // Placeholder
      failureRate,
      topPerformingModels: topPerforming,
      recommendations
    };
  }

  /**
   * Update router configuration
   */
  public updateConfig(newConfig: Partial<IntelligentRoutingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔄 Router configuration updated');
  }

  /**
   * Get current configuration
   */
  public getConfig(): IntelligentRoutingConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const intelligentModelRouter = IntelligentModelRouter.getInstance();