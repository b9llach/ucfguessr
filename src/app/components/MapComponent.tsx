"use client";

import { useEffect, useState } from 'react';
import mapService from '../services/mapService';

interface MapComponentProps {
  center: [number, number];
  zoom: number;
  bounds: L.LatLngBoundsLiteral;
  selectedPosition: [number, number] | null;
  actualPosition?: [number, number];
  expanded: boolean;
  fullscreen: boolean;
  onMapClick: (position: [number, number]) => void;
}

export default function MapComponent({
  center,
  zoom,
  bounds,
  selectedPosition,
  actualPosition,
  expanded,
  fullscreen,
  onMapClick
}: MapComponentProps) {
  // Generate a unique ID for the map container
  const [mapId] = useState(() => `map-${Math.random().toString(36).substring(2, 9)}`);
  const [prevExpanded, setPrevExpanded] = useState(expanded);
  const [prevFullscreen, setPrevFullscreen] = useState(fullscreen);
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Initialize map on mount with higher max zoom
  useEffect(() => {
    // Set up click handler
    mapService.setClickHandler(onMapClick);
    
    // Initialize map
    mapService.initMap(mapId, center, zoom, bounds);
    
    // Track initial load
    setInitialLoad(false);
    
    // Clean up on unmount
    return () => {
      mapService.destroyMap();
    };
  }, [mapId]); // Only run on mount/unmount
  
  // Update center ONLY on initial load
  useEffect(() => {
    if (initialLoad) {
      mapService.updateView(center, zoom);
    }
  }, [initialLoad, center, zoom]);
  
  // Only update view when explicitly changing modes
  useEffect(() => {
    // Check if expanded or fullscreen state has changed
    if (expanded !== prevExpanded || fullscreen !== prevFullscreen) {
      // Force view update in this case
      mapService.resetView(center, zoom);
      setPrevExpanded(expanded);
      setPrevFullscreen(fullscreen);
    }
  }, [expanded, fullscreen, center, zoom, prevExpanded, prevFullscreen]);
  
  // Update markers when positions change
  useEffect(() => {
    mapService.setSelectedPosition(selectedPosition);
  }, [selectedPosition]);
  
  useEffect(() => {
    mapService.setActualPosition(actualPosition || null);
  }, [actualPosition]);
  
  // Handle expanded/fullscreen changes
  useEffect(() => {
    // Short delay to let the DOM update
    const timer = setTimeout(() => {
      mapService.handleResize();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [expanded, fullscreen]);
  
  return (
    <div className="relative h-full w-full">
      <div id={mapId} className="h-full w-full" />
      
      {selectedPosition && (
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm z-[1000]">
          {selectedPosition[0].toFixed(6)}, {selectedPosition[1].toFixed(6)}
        </div>
      )}
    </div>
  );
}