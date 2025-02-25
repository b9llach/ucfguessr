"use client";

import { useEffect, useRef } from 'react';
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
  const scriptLoaded = useRef(false);

  useEffect(() => {
    // Wait for both the div to exist and the script to be loaded
    if (!viewerRef.current || !window.pannellum || scriptLoaded.current === false) return;
    
    // Initialize the viewer
    viewerInstance.current = window.pannellum.viewer(viewerRef.current.id, {
      type: "equirectangular",
      panorama: imageSrc,
      autoLoad: true,
      showZoomCtrl: false,
      showFullscreenCtrl: false,
      hfov: 100,
      pitch: 0,
      yaw: 0
    });
    
    // Clean up when component unmounts or image changes
    return () => {
      if (viewerInstance.current) {
        viewerInstance.current.destroy();
      }
    };
  }, [imageSrc, scriptLoaded.current]);

  return (
    <>
      <Script 
        src="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js"
        strategy="afterInteractive"
        onLoad={() => { scriptLoaded.current = true; }}
      />
      <div 
        id="panorama-viewer"
        ref={viewerRef} 
        className="h-full w-full"
      />
    </>
  );
}