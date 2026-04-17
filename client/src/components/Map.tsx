import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import shipments from '../data/shipments.json';

// Function to create custom glowing markers based on status
const createCustomIcon = (status: string) => {
  const color = status === 'On Time' ? '#10b981' : (status === 'At Risk' ? '#f59e0b' : '#ef4444');
  const pulseClass = status !== 'On Time' ? 'marker-pulse' : '';
  
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

const Map = () => {
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
        
        {shipments.map((shipment) => (
          <Marker 
            key={shipment.id} 
            position={shipment.location as [number, number]}
            icon={createCustomIcon(shipment.status)}
          >
            <Popup>
              <div className="p-2 min-w-[150px]">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-white text-sm tracking-tight">{shipment.name}</h3>
                  <span className="text-[10px] text-slate-400 font-mono">#{shipment.id}</span>
                </div>
                
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Status</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      shipment.status === 'On Time' ? 'text-emerald-400 bg-emerald-500/10' : 
                      shipment.status === 'At Risk' ? 'text-amber-400 bg-amber-500/10' : 'text-red-400 bg-red-500/10'
                    }`}>
                      {shipment.status}
                    </span>
                  </div>
                  
                  {shipment.delay > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Delay</span>
                      <span className="text-[11px] text-red-400 font-bold">+{shipment.delay} mins</span>
                    </div>
                  )}
                  
                  <div className="mt-2 pt-2 border-t border-slate-700/50">
                    <button className="w-full bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold py-1.5 rounded-md transition-colors">
                      View details
                    </button>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
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
    </div>
  );
};

export default Map;
