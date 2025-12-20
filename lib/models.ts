import { z } from 'zod';

// Core model configuration schema
export const ModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.enum([
    'openai', 'anthropic', 'google', 'cohere', 'mistral', 'meta',
    'huggingface', 'ollama', 'together', 'perplexity', 'groq',
    'replicate', 'stability', 'midjourney', 'runpod'
  ]),
  modelId: z.string(),
  apiUrl: z.string().optional(),
  apiKey: z.string().optional(),
  costPer1kTokens: z.number().default(0),
  maxTokens: z.number().default(4096),
  contextWindow: z.number().default(4096),
  supportsChat: z.boolean().default(true),
  supportsCode: z.boolean().default(true),
  supportsVision: z.boolean().default(false),
  supportsFiles: z.boolean().default(false),
  supportsStreaming: z.boolean().default(false),
  modelSize: z.string().optional(),
  description: z.string().optional(),
  strengths: z.array(z.string()).default([]),
  languages: z.array(z.string()).default(['en']),
  enabled: z.boolean().default(true),
  priority: z.number().default(50),
  category: z.enum([
    'CHAT', 'CODE', 'REASONING', 'CREATIVE', 'FAST', 'VISION', 'MULTIMODAL'
  ]).default('CHAT'),
  tier: z.enum(['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE']).default('FREE')
});

export type Model = z.infer<typeof ModelSchema>;

// Comprehensive model configurations
export const ALL_MODELS: Model[] = [
  // ===== OPEN SOURCE MODELS (FREE) =====
  
  // Meta Llama Models (HuggingFace)
  {
    id: 'llama-2-7b-chat',
    name: 'Llama 2 7B Chat',
    provider: 'huggingface',
    modelId: 'meta-llama/Llama-2-7b-chat-hf',
    apiUrl: 'https://api-inference.huggingface.co/models/meta-llama/Llama-2-7b-chat-hf',
    costPer1kTokens: 0,
    maxTokens: 4096,
    contextWindow: 4096,
    supportsChat: true,
    supportsCode: true,
    modelSize: '7B',
    description: 'Meta\'s Llama 2 model optimized for conversations',
    strengths: ['conversational', 'general-purpose', 'fast'],
    category: 'CHAT',
    tier: 'FREE',
    priority: 10
  },
  {
    id: 'llama-2-13b-chat',
    name: 'Llama 2 13B Chat',
    provider: 'huggingface',
    modelId: 'meta-llama/Llama-2-13b-chat-hf',
    apiUrl: 'https://api-inference.huggingface.co/models/meta-llama/Llama-2-13b-chat-hf',
    costPer1kTokens: 0,
    maxTokens: 4096,
    contextWindow: 4096,
    supportsChat: true,
    supportsCode: true,
    modelSize: '13B',
    description: 'Larger Llama 2 model for complex reasoning',
    strengths: ['reasoning', 'detailed-analysis', 'quality'],
    category: 'REASONING',
    tier: 'FREE',
    priority: 15
  },
  
  // Code Llama Models
  {
    id: 'code-llama-7b',
    name: 'Code Llama 7B',
    provider: 'huggingface',
    modelId: 'codellama/CodeLlama-7b-hf',
    apiUrl: 'https://api-inference.huggingface.co/models/codellama/CodeLlama-7b-hf',
    costPer1kTokens: 0,
    maxTokens: 4096,
    contextWindow: 4096,
    supportsChat: false,
    supportsCode: true,
    modelSize: '7B',
    description: 'Meta\'s Code Llama for code generation',
    strengths: ['code-generation', 'programming', 'debugging'],
    category: 'CODE',
    tier: 'FREE',
    priority: 5
  },
  {
    id: 'code-llama-13b',
    name: 'Code Llama 13B',
    provider: 'huggingface',
    modelId: 'codellama/CodeLlama-13b-hf',
    apiUrl: 'https://api-inference.huggingface.co/models/codellama/CodeLlama-13b-hf',
    costPer1kTokens: 0,
    maxTokens: 4096,
    contextWindow: 4096,
    supportsChat: false,
    supportsCode: true,
    modelSize: '13B',
    description: 'Larger Code Llama for complex programming tasks',
    strengths: ['complex-code', 'architecture', 'algorithms'],
    category: 'CODE',
    tier: 'FREE',
    priority: 8
  },
  
  // Mistral Models
  {
    id: 'mistral-7b-instruct',
    name: 'Mistral 7B Instruct',
    provider: 'huggingface',
    modelId: 'mistralai/Mistral-7B-Instruct-v0.1',
    apiUrl: 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1',
    costPer1kTokens: 0,
    maxTokens: 8192,
    contextWindow: 8192,
    supportsChat: true,
    supportsCode: true,
    modelSize: '7B',
    description: 'Mistral\'s efficient instruct model',
    strengths: ['multilingual', 'efficient', 'instruction-following'],
    languages: ['en', 'fr', 'de', 'es', 'it'],
    category: 'CHAT',
    tier: 'FREE',
    priority: 12
  },
  {
    id: 'mixtral-8x7b',
    name: 'Mixtral 8x7B',
    provider: 'huggingface',
    modelId: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
    apiUrl: 'https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1',
    costPer1kTokens: 0,
    maxTokens: 32768,
    contextWindow: 32768,
    supportsChat: true,
    supportsCode: true,
    modelSize: '8x7B',
    description: 'Mistral\'s mixture of experts model',
    strengths: ['high-quality', 'multilingual', 'reasoning'],
    languages: ['en', 'fr', 'de', 'es', 'it'],
    category: 'REASONING',
    tier: 'FREE',
    priority: 18
  },
  
  // Other Open Source Models
  {
    id: 'starcoder',
    name: 'StarCoder',
    provider: 'huggingface',
    modelId: 'bigcode/starcoder',
    apiUrl: 'https://api-inference.huggingface.co/models/bigcode/starcoder',
    costPer1kTokens: 0,
    maxTokens: 8192,
    contextWindow: 8192,
    supportsChat: false,
    supportsCode: true,
    modelSize: '15.5B',
    description: 'BigCode\'s advanced code generation model',
    strengths: ['code-completion', 'multiple-languages', 'advanced-programming'],
    category: 'CODE',
    tier: 'FREE',
    priority: 20
  },
  {
    id: 'flan-t5-xl',
    name: 'Flan-T5 XL',
    provider: 'huggingface',
    modelId: 'google/flan-t5-xl',
    apiUrl: 'https://api-inference.huggingface.co/models/google/flan-t5-xl',
    costPer1kTokens: 0,
    maxTokens: 512,
    contextWindow: 512,
    supportsChat: true,
    supportsCode: false,
    modelSize: '3B',
    description: 'Google\'s instruction-tuned T5 model',
    strengths: ['question-answering', 'instructions', 'factual'],
    category: 'CHAT',
    tier: 'FREE',
    priority: 25
  },
  {
    id: 'phi-2',
    name: 'Microsoft Phi-2',
    provider: 'huggingface',
    modelId: 'microsoft/phi-2',
    apiUrl: 'https://api-inference.huggingface.co/models/microsoft/phi-2',
    costPer1kTokens: 0,
    maxTokens: 2048,
    contextWindow: 2048,
    supportsChat: true,
    supportsCode: true,
    modelSize: '2.7B',
    description: 'Microsoft\'s small but capable model',
    strengths: ['fast', 'efficient', 'general-purpose'],
    category: 'FAST',
    tier: 'FREE',
    priority: 6
  },
  {
    id: 'gpt2',
    name: 'GPT-2',
    provider: 'huggingface',
    modelId: 'gpt2',
    apiUrl: 'https://api-inference.huggingface.co/models/gpt2',
    costPer1kTokens: 0,
    maxTokens: 1024,
    contextWindow: 1024,
    supportsChat: true,
    supportsCode: false,
    modelSize: '124M',
    description: 'OpenAI\'s GPT-2 (reliable fallback)',
    strengths: ['reliable', 'fast', 'always-available'],
    category: 'FAST',
    tier: 'FREE',
    priority: 100 // Fallback model
  },
  
  // ===== PAID MODELS =====
  
  // OpenAI Models
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    modelId: 'gpt-4o',
    costPer1kTokens: 5.0,
    maxTokens: 4096,
    contextWindow: 128000,
    supportsChat: true,
    supportsCode: true,
    supportsVision: true,
    supportsFiles: true,
    supportsStreaming: true,
    description: 'OpenAI\'s most advanced multimodal model',
    strengths: ['multimodal', 'reasoning', 'vision', 'highest-quality'],
    category: 'MULTIMODAL',
    tier: 'PREMIUM',
    priority: 1
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    modelId: 'gpt-4o-mini',
    costPer1kTokens: 0.15,
    maxTokens: 16384,
    contextWindow: 128000,
    supportsChat: true,
    supportsCode: true,
    supportsVision: true,
    supportsStreaming: true,
    description: 'OpenAI\'s efficient and affordable model',
    strengths: ['cost-effective', 'fast', 'multimodal'],
    category: 'FAST',
    tier: 'BASIC',
    priority: 3
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    modelId: 'gpt-3.5-turbo',
    costPer1kTokens: 0.5,
    maxTokens: 4096,
    contextWindow: 16385,
    supportsChat: true,
    supportsCode: true,
    supportsStreaming: true,
    description: 'OpenAI\'s fast and affordable model',
    strengths: ['fast', 'affordable', 'reliable'],
    category: 'FAST',
    tier: 'BASIC',
    priority: 7
  },
  
  // Anthropic Models
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    modelId: 'claude-3-5-sonnet-20241022',
    costPer1kTokens: 3.0,
    maxTokens: 8192,
    contextWindow: 200000,
    supportsChat: true,
    supportsCode: true,
    supportsVision: true,
    supportsFiles: true,
    description: 'Anthropic\'s most advanced model',
    strengths: ['reasoning', 'analysis', 'safety', 'long-context'],
    category: 'REASONING',
    tier: 'PREMIUM',
    priority: 2
  },
  {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    modelId: 'claude-3-haiku-20240307',
    costPer1kTokens: 0.25,
    maxTokens: 4096,
    contextWindow: 200000,
    supportsChat: true,
    supportsCode: true,
    supportsVision: true,
    description: 'Anthropic\'s fast and efficient model',
    strengths: ['fast', 'efficient', 'cost-effective'],
    category: 'FAST',
    tier: 'BASIC',
    priority: 4
  },
  
  // Google Models
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    modelId: 'gemini-1.5-pro',
    costPer1kTokens: 7.0,
    maxTokens: 8192,
    contextWindow: 2000000,
    supportsChat: true,
    supportsCode: true,
    supportsVision: true,
    supportsFiles: true,
    description: 'Google\'s advanced multimodal model',
    strengths: ['multimodal', 'very-long-context', 'reasoning'],
    category: 'MULTIMODAL',
    tier: 'PREMIUM',
    priority: 9
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'google',
    modelId: 'gemini-1.5-flash',
    costPer1kTokens: 0.075,
    maxTokens: 8192,
    contextWindow: 1000000,
    supportsChat: true,
    supportsCode: true,
    supportsVision: true,
    description: 'Google\'s fast multimodal model',
    strengths: ['fast', 'multimodal', 'long-context'],
    category: 'FAST',
    tier: 'BASIC',
    priority: 11
  },
  
  // Groq Models (Fast Inference)
  {
    id: 'groq-llama-3-70b',
    name: 'Llama 3 70B (Groq)',
    provider: 'groq',
    modelId: 'llama3-70b-8192',
    costPer1kTokens: 0.59,
    maxTokens: 8192,
    contextWindow: 8192,
    supportsChat: true,
    supportsCode: true,
    description: 'Meta\'s Llama 3 on Groq\'s fast inference',
    strengths: ['very-fast', 'high-quality', 'reasoning'],
    category: 'FAST',
    tier: 'BASIC',
    priority: 13
  },
  {
    id: 'groq-mixtral-8x7b',
    name: 'Mixtral 8x7B (Groq)',
    provider: 'groq',
    modelId: 'mixtral-8x7b-32768',
    costPer1kTokens: 0.24,
    maxTokens: 32768,
    contextWindow: 32768,
    supportsChat: true,
    supportsCode: true,
    description: 'Mistral\'s Mixtral on Groq\'s fast inference',
    strengths: ['very-fast', 'cost-effective', 'multilingual'],
    category: 'FAST',
    tier: 'BASIC',
    priority: 14
  }
];

// Environment variable mappings for API keys
export const API_KEY_MAPPINGS = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_API_KEY',
  cohere: 'COHERE_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  huggingface: 'HUGGINGFACE_API_KEY',
  groq: 'GROQ_API_KEY',
  together: 'TOGETHER_API_KEY',
  perplexity: 'PERPLEXITY_API_KEY',
  replicate: 'REPLICATE_API_KEY'
} as const;

// Model categories for routing
export const MODEL_CATEGORIES = {
  CHAT: 'Conversational AI and general queries',
  CODE: 'Code generation and programming assistance',
  REASONING: 'Complex reasoning and analysis',
  CREATIVE: 'Creative writing and content generation',
  FAST: 'Quick responses and real-time applications',
  VISION: 'Image and visual content analysis',
  MULTIMODAL: 'Multi-format content processing'
} as const;

export type ModelProvider = keyof typeof API_KEY_MAPPINGS;
export type ModelCategory = keyof typeof MODEL_CATEGORIES;