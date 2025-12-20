/**
 * Image Generator Service
 * Handles AI image generation across multiple providers (OpenAI DALL-E, Stability AI)
 */

import { Model, ALL_MODELS } from '../models';
import { modelManager } from '../model-manager';

export interface ImageGenerationRequest {
    prompt: string;
    negativePrompt?: string;
    size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
    quality?: 'standard' | 'hd';
    style?: 'vivid' | 'natural';
    n?: number; // Number of images (1-4 for DALL-E, 1-10 for Stability)
    model?: string;
    provider?: 'openai' | 'stability' | 'replicate';
}

export interface GeneratedImage {
    url: string;
    base64?: string;
    revisedPrompt?: string;
    seed?: number;
    width: number;
    height: number;
}

export interface ImageGenerationResponse {
    images: GeneratedImage[];
    model: string;
    provider: string;
    cost: number;
    latency: number;
    success: boolean;
    error?: string;
}

export interface ImageEditRequest {
    image: File | Buffer;
    mask?: File | Buffer;
    prompt: string;
    size?: '256x256' | '512x512' | '1024x1024';
    n?: number;
}

export interface ImageVariationRequest {
    image: File | Buffer;
    size?: '256x256' | '512x512' | '1024x1024';
    n?: number;
}

export class ImageGenerator {
    private static instance: ImageGenerator;

    private constructor() { }

    public static getInstance(): ImageGenerator {
        if (!ImageGenerator.instance) {
            ImageGenerator.instance = new ImageGenerator();
        }
        return ImageGenerator.instance;
    }

    /**
     * Generate images from a text prompt
     */
    public async generate(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
        const startTime = Date.now();

        try {
            // Select provider and model
            const provider = request.provider || 'openai';
            const model = this.getImageModel(provider, request.model);

            if (!model) {
                return {
                    images: [],
                    model: 'unknown',
                    provider,
                    cost: 0,
                    latency: Date.now() - startTime,
                    success: false,
                    error: `No image generation model available for provider: ${provider}`
                };
            }

            let response: ImageGenerationResponse;

            switch (provider) {
                case 'openai':
                    response = await this.generateWithOpenAI(request, model);
                    break;
                case 'stability':
                    response = await this.generateWithStability(request, model);
                    break;
                case 'replicate':
                    response = await this.generateWithReplicate(request, model);
                    break;
                default:
                    throw new Error(`Unsupported image generation provider: ${provider}`);
            }

            response.latency = Date.now() - startTime;
            return response;

        } catch (error) {
            return {
                images: [],
                model: request.model || 'unknown',
                provider: request.provider || 'openai',
                cost: 0,
                latency: Date.now() - startTime,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Generate image with OpenAI DALL-E
     */
    private async generateWithOpenAI(
        request: ImageGenerationRequest,
        model: Model
    ): Promise<ImageGenerationResponse> {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OpenAI API key not configured');
        }

        const size = request.size || '1024x1024';
        const quality = request.quality || 'standard';
        const style = request.style || 'vivid';
        const n = Math.min(request.n || 1, 4); // DALL-E max is 4

        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model.modelId,
                prompt: request.prompt,
                n,
                size,
                quality: model.modelId === 'dall-e-3' ? quality : undefined,
                style: model.modelId === 'dall-e-3' ? style : undefined,
                response_format: 'url'
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
        }

        const data = await response.json();
        const [width, height] = size.split('x').map(Number);

        // Calculate cost based on model and quality
        let costPerImage = 0.04; // DALL-E 3 standard 1024x1024
        if (model.modelId === 'dall-e-3') {
            if (quality === 'hd') costPerImage = 0.08;
            if (size === '1792x1024' || size === '1024x1792') {
                costPerImage = quality === 'hd' ? 0.12 : 0.08;
            }
        } else { // DALL-E 2
            costPerImage = size === '1024x1024' ? 0.02 : size === '512x512' ? 0.018 : 0.016;
        }

        const images: GeneratedImage[] = data.data.map((img: any) => ({
            url: img.url,
            revisedPrompt: img.revised_prompt,
            width,
            height
        }));

        return {
            images,
            model: model.name,
            provider: 'openai',
            cost: costPerImage * n,
            latency: 0,
            success: true
        };
    }

    /**
     * Generate image with Stability AI
     */
    private async generateWithStability(
        request: ImageGenerationRequest,
        model: Model
    ): Promise<ImageGenerationResponse> {
        const apiKey = process.env.STABILITY_API_KEY;
        if (!apiKey) {
            throw new Error('Stability AI API key not configured');
        }

        // Parse size
        const size = request.size || '1024x1024';
        const [width, height] = size.split('x').map(Number);
        const samples = Math.min(request.n || 1, 10);

        const response = await fetch(
            `https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    text_prompts: [
                        { text: request.prompt, weight: 1 },
                        ...(request.negativePrompt ? [{ text: request.negativePrompt, weight: -1 }] : [])
                    ],
                    cfg_scale: 7,
                    width: Math.min(width, 1024),
                    height: Math.min(height, 1024),
                    samples,
                    steps: 30
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Stability AI API error: ${response.status} - ${errorData}`);
        }

        const data = await response.json();

        const images: GeneratedImage[] = data.artifacts.map((artifact: any) => ({
            base64: artifact.base64,
            url: `data:image/png;base64,${artifact.base64}`,
            seed: artifact.seed,
            width,
            height
        }));

        // Stability pricing: ~$0.002 per image at 30 steps
        const costPerImage = 0.002 * (30 / 30);

        return {
            images,
            model: model.name,
            provider: 'stability',
            cost: costPerImage * samples,
            latency: 0,
            success: true
        };
    }

    /**
     * Generate image with Replicate
     */
    private async generateWithReplicate(
        request: ImageGenerationRequest,
        model: Model
    ): Promise<ImageGenerationResponse> {
        const apiKey = process.env.REPLICATE_API_KEY;
        if (!apiKey) {
            throw new Error('Replicate API key not configured');
        }

        // Using SDXL on Replicate
        const response = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                version: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
                input: {
                    prompt: request.prompt,
                    negative_prompt: request.negativePrompt || '',
                    width: 1024,
                    height: 1024,
                    num_outputs: request.n || 1
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Replicate API error: ${response.status} - ${errorData}`);
        }

        const prediction = await response.json();

        // Poll for completion
        let result = prediction;
        while (result.status === 'starting' || result.status === 'processing') {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const pollResponse = await fetch(result.urls.get, {
                headers: { 'Authorization': `Token ${apiKey}` }
            });
            result = await pollResponse.json();
        }

        if (result.status !== 'succeeded') {
            throw new Error(`Replicate prediction failed: ${result.error || 'Unknown error'}`);
        }

        const images: GeneratedImage[] = (result.output || []).map((url: string) => ({
            url,
            width: 1024,
            height: 1024
        }));

        return {
            images,
            model: model.name,
            provider: 'replicate',
            cost: 0.003 * (request.n || 1),
            latency: 0,
            success: true
        };
    }

    /**
     * Edit an existing image (DALL-E 2 only)
     */
    public async editImage(request: ImageEditRequest): Promise<ImageGenerationResponse> {
        const startTime = Date.now();
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return {
                images: [],
                model: 'dall-e-2',
                provider: 'openai',
                cost: 0,
                latency: Date.now() - startTime,
                success: false,
                error: 'OpenAI API key not configured'
            };
        }

        try {
            const formData = new FormData();
            formData.append('image', request.image as Blob);
            if (request.mask) {
                formData.append('mask', request.mask as Blob);
            }
            formData.append('prompt', request.prompt);
            formData.append('n', String(request.n || 1));
            formData.append('size', request.size || '1024x1024');

            const response = await fetch('https://api.openai.com/v1/images/edits', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
            }

            const data = await response.json();
            const [width, height] = (request.size || '1024x1024').split('x').map(Number);

            const images: GeneratedImage[] = data.data.map((img: any) => ({
                url: img.url,
                width,
                height
            }));

            return {
                images,
                model: 'DALL-E 2',
                provider: 'openai',
                cost: 0.02 * (request.n || 1),
                latency: Date.now() - startTime,
                success: true
            };

        } catch (error) {
            return {
                images: [],
                model: 'dall-e-2',
                provider: 'openai',
                cost: 0,
                latency: Date.now() - startTime,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Create variations of an image (DALL-E 2 only)
     */
    public async createVariation(request: ImageVariationRequest): Promise<ImageGenerationResponse> {
        const startTime = Date.now();
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return {
                images: [],
                model: 'dall-e-2',
                provider: 'openai',
                cost: 0,
                latency: Date.now() - startTime,
                success: false,
                error: 'OpenAI API key not configured'
            };
        }

        try {
            const formData = new FormData();
            formData.append('image', request.image as Blob);
            formData.append('n', String(request.n || 1));
            formData.append('size', request.size || '1024x1024');

            const response = await fetch('https://api.openai.com/v1/images/variations', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
            }

            const data = await response.json();
            const [width, height] = (request.size || '1024x1024').split('x').map(Number);

            const images: GeneratedImage[] = data.data.map((img: any) => ({
                url: img.url,
                width,
                height
            }));

            return {
                images,
                model: 'DALL-E 2',
                provider: 'openai',
                cost: 0.02 * (request.n || 1),
                latency: Date.now() - startTime,
                success: true
            };

        } catch (error) {
            return {
                images: [],
                model: 'dall-e-2',
                provider: 'openai',
                cost: 0,
                latency: Date.now() - startTime,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Get the best image generation model for a provider
     */
    private getImageModel(provider: string, modelId?: string): Model | null {
        const imageModels = ALL_MODELS.filter(m =>
            m.category === 'IMAGE_GEN' &&
            m.provider === provider
        );

        if (modelId) {
            return imageModels.find(m => m.id === modelId || m.modelId === modelId) || null;
        }

        // Return highest priority (lowest number) model
        return imageModels.sort((a, b) => a.priority - b.priority)[0] || null;
    }

    /**
     * Get available image generation models
     */
    public getAvailableModels(): Model[] {
        return ALL_MODELS.filter(m => m.category === 'IMAGE_GEN');
    }

    /**
     * Check if a provider is available
     */
    public isProviderAvailable(provider: string): boolean {
        const keyMapping: Record<string, string> = {
            openai: 'OPENAI_API_KEY',
            stability: 'STABILITY_API_KEY',
            replicate: 'REPLICATE_API_KEY'
        };

        const envKey = keyMapping[provider];
        return envKey ? Boolean(process.env[envKey]) : false;
    }
}

// Export singleton instance
export const imageGenerator = ImageGenerator.getInstance();
