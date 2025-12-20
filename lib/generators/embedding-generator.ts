/**
 * Embedding Generator Service
 * Handles text embedding generation for semantic search and RAG applications
 */

import { Model, ALL_MODELS } from '../models';

export interface EmbeddingRequest {
    texts: string | string[];
    model?: 'text-embedding-3-small' | 'text-embedding-3-large' | 'text-embedding-ada-002';
    dimensions?: number;       // Only for text-embedding-3-* models (256-3072)
    encodingFormat?: 'float' | 'base64';
}

export interface EmbeddingResult {
    embeddings: number[][];
    model: string;
    provider: string;
    dimensions: number;
    usage: {
        promptTokens: number;
        totalTokens: number;
    };
    cost: number;
    latency: number;
    success: boolean;
    error?: string;
}

export interface SimilarityResult {
    index: number;
    text: string;
    similarity: number;
}

export class EmbeddingGenerator {
    private static instance: EmbeddingGenerator;

    private constructor() { }

    public static getInstance(): EmbeddingGenerator {
        if (!EmbeddingGenerator.instance) {
            EmbeddingGenerator.instance = new EmbeddingGenerator();
        }
        return EmbeddingGenerator.instance;
    }

    /**
     * Generate embeddings for one or more texts
     */
    public async generate(request: EmbeddingRequest): Promise<EmbeddingResult> {
        const startTime = Date.now();
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return {
                embeddings: [],
                model: 'text-embedding-3-small',
                provider: 'openai',
                dimensions: 0,
                usage: { promptTokens: 0, totalTokens: 0 },
                cost: 0,
                latency: Date.now() - startTime,
                success: false,
                error: 'OpenAI API key not configured'
            };
        }

        try {
            const model = request.model || 'text-embedding-3-small';
            const texts = Array.isArray(request.texts) ? request.texts : [request.texts];

            // Validate dimensions
            const defaultDimensions: Record<string, number> = {
                'text-embedding-3-small': 1536,
                'text-embedding-3-large': 3072,
                'text-embedding-ada-002': 1536
            };

            const dimensions = request.dimensions || defaultDimensions[model];

            // Build request body
            const body: Record<string, unknown> = {
                model,
                input: texts,
                encoding_format: request.encodingFormat || 'float'
            };

            // Only add dimensions for text-embedding-3 models
            if (model.startsWith('text-embedding-3') && request.dimensions) {
                body.dimensions = request.dimensions;
            }

            const response = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Embeddings API error: ${response.status} - ${errorData}`);
            }

            const data = await response.json();

            // Extract embeddings in order
            const embeddings = data.data
                .sort((a: any, b: any) => a.index - b.index)
                .map((item: any) => item.embedding);

            // Calculate cost
            const costPer1kTokens: Record<string, number> = {
                'text-embedding-3-small': 0.00002,
                'text-embedding-3-large': 0.00013,
                'text-embedding-ada-002': 0.0001
            };
            const cost = (data.usage.total_tokens / 1000) * costPer1kTokens[model];

            return {
                embeddings,
                model: this.getModelDisplayName(model),
                provider: 'openai',
                dimensions: embeddings[0]?.length || dimensions,
                usage: {
                    promptTokens: data.usage.prompt_tokens,
                    totalTokens: data.usage.total_tokens
                },
                cost,
                latency: Date.now() - startTime,
                success: true
            };

        } catch (error) {
            return {
                embeddings: [],
                model: 'text-embedding-3-small',
                provider: 'openai',
                dimensions: 0,
                usage: { promptTokens: 0, totalTokens: 0 },
                cost: 0,
                latency: Date.now() - startTime,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Calculate cosine similarity between two vectors
     */
    public cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) {
            throw new Error('Vectors must have the same length');
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
        return magnitude === 0 ? 0 : dotProduct / magnitude;
    }

    /**
     * Find most similar texts to a query
     */
    public async findSimilar(
        query: string,
        corpus: string[],
        topK: number = 5,
        model?: EmbeddingRequest['model']
    ): Promise<{ results: SimilarityResult[]; cost: number; latency: number }> {
        const startTime = Date.now();
        let totalCost = 0;

        // Generate query embedding
        const queryResult = await this.generate({ texts: query, model });
        if (!queryResult.success || !queryResult.embeddings.length) {
            return {
                results: [],
                cost: 0,
                latency: Date.now() - startTime
            };
        }
        totalCost += queryResult.cost;
        const queryEmbedding = queryResult.embeddings[0];

        // Generate corpus embeddings (batch for efficiency)
        const corpusResult = await this.generate({ texts: corpus, model });
        if (!corpusResult.success) {
            return {
                results: [],
                cost: totalCost,
                latency: Date.now() - startTime
            };
        }
        totalCost += corpusResult.cost;

        // Calculate similarities
        const similarities: SimilarityResult[] = corpus.map((text, index) => ({
            index,
            text,
            similarity: this.cosineSimilarity(queryEmbedding, corpusResult.embeddings[index])
        }));

        // Sort by similarity and return top K
        const results = similarities
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK);

        return {
            results,
            cost: totalCost,
            latency: Date.now() - startTime
        };
    }

    /**
     * Generate embeddings and return as base64 for storage
     */
    public async generateForStorage(
        texts: string | string[],
        model?: EmbeddingRequest['model']
    ): Promise<{
        embeddings: string[];
        metadata: { model: string; dimensions: number };
        success: boolean;
        error?: string;
    }> {
        const result = await this.generate({
            texts,
            model,
            encodingFormat: 'base64'
        });

        if (!result.success) {
            return {
                embeddings: [],
                metadata: { model: '', dimensions: 0 },
                success: false,
                error: result.error
            };
        }

        // Convert number arrays to base64 strings for compact storage
        const base64Embeddings = result.embeddings.map(emb => {
            const float32Array = new Float32Array(emb);
            const buffer = Buffer.from(float32Array.buffer);
            return buffer.toString('base64');
        });

        return {
            embeddings: base64Embeddings,
            metadata: {
                model: result.model,
                dimensions: result.dimensions
            },
            success: true
        };
    }

    /**
     * Decode base64 embedding back to number array
     */
    public decodeEmbedding(base64: string): number[] {
        const buffer = Buffer.from(base64, 'base64');
        const float32Array = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.length / 4);
        return Array.from(float32Array);
    }

    // ===== UTILITY METHODS =====

    /**
     * Get available embedding models
     */
    public getAvailableModels(): Model[] {
        return ALL_MODELS.filter(m => m.category === 'EMBEDDING');
    }

    /**
     * Get model display name
     */
    private getModelDisplayName(modelId: string): string {
        const names: Record<string, string> = {
            'text-embedding-3-small': 'Text Embedding 3 Small',
            'text-embedding-3-large': 'Text Embedding 3 Large',
            'text-embedding-ada-002': 'Ada 002'
        };
        return names[modelId] || modelId;
    }

    /**
     * Estimate token count for text
     */
    public estimateTokens(text: string): number {
        // Rough estimate: ~4 characters per token for English
        return Math.ceil(text.length / 4);
    }

    /**
     * Check if embedding provider is available
     */
    public isProviderAvailable(provider: string): boolean {
        const keyMapping: Record<string, string> = {
            openai: 'OPENAI_API_KEY',
            cohere: 'COHERE_API_KEY'
        };

        const envKey = keyMapping[provider];
        return envKey ? Boolean(process.env[envKey]) : false;
    }

    /**
     * Get dimension options for models
     */
    public getDimensionOptions(model: string): { min: number; max: number; default: number } | null {
        const options: Record<string, { min: number; max: number; default: number }> = {
            'text-embedding-3-small': { min: 256, max: 1536, default: 1536 },
            'text-embedding-3-large': { min: 256, max: 3072, default: 3072 }
        };
        return options[model] || null;
    }
}

// Export singleton instance
export const embeddingGenerator = EmbeddingGenerator.getInstance();
