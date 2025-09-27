import { NextRequest, NextResponse } from 'next/server';
import { getAuthCookie, verifyJwt } from '@/lib/auth';
import { SophisticatedAIRouter, COMPREHENSIVE_MODELS, ModelConfig } from '@/lib/ai-routing';
import { enhancedAIIntegration, MultiModalResponse } from '@/lib/enhanced-ai-integration';
import { prisma } from '@/lib/prisma';
import { fileStorage } from '@/lib/file-storage';

const MAX_COMPLETION_TOKENS = 500;
const PROVIDER_PRIORITY: Record<string, number> = {
  google: 0,
  anthropic: 1,
  openai: 2,
  cohere: 3,
  mistral: 4,
  groq: 5,
  together: 6,
  deepinfra: 7,
  openrouter: 8,
  huggingface: 9,
  replicate: 10,
  stability: 11,
  dalle: 12,
  ollama: 13,
  custom: 14,
  local: 50
};
const estimateTokens = (text: string) => {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.min(MAX_COMPLETION_TOKENS, Math.max(0, Math.ceil(words * 1.3)));
};

const shouldBlockProvider = (message: string) => {
  const normalized = message.toLowerCase();
  const signals = [
    'api key',
    'not configured',
    'unauthorized',
    'invalid api key',
    'missing api key',
    'invalid',
    'payment required',
    '402',
    '403',
    '404',
    'forbidden',
    'not found'
  ];
  return signals.some(signal => normalized.includes(signal));
};

const sanitizeFailureReason = (message: string) => message.replace(/\s+/g, ' ').trim();

const buildLocalFallbackResponse = (
  query: string,
  failures: Map<string, string>,
  lastError: string | null
) => {
  const failureLines = Array.from(failures.entries()).map(([provider, reason]) => `• ${provider}: ${reason}`);
  const failureSummary = failureLines.length > 0
    ? failureLines.join('\n')
    : '• No external providers responded (missing API keys or network connectivity).';

  const guidance = [
    '1. Verify API keys for OpenAI, Anthropic, Mistral, Hugging Face, and any other providers you rely on.',
    '2. Ensure open-source endpoints (Replicate, Together, Groq, DeepInfra, etc.) are enabled or swap in locally hosted models.',
    '3. Re-run this request after updating your credentials or provider configuration.'
  ].join('\n');

  const quickAssist = `While external models are offline, here are some next steps for “${query}”:\n- Describe the specific goal or outcome you need.\n- Share any relevant files or snippets to speed up the next answer.\n- Ask follow-up questions once the providers are back online.`;

  const header = 'I wasn\'t able to reach an external AI model just now, so here\'s a quick fallback response:';
  const tail = lastError ? `\n\nLast error encountered: ${lastError}` : '';

  return `${header}\n\nWhat happened:\n${failureSummary}\n\nSuggested fixes:\n${guidance}\n\n${quickAssist}${tail}`;
};

const isModelCompatible = (
  analysis: ReturnType<SophisticatedAIRouter['analyzeQuery']>,
  model: ModelConfig
) => {
  const contentType = analysis.contentType;
  if (contentType === 'image') {
    return model.supportsImages || model.supportsVision;
  }
  if (contentType === 'code') {
    return model.supportsCode;
  }
  // For general text/analysis, prefer models that can handle text
  const textCapableProviders = new Set(['openai', 'anthropic', 'google', 'cohere', 'mistral', 'groq', 'together', 'deepinfra', 'openrouter', 'huggingface', 'ai21', 'perplexity', 'fireworks', 'custom', 'ollama', 'local']);
  if (!textCapableProviders.has(model.provider)) {
    return false;
  }
  if (model.provider === 'dalle' || model.provider === 'stability' || model.provider === 'replicate') {
    // Many replicate/stability models are image-first; skip for plain text unless they explicitly support text
    return model.supportsCode || model.supportsStreaming;
  }
  return true;
};

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

    console.log('Received query:', query);
    console.log('Received files:', files.map(f => ({ name: f.name, size: f.size, type: f.type })));

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
      STARTER: 1000,
      PROFESSIONAL: 1000000,
      ENTERPRISE: -1 // Unlimited
    };
    const planLimit = planTokenLimits[user.plan] || 1000;
    const isUnlimited = user.plan === 'ENTERPRISE';
    const usagePercentage = isUnlimited || planLimit === -1 ? 0 : (tokensUsed / planLimit) * 100;
    const remainingTokens = isUnlimited || planLimit === -1 ? -1 : Math.max(0, planLimit - tokensUsed);

    // Check if user has exceeded their token limit
    if (!isUnlimited && tokensUsed >= planLimit) {
      return NextResponse.json({
        error: `You've reached your monthly limit of ${planLimit} tokens. Please upgrade your plan to continue.`,
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
    let totalFileSize = 0;

    if (files && files.length > 0) {
      console.log('Processing files:', files.map(f => f.name));
      
      // Store files and analyze content
      for (const file of files) {
        try {
          const storedFile = await fileStorage.storeFile(file, user.id);
          storedFiles.push(storedFile);
          
          fileTypes.push(file.type);
          totalFileSize += file.size;
          
          if (file.type.startsWith('image/')) {
            hasImages = true;
          } else if (file.type.includes('pdf') || file.type.includes('document') || file.type.includes('text')) {
            hasDocuments = true;
          }
        } catch (error) {
          console.error('Error storing file:', file.name, error);
        }
      }

      fileAnalysis = `\n\nAttached files: ${files.map(f => `${f.name} (${f.type}, ${(f.size / 1024).toFixed(1)}KB)`).join(', ')}`;
      console.log('File analysis:', { hasImages, hasDocuments, fileTypes, totalFileSize, storedFiles: storedFiles.length });
    }

    // Collect recent conversation history for lightweight context sharing
    const recentHistory = await prisma.request.findMany({
      where: { userId: user.id, status: 'completed' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        query: true,
        response: true,
        createdAt: true,
      }
    });

    const sanitizeForContext = (text?: string | null) => {
      if (!text) return null;
      return text
        .replace(/\n+---[\s\S]*/g, '') // strip metadata footer if present
        .trim()
        .slice(0, 1200); // guard against excessively long entries
    };

    const conversationContext = recentHistory
      .reverse()
      .map((entry) => {
        const previousResponse = sanitizeForContext(entry.response);
        const previousQuery = entry.query?.trim();
        if (!previousQuery || !previousResponse) return null;
        return `User: ${previousQuery}\nAssistant: ${previousResponse}`;
      })
      .filter((segment): segment is string => Boolean(segment))
      .join('\n\n');

    // Create enhanced query for AI routing
    const enhancedQueryBase = conversationContext
      ? `Previous conversation:\n${conversationContext}\n\nCurrent user request:\n${query}`
      : query;
    const enhancedQuery = `${enhancedQueryBase}${fileAnalysis}`;

    // Initialize enhanced AI router with comprehensive models
    const enhancedRouter = new SophisticatedAIRouter(COMPREHENSIVE_MODELS);

    // Use sophisticated AI routing with file context
    const routing = enhancedRouter.routeQuery(enhancedQuery, selectedModel, files);

    // Analyze the query for content type detection
    const analysis = enhancedRouter.analyzeQuery(enhancedQuery, files);
    const limitedEstimatedTokens = Math.min(analysis.estimatedTokens, MAX_COMPLETION_TOKENS);
    const providerBlocklist = new Set<string>();
    const providerFailures = new Map<string, string>();
    const recordProviderFailure = (provider: string, reason: string) => {
      if (!providerFailures.has(provider)) {
        providerFailures.set(provider, sanitizeFailureReason(reason));
      }
    };

    console.log('AI Routing selected:', routing.selectedModel.name);
    console.log('Content type detected:', analysis.contentType);
    console.log('Routing reasoning:', routing.reasoning);
    console.log('Available models:', COMPREHENSIVE_MODELS.length);

    // Check if this is a custom model
    const isCustomModel = routing.selectedModel.provider === 'custom';
    const isHuggingFaceModel = routing.selectedModel.provider === 'huggingface';

    // Convert files to base64 for AI integration
    let fileData: any[] = [];
    if (files && files.length > 0) {
      fileData = await enhancedAIIntegration.filesToBase64(files);
    }

    const runModel = async (model: ModelConfig) => {
      console.log('Calling AI model:', model.name, 'Provider:', model.provider);
      return enhancedAIIntegration.callModelEnhanced(
        model,
        enhancedQuery,
        fileData,
        {
          temperature: 0.7,
          maxTokens: Math.min(model.maxTokens, MAX_COMPLETION_TOKENS),
        }
      );
    };

    const isErrorResponse = (response: { content?: string } | null | undefined) => {
      if (!response || !response.content) return true;
      const lower = response.content.toLowerCase();
      return lower.startsWith('sorry, i encountered an error') || lower.startsWith('error calling');
    };

    const dedupeModels = (models: ModelConfig[]) => {
      const seen = new Set<string>();
      return models.filter((model) => {
        if (seen.has(model.id)) {
          return false;
        }
        seen.add(model.id);
        return true;
      });
    };

    let activeModel = routing.selectedModel;
    let aiResponse: MultiModalResponse;
    if (enhancedAIIntegration.isModelOperational(activeModel)) {
      aiResponse = await runModel(activeModel);
    } else {
      const reason = `Provider ${activeModel.provider} is not configured for ${activeModel.name}.`;
      aiResponse = {
        content: `Error calling ${activeModel.name}: ${reason}`,
        tokens: 0,
        cost: 0,
        model: activeModel.name,
        provider: activeModel.provider,
        type: 'text'
      };
      recordProviderFailure(activeModel.provider, reason);
      providerBlocklist.add(activeModel.provider);
    }
    let aiResponseWasError = isErrorResponse(aiResponse);
    let fallbackUsed = false;
    let primaryErrorMessage: string | null = null;
    let modelReasoning = routing.reasoning;
    let modelConfidence = routing.confidence;
    let modelEstimatedCost = enhancedRouter.calculateCost(activeModel, limitedEstimatedTokens);

    if (aiResponseWasError) {
      primaryErrorMessage = aiResponse?.content ?? 'Unknown model error';
      recordProviderFailure(activeModel.provider, primaryErrorMessage);
      if (shouldBlockProvider(primaryErrorMessage)) {
        providerBlocklist.add(activeModel.provider);
      }

      const candidateModels = dedupeModels([
        ...(routing.alternatives || []),
        ...COMPREHENSIVE_MODELS
      ]).filter((candidate) => candidate.id !== activeModel.id);

      const fallbackPool: ModelConfig[] = [];
      for (const candidate of candidateModels) {
        if (!isModelCompatible(analysis, candidate)) {
          continue;
        }
        if (!enhancedAIIntegration.isModelOperational(candidate)) {
          recordProviderFailure(candidate.provider, `Provider ${candidate.provider} is not configured for ${candidate.name}.`);
          providerBlocklist.add(candidate.provider);
          continue;
        }
        if (providerBlocklist.has(candidate.provider)) {
          continue;
        }
        fallbackPool.push(candidate);
      }

      fallbackPool.sort((a, b) => {
        const priorityA = PROVIDER_PRIORITY[a.provider] ?? 50;
        const priorityB = PROVIDER_PRIORITY[b.provider] ?? 50;
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        const costA = enhancedRouter.calculateCost(a, limitedEstimatedTokens);
        const costB = enhancedRouter.calculateCost(b, limitedEstimatedTokens);
        return costA - costB;
      });

      for (const candidate of fallbackPool) {
        console.log('Attempting fallback model:', candidate.name, 'Provider:', candidate.provider);
        const candidateResponse = await runModel(candidate);
        if (!isErrorResponse(candidateResponse)) {
          aiResponse = candidateResponse;
          aiResponseWasError = false;
          activeModel = candidate;
          fallbackUsed = true;
          modelReasoning = `Fallback to ${candidate.name} after ${routing.selectedModel.name} failed.`;
          modelConfidence = Math.min(0.7, routing.confidence);
          modelEstimatedCost = enhancedRouter.calculateCost(candidate, limitedEstimatedTokens);
          break;
        } else {
          const failureMessage = candidateResponse?.content ?? 'Unknown fallback error';
          console.warn('Fallback model also failed:', candidate.name, failureMessage);
          recordProviderFailure(candidate.provider, failureMessage);
          if (shouldBlockProvider(failureMessage)) {
            providerBlocklist.add(candidate.provider);
          }
        }
      }
    }

    if (isErrorResponse(aiResponse)) {
      const errorMessage = primaryErrorMessage || 'All models failed to generate a response.';
      const fallbackContent = buildLocalFallbackResponse(query, providerFailures, errorMessage);
      const fallbackTokens = estimateTokens(fallbackContent);
      const localModel: ModelConfig = {
        id: 'local-fallback',
        name: 'Local Fallback Assistant',
        provider: 'local',
        modelId: 'local-fallback',
        costPer1kInput: 0,
        costPer1kOutput: 0,
        maxTokens: MAX_COMPLETION_TOKENS,
        supportsStreaming: false,
        supportsImages: false,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsCode: false,
        supportsFunction: false,
        isOpenSource: true,
        requiresGPU: false,
        strengths: ['Always available fallback'],
        weaknesses: ['Limited depth compared to full models'],
        bestFor: ['Status updates', 'Diagnostic guidance'],
        apiUrl: 'local-fallback',
        contextWindow: MAX_COMPLETION_TOKENS,
        trainingData: 'Static heuristics',
        releaseDate: new Date().toISOString()
      };

      aiResponse = {
        content: fallbackContent,
        tokens: fallbackTokens,
        cost: 0,
        model: localModel.name,
        provider: localModel.provider,
        type: 'text'
      };
      activeModel = localModel;
      fallbackUsed = true;
      modelReasoning = `Local fallback response generated after all external providers failed. Last error: ${errorMessage}`;
      modelConfidence = 0.25;
      modelEstimatedCost = 0;
      recordProviderFailure(localModel.provider, 'Generated local fallback response.');
      aiResponseWasError = false;
    }

    let response = aiResponse.content;
    const tokens = Math.min(aiResponse.tokens, MAX_COMPLETION_TOKENS);

    // Add context information to the response
    let contextInfo = `\n\n---\n*Generated by ${activeModel.name} | Model Reasoning: ${modelReasoning}*`;
    if (fallbackUsed && primaryErrorMessage) {
      contextInfo += `\n*Fallback triggered after error: ${primaryErrorMessage.replace(/\n+/g, ' ').trim()}*`;
    }
    
    if (files && files.length > 0) {
      contextInfo += `\n*Files processed: ${files.length} (${fileTypes.join(', ')})*`;
    }
    
    response += contextInfo;

    // Save the request to the database
    const savedRequest = await prisma.request.create({
      data: {
        userId: user.id,
        query: query,
        model: activeModel.name,
        tokens,
        cost: aiResponse.cost,
        status: 'completed',
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

    console.log('Saved request to database:', savedRequest.id);

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

    console.log('Sending response with model:', activeModel.name, 'Fallback used:', fallbackUsed);
    if (providerFailures.size > 0) {
      console.warn('Provider failure summary', Array.from(providerFailures.entries()));
    }

    const alternativeModels = dedupeModels([
      ...(routing.alternatives || []),
      ...COMPREHENSIVE_MODELS.filter((model) => model.isOpenSource || model.provider === 'openai')
    ])
      .filter((alt) => alt.id !== activeModel.id)
      .filter((alt) => isModelCompatible(analysis, alt))
      .filter((alt) => enhancedAIIntegration.isModelOperational(alt))
      .filter((alt) => !providerBlocklist.has(alt.provider))
      .slice(0, 6);

    return NextResponse.json({
      response,
      model: activeModel.name,
      provider: activeModel.provider,
      reasoning: modelReasoning,
      usage: updatedUsage,
      remainingTokens: updatedUsage.remainingTokens,
      filesProcessed: storedFiles.length,
      fileTypes: fileTypes,
      hasImages,
      hasDocuments,
      estimatedCost: modelEstimatedCost,
      confidence: modelConfidence,
      responseType: aiResponse.type || 'text',
      conversationContextIncluded: Boolean(conversationContext),
      conversationMessages: conversationContext,
      isOpenSource: activeModel.isOpenSource || false,
      fallbackUsed,
      primaryModel: routing.selectedModel.name,
      modelCapabilities: {
        streaming: activeModel.supportsStreaming,
        vision: activeModel.supportsVision,
        code: activeModel.supportsCode,
        multimodal: activeModel.supportsImages || activeModel.supportsAudio
      },
      alternatives: alternativeModels.map(alt => ({
        name: alt.name,
        provider: alt.provider,
        strengths: alt.strengths,
        estimatedCost: enhancedRouter.calculateCost ? enhancedRouter.calculateCost(alt, limitedEstimatedTokens) : 0
      })),
      providerFailures: Array.from(providerFailures.entries()).map(([provider, reason]) => ({ provider, reason }))
    });

  } catch (error) {
    console.error('Error processing query:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
