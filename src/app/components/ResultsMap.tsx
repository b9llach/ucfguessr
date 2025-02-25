"use client";

import { useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface ResultsMapProps {
  guessPosition: [number, number];
  actualPosition: [number, number];
  distance: number;
}

export default function ResultsMap({ guessPosition, actualPosition, distance }: ResultsMapProps) {
  const [mapReady, setMapReady] = useState(false);
  const mapId = 'results-map';
  
  useEffect(() => {
    // Initialize map after component mounts
    let map: L.Map | null = null;
    
    if (typeof window !== 'undefined' && !map) {
      // Use bounds to fit both points
      const bounds = L.latLngBounds(
        [guessPosition[0], guessPosition[1]],
        [actualPosition[0], actualPosition[1]]
      );
      
      // Add padding to ensure both markers are visible
      bounds.pad(0.5);
      
      // Create the map
      map = L.map(mapId, {
        center: bounds.getCenter(),
        zoom: 15,
        zoomControl: true
      }).fitBounds(bounds);
      
      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);
      
      // Create custom icons
      const guessIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #FF5F6D; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white;"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      
      const actualIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #4CAF50; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white;"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      
      // Add guess marker
      const guessMarker = L.marker([guessPosition[0], guessPosition[1]], {
        icon: guessIcon
      }).addTo(map);
      
      guessMarker.bindTooltip('You', {
        permanent: true,
        direction: 'top',
        offset: [0, -10],
        className: 'custom-tooltip'
      });
      
      // Add actual marker
      const actualMarker = L.marker([actualPosition[0], actualPosition[1]], {
        icon: actualIcon
      }).addTo(map);
      
      actualMarker.bindTooltip('Correct', {
        permanent: true,
        direction: 'top',
        offset: [0, -10],
        className: 'custom-tooltip'
      });
      
      // Draw line between the points
      const line = L.polyline([
        [guessPosition[0], guessPosition[1]],
        [actualPosition[0], actualPosition[1]]
      ], {
        color: '#FFC107',
        weight: 3,
        opacity: 0.8,
        dashArray: '5, 10'
      }).addTo(map);
      
      // Add distance label in middle of line
      const midPoint = L.latLng(
        (guessPosition[0] + actualPosition[0]) / 2,
        (guessPosition[1] + actualPosition[1]) / 2
      );
      
      
      setMapReady(true);
    }
    
    // Clean up on unmount
    return () => {
      if (map) {
        map.remove();
      }
    };
  }, [guessPosition, actualPosition, distance, mapId]);
  
  // Format distance helper
  const formatDistance = (distance: number): string => {
    if (distance < 1000) {
      return `${Math.round(distance)} meters`;
    } else {
      return `${(distance / 1000).toFixed(2)} kilometers`;
    }
  };
  
  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden">
      <div id={mapId} className="w-full h-full" />
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
        </div>
      )}
    </div>
  );
}