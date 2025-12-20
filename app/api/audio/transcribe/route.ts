import { NextRequest, NextResponse } from 'next/server';
import { getAuthCookie, verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { audioProcessor } from '@/lib/generators';

export async function POST(req: NextRequest) {
    // Authenticate user
    const token = await getAuthCookie();
    if (!token) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyJwt(token);
    if (!decoded || typeof decoded === 'string') {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = typeof decoded === 'object' && 'id' in decoded ? String(decoded.id) : null;
    if (!userId) {
        return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const audioFile = formData.get('audio') as File;
        const language = formData.get('language') as string | null;
        const prompt = formData.get('prompt') as string | null;
        const responseFormat = formData.get('response_format') as string || 'json';
        const translate = formData.get('translate') === 'true';

        if (!audioFile) {
            return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
        }

        // Validate file type
        const supportedFormats = audioProcessor.getSupportedAudioFormats();
        const fileExt = audioFile.name.split('.').pop()?.toLowerCase();
        if (fileExt && !supportedFormats.includes(fileExt)) {
            return NextResponse.json({
                error: 'Unsupported audio format',
                supportedFormats
            }, { status: 400 });
        }

        // Validate file size (25MB max)
        if (audioFile.size > 25 * 1024 * 1024) {
            return NextResponse.json({
                error: 'Audio file too large (max 25MB)'
            }, { status: 400 });
        }

        // Get user
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, plan: true }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Check provider availability
        if (!audioProcessor.isProviderAvailable('openai')) {
            return NextResponse.json({
                error: 'Speech-to-text service not configured',
                details: 'OpenAI API key is required for transcription'
            }, { status: 503 });
        }

        console.log('🎤 Transcribing audio:', {
            fileName: audioFile.name,
            size: audioFile.size,
            language,
            translate
        });

        let result;

        if (translate) {
            // Translate to English
            result = await audioProcessor.translateToEnglish({
                audio: audioFile,
                prompt: prompt || undefined,
                responseFormat: responseFormat as 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt'
            });
        } else {
            // Transcribe
            result = await audioProcessor.transcribe({
                audio: audioFile,
                language: language || undefined,
                prompt: prompt || undefined,
                responseFormat: responseFormat as 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt',
                timestampGranularities: responseFormat === 'verbose_json' ? ['segment', 'word'] : undefined
            });
        }

        if (!result.success) {
            console.error('❌ Transcription failed:', result.error);
            return NextResponse.json({
                error: 'Transcription failed',
                details: result.error
            }, { status: 500 });
        }

        // Save request to database
        await prisma.request.create({
            data: {
                userId: user.id,
                query: `[Audio Transcription] ${audioFile.name}`,
                model: result.model,
                tokens: Math.ceil((result.duration || 60) * 10), // ~10 tokens per second estimate
                cost: result.cost,
                status: 'completed',
                response: result.text.slice(0, 1000) + (result.text.length > 1000 ? '...' : '')
            }
        });

        console.log('✅ Transcription completed:', {
            length: result.text.length,
            duration: result.duration,
            language: result.language,
            cost: result.cost
        });

        return NextResponse.json({
            success: true,
            text: result.text,
            language: result.language,
            duration: result.duration,
            segments: result.segments,
            words: result.words,
            model: result.model,
            provider: result.provider,
            cost: result.cost,
            latency: result.latency
        });

    } catch (error) {
        console.error('❌ Error in transcription:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

export async function GET() {
    // Return transcription capabilities
    return NextResponse.json({
        models: audioProcessor.getSTTModels().map(m => ({
            id: m.id,
            name: m.name,
            provider: m.provider,
            tier: m.tier
        })),
        supportedFormats: audioProcessor.getSupportedAudioFormats(),
        supportedLanguages: audioProcessor.getSupportedLanguages(),
        maxFileSizeMB: 25,
        responseFormats: ['json', 'text', 'srt', 'verbose_json', 'vtt'],
        providerAvailable: audioProcessor.isProviderAvailable('openai')
    });
}
