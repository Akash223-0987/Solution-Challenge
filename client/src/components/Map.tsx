import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Shipment, Disruption, ActiveFilter } from '../types';
import { RAIL_NETWORK } from '../data/railNetwork';
import { RAIL_HUBS } from '../data/railHubs';

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
  const color = (status === 'Critical' || delay >= 150) ? '#ef4444' : (status === 'At Risk' || delay > 0 ? '#f59e0b' : '#10b981');
  
  // Freight Train SVG - Improved for heavy industrial look
  const railSvg = `
  <svg width="52" height="52" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g filter="url(#shadow)">
      <!-- Locomotive -->
      <rect x="5" y="40" width="30" height="20" rx="2" fill="#1e293b" stroke="${color}" stroke-width="2" />
      <rect x="8" y="42" width="8" height="6" fill="#334155" /> <!-- Window -->
      
      <!-- Wagon 1 -->
      <rect x="38" y="42" width="25" height="16" rx="1" fill="${color}" opacity="0.9" />
      <line x1="38" y1="50" x2="63" y2="50" stroke="rgba(0,0,0,0.2)" stroke-width="1" />
      
      <!-- Wagon 2 -->
      <rect x="66" y="42" width="25" height="16" rx="1" fill="${color}" opacity="0.9" />
      <line x1="66" y1="50" x2="91" y2="50" stroke="rgba(0,0,0,0.2)" stroke-width="1" />
      
      <!-- Wheels -->
      <circle cx="12" cy="62" r="3" fill="#0f172a" />
      <circle cx="28" cy="62" r="3" fill="#0f172a" />
      <circle cx="45" cy="62" r="2.5" fill="#0f172a" />
      <circle cx="56" cy="62" r="2.5" fill="#0f172a" />
      <circle cx="73" cy="62" r="2.5" fill="#0f172a" />
      <circle cx="84" cy="62" r="2.5" fill="#0f172a" />
    </g>
  </svg>`;

  return L.divIcon({
    className: 'custom-icon',
    html: `
      <div class="transition-all duration-300 ease-linear cursor-pointer" style="transform: rotate(${rotation}deg);">
        ${mode === 'Rail' ? railSvg : truckSvg(color)}
      </div>
    `,
    iconSize: [52, 52],
    iconAnchor: [26, 26],
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
  // Match real backend disruption type strings (Thunderstorm, Traffic Gridlock, etc.)
  const emoji =
    type.includes('Thunder') || type.includes('Storm') || type.includes('Weather') ? '⛈️' :
    type.includes('Traffic') || type.includes('Gridlock') ? '🚦' :
    type.includes('Landslide') || type.includes('Mountain') ? '⛰️' :
    type.includes('Bridge') || type.includes('Maintenance') ? '🔧' : '🚧';
  
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

const destinationIcon = L.divIcon({
  className: 'destination-icon',
  html: `
    <div class="relative flex items-center justify-center">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 21.7C16.8 17.5 20 13.4 20 9.2C20 4.8 16.4 1.2 12 1.2C7.6 1.2 4 4.8 4 9.2C4 13.4 7.2 17.5 12 21.7Z" fill="#ef4444" stroke="white" stroke-width="1.5"/>
        <circle cx="12" cy="9.2" r="3" fill="white"/>
      </svg>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 28],
});

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
        <div className="p-2 min-w-[230px]">
          <div className="flex justify-between items-start mb-2 border-b border-slate-700 pb-1">
            <h3 className="font-bold text-white text-xs uppercase">Shipment #{shipment.truck_id || shipment.id}</h3>
            {shipment.transport_mode === 'Rail' && (
              <span className="bg-indigo-500/20 text-indigo-400 text-[8px] px-1.5 py-0.5 rounded font-bold border border-indigo-500/30 tracking-widest">RAIL TRANSIT</span>
            )}
          </div>
          
          <div className="space-y-1 text-xs">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-400">Mode:</span>
              <span className={`font-bold ${shipment.transport_mode === 'Rail' ? 'text-indigo-400' : 'text-emerald-400'}`}>
                {shipment.transport_mode === 'Rail' ? 'Gati Shakti Multimodal' : 'National Highway'}
              </span>
            </div>

            {/* ── RAIL: Real Train Info Panel ── */}
            {shipment.transport_mode === 'Rail' && shipment.train_number && (
              <div className="mt-2 p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg space-y-1.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-base">🚂</span>
                  <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Assigned Freight Train</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-slate-400 text-[9px]">Train No.</span>
                  <span className="font-bold text-white text-[10px]">{shipment.train_number}</span>
                </div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-slate-400 text-[9px] shrink-0">Name</span>
                  <span className="font-semibold text-indigo-200 text-[9px] text-right leading-tight">{shipment.train_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-[9px]">Operator</span>
                  <span className="text-slate-300 text-[9px]">{shipment.train_operator}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-[9px]">Commodity</span>
                  <span className="text-emerald-400 text-[9px] font-medium">{shipment.commodity_type}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-[9px]">Wagon Type</span>
                  <span className="font-mono text-amber-400 text-[9px]">{shipment.wagon_type}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-[9px]">Avg Speed</span>
                  <span className="text-blue-400 text-[9px] font-bold">{shipment.avg_speed_kmh} km/h</span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center mt-1">
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
            {/* Terrain & warnings — hidden for Rail (irrelevant once on a train) */}
            {shipment.transport_mode !== 'Rail' && (
              <>
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
              </>
            )}
            
            <div className="mt-3 pt-2 border-t border-slate-700/50 flex justify-between items-center">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                shipment.status === 'On-Track' || shipment.status === 'On Time' ? 'text-emerald-400 bg-emerald-500/10' : 
                shipment.status === 'At Risk' || shipment.status === 'Delayed' ? 'text-amber-400 bg-amber-500/10' : 'text-red-400 bg-red-500/10'
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

// Auto-fly when hub filter is set
const FilterFlyEffect = ({ activeFilter }: { activeFilter: ActiveFilter }) => {
  const map = useMap();
  useEffect(() => {
    if (!activeFilter) return;
    if (activeFilter.type === 'hub') {
      map.flyTo(activeFilter.coords, 8, { animate: true, duration: 1.2 });
    }
  }, [activeFilter, map]);
  return null;
};

// Rail hub marker icons (normal & selected)
const railHubIcon = L.divIcon({
  className: '',
  html: `<div style="width:28px;height:28px;background:linear-gradient(135deg,#4f46e5,#7c3aed);border:2px solid rgba(165,180,252,0.6);border-radius:6px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px rgba(99,102,241,0.5);font-size:14px">🚉</div>`,
  iconSize: [28, 28], iconAnchor: [14, 14],
});
const railHubIconSelected = L.divIcon({
  className: '',
  html: `<div style="width:34px;height:34px;background:linear-gradient(135deg,#4f46e5,#7c3aed);border:2.5px solid #a5b4fc;border-radius:8px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 20px rgba(99,102,241,0.8);font-size:18px">🚉</div>`,
  iconSize: [34, 34], iconAnchor: [17, 17],
});

interface MapProps {
  focusedLocation: [number, number] | null;
  isScanning: boolean;
  shipments: Shipment[];
  disruptions: Disruption[];
  activeFilter: ActiveFilter;
  setActiveFilter: (f: ActiveFilter) => void;
  viewMode: 'Road' | 'Rail';
}

const Map: React.FC<MapProps> = ({ focusedLocation, isScanning, shipments, disruptions, activeFilter, setActiveFilter, viewMode }) => {
  // Track live positions and rotations for animation
  const [animatedPositions, setAnimatedPositions] = useState<Record<string | number, { pos: [number, number], rotation: number, progress: number }>>({});

  // Persistent clock — never reset so trucks don't snap on data re-poll
  const animStartRef = useRef<number>(Date.now());
  // Keep latest shipments available inside the RAF loop without restarting it
  const shipmentsRef = useRef<Shipment[]>(shipments);
  useEffect(() => { shipmentsRef.current = shipments; }, [shipments]);

  // Movement Simulation Engine: runs permanently; reads shipmentsRef so it
  // never restarts (and never causes position snapping) when data is polled.
  useEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      const now = Date.now();
      const elapsed = (now - animStartRef.current) / 1000; // total seconds since mount

      setAnimatedPositions(prev => {
        const next: Record<string | number, { pos: [number, number], rotation: number, progress: number }> = { ...prev };
        
        shipmentsRef.current.forEach(ship => {
          if (!ship.route || ship.route.length < 2) {
            next[ship.id] = { pos: ship.location, rotation: 0, progress: 0 };
            return;
          }

          const speedFactor = 1.0;
          const duration = ship.route.length * speedFactor;
          const progress = (elapsed % duration) / duration;
          
          const totalPoints = ship.route.length;
          const floatIndex = progress * (totalPoints - 1);
          const index = Math.floor(floatIndex);
          const nextIndex = Math.min(index + 1, totalPoints - 1);
          const ratio = floatIndex - index;

          const start = ship.route![index];
          const end = ship.route![nextIndex];

          const lat = start[0] + (end[0] - start[0]) * ratio;
          const lng = start[1] + (end[1] - start[1]) * ratio;
          
          // Adjust rotation: SVGs are drawn horizontally (facing 90deg East). 
          // To make 0deg (North) point UP, we subtract 90.
          const rotation = calculateBearing(start, end) - 90;
          
          next[ship.id] = { pos: [lat, lng], rotation, progress };
        });

        return next;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← empty deps: loop starts once at mount, reads data via ref

  const indiaCenter: [number, number] = [20.5937, 78.9629];
  const worldBounds: L.LatLngBoundsExpression = [[-90, -180], [90, 180]];
  const shipmentsData = viewMode === 'Rail' 
    ? shipments.filter(s => s.transport_mode === 'Rail') 
    : shipments.filter(s => s.transport_mode !== 'Rail');

  // ── Filter logic ──────────────────────────────────────────────────────────
  const filteredIds = React.useMemo(() => {
    if (!activeFilter) return null;
    if (activeFilter.type === 'shipment') return new Set([String(activeFilter.id)]);
    if (activeFilter.type === 'hub') {
      const [hlat, hlng] = activeFilter.coords;
      return new Set(
        shipments
          .filter(s => s.transport_mode === 'Rail' && s.route?.some(
            pt => Math.sqrt(Math.pow(pt[0]-hlat,2) + Math.pow(pt[1]-hlng,2)) < 2.5
          ))
          .map(s => String(s.id))
      );
    }
    return null;
  }, [activeFilter, shipments]);

  const isVisible = (s: Shipment) =>
    !filteredIds || filteredIds.has(String(s.id));

  // Collect unique rail hubs from Rail shipments
  const railHubs = React.useMemo(() => {
    const hubs = new globalThis.Map<string, [number, number]>();
    shipments.forEach(s => {
      if (s.transport_mode === 'Rail' && s.route && s.route.length >= 2) {
        // The hub is the midpoint waypoint (index ~40% of route)
        const midIdx = Math.floor(s.route.length * 0.4);
        const pt = s.route[midIdx];
        const key = `${pt[0].toFixed(2)},${pt[1].toFixed(2)}`;
        if (!hubs.has(key)) hubs.set(key, pt as [number, number]);
      }
    });
    return Array.from(hubs.entries()).map(([key, coords]) => ({ key, coords }));
  }, [shipments]);

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

        {/* Real-world Railway Infrastructure Overlay (OpenRailwayMap) */}
        {viewMode === 'Rail' && (
          <TileLayer
            className="rail-tiles"
            attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Map style: &copy; <a href="https://www.OpenRailwayMap.org">OpenRailwayMap</a>'
            url="https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png"
            zIndex={10}
            opacity={0.8}
          />
        )}
        
        <MapEffect focusedLocation={focusedLocation} />
        <FilterFlyEffect activeFilter={activeFilter} />

        {/* Draw Disruptions — hide completely in Focus Mode and Rail Mode */}
        {!activeFilter && viewMode !== 'Rail' && disruptions.map(disruption => (
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

        {/* Rail Hub Station Markers — clickable to filter by hub */}
        {viewMode === 'Rail' && railHubs.map(({ key, coords }) => {
          const isSelected = activeFilter?.type === 'hub' &&
            Math.abs(activeFilter.coords[0] - coords[0]) < 0.05 &&
            Math.abs(activeFilter.coords[1] - coords[1]) < 0.05;
          
          // Focus Mode: Hide all hubs that aren't the selected one
          if (activeFilter && !isSelected) return null;

          return (
            <Marker
              key={`hub-${key}`}
              position={coords}
              icon={isSelected ? railHubIconSelected : railHubIcon}
              eventHandlers={{
                click: () => setActiveFilter(
                  isSelected ? null : { type: 'hub', name: `Rail Hub (${coords[0].toFixed(1)},${coords[1].toFixed(1)})`, coords }
                ),
              }}
            >
              <Popup>
                <div className="p-2 min-w-[160px]">
                  <div className="flex items-center gap-2 mb-2 border-b border-slate-700 pb-1">
                    <span className="text-lg">🚉</span>
                    <h3 className="font-bold text-indigo-300 text-xs uppercase">Rail Transshipment Hub</h3>
                  </div>
                  <p className="text-[10px] text-slate-400">Click to isolate shipments using this hub.</p>
                  {isSelected && (
                    <button
                      onClick={() => setActiveFilter(null)}
                      className="mt-2 w-full text-[10px] bg-slate-700 hover:bg-slate-600 text-white rounded px-2 py-1 transition-colors"
                    >
                      Reset View
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {shipmentsData.map((shipment) => {
          // Safety check: Don't render if location is missing
          if (!shipment.location) return null;
          const visible = isVisible(shipment);

          // Strict Focus Mode: completely hide unrelated shipments and routes
          if (!visible) return null;

          const pos = animatedPositions[shipment.id]?.pos || shipment.location as [number, number];
          const rot = animatedPositions[shipment.id]?.rotation || 0;

          return (
            <React.Fragment key={shipment.id}>
              {/* Draw Path Route — dimmed when filtered out */}
              {shipment.route && (() => {
                const progress = animatedPositions[shipment.id]?.progress || 0;
                const totalPoints = shipment.route.length;
                const splitIndex = Math.floor(progress * (totalPoints - 1));
                const pastRoute   = shipment.route.slice(0, splitIndex + 1);
                const futureRoute = shipment.route.slice(splitIndex);

                const futureColor =
                  (shipment.status === 'Critical' || (shipment.delay || 0) >= 150) ? '#ef4444' :
                  (shipment.status === 'At Risk' || shipment.status === 'Delayed' || (shipment.delay || 0) > 0) ? '#f59e0b' :
                  '#64748b'; // Default to greyish for Rail if on track

                return (
                  <React.Fragment key={`routes-${shipment.id}`}>
                    {/* PAST ROUTE */}
                    {pastRoute.length >= 2 && (
                      <Polyline
                        positions={pastRoute as [number, number][]}
                        color="#475569"
                        weight={3}
                        opacity={0.3}
                      />
                    )}
                    {/* FUTURE ROUTE */}
                    {futureRoute.length >= 2 && shipment.transport_mode === 'Rail' ? (
                      <>
                        {/* Metallic Rail Track (No Glow) */}
                        <Polyline
                          positions={futureRoute as [number, number][]}
                          color="#475569" // Slate 600
                          weight={6}
                          opacity={0.8}
                        />
                        {/* Rail Sleepers Effect */}
                        <Polyline
                          positions={futureRoute as [number, number][]}
                          color="#94a3b8" // Slate 400
                          weight={4}
                          opacity={0.6}
                          dashArray="1, 8"
                        />
                        {/* Status Wire (Thin indicator) */}
                        {(shipment.status !== 'On-Track' || shipment.delay > 0) && (
                          <Polyline
                            positions={futureRoute as [number, number][]}
                            color={futureColor}
                            weight={1.5}
                            opacity={0.7}
                          />
                        )}
                      </>
                    ) : futureRoute.length >= 2 && (
                      <>
                        <Polyline
                          positions={futureRoute as [number, number][]}
                          color={futureColor}
                          weight={10}
                          opacity={0.15}
                        />
                        <Polyline
                          positions={futureRoute as [number, number][]}
                          color={futureColor}
                          weight={4}
                          opacity={0.9}
                        />
                      </>
                    )}
                  </React.Fragment>
                );
              })()}

              {/* Truck/train marker */}
              <TruckMarker
                shipment={shipment}
                position={pos}
                rotation={rot}
              />

              {/* Destination pin */}
              {shipment.route && shipment.route.length > 0 && (
                <Marker 
                  position={shipment.route[shipment.route.length - 1] as [number, number]} 
                  icon={destinationIcon}
                  eventHandlers={{
                    mouseover: (e) => e.target.openPopup(),
                    mouseout: (e) => e.target.closePopup(),
                  }}
                >
                  <Popup>
                    <div className="p-2 min-w-[150px]">
                      <div className="flex items-center gap-2 mb-2 border-b border-slate-700 pb-1">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <h3 className="font-bold text-white text-xs uppercase">Destination</h3>
                      </div>
                      <div className="text-xs text-slate-300">
                        <div className="flex justify-between items-center mb-1">
                          <span>Point:</span>
                          <span className="font-semibold text-red-400">{shipment.destination || 'Delivery Point'}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          ID: {shipment.id}
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}
            </React.Fragment>
          );
        })}
      </MapContainer>
      
      {/* Legend Overlay */}
      <div className="absolute bottom-6 left-4 z-[1000] pointer-events-none">

      {/* Active Filter Banner — Reset View */}
      {activeFilter && (
        <div className="mb-2 flex items-center gap-2 bg-indigo-900/90 backdrop-blur-md border border-indigo-500/40 rounded-xl px-3 py-2 shadow-xl pointer-events-auto">
          <span className="text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
            {activeFilter.type === 'shipment' ? `📦 ${activeFilter.label}` : `🚉 Rail Hub`}
          </span>
          <button
            onClick={() => setActiveFilter(null)}
            className="ml-2 text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-2 py-0.5 rounded-lg transition-colors"
          >
            ✕ Reset View
          </button>
        </div>
      )}
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
          <div className="w-px h-4 bg-slate-700 mx-1"></div>
          <div className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#ef4444" stroke="white" strokeWidth="2">
              <path d="M12 21C16 17 20 13.4183 20 9C20 4.58172 16.4183 1 12 1C7.58172 1 4 4.58172 4 9C4 13.4183 8 17 12 21Z"/>
            </svg>
            <span className="text-[11px] text-slate-300 font-medium">Destination</span>
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
