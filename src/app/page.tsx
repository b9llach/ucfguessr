"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Image from "next/image";
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';


// Dynamically import all client-side components
const MapComponent = dynamic(() => import('./components/MapComponent'), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-800 flex items-center justify-center">Loading map...</div>
});

const PanoramaViewer = dynamic(() => import('./components/PanoramaViewer'), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-800 flex items-center justify-center">Loading panorama...</div>
});

interface Location {
  id: number;
  image: string;
  name: string;
  coordinates: [number, number];
}

interface RoundResult {
  round: number;
  location: string;
  actualPosition: [number, number];
  guessPosition: [number, number];
  score: number;
  distance: number;
}

// First, let's define a new interface for our panorama data
interface PanoramaLocation {
  id: string;
  name: string;
  image: string;
  coordinates: [number, number];
}

// Define the boundaries for UCF campus
const UCF_BOUNDS: L.LatLngBoundsLiteral = [
  [28.594, -81.210], // Southwest corner
  [28.610, -81.190]  // Northeast corner
];

// We'll add this function to load and parse the CSV
async function loadPanoramaData(): Promise<PanoramaLocation[]> {
  try {
    // Fetch the CSV file
    const response = await fetch('/ucf_panos/panorama_log.csv');
    const csvText = await response.text();
    
    // Parse CSV data
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    const headers = lines[0].split(',');
    
    // Skip header row and parse data rows
    return lines.slice(1).map((line, index) => {
      const values = line.split(',');
      const panoId = values[0];
      const lat = parseFloat(values[1]);
      const lng = parseFloat(values[2]);
      
      return {
        id: panoId,
        name: `UCF Location ${index + 1}`,  // We can replace with actual names if available
        image: `/ucf_panos/${panoId}.jpg`,
        coordinates: [lat, lng] as [number, number]
      };
    });
  } catch (error) {
    console.error('Failed to load panorama data:', error);
    return [];
  }
}

// Simple seeded random number generator function
function mulberry32(seed: number) {
  return function() {
    seed = seed + 0x6D2B79F5;
    let t = seed;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Function to get a shuffled array using seeded randomness
function getShuffledLocations(locations: PanoramaLocation[], seed: number): PanoramaLocation[] {
  const random = mulberry32(seed);
  // Create a copy of the array to shuffle
  const shuffled = [...locations];
  
  // Fisher-Yates shuffle algorithm with seeded randomness
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

export default function Home() {
  // Game state
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [loading, setLoading] = useState(true);
  const [gamePhase, setGamePhase] = useState("exploring"); // exploring, guessing, results
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(null);
  const [seed, setSeed] = useState<number | null>(null);
  const [gameLocations, setGameLocations] = useState<PanoramaLocation[]>([]);
  const [locations, setLocations] = useState<PanoramaLocation[]>([]);
  const [currentLocation, setCurrentLocation] = useState<PanoramaLocation | null>(null);
  const [roundScore, setRoundScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes per round
  const [showResults, setShowResults] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [mapExpanded, setMapExpanded] = useState(true);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize or load seed from URL
  useEffect(() => {
    // Check URL for a seed parameter
    const params = new URLSearchParams(window.location.search);
    const urlSeed = params.get('seed');
    
    let gameSeed: number;
    
    if (urlSeed && !isNaN(Number(urlSeed))) {
      // Use seed from URL
      gameSeed = Number(urlSeed);
    } else {
      // Generate a new random seed
      gameSeed = Math.floor(Math.random() * 1000000);
      
      // Update URL with the new seed (without refreshing page)
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('seed', gameSeed.toString());
      window.history.pushState({ path: newUrl.toString() }, '', newUrl.toString());
    }
    
    setSeed(gameSeed);
  }, []);

  // Load panorama data on component mount
  useEffect(() => {
    async function fetchPanoramaData() {
      setLoading(true);
      const panoLocations = await loadPanoramaData();
      setLocations(panoLocations);
      setLoading(false);
    }
    
    fetchPanoramaData();
  }, []);

  // Create the game locations array when seed and locations are available
  useEffect(() => {
    if (seed !== null && locations.length > 0) {
      // Get 5 deterministic locations for this game based on the seed
      const shuffled = getShuffledLocations(locations, seed);
      setGameLocations(shuffled.slice(0, 5)); // Take first 5 for the game
    }
  }, [seed, locations]);

  // Update the round initialization
  useEffect(() => {
    if (gameLocations.length === 0) return;
    
    if (round <= 5) {
      // Reset for new round
      setGamePhase("exploring");
      setSelectedPosition(null);
      setRoundScore(0);
      setShowResults(false);
      setTimeLeft(300);
      
      // Get deterministic location for this round
      setCurrentLocation(gameLocations[round - 1]);
      
      // Start timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            makeGuess();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setGameOver(true);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [round, gameLocations.length]);

  // Calculate score based on distance (GeoGuessr algorithm)
  const calculateScore = useCallback((actualPos: [number, number], guessedPos: [number, number]) => {
    // Haversine formula to calculate distance in miles
    const toRadians = (deg: number) => deg * (Math.PI / 180);
    const R = 3958.8; // Earth's radius in miles
    const lat1 = actualPos[0];
    const lon1 = actualPos[1];
    const lat2 = guessedPos[0];
    const lon2 = guessedPos[1];
    
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in miles
    
    // Adjusted scoring formula for campus-sized area - less harsh drop-off
    const score = Math.floor(5000 * Math.exp(-distance / 0.9));
    
    // Store the distance in meters for display purposes
    const distanceInMeters = distance * 1609.34;
    
    return { score: Math.max(0, score), distance: distanceInMeters };
  }, []);

  const makeGuess = useCallback(() => {
    if (!selectedPosition && gamePhase === "guessing") {
      alert("Please select a location on the map first!");
      return;
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    if (!currentLocation) return;
    
    const actualPosition = currentLocation.coordinates;
    const guessPosition = selectedPosition || [28.6024, -81.2001] as [number, number];
    
    const { score: points, distance: distanceInMeters } = calculateScore(actualPosition, guessPosition);
    setRoundScore(points);
    setScore(prevScore => prevScore + points);
    
    // Calculate distance in meters (simplified)
    const latDiff = Math.abs(actualPosition[0] - guessPosition[0]);
    const lngDiff = Math.abs(actualPosition[1] - guessPosition[1]);
    const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111000; // rough meters
    
    // Store round results
    setRoundResults(prev => [...prev, {
      round,
      location: currentLocation.name,
      actualPosition,
      guessPosition,
      score: points,
      distance
    }]);
    
    setShowResults(true);
  }, [selectedPosition, gamePhase, currentLocation, round, calculateScore]);

  const nextRound = useCallback(() => {
    if (round < 5) {
      setRound(prev => prev + 1);
    } else {
      setGameOver(true);
    }
  }, [round]);

  const restartGame = useCallback(() => {
    // Reset all game state
    setRound(1);
    setScore(0);
    setGamePhase("exploring");
    setSelectedPosition(null);
    setRoundScore(0);
    setTimeLeft(300);
    setShowResults(false);
    setGameOver(false);
    // Initialize empty round results array
    setRoundResults([]); // Important! This prevents the "Cannot read properties of undefined" error
    
    // Pick a new random location if locations are available
    if (locations.length > 0) {
      const randomIndex = Math.floor(Math.random() * locations.length);
      setCurrentLocation(locations[randomIndex]);
    }
    
    // Restart timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          makeGuess();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [locations, makeGuess]);

  const handleMapClick = useCallback((position: [number, number]) => {
    if (!showResults) {
      setSelectedPosition(position);
    }
  }, [showResults]);

  // Format time as MM:SS
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, []);

  // Format distance in meters or kilometers
  const formatDistance = (distance: number | undefined) => {
    if (distance === undefined) return "Unknown";
    
    if (distance < 1000) {
      return `${Math.round(distance)} meters`;
    } else {
      return `${(distance / 1000).toFixed(2)} kilometers`;
    }
  };

  // Add this useEffect
  useEffect(() => {
    // Force destroy and recreate map when switching between expanded/fullscreen modes
    if (mapFullscreen || mapExpanded) {
      // Short delay to ensure DOM is updated
      const timer = setTimeout(() => {
        setMapKey(Date.now());
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [mapFullscreen, mapExpanded]);

  // Add this useEffect for the spacebar shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Remove the gamePhase check since we're not updating it
      if (e.code === 'Space' && selectedPosition && !showResults) {
        e.preventDefault(); // Prevent scrolling
        makeGuess();
      }
    };
    
    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Clean up on unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedPosition, showResults, makeGuess]);

  // Add a share button to game over screen
  const shareGame = () => {
    if (seed !== null) {
      const shareUrl = `${window.location.origin}${window.location.pathname}?seed=${seed}`;
      
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl)
          .then(() => alert('Game link copied! Share it with friends to play the same locations.'))
          .catch(() => alert(`Share this link to play the same locations: ${shareUrl}`));
      } else {
        alert(`Share this link to play the same locations: ${shareUrl}`);
      }
    }
  };

  if (gameOver) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#0e0e1a] to-[#1a1a2e] text-white">
        <div className="flex-grow flex flex-col items-center justify-center p-6">
          <h1 className="text-5xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#FFA500]">Game Over!</h1>
          <div className="bg-black/30 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-full max-w-2xl border border-white/10">
            <h2 className="text-3xl font-bold mb-6 text-center">Final Score: <span className="text-[#FFD700]">{score}/25000</span></h2>
            
            <div className="mb-8">
              <h3 className="text-xl mb-4 border-b border-white/10 pb-2">Round Results:</h3>
              <div className="space-y-3">
                {roundResults.map((result, index) => (
                  <div key={index} className="flex justify-between bg-white/5 p-4 rounded-lg hover:bg-white/10 transition-all">
                    <span className="font-medium">Round {result.round}: {result.location}</span>
                    <span className="font-bold text-[#FFD700]">{result.score} pts</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <button 
                onClick={restartGame}
                className="flex-1 bg-gradient-to-r from-[#FFD700] to-[#FFA500] hover:from-[#FFA500] hover:to-[#FFD700] text-black py-4 px-6 rounded-lg font-bold text-lg shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                Play Again
              </button>
              
              <button 
                onClick={shareGame}
                className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white py-4 px-6 rounded-lg font-bold text-lg shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                Share This Game
              </button>
            </div>
            
            {seed && (
              <div className="mt-4 text-center text-sm text-gray-400">
                Game Seed: {seed}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-[#0e0e1a] to-[#1a1a2e] text-white overflow-hidden">
      {/* Game Header */}
      <header className="bg-black/30 backdrop-blur-md p-4 shadow-lg z-10 border-b border-white/10">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#FFA500]">UCFGuessr</h1>
          <div className="flex items-center space-x-4">
            <div className="px-4 py-2 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center">
              <span className="mr-2 text-sm text-gray-400">Score:</span> 
              <span className="font-bold text-[#FFD700]">{score}</span>
            </div>
            <div className="px-4 py-2 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center">
              <span className="mr-2 text-sm text-gray-400">Round:</span> 
              <span className="font-bold">{round}/5</span>
            </div>
            <div className="px-4 py-2 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center">
              <span className="mr-2 text-sm text-gray-400">Time:</span> 
              <span className={`font-bold ${timeLeft < 30 ? 'text-red-500' : timeLeft < 60 ? 'text-yellow-400' : 'text-white'}`}>{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-grow relative">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#FFD700]"></div>
          </div>
        ) : (
          <>
            {/* Panorama View */}
            <div className="h-full w-full">
              {currentLocation && (
                <PanoramaViewer imageSrc={currentLocation.image} />
              )}
            </div>
            
            {/* Map Container */}
            <div className="absolute right-6 bottom-6 flex flex-col z-10 transition-all duration-300">
              <div 
                className={`rounded-xl overflow-hidden shadow-2xl border border-white/10 transition-all duration-300 transform ${
                  mapExpanded ? 'w-[520px] h-[420px]' : 'w-[300px] h-[220px] hover:scale-105'
                }`}
              >
                <MapComponent 
                  center={[28.6024, -81.2001]}
                  zoom={mapExpanded ? 15 : 14}
                  bounds={UCF_BOUNDS as L.LatLngBoundsLiteral}
                  selectedPosition={selectedPosition}
                  actualPosition={showResults ? currentLocation?.coordinates : undefined}
                  expanded={mapExpanded}
                  fullscreen={false}
                  onMapClick={handleMapClick}
                />
                
                {/* Map Controls */}
                <div className="absolute top-3 right-3 flex flex-col space-y-2 z-[1000]">
                  <button 
                    onClick={() => setMapExpanded(!mapExpanded)}
                    className="bg-black/70 hover:bg-black border border-white/20 text-white p-2.5 rounded-full shadow-lg transition-all duration-200 transform hover:scale-110"
                    title={mapExpanded ? "Shrink map" : "Expand map"}
                  >
                    {mapExpanded ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Confirm Guess Button - Always visible but conditionally disabled */}
              {!showResults && (
                <button
                  onClick={makeGuess}
                  disabled={!selectedPosition}
                  className={`mt-3 py-3 px-5 rounded-lg font-bold shadow-lg transition-all duration-300 ${
                    mapExpanded ? 'text-lg' : 'text-base'
                  } ${
                    selectedPosition 
                      ? 'bg-gradient-to-r from-[#FFD700] to-[#FFA500] hover:from-[#FFA500] hover:to-[#FFD700] text-black transform hover:scale-105' 
                      : 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Confirm Guess <span className={selectedPosition ? "text-black/70" : "text-gray-500"}>(Space)</span>
                </button>
              )}
            </div>

            {/* Results Overlay */}
            {showResults && (
              <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-6 z-20 animate-fadeIn">
                <div className="w-full max-w-md bg-black/30 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl p-8 border border-white/10 animate-scaleIn">
                  <h2 className="text-2xl font-bold mb-5 text-center">Round {round} Results</h2>
                  
                  <div className="mb-8 text-center">
                    <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#FFA500] mb-2">{roundScore}</div>
                    <div className="text-gray-400">points</div>
                  </div>
                  
                  <div className="mb-8 space-y-4">
                    <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-gray-300">Distance:</span>
                      <span className="font-bold">
                        {selectedPosition && currentLocation
                          ? formatDistance(roundResults[roundResults.length-1].distance)
                          : "No guess made"}
                      </span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={nextRound}
                    className="w-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] hover:from-[#FFA500] hover:to-[#FFD700] text-black py-4 px-5 rounded-lg font-bold text-lg shadow-lg transition-all duration-300 transform hover:scale-105"
                  >
                    {round < 5 ? "Next Round" : "See Final Results"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}