export type StreamEvent =
  | { type: 'metadata'; model: string; provider: string }
  | { type: 'token'; content: string }
  | { type: 'complete'; messageId: string; tokens: number; cost: number }
  | { type: 'error'; message: string };

export const createSSEMessage = (event: StreamEvent): string => {
  return `data: ${JSON.stringify(event)}\n\n`;
};

export const createStreamResponse = (
  stream: ReadableStream
): Response => {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
};
