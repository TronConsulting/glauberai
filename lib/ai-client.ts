import { Model } from './models';
import { modelManager } from './model-manager';

export interface AIOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stream?: boolean;
}

export interface AIResponse {
  content: string;
  model: string;
  provider: string;
  tokens: number;
  cost: number;
  latency: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export class UniversalAIClient {
  private static instance: UniversalAIClient;
  private responseCache = new Map<string, AIResponse>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100;

  private constructor() { }

  public static getInstance(): UniversalAIClient {
    if (!UniversalAIClient.instance) {
      UniversalAIClient.instance = new UniversalAIClient();
    }
    return UniversalAIClient.instance;
  }

  /**
   * Call a specific model with a prompt
   */
  public async callModel(
    model: Model,
    prompt: string,
    options: AIOptions = {}
  ): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = this.getCacheKey(model.id, prompt, options);
      const cachedResponse = this.responseCache.get(cacheKey);
      if (cachedResponse && (Date.now() - startTime) < this.CACHE_DURATION) {
        return { ...cachedResponse, latency: Date.now() - startTime };
      }

      let response: AIResponse;

      // Route to appropriate provider
      switch (model.provider) {
        case 'openai':
          response = await this.callOpenAI(model, prompt, options);
          break;
        case 'anthropic':
          response = await this.callAnthropic(model, prompt, options);
          break;
        case 'google':
          response = await this.callGoogle(model, prompt, options);
          break;
        case 'groq':
          response = await this.callGroq(model, prompt, options);
          break;
        case 'huggingface':
          response = await this.callHuggingFace(model, prompt, options);
          break;
        // New provider handlers (2024)
        case 'deepseek':
          response = await this.callDeepSeek(model, prompt, options);
          break;
        case 'xai':
          response = await this.callXAI(model, prompt, options);
          break;
        case 'together':
          response = await this.callTogether(model, prompt, options);
          break;
        case 'perplexity':
          response = await this.callPerplexity(model, prompt, options);
          break;
        case 'cohere':
          response = await this.callCohere(model, prompt, options);
          break;
        case 'mistral':
          response = await this.callMistral(model, prompt, options);
          break;
        case 'fireworks':
          response = await this.callFireworks(model, prompt, options);
          break;
        default:
          throw new Error(`Provider ${model.provider} not implemented`);
      }

      response.latency = Date.now() - startTime;
      response.cost = this.calculateCost(model, response.tokens);

      // Cache the response
      this.cacheResponse(cacheKey, response);

      return response;
    } catch (error) {
      return {
        content: '',
        model: model.name,
        provider: model.provider,
        tokens: 0,
        cost: 0,
        latency: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(model: Model, prompt: string, options: AIOptions): Promise<AIResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${model.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model.modelId,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options.maxTokens || model.maxTokens,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 1
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    return {
      content,
      model: model.name,
      provider: model.provider,
      tokens: data.usage?.total_tokens || this.estimateTokens(prompt + content),
      cost: 0, // Will be calculated by caller
      latency: 0, // Will be calculated by caller
      success: true,
      metadata: { usage: data.usage }
    };
  }

  /**
   * Call Anthropic API
   */
  private async callAnthropic(model: Model, prompt: string, options: AIOptions): Promise<AIResponse> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${model.apiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model.modelId,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature || 0.7
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.content[0]?.text || '';

    return {
      content,
      model: model.name,
      provider: model.provider,
      tokens: data.usage?.input_tokens + data.usage?.output_tokens || this.estimateTokens(prompt + content),
      cost: 0,
      latency: 0,
      success: true,
      metadata: { usage: data.usage }
    };
  }

  /**
   * Call Google Gemini API
   */
  private async callGoogle(model: Model, prompt: string, options: AIOptions): Promise<AIResponse> {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model.modelId}:generateContent?key=${model.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: options.maxTokens || model.maxTokens,
          temperature: options.temperature || 0.7,
          topP: options.topP || 1
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.candidates[0]?.content?.parts[0]?.text || '';

    return {
      content,
      model: model.name,
      provider: model.provider,
      tokens: data.usageMetadata?.totalTokenCount || this.estimateTokens(prompt + content),
      cost: 0,
      latency: 0,
      success: true,
      metadata: { usageMetadata: data.usageMetadata }
    };
  }

  /**
   * Call Groq API
   */
  private async callGroq(model: Model, prompt: string, options: AIOptions): Promise<AIResponse> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${model.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model.modelId,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options.maxTokens || model.maxTokens,
        temperature: options.temperature || 0.7
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    return {
      content,
      model: model.name,
      provider: model.provider,
      tokens: data.usage?.total_tokens || this.estimateTokens(prompt + content),
      cost: 0,
      latency: 0,
      success: true,
      metadata: { usage: data.usage }
    };
  }

  /**
   * Call HuggingFace API
   */
  private async callHuggingFace(model: Model, prompt: string, options: AIOptions): Promise<AIResponse> {
    if (!model.apiUrl) {
      throw new Error('HuggingFace model missing API URL');
    }

    // Format prompt based on model type
    let formattedPrompt = prompt;
    if (model.modelId.includes('llama') || model.modelId.includes('Llama')) {
      formattedPrompt = `<s>[INST] ${prompt} [/INST]`;
    } else if (model.modelId.includes('mistral') || model.modelId.includes('Mistral')) {
      formattedPrompt = `<s>[INST] ${prompt} [/INST]`;
    }

    const requestBody = model.modelId.includes('t5') || model.modelId.includes('T5')
      ? { inputs: formattedPrompt }
      : {
        inputs: formattedPrompt,
        parameters: {
          max_new_tokens: options.maxTokens || 500,
          temperature: options.temperature || 0.7,
          top_p: options.topP || 0.95,
          do_sample: true,
          return_full_text: false
        }
      };

    const response = await fetch(model.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${model.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HuggingFace API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    let content = '';
    if (Array.isArray(data)) {
      content = data[0]?.generated_text || data[0]?.text || '';
    } else {
      content = data.generated_text || data.text || '';
    }

    // Clean up the response
    content = content.replace(formattedPrompt, '').trim();

    return {
      content,
      model: model.name,
      provider: model.provider,
      tokens: this.estimateTokens(prompt + content),
      cost: 0,
      latency: 0,
      success: true
    };
  }

  /**
   * Estimate token count
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Call DeepSeek API (OpenAI-compatible)
   */
  private async callDeepSeek(model: Model, prompt: string, options: AIOptions): Promise<AIResponse> {
    const apiUrl = model.apiUrl || 'https://api.deepseek.com/v1/chat/completions';
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${model.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model.modelId,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options.maxTokens || model.maxTokens,
        temperature: options.temperature || 0.7
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    return {
      content,
      model: model.name,
      provider: model.provider,
      tokens: data.usage?.total_tokens || this.estimateTokens(prompt + content),
      cost: 0,
      latency: 0,
      success: true,
      metadata: { usage: data.usage }
    };
  }

  /**
   * Call xAI (Grok) API (OpenAI-compatible)
   */
  private async callXAI(model: Model, prompt: string, options: AIOptions): Promise<AIResponse> {
    const apiUrl = model.apiUrl || 'https://api.x.ai/v1/chat/completions';
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${model.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model.modelId,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options.maxTokens || model.maxTokens,
        temperature: options.temperature || 0.7
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`xAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    return {
      content,
      model: model.name,
      provider: model.provider,
      tokens: data.usage?.total_tokens || this.estimateTokens(prompt + content),
      cost: 0,
      latency: 0,
      success: true,
      metadata: { usage: data.usage }
    };
  }

  /**
   * Call Together AI API (OpenAI-compatible)
   */
  private async callTogether(model: Model, prompt: string, options: AIOptions): Promise<AIResponse> {
    const apiUrl = model.apiUrl || 'https://api.together.xyz/v1/chat/completions';
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${model.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model.modelId,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options.maxTokens || model.maxTokens,
        temperature: options.temperature || 0.7
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Together API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    return {
      content,
      model: model.name,
      provider: model.provider,
      tokens: data.usage?.total_tokens || this.estimateTokens(prompt + content),
      cost: 0,
      latency: 0,
      success: true,
      metadata: { usage: data.usage }
    };
  }

  /**
   * Call Perplexity API (OpenAI-compatible)
   */
  private async callPerplexity(model: Model, prompt: string, options: AIOptions): Promise<AIResponse> {
    const apiUrl = model.apiUrl || 'https://api.perplexity.ai/chat/completions';
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${model.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model.modelId,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options.maxTokens || model.maxTokens,
        temperature: options.temperature || 0.7
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Perplexity API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    return {
      content,
      model: model.name,
      provider: model.provider,
      tokens: data.usage?.total_tokens || this.estimateTokens(prompt + content),
      cost: 0,
      latency: 0,
      success: true,
      metadata: { usage: data.usage, citations: data.citations }
    };
  }

  /**
   * Call Cohere API
   */
  private async callCohere(model: Model, prompt: string, options: AIOptions): Promise<AIResponse> {
    const apiUrl = model.apiUrl || 'https://api.cohere.ai/v1/chat';
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${model.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model.modelId,
        message: prompt,
        max_tokens: options.maxTokens || model.maxTokens,
        temperature: options.temperature || 0.7
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cohere API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.text || '';

    return {
      content,
      model: model.name,
      provider: model.provider,
      tokens: (data.meta?.tokens?.input_tokens || 0) + (data.meta?.tokens?.output_tokens || 0) || this.estimateTokens(prompt + content),
      cost: 0,
      latency: 0,
      success: true,
      metadata: { meta: data.meta, documents: data.documents }
    };
  }

  /**
   * Call Mistral AI API (OpenAI-compatible)
   */
  private async callMistral(model: Model, prompt: string, options: AIOptions): Promise<AIResponse> {
    const apiUrl = model.apiUrl || 'https://api.mistral.ai/v1/chat/completions';
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${model.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model.modelId,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options.maxTokens || model.maxTokens,
        temperature: options.temperature || 0.7
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mistral API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    return {
      content,
      model: model.name,
      provider: model.provider,
      tokens: data.usage?.total_tokens || this.estimateTokens(prompt + content),
      cost: 0,
      latency: 0,
      success: true,
      metadata: { usage: data.usage }
    };
  }

  /**
   * Call Fireworks AI API (OpenAI-compatible)
   */
  private async callFireworks(model: Model, prompt: string, options: AIOptions): Promise<AIResponse> {
    const apiUrl = model.apiUrl || 'https://api.fireworks.ai/inference/v1/chat/completions';
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${model.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model.modelId,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options.maxTokens || model.maxTokens,
        temperature: options.temperature || 0.7
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Fireworks API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    return {
      content,
      model: model.name,
      provider: model.provider,
      tokens: data.usage?.total_tokens || this.estimateTokens(prompt + content),
      cost: 0,
      latency: 0,
      success: true,
      metadata: { usage: data.usage }
    };
  }

  async streamModel(
    model: Model,
    query: string,
    options: {
      maxTokens?: number;
      onToken: (token: string) => void;
      onComplete: () => void;
      onError: (error: Error) => void;
    }
  ): Promise<void> {
    // This is a simplified example - actual implementation depends on provider
    try {
      const response = await this.callModel(model, query, {
        maxTokens: options.maxTokens,
        stream: true,
      });

      if (response.success && response.content) {
        // Simulate streaming for non-streaming providers
        const words = response.content.split(' ');
        for (const word of words) {
          options.onToken(word + ' ');
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        options.onComplete();
      } else {
        options.onError(new Error(response.error || 'Streaming failed'));
      }
    } catch (error) {
      options.onError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Calculate cost based on tokens and model pricing
   */
  private calculateCost(model: Model, tokens: number): number {
    return (tokens / 1000) * model.costPer1kTokens;
  }

  /**
   * Generate cache key
   */
  private getCacheKey(modelId: string, prompt: string, options: AIOptions): string {
    const optionsStr = JSON.stringify(options);
    return `${modelId}:${prompt.slice(0, 100)}:${optionsStr}`;
  }

  /**
   * Cache response
   */
  private cacheResponse(key: string, response: AIResponse): void {
    // Remove oldest entries if cache is full
    if (this.responseCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.responseCache.keys().next().value;
      if (firstKey) {
        this.responseCache.delete(firstKey);
      }
    }

    this.responseCache.set(key, response);
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.responseCache.clear();
  }

  /**
   * Get cache status
   */
  public getCacheStatus(): { size: number; maxSize: number } {
    return {
      size: this.responseCache.size,
      maxSize: this.MAX_CACHE_SIZE
    };
  }

  /**
   * Test connection to a provider
   */
  public async testConnection(provider: string): Promise<{ success: boolean; error?: string }> {
    try {
      const models = modelManager.getModelsByProvider(provider as any);
      if (models.length === 0) {
        return { success: false, error: 'No models available for this provider' };
      }

      const testModel = models[0];
      const result = await this.callModel(testModel, 'Hello! Please respond with "Test successful"', { maxTokens: 20 });

      return { success: result.success, error: result.error };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const aiClient = UniversalAIClient.getInstance();