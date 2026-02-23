import React from 'react';

export const metadata = {
  title: 'Chat - GlauberAI',
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  // Bypass dashboard layout - chat has its own full-screen layout
  return <>{children}</>;
}
