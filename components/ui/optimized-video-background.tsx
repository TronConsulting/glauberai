'use client';

import { useEffect, useRef, useState } from 'react';

interface OptimizedVideoBackgroundProps {
  src: string;
  poster?: string;
  className?: string;
}

export function OptimizedVideoBackground({ 
  src, 
  poster = '/neural.png', 
  className = '' 
}: OptimizedVideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [shouldPlay, setShouldPlay] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Intersection Observer for performance
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldPlay(true);
          } else {
            setShouldPlay(false);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(video);

    // Preload optimization
    const handleCanPlay = () => {
      setIsLoaded(true);
      if (shouldPlay) {
        video.play().catch(() => {
          // Autoplay failed, which is fine
        });
      }
    };

    video.addEventListener('canplay', handleCanPlay);

    return () => {
      observer.disconnect();
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [shouldPlay]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isLoaded) return;

    if (shouldPlay) {
      video.play().catch(() => {
        // Autoplay failed
      });
    } else {
      video.pause();
    }
  }, [shouldPlay, isLoaded]);

  // Reduce quality on mobile for performance
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <>
      <video
        ref={videoRef}
        className={`fixed inset-0 w-full h-full object-cover z-[-10] ${className}`}
        poster={poster}
        muted
        loop
        playsInline
        preload="metadata"
        style={{
          willChange: 'auto',
          transform: 'translateZ(0)', // Hardware acceleration
        }}
      >
        <source src={src} type="video/mp4" />
      </video>
      
      {/* Fallback static background for very slow connections */}
      {!isLoaded && (
        <div 
          className="fixed inset-0 w-full h-full z-[-11] bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${poster})`,
            filter: 'blur(20px) brightness(0.3)',
          }}
        />
      )}
    </>
  );
}