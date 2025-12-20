import { Model, ModelCategory } from './models';
import { modelManager } from './model-manager';
import { aiClient, AIOptions, AIResponse } from './ai-client';

export interface QueryAnalysis {
  type: ModelCategory;
  complexity: 'simple' | 'medium' | 'complex';
  keywords: string[];
  requiresCode: boolean;
  requiresVision: boolean;
  isQuestion: boolean;
  estimatedTokens: number;
  urgency: 'low' | 'high';
  language: string;
}

export interface RoutingResult {
  selectedModel: Model;
  reasoning: string;
  confidence: number;
  alternatives: Model[];
  analysis: QueryAnalysis;
  fallbackChain: Model[];
}

export interface ProcessingResult extends AIResponse {
  routing: RoutingResult;
  attemptedModels: string[];
  finalModel: string;
}

export class IntelligentAIRouter {
  private static instance: IntelligentAIRouter;
  private routingCache = new Map<string, RoutingResult>();
  private failureHistory = new Map<string, number>();
  private readonly MAX_RETRIES = 3;

  private constructor() {}

  public static getInstance(): IntelligentAIRouter {
    if (!IntelligentAIRouter.instance) {
      IntelligentAIRouter.instance = new IntelligentAIRouter();
    }
    return IntelligentAIRouter.instance;
  }

  /**
   * Analyze query to determine the best approach
   */
  public analyzeQuery(query: string): QueryAnalysis {
    const queryLower = query.toLowerCase();
    const words = query.split(/\\s+/);
    const estimatedTokens = Math.ceil(words.length * 1.3);

    // Detect language
    const language = this.detectLanguage(query);

    // Extract keywords
    const keywords = words
      .filter(word => word.length > 3)
      .filter(word => /^[a-zA-Z]+$/.test(word))
      .slice(0, 10);

    // Detect query type and requirements
    let type: ModelCategory = 'CHAT';
    let requiresCode = false;
    let requiresVision = false;
    let isQuestion = false;

    // Code detection
    const codeKeywords = [
      'code', 'function', 'class', 'variable', 'algorithm', 'program', 'script',
      'debug', 'implement', 'develop', 'programming', 'software', 'api', 'database'
    ];
    const codeLanguages = [
      'python', 'javascript', 'java', 'html', 'css', 'sql', 'react', 'node',
      'typescript', 'go', 'rust', 'c++', 'php', 'ruby', 'swift', 'kotlin'
    ];
    
    if (codeKeywords.some(kw => queryLower.includes(kw)) || 
        codeLanguages.some(lang => queryLower.includes(lang))) {
      type = 'CODE';
      requiresCode = true;
    }

    // Vision detection
    const visionKeywords = [
      'image', 'picture', 'photo', 'visual', 'see', 'look', 'analyze image',
      'describe image', 'what do you see', 'screenshot', 'diagram'
    ];
    if (visionKeywords.some(vw => queryLower.includes(vw))) {
      type = 'VISION';
      requiresVision = true;
    }

    // Question detection
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'should', 'will'];
    if (questionWords.some(qw => queryLower.startsWith(qw)) || queryLower.includes('?')) {
      isQuestion = true;
    }

    // Reasoning detection
    const reasoningKeywords = [
      'analyze', 'explain', 'compare', 'evaluate', 'assess', 'critique',
      'reasoning', 'logic', 'philosophy', 'ethics', 'complex'
    ];
    if (reasoningKeywords.some(rw => queryLower.includes(rw))) {
      type = 'REASONING';
    }

    // Creative detection
    const creativeKeywords = [
      'write', 'create', 'story', 'poem', 'creative', 'fiction', 'blog',
      'article', 'content', 'marketing', 'generate'
    ];
    if (creativeKeywords.some(cw => queryLower.includes(cw)) && !requiresCode) {
      type = 'CREATIVE';
    }

    // Multimodal detection
    if (requiresVision || queryLower.includes('multimodal')) {
      type = 'MULTIMODAL';
    }

    // Complexity assessment
    let complexity: QueryAnalysis['complexity'] = 'simple';
    if (query.length > 500 || words.length > 100) {
      complexity = 'complex';
    } else if (query.length > 100 || words.length > 25) {
      complexity = 'medium';
    }

    // Urgency detection
    const urgentWords = ['urgent', 'quick', 'fast', 'asap', 'immediately', 'now'];
    const urgency = urgentWords.some(uw => queryLower.includes(uw)) ? 'high' : 'low';

    return {
      type,
      complexity,
      keywords,
      requiresCode,
      requiresVision,
      isQuestion,
      estimatedTokens,
      urgency,
      language
    };
  }

  /**
   * Route query to the best available model
   */
  public routeQuery(
    query: string, 
    userPreference?: string,
    constraints: {
      maxCost?: number;
      preferFree?: boolean;
      requiresSpeed?: boolean;
    } = {}
  ): RoutingResult {
    const analysis = this.analyzeQuery(query);
    
    // Check cache first
    const cacheKey = `${query.slice(0, 100)}:${JSON.stringify(constraints)}`;
    const cached = this.routingCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    let selectedModel: Model | null = null;
    let reasoning = '';
    let confidence = 0.8;

    // If user has a preference, try to use it
    if (userPreference) {
      selectedModel = modelManager.getModelById(userPreference);
      if (selectedModel) {
        reasoning = 'User preference';
        confidence = 1.0;
      }
    }

    // If no user preference or preference not available, route intelligently
    if (!selectedModel) {
      selectedModel = this.selectBestModel(analysis, constraints);
      if (selectedModel) {
        reasoning = this.generateReasoning(selectedModel, analysis);
        confidence = this.calculateConfidence(selectedModel, analysis);
      }
    }

    // Fallback chain
    const fallbackChain = this.buildFallbackChain(analysis, constraints, selectedModel);

    // Get alternatives
    const alternatives = this.getAlternatives(selectedModel, analysis, constraints);

    if (!selectedModel) {
      throw new Error('No suitable models available');
    }

    const result: RoutingResult = {
      selectedModel,
      reasoning,
      confidence,
      alternatives,
      analysis,
      fallbackChain
    };

    // Cache the result
    this.routingCache.set(cacheKey, result);

    return result;
  }

  /**
   * Process query with intelligent routing and fallback
   */
  public async processQuery(
    query: string,
    userPreference?: string,
    constraints: {
      maxCost?: number;
      preferFree?: boolean;
      requiresSpeed?: boolean;
    } = {},
    options: AIOptions = {}
  ): Promise<ProcessingResult> {
    const routing = this.routeQuery(query, userPreference, constraints);
    const attemptedModels: string[] = [];
    
    // Try primary model and fallbacks
    const modelsToTry = [routing.selectedModel, ...routing.fallbackChain];
    
    for (const model of modelsToTry) {
      try {
        attemptedModels.push(model.name);
        
        // Check failure history
        const failures = this.failureHistory.get(model.id) || 0;
        if (failures >= this.MAX_RETRIES) {
          console.log(`⏭️ Skipping ${model.name} due to recent failures`);
          continue;
        }

        console.log(`🤖 Trying ${model.name} (${model.provider})`);
        
        const response = await aiClient.callModel(model, query, options);
        
        if (response.success) {
          // Reset failure count on success
          this.failureHistory.delete(model.id);
          
          return {
            ...response,
            routing,
            attemptedModels,
            finalModel: model.name
          };
        } else {
          // Track failure
          this.failureHistory.set(model.id, failures + 1);
          console.log(`❌ ${model.name} failed: ${response.error}`);
        }
        
      } catch (error) {
        const failures = this.failureHistory.get(model.id) || 0;
        this.failureHistory.set(model.id, failures + 1);
        console.log(`❌ ${model.name} error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    // If all models failed, return error with last attempt
    const lastModel = modelsToTry[modelsToTry.length - 1];
    return {
      content: `I apologize, but I'm currently experiencing technical difficulties. All available models (${attemptedModels.join(', ')}) are temporarily unavailable. Please try again in a few moments.`,
      model: lastModel.name,
      provider: lastModel.provider,
      tokens: 50,
      cost: 0,
      latency: 0,
      success: false,
      error: 'All models failed',
      routing,
      attemptedModels,
      finalModel: 'none'
    };
  }

  /**
   * Select the best model for the analysis
   */
  private selectBestModel(
    analysis: QueryAnalysis, 
    constraints: { maxCost?: number; preferFree?: boolean; requiresSpeed?: boolean }
  ): Model | null {
    const preferences = {
      maxCost: constraints.maxCost,
      preferFree: constraints.preferFree,
      requiresVision: analysis.requiresVision,
      requiresCode: analysis.requiresCode,
      requiresSpeed: constraints.requiresSpeed || analysis.urgency === 'high'
    };

    // First try to get a model from the specific category
    let model = modelManager.getBestModelForTask(analysis.type, preferences);
    
    // If no model found, try related categories
    if (!model) {
      const fallbackCategories = this.getFallbackCategories(analysis.type);
      for (const category of fallbackCategories) {
        model = modelManager.getBestModelForTask(category, preferences);
        if (model) break;
      }
    }

    // Last resort: any available model
    if (!model) {
      const allModels = modelManager.getAllModels();
      model = allModels.find(m => 
        (!preferences.maxCost || m.costPer1kTokens <= preferences.maxCost) &&
        (!preferences.requiresVision || m.supportsVision) &&
        (!preferences.requiresCode || m.supportsCode)
      ) || null;
    }

    return model;
  }

  /**
   * Build fallback chain
   */
  private buildFallbackChain(
    analysis: QueryAnalysis,
    constraints: any,
    primaryModel: Model | null
  ): Model[] {
    const chain: Model[] = [];
    
    // Add free models as fallbacks
    if (!constraints.preferFree) {
      const freeModels = modelManager.getFreeModels()
        .filter(m => m.id !== primaryModel?.id)
        .filter(m => !analysis.requiresVision || m.supportsVision)
        .filter(m => !analysis.requiresCode || m.supportsCode)
        .slice(0, 2);
      
      chain.push(...freeModels);
    }

    // Always add the ultimate fallback
    const fallback = modelManager.getFallbackModel();
    if (fallback && !chain.some(m => m.id === fallback.id)) {
      chain.push(fallback);
    }

    return chain;
  }

  /**
   * Get alternative models
   */
  private getAlternatives(
    selectedModel: Model | null,
    analysis: QueryAnalysis,
    constraints: any
  ): Model[] {
    return modelManager.getModelsByCategory(analysis.type)
      .filter(m => m.id !== selectedModel?.id)
      .filter(m => !constraints.maxCost || m.costPer1kTokens <= constraints.maxCost)
      .slice(0, 3);
  }

  /**
   * Generate reasoning for model selection
   */
  private generateReasoning(model: Model, analysis: QueryAnalysis): string {
    const reasons: string[] = [];
    
    if (analysis.type === 'CODE' && model.supportsCode) {
      reasons.push('optimized for code generation');
    }
    
    if (analysis.requiresVision && model.supportsVision) {
      reasons.push('supports image analysis');
    }
    
    if (analysis.complexity === 'complex' && model.modelSize?.includes('70B')) {
      reasons.push('large model for complex reasoning');
    }
    
    if (analysis.urgency === 'high' && (model.category === 'FAST' || model.strengths.includes('fast'))) {
      reasons.push('optimized for speed');
    }
    
    if (model.costPer1kTokens === 0) {
      reasons.push('free model');
    }
    
    if (reasons.length === 0) {
      reasons.push('best available model for this task');
    }
    
    return `Selected ${model.name} because it's ${reasons.join(' and ')}`;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(model: Model, analysis: QueryAnalysis): number {
    let confidence = 0.7; // Base confidence
    
    // Boost confidence for exact matches
    if (model.category === analysis.type) confidence += 0.2;
    if (analysis.requiresCode && model.supportsCode) confidence += 0.1;
    if (analysis.requiresVision && model.supportsVision) confidence += 0.1;
    
    // Reduce confidence for mismatches
    if (analysis.requiresCode && !model.supportsCode) confidence -= 0.3;
    if (analysis.requiresVision && !model.supportsVision) confidence -= 0.3;
    
    return Math.min(1.0, Math.max(0.1, confidence));
  }

  /**
   * Get fallback categories for a given type
   */
  private getFallbackCategories(type: ModelCategory): ModelCategory[] {
    const fallbacks: Record<ModelCategory, ModelCategory[]> = {
      'CODE': ['CHAT', 'REASONING', 'FAST'],
      'VISION': ['MULTIMODAL', 'CHAT', 'REASONING'],
      'MULTIMODAL': ['VISION', 'CHAT', 'REASONING'],
      'REASONING': ['CHAT', 'CODE', 'FAST'],
      'CREATIVE': ['CHAT', 'REASONING', 'FAST'],
      'FAST': ['CHAT', 'CODE', 'REASONING'],
      'CHAT': ['REASONING', 'FAST', 'CODE']
    };
    
    return fallbacks[type] || ['CHAT', 'FAST'];
  }

  /**
   * Detect language from query
   */
  private detectLanguage(query: string): string {
    // Simple language detection - could be enhanced
    const frenchWords = ['le', 'la', 'les', 'de', 'et', 'à', 'un', 'une', 'ce', 'que'];
    const spanishWords = ['el', 'la', 'los', 'las', 'de', 'y', 'a', 'un', 'una', 'que'];
    const germanWords = ['der', 'die', 'das', 'und', 'zu', 'ein', 'eine', 'ich', 'ist', 'mit'];
    
    const queryLower = query.toLowerCase();
    
    if (frenchWords.some(word => queryLower.includes(` ${word} `))) return 'fr';
    if (spanishWords.some(word => queryLower.includes(` ${word} `))) return 'es';
    if (germanWords.some(word => queryLower.includes(` ${word} `))) return 'de';
    
    return 'en';
  }

  /**
   * Get system status
   */
  public getSystemStatus() {
    const modelStatus = modelManager.getSystemStatus();
    const cacheStatus = aiClient.getCacheStatus();
    
    return {
      ...modelStatus,
      cache: cacheStatus,
      failureHistory: Object.fromEntries(this.failureHistory),
      routingCacheSize: this.routingCache.size
    };
  }

  /**
   * Clear all caches
   */
  public clearCache(): void {
    this.routingCache.clear();
    this.failureHistory.clear();
    aiClient.clearCache();
    modelManager.clearCache();
  }

  /**
   * Test the routing system
   */
  public async testSystem(): Promise<{
    success: boolean;
    results: Array<{ query: string; model: string; success: boolean; error?: string }>;
  }> {
    const testQueries = [
      'Write a Python function to sort a list',
      'What is machine learning?',
      'Create a story about a robot',
      'Quick test response',
      'Analyze this complex problem step by step'
    ];

    const results = [];
    let allSuccess = true;

    for (const query of testQueries) {
      try {
        const result = await this.processQuery(query);
        results.push({
          query,
          model: result.finalModel,
          success: result.success,
          error: result.error
        });
        
        if (!result.success) allSuccess = false;
      } catch (error) {
        results.push({
          query,
          model: 'none',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        allSuccess = false;
      }
    }

    return { success: allSuccess, results };
  }
}

// Export singleton instance
export const aiRouter = IntelligentAIRouter.getInstance();