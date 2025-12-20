import { NextRequest, NextResponse } from 'next/server';
import { getAuthCookie, verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { imageGenerator } from '@/lib/generators';

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
        const { prompt, negativePrompt, size, quality, style, n, model, provider } = body;

        if (!prompt || typeof prompt !== 'string') {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        if (prompt.length > 4000) {
            return NextResponse.json({ error: 'Prompt too long (max 4000 characters)' }, { status: 400 });
        }

        // Get user and check plan
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, plan: true }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Check image generation availability
        const requestedProvider = provider || 'openai';
        if (!imageGenerator.isProviderAvailable(requestedProvider)) {
            return NextResponse.json({
                error: `Image generation provider '${requestedProvider}' is not configured`,
                details: 'Please add the required API key in environment variables',
                availableProviders: ['openai', 'stability', 'replicate'].filter(p => imageGenerator.isProviderAvailable(p))
            }, { status: 503 });
        }

        console.log('🎨 Generating image:', { prompt: prompt.slice(0, 100), size, quality, style, provider: requestedProvider });

        // Generate image
        const result = await imageGenerator.generate({
            prompt,
            negativePrompt,
            size: size || '1024x1024',
            quality: quality || 'standard',
            style: style || 'vivid',
            n: Math.min(n || 1, 4),
            model,
            provider: requestedProvider
        });

        if (!result.success) {
            console.error('❌ Image generation failed:', result.error);
            return NextResponse.json({
                error: 'Image generation failed',
                details: result.error
            }, { status: 500 });
        }

        // Save the request to database
        await prisma.request.create({
            data: {
                userId: user.id,
                query: prompt,
                model: result.model,
                tokens: Math.ceil(prompt.length / 4), // Estimate tokens from prompt
                cost: result.cost,
                status: 'completed',
                response: `Generated ${result.images.length} image(s)`
            }
        });

        console.log('✅ Image generated successfully:', {
            images: result.images.length,
            model: result.model,
            cost: result.cost,
            latency: result.latency
        });

        return NextResponse.json({
            success: true,
            images: result.images,
            model: result.model,
            provider: result.provider,
            cost: result.cost,
            latency: result.latency
        });

    } catch (error) {
        console.error('❌ Error in image generation:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

export async function GET() {
    // Return available image generation models and capabilities
    const models = imageGenerator.getAvailableModels();
    const providers = ['openai', 'stability', 'replicate'].map(p => ({
        id: p,
        available: imageGenerator.isProviderAvailable(p)
    }));

    return NextResponse.json({
        models: models.map(m => ({
            id: m.id,
            name: m.name,
            provider: m.provider,
            costPer1kTokens: m.costPer1kTokens,
            tier: m.tier
        })),
        providers,
        sizes: {
            openai: ['1024x1024', '1792x1024', '1024x1792'],
            stability: ['512x512', '768x768', '1024x1024']
        },
        qualityOptions: ['standard', 'hd'],
        styleOptions: ['vivid', 'natural']
    });
}
