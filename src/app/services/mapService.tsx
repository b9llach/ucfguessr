// Global map service that lives outside React's lifecycle
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Track initialized map containers
const initializedContainers = new Set<string>();

class MapService {
  private map: L.Map | null = null;
  private selectedMarker: L.Marker | null = null;
  private actualMarker: L.Marker | null = null;
  private clickHandler: ((position: [number, number]) => void) | null = null;
  private currentContainerId: string | null = null;
  private isUserInteracting: boolean = false;
  
  // Initialize map
  public initMap(
    containerId: string, 
    center: [number, number],
    zoom: number,
    bounds: L.LatLngBoundsLiteral
  ) {
    // First, destroy any existing map
    this.destroyMap();
    
    // Check if container is already tracked
    if (initializedContainers.has(containerId)) {
      console.warn(`Container ${containerId} already has a map initialized`);
      return;
    }
    
    // Track this container
    initializedContainers.add(containerId);
    this.currentContainerId = containerId;
    
    // Wait for the DOM to be ready
    setTimeout(() => {
      const container = document.getElementById(containerId);
      if (!container) {
        initializedContainers.delete(containerId);
        return;
      }
      
      // Safe check for existing Leaflet instance
      if ((L.DomUtil.get(container) as any).leaflet_id) {
        console.warn(`Container ${containerId} already has a Leaflet instance`);
        initializedContainers.delete(containerId);
        return;
      }
      
      try {
        this.map = L.map(containerId, {
          center: center,
          zoom: zoom,
          maxBounds: bounds,
          zoomControl: false,
        });
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.map);
        
        // Add zoom control
        L.control.zoom({ position: 'bottomleft' }).addTo(this.map);
        
        // Track user interaction to prevent automatic centering
        this.map.on('dragstart', () => {
          this.isUserInteracting = true;
        });
        
        this.map.on('zoomstart', () => {
          this.isUserInteracting = true;
        });
        
        // Add click handler
        this.map.on('click', this.handleMapClick.bind(this));
        
        // Force a resize
        this.map.invalidateSize();
      } catch (err) {
        console.error('Map initialization error:', err);
        initializedContainers.delete(containerId);
      }
    }, 100);
  }
  
  // Set click handler
  public setClickHandler(handler: (position: [number, number]) => void) {
    this.clickHandler = handler;
  }
  
  // Handle map click
  private handleMapClick(e: L.LeafletMouseEvent) {
    if (this.clickHandler) {
      this.clickHandler([e.latlng.lat, e.latlng.lng]);
    }
  }
  
  // Set selected position
  public setSelectedPosition(position: [number, number] | null) {
    if (!this.map) return;
    
    // Remove existing marker
    if (this.selectedMarker) {
      this.selectedMarker.remove();
      this.selectedMarker = null;
    }
    
    // Add new marker
    if (position) {
      // Use the default Leaflet marker icon as fallback
      const icon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      
      this.selectedMarker = L.marker(position, { icon }).addTo(this.map);
    }
  }
  
  // Set actual position
  public setActualPosition(position: [number, number] | null) {
    if (!this.map) return;
    
    // Remove existing marker
    if (this.actualMarker) {
      this.actualMarker.remove();
      this.actualMarker = null;
    }
    
    // Add new marker
    if (position) {
      const icon = L.icon({
        iconUrl: '/images/correct.svg',
        iconSize: [25, 41],
        iconAnchor: [12, 41]
      });
      
      this.actualMarker = L.marker(position, { icon }).addTo(this.map);
    }
  }
  
  // Update view - ONLY used for initial setup or mode changes
  public updateView(center: [number, number], zoom: number) {
    if (!this.map) return;
    
    // Only update if user hasn't interacted with the map
    if (!this.isUserInteracting) {
      this.map.setView(center, zoom, { animate: false });
    }
  }
  
  // Force reset view - used when switching between expanded/fullscreen
  public resetView(center: [number, number], zoom: number) {
    if (!this.map) return;
    this.map.setView(center, zoom, { animate: false });
    // Allow automatic centering again after reset
    this.isUserInteracting = false;
  }
  
  // Handle container resize
  public handleResize() {
    if (!this.map) return;
    this.map.invalidateSize();
  }
  
  // Destroy map
  public destroyMap() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    
    // Remove from tracking
    if (this.currentContainerId) {
      initializedContainers.delete(this.currentContainerId);
      this.currentContainerId = null;
    }
    
    this.selectedMarker = null;
    this.actualMarker = null;
    this.isUserInteracting = false;
  }
}

// Create singleton instance
const mapService = new MapService();
export default mapService;