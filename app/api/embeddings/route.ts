import { NextRequest, NextResponse } from 'next/server';
import { getAuthCookie, verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { embeddingGenerator } from '@/lib/generators';

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
        const { texts, model, dimensions } = body;

        if (!texts) {
            return NextResponse.json({ error: 'Texts are required' }, { status: 400 });
        }

        const inputTexts = Array.isArray(texts) ? texts : [texts];

        if (inputTexts.length === 0) {
            return NextResponse.json({ error: 'At least one text is required' }, { status: 400 });
        }

        if (inputTexts.length > 100) {
            return NextResponse.json({ error: 'Too many texts (max 100)' }, { status: 400 });
        }

        // Validate text lengths
        const maxLength = 8191;
        for (const text of inputTexts) {
            if (typeof text !== 'string') {
                return NextResponse.json({ error: 'All texts must be strings' }, { status: 400 });
            }
            if (text.length > maxLength * 4) { // ~4 chars per token
                return NextResponse.json({
                    error: `Text too long (max ~${maxLength * 4} characters)`
                }, { status: 400 });
            }
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
        if (!embeddingGenerator.isProviderAvailable('openai')) {
            return NextResponse.json({
                error: 'Embedding service not configured',
                details: 'OpenAI API key is required for embeddings'
            }, { status: 503 });
        }

        // Validate dimensions if provided
        const selectedModel = model || 'text-embedding-3-small';
        const dimensionOptions = embeddingGenerator.getDimensionOptions(selectedModel);
        if (dimensions && dimensionOptions) {
            if (dimensions < dimensionOptions.min || dimensions > dimensionOptions.max) {
                return NextResponse.json({
                    error: `Invalid dimensions for ${selectedModel}`,
                    validRange: dimensionOptions
                }, { status: 400 });
            }
        }

        console.log('🔢 Generating embeddings:', {
            count: inputTexts.length,
            model: selectedModel,
            dimensions
        });

        const result = await embeddingGenerator.generate({
            texts: inputTexts,
            model: selectedModel,
            dimensions
        });

        if (!result.success) {
            console.error('❌ Embedding generation failed:', result.error);
            return NextResponse.json({
                error: 'Embedding generation failed',
                details: result.error
            }, { status: 500 });
        }

        // Save request to database
        await prisma.request.create({
            data: {
                userId: user.id,
                query: `[Embeddings] ${inputTexts.length} text(s)`,
                model: result.model,
                tokens: result.usage.totalTokens,
                cost: result.cost,
                status: 'completed',
                response: `Generated ${result.embeddings.length} embeddings (${result.dimensions} dimensions)`
            }
        });

        console.log('✅ Embeddings generated:', {
            count: result.embeddings.length,
            dimensions: result.dimensions,
            tokens: result.usage.totalTokens,
            cost: result.cost
        });

        return NextResponse.json({
            success: true,
            embeddings: result.embeddings,
            model: result.model,
            provider: result.provider,
            dimensions: result.dimensions,
            usage: result.usage,
            cost: result.cost,
            latency: result.latency
        });

    } catch (error) {
        console.error('❌ Error in embeddings:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

export async function GET() {
    // Return embedding capabilities
    const models = embeddingGenerator.getAvailableModels();

    return NextResponse.json({
        models: models.map(m => ({
            id: m.id,
            name: m.name,
            provider: m.provider,
            tier: m.tier,
            costPer1kTokens: m.costPer1kTokens,
            maxTokens: m.maxTokens
        })),
        dimensionOptions: {
            'text-embedding-3-small': embeddingGenerator.getDimensionOptions('text-embedding-3-small'),
            'text-embedding-3-large': embeddingGenerator.getDimensionOptions('text-embedding-3-large'),
            'text-embedding-ada-002': null // Fixed dimensions
        },
        maxTextsPerRequest: 100,
        providerAvailable: embeddingGenerator.isProviderAvailable('openai')
    });
}
