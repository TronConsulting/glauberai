'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChatInterface } from '@/components/chat-interface';
import { UsageMeter } from '@/components/usage-meter';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, MessageSquare, Menu, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PLAN_LIMITS } from '@/lib/usage';

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
}

export default function ChatPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [usageLoading, setUsageLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [usage, setUsage] = useState<{
    used: number;
    limit: number;
    plan: string;
  } | null>(null);

  useEffect(() => {
    loadConversations();
    loadUsage();
  }, []);

  const loadConversations = async () => {
    try {
      const res = await fetch('/api/conversations');
      if (!res.ok) throw new Error('Failed to load conversations');

      const data = await res.json();
      setConversations(data.conversations || []);

      // If no current conversation, create one
      if (data.conversations.length === 0) {
        await createNewConversation();
      } else {
        setCurrentConversation(data.conversations[0]);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Failed to load conversations');
      setLoading(false);
    }
  };

  const loadUsage = async () => {
    try {
      const res = await fetch('/api/usage');
      if (!res.ok) throw new Error('Failed to load usage');

      const data = await res.json();

      // Get request limit from plan
      const planLimits = PLAN_LIMITS[data.plan.type as keyof typeof PLAN_LIMITS];
      const limit = planLimits?.requests || 100;

      setUsage({
        used: data.usage.requestsThisMonth || 0,
        limit,
        plan: data.plan.name || 'Starter',
      });

      setUsageLoading(false);
    } catch (error) {
      console.error('Error loading usage:', error);
      setUsageLoading(false);
    }
  };

  const createNewConversation = async () => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' }),
      });

      if (!res.ok) throw new Error('Failed to create conversation');

      const data = await res.json();
      const newConv = data.conversation;

      setConversations(prev => [newConv, ...prev]);
      setCurrentConversation(newConv);
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
    }
  };

  const selectConversation = (conv: Conversation) => {
    setCurrentConversation(conv);
  };

  const handleMessageSent = () => {
    // Reload usage and conversations
    loadUsage();
    loadConversations();
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div
        className={cn(
          'flex flex-col border-r bg-background transition-all duration-300',
          sidebarOpen ? 'w-80' : 'w-0'
        )}
      >
        {sidebarOpen && (
          <>
            {/* Header */}
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Conversations</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <Button
                onClick={createNewConversation}
                className="w-full"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Chat
              </Button>
            </div>

            <Separator />

            {/* Conversations List */}
            <ScrollArea className="flex-1 px-2">
              <div className="space-y-2 p-2">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))
                ) : conversations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No conversations yet
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => selectConversation(conv)}
                      className={cn(
                        'w-full text-left p-3 rounded-lg transition-colors',
                        'hover:bg-accent',
                        currentConversation?.id === conv.id && 'bg-accent'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 mt-1 flex-shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-sm">
                            {conv.title || 'New Chat'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {conv.messageCount || 0} messages
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>

            <Separator />

            {/* Usage Meter */}
            <div className="p-4">
              {usageLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : usage && (
                <UsageMeter
                  currentUsage={usage.used}
                  limit={usage.limit}
                  planName={usage.plan}
                  compact={true}
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b p-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex-1">
            <h1 className="font-semibold truncate">
              {currentConversation?.title || 'New Chat'}
            </h1>
            {usage && (
              <p className="text-xs text-muted-foreground">
                {usage.used} / {usage.limit} requests used this month
              </p>
            )}
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 overflow-hidden">
          {currentConversation ? (
            <ChatInterface
              conversationId={currentConversation.id}
              onMessageSent={handleMessageSent}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">No conversation selected</h3>
                  <p className="text-muted-foreground mb-4">
                    Create a new conversation to get started
                  </p>
                  <Button onClick={createNewConversation}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Chat
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
