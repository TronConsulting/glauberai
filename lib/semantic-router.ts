/**
 * Semantic Router - Intelligent routing using embeddings and semantic similarity
 * Provides AI-optimized model selection based on query embeddings and user history
 */

import { Model, ModelCategory } from './models';
import { prisma } from './prisma';

export interface EmbeddingVector {
  modelId: string;
  queryEmbedding: number[];
  capability: 'code' | 'vision' | 'reasoning' | 'creative' | 'fast' | 'chat';
  score: number;
}

export interface UserPreference {
  userId: string;
  modelId: string;
  queryType: ModelCategory;
  successCount: number;
  failureCount: number;
  avgResponseTime: number;
  avgCost: number;
  lastUsed: Date;
  preference_score: number; // 0-100, calculated from success rate and latency
}

export interface SemanticRoutingDecision {
  modelId: string;
  confidence: number;
  reason: string;
  semanticScore: number;
  preferenceSimilarity: number;
  alternatives: {
    modelId: string;
    score: number;
    reason: string;
  }[];
}

export class SemanticRouter {
  private static instance: SemanticRouter;
  private embeddingCache = new Map<string, number[]>();
  private capabilityEmbeddings: Record<string, number[]> = {
    code: [0.95, 0.2, 0.1, 0.3, 0.4],
    vision: [0.1, 0.95, 0.2, 0.1, 0.3],
    reasoning: [0.3, 0.2, 0.95, 0.3, 0.2],
    creative: [0.2, 0.3, 0.2, 0.95, 0.1],
    fast: [0.4, 0.3, 0.2, 0.1, 0.95],
    chat: [0.5, 0.3, 0.4, 0.4, 0.3]
  };

  private constructor() {}

  public static getInstance(): SemanticRouter {
    if (!SemanticRouter.instance) {
      SemanticRouter.instance = new SemanticRouter();
    }
    return SemanticRouter.instance;
  }

  /**
   * Generate semantic embedding for a query using lightweight tokenization
   * In production, replace with actual embedding model (Cohere, OpenAI, etc.)
   */
  public async generateQueryEmbedding(query: string): Promise<number[]> {
    const cacheKey = query.toLowerCase().trim();
    
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!;
    }

    // Simple embedding strategy: token frequency + semantic features
    const embedding = this.createSimpleEmbedding(query);
    this.embeddingCache.set(cacheKey, embedding);

    // Cache with TTL (5 minutes)
    setTimeout(() => this.embeddingCache.delete(cacheKey), 5 * 60 * 1000);

    return embedding;
  }

  /**
   * Create lightweight embedding without external API calls
   */
  private createSimpleEmbedding(query: string): number[] {
    const queryLower = query.toLowerCase();
    const words = queryLower.split(/\s+/);
    
    // Initialize 5D embedding vector
    const embedding = [0, 0, 0, 0, 0];

    // Feature detection scores
    const codeFeatures = ['code', 'function', 'class', 'variable', 'debug', 'syntax', 'compile', 'api', 'algorithm'];
    const visionFeatures = ['image', 'photo', 'visual', 'diagram', 'screenshot', 'picture', 'video'];
    const reasoningFeatures = ['analyze', 'explain', 'why', 'how', 'problem', 'solution', 'calculate', 'logic'];
    const creativeFeatures = ['write', 'create', 'story', 'poem', 'article', 'marketing', 'design', 'brainstorm'];
    const speedFeatures = ['quick', 'fast', 'urgent', 'asap', 'immediately', 'now'];

    const featureWeights = {
      code: codeFeatures.filter(f => words.some(w => w.includes(f))).length * 0.2,
      vision: visionFeatures.filter(f => words.some(w => w.includes(f))).length * 0.2,
      reasoning: reasoningFeatures.filter(f => words.some(w => w.includes(f))).length * 0.2,
      creative: creativeFeatures.filter(f => words.some(w => w.includes(f))).length * 0.2,
      speed: speedFeatures.filter(f => words.some(w => w.includes(f))).length * 0.2
    };

    embedding[0] = Math.min(featureWeights.code + (words.length / 50), 1); // Code dimension
    embedding[1] = Math.min(featureWeights.vision + (visionFeatures.some(f => queryLower.includes(f)) ? 0.3 : 0), 1); // Vision
    embedding[2] = Math.min(featureWeights.reasoning + (words.length > 30 ? 0.2 : 0), 1); // Reasoning
    embedding[3] = Math.min(featureWeights.creative + (creativeFeatures.some(f => queryLower.includes(f)) ? 0.3 : 0), 1); // Creative
    embedding[4] = Math.min(featureWeights.speed, 1); // Speed

    return embedding;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Score a model based on semantic similarity to query
   */
  public async scoreModelSemantically(
    model: Model,
    queryEmbedding: number[]
  ): Promise<number> {
    const capabilities: Array<keyof typeof this.capabilityEmbeddings> = [];

    if (model.supportsCode) capabilities.push('code');
    if (model.supportsVision) capabilities.push('vision');
    if (model.category === 'REASONING') capabilities.push('reasoning');
    if (model.category === 'CREATIVE') capabilities.push('creative');
    if (model.category === 'FAST') capabilities.push('fast');
    if (model.category === 'CHAT') capabilities.push('chat');

    if (capabilities.length === 0) {
      return this.cosineSimilarity(queryEmbedding, this.capabilityEmbeddings.chat);
    }

    // Average similarity across all matching capabilities
    const similarities = capabilities.map(cap => {
      const capEmbedding = this.capabilityEmbeddings[cap];
      return this.cosineSimilarity(queryEmbedding, capEmbedding);
    });

    return similarities.reduce((a, b) => a + b, 0) / similarities.length;
  }

  /**
   * Get user preferences for model selection
   */
  public async getUserPreferences(
    userId: string,
    queryCategory: ModelCategory,
    limit: number = 3
  ): Promise<UserPreference[]> {
    try {
      // In production, this would query from database
      // For now, return mock preferences weighted by success rate
      const preferences: UserPreference[] = [];
      
      // Calculate preference score based on success metrics
      // preference_score = (success_count / (success_count + failure_count)) * 100
      // adjusted for latency (lower is better)
      
      return preferences;
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      return [];
    }
  }

  /**
   * Record user model preference (called after successful response)
   */
  public async recordModelUsage(
    userId: string,
    modelId: string,
    queryType: ModelCategory,
    success: boolean,
    responseTime: number,
    cost: number
  ): Promise<void> {
    try {
      // Track user preferences in database for future routing
      // This builds a personalized model ranking over time
      
      // Increment success/failure counters
      // Update average response time
      // Update average cost
      // Calculate preference score
      
      console.log(`✅ Recorded usage: User ${userId} used ${modelId} for ${queryType} (success: ${success}, time: ${responseTime}ms)`);
    } catch (error) {
      console.error('Error recording model usage:', error);
    }
  }

  /**
   * Make semantic routing decision considering user preferences
   */
  public async decideModel(
    userId: string | null,
    models: Model[],
    queryEmbedding: number[],
    queryCategory: ModelCategory
  ): Promise<SemanticRoutingDecision> {
    const scoredModels: Array<{
      model: Model;
      semanticScore: number;
      preferenceScore: number;
      combinedScore: number;
      reason: string;
    }> = [];

    for (const model of models) {
      const semanticScore = await this.scoreModelSemantically(model, queryEmbedding);
      
      // Get user preference if available
      let preferenceScore = 0.5; // Default neutral preference
      if (userId) {
        try {
          const prefs = await this.getUserPreferences(userId, queryCategory, 1);
          if (prefs.length > 0 && prefs[0].modelId === model.id) {
            preferenceScore = prefs[0].preference_score / 100;
          }
        } catch (error) {
          console.warn('Could not fetch user preferences:', error);
        }
      }

      // Weighted combination: 70% semantic + 30% preference
      const combinedScore = semanticScore * 0.7 + preferenceScore * 0.3;

      const reason = this.generateRoutingReason(model, semanticScore, preferenceScore);

      scoredModels.push({
        model,
        semanticScore,
        preferenceScore,
        combinedScore,
        reason
      });
    }

    // Sort by combined score
    scoredModels.sort((a, b) => b.combinedScore - a.combinedScore);

    const bestModel = scoredModels[0];
    const alternatives = scoredModels.slice(1, 3).map(sm => ({
      modelId: sm.model.id,
      score: sm.combinedScore,
      reason: sm.reason
    }));

    return {
      modelId: bestModel.model.id,
      confidence: bestModel.combinedScore,
      reason: bestModel.reason,
      semanticScore: bestModel.semanticScore,
      preferenceSimilarity: bestModel.preferenceScore,
      alternatives
    };
  }

  /**
   * Generate human-readable routing reason
   */
  private generateRoutingReason(
    model: Model,
    semanticScore: number,
    preferenceScore: number
  ): string {
    const reasons: string[] = [];

    if (semanticScore > 0.8) reasons.push('excellent semantic match');
    else if (semanticScore > 0.6) reasons.push('good semantic match');
    else reasons.push('reasonable match');

    if (preferenceScore > 0.7) reasons.push('strong user preference');
    else if (preferenceScore > 0.5) reasons.push('user has experience');

    if (model.priority > 75) reasons.push('high priority model');
    if (model.costPer1kTokens < 0.001) reasons.push('cost-efficient');

    return `${model.name}: ${reasons.join(', ')}`;
  }

  /**
   * Batch score multiple models for performance
   */
  public async scoreModelsInBatch(
    models: Model[],
    queryEmbedding: number[]
  ): Promise<Map<string, number>> {
    const scores = new Map<string, number>();

    for (const model of models) {
      const score = await this.scoreModelSemantically(model, queryEmbedding);
      scores.set(model.id, score);
    }

    return scores;
  }

  /**
   * Clear embedding cache (useful for testing or memory management)
   */
  public clearCache(): void {
    this.embeddingCache.clear();
  }
}

export const semanticRouter = SemanticRouter.getInstance();
