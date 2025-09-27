import { ModelConfig } from './ai-routing';
import { AIResponse, FileData } from './ai-integration';

// Together AI Integration
export class TogetherAIIntegration {
  private apiKey: string;
  private baseUrl = 'https://api.together.xyz/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.TOGETHER_API_KEY || '';
  }

  async callModel(modelId: string, prompt: string, options?: {
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    stream?: boolean;
  }): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('Together AI API key not configured');
    }

    const payload = {
      model: modelId,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options?.max_tokens || 512,
      temperature: options?.temperature || 0.7,
      top_p: options?.top_p || 0.9,
      stream: options?.stream || false
    };

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Together AI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const tokens = data.usage?.total_tokens || this.estimateTokens(prompt + content);

      return {
        content,
        tokens,
        cost: this.calculateCost(modelId, tokens),
        model: modelId,
        provider: 'together'
      };
    } catch (error) {
      console.error('Together AI error:', error);
      throw error;
    }
  }

  private calculateCost(modelId: string, tokens: number): number {
    // Together AI pricing (approximate)
    const costPer1M = 0.60; // $0.60 per 1M tokens average
    return (tokens / 1000000) * costPer1M;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.split(' ').length * 1.3);
  }
}

// Replicate Integration
export class ReplicateIntegration {
  private apiKey: string;
  private baseUrl = 'https://api.replicate.com/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.REPLICATE_API_TOKEN || '';
  }

  async callModel(modelId: string, input: any): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('Replicate API key not configured');
    }

    try {
      // Create prediction
      const createResponse = await fetch(`${this.baseUrl}/predictions`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: modelId,
          input
        }),
      });

      if (!createResponse.ok) {
        throw new Error(`Replicate API error: ${createResponse.status}`);
      }

      const prediction = await createResponse.json();
      
      // Poll for completion
      const result = await this.pollPrediction(prediction.id);
      
      return {
        content: this.formatOutput(result.output),
        tokens: this.estimateTokens(JSON.stringify(input) + JSON.stringify(result.output)),
        cost: this.calculateCost(result.metrics?.predict_time || 1),
        model: modelId,
        provider: 'replicate'
      };
    } catch (error) {
      console.error('Replicate error:', error);
      throw error;
    }
  }

  private async pollPrediction(predictionId: string, maxAttempts = 60): Promise<any> {
    for (let i = 0; i < maxAttempts; i++) {
      const response = await fetch(`${this.baseUrl}/predictions/${predictionId}`, {
        headers: {
          'Authorization': `Token ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get prediction: ${response.status}`);
      }

      const prediction = await response.json();
      
      if (prediction.status === 'succeeded') {
        return prediction;
      } else if (prediction.status === 'failed') {
        throw new Error(`Prediction failed: ${prediction.error}`);
      }

      // Wait 2 seconds before polling again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Prediction timed out');
  }

  private formatOutput(output: any): string {
    if (Array.isArray(output)) {
      return output.join('\n');
    }
    if (typeof output === 'string') {
      return output;
    }
    return JSON.stringify(output, null, 2);
  }

  private calculateCost(predictTime: number): number {
    // Replicate pricing is based on compute time
    const costPerSecond = 0.0002; // Approximate
    return predictTime * costPerSecond;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.split(' ').length * 1.3);
  }
}

// Groq Integration (Ultra-fast inference)
export class GroqIntegration {
  private apiKey: string;
  private baseUrl = 'https://api.groq.com/openai/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GROQ_API_KEY || '';
  }

  async callModel(modelId: string, prompt: string, options?: {
    max_tokens?: number;
    temperature?: number;
    stream?: boolean;
  }): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('Groq API key not configured');
    }

    const payload = {
      model: modelId,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options?.max_tokens || 1024,
      temperature: options?.temperature || 0.7,
      stream: options?.stream || false
    };

    try {
      const startTime = Date.now();
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      const endTime = Date.now();
      const content = data.choices?.[0]?.message?.content || '';
      const tokens = data.usage?.total_tokens || this.estimateTokens(prompt + content);

      return {
        content,
        tokens,
        cost: this.calculateCost(modelId, tokens),
        model: modelId,
        provider: 'groq'
      };
    } catch (error) {
      console.error('Groq error:', error);
      throw error;
    }
  }

  private calculateCost(modelId: string, tokens: number): number {
    // Groq pricing varies by model
    const pricing = {
      'llama2-70b-4096': 0.70,      // $0.70 per 1M tokens
      'mixtral-8x7b-32768': 0.60,   // $0.60 per 1M tokens
      'gemma-7b-it': 0.15,          // $0.15 per 1M tokens
    };
    
    const costPer1M = pricing[modelId as keyof typeof pricing] || 0.60;
    return (tokens / 1000000) * costPer1M;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.split(' ').length * 1.3);
  }
}

// OpenRouter Integration (Access to 100+ models)
export class OpenRouterIntegration {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || '';
  }

  async callModel(modelId: string, prompt: string, options?: {
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
  }): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const payload = {
      model: modelId,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options?.max_tokens || 1024,
      temperature: options?.temperature || 0.7,
      top_p: options?.top_p || 0.9
    };

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'GlauberAI'
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const tokens = data.usage?.total_tokens || this.estimateTokens(prompt + content);

      return {
        content,
        tokens,
        cost: this.calculateCost(data.usage?.prompt_tokens || 0, data.usage?.completion_tokens || 0),
        model: modelId,
        provider: 'openrouter'
      };
    } catch (error) {
      console.error('OpenRouter error:', error);
      throw error;
    }
  }

  async getAvailableModels(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching OpenRouter models:', error);
      return [];
    }
  }

  private calculateCost(promptTokens: number, completionTokens: number): number {
    // OpenRouter provides exact pricing in the response
    // This is a fallback estimation
    const avgCostPer1K = 0.002;
    return ((promptTokens + completionTokens) / 1000) * avgCostPer1K;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.split(' ').length * 1.3);
  }
}

// Ollama Integration (Local models)
export class OllamaIntegration {
  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  async callModel(modelId: string, prompt: string, options?: {
    temperature?: number;
    num_predict?: number;
  }): Promise<AIResponse> {
    const payload = {
      model: modelId,
      prompt,
      stream: false,
      options: {
        temperature: options?.temperature || 0.7,
        num_predict: options?.num_predict || 512
      }
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.response || '';
      const tokens = this.estimateTokens(prompt + content);

      return {
        content,
        tokens,
        cost: 0, // Local models are free
        model: modelId,
        provider: 'ollama'
      };
    } catch (error) {
      console.error('Ollama error:', error);
      throw error;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      console.warn('Could not fetch Ollama models:', error);
      return [];
    }
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.split(' ').length * 1.3);
  }
}

// Hugging Face Integration (Free tier available)
export class HuggingFaceIntegration {
  private apiKey: string;
  private baseUrl = 'https://api-inference.huggingface.co/models';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.HUGGINGFACE_API_KEY || '';
  }

  async callModel(modelId: string, prompt: string, options?: {
    max_new_tokens?: number;
    temperature?: number;
    wait_for_model?: boolean;
  }): Promise<AIResponse> {
    // HuggingFace has free tier - no API key required for some models
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const payload = {
      inputs: prompt,
      parameters: {
        max_new_tokens: options?.max_new_tokens || 512,
        temperature: options?.temperature || 0.7,
        return_full_text: false
      },
      options: {
        wait_for_model: options?.wait_for_model !== false,
        use_cache: false
      }
    };

    try {
      const response = await fetch(`${this.baseUrl}/${modelId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HuggingFace API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      let content = '';
      
      if (Array.isArray(data) && data[0]?.generated_text) {
        content = data[0].generated_text;
      } else if (data.generated_text) {
        content = data.generated_text;
      } else {
        content = JSON.stringify(data);
      }

      return {
        content,
        tokens: this.estimateTokens(prompt + content),
        cost: 0, // Free tier available
        model: modelId,
        provider: 'huggingface'
      };
    } catch (error) {
      console.error('HuggingFace error:', error);
      throw error;
    }
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.split(' ').length * 1.3);
  }
}

// Perplexity Integration (Has free tier)
export class PerplexityIntegration {
  private apiKey: string;
  private baseUrl = 'https://api.perplexity.ai';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.PERPLEXITY_API_KEY || '';
  }

  async callModel(modelId: string, prompt: string, options?: {
    max_tokens?: number;
    temperature?: number;
    stream?: boolean;
  }): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('Perplexity API key required');
    }

    const payload = {
      model: modelId,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options?.max_tokens || 1024,
      temperature: options?.temperature || 0.7,
      stream: options?.stream || false
    };

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const tokens = data.usage?.total_tokens || this.estimateTokens(prompt + content);

      return {
        content,
        tokens,
        cost: this.calculateCost(modelId, tokens),
        model: modelId,
        provider: 'perplexity'
      };
    } catch (error) {
      console.error('Perplexity error:', error);
      throw error;
    }
  }

  private calculateCost(modelId: string, tokens: number): number {
    // Perplexity has different pricing for different models
    const pricing = {
      'llama-3.1-sonar-small-128k-online': 0.20,  // $0.20 per 1M tokens
      'llama-3.1-sonar-large-128k-online': 1.00,  // $1.00 per 1M tokens
      'llama-3.1-sonar-huge-128k-online': 5.00,   // $5.00 per 1M tokens
    };
    
    const costPer1M = pricing[modelId as keyof typeof pricing] || 0.20;
    return (tokens / 1000000) * costPer1M;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.split(' ').length * 1.3);
  }
}

// Cohere Integration (Has free tier)
export class CohereIntegration {
  private apiKey: string;
  private baseUrl = 'https://api.cohere.ai/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.COHERE_API_KEY || '';
  }

  async callModel(modelId: string, prompt: string, options?: {
    max_tokens?: number;
    temperature?: number;
  }): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('Cohere API key required');
    }

    const payload = {
      model: modelId,
      message: prompt,
      max_tokens: options?.max_tokens || 1024,
      temperature: options?.temperature || 0.7
    };

    try {
      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Cohere API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.text || '';
      const tokens = this.estimateTokens(prompt + content);

      return {
        content,
        tokens,
        cost: this.calculateCost(modelId, tokens),
        model: modelId,
        provider: 'cohere'
      };
    } catch (error) {
      console.error('Cohere error:', error);
      throw error;
    }
  }

  private calculateCost(modelId: string, tokens: number): number {
    // Cohere pricing
    const pricing = {
      'command-r-plus': 3.00,     // $3.00 per 1M tokens
      'command-r': 0.50,          // $0.50 per 1M tokens
      'command': 1.00,            // $1.00 per 1M tokens
      'command-light': 0.30,      // $0.30 per 1M tokens
    };
    
    const costPer1M = pricing[modelId as keyof typeof pricing] || 0.50;
    return (tokens / 1000000) * costPer1M;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.split(' ').length * 1.3);
  }
}

// DeepInfra Integration (Free tier available)
export class DeepInfraIntegration {
  private apiKey: string;
  private baseUrl = 'https://api.deepinfra.com/v1/openai';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.DEEPINFRA_API_KEY || '';
  }

  async callModel(modelId: string, prompt: string, options?: {
    max_tokens?: number;
    temperature?: number;
  }): Promise<AIResponse> {
    // DeepInfra has some free models
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const payload = {
      model: modelId,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options?.max_tokens || 1024,
      temperature: options?.temperature || 0.7
    };

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`DeepInfra API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const tokens = data.usage?.total_tokens || this.estimateTokens(prompt + content);

      return {
        content,
        tokens,
        cost: this.calculateCost(modelId, tokens),
        model: modelId,
        provider: 'deepinfra'
      };
    } catch (error) {
      console.error('DeepInfra error:', error);
      throw error;
    }
  }

  private calculateCost(modelId: string, tokens: number): number {
    // DeepInfra has very competitive pricing
    const pricing = {
      'meta-llama/Meta-Llama-3.1-70B-Instruct': 0.35,  // $0.35 per 1M tokens
      'meta-llama/Meta-Llama-3.1-8B-Instruct': 0.08,   // $0.08 per 1M tokens
      'microsoft/WizardLM-2-8x22B': 0.63,               // $0.63 per 1M tokens
      'mistralai/Mixtral-8x7B-Instruct-v0.1': 0.24,    // $0.24 per 1M tokens
    };
    
    const costPer1M = pricing[modelId as keyof typeof pricing] || 0.20;
    return (tokens / 1000000) * costPer1M;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.split(' ').length * 1.3);
  }
}

// Unified Open Source Model Manager
export class OpenSourceModelManager {
  private together: TogetherAIIntegration;
  private replicate: ReplicateIntegration;
  private groq: GroqIntegration;
  private openRouter: OpenRouterIntegration;
  private ollama: OllamaIntegration;
  private huggingface: HuggingFaceIntegration;
  private perplexity: PerplexityIntegration;
  private cohere: CohereIntegration;
  private deepinfra: DeepInfraIntegration;

  constructor() {
    this.together = new TogetherAIIntegration();
    this.replicate = new ReplicateIntegration();
    this.groq = new GroqIntegration();
    this.openRouter = new OpenRouterIntegration();
    this.ollama = new OllamaIntegration();
    this.huggingface = new HuggingFaceIntegration();
    this.perplexity = new PerplexityIntegration();
    this.cohere = new CohereIntegration();
    this.deepinfra = new DeepInfraIntegration();
  }

  async callModel(provider: string, modelId: string, prompt: string, options?: any): Promise<AIResponse> {
    switch (provider) {
      case 'together':
        return await this.together.callModel(modelId, prompt, options);
      case 'replicate':
        return await this.replicate.callModel(modelId, prompt);
      case 'groq':
        return await this.groq.callModel(modelId, prompt, options);
      case 'openrouter':
        return await this.openRouter.callModel(modelId, prompt, options);
      case 'ollama':
        return await this.ollama.callModel(modelId, prompt, options);
      case 'huggingface':
        return await this.huggingface.callModel(modelId, prompt, options);
      case 'perplexity':
        return await this.perplexity.callModel(modelId, prompt, options);
      case 'cohere':
        return await this.cohere.callModel(modelId, prompt, options);
      case 'deepinfra':
        return await this.deepinfra.callModel(modelId, prompt, options);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  async discoverModels(): Promise<ModelConfig[]> {
    const models: ModelConfig[] = [];

    // Add popular open source models from different providers
    models.push(...this.getTogetherModels());
    models.push(...this.getReplicateModels());
    models.push(...this.getGroqModels());
    models.push(...this.getHuggingFaceModels());
    models.push(...this.getPerplexityModels());
    models.push(...this.getCohereModels());
    models.push(...this.getDeepInfraModels());
    
    // Dynamically fetch OpenRouter models
    try {
      const orModels = await this.openRouter.getAvailableModels();
      models.push(...this.convertOpenRouterModels(orModels.slice(0, 20))); // Top 20
    } catch (error) {
      console.warn('Could not fetch OpenRouter models');
    }

    // Dynamically fetch Ollama models
    try {
      const ollamaModels = await this.ollama.getAvailableModels();
      models.push(...this.convertOllamaModels(ollamaModels));
    } catch (error) {
      console.warn('Could not fetch Ollama models');
    }

    return models;
  }

  private getTogetherModels(): ModelConfig[] {
    return [
      {
        id: 'together-llama-2-70b',
        name: 'Llama 2 70B',
        provider: 'together',
        modelId: 'meta-llama/Llama-2-70b-chat-hf',
        costPer1kInput: 0.0009,
        costPer1kOutput: 0.0009,
        maxTokens: 4096,
        supportsStreaming: true,
        supportsImages: false,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsCode: true,
        supportsFunction: false,
        isOpenSource: true,
        requiresGPU: true,
        strengths: ['large parameter count', 'strong reasoning', 'open source'],
        weaknesses: ['slower inference', 'higher cost'],
        bestFor: ['complex reasoning', 'long conversations', 'code generation'],
        apiUrl: 'https://api.together.xyz/v1',
        contextWindow: 4096,
        trainingData: 'Up to 2023',
        releaseDate: '2023-07-18',
        license: 'Custom License',
        architecture: 'Transformer',
        modelSize: '70B parameters'
      },
      {
        id: 'together-mixtral-8x7b',
        name: 'Mixtral 8x7B',
        provider: 'together',
        modelId: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
        costPer1kInput: 0.0006,
        costPer1kOutput: 0.0006,
        maxTokens: 32768,
        supportsStreaming: true,
        supportsImages: false,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsCode: true,
        supportsFunction: false,
        isOpenSource: true,
        requiresGPU: true,
        strengths: ['mixture of experts', 'long context', 'multilingual'],
        weaknesses: ['complex architecture'],
        bestFor: ['long documents', 'multilingual tasks', 'efficient inference'],
        apiUrl: 'https://api.together.xyz/v1',
        contextWindow: 32768,
        trainingData: 'Up to 2023',
        releaseDate: '2023-12-11',
        license: 'Apache 2.0',
        architecture: 'Mixture of Experts',
        modelSize: '8x7B parameters'
      }
    ];
  }

  private getReplicateModels(): ModelConfig[] {
    return [
      {
        id: 'replicate-sdxl',
        name: 'SDXL (Replicate)',
        provider: 'replicate',
        modelId: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
        costPer1kInput: 0,
        costPer1kOutput: 0,
        maxTokens: 512,
        supportsStreaming: false,
        supportsImages: true,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsCode: false,
        supportsFunction: false,
        isOpenSource: true,
        requiresGPU: true,
        strengths: ['high quality images', 'fast generation', 'open source'],
        weaknesses: ['image only', 'pay per use'],
        bestFor: ['image generation', 'art creation', 'prototyping'],
        apiUrl: 'https://api.replicate.com/v1',
        contextWindow: 512,
        trainingData: 'LAION-5B',
        releaseDate: '2023-07-26',
        license: 'CreativeML Open RAIL++-M',
        architecture: 'Diffusion',
        modelSize: '3.5B parameters'
      }
    ];
  }

  private getGroqModels(): ModelConfig[] {
    return [
      {
        id: 'groq-llama2-70b',
        name: 'Llama 2 70B (Groq)',
        provider: 'groq',
        modelId: 'llama2-70b-4096',
        costPer1kInput: 0.0007,
        costPer1kOutput: 0.0008,
        maxTokens: 4096,
        supportsStreaming: true,
        supportsImages: false,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsCode: true,
        supportsFunction: false,
        isOpenSource: true,
        requiresGPU: true,
        strengths: ['ultra-fast inference', 'open source', 'cost effective'],
        weaknesses: ['limited model selection'],
        bestFor: ['fast responses', 'real-time applications', 'high throughput'],
        apiUrl: 'https://api.groq.com/openai/v1',
        contextWindow: 4096,
        trainingData: 'Up to 2023',
        releaseDate: '2023-07-18',
        license: 'Custom License',
        architecture: 'Transformer',
        modelSize: '70B parameters'
      },
      {
        id: 'groq-mixtral-8x7b',
        name: 'Mixtral 8x7B (Groq)',
        provider: 'groq',
        modelId: 'mixtral-8x7b-32768',
        costPer1kInput: 0.0006,
        costPer1kOutput: 0.0006,
        maxTokens: 32768,
        supportsStreaming: true,
        supportsImages: false,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsCode: true,
        supportsFunction: false,
        isOpenSource: true,
        requiresGPU: true,
        strengths: ['ultra-fast inference', 'long context', 'mixture of experts'],
        weaknesses: ['limited availability'],
        bestFor: ['long conversations', 'document analysis', 'fast inference'],
        apiUrl: 'https://api.groq.com/openai/v1',
        contextWindow: 32768,
        trainingData: 'Up to 2023',
        releaseDate: '2023-12-11',
        license: 'Apache 2.0',
        architecture: 'Mixture of Experts',
        modelSize: '8x7B parameters'
      }
    ];
  }

  private convertOpenRouterModels(models: any[]): ModelConfig[] {
    return models.map(model => ({
      id: `openrouter-${model.id.replace('/', '-')}`,
      name: model.name || model.id,
      provider: 'openrouter',
      modelId: model.id,
      costPer1kInput: model.pricing?.prompt || 0.002,
      costPer1kOutput: model.pricing?.completion || 0.002,
      maxTokens: model.context_length || 4096,
      supportsStreaming: true,
      supportsImages: false,
      supportsVision: model.id.includes('vision') || model.id.includes('gpt-4'),
      supportsAudio: false,
      supportsVideo: false,
      supportsCode: true,
      supportsFunction: model.id.includes('gpt') || model.id.includes('claude'),
      isOpenSource: !model.id.includes('gpt') && !model.id.includes('claude'),
      requiresGPU: true,
      strengths: ['unified API', 'model variety', 'competitive pricing'],
      weaknesses: ['variable availability'],
      bestFor: ['model experimentation', 'cost optimization', 'fallback routing'],
      apiUrl: 'https://openrouter.ai/api/v1',
      contextWindow: model.context_length || 4096,
      trainingData: 'Varies by model',
      releaseDate: 'Various',
      license: 'Varies',
      architecture: 'Transformer',
      modelSize: 'Varies'
    }));
  }

  private convertOllamaModels(modelNames: string[]): ModelConfig[] {
    return modelNames.map(name => ({
      id: `ollama-${name.replace(':', '-')}`,
      name: `${name} (Local)`,
      provider: 'ollama',
      modelId: name,
      costPer1kInput: 0,
      costPer1kOutput: 0,
      maxTokens: 2048,
      supportsStreaming: true,
      supportsImages: name.includes('vision') || name.includes('llava'),
      supportsVision: name.includes('vision') || name.includes('llava'),
      supportsAudio: false,
      supportsVideo: false,
      supportsCode: true,
      supportsFunction: false,
      isOpenSource: true,
      requiresGPU: false,
      strengths: ['free', 'local', 'privacy', 'offline'],
      weaknesses: ['local setup required', 'performance varies'],
      bestFor: ['privacy', 'offline use', 'development', 'experimentation'],
      apiUrl: 'http://localhost:11434',
      contextWindow: 2048,
      trainingData: 'Varies',
      releaseDate: 'Various',
      license: 'Open Source',
      architecture: 'Transformer',
      modelSize: 'Varies'
    }));
  }

  private getHuggingFaceModels(): ModelConfig[] {
    return [
      {
        id: 'hf-microsoft-dialoGPT-large',
        name: 'Microsoft DialoGPT Large (Free)',
        provider: 'huggingface',
        modelId: 'microsoft/DialoGPT-large',
        costPer1kInput: 0,
        costPer1kOutput: 0,
        maxTokens: 1024,
        supportsStreaming: false,
        supportsImages: false,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsCode: false,
        supportsFunction: false,
        isOpenSource: true,
        requiresGPU: false,
        strengths: ['free', 'conversational', 'no API key required'],
        weaknesses: ['limited capabilities', 'older model'],
        bestFor: ['simple chat', 'testing', 'prototyping'],
        apiUrl: 'https://api-inference.huggingface.co/models',
        contextWindow: 1024,
        trainingData: 'Reddit conversations',
        releaseDate: '2020-02-26',
        license: 'MIT',
        architecture: 'GPT-2',
        modelSize: '774M parameters'
      },
      {
        id: 'hf-google-flan-t5-large',
        name: 'Google Flan-T5 Large (Free)',
        provider: 'huggingface',
        modelId: 'google/flan-t5-large',
        costPer1kInput: 0,
        costPer1kOutput: 0,
        maxTokens: 512,
        supportsStreaming: false,
        supportsImages: false,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsCode: true,
        supportsFunction: false,
        isOpenSource: true,
        requiresGPU: false,
        strengths: ['free', 'instruction following', 'versatile'],
        weaknesses: ['limited context', 'slower inference'],
        bestFor: ['Q&A', 'instruction following', 'simple tasks'],
        apiUrl: 'https://api-inference.huggingface.co/models',
        contextWindow: 512,
        trainingData: 'Flan collection',
        releaseDate: '2022-10-20',
        license: 'Apache 2.0',
        architecture: 'T5',
        modelSize: '780M parameters'
      }
    ];
  }

  private getPerplexityModels(): ModelConfig[] {
    return [
      {
        id: 'perplexity-llama-3.1-sonar-small-128k-online',
        name: 'Llama 3.1 Sonar Small 128K Online',
        provider: 'perplexity',
        modelId: 'llama-3.1-sonar-small-128k-online',
        costPer1kInput: 0.20,
        costPer1kOutput: 0.20,
        maxTokens: 128000,
        supportsStreaming: true,
        supportsImages: false,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsCode: true,
        supportsFunction: false,
        isOpenSource: true,
        requiresGPU: false,
        strengths: ['web search', 'real-time info', 'long context'],
        weaknesses: ['requires API key', 'online only'],
        bestFor: ['research', 'current events', 'web search'],
        apiUrl: 'https://api.perplexity.ai',
        contextWindow: 128000,
        trainingData: 'Up to 2024 + real-time web',
        releaseDate: '2024-07-23',
        license: 'Custom',
        architecture: 'Llama 3.1',
        modelSize: '8B parameters'
      }
    ];
  }

  private getCohereModels(): ModelConfig[] {
    return [
      {
        id: 'cohere-command-light',
        name: 'Cohere Command Light',
        provider: 'cohere',
        modelId: 'command-light',
        costPer1kInput: 0.30,
        costPer1kOutput: 0.30,
        maxTokens: 4096,
        supportsStreaming: true,
        supportsImages: false,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsCode: true,
        supportsFunction: false,
        isOpenSource: false,
        requiresGPU: false,
        strengths: ['fast', 'cost-effective', 'good for simple tasks'],
        weaknesses: ['limited capabilities'],
        bestFor: ['simple queries', 'classification', 'summarization'],
        apiUrl: 'https://api.cohere.ai/v1',
        contextWindow: 4096,
        trainingData: 'Up to 2023',
        releaseDate: '2023-03-14',
        license: 'Proprietary',
        architecture: 'Transformer',
        modelSize: 'Small'
      }
    ];
  }

  private getDeepInfraModels(): ModelConfig[] {
    return [
      {
        id: 'deepinfra-meta-llama-3.1-8b-instruct',
        name: 'Meta Llama 3.1 8B Instruct (DeepInfra)',
        provider: 'deepinfra',
        modelId: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
        costPer1kInput: 0.08,
        costPer1kOutput: 0.08,
        maxTokens: 32768,
        supportsStreaming: true,
        supportsImages: false,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsCode: true,
        supportsFunction: false,
        isOpenSource: true,
        requiresGPU: true,
        strengths: ['very cheap', 'fast', 'good performance', 'long context'],
        weaknesses: ['requires API key'],
        bestFor: ['cost-sensitive apps', 'high volume', 'general tasks'],
        apiUrl: 'https://api.deepinfra.com/v1/openai',
        contextWindow: 32768,
        trainingData: 'Up to 2024',
        releaseDate: '2024-07-23',
        license: 'Llama 3.1 Custom',
        architecture: 'Llama 3.1',
        modelSize: '8B parameters'
      },
      {
        id: 'deepinfra-mixtral-8x7b-instruct',
        name: 'Mixtral 8x7B Instruct (DeepInfra)',
        provider: 'deepinfra',
        modelId: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
        costPer1kInput: 0.24,
        costPer1kOutput: 0.24,
        maxTokens: 32768,
        supportsStreaming: true,
        supportsImages: false,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsCode: true,
        supportsFunction: false,
        isOpenSource: true,
        requiresGPU: true,
        strengths: ['mixture of experts', 'efficient', 'multilingual', 'cheap'],
        weaknesses: ['complex architecture'],
        bestFor: ['multilingual tasks', 'efficient inference', 'cost optimization'],
        apiUrl: 'https://api.deepinfra.com/v1/openai',
        contextWindow: 32768,
        trainingData: 'Up to 2023',
        releaseDate: '2023-12-11',
        license: 'Apache 2.0',
        architecture: 'Mixture of Experts',
        modelSize: '8x7B parameters'
      }
    ];
  }
}

export const openSourceManager = new OpenSourceModelManager();