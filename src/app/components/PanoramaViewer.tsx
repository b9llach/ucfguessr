"use client";

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Pannellum on client-side only
const Pannellum = dynamic(() => import('pannellum-react').then(mod => mod.Pannellum), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-900">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
    </div>
  )
});

interface PanoramaViewerProps {
  imageSrc: string;
}

export default function PanoramaViewer({ imageSrc }: PanoramaViewerProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  // Handle image loading
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    
    const img = new Image();
    img.onload = () => setIsLoaded(true);
    img.onerror = () => {
      console.error(`Failed to load panorama: ${imageSrc}`);
      setHasError(true);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  if (hasError) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-900">
        <div className="text-white text-center">
          <p className="text-xl mb-2">Failed to load panorama</p>
          <p className="text-sm opacity-70">Check console for details</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-white"></div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <Pannellum
        width="100%"
        height="100%"
        image={imageSrc}
        pitch={0}
        yaw={0}
        hfov={100}
        autoLoad
        showZoomCtrl={false}
        showFullscreenCtrl={false}
        mouseZoom={true}
      />
    </div>
  );
}