'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Loader2, User, Bot, PenLine } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  tokens?: number;
  cost?: number;
  createdAt: Date;
}

interface ChatInterfaceProps {
  conversationId: string;
  initialMessages?: Message[];
  onMessageSent?: () => void;
}

export function ChatInterface({
  conversationId,
  initialMessages = [],
  onMessageSent
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  // Restore draft from localStorage
  const draftKey = `chat-draft-${conversationId}`;
  const [input, setInput] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(draftKey) || '';
    }
    return '';
  });
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [currentModel, setCurrentModel] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  // Load messages from the server whenever the conversation changes
  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}`);
      if (!res.ok) throw new Error('Failed to load messages');
      const data = await res.json();
      const serverMessages: Message[] = (data.conversation?.messages || []).map((m: any) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        model: m.model,
        tokens: m.tokens,
        cost: m.cost,
        createdAt: new Date(m.createdAt),
      }));
      setMessages(serverMessages);
    } catch (err) {
      console.error('Error loading messages:', err);
      // Fall back to whatever was passed in
      setMessages(initialMessages);
    } finally {
      setLoadingMessages(false);
      setMessagesLoaded(true);
    }
  }, [conversationId]);

  useEffect(() => {
    // Immediately wipe previous chat so it never bleeds into this one
    setMessages([]);
    setStreamingMessage('');
    setMessagesLoaded(false);
    loadMessages();
    // Restore draft for this conversation
    if (typeof window !== 'undefined') {
      setInput(localStorage.getItem(draftKey) || '');
    }
  }, [conversationId, loadMessages]);

  // Persist draft to localStorage on every input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    if (typeof window !== 'undefined') {
      if (value) {
        localStorage.setItem(draftKey, value);
      } else {
        localStorage.removeItem(draftKey);
      }
    }
    // Show typing indicator
    setIsTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isStreaming) return;

    const userMessage = input.trim();
    setInput('');
    // Clear draft from localStorage
    if (typeof window !== 'undefined') localStorage.removeItem(draftKey);
    setIsTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setIsStreaming(true);
    setStreamingMessage('');
    setCurrentModel('');

    // Add user message immediately
    const tempUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          message: userMessage,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let fullContent = '';
      let messageId = '';
      let tokens = 0;
      let cost = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(line.slice(6));

            switch (data.type) {
              case 'metadata':
                setCurrentModel(data.model);
                break;

              case 'token':
                fullContent += data.content;
                setStreamingMessage(fullContent);
                break;

              case 'complete':
                messageId = data.messageId;
                tokens = data.tokens;
                cost = data.cost;
                break;

              case 'error':
                toast.error(data.message);
                setIsStreaming(false);
                setMessages(prev => [
                  ...prev,
                  {
                    id: messageId || Date.now().toString(),
                    role: 'assistant',
                    content: fullContent ? `${fullContent}\n\n**[Error: ${data.message}]**` : `**Error:** ${data.message}`,
                    model: currentModel,
                    tokens,
                    cost,
                    createdAt: new Date(),
                  }
                ]);
                setStreamingMessage('');
                return;
            }
          } catch (e) {
            console.error('Error parsing SSE:', e);
          }
        }
      }

      // Add assistant message
      const assistantMsg: Message = {
        id: messageId,
        role: 'assistant',
        content: fullContent,
        model: currentModel,
        tokens,
        cost,
        createdAt: new Date(),
      };

      setMessages(prev => [...prev, assistantMsg]);
      setStreamingMessage('');
      setIsStreaming(false);

      if (onMessageSent) {
        onMessageSent();
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to send message. Please try again.');
      setIsStreaming(false);
      setStreamingMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Typing indicator banner */}
      {isTyping && !isStreaming && (
        <div className="flex items-center gap-2 px-4 py-1.5 text-xs text-muted-foreground border-b bg-muted/30 animate-pulse">
          <PenLine className="w-3 h-3" />
          <span>You are typing…</span>
        </div>
      )}
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {loadingMessages && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading messages…</p>
          </div>
        )}

        {!loadingMessages && messages.length === 0 && !streamingMessage && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Start a conversation</h3>
              <p className="text-muted-foreground max-w-md">
                Ask me anything! I can help with coding, writing, analysis, and more.
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-4',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {message.role === 'assistant' && (
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Bot className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
            )}

            <div className={cn(
              'rounded-lg px-4 py-3 max-w-[80%]',
              message.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'glass'
            )}>
              {message.role === 'assistant' ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown
                    components={{
                      code(props) {
                        const { className, children } = props;
                        const match = /language-(\w+)/.exec(className || '');
                        return match ? (
                          <SyntaxHighlighter
                            style={oneDark as any}
                            language={match[1]}
                            PreTag="div"
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        ) : (
                          <code className={className}>
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{message.content}</p>
              )}

              {message.model && (
                <div className="mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground flex items-center gap-2">
                  <span className="font-medium">{message.model}</span>
                  {message.tokens && (
                    <span>• {message.tokens} tokens</span>
                  )}
                </div>
              )}
            </div>

            {message.role === 'user' && (
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className="bg-secondary">
                  <User className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}

        {/* Streaming Message */}
        {streamingMessage && (
          <div className="flex gap-4 justify-start">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground">
                <Bot className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>

            <div className="rounded-lg px-4 py-3 max-w-[80%] glass">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    code(props) {
                      const { className, children } = props;
                      const match = /language-(\w+)/.exec(className || '');
                      return match ? (
                        <SyntaxHighlighter
                          style={oneDark as any}
                          language={match[1]}
                          PreTag="div"
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {streamingMessage}
                </ReactMarkdown>
              </div>

              {currentModel && (
                <div className="mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span className="font-medium">{currentModel}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Shift+Enter for new line)"
            disabled={isStreaming}
            className="min-h-[60px] max-h-[200px] resize-none"
            rows={2}
          />
          <Button
            type="submit"
            disabled={!input.trim() || isStreaming}
            size="icon"
            className="h-[60px] w-[60px] flex-shrink-0"
          >
            {isStreaming ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
