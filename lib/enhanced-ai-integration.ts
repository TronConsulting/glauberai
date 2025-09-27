import { ModelConfig } from './ai-routing';
import { AIResponse, FileData, AIIntegration } from './ai-integration';
import { HuggingFaceIntegration } from './huggingface-integration';
import { CustomModelDeployment, CustomModelConfig } from './custom-model-deployment';
import { 
  OpenSourceModelManager,
  TogetherAIIntegration,
  ReplicateIntegration,
  GroqIntegration,
  OpenRouterIntegration,
  OllamaIntegration
} from './open-source-integrations';

export interface MultiModalResponse extends AIResponse {
  type: 'text' | 'image' | 'video' | 'audio' | 'code';
  metadata?: {
    imageUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
    codeLanguage?: string;
    executionResult?: string;
    fileAttachments?: FileData[];
  };
}

export class EnhancedAIIntegration extends AIIntegration {
  private huggingFace: HuggingFaceIntegration;
  private customModels: CustomModelDeployment;
  private openSourceManager: OpenSourceModelManager;

  constructor() {
    super();
    this.huggingFace = new HuggingFaceIntegration();
    this.customModels = new CustomModelDeployment();
    this.openSourceManager = new OpenSourceModelManager();
    
    // Extended API keys for all providers
    this.apiKeys = {
      // Existing providers
      openai: process.env.OPENAI_API_KEY || '',
      anthropic: process.env.ANTHROPIC_API_KEY || '',
      google: process.env.GOOGLE_API_KEY || '',
      cohere: process.env.COHERE_API_KEY || '',
      mistral: process.env.MISTRAL_API_KEY || '',
      stability: process.env.STABILITY_API_KEY || '',
      
      // Open Source providers
      huggingface: process.env.HUGGINGFACE_API_KEY || '',
      replicate: process.env.REPLICATE_API_TOKEN || '',
      together: process.env.TOGETHER_API_KEY || '',
      groq: process.env.GROQ_API_KEY || '',
      openrouter: process.env.OPENROUTER_API_KEY || '',
      
      // Additional providers  
      perplexity: process.env.PERPLEXITY_API_KEY || '',
      fireworks: process.env.FIREWORKS_API_KEY || '',
      runpod: process.env.RUNPOD_API_KEY || '',
      deepinfra: process.env.DEEPINFRA_API_KEY || '',
      
      // Chinese providers
      'alibaba': process.env.ALIBABA_API_KEY || '',
      'baichuan': process.env.BAICHUAN_API_KEY || '',
      'zhipu': process.env.ZHIPU_API_KEY || '',
      'moonshot': process.env.MOONSHOT_API_KEY || '',
      
      // Other international providers
      'yandex': process.env.YANDEX_API_KEY || '',
      'ai21': process.env.AI21_API_KEY || '',
    };
  }

  public isModelOperational(model: ModelConfig): boolean {
    const requiresKey = (key?: string) => Boolean(key && key.trim().length > 0);

    switch (model.provider) {
      case 'openai':
      case 'dalle':
        return requiresKey(this.apiKeys.openai);
      case 'anthropic':
        return requiresKey(this.apiKeys.anthropic);
      case 'google':
        return requiresKey(this.apiKeys.google);
      case 'cohere':
        return requiresKey(this.apiKeys.cohere);
      case 'mistral':
        return requiresKey(this.apiKeys.mistral);
      case 'stability':
        return requiresKey(this.apiKeys.stability);
      case 'huggingface':
        return requiresKey(this.apiKeys.huggingface);
      case 'replicate':
        return requiresKey(this.apiKeys.replicate);
      case 'together':
        return requiresKey(this.apiKeys.together);
      case 'groq':
        return requiresKey(this.apiKeys.groq);
      case 'openrouter':
        return requiresKey(this.apiKeys.openrouter);
      case 'perplexity':
        return requiresKey(this.apiKeys.perplexity);
      case 'fireworks':
        return requiresKey(this.apiKeys.fireworks);
      case 'runpod':
        return requiresKey(this.apiKeys.runpod);
      case 'deepinfra':
        return requiresKey(this.apiKeys.deepinfra);
      case 'alibaba':
        return requiresKey(this.apiKeys.alibaba);
      case 'baichuan':
        return requiresKey(this.apiKeys.baichuan);
      case 'zhipu':
        return requiresKey(this.apiKeys.zhipu);
      case 'moonshot':
        return requiresKey(this.apiKeys.moonshot);
      case 'yandex':
        return requiresKey(this.apiKeys.yandex);
      case 'ai21':
        return requiresKey(this.apiKeys.ai21);
      case 'custom':
        return true;
      case 'ollama':
      case 'local':
        return true;
      case 'midjourney':
        return false;
      default:
        return true;
    }
  }

  async callModelEnhanced(
    model: ModelConfig,
    query: string,
    files?: FileData[],
    options?: {
      streaming?: boolean;
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    }
  ): Promise<MultiModalResponse> {
    try {
      let response: AIResponse;

      switch (model.provider) {
        // Existing providers (inherited from base class)
        case 'openai':
        case 'anthropic':
        case 'google':
        case 'cohere':
        case 'mistral':
        case 'stability':
        case 'dalle':
        case 'midjourney':
          response = await super.callModel(model, query, files);
          break;

        // Open Source providers
        case 'huggingface':
          response = await this.callHuggingFace(model, query, files, options);
          break;
        case 'together':
          response = await this.openSourceManager.callModel('together', model.modelId, query, options);
          break;
        case 'replicate':
          response = await this.openSourceManager.callModel('replicate', model.modelId, this.prepareReplicateInput(query, files), options);
          break;
        case 'groq':
          response = await this.openSourceManager.callModel('groq', model.modelId, query, options);
          break;
        case 'openrouter':
          response = await this.openSourceManager.callModel('openrouter', model.modelId, query, options);
          break;
        case 'ollama':
          response = await this.openSourceManager.callModel('ollama', model.modelId, query, options);
          break;
        case 'deepinfra':
          response = await this.openSourceManager.callModel('deepinfra', model.modelId, query, options);
          break;
        
        // Additional providers
        case 'fireworks':
          response = await this.callFireworks(model, query, files, options);
          break;
        case 'perplexity':
          response = await this.openSourceManager.callModel('perplexity', model.modelId, query, options);
          break;
        case 'custom':
          response = await this.callCustomModel(model, query, files, options);
          break;
        
        // Chinese providers
        case 'alibaba':
          response = await this.callAlibaba(model, query, files, options);
          break;
        case 'baichuan':
          response = await this.callBaichuan(model, query, files, options);
          break;
        case 'zhipu':
          response = await this.callZhipu(model, query, files, options);
          break;

        // Other providers
        case 'yandex':
          response = await this.callYandex(model, query, files, options);
          break;
        case 'ai21':
          response = await this.callAI21(model, query, files, options);
          break;

        default:
          throw new Error(`Unsupported provider: ${model.provider}`);
      }

      return this.enhanceResponse(response, model, files);
    } catch (error) {
      console.error(`Error calling ${model.provider} API:`, error);
      return this.createErrorResponse(model, error);
    }
  }

  // Hugging Face integration
  private async callHuggingFace(
    model: ModelConfig,
    query: string,
    files?: FileData[],
    options?: any
  ): Promise<AIResponse> {
    return await this.huggingFace.callModel(model.modelId, query, {
      parameters: {
        max_length: options?.maxTokens || model.maxTokens,
        temperature: options?.temperature || 0.7
      },
      wait_for_model: true
    });
  }

  // Replicate integration
  private async callReplicate(
    model: ModelConfig,
    query: string,
    files?: FileData[],
    options?: any
  ): Promise<AIResponse> {
    const apiKey = this.apiKeys.replicate;
    if (!apiKey) throw new Error('Replicate API key not configured');

    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: model.modelId,
        input: {
          prompt: query,
          max_tokens: options?.maxTokens || model.maxTokens,
          temperature: options?.temperature || 0.7
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Replicate API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.output ? data.output.join('') : 'Processing...',
      tokens: this.estimateTokens(query),
      cost: this.calculateCost(model, this.estimateTokens(query)),
      model: model.name,
      provider: 'replicate'
    };
  }

  // Together AI integration
  private async callTogether(
    model: ModelConfig,
    query: string,
    files?: FileData[],
    options?: any
  ): Promise<AIResponse> {
    const apiKey = this.apiKeys.together;
    if (!apiKey) throw new Error('Together AI API key not configured');

    const response = await fetch('https://api.together.xyz/inference', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model.modelId,
        prompt: query,
        max_tokens: options?.maxTokens || model.maxTokens,
        temperature: options?.temperature || 0.7,
        stop: ['<|endoftext|>']
      }),
    });

    if (!response.ok) {
      throw new Error(`Together AI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.output?.choices?.[0]?.text || '',
      tokens: data.output?.usage?.total_tokens || 0,
      cost: this.calculateCost(model, data.output?.usage?.total_tokens || 0),
      model: model.name,
      provider: 'together'
    };
  }

  // Groq integration (fast inference)
  private async callGroq(
    model: ModelConfig,
    query: string,
    files?: FileData[],
    options?: any
  ): Promise<AIResponse> {
    const apiKey = this.apiKeys.groq;
    if (!apiKey) throw new Error('Groq API key not configured');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model.modelId,
        messages: [{ role: 'user', content: query }],
        max_tokens: options?.maxTokens || model.maxTokens,
        temperature: options?.temperature || 0.7
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.choices?.[0]?.message?.content || '',
      tokens: data.usage?.total_tokens || 0,
      cost: this.calculateCost(model, data.usage?.total_tokens || 0),
      model: model.name,
      provider: 'groq'
    };
  }

  // Fireworks AI integration
  private async callFireworks(
    model: ModelConfig,
    query: string,
    files?: FileData[],
    options?: any
  ): Promise<AIResponse> {
    const apiKey = this.apiKeys.fireworks;
    if (!apiKey) throw new Error('Fireworks AI API key not configured');

    const response = await fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model.modelId,
        messages: [{ role: 'user', content: query }],
        max_tokens: options?.maxTokens || model.maxTokens,
        temperature: options?.temperature || 0.7
      }),
    });

    if (!response.ok) {
      throw new Error(`Fireworks AI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.choices?.[0]?.message?.content || '',
      tokens: data.usage?.total_tokens || 0,
      cost: this.calculateCost(model, data.usage?.total_tokens || 0),
      model: model.name,
      provider: 'fireworks'
    };
  }

  // Perplexity integration
  private async callPerplexity(
    model: ModelConfig,
    query: string,
    files?: FileData[],
    options?: any
  ): Promise<AIResponse> {
    const apiKey = this.apiKeys.perplexity;
    if (!apiKey) throw new Error('Perplexity API key not configured');

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model.modelId,
        messages: [{ role: 'user', content: query }],
        max_tokens: options?.maxTokens || model.maxTokens,
        temperature: options?.temperature || 0.7
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.choices?.[0]?.message?.content || '',
      tokens: data.usage?.total_tokens || 0,
      cost: this.calculateCost(model, data.usage?.total_tokens || 0),
      model: model.name,
      provider: 'perplexity'
    };
  }

  // Ollama local integration
  private async callOllama(
    model: ModelConfig,
    query: string,
    files?: FileData[],
    options?: any
  ): Promise<AIResponse> {
    const baseUrl = model.customEndpoint || 'http://localhost:11434';
    
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model.modelId,
        prompt: query,
        options: {
          num_predict: options?.maxTokens || model.maxTokens,
          temperature: options?.temperature || 0.7
        },
        stream: false
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.response || '',
      tokens: this.estimateTokens(data.response || ''),
      cost: 0, // Local models are free
      model: model.name,
      provider: 'ollama'
    };
  }

  // Custom model integration
  private async callCustomModel(
    model: ModelConfig,
    query: string,
    files?: FileData[],
    options?: any
  ): Promise<AIResponse> {
    // This would get the custom model config from the database
    const customModelConfig: CustomModelConfig = {
      id: model.id,
      name: model.name,
      description: 'Custom model',
      endpoint: model.customEndpoint || model.apiUrl,
      apiKey: model.apiKey,
      headers: model.headers,
      requestFormat: 'openai',
      responseFormat: 'openai',
      maxTokens: model.maxTokens,
      contextWindow: model.contextWindow,
      costPer1kInput: model.costPer1kInput,
      costPer1kOutput: model.costPer1kOutput,
      capabilities: {
        streaming: model.supportsStreaming,
        images: model.supportsImages,
        vision: model.supportsVision,
        audio: model.supportsAudio,
        video: model.supportsVideo,
        code: model.supportsCode,
        functions: model.supportsFunction
      },
      userId: 'current-user', // Would get from context
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return await this.customModels.callCustomModel(customModelConfig, query, files);
  }

  // Chinese providers
  private async callAlibaba(
    model: ModelConfig,
    query: string,
    files?: FileData[],
    options?: any
  ): Promise<AIResponse> {
    const apiKey = this.apiKeys.alibaba;
    if (!apiKey) throw new Error('Alibaba API key not configured');

    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model.modelId,
        input: { prompt: query },
        parameters: {
          max_tokens: options?.maxTokens || model.maxTokens,
          temperature: options?.temperature || 0.7
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Alibaba API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.output?.text || '',
      tokens: data.usage?.total_tokens || 0,
      cost: this.calculateCost(model, data.usage?.total_tokens || 0),
      model: model.name,
      provider: 'alibaba'
    };
  }

  private async callBaichuan(
    model: ModelConfig,
    query: string,
    files?: FileData[],
    options?: any
  ): Promise<AIResponse> {
    const apiKey = this.apiKeys.baichuan;
    if (!apiKey) throw new Error('Baichuan API key not configured');

    const response = await fetch('https://api.baichuan-ai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model.modelId,
        messages: [{ role: 'user', content: query }],
        max_tokens: options?.maxTokens || model.maxTokens,
        temperature: options?.temperature || 0.7
      }),
    });

    if (!response.ok) {
      throw new Error(`Baichuan API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.choices?.[0]?.message?.content || '',
      tokens: data.usage?.total_tokens || 0,
      cost: this.calculateCost(model, data.usage?.total_tokens || 0),
      model: model.name,
      provider: 'baichuan'
    };
  }

  private async callZhipu(
    model: ModelConfig,
    query: string,
    files?: FileData[],
    options?: any
  ): Promise<AIResponse> {
    const apiKey = this.apiKeys.zhipu;
    if (!apiKey) throw new Error('Zhipu API key not configured');

    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model.modelId,
        messages: [{ role: 'user', content: query }],
        max_tokens: options?.maxTokens || model.maxTokens,
        temperature: options?.temperature || 0.7
      }),
    });

    if (!response.ok) {
      throw new Error(`Zhipu API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.choices?.[0]?.message?.content || '',
      tokens: data.usage?.total_tokens || 0,
      cost: this.calculateCost(model, data.usage?.total_tokens || 0),
      model: model.name,
      provider: 'zhipu'
    };
  }

  private async callYandex(
    model: ModelConfig,
    query: string,
    files?: FileData[],
    options?: any
  ): Promise<AIResponse> {
    const apiKey = this.apiKeys.yandex;
    if (!apiKey) throw new Error('Yandex API key not configured');

    const response = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
      method: 'POST',
      headers: {
        'Authorization': `Api-Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        modelUri: `gpt://${model.modelId}`,
        completionOptions: {
          stream: false,
          temperature: options?.temperature || 0.7,
          maxTokens: options?.maxTokens || model.maxTokens
        },
        messages: [{ role: 'user', text: query }]
      }),
    });

    if (!response.ok) {
      throw new Error(`Yandex API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.result?.alternatives?.[0]?.message?.text || '',
      tokens: data.result?.usage?.totalTokens || 0,
      cost: this.calculateCost(model, data.result?.usage?.totalTokens || 0),
      model: model.name,
      provider: 'yandex'
    };
  }

  private async callAI21(
    model: ModelConfig,
    query: string,
    files?: FileData[],
    options?: any
  ): Promise<AIResponse> {
    const apiKey = this.apiKeys.ai21;
    if (!apiKey) throw new Error('AI21 API key not configured');

    const response = await fetch(`https://api.ai21.com/studio/v1/${model.modelId}/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: query,
        maxTokens: options?.maxTokens || model.maxTokens,
        temperature: options?.temperature || 0.7
      }),
    });

    if (!response.ok) {
      throw new Error(`AI21 API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.completions?.[0]?.data?.text || '',
      tokens: this.estimateTokens(query + (data.completions?.[0]?.data?.text || '')),
      cost: this.calculateCost(model, this.estimateTokens(query + (data.completions?.[0]?.data?.text || ''))),
      model: model.name,
      provider: 'ai21'
    };
  }

  private enhanceResponse(response: AIResponse, model: ModelConfig, files?: FileData[]): MultiModalResponse {
    // Determine response type based on content and model capabilities
    let type: 'text' | 'image' | 'video' | 'audio' | 'code' = 'text';
    let metadata: any = {};

    // Check if response contains code
    if (response.content.includes('```') || model.supportsCode) {
      type = 'code';
      const codeBlocks = response.content.match(/```(\w+)?\n([\s\S]*?)```/g);
      if (codeBlocks) {
        const language = codeBlocks[0].match(/```(\w+)/)?.[1] || 'text';
        metadata.codeLanguage = language;
      }
    }

    // Check if response contains image URLs or is from image generation model
    if (response.content.includes('data:image') || response.content.includes('.png') || 
        response.content.includes('.jpg') || model.supportsImages) {
      type = 'image';
      const imageMatch = response.content.match(/(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp))/);
      if (imageMatch) {
        metadata.imageUrl = imageMatch[1];
      }
    }

    // Add file attachments if any
    if (files && files.length > 0) {
      metadata.fileAttachments = files;
    }

    return {
      ...response,
      type,
      metadata
    };
  }

  private createErrorResponse(model: ModelConfig, error: any): MultiModalResponse {
    return {
      content: `Error calling ${model.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      tokens: 0,
      cost: 0,
      model: model.name,
      provider: model.provider,
      type: 'text'
    };
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.split(' ').length * 1.3);
  }

  private prepareReplicateInput(query: string, files?: FileData[]): any {
    const input: any = { prompt: query };
    
    // Add image inputs if files are provided
    if (files && files.length > 0) {
      const imageFiles = files.filter(f => f.type.startsWith('image/'));
      if (imageFiles.length > 0) {
        input.image = imageFiles[0].data; // Use first image
      }
    }
    
    return input;
  }

  // Method to discover and add open source models dynamically
  async discoverOpenSourceModels(): Promise<ModelConfig[]> {
    try {
      return await this.openSourceManager.discoverModels();
    } catch (error) {
      console.warn('Could not discover open source models:', error);
      return [];
    }
  }

}

export const enhancedAIIntegration = new EnhancedAIIntegration();
