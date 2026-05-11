import { aiRouter } from '../lib/ai-router';
import { Model } from '../lib/models';

const mockModels: Model[] = [
  {
    id: 'cheap-chat',
    name: 'Cheap Chat',
    provider: 'pollinations',
    modelId: 'openai',
    costPer1kTokens: 0,
    maxTokens: 4096,
    contextWindow: 4096,
    supportsChat: true,
    supportsCode: false,
    supportsVision: false,
    supportsFiles: false,
    supportsStreaming: false,
    currentKeyIndex: 0,
    keyRotationEnabled: false,
    strengths: ['chat', 'fast', 'efficient'],
    languages: ['en'],
    enabled: true,
    priority: 5,
    category: 'CHAT',
    tier: 'FREE',
    supportsImageGen: false,
    supportsAudioInput: false,
    supportsAudioOutput: false,
    supportsEmbeddings: false,
  },
  {
    id: 'code-model',
    name: 'Code Model',
    provider: 'together',
    modelId: 'code',
    costPer1kTokens: 0.2,
    maxTokens: 8192,
    contextWindow: 8192,
    supportsChat: false,
    supportsCode: true,
    supportsVision: false,
    supportsFiles: false,
    supportsStreaming: false,
    currentKeyIndex: 0,
    keyRotationEnabled: false,
    strengths: ['code-generation', 'debugging', 'programming'],
    languages: ['en'],
    enabled: true,
    priority: 20,
    category: 'CODE',
    tier: 'BASIC',
    supportsImageGen: false,
    supportsAudioInput: false,
    supportsAudioOutput: false,
    supportsEmbeddings: false,
  },
  {
    id: 'reasoning-model',
    name: 'Reasoning Model',
    provider: 'anthropic',
    modelId: 'reasoning',
    costPer1kTokens: 0.5,
    maxTokens: 8192,
    contextWindow: 8192,
    supportsChat: true,
    supportsCode: true,
    supportsVision: false,
    supportsFiles: false,
    supportsStreaming: false,
    currentKeyIndex: 0,
    keyRotationEnabled: false,
    strengths: ['reasoning', 'analysis', 'math'],
    languages: ['en'],
    enabled: true,
    priority: 15,
    category: 'REASONING',
    tier: 'BASIC',
    supportsImageGen: false,
    supportsAudioInput: false,
    supportsAudioOutput: false,
    supportsEmbeddings: false,
  },
  {
    id: 'vision-model',
    name: 'Vision Model',
    provider: 'google',
    modelId: 'vision',
    costPer1kTokens: 0.4,
    maxTokens: 8192,
    contextWindow: 8192,
    supportsChat: true,
    supportsCode: false,
    supportsVision: true,
    supportsFiles: true,
    supportsStreaming: false,
    currentKeyIndex: 0,
    keyRotationEnabled: false,
    strengths: ['vision', 'image', 'multimodal'],
    languages: ['en'],
    enabled: true,
    priority: 10,
    category: 'VISION',
    tier: 'BASIC',
    supportsImageGen: false,
    supportsAudioInput: false,
    supportsAudioOutput: false,
    supportsEmbeddings: false,
  },
];

function expectRoute(query: string, expectedModelId: string) {
  const routing = aiRouter.routeQuery(query, mockModels);
  if (routing.selectedModel.id !== expectedModelId) {
    throw new Error(`Expected ${expectedModelId} for "${query}", got ${routing.selectedModel.id}`);
  }
}

expectRoute('write a React component that renders a pricing table', 'code-model');
expectRoute('summarize this paragraph in plain English', 'cheap-chat');
expectRoute('analyze why this strategy failed and compare alternatives', 'reasoning-model');
expectRoute('what is the capital of France?', 'cheap-chat');
expectRoute('analyze this image and describe what is visible', 'vision-model');

const codeFallbacks = aiRouter.routeQuery('debug this TypeScript function', mockModels).fallbackChain;
if (codeFallbacks.some(model => !model.supportsCode)) {
  throw new Error('Code fallback chain included a non-code-capable model');
}

console.log('Task-aware routing validation passed');
process.exit(0);
