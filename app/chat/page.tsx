'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChatInterface } from '@/components/chat-interface';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MessageSquare, Menu, X, User, Settings, CreditCard, LogOut, BarChart3, Key } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PLAN_LIMITS } from '@/lib/usage';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import Image from 'next/image';

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
}

export default function ChatPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
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
    loadConversations(true);
    loadUsage();
  }, []);

  const loadConversations = async (isInitialLoad = false) => {
    try {
      const res = await fetch('/api/conversations');
      if (!res.ok) throw new Error('Failed to load conversations');

      const data = await res.json();
      const convList: Conversation[] = data.conversations || [];
      setConversations(convList);

      // Only auto-select a conversation on the very first load
      if (isInitialLoad) {
        if (convList.length === 0) {
          await createNewConversation();
        } else {
          // Restore the last selected conversation, fall back to the most recent
          const savedId = typeof window !== 'undefined'
            ? localStorage.getItem('last-conversation-id')
            : null;
          const restored = savedId
            ? convList.find((c) => c.id === savedId)
            : null;
          setCurrentConversation(restored || convList[0]);
        }
        setLoading(false);
      } else {
        // Just update the list (e.g. after a message is sent) without switching chats
        setLoading(false);
      }
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
      // Persist selection
      if (typeof window !== 'undefined') {
        localStorage.setItem('last-conversation-id', newConv.id);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
    }
  };

  const selectConversation = (conv: Conversation) => {
    setCurrentConversation(conv);
    // Remember the selection so it survives a browser refresh
    if (typeof window !== 'undefined') {
      localStorage.setItem('last-conversation-id', conv.id);
    }
  };

  const handleMessageSent = () => {
    // Refresh the sidebar list & usage, but don't switch the active conversation
    loadUsage();
    loadConversations(false);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - ChatGPT Style */}
      <div
        className={cn(
          'flex flex-col border-r bg-background transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-0'
        )}
      >
        {sidebarOpen && (
          <>
            {/* Header with Logo and New Chat */}
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10">
                    <Image
                      src="/neural.png"
                      alt="GlauberAI"
                      width={24}
                      height={24}
                      className="object-contain"
                    />
                  </div>
                  <span className="font-semibold text-sm">GlauberAI</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 lg:hidden"
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

            {/* Conversations List */}
            <ScrollArea className="flex-1 px-2">
              <div className="space-y-1 py-2">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))
                ) : conversations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-xs">
                    No conversations yet
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => selectConversation(conv)}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-lg transition-colors text-sm',
                        'hover:bg-accent',
                        currentConversation?.id === conv.id && 'bg-accent'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                        <span className="truncate">{conv.title || 'New Chat'}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>

            <Separator />

            {/* Usage & User Menu */}
            <div className="p-3 space-y-3">
              {/* Simple Usage Display */}
              {!usageLoading && usage && (
                <div className="px-2 py-1.5 rounded-lg bg-secondary/50 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-muted-foreground">Usage</span>
                    <span className="font-medium">
                      {usage.used} / {usage.limit}
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-1.5">
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.min((usage.used / usage.limit) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start px-2 h-auto py-2"
                  >
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarFallback className="text-xs">
                        {user?.email?.[0].toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user?.fullName || user?.email || 'User'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {usage?.plan || 'Free'} Plan
                      </p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" side="top">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/analytics" className="flex items-center">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Analytics
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/api" className="flex items-center">
                      <Key className="w-4 h-4 mr-2" />
                      API Keys
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/billing" className="flex items-center">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Billing
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/pricing" className="flex items-center">
                      <Settings className="w-4 h-4 mr-2" />
                      Upgrade Plan
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="border-b p-3 flex items-center gap-3 h-14">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="w-4 h-4" />
          </Button>

          <div className="flex-1 min-w-0">
            <h1 className="font-medium text-sm truncate">
              {currentConversation?.title || 'New Chat'}
            </h1>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 overflow-hidden">
          {currentConversation ? (
            <ChatInterface
              key={currentConversation.id}
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
