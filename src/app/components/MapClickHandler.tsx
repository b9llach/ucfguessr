import { useMapEvents } from 'react-leaflet';

interface MapClickHandlerProps {
  onMapClick: (e: any) => void;
}

export default function MapClickHandler({ onMapClick }: MapClickHandlerProps) {
  useMapEvents({
    click: onMapClick
  });
  
  return null;
}