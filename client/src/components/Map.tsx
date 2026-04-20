import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Type definition for Shipment
interface Shipment {
  id: string | number;
  truck_id?: string;
  name?: string;
  location: [number, number];
  status: string;
  delay: number;
  weight: number;
  maxWeight: number;
  terrain?: string;
  terrain_type?: string;
  route?: [number, number][];
  features?: string[];
  origin?: string;
  destination?: string;
  transport_mode?: 'Road' | 'Rail';
}

// Enhanced Realistic 3D Truck Icon SVG
const truckSvg = (color: string) => `
<svg width="46" height="46" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cabinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:white;stop-opacity:0.3" />
      <stop offset="100%" style="stop-color:black;stop-opacity:0.2" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
      <feOffset dx="1" dy="2" />
      <feComponentTransfer><feFuncA type="linear" slope="0.4"/></feComponentTransfer>
      <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
  </defs>
  <g filter="url(#shadow)">
    <!-- Chassis / Lower structure -->
    <rect x="15" y="60" width="70" height="8" rx="2" fill="#334155" />
    
    <!-- Cargo Box -->
    <path d="M10 30 L65 35 L65 65 L10 60 Z" fill="${color}" stroke="black" stroke-width="0.5" />
    <rect x="15" y="35" width="45" height="25" fill="url(#cabinGrad)" opacity="0.1" /> <!-- Container detailing -->
    
    <!-- Cabin -->
    <path d="M65 35 L90 40 L90 65 L65 65 Z" fill="${color}" />
    <path d="M70 42 L88 45 L88 55 L70 52 Z" fill="#94a3b8" /> <!-- Windshield -->
    <path d="M70 42 L88 45 L88 48 L70 45 Z" fill="white" opacity="0.4" /> <!-- Window reflection -->
    
    <!-- Side Mirror -->
    <rect x="88" y="48" width="4" height="6" rx="1" fill="#1e293b" />
    
    <!-- Wheels -->
    <circle cx="25" cy="68" r="7" fill="#0f172a" />
    <circle cx="35" cy="68" r="7" fill="#0f172a" />
    <circle cx="58" cy="70" r="7" fill="#0f172a" />
    <circle cx="80" cy="70" r="7" fill="#0f172a" />
    <!-- Hubcaps -->
    <circle cx="25" cy="68" r="2" fill="#64748b" />
    <circle cx="35" cy="68" r="2" fill="#64748b" />
    <circle cx="58" cy="70" r="2" fill="#64748b" />
    <circle cx="80" cy="70" r="2" fill="#64748b" />
  </g>
</svg>
`;

// Function to create custom glowing markers (Truck or Train for Gati Shakti)
const createCustomIcon = (status: string, delay: number = 0, rotation: number = 0, mode: string = 'Road') => {
  const color = (status === 'Critical' || delay > 60) ? '#ef4444' : (status === 'At Risk' || delay > 0 ? '#f59e0b' : '#10b981');
  
  const railSvg = `
  <svg width="46" height="46" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g filter="url(#shadow)">
      <rect x="5" y="45" width="90" height="25" rx="2" fill="#334155" stroke="${color}" stroke-width="2" />
      <rect x="10" y="48" width="20" height="15" rx="1" fill="${color}" opacity="0.8" />
      <rect x="40" y="48" width="20" height="15" rx="1" fill="${color}" opacity="0.8" />
      <rect x="70" y="48" width="20" height="15" rx="1" fill="${color}" opacity="0.8" />
      <circle cx="15" cy="72" r="3" fill="#1e293b" />
      <circle cx="35" cy="72" r="3" fill="#1e293b" />
      <circle cx="55" cy="72" r="3" fill="#1e293b" />
      <circle cx="75" cy="72" r="3" fill="#1e293b" />
    </g>
  </svg>`;

  return L.divIcon({
    className: 'custom-icon',
    html: `
      <div class="transition-all duration-100 ease-linear cursor-pointer" style="transform: rotate(${rotation}deg);">
        ${mode === 'Rail' ? railSvg : truckSvg(color)}
      </div>
    `,
    iconSize: [46, 46],
    iconAnchor: [23, 23],
  });
};

// Calculate bearing between two points for rotation
const calculateBearing = (start: [number, number], end: [number, number]) => {
  const startLat = (start[0] * Math.PI) / 180;
  const startLng = (start[1] * Math.PI) / 180;
  const endLat = (end[0] * Math.PI) / 180;
  const endLng = (end[1] * Math.PI) / 180;

  const y = Math.sin(endLng - startLng) * Math.cos(endLat);
  const x = Math.cos(startLat) * Math.sin(endLat) - Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
};

const createDisruptionIcon = (severity: string, type: string) => {
  const color = severity === 'High' || severity === 'Critical' ? '#ef4444' : '#f59e0b';
  const emoji = type === 'Weather' ? '⛈️' : (type === 'Traffic' ? '🚦' : '🚧');
  
  return L.divIcon({
    className: 'disruption-icon',
    html: `
      <div 
        class="flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 border-2 relative z-[2000] text-lg"
        style="border-color: ${color}; box-shadow: 0 0 15px ${color};"
      >
        <span class="animate-pulse">${emoji}</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

// Auto-fly to coordinates when focusedLocation changes
const MapEffect = ({ focusedLocation }: { focusedLocation: [number, number] | null }) => {
  const map = useMap();
  useEffect(() => {
    if (focusedLocation) {
      map.flyTo(focusedLocation, 10, { duration: 1.5 });
    }
  }, [focusedLocation, map]);
  return null;
};

interface TruckMarkerProps {
  shipment: Shipment;
  position: [number, number];
  rotation: number;
}

// Extracted Truck Marker Component to handle precise popup state without Leaflet mounting bugs
const TruckMarker: React.FC<TruckMarkerProps> = ({ shipment, position, rotation }) => {
  const [isPinned, setIsPinned] = useState(false);

  return (
    <Marker 
      position={position}
      icon={createCustomIcon(shipment.status, shipment.delay, rotation, shipment.transport_mode)}
      eventHandlers={{
        mouseover: (e) => e.target.openPopup(),
        mouseout: (e) => { if (!isPinned) e.target.closePopup(); },
        click: (e) => {
          const newPinnedState = !isPinned;
          setIsPinned(newPinnedState);
          if (newPinnedState) e.target.openPopup();
          else e.target.closePopup();
        }
      }}
    >
      <Popup 
        closeButton={isPinned} 
        autoPan={false}
        eventHandlers={{ remove: () => setIsPinned(false) }}
      >
        <div className="p-2 min-w-[200px]">
          <div className="flex justify-between items-start mb-2 border-b border-slate-700 pb-1">
            <h3 className="font-bold text-white text-xs uppercase">Shipment #{shipment.truck_id || shipment.id}</h3>
            {shipment.transport_mode === 'Rail' && (
              <span className="bg-indigo-500/20 text-indigo-400 text-[8px] px-1.5 py-0.5 rounded font-bold border border-indigo-500/30 tracking-widest">RAIL TRANSIT</span>
            )}
          </div>
          
          <div className="space-y-1 text-xs">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-400">Modal:</span>
              <span className={`font-bold ${shipment.transport_mode === 'Rail' ? 'text-indigo-400' : 'text-emerald-400'}`}>
                {shipment.transport_mode === 'Rail' ? 'Gati Shakti Multimodal' : 'National Highway'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Load:</span>
              <span className="font-semibold text-blue-400">{shipment.weight || 15} / {shipment.maxWeight || 20} Tons</span>
            </div>
            {/* Progress Bar for Load */}
            <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div 
                className={`h-1.5 rounded-full ${((shipment.weight || 15) / (shipment.maxWeight || 20)) > 0.85 ? 'bg-red-500' : 'bg-blue-500'}`} 
                style={{ width: `${((shipment.weight || 15) / (shipment.maxWeight || 20)) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-2 items-center">
              <span className="text-slate-400">Terrain:</span>
              <span className={`font-medium ${(shipment.terrain || shipment.terrain_type) === 'Mountainous' ? 'text-amber-500' : 'text-emerald-400'}`}>
                {shipment.terrain || shipment.terrain_type || 'Flat'}
              </span>
            </div>
            
            {/* Features Badges */}
            {shipment.features && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {shipment.features.map((f: string, i: number) => (
                  <span key={i} className="text-[9px] bg-slate-800 border border-slate-600 text-slate-300 px-1.5 py-0.5 rounded mb-1">
                    {f}
                  </span>
                ))}
              </div>
            )}

            {/* Constraint Logic Visual Warning */}
            {(shipment.terrain || shipment.terrain_type) === 'Mountainous' && ((shipment.weight || 0) / (shipment.maxWeight || 1)) > 0.8 && (
              <div className="mt-2 text-[10px] text-red-400 font-bold bg-red-500/10 border border-red-500/20 p-1.5 rounded">
                ⚠️ Warning: High Load for Steep Grade
              </div>
            )}
            
            <div className="mt-3 pt-2 border-t border-slate-700/50 flex justify-between items-center">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                shipment.status === 'On-Track' || shipment.status === 'On Time' ? 'text-emerald-400 bg-emerald-500/10' : 
                shipment.status === 'At Risk' ? 'text-amber-400 bg-amber-500/10' : 'text-red-400 bg-red-500/10'
              }`}>
                {shipment.status}
              </span>
              {(shipment.delay || 0) > 0 && (
                <span className="text-[11px] text-red-400 font-bold">+{shipment.delay} mins</span>
              )}
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
};

interface MapProps {
  focusedLocation: [number, number] | null;
  isScanning: boolean;
}

interface Disruption {
  id: number;
  type: string;
  severity: string;
  location: [number, number];
  description?: string;
}

const Map: React.FC<MapProps> = ({ focusedLocation, isScanning }) => {
  const [shipmentsData, setShipmentsData] = useState<Shipment[]>([]);
  const [disruptions, setDisruptions] = useState<Disruption[]>([]);
  const [loading, setLoading] = useState(true);

  // Track live positions and rotations for animation
  const [animatedPositions, setAnimatedPositions] = useState<Record<string | number, { pos: [number, number], rotation: number, progress: number }>>({});

  // Persistent clock for animation to prevent resets on data updates
  const animStartRef = useRef<number>(Date.now());

  useEffect(() => {
    let isInitialFetch = true;

    const fetchAllData = async () => {
      try {
        const [shipRes, disrupRes] = await Promise.all([
          fetch('http://localhost:8082/api/shipments'),
          fetch('http://localhost:8082/api/disruptions').catch(() => null)
        ]);

        const shipData = await shipRes.json();
        
        if (disrupRes && disrupRes.ok) {
          const disrupData = await disrupRes.json();
          setDisruptions(disrupData);
        }

        if (shipData && shipData.length > 0) {
          setShipmentsData(shipData);
        } else if (isInitialFetch) {
          const staticShipments = await import('../data/shipments.json');
          setShipmentsData(staticShipments.default as unknown as Shipment[]);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        if (isInitialFetch) {
          setLoading(false);
          isInitialFetch = false;
        }
      }
    };

    fetchAllData();
    const intervalId = setInterval(fetchAllData, 3000);
    return () => clearInterval(intervalId);
  }, []);

  // Movement Simulation Engine: Moves trucks along their polylines
  useEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      const now = Date.now();
      const elapsed = (now - animStartRef.current) / 1000; // total seconds since start

      setAnimatedPositions(prev => {
        const next: Record<string | number, { pos: [number, number], rotation: number, progress: number }> = { ...prev };
        
        shipmentsData.forEach(ship => {
          if (!ship.route || ship.route.length < 2) {
            next[ship.id] = { pos: ship.location, rotation: 0, progress: 0 };
            return;
          }

          // Calculate duration based on route length (approx 1 second per waypoint for realistic speed)
          const speedFactor = 1.0; 
          const duration = ship.route.length * speedFactor;
          
          const progress = (elapsed % duration) / duration;
          
          const totalPoints = ship.route.length;
          const floatIndex = progress * (totalPoints - 1);
          const index = Math.floor(floatIndex);
          const nextIndex = Math.min(index + 1, totalPoints - 1);
          const ratio = floatIndex - index;

          const start = ship.route[index];
          const end = ship.route[nextIndex];

          const lat = start[0] + (end[0] - start[0]) * ratio;
          const lng = start[1] + (end[1] - start[1]) * ratio;
          
          const rotation = calculateBearing(start, end);
          
          next[ship.id] = { pos: [lat, lng], rotation, progress };
        });

        return next;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [shipmentsData]);

  const indiaCenter: [number, number] = [20.5937, 78.9629];
  // Restrict map to a single world copy
  const worldBounds: L.LatLngBoundsExpression = [[-90, -180], [90, 180]];

  return (
    <div className="h-full w-full relative">
      <MapContainer 
        center={indiaCenter} 
        zoom={5}
        minZoom={3}
        maxBounds={worldBounds}
        maxBoundsViscosity={1.0}
        className="h-full w-full z-0"
        scrollWheelZoom={true}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          noWrap={true}
        />
        
        <MapEffect focusedLocation={focusedLocation} />
        {loading && <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1001] bg-slate-900 px-4 py-2 rounded-full text-xs text-blue-400 animate-pulse border border-blue-500/20">Syncing with Supabase...</div>}

        {/* Draw Disruptions */}
        {disruptions.map(disruption => (
          <React.Fragment key={`dis-${disruption.id}`}>
            {/* AI Nodal Scanning Notice */}
            {isScanning && (
              <Popup position={disruption.location} closeButton={false} autoPan={false}>
                <div className="text-[10px] text-red-500 font-bold animate-pulse uppercase tracking-widest">
                  AI Nodal Scanning...
                </div>
              </Popup>
            )}
            <Marker 
              position={disruption.location as [number, number]}
              icon={createDisruptionIcon(disruption.severity, disruption.type)}
            >
              <Popup>
                <div className="p-2 min-w-[150px]">
                  <h3 className="font-bold text-red-400 border-b border-slate-700 pb-1 mb-2">{disruption.type} Warning</h3>
                  <p className="text-xs text-slate-300">Severity: <span className="font-bold text-white">{disruption.severity}</span></p>
                  {disruption.description && <p className="text-xs text-slate-400 mt-1">{disruption.description}</p>}
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}

        {shipmentsData.map((shipment) => {
          // Safety check: Don't render if location is missing
          if (!shipment.location) return null;
          
          const pos = animatedPositions[shipment.id]?.pos || shipment.location as [number, number];
          const rot = animatedPositions[shipment.id]?.rotation || 0;

          return (
            <React.Fragment key={shipment.id}>
              {/* Draw Path Route with Glow Effect and Navigation Fade */}
              {shipment.route && (() => {
                const progress = animatedPositions[shipment.id]?.progress || 0;
                const totalPoints = shipment.route.length;
                const splitIndex = Math.floor(progress * (totalPoints - 1));
                
                const pastRoute = shipment.route.slice(0, splitIndex + 1);
                const futureRoute = shipment.route.slice(splitIndex);

                // Strict Color Logic for Gati Shakti Risk Levels
                const futureColor = 
                  (shipment.status === 'Critical' || (shipment.delay || 0) >= 180) ? '#ef4444' : 
                  (shipment.status === 'At Risk' || (shipment.delay || 0) > 0) ? '#f59e0b' : 
                  '#10b981';

                return (
                  <React.Fragment key={`routes-${shipment.id}`}>
                    {/* PAST ROUTE (Faded History) */}
                    {pastRoute.length >= 2 && (
                      <Polyline 
                        positions={pastRoute as [number, number][]} 
                        color="#475569" 
                        weight={3}
                        opacity={0.3}
                      />
                    )}

                    {/* FUTURE ROUTE (Risk Indicator) */}
                    {futureRoute.length >= 2 && (
                      <>
                        {/* High-intensity Glow Underlay */}
                        <Polyline 
                          positions={futureRoute as [number, number][]} 
                          color={futureColor} 
                          weight={10}
                          opacity={0.15}
                        />
                        {/* Core Status Line */}
                        <Polyline 
                          positions={futureRoute as [number, number][]} 
                          color={futureColor} 
                          weight={4}
                          opacity={0.9}
                          dashArray={shipment.transport_mode === 'Rail' ? "10, 10" : "none"} // Dash for Rail
                        />
                      </>
                    )}
                  </React.Fragment>
                );
              })()}
              
              <TruckMarker 
                shipment={shipment} 
                position={pos} 
                rotation={rot}
              />
            </React.Fragment>
          );
        })}
      </MapContainer>
      
      {/* Legend Overlay */}
      <div className="absolute bottom-6 left-4 z-[1000] pointer-events-none">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-xl px-4 py-2.5 flex items-center gap-4 shadow-2xl">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mr-1">Legend</span>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
            <span className="text-[11px] text-slate-300 font-medium">On Track</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b] animate-pulse"></div>
            <span className="text-[11px] text-slate-300 font-medium">At Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse"></div>
            <span className="text-[11px] text-slate-300 font-medium">Critical</span>
          </div>
        </div>
      </div>

      {/* Scanning Overlay */}
      {isScanning && (
        <div className="absolute inset-0 z-[2000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center pointer-events-none transition-all duration-300">
          <div className="bg-slate-900 border border-indigo-500/30 p-6 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
            <div className="w-12 h-12 rounded-full border-4 border-slate-700 border-t-indigo-500 animate-spin mb-4"></div>
            <h3 className="text-white font-bold text-lg mb-1">AI Calculation in Progress</h3>
            <p className="text-slate-400 text-sm text-center mb-4">Analyzing traffic logic, payload constraints, and weather patterns...</p>
            
            <div className="w-full bg-slate-800 rounded-full h-1.5 mb-1 overflow-hidden">
              <div className="bg-indigo-500 h-1.5 rounded-full animate-[progress_2s_ease-in-out_forwards]"></div>
            </div>
            <div className="w-full flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Map;
