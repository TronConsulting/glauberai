"use client";
import { useEffect } from 'react';

export default function ScrollRestoration() {
  useEffect(() => {
    const key = `scroll-pos:${window.location.pathname}`;
    // Restore scroll position on mount
    const saved = sessionStorage.getItem(key);
    if (saved) {
      window.scrollTo(0, parseInt(saved, 10));
    }
    // Save scroll position on unload
    const save = () => sessionStorage.setItem(key, String(window.scrollY));
    window.addEventListener('beforeunload', save);
    window.addEventListener('pagehide', save);
    return () => {
      window.removeEventListener('beforeunload', save);
      window.removeEventListener('pagehide', save);
    };
  }, []);
  return null;
} 