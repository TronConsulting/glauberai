/**
 * Audio Processor Service
 * Handles Speech-to-Text (Whisper) and Text-to-Speech (TTS) operations
 */

import { Model, ALL_MODELS } from '../models';

// ===== TRANSCRIPTION (Speech-to-Text) =====

export interface TranscriptionRequest {
    audio: File | Buffer | Blob;
    language?: string;        // ISO 639-1 code (e.g., 'en', 'es', 'fr')
    prompt?: string;          // Optional context to improve accuracy
    responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
    temperature?: number;     // 0-1, lower is more deterministic
    timestampGranularities?: ('word' | 'segment')[];
}

export interface TranscriptionSegment {
    id: number;
    start: number;
    end: number;
    text: string;
    tokens?: number[];
    temperature?: number;
    avgLogprob?: number;
    compressionRatio?: number;
    noSpeechProb?: number;
}

export interface TranscriptionWord {
    word: string;
    start: number;
    end: number;
}

export interface TranscriptionResult {
    text: string;
    language?: string;
    duration?: number;
    segments?: TranscriptionSegment[];
    words?: TranscriptionWord[];
    model: string;
    provider: string;
    cost: number;
    latency: number;
    success: boolean;
    error?: string;
}

// ===== TEXT-TO-SPEECH =====

export type OpenAIVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
export type TTSModel = 'tts-1' | 'tts-1-hd';
export type AudioFormat = 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';

export interface TTSRequest {
    text: string;
    voice?: OpenAIVoice;
    model?: TTSModel;
    speed?: number;           // 0.25 to 4.0, default 1.0
    responseFormat?: AudioFormat;
    provider?: 'openai' | 'elevenlabs';
}

export interface TTSResult {
    audio: ArrayBuffer | Buffer;
    format: AudioFormat;
    duration?: number;
    model: string;
    provider: string;
    cost: number;
    latency: number;
    success: boolean;
    error?: string;
}

export class AudioProcessor {
    private static instance: AudioProcessor;

    private constructor() { }

    public static getInstance(): AudioProcessor {
        if (!AudioProcessor.instance) {
            AudioProcessor.instance = new AudioProcessor();
        }
        return AudioProcessor.instance;
    }

    // ===== TRANSCRIPTION METHODS =====

    /**
     * Transcribe audio file to text using Whisper
     */
    public async transcribe(request: TranscriptionRequest): Promise<TranscriptionResult> {
        const startTime = Date.now();
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return {
                text: '',
                model: 'whisper-1',
                provider: 'openai',
                cost: 0,
                latency: Date.now() - startTime,
                success: false,
                error: 'OpenAI API key not configured'
            };
        }

        try {
            const formData = new FormData();

            // Handle different audio input types
            if (request.audio instanceof Blob || request.audio instanceof File) {
                formData.append('file', request.audio);
            } else if (Buffer.isBuffer(request.audio)) {
                // Copy buffer data to avoid SharedArrayBuffer type issues
                const audioBytes = Array.from(request.audio);
                formData.append('file', new Blob([new Uint8Array(audioBytes)]), 'audio.mp3');
            }

            formData.append('model', 'whisper-1');

            if (request.language) {
                formData.append('language', request.language);
            }
            if (request.prompt) {
                formData.append('prompt', request.prompt);
            }
            if (request.responseFormat) {
                formData.append('response_format', request.responseFormat);
            }
            if (request.temperature !== undefined) {
                formData.append('temperature', String(request.temperature));
            }
            if (request.timestampGranularities?.length) {
                request.timestampGranularities.forEach(g => {
                    formData.append('timestamp_granularities[]', g);
                });
            }

            const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Whisper API error: ${response.status} - ${errorData}`);
            }

            // Handle different response formats
            const contentType = response.headers.get('content-type');
            let result: TranscriptionResult;

            if (request.responseFormat === 'text' || request.responseFormat === 'srt' || request.responseFormat === 'vtt') {
                const text = await response.text();
                result = {
                    text,
                    model: 'Whisper',
                    provider: 'openai',
                    cost: 0, // Will calculate based on duration
                    latency: Date.now() - startTime,
                    success: true
                };
            } else {
                const data = await response.json();
                result = {
                    text: data.text,
                    language: data.language,
                    duration: data.duration,
                    segments: data.segments,
                    words: data.words,
                    model: 'Whisper',
                    provider: 'openai',
                    cost: (data.duration || 60) * 0.0001, // $0.006 per minute = $0.0001 per second
                    latency: Date.now() - startTime,
                    success: true
                };
            }

            return result;

        } catch (error) {
            return {
                text: '',
                model: 'whisper-1',
                provider: 'openai',
                cost: 0,
                latency: Date.now() - startTime,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Translate audio to English using Whisper
     */
    public async translateToEnglish(request: Omit<TranscriptionRequest, 'language'>): Promise<TranscriptionResult> {
        const startTime = Date.now();
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return {
                text: '',
                model: 'whisper-1',
                provider: 'openai',
                cost: 0,
                latency: Date.now() - startTime,
                success: false,
                error: 'OpenAI API key not configured'
            };
        }

        try {
            const formData = new FormData();

            if (request.audio instanceof Blob || request.audio instanceof File) {
                formData.append('file', request.audio);
            } else if (Buffer.isBuffer(request.audio)) {
                // Copy buffer data to avoid SharedArrayBuffer type issues
                const audioBytes = Array.from(request.audio);
                formData.append('file', new Blob([new Uint8Array(audioBytes)]), 'audio.mp3');
            }

            formData.append('model', 'whisper-1');

            if (request.prompt) {
                formData.append('prompt', request.prompt);
            }
            if (request.responseFormat) {
                formData.append('response_format', request.responseFormat);
            }

            const response = await fetch('https://api.openai.com/v1/audio/translations', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Whisper Translation API error: ${response.status} - ${errorData}`);
            }

            const data = await response.json();

            return {
                text: data.text,
                language: 'en',
                duration: data.duration,
                model: 'Whisper',
                provider: 'openai',
                cost: (data.duration || 60) * 0.0001,
                latency: Date.now() - startTime,
                success: true
            };

        } catch (error) {
            return {
                text: '',
                model: 'whisper-1',
                provider: 'openai',
                cost: 0,
                latency: Date.now() - startTime,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    // ===== TEXT-TO-SPEECH METHODS =====

    /**
     * Convert text to speech
     */
    public async synthesize(request: TTSRequest): Promise<TTSResult> {
        const startTime = Date.now();
        const provider = request.provider || 'openai';

        if (provider === 'elevenlabs') {
            return this.synthesizeWithElevenLabs(request);
        }

        return this.synthesizeWithOpenAI(request);
    }

    /**
     * Generate speech with OpenAI TTS
     */
    private async synthesizeWithOpenAI(request: TTSRequest): Promise<TTSResult> {
        const startTime = Date.now();
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return {
                audio: new ArrayBuffer(0),
                format: 'mp3',
                model: 'tts-1',
                provider: 'openai',
                cost: 0,
                latency: Date.now() - startTime,
                success: false,
                error: 'OpenAI API key not configured'
            };
        }

        try {
            const model = request.model || 'tts-1';
            const voice = request.voice || 'alloy';
            const format = request.responseFormat || 'mp3';
            const speed = Math.max(0.25, Math.min(4.0, request.speed || 1.0));

            const response = await fetch('https://api.openai.com/v1/audio/speech', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model,
                    input: request.text,
                    voice,
                    response_format: format,
                    speed
                })
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`TTS API error: ${response.status} - ${errorData}`);
            }

            const audioBuffer = await response.arrayBuffer();

            // Calculate cost: $0.015/1K chars for tts-1, $0.030/1K chars for tts-1-hd
            const costPer1kChars = model === 'tts-1-hd' ? 0.030 : 0.015;
            const cost = (request.text.length / 1000) * costPer1kChars;

            return {
                audio: audioBuffer,
                format,
                model: model === 'tts-1-hd' ? 'TTS-1 HD' : 'TTS-1',
                provider: 'openai',
                cost,
                latency: Date.now() - startTime,
                success: true
            };

        } catch (error) {
            return {
                audio: new ArrayBuffer(0),
                format: 'mp3',
                model: 'tts-1',
                provider: 'openai',
                cost: 0,
                latency: Date.now() - startTime,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Generate speech with ElevenLabs
     */
    private async synthesizeWithElevenLabs(request: TTSRequest): Promise<TTSResult> {
        const startTime = Date.now();
        const apiKey = process.env.ELEVENLABS_API_KEY;

        if (!apiKey) {
            return {
                audio: new ArrayBuffer(0),
                format: 'mp3',
                model: 'eleven_multilingual_v2',
                provider: 'elevenlabs',
                cost: 0,
                latency: Date.now() - startTime,
                success: false,
                error: 'ElevenLabs API key not configured'
            };
        }

        try {
            // ElevenLabs voice IDs (these are examples, real IDs would come from their API)
            const voiceId = 'EXAVITQu4vr4xnSDxMaL'; // Default voice

            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
                method: 'POST',
                headers: {
                    'xi-api-key': apiKey,
                    'Content-Type': 'application/json',
                    'Accept': 'audio/mpeg'
                },
                body: JSON.stringify({
                    text: request.text,
                    model_id: 'eleven_multilingual_v2',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.5
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`ElevenLabs API error: ${response.status} - ${errorData}`);
            }

            const audioBuffer = await response.arrayBuffer();

            // ElevenLabs pricing varies by plan, using approximate
            const cost = (request.text.length / 1000) * 0.018;

            return {
                audio: audioBuffer,
                format: 'mp3',
                model: 'ElevenLabs Multilingual v2',
                provider: 'elevenlabs',
                cost,
                latency: Date.now() - startTime,
                success: true
            };

        } catch (error) {
            return {
                audio: new ArrayBuffer(0),
                format: 'mp3',
                model: 'eleven_multilingual_v2',
                provider: 'elevenlabs',
                cost: 0,
                latency: Date.now() - startTime,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    // ===== UTILITY METHODS =====

    /**
     * Get available STT models
     */
    public getSTTModels(): Model[] {
        return ALL_MODELS.filter(m => m.category === 'AUDIO_STT');
    }

    /**
     * Get available TTS models
     */
    public getTTSModels(): Model[] {
        return ALL_MODELS.filter(m => m.category === 'AUDIO_TTS');
    }

    /**
     * Get available voices for OpenAI TTS
     */
    public getOpenAIVoices(): OpenAIVoice[] {
        return ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    }

    /**
     * Check if audio provider is available
     */
    public isProviderAvailable(provider: string): boolean {
        const keyMapping: Record<string, string> = {
            openai: 'OPENAI_API_KEY',
            elevenlabs: 'ELEVENLABS_API_KEY',
            assemblyai: 'ASSEMBLYAI_API_KEY',
            deepgram: 'DEEPGRAM_API_KEY'
        };

        const envKey = keyMapping[provider];
        return envKey ? Boolean(process.env[envKey]) : false;
    }

    /**
     * Get supported audio formats for transcription
     */
    public getSupportedAudioFormats(): string[] {
        return [
            'flac', 'mp3', 'm4a', 'mp4', 'mpeg', 'mpga',
            'oga', 'ogg', 'wav', 'webm'
        ];
    }

    /**
     * Get supported languages for transcription
     */
    public getSupportedLanguages(): string[] {
        return [
            'af', 'ar', 'hy', 'az', 'be', 'bs', 'bg', 'ca', 'zh', 'hr',
            'cs', 'da', 'nl', 'en', 'et', 'fi', 'fr', 'gl', 'de', 'el',
            'he', 'hi', 'hu', 'is', 'id', 'it', 'ja', 'kn', 'kk', 'ko',
            'lv', 'lt', 'mk', 'ms', 'mr', 'mi', 'ne', 'no', 'fa', 'pl',
            'pt', 'ro', 'ru', 'sr', 'sk', 'sl', 'es', 'sw', 'sv', 'tl',
            'ta', 'th', 'tr', 'uk', 'ur', 'vi', 'cy'
        ];
    }
}

// Export singleton instance
export const audioProcessor = AudioProcessor.getInstance();
