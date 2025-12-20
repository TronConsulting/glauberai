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
        const body = await req.json();
        const { text, voice, model, speed, responseFormat, provider } = body;

        if (!text || typeof text !== 'string') {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        if (text.length > 4096) {
            return NextResponse.json({ error: 'Text too long (max 4096 characters)' }, { status: 400 });
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
        const requestedProvider = provider || 'openai';
        if (!audioProcessor.isProviderAvailable(requestedProvider)) {
            return NextResponse.json({
                error: `TTS provider '${requestedProvider}' is not configured`,
                details: 'Please add the required API key',
                availableProviders: ['openai', 'elevenlabs'].filter(p => audioProcessor.isProviderAvailable(p))
            }, { status: 503 });
        }

        // Validate voice
        const validVoices = audioProcessor.getOpenAIVoices();
        if (voice && !validVoices.includes(voice)) {
            return NextResponse.json({
                error: 'Invalid voice',
                validVoices
            }, { status: 400 });
        }

        console.log('🔊 Synthesizing speech:', {
            textLength: text.length,
            voice: voice || 'alloy',
            model: model || 'tts-1',
            provider: requestedProvider
        });

        const result = await audioProcessor.synthesize({
            text,
            voice: voice || 'alloy',
            model: model || 'tts-1',
            speed: speed || 1.0,
            responseFormat: responseFormat || 'mp3',
            provider: requestedProvider
        });

        if (!result.success) {
            console.error('❌ TTS failed:', result.error);
            return NextResponse.json({
                error: 'Speech synthesis failed',
                details: result.error
            }, { status: 500 });
        }

        // Save request to database
        await prisma.request.create({
            data: {
                userId: user.id,
                query: `[TTS] ${text.slice(0, 100)}${text.length > 100 ? '...' : ''}`,
                model: result.model,
                tokens: text.length, // Use character count as tokens for TTS
                cost: result.cost,
                status: 'completed',
                response: `Generated audio (${result.format})`
            }
        });

        console.log('✅ Speech synthesis completed:', {
            format: result.format,
            model: result.model,
            cost: result.cost,
            latency: result.latency
        });

        // Return audio as binary response
        const audioData = result.audio instanceof ArrayBuffer
            ? new Uint8Array(result.audio)
            : new Uint8Array(result.audio);

        const mimeTypes: Record<string, string> = {
            mp3: 'audio/mpeg',
            opus: 'audio/opus',
            aac: 'audio/aac',
            flac: 'audio/flac',
            wav: 'audio/wav',
            pcm: 'audio/pcm'
        };

        return new NextResponse(audioData, {
            status: 200,
            headers: {
                'Content-Type': mimeTypes[result.format] || 'audio/mpeg',
                'Content-Length': audioData.length.toString(),
                'X-Model': result.model,
                'X-Provider': result.provider,
                'X-Cost': result.cost.toString(),
                'X-Latency-Ms': result.latency.toString()
            }
        });

    } catch (error) {
        console.error('❌ Error in TTS:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

export async function GET() {
    // Return TTS capabilities
    return NextResponse.json({
        models: audioProcessor.getTTSModels().map(m => ({
            id: m.id,
            name: m.name,
            provider: m.provider,
            tier: m.tier,
            costPer1kChars: m.costPer1kTokens
        })),
        voices: {
            openai: audioProcessor.getOpenAIVoices(),
            elevenlabs: ['Default'] // Would need API call to get actual voices
        },
        formats: ['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'],
        speedRange: { min: 0.25, max: 4.0, default: 1.0 },
        maxTextLength: 4096,
        providers: {
            openai: audioProcessor.isProviderAvailable('openai'),
            elevenlabs: audioProcessor.isProviderAvailable('elevenlabs')
        }
    });
}
