'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Loader2, User, Bot, AlertCircle } from 'lucide-react';
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
  const [input, setInput] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isStreaming) return;

    const userMessage = input.trim();
    setInput('');
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
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.length === 0 && !streamingMessage && (
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
            onChange={(e) => setInput(e.target.value)}
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
