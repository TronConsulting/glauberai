import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-enhanced';
import { prisma } from '@/lib/prisma';
import { auditLogger, getIpAddress, getUserAgent } from '@/lib/audit-log';
import { validateConversationTitle } from '@/lib/validation';

export const GET = requireAuth(async (req, ctx) => {
  try {
    const id = req.nextUrl.pathname.split('/').pop();

    if (!id) {
      return NextResponse.json(
        { error: 'Conversation ID required' },
        { status: 400 }
      );
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        userId: ctx.user.id,
        archivedAt: null,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
});

export const PATCH = requireAuth(async (req, ctx) => {
  try {
    const id = req.nextUrl.pathname.split('/').pop();
    const { title, model } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Conversation ID required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.conversation.findFirst({
      where: { id, userId: ctx.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const validatedTitle = title ? validateConversationTitle(title) : undefined;

    const conversation = await prisma.conversation.update({
      where: { id },
      data: {
        title: validatedTitle,
        model,
      },
    });

    const ipAddress = getIpAddress(req);
    const userAgent = getUserAgent(req);

    await auditLogger.log({
      userId: ctx.user.id,
      sessionId: ctx.session.id,
      action: 'conversation.update',
      resource: 'conversation',
      resourceId: id,
      ipAddress,
      userAgent,
      status: 'success',
      changes: {
        before: { title: existing.title, model: existing.model },
        after: { title: conversation.title, model: conversation.model },
      },
    });

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
});

export const DELETE = requireAuth(async (req, ctx) => {
  try {
    const id = req.nextUrl.pathname.split('/').pop();

    if (!id) {
      return NextResponse.json(
        { error: 'Conversation ID required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.conversation.findFirst({
      where: { id, userId: ctx.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Soft delete
    await prisma.conversation.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    const ipAddress = getIpAddress(req);
    const userAgent = getUserAgent(req);

    await auditLogger.log({
      userId: ctx.user.id,
      sessionId: ctx.session.id,
      action: 'conversation.delete',
      resource: 'conversation',
      resourceId: id,
      ipAddress,
      userAgent,
      status: 'success',
    });

    return NextResponse.json({ message: 'Conversation archived' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
});
