import { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Map from './components/Map';
import AddTruckModal from './components/AddTruckModal';
import type { Shipment, Disruption, ActiveFilter } from './types';

const BASE = import.meta.env.VITE_API_URL;

function App() {
  const [focusedLocation, setFocusedLocation] = useState<[number, number] | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isAddTruckModalOpen, setIsAddTruckModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>(null);
  const [viewMode, setViewMode] = useState<'Road' | 'Rail'>('Road');

  // ── Lifted shared data state (fixes duplicate polling) ──
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [disruptions, setDisruptions] = useState<Disruption[]>([]);
  const [fetchError, setFetchError] = useState(false);
  const isInitialFetch = useRef(true);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [shipRes, disrupRes] = await Promise.all([
          fetch(`${BASE}/api/shipments`),
          fetch(`${BASE}/api/disruptions`).catch(() => null),
        ]);

        const shipData: Shipment[] = await shipRes.json();
        setFetchError(false); // backend is reachable

        if (disrupRes && disrupRes.ok) {
          const disrupData: Disruption[] = await disrupRes.json();
          setDisruptions(disrupData);
        }

        if (shipData && shipData.length > 0) {
          setShipments(shipData);
        } else if (isInitialFetch.current) {
          // Fallback to static data only on the very first load
          const staticShipments = await import('./data/shipments.json');
          setShipments(staticShipments.default as unknown as Shipment[]);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setFetchError(true);
        // Load static fallback once if backend was never reachable
        if (isInitialFetch.current) {
          const staticShipments = await import('./data/shipments.json');
          setShipments(staticShipments.default as unknown as Shipment[]);
        }
      } finally {
        isInitialFetch.current = false;
      }
    };

    fetchAllData();
    const intervalId = setInterval(fetchAllData, 3000);
    return () => clearInterval(intervalId);
  }, []);

  // ── Live IST clock (fixes hardcoded timestamp) ──
  const [clock, setClock] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 font-sans antialiased text-slate-900">
      {/* Sidebar - Phase 1 & 3 */}
      <Sidebar
        shipments={shipments}
        disruptions={disruptions}
        fetchError={fetchError}
        setFocusedLocation={setFocusedLocation}
        isScanning={isScanning}
        setIsScanning={setIsScanning}
        onOpenAddTruckModal={() => setIsAddTruckModalOpen(true)}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {/* Main Content Area - Phase 1 & 2 */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {/* Top Header/Navbar for the map area */}
        <header className="h-14 bg-slate-900 border-b border-slate-700/60 flex items-center justify-between px-6 z-20 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-white tracking-tight">AetherLog Intelligence</h1>
            <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border border-emerald-500/30">Live Fleet</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right mr-2">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1">Last Updated</p>
              <p className="text-xs font-mono font-bold text-blue-400 leading-tight">
                {clock.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })} IST
              </p>
            </div>
          </div>
        </header>

        {/* Map Container - The Heart (Phase 2) */}
        <div className="flex-1 bg-slate-200 relative">
          <Map
            shipments={shipments}
            disruptions={disruptions}
            focusedLocation={focusedLocation}
            isScanning={isScanning}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            viewMode={viewMode}
          />
        </div>
      </main>

      {/* Modals */}
      <AddTruckModal
        isOpen={isAddTruckModalOpen}
        onClose={() => setIsAddTruckModalOpen(false)}
      />
    </div>
  );
}

export default App;
