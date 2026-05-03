import { Model, ModelCategory } from './models';
import { modelManager } from './model-manager';
import { aiClient, AIOptions, AIResponse } from './ai-client';
import {
  enhancedModelManager,
  EnhancedModelManager
} from './enhanced-model-manager';
import {
  intelligentModelRouter,
  RoutingDecision
} from './intelligent-model-router';
import {
  dynamicModelRegistry,
  DynamicModel
} from './dynamic-model-registry';
import { intelligentKeyManager } from './intelligent-key-manager';

export interface QueryAnalysis {
   primaryType: ModelCategory;
   secondaryTypes: ModelCategory[];
   complexity: 'simple' | 'medium' | 'complex';
   keywords: string[];
   requiresCode: boolean;
   requiresVision: boolean;
   isQuestion: boolean;
   estimatedTokens: number;
   urgency: 'low' | 'high';
   language: string;
   // Additional capability flags for more precise routing
   requiresReasoning: boolean;
   requiresCreative: boolean;
   requiresFast: boolean;
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
  routing: RoutingDecision;
  attemptedModels: string[];
  finalModel: string;
  performance?: {
    routingTime: number;
    totalTime: number;
    fallbacksUsed: number;
  };
}

export class IntelligentAIRouter {
  private static instance: IntelligentAIRouter;
  private routingCache = new Map<string, RoutingResult>();
  private failureHistory = new Map<string, number>();
  private readonly MAX_RETRIES = 3;

  private constructor() { }

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
    const normalizedQuery = queryLower.replace(/[^a-z0-9\s]/gi, ' ');
    const words = normalizedQuery.split(/\s+/).filter(Boolean);
    const estimatedTokens = Math.ceil(words.length * 1.2);

    const language = this.detectLanguage(query);

    const keywordCandidates = words
      .filter(word => word.length > 3)
      .filter(word => /^[a-zA-Z]+$/.test(word));

    const keywordCounts = keywordCandidates.reduce<Record<string, number>>((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {});

    const keywords = Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    const intentPatterns: Record<string, RegExp[]> = {
      code: [
        /\bcode\b/, /\bfunction\b/, /\bclass\b/, /\bdebug\b/, /\bprogram\b/, /\bscript\b/,
        /\bcompile\b/, /\bpython\b/, /\bjavascript\b/, /\btypescript\b/, /\brust\b/, /\bjava\b/, /\bgo\b/
      ],
      reasoning: [
        /\banalyze\b/, /\bevaluate\b/, /\bcompare\b/, /\bcritique\b/, /\bassess\b/, /\bwhy\b/,
        /\blogic\b/, /\bstrategy\b/, /\bdecision\b/, /\bplanning\b/, /\bdesign\b/
      ],
      creative: [
        /\bwrite\b/, /\bcreate\b/, /\bstory\b/, /\bpoem\b/, /\bmarketing\b/, /\bblog\b/,
        /\barticle\b/, /\bcopy\b/, /\bgenerate\b/, /\bcreative\b/
      ],
      vision: [
        /\bimage\b/, /\bpicture\b/, /\bphoto\b/, /\bvisual\b/, /\bscreenshot\b/, /\bdiagram\b/,
        /\banalyze image\b/, /\bvision\b/, /\bmultimodal\b/
      ],
      summarize: [
        /\bsummariz(e|ation)\b/, /\bsummary\b/, /\bcondense\b/, /\bshorten\b/, /\brecap\b/, /\babstract\b/
      ],
      translate: [
        /\btranslate\b/, /\btranslation\b/, /\blanguage\b/, /\blocalize\b/, /\bmultilingual\b/
      ],
      explain: [
        /\bexplain\b/, /\bwalk through\b/, /\bdescribe\b/, /\bteach\b/, /\bdemonstrate\b/
      ],
      math: [
        /\bcalculate\b/, /\bsolve\b/, /\bformula\b/, /\balgebra\b/, /\bstatistics\b/, /\bprobability\b/, /\bmath\b/
      ],
      data: [
        /\bdata\b/, /\bchart\b/, /\bgraph\b/, /\btable\b/, /\bdatabase\b/, /\bsql\b/, /\bspreadsheet\b/
      ],
      planning: [
        /\bplan\b/, /\broadmap\b/, /\bworkflow\b/, /\bproject\b/, /\bstrategy\b/, /\borganize\b/, /\bschedule\b/
      ],
      research: [
        /\bresearch\b/, /\binvestigate\b/, /\banalyze\b/, /\bstudy\b/, /\bexplore\b/, /\bdiscover\b/
      ],
      teaching: [
        /\bteach\b/, /\blearn\b/, /\btutorial\b/, /\bguide\b/, /\bexplain\b/, /\bdemonstrate\b/, /\blearning\b/
      ]
    };

    const intentTags = Object.entries(intentPatterns)
      .filter(([, patterns]) => patterns.some(pattern => pattern.test(queryLower)))
      .map(([tag]) => tag);

    const urgentWords = ['urgent', 'quick', 'fast', 'asap', 'immediately', 'now', 'as soon as possible'];
    const urgency = urgentWords.some(uw => queryLower.includes(uw)) ? 'high' : 'low';

    const requiresCode = intentTags.includes('code');
    const requiresVision = intentTags.includes('vision') || intentTags.includes('multimodal');
    const requiresReasoning = intentTags.includes('reasoning') || intentTags.includes('math') || intentTags.includes('planning') || intentTags.includes('research') || intentTags.includes('analyze');
    const requiresCreative = intentTags.includes('creative') || intentTags.includes('teaching') || intentTags.includes('write');
    const requiresFast = urgency === 'high' || intentTags.includes('fast') || intentTags.includes('quick');
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'should', 'will'];
    const isQuestion = questionWords.some(qw => queryLower.startsWith(`${qw} `)) || queryLower.includes('?');

    const subtasks: string[] = [];
    if (/(write|generate|create).*(and explain|and document|with explanation|and comment)/.test(queryLower) || /\bexplain.*code\b/.test(queryLower)) {
      subtasks.push('code_explain');
    }
    if (/(summarize|summary|recap|condense).*?(article|text|document|paper)?/.test(queryLower)) {
      subtasks.push('summarize');
    }
    if (/(translate|translation|localize)/.test(queryLower)) {
      subtasks.push('translate');
    }
    if (/(debug|fix|troubleshoot).*?(code|program|script)/.test(queryLower)) {
      subtasks.push('debug_code');
    }
    if (/(review|analyze|audit).*?(code|program|script)/.test(queryLower)) {
      subtasks.push('code_review');
    }
    if (/(optimize|improve|refactor).*?(code|performance|speed)/.test(queryLower)) {
      subtasks.push('optimize_code');
    }

    // Determine primary and secondary types
    let primaryType: ModelCategory = 'CHAT';
    const secondaryTypes: ModelCategory[] = [];

    if (requiresCode) {
      primaryType = 'CODE';
      if (requiresReasoning) secondaryTypes.push('REASONING');
    } else if (requiresVision) {
      primaryType = 'VISION';
      if (intentTags.includes('multimodal')) secondaryTypes.push('MULTIMODAL');
    } else if (intentTags.includes('multimodal')) {
      primaryType = 'MULTIMODAL';
    } else if (requiresReasoning) {
      primaryType = 'REASONING';
    } else if (requiresCreative) {
      primaryType = 'CREATIVE';
    }

    // Add secondary types for complex queries
    if (intentTags.length >= 2) {
      if (intentTags.includes('summarize') && !secondaryTypes.includes('REASONING')) secondaryTypes.push('REASONING');
      if (intentTags.includes('translate') && !secondaryTypes.includes('REASONING')) secondaryTypes.push('REASONING');
    }

    let complexity: QueryAnalysis['complexity'] = 'simple';
    if (query.length > 450 || words.length > 80 || subtasks.length > 0 || intentTags.length >= 3) {
      complexity = 'complex';
    } else if (query.length > 120 || words.length > 25) {
      complexity = 'medium';
    }
    return {
      primaryType,
      secondaryTypes,
      complexity,
      keywords,
      intentTags,
      subtasks,
      requiresCode,
      requiresVision,
      requiresReasoning,
      requiresCreative,
      requiresFast,
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
    availableModels?: Model[],
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
      selectedModel = this.selectBestModel(analysis, constraints, availableModels);
      if (selectedModel) {
        reasoning = this.generateReasoning(selectedModel, analysis);
        confidence = this.calculateConfidence(selectedModel, analysis);
      }
    }

    // Fallback chain
    const fallbackChain = this.buildFallbackChain(analysis, constraints, selectedModel, availableModels);

    // Get alternatives
    const alternatives = this.getAlternatives(selectedModel, analysis, constraints, availableModels);

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
   * Process query with intelligent routing and fallback (Enhanced Version)
   */
  public async processQueryEnhanced(
    query: string,
    category: ModelCategory = 'CHAT',
    userPreference?: string,
    constraints: {
      maxCost?: number;
      preferFree?: boolean;
      requiresSpeed?: boolean;
      requiresVision?: boolean;
      requiresCode?: boolean;
    } = {},
    options: AIOptions = {}
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    let routingTime = 0;
    let fallbacksUsed = 0;
    const attemptedModels: string[] = [];
    const modelErrors: Array<{ model: string; error: string; errorType: string }> = [];

    try {
      // Use enhanced intelligent routing
      const routingStartTime = Date.now();
      const routing = enhancedModelManager.routeIntelligently(query, category, {
        ...constraints,
        userPreference
      });
      routingTime = Date.now() - routingStartTime;

      // Try primary model and all its keys, then fallbacks
      const modelsToTry: DynamicModel[] = [routing.selectedModel, ...routing.fallbackChain];

      for (const model of modelsToTry) {
        // Skip if all keys for this model are unhealthy
        if (intelligentKeyManager.shouldSkipModel(model.id)) {
          console.log(`⚠️ Skipping ${model.name} - all API keys unhealthy`);
          attemptedModels.push(`${model.name} (unhealthy)`);
          fallbacksUsed++;
          continue;
        }

        try {
          attemptedModels.push(model.name);
          console.log(`🤖 Trying ${model.name} (confidence: ${(routing.confidence * 100).toFixed(1)}%)`);

          const callStartTime = Date.now();
          // This tries all keys for the model intelligently
          const response = await aiClient.tryAllKeysForModel(model as Model, query, options);
          const callLatency = Date.now() - callStartTime;

          if (response.success) {
            intelligentModelRouter.recordModelResult(model.id, true, callLatency, response.cost);
            const totalTime = Date.now() - startTime;

            return {
              ...response,
              routing,
              attemptedModels,
              finalModel: model.name,
              performance: { routingTime, totalTime, fallbacksUsed }
            };
          } else {
            // Should not reach here if tryAllKeysForModel throws on failure
            const errorMsg = response.error || 'All keys failed silently';
            const errorType = this.classifyError(errorMsg);
            modelErrors.push({ model: model.name, error: errorMsg, errorType });
            intelligentModelRouter.recordModelResult(model.id, false, callLatency, 0);
            fallbacksUsed++;
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          const errorType = this.classifyError(errorMsg);
          
          console.log(`❌ ${model.name} failed (${errorType}): ${errorMsg}`);
          modelErrors.push({ model: model.name, error: errorMsg, errorType });
          
          intelligentModelRouter.recordModelResult(model.id, false, Date.now() - startTime, 0);
          fallbacksUsed++;
        }
      }

      // All models exhausted
      const totalTime = Date.now() - startTime;
      const errorSummary = this.generateErrorSummary(modelErrors, attemptedModels);

      return {
        content: errorSummary.message,
        model: routing.selectedModel.name,
        provider: routing.selectedModel.provider,
        tokens: 50,
        cost: 0,
        latency: totalTime,
        success: false,
        error: 'All models failed',
        routing,
        attemptedModels,
        finalModel: 'none',
        performance: { routingTime, totalTime, fallbacksUsed },
        metadata: {
          modelErrors,
          errorType: 'MODEL_UNAVAILABLE'
        }
      };

    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.warn('Enhanced routing failed, falling back to basic routing:', error);

      const fallbackModels = dynamicModelRegistry.getModelsWithPerformance()
        .filter(m => m.enabled)
        .slice(0, 3);

      if (fallbackModels.length === 0) {
        return {
          content: 'No models available',
          model: 'none',
          provider: 'none',
          tokens: 0,
          cost: 0,
          latency: totalTime,
          success: false,
          error: 'No models configured',
          routing: {
            selectedModel: {} as DynamicModel,
            reasoning: ['Fallback routing'],
            confidence: 0,
            alternatives: [],
            performanceScore: 0,
            costEfficiencyScore: 0,
            expectedLatency: 0,
            fallbackChain: []
          },
          attemptedModels: [],
          finalModel: 'none',
          performance: { routingTime, totalTime, fallbacksUsed }
        };
      }

      const fallbackModel = fallbackModels[0];
      try {
        const response = await aiClient.callModel(fallbackModel as Model, query, options);
        return {
          ...response,
          routing: {
            selectedModel: fallbackModel,
            reasoning: ['Fallback routing after enhanced routing failed'],
            confidence: 0.5,
            alternatives: [],
            performanceScore: 0.5,
            costEfficiencyScore: 0.5,
            expectedLatency: 5000,
            fallbackChain: []
          },
          attemptedModels: [fallbackModel.name],
          finalModel: fallbackModel.name,
          performance: { routingTime, totalTime, fallbacksUsed }
        };
      } catch (fallbackError) {
        return {
          content: 'All routing methods failed',
          model: 'none',
          provider: 'none',
          tokens: 0,
          cost: 0,
          latency: totalTime,
          success: false,
          error: 'Complete system failure',
          routing: {
            selectedModel: {} as DynamicModel,
            reasoning: ['Complete routing failure'],
            confidence: 0,
            alternatives: [],
            performanceScore: 0,
            costEfficiencyScore: 0,
            expectedLatency: 0,
            fallbackChain: []
          },
          attemptedModels: [],
          finalModel: 'none',
          performance: { routingTime, totalTime, fallbacksUsed }
        };
      }
    }
  }

  /**
   * Generate user-friendly error summary with actionable suggestions
   */
  private generateErrorSummary(
    modelErrors: Array<{ model: string; error: string; errorType: string }>,
    attemptedModels: string[]
  ): { message: string; suggestions: string[] } {
    const errorCounts = modelErrors.reduce((acc, { errorType }) => {
      acc[errorType] = (acc[errorType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const hasRateLimit = errorCounts['rate_limit'] > 0;
    const hasAuthErrors = errorCounts['auth'] > 0;
    const hasNetworkErrors = errorCounts['network'] > 0;
    const hasModelErrors = errorCounts['model_error'] > 0;

    let message = 'I apologize, but I encountered issues while processing your request.\n\n';
    
    const suggestions: string[] = [];

    if (hasRateLimit) {
      message += '⚠️ **Rate limits exceeded** on one or more AI services.\n\n';
      suggestions.push('Wait a few moments before trying again');
      suggestions.push('Consider upgrading your plan for higher rate limits');
    }

    if (hasAuthErrors) {
      message += '🔐 **Authentication errors** detected.\n\n';
      suggestions.push('Check that API keys are properly configured');
      suggestions.push('Verify API keys are valid and have not expired');
    }

    if (hasNetworkErrors) {
      message += '🌐 **Network connectivity issues** encountered.\n\n';
      suggestions.push('Check your internet connection');
      suggestions.push('Verify firewall/proxy settings');
    }

    if (hasModelErrors) {
      message += '⚠️ **Model availability issues** detected.\n\n';
      suggestions.push('Some AI services may be temporarily unavailable');
      suggestions.push('Try a different model or category');
    }

    if (modelErrors.length > 0) {
      message += `**Models attempted:** ${attemptedModels.join(' → ')}\n\n`;
      
      const uniqueErrors = [...new Set(modelErrors.map(e => e.error))].slice(0, 3);
      message += `**Errors encountered:**\n${uniqueErrors.map(e => `• ${e}`).join('\n')}\n\n`;
    }

    message += '**Suggestions:**\n';
    suggestions.forEach(s => message += `• ${s}\n`);

    if (suggestions.length === 0) {
      message += '• Please try again in a few moments\n';
      message += '• Try a simpler or shorter query\n';
      message += '• Contact support if the problem persists\n';
    }

    message += '\nIf the issue persists, please try again later or select a different AI model.';

    return { message, suggestions };
  }

  /**
   * Classify error type based on error message
   */
  private classifyError(error: string): 'rate_limit' | 'auth' | 'network' | 'model_error' | 'unknown' {
    const errorLower = error.toLowerCase();

    if (
      errorLower.includes('rate limit') ||
      errorLower.includes('too many requests') ||
      errorLower.includes('429') ||
      errorLower.includes('quota exceeded') ||
      errorLower.includes('exceeded rate') ||
      errorLower.includes('rate_limit') ||
      errorLower.includes('requests per minute') ||
      errorLower.includes('tpm limit') ||
      errorLower.includes('rpm limit')
    ) {
      return 'rate_limit';
    }

    if (
      errorLower.includes('unauthorized') ||
      errorLower.includes('invalid api key') ||
      errorLower.includes('authentication') ||
      errorLower.includes('auth') ||
      errorLower.includes('401') ||
      errorLower.includes('403') ||
      errorLower.includes('forbidden') ||
      errorLower.includes('invalid key') ||
      errorLower.includes('api key not valid')
    ) {
      return 'auth';
    }

    if (
      errorLower.includes('network') ||
      errorLower.includes('eof') ||
      errorLower.includes('timeout') ||
      errorLower.includes('connect') ||
      errorLower.includes('fetch') ||
      errorLower.includes('econnreset') ||
      errorLower.includes('enotfound') ||
      errorLower.includes('erefus') ||
      errorLower.includes('etimedout')
    ) {
      return 'network';
    }

    if (
      errorLower.includes('model') ||
      errorLower.includes('not found') ||
      errorLower.includes('capacity') ||
      errorLower.includes('overloaded') ||
      errorLower.includes('unavailable') ||
      errorLower.includes('503') ||
      errorLower.includes('502') ||
      errorLower.includes('500')
    ) {
      return 'model_error';
    }

    return 'unknown';
  }

  /**
   * Select the best model for the analysis
   */
  private selectBestModel(
    analysis: QueryAnalysis,
    constraints: { maxCost?: number; preferFree?: boolean; requiresSpeed?: boolean },
    availableModels?: Model[]
  ): Model | null {
     const preferences = {
       maxCost: constraints.maxCost,
       preferFree: constraints.preferFree,
       requiresVision: analysis.requiresVision,
       requiresCode: analysis.requiresCode,
       requiresReasoning: analysis.requiresReasoning,
       requiresCreative: analysis.requiresCreative,
       requiresSpeed: constraints.requiresSpeed || analysis.requiresFast || analysis.urgency === 'high'
     };

    const modelsToSearch = availableModels || modelManager.getAllModels();

    const candidateModels = modelsToSearch.filter(m =>
      (!preferences.maxCost || m.costPer1kTokens <= preferences.maxCost) &&
      (!preferences.requiresVision || m.supportsVision) &&
      (!preferences.requiresCode || m.supportsCode) &&
      m.enabled
    );

    if (candidateModels.length === 0) {
      return null;
    }

    const strengthScore = (model: Model): number => {
      let score = 0;
      const strengths = model.strengths.map(s => s.toLowerCase());
      const matches = (pattern: RegExp): boolean => strengths.some(str => pattern.test(str));

      if (analysis.requiresCode && model.supportsCode) score += 22;
      if (analysis.requiresVision && model.supportsVision) score += 22;
      if (analysis.requiresReasoning && matches(/reasoning|analysis|chain-of-thought|complex|math|science/)) score += 20;
      if (analysis.requiresCreative && matches(/creative|story|marketing|copy|high-quality/)) score += 18;
      if (analysis.subtasks.includes('code_explain') && matches(/reasoning|instruction|analysis/)) score += 16;
      if (analysis.subtasks.includes('debug_code') && matches(/reasoning|debugging|analysis|code/)) score += 16;
      if (analysis.subtasks.includes('code_review') && matches(/reasoning|analysis|code|quality/)) score += 16;
      if (analysis.subtasks.includes('optimize_code') && matches(/reasoning|optimization|efficiency|code/)) score += 16;
      if (analysis.intentTags.includes('creative') && matches(/creative|story|marketing|copy|high-quality/)) score += 18;
      if (analysis.intentTags.includes('reasoning') && matches(/reasoning|analysis|chain-of-thought|complex|math|science/)) score += 18;
      if (analysis.intentTags.includes('vision') && matches(/vision|image|visual|multimodal|document-understanding/)) score += 18;
      if (analysis.intentTags.includes('summarize') && matches(/concise|summary|instruction|analysis/)) score += 14;
      if (analysis.intentTags.includes('translate') && matches(/multilingual|translation|language/)) score += 14;
      if (analysis.intentTags.includes('math') && matches(/math|algorithms|science|complex|reasoning/)) score += 14;
      if (analysis.intentTags.includes('planning') && matches(/strategy|workflow|design|planning|organization/)) score += 12;
      if (analysis.intentTags.includes('research') && matches(/research|analysis|investigation|exploration/)) score += 14;
      if (analysis.intentTags.includes('teaching') && matches(/teaching|instruction|explanation|education/)) score += 12;
      if (model.category === analysis.type) score += 12;
      if (preferences.requiresSpeed && (model.category === 'FAST' || matches(/fast|ultra-fast|real-time|efficient/))) score += 10;
      if (preferences.preferFree && model.costPer1kTokens === 0) score += 10;
      score += Math.max(0, 10 - model.priority);
      return score;
    };

    const candidatesWithScore = candidateModels.map(m => ({ model: m, score: strengthScore(m) + (100 - m.priority) * 0.5 }));
    candidatesWithScore.sort((a, b) => b.score - a.score);

    if (candidatesWithScore[0]) {
      return candidatesWithScore[0].model;
    }

    return candidateModels[0] || null;
  }

  /**
   * Build fallback chain
   */
  private buildFallbackChain(
    analysis: QueryAnalysis,
    constraints: any,
    primaryModel: Model | null,
    availableModels?: Model[]
  ): Model[] {
    const chain: Model[] = [];

    const modelsToSearch = availableModels || modelManager.getAllModels();

    // Add free models as fallbacks
    if (!constraints.preferFree) {
      const freeModels = modelsToSearch
        .filter(m => m.costPer1kTokens === 0)
        .filter(m => m.id !== primaryModel?.id)
        .filter(m => !analysis.requiresVision || m.supportsVision)
        .filter(m => !analysis.requiresCode || m.supportsCode)
        .filter(m => m.enabled)
        .slice(0, 2);

      chain.push(...freeModels);
    }

    // Always add the ultimate fallback (GPT-2 or first available free model)
    const fallback = modelsToSearch.find(m => m.id === 'gpt2' || m.costPer1kTokens === 0);
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
    constraints: any,
    availableModels?: Model[]
  ): Model[] {
    const modelsToSearch = availableModels || modelManager.getAllModels();

    return modelsToSearch
      .filter(m => m.category === analysis.type || !availableModels)
      .filter(m => m.id !== selectedModel?.id)
      .filter(m => !constraints.maxCost || m.costPer1kTokens <= constraints.maxCost)
      .filter(m => m.enabled)
      .slice(0, 3);
  }

  /**
   * Generate reasoning for model selection
   */
  private generateReasoning(model: Model, analysis: QueryAnalysis): string {
    const reasons: string[] = [];

    if (analysis.requiresCode && model.supportsCode) {
      reasons.push('strong code generation capabilities');
    }

    if (analysis.requiresVision && model.supportsVision) {
      reasons.push('specialized for vision and multimodal tasks');
    }

    if (analysis.subtasks.includes('code_explain') && model.strengths.some(s => /reasoning|instruction/.test(s.toLowerCase()))) {
      reasons.push('well suited for code explanation and reasoning');
    }

    if (analysis.intentTags.includes('creative') && model.strengths.some(s => /creative|story|marketing|copy/.test(s.toLowerCase()))) {
      reasons.push('optimized for creative generation');
    }

    if (analysis.intentTags.includes('reasoning') && model.strengths.some(s => /reasoning|analysis|chain-of-thought|complex/.test(s.toLowerCase()))) {
      reasons.push('strong reasoning and analysis ability');
    }

    if (analysis.urgency === 'high' && (model.category === 'FAST' || model.strengths.includes('fast'))) {
      reasons.push('prioritizes speed');
    }

    if (analysis.intentTags.includes('translate') && model.strengths.some(s => /multilingual|translation/.test(s.toLowerCase()))) {
      reasons.push('has translation strengths');
    }

    if (model.costPer1kTokens === 0) {
      reasons.push('available at no token cost');
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
    let confidence = 0.7;

    if (model.category === analysis.type) confidence += 0.2;
    if (analysis.requiresCode && model.supportsCode) confidence += 0.15;
    if (analysis.requiresVision && model.supportsVision) confidence += 0.15;
    if (analysis.subtasks.includes('code_explain') && model.strengths.some(s => /reasoning|instruction/.test(s.toLowerCase()))) {
      confidence += 0.1;
    }

    if (analysis.intentTags.includes('creative') && model.strengths.some(s => /creative|story|marketing|copy/.test(s.toLowerCase()))) {
      confidence += 0.1;
    }

    if (analysis.intentTags.includes('reasoning') && model.strengths.some(s => /reasoning|analysis|chain-of-thought|complex/.test(s.toLowerCase()))) {
      confidence += 0.1;
    }

    if (analysis.requiresCode && !model.supportsCode) confidence -= 0.25;
    if (analysis.requiresVision && !model.supportsVision) confidence -= 0.25;

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
      'CHAT': ['REASONING', 'FAST', 'CODE'],
      // New AI mode fallbacks
      'IMAGE_GEN': ['MULTIMODAL', 'CREATIVE', 'CHAT'],
      'VIDEO_GEN': ['IMAGE_GEN', 'MULTIMODAL', 'CREATIVE'],
      'AUDIO_STT': ['MULTIMODAL', 'CHAT', 'FAST'],
      'AUDIO_TTS': ['MULTIMODAL', 'CHAT', 'FAST'],
      'EMBEDDING': ['CHAT', 'REASONING', 'FAST']
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
        const result = await this.processQueryEnhanced(query);
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
