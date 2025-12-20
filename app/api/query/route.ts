import { NextRequest, NextResponse } from 'next/server';
import { getAuthCookie, verifyJwt } from '@/lib/auth';
import { aiRouter } from '@/lib/ai-router';
import { modelManager } from '@/lib/model-manager';
import { prisma } from '@/lib/prisma';
import { fileStorage } from '@/lib/file-storage';

const MAX_COMPLETION_TOKENS = 500;

export async function POST(req: NextRequest) {
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
    const query = formData.get('query') as string;
    const files = formData.getAll('files') as File[];
    const selectedModel = formData.get('selectedModel') as string || 'auto';
    const maxCost = formData.get('maxCost') ? parseFloat(formData.get('maxCost') as string) : undefined;
    const preferFree = formData.get('preferFree') === 'true';
    const requiresSpeed = formData.get('requiresSpeed') === 'true';

    console.log('📝 Received query:', query);
    console.log('📎 Files:', files.map(f => ({ name: f.name, size: f.size, type: f.type })));
    console.log('⚙️ Preferences:', { selectedModel, maxCost, preferFree, requiresSpeed });

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Get user and check usage
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        plan: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Count tokens for this month
    const currentTokens = await prisma.request.aggregate({
      _sum: { tokens: true },
      where: {
        userId: user.id,
        createdAt: {
          gte: monthStart
        }
      }
    });
    const tokensUsed = currentTokens._sum.tokens || 0;

    // Calculate usage based on plan
    const planTokenLimits: Record<string, number> = {
      STARTER: 10000,
      PROFESSIONAL: 1000000,
      ENTERPRISE: -1 // Unlimited
    };
    const planLimit = planTokenLimits[user.plan] || 10000;
    const isUnlimited = user.plan === 'ENTERPRISE';
    const usagePercentage = isUnlimited || planLimit === -1 ? 0 : (tokensUsed / planLimit) * 100;
    const remainingTokens = isUnlimited || planLimit === -1 ? -1 : Math.max(0, planLimit - tokensUsed);

    // Check if user has exceeded their token limit
    if (!isUnlimited && tokensUsed >= planLimit) {
      return NextResponse.json({
        error: `You've reached your monthly limit of ${planLimit.toLocaleString()} tokens. Please upgrade your plan to continue.`,
        usage: {
          tokensUsed,
          planLimit,
          remainingTokens,
          usagePercentage,
          isUnlimited,
          plan: {
            name: user.plan,
            tokens: planLimit,
            price: user.plan === 'PROFESSIONAL' ? 39 : 0
          }
        },
        requiresUpgrade: true
      }, { status: 429 });
    }

    // Process and store uploaded files
    const storedFiles: any[] = [];
    let fileAnalysis = '';
    let hasImages = false;
    let hasDocuments = false;
    const fileTypes: string[] = [];

    if (files && files.length > 0) {
      console.log('📁 Processing files:', files.map(f => f.name));
      
      // Store files and analyze content
      for (const file of files) {
        try {
          const storedFile = await fileStorage.storeFile(file, user.id);
          storedFiles.push(storedFile);
          
          fileTypes.push(file.type);
          
          if (file.type.startsWith('image/')) {
            hasImages = true;
          } else if (file.type.includes('pdf') || file.type.includes('document') || file.type.includes('text')) {
            hasDocuments = true;
          }
        } catch (error) {
          console.error('❌ Error storing file:', file.name, error);
        }
      }

      fileAnalysis = `\\n\\nAttached files: ${files.map(f => `${f.name} (${f.type}, ${(f.size / 1024).toFixed(1)}KB)`).join(', ')}`;
      console.log('📊 File analysis:', { hasImages, hasDocuments, fileTypes, storedFiles: storedFiles.length });
    }

    // Collect recent conversation history for context
    const recentHistory = await prisma.request.findMany({
      where: { userId: user.id, status: 'completed' },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        query: true,
        response: true,
        createdAt: true,
      }
    });

    const conversationContext = recentHistory
      .reverse()
      .map((entry) => {
        const previousResponse = entry.response?.replace(/\\n+---[\\s\\S]*/g, '').trim().slice(0, 200);
        const previousQuery = entry.query?.trim().slice(0, 100);
        if (!previousQuery || !previousResponse) return null;
        return `Q: ${previousQuery}\\nA: ${previousResponse}`;
      })
      .filter((segment): segment is string => Boolean(segment))
      .join('\\n\\n');

    // Create enhanced query
    const enhancedQuery = conversationContext
      ? `Previous conversation:\\n${conversationContext}\\n\\nCurrent question:\\n${query}${fileAnalysis}`
      : `${query}${fileAnalysis}`;

    console.log('🔍 Enhanced query length:', enhancedQuery.length);

    // Check system status
    const systemStatus = modelManager.getSystemStatus();
    console.log('🏥 System status:', systemStatus);

    if (systemStatus.availableModels === 0) {
      return NextResponse.json({
        error: 'No AI models are currently available. Please check the system configuration.',
        details: 'Make sure API keys are set for at least one provider (OpenAI, Anthropic, Google, HuggingFace, etc.)',
        systemStatus
      }, { status: 503 });
    }

    // Set up constraints based on user preferences and file requirements
    const constraints = {
      maxCost,
      preferFree,
      requiresSpeed
    };

    // Add vision requirement if images are present
    if (hasImages) {
      // Override model selection for vision tasks
      const visionModels = modelManager.getAllModels().filter(m => m.supportsVision);
      if (visionModels.length === 0) {
        return NextResponse.json({
          error: 'Vision capabilities required but no vision models available',
          details: 'Please add API keys for models that support image analysis (GPT-4o, Claude 3, Gemini)'
        }, { status: 503 });
      }
    }

    // Process the query using the intelligent router
    let result;
    try {
      console.log('🤖 Processing query with AI router...');
      result = await aiRouter.processQueryEnhanced(
        enhancedQuery, 
        'CHAT',
        selectedModel === 'auto' ? undefined : selectedModel,
        constraints,
        { maxTokens: Math.min(MAX_COMPLETION_TOKENS, remainingTokens > 0 ? remainingTokens : MAX_COMPLETION_TOKENS) }
      );
      
      console.log('✅ AI Response received:', {
        success: result.success,
        finalModel: result.finalModel,
        attemptedModels: result.attemptedModels,
        tokens: result.tokens,
        cost: result.cost,
        contentLength: result.content.length
      });

    } catch (error) {
      console.error('❌ Error processing query:', error);
      
      // Fallback response
      const fallbackModel = modelManager.getFallbackModel();
      
      result = {
        content: `I apologize, but I'm currently experiencing technical difficulties. This could be due to:\\n\\n• API rate limits\\n• Model unavailability\\n• Network connectivity issues\\n\\nPlease try again in a moment. If the problem persists, the system administrator should check:\\n\\n1. API key configuration\\n2. Model availability status\\n3. Network connectivity\\n\\nError: ${error instanceof Error ? error.message : 'Unknown error'}`,
        tokens: 50,
        model: fallbackModel?.name || 'System Fallback',
        provider: 'system',
        cost: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        latency: 0,
        routing: {
          selectedModel: fallbackModel || {
            id: 'fallback',
            name: 'System Fallback',
            provider: 'system',
            modelId: 'fallback',
            enabled: true,
            priority: 100,
            maxTokens: 100,
            contextWindow: 100,
            supportsCode: false,
            supportsChat: true,
            costPer1kTokens: 0,
            category: 'CHAT',
            tier: 'FREE'
          },
          reasoning: 'System fallback due to error',
          confidence: 0.1,
          alternatives: [],
          analysis: {
            type: 'CHAT' as const,
            complexity: 'simple' as const,
            keywords: [],
            requiresCode: false,
            requiresVision: false,
            isQuestion: false,
            estimatedTokens: 50,
            urgency: 'low' as const,
            language: 'en'
          },
          fallbackChain: []
        },
        attemptedModels: ['system-fallback'],
        finalModel: 'System Fallback'
      };
    }

    const tokens = Math.min(result.tokens || 0, MAX_COMPLETION_TOKENS);
    let response = result.content || 'No response generated';

    // Add context information to the response
    let contextInfo = `\\n\\n---\\n*Generated by ${result.finalModel} | Confidence: ${(result.routing.confidence * 100).toFixed(0)}%*`;
    
    if (result.attemptedModels.length > 1) {
      contextInfo += `\\n*Tried models: ${result.attemptedModels.join(' → ')}*`;
    }
    
    if (files && files.length > 0) {
      contextInfo += `\\n*Files processed: ${files.length} (${fileTypes.join(', ')})*`;
    }
    
    if (conversationContext) {
      contextInfo += `\\n*Context from previous conversation included*`;
    }

    if (result.cost > 0) {
      contextInfo += `\\n*Cost: $${result.cost.toFixed(4)}*`;
    }

    response += contextInfo;

    // Save the request to the database
    const savedRequest = await prisma.request.create({
      data: {
        userId: user.id,
        query: query,
        model: result.finalModel,
        tokens,
        cost: result.cost,
        status: result.success ? 'completed' : 'failed',
        response: response,
        fileCount: storedFiles.length
      }
    });

    // Save file records to database
    if (storedFiles.length > 0) {
      await Promise.all(
        storedFiles.map(storedFile =>
          prisma.file.create({
            data: {
              userId: user.id,
              requestId: savedRequest.id,
              filename: storedFile.filename,
              originalName: storedFile.originalName,
              mimeType: storedFile.mimeType,
              size: storedFile.size,
              path: storedFile.path,
              url: fileStorage.getFileUrl(storedFile.path),
              metadata: storedFile.metadata
            }
          })
        )
      );
    }

    console.log('💾 Saved request to database:', savedRequest.id);

    // Updated usage after saving
    const updatedUsage = {
      tokensUsed: tokensUsed + tokens,
      planLimit,
      remainingTokens: isUnlimited || planLimit === -1 ? -1 : Math.max(0, planLimit - (tokensUsed + tokens)),
      usagePercentage: isUnlimited || planLimit === -1 ? 0 : ((tokensUsed + tokens) / planLimit) * 100,
      isUnlimited,
      currentUsage: tokensUsed + tokens,
      remainingRequests: isUnlimited ? -1 : Math.max(0, planLimit - (tokensUsed + tokens)),
      plan: {
        name: user.plan,
        tokens: planLimit,
        price: user.plan === 'PROFESSIONAL' ? 39 : 0
      }
    };

    console.log('📤 Sending response with model:', result.finalModel);

    // Get alternatives with cost estimates
    const alternatives = result.routing.alternatives.map(alt => ({
      name: alt.name,
      provider: alt.provider,
      strengths: alt.strengths,
      estimatedCost: alt.costPer1kTokens,
      tier: alt.tier
    }));

    return NextResponse.json({
      response,
      model: result.finalModel,
      provider: result.provider,
      reasoning: result.routing.reasoning,
      usage: updatedUsage,
      remainingTokens: updatedUsage.remainingTokens,
      filesProcessed: storedFiles.length,
      fileTypes: fileTypes,
      hasImages,
      hasDocuments,
      estimatedCost: result.cost,
      confidence: result.routing.confidence,
      responseType: 'text',
      conversationContextIncluded: Boolean(conversationContext),
      queryAnalysis: {
        reasoning: result.routing.reasoning,
        confidence: result.routing.confidence,
        alternatives: result.routing.alternatives.map(alt => alt.name)
      },
      modelCapabilities: {
        streaming: result.routing.selectedModel.supportsStreaming || false,
        vision: result.routing.selectedModel.supportsVision || false,
        code: result.routing.selectedModel.supportsCode || false,
        multimodal: result.routing.selectedModel.category === 'MULTIMODAL'
      },
      alternatives,
      systemStatus,
      attemptedModels: result.attemptedModels,
      fallbackUsed: result.attemptedModels.length > 1
    });

  } catch (error) {
    console.error('❌ Error processing query:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      suggestion: 'Please check that API keys are configured correctly and try again.'
    }, { status: 500 });
  }
}