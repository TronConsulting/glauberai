import { ModelConfig } from './ai-routing';
import { Buffer } from 'buffer';

export interface AIResponse {
  content: string;
  tokens: number;
  cost: number;
  model: string;
  provider: string;
}

export interface FileData {
  name: string;
  type: string;
  size: number;
  data: string; // base64 encoded
}

export class AIIntegration {
  protected apiKeys: Record<string, string> = {};

  constructor() {
    // Load API keys from environment variables
    this.apiKeys = {
      openai: process.env.OPENAI_API_KEY || '',
      anthropic: process.env.ANTHROPIC_API_KEY || '',
      google: process.env.GOOGLE_API_KEY || '',
      cohere: process.env.COHERE_API_KEY || '',
      mistral: process.env.MISTRAL_API_KEY || '',
      stability: process.env.STABILITY_API_KEY || '',
    };
  }

  async callModel(
    model: ModelConfig,
    query: string,
    files?: FileData[]
  ): Promise<AIResponse> {
    try {
      switch (model.provider) {
        case 'openai':
          return await this.callOpenAI(model, query, files);
        case 'anthropic':
          return await this.callAnthropic(model, query, files);
        case 'google':
          return await this.callGoogle(model, query, files);
        case 'cohere':
          return await this.callCohere(model, query, files);
        case 'mistral':
          return await this.callMistral(model, query, files);
        case 'stability':
          return await this.callStability(model, query, files);
        case 'dalle':
          return await this.callDalle(model, query, files);
        case 'midjourney':
          return await this.callMidjourney(model, query, files);
        default:
          throw new Error(`Unsupported provider: ${model.provider}`);
      }
    } catch (error) {
      console.error(`Error calling ${model.provider} API:`, error);
      // Return a fallback response
      return {
        content: `Sorry, I encountered an error while processing your request with ${model.name}. Please try again later.`,
        tokens: 0,
        cost: 0,
        model: model.name,
        provider: model.provider
      };
    }
  }

  private async callOpenAI(model: ModelConfig, query: string, files?: FileData[]): Promise<AIResponse> {
    const apiKey = this.apiKeys.openai;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const messages: any[] = [{ role: 'user', content: query }];

    // Handle vision models with images
    if (files && files.length > 0 && model.supportsVision) {
      const imageFiles = files.filter(f => f.type.startsWith('image/'));
      if (imageFiles.length > 0) {
        messages[0].content = [
          { type: 'text', text: query },
          ...imageFiles.map(file => ({
            type: 'image_url',
            image_url: {
              url: `data:${file.type};base64,${file.data}`
            }
          }))
        ];
      }
    }

    let response;
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model.modelId,
          messages,
          max_tokens: Math.min(model.maxTokens, 4000),
          temperature: 0.7,
        }),
      });
    } catch (err) {
      console.error('Network error calling OpenAI:', err);
      throw new Error('Network error calling OpenAI');
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const tokens = data.usage?.total_tokens || 0;
    const cost = this.calculateCost(model, tokens);

    return {
      content,
      tokens,
      cost,
      model: model.name,
      provider: 'openai'
    };
  }

  private async callAnthropic(model: ModelConfig, query: string, files?: FileData[]): Promise<AIResponse> {
    const apiKey = this.apiKeys.anthropic;
    if (!apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const content: any[] = [{ type: 'text', text: query }];

    // Handle vision models with images
    if (files && files.length > 0 && model.supportsVision) {
      const imageFiles = files.filter(f => f.type.startsWith('image/'));
      if (imageFiles.length > 0) {
        content.push(...imageFiles.map(file => ({
          type: 'image',
          source: {
            type: 'base64',
            media_type: file.type,
            data: file.data
          }
        })));
      }
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model.modelId,
        max_tokens: Math.min(model.maxTokens, 4000),
        messages: [{ role: 'user', content }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    const responseContent = data.content[0]?.text || '';
    const tokens = data.usage?.input_tokens + data.usage?.output_tokens || 0;
    const cost = this.calculateCost(model, tokens);

    return {
      content: responseContent,
      tokens,
      cost,
      model: model.name,
      provider: 'anthropic'
    };
  }

  private async callGoogle(model: ModelConfig, query: string, files?: FileData[]): Promise<AIResponse> {
    const apiKey = this.apiKeys.google;
    if (!apiKey) {
      throw new Error('Google API key not configured');
    }

    const contents: any[] = [{ parts: [{ text: query }] }];

    // Handle vision models with images
    if (files && files.length > 0 && model.supportsVision) {
      const imageFiles = files.filter(f => f.type.startsWith('image/'));
      if (imageFiles.length > 0) {
        contents[0].parts.push(...imageFiles.map(file => ({
          inline_data: {
            mime_type: file.type,
            data: file.data
          }
        })));
      }
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model.modelId}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          maxOutputTokens: Math.min(model.maxTokens, 4000),
          temperature: 0.7,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Google API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.candidates[0]?.content?.parts[0]?.text || '';
    const tokens = data.usageMetadata?.totalTokenCount || 0;
    const cost = this.calculateCost(model, tokens);

    return {
      content,
      tokens,
      cost,
      model: model.name,
      provider: 'google'
    };
  }

  private async callCohere(model: ModelConfig, query: string, files?: FileData[]): Promise<AIResponse> {
    const apiKey = this.apiKeys.cohere;
    if (!apiKey) {
      throw new Error('Cohere API key not configured');
    }

    const response = await fetch('https://api.cohere.com/v1/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model.modelId,
        message: query,
        max_tokens: Math.min(model.maxTokens, 4000),
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`Cohere API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.text || '';
    const tokens = data.meta?.billed_units?.input_tokens + data.meta?.billed_units?.output_tokens || 0;
    const cost = this.calculateCost(model, tokens);

    return {
      content,
      tokens,
      cost,
      model: model.name,
      provider: 'cohere'
    };
  }

  private async callMistral(model: ModelConfig, query: string, files?: FileData[]): Promise<AIResponse> {
    const apiKey = this.apiKeys.mistral;
    if (!apiKey) {
      throw new Error('Mistral API key not configured');
    }

    const messages = [{ role: 'user', content: query }];

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model.modelId,
        messages,
        max_tokens: Math.min(model.maxTokens, 4000),
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    const tokens = data.usage?.total_tokens || 0;
    const cost = this.calculateCost(model, tokens);

    return {
      content,
      tokens,
      cost,
      model: model.name,
      provider: 'mistral'
    };
  }

  private async callStability(model: ModelConfig, query: string, files?: FileData[]): Promise<AIResponse> {
    const apiKey = this.apiKeys.stability;
    if (!apiKey) {
      throw new Error('Stability API key not configured');
    }

    const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text_prompts: [{ text: query }],
        cfg_scale: 7,
        height: 1024,
        width: 1024,
        samples: 1,
        steps: 30,
      }),
    });

    if (!response.ok) {
      throw new Error(`Stability API error: ${response.statusText}`);
    }

    const data = await response.json();
    const imageData = data.artifacts[0]?.base64 || '';
    const content = `Generated image: data:image/png;base64,${imageData}`;
    const tokens = query.length / 4; // Rough estimate
    const cost = this.calculateCost(model, tokens);

    return {
      content,
      tokens,
      cost,
      model: model.name,
      provider: 'stability'
    };
  }

  private async callDalle(model: ModelConfig, query: string, files?: FileData[]): Promise<AIResponse> {
    const apiKey = this.apiKeys.openai;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured for DALL-E');
    }

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model.modelId,
        prompt: query,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      }),
    });

    if (!response.ok) {
      throw new Error(`DALL-E API error: ${response.statusText}`);
    }

    const data = await response.json();
    const imageUrl = data.data[0]?.url || '';
    const content = `Generated image: ${imageUrl}`;
    const tokens = query.length / 4; // Rough estimate
    const cost = this.calculateCost(model, tokens);

    return {
      content,
      tokens,
      cost,
      model: model.name,
      provider: 'dalle'
    };
  }

  private async callMidjourney(model: ModelConfig, query: string, files?: FileData[]): Promise<AIResponse> {
    // Note: Midjourney doesn't have a public API, this is a placeholder
    // In a real implementation, you'd need to use a Discord bot or third-party service
    const content = `[Midjourney image generation would be implemented here for: "${query}"]`;
    const tokens = query.length / 4;
    const cost = this.calculateCost(model, tokens);

    return {
      content,
      tokens,
      cost,
      model: model.name,
      provider: 'midjourney'
    };
  }

  protected calculateCost(model: ModelConfig, tokens: number): number {
    const inputTokens = tokens * 0.7; // Assume 70% input, 30% output
    const outputTokens = tokens * 0.3;
    
    const inputCost = (inputTokens / 1000) * model.costPer1kInput;
    const outputCost = (outputTokens / 1000) * model.costPer1kOutput;
    
    return inputCost + outputCost;
  }

  // Utility method to convert files to base64
  async filesToBase64(files: File[]): Promise<FileData[]> {
    const fileData: FileData[] = [];
    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        fileData.push({
          name: file.name,
          type: file.type,
          size: file.size,
          data: base64
        });
      } catch (err) {
        console.error('Error converting file to base64:', file.name, err);
      }
    }
    return fileData;
  }
}

export const aiIntegration = new AIIntegration(); 