'use client';

import { useEffect, useState } from 'react';

export function CrispBackground() {
  const [imageUrl, setImageUrl] = useState('/neu-2k.jpg');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateImageForScreen = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const pixelRatio = window.devicePixelRatio || 1;
      
      // Check if mobile
      setIsMobile(width <= 768);
      
      // Calculate effective resolution
      const effectiveWidth = width * pixelRatio;
      const effectiveHeight = height * pixelRatio;
      
      // Choose appropriate image based on screen size and pixel density
      if (effectiveWidth > 2560 || effectiveHeight > 1440) {
        setImageUrl('/neu-4k.jpg'); // 4K for high-res displays
      } else {
        setImageUrl('/neu-2k.jpg'); // 2K for standard displays
      }
    };

    updateImageForScreen();
    window.addEventListener('resize', updateImageForScreen);
    
    return () => window.removeEventListener('resize', updateImageForScreen);
  }, []);

  return (
    <div 
      className="fixed inset-0 w-full h-full z-[-10] crisp-background"
      style={{
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: isMobile ? 'scroll' : 'fixed',
      }}
    />
  );
}