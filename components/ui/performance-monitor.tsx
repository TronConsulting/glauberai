'use client';

import { useEffect } from 'react';

export function PerformanceMonitor() {
  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== 'development') return;
    
    // Monitor Core Web Vitals
    if (typeof window !== 'undefined' && 'performance' in window) {
      // Simple performance logging
      const logPerformance = () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          console.log('Page Load Time:', navigation.loadEventEnd - navigation.fetchStart, 'ms');
          console.log('DOM Content Loaded:', navigation.domContentLoadedEventEnd - navigation.fetchStart, 'ms');
        }
      };

      // Log after page load
      if (document.readyState === 'complete') {
        logPerformance();
      } else {
        window.addEventListener('load', logPerformance);
      }

      // Cleanup
      return () => {
        window.removeEventListener('load', logPerformance);
      };
    }
  }, []);

  return null;
}