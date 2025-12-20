/**
 * AI Modes - Defines all supported AI operation modes
 * Each mode specifies input/output types, supported providers, and default models
 */

export type InputType = 'text' | 'image' | 'audio' | 'video' | 'file';
export type OutputType = 'text' | 'image' | 'audio' | 'video' | 'embedding';

export interface AIMode {
    id: string;
    name: string;
    description: string;
    inputTypes: InputType[];
    outputTypes: OutputType[];
    providers: string[];
    defaultModel: string;
    maxInputSize?: number;       // In bytes for files, characters for text
    supportedFormats?: string[]; // File extensions or MIME types
    tierRequired: 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
}

export const AI_MODES: Record<string, AIMode> = {
    // ===== TEXT MODES =====
    chat: {
        id: 'chat',
        name: 'Chat',
        description: 'Conversational AI for general queries and discussions',
        inputTypes: ['text'],
        outputTypes: ['text'],
        providers: ['openai', 'anthropic', 'google', 'groq', 'huggingface'],
        defaultModel: 'gpt-4o-mini',
        maxInputSize: 128000,
        tierRequired: 'FREE'
    },

    code: {
        id: 'code',
        name: 'Code Assistant',
        description: 'Programming assistance, code generation and debugging',
        inputTypes: ['text', 'file'],
        outputTypes: ['text'],
        providers: ['openai', 'anthropic', 'google', 'huggingface'],
        defaultModel: 'gpt-4o',
        maxInputSize: 128000,
        supportedFormats: ['.py', '.js', '.ts', '.java', '.cpp', '.go', '.rs', '.rb'],
        tierRequired: 'FREE'
    },

    reasoning: {
        id: 'reasoning',
        name: 'Deep Reasoning',
        description: 'Complex analysis, multi-step reasoning, and problem solving',
        inputTypes: ['text', 'file'],
        outputTypes: ['text'],
        providers: ['anthropic', 'openai', 'google'],
        defaultModel: 'claude-3-5-sonnet',
        maxInputSize: 200000,
        tierRequired: 'BASIC'
    },

    // ===== IMAGE MODES =====
    image_generation: {
        id: 'image_generation',
        name: 'Image Generation',
        description: 'Generate images from text descriptions',
        inputTypes: ['text'],
        outputTypes: ['image'],
        providers: ['openai', 'stability', 'replicate'],
        defaultModel: 'dall-e-3',
        maxInputSize: 4000,
        tierRequired: 'BASIC'
    },

    image_edit: {
        id: 'image_edit',
        name: 'Image Editing',
        description: 'Edit and modify existing images with AI',
        inputTypes: ['text', 'image'],
        outputTypes: ['image'],
        providers: ['openai', 'stability'],
        defaultModel: 'dall-e-2',
        maxInputSize: 4000,
        supportedFormats: ['image/png', 'image/jpeg', 'image/webp'],
        tierRequired: 'BASIC'
    },

    vision: {
        id: 'vision',
        name: 'Vision Analysis',
        description: 'Analyze and understand images',
        inputTypes: ['text', 'image'],
        outputTypes: ['text'],
        providers: ['openai', 'anthropic', 'google'],
        defaultModel: 'gpt-4o',
        supportedFormats: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
        tierRequired: 'BASIC'
    },

    // ===== AUDIO MODES =====
    transcription: {
        id: 'transcription',
        name: 'Speech-to-Text',
        description: 'Transcribe audio files to text with timestamps',
        inputTypes: ['audio'],
        outputTypes: ['text'],
        providers: ['openai', 'assemblyai', 'deepgram'],
        defaultModel: 'whisper-1',
        maxInputSize: 25 * 1024 * 1024, // 25MB
        supportedFormats: ['audio/mp3', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/m4a'],
        tierRequired: 'BASIC'
    },

    tts: {
        id: 'tts',
        name: 'Text-to-Speech',
        description: 'Convert text to natural-sounding speech',
        inputTypes: ['text'],
        outputTypes: ['audio'],
        providers: ['openai', 'elevenlabs'],
        defaultModel: 'tts-1',
        maxInputSize: 4096,
        tierRequired: 'BASIC'
    },

    // ===== EMBEDDING MODES =====
    embedding: {
        id: 'embedding',
        name: 'Text Embeddings',
        description: 'Generate vector embeddings for semantic search and RAG',
        inputTypes: ['text'],
        outputTypes: ['embedding'],
        providers: ['openai', 'cohere'],
        defaultModel: 'text-embedding-3-small',
        maxInputSize: 8191,
        tierRequired: 'BASIC'
    },

    // ===== MULTIMODAL =====
    multimodal: {
        id: 'multimodal',
        name: 'Multimodal',
        description: 'Process multiple content types in a single request',
        inputTypes: ['text', 'image', 'audio', 'file'],
        outputTypes: ['text', 'image'],
        providers: ['openai', 'google', 'anthropic'],
        defaultModel: 'gpt-4o',
        tierRequired: 'PREMIUM'
    }
};

/**
 * Get mode by ID
 */
export function getMode(modeId: string): AIMode | undefined {
    return AI_MODES[modeId];
}

/**
 * Get all modes that support a specific input type
 */
export function getModesByInputType(inputType: InputType): AIMode[] {
    return Object.values(AI_MODES).filter(mode =>
        mode.inputTypes.includes(inputType)
    );
}

/**
 * Get all modes that produce a specific output type
 */
export function getModesByOutputType(outputType: OutputType): AIMode[] {
    return Object.values(AI_MODES).filter(mode =>
        mode.outputTypes.includes(outputType)
    );
}

/**
 * Auto-detect the best mode based on query content and files
 */
export function detectMode(
    query: string,
    files: { type: string; name: string }[] = []
): string {
    const queryLower = query.toLowerCase();

    // Check for image generation intent
    const imageGenPatterns = [
        /generate\s+(an?\s+)?image/i,
        /create\s+(an?\s+)?picture/i,
        /draw\s+/i,
        /illustrate\s+/i,
        /design\s+(an?\s+)?/i,
        /make\s+(a\s+)?visual/i,
        /paint\s+/i,
        /render\s+/i
    ];
    if (imageGenPatterns.some(p => p.test(query))) {
        return 'image_generation';
    }

    // Check for audio files (transcription)
    if (files.some(f => f.type.startsWith('audio/'))) {
        return 'transcription';
    }

    // Check for TTS intent
    const ttsPatterns = [
        /read\s+(this\s+)?aloud/i,
        /speak\s+(this|the)/i,
        /convert\s+to\s+(speech|audio)/i,
        /say\s+(this|the)/i,
        /text\s+to\s+speech/i,
        /tts/i
    ];
    if (ttsPatterns.some(p => p.test(query))) {
        return 'tts';
    }

    // Check for image files (vision)
    if (files.some(f => f.type.startsWith('image/'))) {
        return 'vision';
    }

    // Check for embedding intent
    const embeddingPatterns = [
        /embed(ding)?s?\s+/i,
        /vector\s+representation/i,
        /semantic\s+search/i
    ];
    if (embeddingPatterns.some(p => p.test(query))) {
        return 'embedding';
    }

    // Check for code intent
    const codePatterns = [
        /code/i, /function/i, /class/i, /debug/i, /implement/i,
        /program/i, /script/i, /algorithm/i, /api/i, /fix\s+this/i
    ];
    const codeLanguages = [
        'python', 'javascript', 'typescript', 'java', 'c++', 'go', 'rust', 'ruby'
    ];
    if (codePatterns.some(p => p.test(query)) ||
        codeLanguages.some(lang => queryLower.includes(lang))) {
        return 'code';
    }

    // Check for reasoning intent
    const reasoningPatterns = [
        /analyze/i, /explain.*in\s+depth/i, /compare\s+and\s+contrast/i,
        /step\s+by\s+step/i, /reasoning/i, /think\s+through/i
    ];
    if (reasoningPatterns.some(p => p.test(query))) {
        return 'reasoning';
    }

    // Default to chat
    return 'chat';
}

/**
 * TTS Voice options
 */
export const TTS_VOICES = {
    openai: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
    elevenlabs: ['rachel', 'domi', 'bella', 'antoni', 'elli', 'josh', 'arnold', 'adam', 'sam']
} as const;

/**
 * Image size options per provider
 */
export const IMAGE_SIZES = {
    openai: ['1024x1024', '1792x1024', '1024x1792'],
    stability: ['512x512', '768x768', '1024x1024', '1536x1536']
} as const;

/**
 * Image quality options
 */
export const IMAGE_QUALITY = ['standard', 'hd'] as const;

/**
 * Image style options (for DALL-E)
 */
export const IMAGE_STYLES = ['vivid', 'natural'] as const;
