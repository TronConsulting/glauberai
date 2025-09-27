// Sophisticated AI Model Routing Logic
export interface RoutingRule {
  id: string;
  name: string;
  conditions: {
    keywords?: string[];
    queryLength?: { min?: number; max?: number };
    domain?: string[];
    complexity?: 'simple' | 'medium' | 'complex';
    contentType?: 'text' | 'image' | 'code' | 'analysis' | 'creative' | 'translation' | 'math' | 'reasoning';
    language?: string[];
    sentiment?: 'positive' | 'negative' | 'neutral';
    urgency?: 'low' | 'medium' | 'high';
  };
  targetModel: string;
  priority: number;
  confidence: number;
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'cohere' | 'mistral' | 'meta' | 'stability' | 'midjourney' | 'dalle' | 
            'huggingface' | 'replicate' | 'together' | 'perplexity' | 'fireworks' | 'groq' | 'anyscale' | 'runpod' |
            'custom' | 'local' | 'ollama' | 'openrouter' | 'deepinfra' | '01ai' | 'deepseek' | 'xi-ai' | 'moonshot' | 'baichuan' |
            'zhipu' | 'alibaba' | 'baidu' | 'tencent' | 'bytedance' | 'minimax' | 'sensetime' | 'yandex' | 'ai21';
  modelId: string;
  costPer1kInput: number;
  costPer1kOutput: number;
  maxTokens: number;
  supportsStreaming: boolean;
  supportsImages: boolean;
  supportsVision: boolean;
  supportsAudio: boolean;
  supportsVideo: boolean;
  supportsCode: boolean;
  supportsFunction: boolean;
  isOpenSource: boolean;
  requiresGPU: boolean;
  strengths: string[];
  weaknesses: string[];
  bestFor: string[];
  apiUrl: string;
  apiKey?: string;
  contextWindow: number;
  trainingData: string;
  releaseDate: string;
  license?: string;
  modelSize?: string;
  architecture?: string;
  languages?: string[];
  region?: string;
  customEndpoint?: string;
  headers?: Record<string, string>;
}

export const COMPREHENSIVE_MODELS: ModelConfig[] = [
  // OpenAI Models
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    modelId: 'gpt-4-turbo-preview',
    costPer1kInput: 0.01,
    costPer1kOutput: 0.03,
    maxTokens: 128000,
    supportsStreaming: true,
    supportsImages: false,
    supportsVision: true,
    supportsAudio: false,
    supportsVideo: false,
    supportsCode: true,
    supportsFunction: true,
    isOpenSource: false,
    requiresGPU: false,
    strengths: ['complex reasoning', 'code generation', 'analysis', 'mathematics', 'creative writing'],
    weaknesses: ['cost', 'speed'],
    bestFor: ['complex problem solving', 'advanced coding', 'detailed analysis'],
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    contextWindow: 128000,
    trainingData: 'Up to April 2024',
    releaseDate: '2024-04-09'
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    modelId: 'gpt-4o',
    costPer1kInput: 0.005,
    costPer1kOutput: 0.015,
    maxTokens: 128000,
    supportsStreaming: true,
    supportsImages: false,
    supportsVision: true,
    supportsAudio: true,
    supportsVideo: false,
    supportsCode: true,
    supportsFunction: true,
    isOpenSource: false,
    requiresGPU: false,
    strengths: ['multimodal', 'fast', 'cost-effective', 'reasoning'],
    weaknesses: ['newer model', 'less tested'],
    bestFor: ['general purpose', 'multimodal tasks', 'real-time applications'],
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    contextWindow: 128000,
    trainingData: 'Up to October 2023',
    releaseDate: '2024-05-13'
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    modelId: 'gpt-3.5-turbo',
    costPer1kInput: 0.0005,
    costPer1kOutput: 0.0015,
    maxTokens: 16385,
    supportsStreaming: true,
    supportsImages: false,
    supportsVision: false,
    supportsAudio: false,
    supportsVideo: false,
    supportsCode: true,
    supportsFunction: true,
    isOpenSource: false,
    requiresGPU: false,
    strengths: ['fast', 'cost-effective', 'general purpose'],
    weaknesses: ['limited reasoning', 'context window'],
    bestFor: ['simple queries', 'chat', 'basic tasks'],
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    contextWindow: 16385,
    trainingData: 'Up to September 2021',
    releaseDate: '2022-11-30'
  },
  {
    id: 'dalle-3',
    name: 'DALL-E 3',
    provider: 'dalle',
    modelId: 'dall-e-3',
    costPer1kInput: 0.04,
    costPer1kOutput: 0,
    maxTokens: 4000,
    supportsStreaming: false,
    supportsImages: true,
    supportsVision: false,
    supportsAudio: false,
    supportsVideo: false,
    supportsCode: false,
    supportsFunction: false,
    isOpenSource: false,
    requiresGPU: false,
    strengths: ['high quality images', 'text-to-image', 'artistic'],
    weaknesses: ['expensive', 'no vision'],
    bestFor: ['image generation', 'artistic content', 'visual design'],
    apiUrl: 'https://api.openai.com/v1/images/generations',
    contextWindow: 4000,
    trainingData: 'Up to April 2023',
    releaseDate: '2023-10-20'
  },

  // Anthropic Models
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    modelId: 'claude-3-opus-20240229',
    costPer1kInput: 0.015,
    costPer1kOutput: 0.075,
    maxTokens: 200000,
    supportsStreaming: true,
    supportsImages: false,
    supportsVision: true,
    supportsAudio: false,
    supportsVideo: false,
    supportsCode: true,
    supportsFunction: true,
    isOpenSource: false,
    requiresGPU: false,
    strengths: ['reasoning', 'analysis', 'safety', 'long context'],
    weaknesses: ['expensive', 'slower'],
    bestFor: ['complex analysis', 'research', 'safety-critical tasks'],
    apiUrl: 'https://api.anthropic.com/v1/messages',
    contextWindow: 200000,
    trainingData: 'Up to August 2023',
    releaseDate: '2024-03-04'
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    modelId: 'claude-3-sonnet-20240229',
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    maxTokens: 200000,
    supportsStreaming: true,
    supportsImages: false,
    supportsVision: true,
    supportsAudio: false,
    supportsVideo: false,
    supportsCode: true,
    supportsFunction: true,
    isOpenSource: false,
    requiresGPU: false,
    strengths: ['balanced performance', 'creative writing', 'analysis'],
    weaknesses: ['moderate cost'],
    bestFor: ['general purpose', 'creative writing', 'analysis'],
    apiUrl: 'https://api.anthropic.com/v1/messages',
    contextWindow: 200000,
    trainingData: 'Up to August 2023',
    releaseDate: '2024-03-04'
  },
  {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    modelId: 'claude-3-haiku-20240307',
    costPer1kInput: 0.00025,
    costPer1kOutput: 0.00125,
    maxTokens: 200000,
    supportsStreaming: true,
    supportsImages: false,
    supportsVision: true,
    supportsAudio: false,
    supportsVideo: false,
    supportsCode: true,
    supportsFunction: true,
    isOpenSource: false,
    requiresGPU: false,
    strengths: ['fast', 'cost-effective', 'vision'],
    weaknesses: ['limited reasoning'],
    bestFor: ['simple tasks', 'vision tasks', 'cost-sensitive applications'],
    apiUrl: 'https://api.anthropic.com/v1/messages',
    contextWindow: 200000,
    trainingData: 'Up to August 2023',
    releaseDate: '2024-03-04'
  },

  // Google Models
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'google',
    modelId: 'gemini-pro',
    costPer1kInput: 0.0005,
    costPer1kOutput: 0.0015,
    maxTokens: 32768,
    supportsStreaming: true,
    supportsImages: false,
    supportsVision: false,
    supportsAudio: false,
    supportsVideo: false,
    supportsCode: true,
    supportsFunction: true,
    isOpenSource: false,
    requiresGPU: false,
    strengths: ['reasoning', 'code', 'multilingual'],
    weaknesses: ['limited context', 'no vision'],
    bestFor: ['reasoning tasks', 'code generation', 'multilingual content'],
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro',
    contextWindow: 32768,
    trainingData: 'Up to February 2024',
    releaseDate: '2023-12-06'
  },
  {
    id: 'gemini-pro-vision',
    name: 'Gemini Pro Vision',
    provider: 'google',
    modelId: 'gemini-pro-vision',
    costPer1kInput: 0.0005,
    costPer1kOutput: 0.0015,
    maxTokens: 32768,
    supportsStreaming: true,
    supportsImages: false,
    supportsVision: true,
    supportsAudio: false,
    supportsVideo: false,
    supportsCode: true,
    supportsFunction: true,
    isOpenSource: false,
    requiresGPU: false,
    strengths: ['vision', 'reasoning', 'multilingual'],
    weaknesses: ['limited context'],
    bestFor: ['image analysis', 'visual reasoning', 'multilingual vision tasks'],
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision',
    contextWindow: 32768,
    trainingData: 'Up to February 2024',
    releaseDate: '2023-12-06'
  },

  // Cohere Models
  {
    id: 'command-r-plus',
    name: 'Command R+',
    provider: 'cohere',
    modelId: 'command-r-plus',
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    maxTokens: 128000,
    supportsStreaming: true,
    supportsImages: false,
    supportsVision: false,
    supportsAudio: false,
    supportsVideo: false,
    supportsCode: true,
    supportsFunction: true,
    isOpenSource: false,
    requiresGPU: false,
    strengths: ['reasoning', 'tool use', 'long context'],
    weaknesses: ['less tested', 'limited vision'],
    bestFor: ['reasoning', 'tool use', 'long documents'],
    apiUrl: 'https://api.cohere.com/v1/chat',
    contextWindow: 128000,
    trainingData: 'Up to March 2024',
    releaseDate: '2024-03-19'
  },
  {
    id: 'command-r',
    name: 'Command R',
    provider: 'cohere',
    modelId: 'command-r',
    costPer1kInput: 0.0005,
    costPer1kOutput: 0.0015,
    maxTokens: 128000,
    supportsStreaming: true,
    supportsImages: false,
    supportsVision: false,
    supportsAudio: false,
    supportsVideo: false,
    supportsCode: true,
    supportsFunction: true,
    isOpenSource: false,
    requiresGPU: false,
    strengths: ['fast', 'cost-effective', 'long context'],
    weaknesses: ['limited reasoning'],
    bestFor: ['general purpose', 'long documents', 'cost-sensitive tasks'],
    apiUrl: 'https://api.cohere.com/v1/chat',
    contextWindow: 128000,
    trainingData: 'Up to March 2024',
    releaseDate: '2024-03-19'
  },

  // Mistral Models
  {
    id: 'mistral-large',
    name: 'Mistral Large',
    provider: 'mistral',
    modelId: 'mistral-large-latest',
    costPer1kInput: 0.007,
    costPer1kOutput: 0.024,
    maxTokens: 32768,
    supportsStreaming: true,
    supportsImages: false,
    supportsVision: false,
    supportsAudio: false,
    supportsVideo: false,
    supportsCode: true,
    supportsFunction: true,
    isOpenSource: true,
    requiresGPU: false,
    strengths: ['reasoning', 'multilingual', 'code'],
    weaknesses: ['no vision', 'moderate cost'],
    bestFor: ['reasoning', 'multilingual tasks', 'code generation'],
    apiUrl: 'https://api.mistral.ai/v1/chat/completions',
    contextWindow: 32768,
    trainingData: 'Up to 2024',
    releaseDate: '2024-02-26'
  },
  {
    id: 'mistral-medium',
    name: 'Mistral Medium',
    provider: 'mistral',
    modelId: 'mistral-medium-latest',
    costPer1kInput: 0.0027,
    costPer1kOutput: 0.0081,
    maxTokens: 32768,
    supportsStreaming: true,
    supportsImages: false,
    supportsVision: false,
    supportsAudio: false,
    supportsVideo: false,
    supportsCode: true,
    supportsFunction: true,
    isOpenSource: true,
    requiresGPU: false,
    strengths: ['balanced performance', 'multilingual'],
    weaknesses: ['no vision'],
    bestFor: ['general purpose', 'multilingual content'],
    apiUrl: 'https://api.mistral.ai/v1/chat/completions',
    contextWindow: 32768,
    trainingData: 'Up to 2024',
    releaseDate: '2024-02-26'
  },

  // Image Generation Models
  {
    id: 'midjourney-v6',
    name: 'Midjourney V6',
    provider: 'midjourney',
    modelId: 'midjourney-v6',
    costPer1kInput: 0.08,
    costPer1kOutput: 0,
    maxTokens: 2000,
    supportsStreaming: false,
    supportsImages: true,
    supportsVision: false,
    supportsAudio: false,
    supportsVideo: false,
    supportsCode: false,
    supportsFunction: false,
    isOpenSource: false,
    requiresGPU: true,
    strengths: ['artistic quality', 'creative style', 'photorealistic'],
    weaknesses: ['expensive', 'no API access', 'slow'],
    bestFor: ['artistic images', 'creative content', 'high-quality visuals'],
    apiUrl: 'https://discord.com/api/v9/channels/{channel_id}/messages',
    contextWindow: 2000,
    trainingData: 'Up to 2024',
    releaseDate: '2024-01-01'
  },
  {
    id: 'stable-diffusion-xl',
    name: 'Stable Diffusion XL',
    provider: 'stability',
    modelId: 'stable-diffusion-xl-1024-v1-0',
    costPer1kInput: 0.02,
    costPer1kOutput: 0,
    maxTokens: 1000,
    supportsStreaming: false,
    supportsImages: true,
    supportsVision: false,
    supportsAudio: false,
    supportsVideo: false,
    supportsCode: false,
    supportsFunction: false,
    isOpenSource: true,
    requiresGPU: true,
    strengths: ['open source', 'customizable', 'fast'],
    weaknesses: ['lower quality', 'limited control'],
    bestFor: ['rapid prototyping', 'custom models', 'cost-sensitive image generation'],
    apiUrl: 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
    contextWindow: 1000,
    trainingData: 'Up to 2023',
    releaseDate: '2023-07-26'
  },

  // Open Source Models via Together AI
  {
    id: 'together-llama-2-70b',
    name: 'Llama 2 70B (Together)',
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
    strengths: ['large scale', 'open source', 'strong reasoning', 'fast inference'],
    weaknesses: ['higher cost', 'limited context'],
    bestFor: ['complex reasoning', 'code generation', 'long conversations'],
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
    name: 'Mixtral 8x7B (Together)',
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
    strengths: ['long context', 'mixture of experts', 'multilingual', 'efficient'],
    weaknesses: ['complex architecture'],
    bestFor: ['long documents', 'multilingual tasks', 'efficient inference'],
    apiUrl: 'https://api.together.xyz/v1',
    contextWindow: 32768,
    trainingData: 'Up to 2023',
    releaseDate: '2023-12-11',
    license: 'Apache 2.0',
    architecture: 'Mixture of Experts',
    modelSize: '8x7B parameters'
  },

  // Groq Models (Ultra-fast inference)
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
    strengths: ['ultra-fast inference', 'low latency', 'open source', 'high throughput'],
    weaknesses: ['limited model selection', 'shorter context'],
    bestFor: ['real-time applications', 'fast responses', 'high-volume requests'],
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
    strengths: ['ultra-fast inference', 'long context', 'mixture of experts', 'high performance'],
    weaknesses: ['limited availability'],
    bestFor: ['long conversations', 'document analysis', 'fast inference'],
    apiUrl: 'https://api.groq.com/openai/v1',
    contextWindow: 32768,
    trainingData: 'Up to 2023',
    releaseDate: '2023-12-11',
    license: 'Apache 2.0',
    architecture: 'Mixture of Experts',
    modelSize: '8x7B parameters'
  },

  // Replicate Models
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
    strengths: ['high quality images', 'fast generation', 'open source', 'community models'],
    weaknesses: ['pay per use', 'image only'],
    bestFor: ['image generation', 'art creation', 'visual content'],
    apiUrl: 'https://api.replicate.com/v1',
    contextWindow: 512,
    trainingData: 'LAION-5B',
    releaseDate: '2023-07-26',
    license: 'CreativeML Open RAIL++-M',
    architecture: 'Diffusion',
    modelSize: '3.5B parameters'
  },

  // OpenRouter Popular Models  
  {
    id: 'openrouter-code-llama',
    name: 'Code Llama (OpenRouter)',
    provider: 'openrouter',
    modelId: 'codellama/codellama-34b-instruct',
    costPer1kInput: 0.0005,
    costPer1kOutput: 0.0005,
    maxTokens: 8192,
    supportsStreaming: true,
    supportsImages: false,
    supportsVision: false,
    supportsAudio: false,
    supportsVideo: false,
    supportsCode: true,
    supportsFunction: true,
    isOpenSource: true,
    requiresGPU: true,
    strengths: ['specialized for code', 'large context', 'open source', 'Meta developed'],
    weaknesses: ['code-focused only'],
    bestFor: ['code generation', 'programming assistance', 'debugging'],
    apiUrl: 'https://openrouter.ai/api/v1',
    contextWindow: 8192,
    trainingData: 'Code datasets up to 2023',
    releaseDate: '2023-08-24',
    license: 'Custom License',
    architecture: 'Transformer',
    modelSize: '34B parameters'
  },

  // HuggingFace Free Models
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
  },

  // DeepInfra Models (Very cheap)
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

export const SOPHISTICATED_ROUTING_RULES: RoutingRule[] = [
  // Explicit OpenAI/ChatGPT keyword rule
  {
    id: 'openai-keyword',
    name: 'OpenAI/ChatGPT Keyword',
    conditions: {
      keywords: ['openai', 'chatgpt', 'gpt', 'gpt-4', 'gpt-3.5'],
    },
    targetModel: 'gpt-4o',
    priority: 100,
    confidence: 1.0
  },
  // Image Generation Rules
  {
    id: 'image-generation-artistic',
    name: 'Artistic Image Generation',
    conditions: {
      keywords: ['create', 'generate', 'draw', 'paint', 'art', 'artistic', 'style', 'portrait', 'landscape', 'scene'],
      contentType: 'image',
      complexity: 'medium'
    },
    targetModel: 'dalle-3',
    priority: 15,
    confidence: 0.95
  },
  {
    id: 'image-generation-photorealistic',
    name: 'Photorealistic Image Generation',
    conditions: {
      keywords: ['photo', 'photograph', 'realistic', 'photorealistic', 'camera', 'shot'],
      contentType: 'image'
    },
    targetModel: 'midjourney-v6',
    priority: 14,
    confidence: 0.9
  },
  {
    id: 'image-generation-fast',
    name: 'Fast Image Generation',
    conditions: {
      keywords: ['quick', 'fast', 'rapid', 'prototype'],
      contentType: 'image',
      urgency: 'high'
    },
    targetModel: 'stable-diffusion-xl',
    priority: 13,
    confidence: 0.85
  },

  // Complex Reasoning Rules
  {
    id: 'complex-reasoning',
    name: 'Complex Reasoning Tasks',
    conditions: {
      keywords: ['analyze', 'reason', 'logic', 'deduce', 'infer', 'conclude', 'evaluate'],
      complexity: 'complex',
      contentType: 'reasoning'
    },
    targetModel: 'claude-3-opus',
    priority: 12,
    confidence: 0.95
  },
  {
    id: 'mathematical-reasoning',
    name: 'Mathematical Reasoning',
    conditions: {
      keywords: ['solve', 'calculate', 'equation', 'formula', 'mathematics', 'math', 'algebra', 'calculus'],
      contentType: 'math'
    },
    targetModel: 'gpt-4-turbo',
    priority: 11,
    confidence: 0.9
  },

  // Code Generation Rules
  {
    id: 'complex-coding',
    name: 'Complex Code Generation',
    conditions: {
      keywords: ['algorithm', 'optimize', 'refactor', 'architecture', 'design pattern', 'framework'],
      contentType: 'code',
      complexity: 'complex'
    },
    targetModel: 'gpt-4-turbo',
    priority: 10,
    confidence: 0.9
  },
  {
    id: 'simple-coding',
    name: 'Simple Code Generation',
    conditions: {
      keywords: ['function', 'code', 'script', 'program', 'javascript', 'python', 'html', 'css'],
      contentType: 'code',
      complexity: 'simple'
    },
    targetModel: 'gpt-3.5-turbo',
    priority: 8,
    confidence: 0.85
  },

  // Creative Writing Rules
  {
    id: 'creative-writing',
    name: 'Creative Writing',
    conditions: {
      keywords: ['write', 'story', 'creative', 'poem', 'article', 'blog', 'content', 'narrative'],
      contentType: 'creative'
    },
    targetModel: 'claude-3-sonnet',
    priority: 9,
    confidence: 0.9
  },

  // Analysis Rules
  {
    id: 'document-analysis',
    name: 'Document Analysis',
    conditions: {
      keywords: ['analyze', 'review', 'summarize', 'explain', 'interpret', 'examine'],
      queryLength: { min: 200 },
      contentType: 'analysis'
    },
    targetModel: 'claude-3-sonnet',
    priority: 9,
    confidence: 0.85
  },

  // Vision Tasks
  {
    id: 'vision-analysis',
    name: 'Vision Analysis',
    conditions: {
      keywords: ['image', 'photo', 'picture', 'visual', 'see', 'look', 'describe'],
      contentType: 'image'
    },
    targetModel: 'gpt-4o',
    priority: 12,
    confidence: 0.95
  },
  {
    id: 'file-vision-analysis',
    name: 'File-based Vision Analysis',
    conditions: {
      contentType: 'image'
    },
    targetModel: 'gpt-4o',
    priority: 13,
    confidence: 0.98
  },

  // Multilingual Tasks
  {
    id: 'multilingual',
    name: 'Multilingual Tasks',
    conditions: {
      language: ['spanish', 'french', 'german', 'chinese', 'japanese', 'korean', 'arabic'],
      contentType: 'translation'
    },
    targetModel: 'gemini-pro',
    priority: 8,
    confidence: 0.9
  },

  // Tool Use
  {
    id: 'tool-use',
    name: 'Tool Use Tasks',
    conditions: {
      keywords: ['tool', 'function', 'api', 'integration', 'automate'],
      contentType: 'code'
    },
    targetModel: 'command-r-plus',
    priority: 10,
    confidence: 0.85
  },

  // Long Context
  {
    id: 'long-context',
    name: 'Long Context Tasks',
    conditions: {
      queryLength: { min: 1000 },
      contentType: 'analysis'
    },
    targetModel: 'claude-3-sonnet',
    priority: 9,
    confidence: 0.8
  },

  // Cost-Sensitive Tasks
  {
    id: 'cost-sensitive',
    name: 'Cost-Sensitive Tasks',
    conditions: {
      queryLength: { max: 100 },
      complexity: 'simple',
      urgency: 'low'
    },
    targetModel: 'claude-3-haiku',
    priority: 5,
    confidence: 0.8
  },

  // Free Model Preference
  {
    id: 'free-models',
    name: 'Free Models',
    conditions: {
      keywords: ['free', 'no cost', 'budget', 'test', 'demo', 'prototype'],
      complexity: 'simple'
    },
    targetModel: 'hf-google-flan-t5-large',
    priority: 8,
    confidence: 0.9
  },

  // Ultra-cheap alternatives
  {
    id: 'ultra-cheap',
    name: 'Ultra-cheap alternatives',
    conditions: {
      keywords: ['cheap', 'budget', 'affordable', 'low cost'],
      complexity: 'medium'
    },
    targetModel: 'deepinfra-meta-llama-3.1-8b-instruct',
    priority: 7,
    confidence: 0.85
  },

  // Open Source Model Rules
  {
    id: 'open-source-preference',
    name: 'Open Source Preference',
    conditions: {
      keywords: ['open source', 'open-source', 'free', 'local', 'privacy', 'offline'],
    },
    targetModel: 'together-llama-2-70b',
    priority: 8,
    confidence: 0.9
  },
  {
    id: 'fast-inference',
    name: 'Ultra-Fast Inference',
    conditions: {
      keywords: ['fast', 'quick', 'speed', 'real-time', 'instant', 'rapid'],
      urgency: 'high'
    },
    targetModel: 'groq-llama2-70b',
    priority: 9,
    confidence: 0.85
  },
  {
    id: 'cost-optimization',
    name: 'Cost Optimization',
    conditions: {
      keywords: ['cheap', 'affordable', 'cost', 'budget', 'economical'],
      complexity: 'simple'
    },
    targetModel: 'replicate-llama-2-13b',
    priority: 7,
    confidence: 0.8
  },
  {
    id: 'long-context-open-source',
    name: 'Long Context Open Source',
    conditions: {
      queryLength: { min: 2000 },
      keywords: ['document', 'long', 'analyze', 'review']
    },
    targetModel: 'together-mixtral-8x7b',
    priority: 8,
    confidence: 0.85
  },
  {
    id: 'code-specialized',
    name: 'Code Specialized',
    conditions: {
      keywords: ['code', 'programming', 'debug', 'function', 'algorithm'],
      contentType: 'code'
    },
    targetModel: 'openrouter-code-llama',
    priority: 9,
    confidence: 0.9
  },

  // General Purpose Fallback
  {
    id: 'general-purpose',
    name: 'General Purpose',
    conditions: {
      complexity: 'medium'
    },
    targetModel: 'gpt-4o',
    priority: 1,
    confidence: 0.7
  }
];

export class SophisticatedAIRouter {
  private models: ModelConfig[];
  private rules: RoutingRule[];

  constructor(models = COMPREHENSIVE_MODELS, rules = SOPHISTICATED_ROUTING_RULES) {
    this.models = models;
    this.rules = rules.sort((a, b) => b.priority - a.priority);
  }

  analyzeQuery(query: string, files?: Array<{ type: string; size: number; name: string }>): {
    complexity: 'simple' | 'medium' | 'complex';
    keywords: string[];
    length: number;
    estimatedTokens: number;
    contentType: 'text' | 'image' | 'code' | 'analysis' | 'creative' | 'translation' | 'math' | 'reasoning';
    language: string[];
    sentiment: 'positive' | 'negative' | 'neutral';
    urgency: 'low' | 'medium' | 'high';
    confidence: number;
    hasFiles: boolean;
    fileTypes: string[];
    hasImages: boolean;
    hasDocuments: boolean;
    hasAudio: boolean;
    hasVideo: boolean;
  } {
    const length = query.length;
    const words = query.toLowerCase().split(/\s+/);
    const estimatedTokens = Math.ceil(words.length * 1.3);

    // Extract meaningful keywords
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
    ]);

    const keywords = words.filter(word => 
      word.length > 2 && 
      !stopWords.has(word) &&
      /^[a-zA-Z]+$/.test(word)
    );

    // Determine complexity
    let complexity: 'simple' | 'medium' | 'complex' = 'simple';
    if (length > 500 || words.length > 100) {
      complexity = 'complex';
    } else if (length > 100 || words.length > 20) {
      complexity = 'medium';
    }

    // Determine content type
    const contentType = this.determineContentType(query, keywords);

    // Detect language
    const language = this.detectLanguage(query);

    // Determine sentiment
    const sentiment = this.analyzeSentiment(query);

    // Determine urgency
    const urgency = this.determineUrgency(query, keywords);

    // Calculate confidence
    const confidence = this.calculateConfidence(query, keywords, complexity, contentType);

    // Analyze files if provided
    const hasFiles = Boolean(files && files.length > 0);
    const fileTypes = files ? files.map(f => f.type) : [];
    const hasImages = Boolean(hasFiles && files!.some(f => f.type.startsWith('image/')));
    const hasDocuments = Boolean(hasFiles && files!.some(f => 
      f.type.includes('pdf') || f.type.includes('document') || f.type.includes('text')
    ));
    const hasAudio = Boolean(hasFiles && files!.some(f => f.type.startsWith('audio/')));
    const hasVideo = Boolean(hasFiles && files!.some(f => f.type.startsWith('video/')));

    return {
      complexity,
      keywords,
      length,
      estimatedTokens,
      contentType,
      language,
      sentiment,
      urgency,
      confidence,
      hasFiles,
      fileTypes,
      hasImages,
      hasDocuments,
      hasAudio,
      hasVideo
    };
  }

  private determineContentType(query: string, keywords: string[]): 'text' | 'image' | 'code' | 'analysis' | 'creative' | 'translation' | 'math' | 'reasoning' {
    const queryLower = query.toLowerCase();
    
    // Image generation
    if (queryLower.includes('generate') || queryLower.includes('create') || queryLower.includes('draw') || 
        queryLower.includes('image') || queryLower.includes('picture') || queryLower.includes('photo')) {
      return 'image';
    }

    // Code generation
    if (queryLower.includes('code') || queryLower.includes('function') || queryLower.includes('script') ||
        queryLower.includes('program') || queryLower.includes('algorithm') || 
        keywords.some(k => ['javascript', 'python', 'java', 'html', 'css', 'sql'].includes(k))) {
      return 'code';
    }

    // Mathematical reasoning
    if (queryLower.includes('solve') || queryLower.includes('calculate') || queryLower.includes('equation') ||
        queryLower.includes('formula') || queryLower.includes('math') || queryLower.includes('mathematics')) {
      return 'math';
    }

    // Analysis
    if (queryLower.includes('analyze') || queryLower.includes('review') || queryLower.includes('examine') ||
        queryLower.includes('evaluate') || queryLower.includes('assess')) {
      return 'analysis';
    }

    // Creative writing
    if (queryLower.includes('write') || queryLower.includes('story') || queryLower.includes('creative') ||
        queryLower.includes('poem') || queryLower.includes('article') || queryLower.includes('blog')) {
      return 'creative';
    }

    // Translation
    if (queryLower.includes('translate') || queryLower.includes('language') ||
        keywords.some(k => ['spanish', 'french', 'german', 'chinese', 'japanese'].includes(k))) {
      return 'translation';
    }

    // Reasoning
    if (queryLower.includes('reason') || queryLower.includes('logic') || queryLower.includes('deduce') ||
        queryLower.includes('infer') || queryLower.includes('conclude')) {
      return 'reasoning';
    }

    return 'text';
  }

  private detectLanguage(query: string): string[] {
    const languages = [];
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('spanish') || queryLower.includes('español')) languages.push('spanish');
    if (queryLower.includes('french') || queryLower.includes('français')) languages.push('french');
    if (queryLower.includes('german') || queryLower.includes('deutsch')) languages.push('german');
    if (queryLower.includes('chinese') || queryLower.includes('中文')) languages.push('chinese');
    if (queryLower.includes('japanese') || queryLower.includes('日本語')) languages.push('japanese');
    if (queryLower.includes('korean') || queryLower.includes('한국어')) languages.push('korean');
    if (queryLower.includes('arabic') || queryLower.includes('العربية')) languages.push('arabic');
    
    return languages;
  }

  private analyzeSentiment(query: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'problem', 'error', 'fail'];
    
    const queryLower = query.toLowerCase();
    const positiveCount = positiveWords.filter(word => queryLower.includes(word)).length;
    const negativeCount = negativeWords.filter(word => queryLower.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private determineUrgency(query: string, keywords: string[]): 'low' | 'medium' | 'high' {
    const urgentWords = ['urgent', 'asap', 'quick', 'fast', 'immediate', 'emergency'];
    const queryLower = query.toLowerCase();
    
    if (urgentWords.some(word => queryLower.includes(word))) return 'high';
    if (queryLower.includes('soon') || queryLower.includes('quickly')) return 'medium';
    return 'low';
  }

  private calculateConfidence(query: string, keywords: string[], complexity: string, contentType: string): number {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on keyword specificity
    confidence += Math.min(keywords.length * 0.05, 0.2);
    
    // Increase confidence for specific content types
    if (contentType !== 'text') confidence += 0.1;
    
    // Increase confidence for complex queries
    if (complexity === 'complex') confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  routeQuery(query: string, userPreference?: string, files?: Array<{ type: string; size: number; name: string }>): {
    selectedModel: ModelConfig;
    reasoning: string;
    estimatedCost: number;
    confidence: number;
    alternatives: ModelConfig[];
  } {
    const analysis = this.analyzeQuery(query, files);

    // If user has a specific preference, use it (if valid)
    if (userPreference && userPreference !== 'auto') {
      const preferredModel = this.models.find(m => m.id === userPreference);
      if (preferredModel) {
        return {
          selectedModel: preferredModel,
          reasoning: 'User preference',
          estimatedCost: this.calculateCost(preferredModel, analysis.estimatedTokens),
          confidence: 1.0,
          alternatives: this.getAlternatives(preferredModel, analysis)
        };
      }
    }

    // Apply sophisticated routing rules
    const matchingRules = this.rules.filter(rule => this.matchesRule(rule, analysis));
    
    if (matchingRules.length > 0) {
      const bestRule = matchingRules[0];
      const model = this.models.find(m => m.id === bestRule.targetModel);
      
      if (model) {
        return {
          selectedModel: model,
          reasoning: `Matched rule: ${bestRule.name} (confidence: ${bestRule.confidence})`,
          estimatedCost: this.calculateCost(model, analysis.estimatedTokens),
          confidence: bestRule.confidence,
          alternatives: this.getAlternatives(model, analysis)
        };
      }
    }

    // Fallback to best general-purpose model
    const fallbackModel = this.models.find(m => m.id === 'gpt-4o') || this.models[0];
    return {
      selectedModel: fallbackModel,
      reasoning: 'General purpose fallback',
      estimatedCost: this.calculateCost(fallbackModel, analysis.estimatedTokens),
      confidence: 0.7,
      alternatives: this.getAlternatives(fallbackModel, analysis)
    };
  }

  private matchesRule(rule: RoutingRule, analysis: any): boolean {
    const { conditions } = rule;

    // Check keywords
    if (conditions.keywords) {
      const hasKeyword = conditions.keywords.some(keyword =>
        analysis.keywords.some((queryKeyword: string) =>
          queryKeyword.includes(keyword.toLowerCase()) ||
          keyword.toLowerCase().includes(queryKeyword)
        )
      );
      if (!hasKeyword) return false;
    }

    // Check for file-based conditions
    if (analysis.hasFiles) {
      // If rule is specifically for file analysis, prioritize it
      if (rule.id.includes('file-') || rule.id.includes('vision')) {
        if (analysis.hasImages && rule.targetModel.includes('vision')) {
          return true; // Prioritize vision models for image files
        }
      }
    }

    // Check query length
    if (conditions.queryLength) {
      if (conditions.queryLength.min && analysis.length < conditions.queryLength.min) {
        return false;
      }
      if (conditions.queryLength.max && analysis.length > conditions.queryLength.max) {
        return false;
      }
    }

    // Check complexity
    if (conditions.complexity && conditions.complexity !== analysis.complexity) {
      return false;
    }

    // Check content type
    if (conditions.contentType && conditions.contentType !== analysis.contentType) {
      return false;
    }

    // Check language
    if (conditions.language) {
      const hasLanguage = conditions.language.some(lang =>
        analysis.language.includes(lang)
      );
      if (!hasLanguage) return false;
    }

    // Check sentiment
    if (conditions.sentiment && conditions.sentiment !== analysis.sentiment) {
      return false;
    }

    // Check urgency
    if (conditions.urgency && conditions.urgency !== analysis.urgency) {
      return false;
    }

    return true;
  }

  public calculateCost(model: ModelConfig, estimatedTokens: number): number {
    const inputTokens = estimatedTokens;
    const outputTokens = estimatedTokens * 0.5; // Assume output is half of input
    
    const inputCost = (inputTokens / 1000) * model.costPer1kInput;
    const outputCost = (outputTokens / 1000) * model.costPer1kOutput;
    
    return inputCost + outputCost;
  }

  private getAlternatives(selectedModel: ModelConfig, analysis: any): ModelConfig[] {
    // Return 2-3 alternative models based on the analysis
    const alternatives = this.models
      .filter(m => m.id !== selectedModel.id)
      .filter(m => {
        // Filter based on content type compatibility
        if (analysis.contentType === 'image' && !m.supportsImages) return false;
        if (analysis.contentType === 'image' && m.supportsVision) return true;
        return true;
      })
      .sort((a, b) => {
        // Sort by cost-effectiveness and capability
        const aCost = this.calculateCost(a, analysis.estimatedTokens);
        const bCost = this.calculateCost(b, analysis.estimatedTokens);
        return aCost - bCost;
      })
      .slice(0, 3);

    return alternatives;
  }

  getAvailableModels(): ModelConfig[] {
    return this.models;
  }

  getRoutingRules(): RoutingRule[] {
    return this.rules;
  }

  getModelsByType(type: 'text' | 'image' | 'vision' | 'audio'): ModelConfig[] {
    switch (type) {
      case 'text':
        return this.models.filter(m => !m.supportsImages && !m.supportsVision);
      case 'image':
        return this.models.filter(m => m.supportsImages);
      case 'vision':
        return this.models.filter(m => m.supportsVision);
      case 'audio':
        return this.models.filter(m => m.supportsAudio);
      default:
        return this.models;
    }
  }
}

export const sophisticatedAIRouter = new SophisticatedAIRouter();