import { ModelConfig } from './ai-routing';
import { AIResponse, FileData } from './ai-integration';

interface HuggingFaceModel {
  id: string;
  tags: string[];
  downloads: number;
  likes: number;
  pipeline_tag: string;
  library_name?: string;
  modelId: string;
  author: string;
  description?: string;
}

export class HuggingFaceIntegration {
  private apiKey: string;
  private baseUrl = 'https://api-inference.huggingface.co';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.HUGGINGFACE_API_KEY || '';
  }

  // Search for models on Hugging Face
  async searchModels(
    query: string, 
    filter?: {
      task?: string;
      library?: string;
      language?: string;
      sort?: 'downloads' | 'likes' | 'updated';
      limit?: number;
    }
  ): Promise<HuggingFaceModel[]> {
    const params = new URLSearchParams();
    params.append('search', query);
    
    if (filter?.task) params.append('filter', `task:${filter.task}`);
    if (filter?.library) params.append('filter', `library:${filter.library}`);
    if (filter?.language) params.append('filter', `language:${filter.language}`);
    if (filter?.sort) params.append('sort', filter.sort);
    if (filter?.limit) params.append('limit', filter.limit.toString());

    try {
      const response = await fetch(`https://huggingface.co/api/models?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to search models: ${response.statusText}`);
      }
      
      const models = await response.json();
      return models.map((model: any) => ({
        id: model.id,
        tags: model.tags || [],
        downloads: model.downloads || 0,
        likes: model.likes || 0,
        pipeline_tag: model.pipeline_tag || 'text-generation',
        library_name: model.library_name,
        modelId: model.id,
        author: model.author || 'unknown',
        description: model.description
      }));
    } catch (error) {
      console.error('Error searching Hugging Face models:', error);
      return [];
    }
  }

  // Get popular models by category
  async getPopularModels(category: 'text-generation' | 'image-to-text' | 'text-to-image' | 'translation' | 'summarization' | 'question-answering' = 'text-generation'): Promise<HuggingFaceModel[]> {
    return this.searchModels('', {
      task: category,
      sort: 'downloads',
      limit: 20
    });
  }

  // Call a Hugging Face model
  async callModel(modelId: string, input: string, options?: {
    parameters?: Record<string, any>;
    wait_for_model?: boolean;
    use_cache?: boolean;
  }): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('Hugging Face API key not configured');
    }

    const url = `${this.baseUrl}/models/${modelId}`;
    const payload = {
      inputs: input,
      ...options
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      // Handle different response formats
      let content = '';
      if (Array.isArray(result)) {
        if (result[0]?.generated_text) {
          content = result[0].generated_text;
        } else if (result[0]?.translation_text) {
          content = result[0].translation_text;
        } else if (result[0]?.summary_text) {
          content = result[0].summary_text;
        } else if (result[0]?.answer) {
          content = result[0].answer;
        } else {
          content = JSON.stringify(result);
        }
      } else if (typeof result === 'object') {
        content = result.generated_text || result.text || JSON.stringify(result);
      } else {
        content = String(result);
      }

      return {
        content,
        tokens: this.estimateTokens(input, content),
        cost: 0, // Hugging Face Inference API is often free
        model: modelId,
        provider: 'huggingface'
      };
    } catch (error) {
      console.error('Error calling Hugging Face model:', error);
      throw error;
    }
  }

  // Convert Hugging Face model to our ModelConfig format
  convertToModelConfig(hfModel: HuggingFaceModel, customConfig?: Partial<ModelConfig>): ModelConfig {
    const isCodeModel = hfModel.tags.some(tag => 
      ['code', 'coding', 'programming'].includes(tag.toLowerCase())
    );
    const isMultilingual = hfModel.tags.some(tag => 
      ['multilingual', 'translation'].includes(tag.toLowerCase())
    );
    const isVisionModel = hfModel.pipeline_tag === 'image-to-text' || 
                         hfModel.tags.includes('vision');

    return {
      id: `hf-${hfModel.id.replace('/', '-')}`,
      name: hfModel.id.split('/').pop() || hfModel.id,
      provider: 'huggingface',
      modelId: hfModel.id,
      costPer1kInput: 0,
      costPer1kOutput: 0,
      maxTokens: 2048,
      supportsStreaming: false,
      supportsImages: false,
      supportsVision: isVisionModel,
      supportsAudio: false,
      supportsVideo: false,
      supportsCode: isCodeModel,
      supportsFunction: false,
      isOpenSource: true,
      requiresGPU: hfModel.downloads > 10000,
      strengths: this.inferStrengths(hfModel),
      weaknesses: ['limited context', 'no streaming'],
      bestFor: this.inferBestFor(hfModel),
      apiUrl: `${this.baseUrl}/models/${hfModel.id}`,
      contextWindow: 2048,
      trainingData: 'Unknown',
      releaseDate: 'Unknown',
      license: 'Open Source',
      modelSize: 'Unknown',
      architecture: 'Transformer',
      languages: isMultilingual ? ['multilingual'] : ['en'],
      ...customConfig
    };
  }

  private inferStrengths(model: HuggingFaceModel): string[] {
    const strengths = ['open source', 'free inference'];
    
    if (model.downloads > 100000) strengths.push('popular');
    if (model.likes > 1000) strengths.push('community favorite');
    if (model.tags.includes('code')) strengths.push('code generation');
    if (model.tags.includes('multilingual')) strengths.push('multilingual');
    if (model.pipeline_tag === 'translation') strengths.push('translation');
    if (model.pipeline_tag === 'summarization') strengths.push('summarization');
    if (model.pipeline_tag === 'question-answering') strengths.push('question answering');
    
    return strengths;
  }

  private inferBestFor(model: HuggingFaceModel): string[] {
    const bestFor = [];
    
    switch (model.pipeline_tag) {
      case 'text-generation':
        bestFor.push('text generation', 'creative writing', 'general chat');
        break;
      case 'translation':
        bestFor.push('language translation', 'multilingual tasks');
        break;
      case 'summarization':
        bestFor.push('text summarization', 'document analysis');
        break;
      case 'question-answering':
        bestFor.push('Q&A systems', 'information retrieval');
        break;
      case 'image-to-text':
        bestFor.push('image captioning', 'visual analysis');
        break;
      default:
        bestFor.push('specialized tasks');
    }
    
    if (model.tags.includes('code')) {
      bestFor.push('code generation', 'programming assistance');
    }
    
    return bestFor;
  }

  private estimateTokens(input: string, output: string): number {
    // Rough estimation: 1 token ≈ 0.75 words
    const inputWords = input.split(' ').length;
    const outputWords = output.split(' ').length;
    return Math.ceil((inputWords + outputWords) * 1.33);
  }

  // Get model information
  async getModelInfo(modelId: string): Promise<any> {
    try {
      const response = await fetch(`https://huggingface.co/api/models/${modelId}`);
      if (!response.ok) {
        throw new Error(`Failed to get model info: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting model info:', error);
      return null;
    }
  }

  // Test if a model is available
  async testModel(modelId: string): Promise<boolean> {
    try {
      const response = await this.callModel(modelId, 'Test', {
        parameters: { max_length: 10 },
        wait_for_model: false
      });
      return !!response.content;
    } catch (error) {
      return false;
    }
  }

  // Get recommended models for a specific task
  getRecommendedModels(task: 'code' | 'chat' | 'translation' | 'summarization' | 'qa'): string[] {
    const recommendations = {
      code: [
        'codellama/CodeLlama-7b-Instruct-hf',
        'microsoft/DialoGPT-medium',
        'bigcode/starcoder',
        'WizardLM/WizardCoder-15B-V1.0'
      ],
      chat: [
        'microsoft/DialoGPT-large',
        'facebook/blenderbot-400M-distill',
        'microsoft/DialoGPT-medium',
        'PygmalionAI/pygmalion-6b'
      ],
      translation: [
        'Helsinki-NLP/opus-mt-en-de',
        'Helsinki-NLP/opus-mt-en-fr',
        'Helsinki-NLP/opus-mt-en-es',
        'facebook/mbart-large-50-many-to-many-mmt'
      ],
      summarization: [
        'facebook/bart-large-cnn',
        'google/pegasus-xsum',
        'sshleifer/distilbart-cnn-12-6',
        'philschmid/bart-large-cnn-samsum'
      ],
      qa: [
        'deepset/roberta-base-squad2',
        'microsoft/DialoGPT-medium',
        'facebook/rag-token-nq',
        'distilbert-base-cased-distilled-squad'
      ]
    };

    return recommendations[task] || [];
  }
}

export const huggingFaceIntegration = new HuggingFaceIntegration();