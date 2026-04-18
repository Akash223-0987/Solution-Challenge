import React, { useEffect, useState } from 'react';
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
}

// Function to create custom glowing markers based on status
const createCustomIcon = (status: string) => {
  const color = status === 'On-Track' || status === 'On Time' ? '#10b981' : (status === 'At Risk' ? '#f59e0b' : '#ef4444');
  const pulseClass = (status !== 'On-Track' && status !== 'On Time') ? 'marker-pulse' : '';
  
  return L.divIcon({
    className: 'custom-icon',
    html: `
      <div class="custom-marker ${pulseClass}">
        <div class="marker-dot" style="background-color: ${color}; box-shadow: 0 0 15px ${color};"></div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

const createDisruptionIcon = (type: string) => {
  const color = type === 'Weather' ? '#3b82f6' : '#ef4444';
  const emoji = type === 'Weather' ? '⛈️' : '🚧';
  return L.divIcon({
    className: 'disruption-icon',
    html: `
      <div class="flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 border-2 border-[${color}] shadow-[0_0_15px_${color}] text-lg z-[2000] relative">
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

  useEffect(() => {
    let isInitialFetch = true;

    const fetchAllData = async () => {
      try {
        const [shipRes, disrupRes] = await Promise.all([
          fetch('http://localhost:8081/api/shipments'),
          fetch('http://localhost:8081/api/disruptions').catch(() => null)
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
        if (isInitialFetch) {
          const staticShipments = await import('../data/shipments.json');
          setShipmentsData(staticShipments.default as unknown as Shipment[]);
        }
      } finally {
        if (isInitialFetch) {
          setLoading(false);
          isInitialFetch = false;
        }
      }
    };

    // Run immediately
    fetchAllData();

    // Poll every 3 seconds for live dashboard feel
    const intervalId = setInterval(fetchAllData, 3000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, []);

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
          <Marker 
            key={`disrupt-${disruption.id}`}
            position={disruption.location as [number, number]}
            icon={createDisruptionIcon(disruption.type)}
          >
            <Popup>
              <div className="p-2 min-w-[150px]">
                <h3 className="font-bold text-red-400 border-b border-slate-700 pb-1 mb-2">{disruption.type} Warning</h3>
                <p className="text-xs text-slate-300">Severity: <span className="font-bold text-white">{disruption.severity}</span></p>
                {disruption.description && <p className="text-xs text-slate-400 mt-1">{disruption.description}</p>}
              </div>
            </Popup>
          </Marker>
        ))}

        {shipmentsData.map((shipment) => {
          // Safety check: Don't render if location is missing
          if (!shipment.location) return null;

          return (
            <React.Fragment key={shipment.id}>
              {/* Draw Path Route */}
              {shipment.route && (
                <Polyline 
                  positions={shipment.route as [number, number][]} 
                  color={shipment.status === 'On-Track' || shipment.status === 'On Time' ? '#10b981' : shipment.status === 'At Risk' ? '#f59e0b' : '#ef4444'} 
                  weight={3}
                  dashArray="10, 10"
                  opacity={0.6}
                />
              )}
              
              <Marker 
                position={shipment.location as [number, number]}
                icon={createCustomIcon(shipment.status)}
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <h3 className="font-bold border-b border-slate-700 pb-1 mb-2 text-white">Truck #{shipment.truck_id || shipment.id}</h3>
                    <div className="space-y-1 text-xs">
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
                        <div className="flex gap-1 mt-2">
                          {shipment.features.map((f: string, i: number) => (
                            <span key={i} className="text-[9px] bg-slate-800 border border-slate-600 text-slate-300 px-1.5 py-0.5 rounded">
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
