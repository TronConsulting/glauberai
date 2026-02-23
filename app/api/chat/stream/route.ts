import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth-enhanced';
import { prisma } from '@/lib/prisma';
import { aiRouter } from '@/lib/ai-router';
import { auditLogger, getIpAddress, getUserAgent } from '@/lib/audit-log';
import { rateLimiter, RATE_LIMITS } from '@/lib/rate-limit';
import { validateQuery, ValidationError } from '@/lib/validation';
import { createSSEMessage, createStreamResponse } from '@/lib/streaming';
import { aiClient } from '@/lib/ai-client';
import { PLAN_LIMITS } from '@/lib/usage';
import { ALL_MODELS } from '@/lib/models';

const MAX_COMPLETION_TOKENS = 500;

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  try {
    // Authenticate user
    const ctx = await authenticateRequest(req);
    const ipAddress = getIpAddress(req);
    const userAgent = getUserAgent(req);

    // Check rate limit - all plans now have limits
    const rateLimit = ctx.user.plan === 'STARTER'
      ? RATE_LIMITS.STARTER_MESSAGES
      : ctx.user.plan === 'PROFESSIONAL'
      ? RATE_LIMITS.PROFESSIONAL_MESSAGES
      : RATE_LIMITS.PROFESSIONAL_MESSAGES; // ENTERPRISE uses same as PRO for hourly, monthly limit enforced separately

    const rateLimitResult = await rateLimiter.checkLimit(
      `messages:${ctx.user.id}`,
      rateLimit
    );

    if (!rateLimitResult.allowed) {
      return new Response(
        encoder.encode(
          createSSEMessage({
            type: 'error',
            message: 'Rate limit exceeded. Please try again later.',
          })
        ),
        {
          status: 429,
          headers: { 'Content-Type': 'text/event-stream' },
        }
      );
    }

    const { conversationId, message, files } = await req.json();

    if (!conversationId || !message) {
      return new Response(
        encoder.encode(
          createSSEMessage({
            type: 'error',
            message: 'Conversation ID and message are required',
          })
        ),
        {
          status: 400,
          headers: { 'Content-Type': 'text/event-stream' },
        }
      );
    }

    // Validate conversation ownership
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: ctx.user.id,
        archivedAt: null,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!conversation) {
      return new Response(
        encoder.encode(
          createSSEMessage({
            type: 'error',
            message: 'Conversation not found',
          })
        ),
        {
          status: 404,
          headers: { 'Content-Type': 'text/event-stream' },
        }
      );
    }

    // Validate message content
    const validatedMessage = validateQuery(message, ctx.user.plan);

    // Create user message
    const userMessage = await prisma.message.create({
      data: {
        conversationId,
        role: 'user',
        content: validatedMessage,
        attachments: files || null,
      },
    });

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Build context from recent messages
          const context = conversation.messages
            .reverse()
            .map((msg) => `${msg.role}: ${msg.content.slice(0, 200)}`)
            .join('\n\n');

          const enhancedMessage = context
            ? `Previous context:\n${context}\n\nCurrent message:\n${validatedMessage}`
            : validatedMessage;

          // Filter models based on user's plan tier
          const allowedTiers = PLAN_LIMITS[ctx.user.plan as keyof typeof PLAN_LIMITS]?.modelTiers || ['FREE'];
          const availableModels = ALL_MODELS.filter(model =>
            allowedTiers.includes(model.tier)
          );

          if (availableModels.length === 0) {
            controller.enqueue(
              encoder.encode(
                createSSEMessage({
                  type: 'error',
                  message: 'No models available for your plan. Please upgrade.',
                })
              )
            );
            controller.close();
            return;
          }

          // Route to appropriate model from available models
          const routing = await aiRouter.routeQuery(enhancedMessage, availableModels);

          // Send metadata event
          controller.enqueue(
            encoder.encode(
              createSSEMessage({
                type: 'metadata',
                model: routing.selectedModel.name,
                provider: routing.selectedModel.provider,
              })
            )
          );

          let fullContent = '';
          let tokenCount = 0;

          // Stream from AI model
          await aiClient.streamModel(
            routing.selectedModel,
            enhancedMessage,
            {
              maxTokens: MAX_COMPLETION_TOKENS,
              onToken: (token: string) => {
                fullContent += token;
                tokenCount++;

                // Send token event
                controller.enqueue(
                  encoder.encode(
                    createSSEMessage({
                      type: 'token',
                      content: token,
                    })
                  )
                );
              },
              onComplete: async () => {
                // Calculate cost
                const cost = (tokenCount / 1000) * routing.selectedModel.costPer1kTokens;

                // Save assistant message
                const assistantMessage = await prisma.message.create({
                  data: {
                    conversationId,
                    role: 'assistant',
                    content: fullContent,
                    model: routing.selectedModel.name,
                    tokens: tokenCount,
                    cost,
                    metadata: {
                      routing: routing.reasoning,
                      confidence: routing.confidence,
                    } as any,
                  },
                });

                // Also create Request record for analytics
                await prisma.request.create({
                  data: {
                    userId: ctx.user.id,
                    query: validatedMessage,
                    model: routing.selectedModel.name,
                    tokens: tokenCount,
                    cost,
                    status: 'completed',
                    response: fullContent,
                  },
                });

                // Update conversation timestamp and title
                if (!conversation.title || conversation.title === 'New Chat') {
                  const title = validatedMessage.slice(0, 50) + (validatedMessage.length > 50 ? '...' : '');
                  await prisma.conversation.update({
                    where: { id: conversationId },
                    data: { title, updatedAt: new Date() },
                  });
                } else {
                  await prisma.conversation.update({
                    where: { id: conversationId },
                    data: { updatedAt: new Date() },
                  });
                }

                // Send completion event
                controller.enqueue(
                  encoder.encode(
                    createSSEMessage({
                      type: 'complete',
                      messageId: assistantMessage.id,
                      tokens: tokenCount,
                      cost,
                    })
                  )
                );

                // Log audit
                await auditLogger.log({
                  userId: ctx.user.id,
                  sessionId: ctx.session.id,
                  action: 'message.create',
                  resource: 'message',
                  resourceId: assistantMessage.id,
                  ipAddress,
                  userAgent,
                  status: 'success',
                  metadata: {
                    conversationId,
                    model: routing.selectedModel.name,
                    tokens: tokenCount,
                    cost,
                  },
                });

                controller.close();
              },
              onError: (error: Error) => {
                console.error('Streaming error:', error);

                controller.enqueue(
                  encoder.encode(
                    createSSEMessage({
                      type: 'error',
                      message: 'Failed to generate response. Please try again.',
                    })
                  )
                );

                controller.close();
              },
            }
          );
        } catch (error) {
          console.error('Stream initialization error:', error);

          controller.enqueue(
            encoder.encode(
              createSSEMessage({
                type: 'error',
                message: 'Failed to initialize stream',
              })
            )
          );

          controller.close();
        }
      },
    });

    return createStreamResponse(stream);
  } catch (error) {
    console.error('Chat stream error:', error);

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            createSSEMessage({
              type: 'error',
              message: error instanceof Error ? error.message : 'Internal server error',
            })
          )
        );
        controller.close();
      },
    });

    return createStreamResponse(stream);
  }
}
