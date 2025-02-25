"use client";

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

// Add TypeScript declaration for pannellum on window object
declare global {
  interface Window {
    pannellum: {
      viewer: (id: string, config: any) => any;
    };
  }
}

// Add the CSS import to your global CSS or add it to layout.tsx
// Add this line to your globals.css:
// @import 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css';

interface PanoramaViewerProps {
  imageSrc: string;
}

export default function PanoramaViewer({ imageSrc }: PanoramaViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const viewerInstance = useRef<any>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Initialize panorama when script is loaded and imageSrc is available
  useEffect(() => {
    if (!viewerRef.current || !scriptLoaded || !imageSrc) return;
    
    // Destroy previous instance if it exists
    if (viewerInstance.current) {
      viewerInstance.current.destroy();
    }
    
    // Create new viewer
    if (window.pannellum) {
      try {
        viewerInstance.current = window.pannellum.viewer('panorama-container', {
          type: "equirectangular",
          panorama: imageSrc,
          autoLoad: true,
          showZoomCtrl: false,
          showFullscreenCtrl: false,
          hfov: 100,
          pitch: 0,
          yaw: 0
        });
      } catch (err) {
        console.error("Error initializing panorama viewer:", err);
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (viewerInstance.current) {
        try {
          viewerInstance.current.destroy();
        } catch (err) {
          console.error("Error destroying panorama viewer:", err);
        }
      }
    };
  }, [imageSrc, scriptLoaded]);

  return (
    <div className="h-full w-full relative">
      <Script 
        src="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />
      <link 
        rel="stylesheet" 
        href="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css"
      />
      <div 
        id="panorama-container"
        ref={viewerRef} 
        className="h-full w-full"
      />
    </div>
  );
}