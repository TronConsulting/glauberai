import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-enhanced';
import { prisma } from '@/lib/prisma';
import { auditLogger, getIpAddress, getUserAgent } from '@/lib/audit-log';
import { validateConversationTitle, ValidationError } from '@/lib/validation';

export const GET = requireAuth(async (req, ctx) => {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const conversations = await prisma.conversation.findMany({
      where: {
        userId: ctx.user.id,
        archivedAt: null,
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' } },
                {
                  messages: {
                    some: {
                      content: { contains: search, mode: 'insensitive' },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            content: true,
            createdAt: true,
            role: true,
          },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
});

export const POST = requireAuth(async (req, ctx) => {
  try {
    const { title, model } = await req.json();

    const validatedTitle = title ? validateConversationTitle(title) : 'New Chat';

    const conversation = await prisma.conversation.create({
      data: {
        userId: ctx.user.id,
        title: validatedTitle,
        model,
      },
    });

    const ipAddress = getIpAddress(req);
    const userAgent = getUserAgent(req);

    await auditLogger.log({
      userId: ctx.user.id,
      sessionId: ctx.session.id,
      action: 'conversation.create',
      resource: 'conversation',
      resourceId: conversation.id,
      ipAddress,
      userAgent,
      status: 'success',
    });

    return NextResponse.json({ conversation });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
});
