import { ModelConfig } from './ai-routing';
import { AIResponse, FileData } from './ai-integration';

export interface CustomModelConfig {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  apiKey?: string;
  headers?: Record<string, string>;
  requestFormat: 'openai' | 'custom' | 'huggingface' | 'ollama';
  responseFormat: 'openai' | 'custom' | 'huggingface' | 'ollama';
  maxTokens: number;
  contextWindow: number;
  costPer1kInput: number;
  costPer1kOutput: number;
  capabilities: {
    streaming: boolean;
    images: boolean;
    vision: boolean;
    audio: boolean;
    video: boolean;
    code: boolean;
    functions: boolean;
  };
  modelSize?: string;
  architecture?: string;
  license?: string;
  userId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeploymentConfig {
  modelId: string;
  platform: 'runpod' | 'replicate' | 'aws' | 'gcp' | 'azure' | 'local' | 'custom';
  instanceType?: string;
  gpuType?: string;
  memory?: string;
  storage?: string;
  scalingConfig?: {
    minInstances: number;
    maxInstances: number;
    autoScale: boolean;
  };
  environmentVars?: Record<string, string>;
  dockerImage?: string;
  requirements?: string[];
}

export class CustomModelDeployment {
  private customModels: Map<string, CustomModelConfig> = new Map();

  // Add a custom model configuration
  async addCustomModel(config: Omit<CustomModelConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = this.generateModelId(config.name);
    const customModel: CustomModelConfig = {
      ...config,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Validate the custom model
    const validation = await this.validateCustomModel(customModel);
    if (!validation.valid) {
      throw new Error(`Invalid custom model configuration: ${validation.errors.join(', ')}`);
    }

    this.customModels.set(id, customModel);
    
    // Save to database (would be implemented with actual DB)
    await this.saveCustomModel(customModel);
    
    return id;
  }

  // Update custom model configuration
  async updateCustomModel(id: string, updates: Partial<CustomModelConfig>): Promise<void> {
    const existing = this.customModels.get(id);
    if (!existing) {
      throw new Error(`Custom model ${id} not found`);
    }

    const updated = {
      ...existing,
      ...updates,
      id: existing.id, // Prevent ID changes
      updatedAt: new Date()
    };

    const validation = await this.validateCustomModel(updated);
    if (!validation.valid) {
      throw new Error(`Invalid custom model configuration: ${validation.errors.join(', ')}`);
    }

    this.customModels.set(id, updated);
    await this.saveCustomModel(updated);
  }

  // Test custom model endpoint
  async testCustomModel(config: CustomModelConfig): Promise<{ success: boolean; error?: string; latency?: number }> {
    const startTime = Date.now();
    
    try {
      const testPrompt = "Hello, this is a test message. Please respond briefly.";
      const response = await this.callCustomModel(config, testPrompt);
      
      const latency = Date.now() - startTime;
      
      return {
        success: !!response.content,
        latency
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Call a custom model
  async callCustomModel(config: CustomModelConfig, prompt: string, files?: FileData[]): Promise<AIResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.headers
    };

    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const requestBody = this.formatRequest(config.requestFormat, prompt, files, config);

    try {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const aiResponse = this.parseResponse(config.responseFormat, data, config);

      return aiResponse;
    } catch (error) {
      console.error('Error calling custom model:', error);
      throw new Error(`Failed to call custom model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Convert custom model to ModelConfig
  convertToModelConfig(customModel: CustomModelConfig): ModelConfig {
    return {
      id: customModel.id,
      name: customModel.name,
      provider: 'custom',
      modelId: customModel.id,
      costPer1kInput: customModel.costPer1kInput,
      costPer1kOutput: customModel.costPer1kOutput,
      maxTokens: customModel.maxTokens,
      supportsStreaming: customModel.capabilities.streaming,
      supportsImages: customModel.capabilities.images,
      supportsVision: customModel.capabilities.vision,
      supportsAudio: customModel.capabilities.audio,
      supportsVideo: customModel.capabilities.video,
      supportsCode: customModel.capabilities.code,
      supportsFunction: customModel.capabilities.functions,
      isOpenSource: true,
      requiresGPU: true,
      strengths: ['custom deployment', 'user controlled', 'private'],
      weaknesses: ['user maintenance', 'setup required'],
      bestFor: ['specialized tasks', 'proprietary data', 'custom requirements'],
      apiUrl: customModel.endpoint,
      apiKey: customModel.apiKey,
      contextWindow: customModel.contextWindow,
      trainingData: 'Custom',
      releaseDate: customModel.createdAt.toISOString(),
      license: customModel.license || 'Custom',
      modelSize: customModel.modelSize,
      architecture: customModel.architecture,
      customEndpoint: customModel.endpoint,
      headers: customModel.headers
    };
  }

  // Deploy model to cloud platform
  async deployModel(modelId: string, deployment: DeploymentConfig): Promise<{ endpoint: string; status: string }> {
    switch (deployment.platform) {
      case 'runpod':
        return await this.deployToRunPod(modelId, deployment);
      case 'replicate':
        return await this.deployToReplicate(modelId, deployment);
      case 'aws':
        return await this.deployToAWS(modelId, deployment);
      case 'local':
        return await this.deployLocally(modelId, deployment);
      default:
        throw new Error(`Unsupported deployment platform: ${deployment.platform}`);
    }
  }

  // Get all custom models for a user
  getUserModels(userId: string): CustomModelConfig[] {
    return Array.from(this.customModels.values()).filter(model => model.userId === userId);
  }

  // Delete custom model
  async deleteCustomModel(id: string, userId: string): Promise<void> {
    const model = this.customModels.get(id);
    if (!model) {
      throw new Error('Model not found');
    }
    
    if (model.userId !== userId) {
      throw new Error('Unauthorized to delete this model');
    }

    this.customModels.delete(id);
    await this.removeCustomModel(id);
  }

  private formatRequest(format: string, prompt: string, files?: FileData[], config?: CustomModelConfig): any {
    switch (format) {
      case 'openai':
        return {
          model: config?.name || 'custom',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: config?.maxTokens || 2048,
          temperature: 0.7
        };
      
      case 'huggingface':
        return {
          inputs: prompt,
          parameters: {
            max_length: config?.maxTokens || 2048,
            temperature: 0.7
          }
        };
      
      case 'ollama':
        return {
          model: config?.name || 'custom',
          prompt: prompt,
          options: {
            num_predict: config?.maxTokens || 2048,
            temperature: 0.7
          }
        };
      
      default:
        return { prompt, max_tokens: config?.maxTokens || 2048 };
    }
  }

  private parseResponse(format: string, data: any, config: CustomModelConfig): AIResponse {
    let content = '';
    let tokens = 0;

    switch (format) {
      case 'openai':
        content = data.choices?.[0]?.message?.content || '';
        tokens = data.usage?.total_tokens || 0;
        break;
      
      case 'huggingface':
        if (Array.isArray(data)) {
          content = data[0]?.generated_text || '';
        } else {
          content = data.generated_text || '';
        }
        tokens = this.estimateTokens(content);
        break;
      
      case 'ollama':
        content = data.response || '';
        tokens = this.estimateTokens(content);
        break;
      
      default:
        content = data.output || data.text || data.response || JSON.stringify(data);
        tokens = this.estimateTokens(content);
    }

    const cost = this.calculateCost(config, tokens);

    return {
      content,
      tokens,
      cost,
      model: config.name,
      provider: 'custom'
    };
  }

  private async validateCustomModel(config: CustomModelConfig): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!config.name.trim()) {
      errors.push('Model name is required');
    }

    if (!config.endpoint.trim()) {
      errors.push('Endpoint URL is required');
    }

    try {
      new URL(config.endpoint);
    } catch {
      errors.push('Invalid endpoint URL');
    }

    if (config.maxTokens <= 0) {
      errors.push('Max tokens must be positive');
    }

    if (config.contextWindow <= 0) {
      errors.push('Context window must be positive');
    }

    if (config.costPer1kInput < 0 || config.costPer1kOutput < 0) {
      errors.push('Costs cannot be negative');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private generateModelId(name: string): string {
    const timestamp = Date.now();
    const sanitized = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `custom-${sanitized}-${timestamp}`;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.split(' ').length * 1.3);
  }

  private calculateCost(config: CustomModelConfig, tokens: number): number {
    const inputTokens = tokens * 0.7;
    const outputTokens = tokens * 0.3;
    
    return (inputTokens / 1000) * config.costPer1kInput + 
           (outputTokens / 1000) * config.costPer1kOutput;
  }

  // Deployment implementations (placeholder implementations)
  private async deployToRunPod(modelId: string, deployment: DeploymentConfig): Promise<{ endpoint: string; status: string }> {
    // Implementation would call RunPod API
    return {
      endpoint: `https://api.runpod.ai/v2/${modelId}/run`,
      status: 'deploying'
    };
  }

  private async deployToReplicate(modelId: string, deployment: DeploymentConfig): Promise<{ endpoint: string; status: string }> {
    // Implementation would call Replicate API
    return {
      endpoint: `https://api.replicate.com/v1/predictions`,
      status: 'deploying'
    };
  }

  private async deployToAWS(modelId: string, deployment: DeploymentConfig): Promise<{ endpoint: string; status: string }> {
    // Implementation would use AWS SDK
    return {
      endpoint: `https://runtime.sagemaker.us-east-1.amazonaws.com/endpoints/${modelId}/invocations`,
      status: 'deploying'
    };
  }

  private async deployLocally(modelId: string, deployment: DeploymentConfig): Promise<{ endpoint: string; status: string }> {
    // Implementation would set up local Docker container
    return {
      endpoint: `http://localhost:8000/v1/chat/completions`,
      status: 'running'
    };
  }

  // Database operations (placeholder implementations)
  private async saveCustomModel(model: CustomModelConfig): Promise<void> {
    // Would save to actual database
    console.log('Saving custom model:', model.id);
  }

  private async removeCustomModel(id: string): Promise<void> {
    // Would remove from actual database
    console.log('Removing custom model:', id);
  }

  // Model management dashboard
  getModelStats(userId: string): {
    totalModels: number;
    activeModels: number;
    totalCalls: number;
    avgLatency: number;
    totalCost: number;
  } {
    const userModels = this.getUserModels(userId);
    
    return {
      totalModels: userModels.length,
      activeModels: userModels.filter(m => m.isActive).length,
      totalCalls: 0, // Would be tracked in database
      avgLatency: 0, // Would be calculated from metrics
      totalCost: 0 // Would be calculated from usage
    };
  }
}

export const customModelDeployment = new CustomModelDeployment();