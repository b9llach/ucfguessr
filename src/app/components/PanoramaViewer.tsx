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
  const [isMobile, setIsMobile] = useState(false);

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Initialize panorama when script is loaded and imageSrc is available
  useEffect(() => {
    if (!viewerRef.current || !scriptLoaded || !imageSrc) {
      console.log("Cannot initialize panorama viewer:", 
        !viewerRef.current ? "No container ref" : 
        !scriptLoaded ? "Script not loaded" : 
        "No image source");
      return;
    }
    
    console.log("Initializing panorama with image:", imageSrc);
    
    // Destroy previous instance if it exists
    if (viewerInstance.current) {
      try {
        viewerInstance.current.destroy();
        viewerInstance.current = null;
      } catch (err) {
        console.error("Error destroying panorama viewer:", err);
      }
    }
    
    // Short timeout to ensure previous viewer is fully destroyed
    setTimeout(() => {
      // Create new viewer
      if (window.pannellum) {
        try {
          viewerInstance.current = window.pannellum.viewer('panorama-container', {
            type: "equirectangular",
            panorama: imageSrc,
            autoLoad: true,
            showZoomCtrl: false,
            showFullscreenCtrl: false,
            hfov: isMobile ? 120 : 100, // Wider field of view on mobile
            pitch: 0,
            yaw: 0,
            compass: false,
            disableKeyboardCtrl: isMobile, // Disable keyboard on mobile
            touchPanSpeedCoeffFactor: 0.5, // Slower panning on touch devices
          });
        } catch (err) {
          console.error("Error initializing panorama viewer:", err);
        }
      }
    }, 100);
    
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
  }, [imageSrc, scriptLoaded, isMobile]);

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