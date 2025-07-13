import { NextRequest, NextResponse } from 'next/server';
import { getAuthCookie, verifyJwt } from '@/lib/auth';
import { sophisticatedAIRouter } from '@/lib/ai-routing';
import { prisma } from '@/lib/prisma';
import { fileStorage } from '@/lib/file-storage';
import { aiIntegration } from '@/lib/ai-integration';

export async function POST(req: NextRequest) {
  const token = getAuthCookie();
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const decoded = await verifyJwt(token);
  if (!decoded || typeof decoded === 'string') {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
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
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        password: true,
        fullName: true,
        plan: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Count tokens for this month
    const currentTokens = await prisma.request.aggregate({
      _sum: { tokens: true },
      where: {
        userId: user.id,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
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
    const usagePercentage = isUnlimited ? 0 : (tokensUsed / planLimit) * 100;
    const remainingTokens = isUnlimited ? -1 : Math.max(0, planLimit - tokensUsed);

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
    let storedFiles: any[] = [];
    let fileAnalysis = '';
    let hasImages = false;
    let hasDocuments = false;
    let fileTypes: string[] = [];
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

    // Create enhanced query for AI routing
    const enhancedQuery = query + fileAnalysis;
    
    // Use sophisticated AI routing with file context
    const routing = sophisticatedAIRouter.routeQuery(enhancedQuery, selectedModel, files);
    
    // Analyze the query for content type detection
    const analysis = sophisticatedAIRouter.analyzeQuery(enhancedQuery, files);

    console.log('AI Routing selected:', routing.selectedModel.name);
    console.log('Content type detected:', analysis.contentType);
    console.log('Routing reasoning:', routing.reasoning);

    // Convert files to base64 for AI integration
    let fileData: any[] = [];
    if (files && files.length > 0) {
      fileData = await aiIntegration.filesToBase64(files);
    }

    // Call the selected AI model
    console.log('Calling AI model:', routing.selectedModel.name);
    const aiResponse = await aiIntegration.callModel(routing.selectedModel, query, fileData);
    
    let response = aiResponse.content;
    const tokens = aiResponse.tokens;

    // Add context information to the response
    let contextInfo = `\n\n---\n*Generated by ${routing.selectedModel.name} | Model Reasoning: ${routing.reasoning}*`;
    
    if (files && files.length > 0) {
      contextInfo += `\n*Files processed: ${files.length} (${fileTypes.join(', ')})*`;
    }
    
    response += contextInfo;

    // Save the request to the database
    const savedRequest = await prisma.request.create({
      data: {
        userId: user.id,
        query: query,
        model: routing.selectedModel.name,
        tokens: tokens,
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
      remainingTokens: isUnlimited ? -1 : Math.max(0, planLimit - (tokensUsed + tokens)),
      usagePercentage: isUnlimited ? 0 : ((tokensUsed + tokens) / planLimit) * 100,
      isUnlimited,
      plan: {
        name: user.plan,
        tokens: planLimit,
        price: user.plan === 'PROFESSIONAL' ? 39 : 0
      }
    };

    console.log('Sending response with model:', routing.selectedModel.name);

    return NextResponse.json({
      response,
      model: routing.selectedModel.name,
      reasoning: routing.reasoning,
      usage: updatedUsage,
      remainingTokens: updatedUsage.remainingTokens,
      filesProcessed: files.length,
      fileTypes: fileTypes,
      hasImages,
      hasDocuments,
      estimatedCost: routing.estimatedCost,
      confidence: routing.confidence
    });

  } catch (error) {
    console.error('Error processing query:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 