/**
 * Generators Index
 * Exports all AI generation services
 */

export { imageGenerator, ImageGenerator } from './image-generator';
export type {
    ImageGenerationRequest,
    ImageGenerationResponse,
    GeneratedImage,
    ImageEditRequest,
    ImageVariationRequest
} from './image-generator';

export { audioProcessor, AudioProcessor } from './audio-processor';
export type {
    TranscriptionRequest,
    TranscriptionResult,
    TranscriptionSegment,
    TranscriptionWord,
    TTSRequest,
    TTSResult,
    OpenAIVoice,
    TTSModel,
    AudioFormat
} from './audio-processor';

export { embeddingGenerator, EmbeddingGenerator } from './embedding-generator';
export type {
    EmbeddingRequest,
    EmbeddingResult,
    SimilarityResult
} from './embedding-generator';
