import { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Map from './components/Map';
import AddTruckModal from './components/AddTruckModal';
import AuthPage from './components/AuthPage';
import HeroSection from './components/HeroSection';
import WeatherWidget from './components/WeatherWidget';
import GatiShaktiModal from './components/GatiShaktiModal';
import { supabase } from './lib/supabase';
import type { Shipment, Disruption, ActiveFilter } from './types';

const BASE = import.meta.env.VITE_API_URL;

function App() {
  const [view, setView] = useState<'hero' | 'signin' | 'signup' | 'dashboard'>('hero');
  const [focusedLocation, setFocusedLocation] = useState<[number, number] | null>(null);
  
  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setView('dashboard');
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setView('dashboard');
      else setView('hero');
    });

    return () => subscription.unsubscribe();
  }, []);

  const [isScanning, setIsScanning] = useState(false);
  const [isAddTruckModalOpen, setIsAddTruckModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>(null);
  const [viewMode, setViewMode] = useState<'Road' | 'Rail'>('Road');

  // ── Gati Shakti Optimization State ──
  const [gatiModalOpen, setGatiModalOpen] = useState(false);
  const [gatiSuggestions, setGatiSuggestions] = useState<any[]>([]);
  const [isApplyingRoutes, setIsApplyingRoutes] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);

  // ── Lifted shared data state ──
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
        setFetchError(false);

        if (disrupRes && disrupRes.ok) {
          const disrupData: Disruption[] = await disrupRes.json();
          setDisruptions(disrupData);
        }

        if (shipData) {
          setShipments(shipData);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setFetchError(true);
      } finally {
        isInitialFetch.current = false;
      }
    };

    fetchAllData();
    const intervalId = setInterval(fetchAllData, 3000);
    return () => clearInterval(intervalId);
  }, []);

  // ── Live IST clock ──
  const [clock, setClock] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const applyOptimization = useCallback(async () => {
    setIsApplyingRoutes(true);
    try {
      const response = await fetch(`${BASE}/api/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentId: 'ALL' })
      });
      const data = await response.json();
      if (data.success) {
        setAiExplanation(data.aiExplanation);
        if (data.railCount > 0) {
          setViewMode('Rail');
        }
      }
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setIsApplyingRoutes(false);
      setGatiModalOpen(false);
      setTimeout(() => setIsScanning(false), 2000);
    }
  }, [setViewMode]);

  const handleRunOptimization = useCallback(async () => {
    if (isScanning) return;
    setIsScanning(true);

    try {
      const previewRes = await fetch(`${BASE}/api/reroute-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const previewData = await previewRes.json();

      if (previewData.hasRisk && previewData.suggestions?.length > 0) {
        setGatiSuggestions(previewData.suggestions);
        setGatiModalOpen(true);
        setIsScanning(false);
      } else {
        await applyOptimization();
      }
    } catch (error) {
      console.error('Preview failed:', error);
      await applyOptimization();
    }
  }, [isScanning, applyOptimization]);

  if (view === 'hero') {
    return (
      <HeroSection 
        onAuth={(mode) => setView(mode)} 
      />
    );
  }

  if (view === 'signin' || view === 'signup') {
    return (
      <AuthPage 
        initialMode={view} 
        onAuthComplete={() => setView('dashboard')} 
        onClose={() => setView('hero')} 
      />
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-black font-sans antialiased text-white selection:bg-[#00E5A0]/30">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        shipments={shipments}
        disruptions={disruptions}
        fetchError={fetchError}
        setFocusedLocation={setFocusedLocation}
        isScanning={isScanning}
        onRunOptimization={handleRunOptimization}
        aiExplanation={aiExplanation}
        onClearAiExplanation={() => setAiExplanation(null)}
        onOpenAddTruckModal={() => { setIsAddTruckModalOpen(true); setIsSidebarOpen(false); }}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      <GatiShaktiModal 
        isOpen={gatiModalOpen}
        suggestions={gatiSuggestions}
        onConfirm={applyOptimization}
        onClose={() => setGatiModalOpen(false)}
        isApplying={isApplyingRoutes}
      />

      <main className="flex-1 relative overflow-hidden flex flex-col">
        <header className="h-16 bg-black/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 z-20 shrink-0">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden p-2 text-white/50 hover:text-[#00E5A0] transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00E5A0] to-[#3B82F6] p-[1px]">
                <div className="w-full h-full bg-black rounded-lg flex items-center justify-center">
                  <div className="w-4 h-4 bg-[#00E5A0] rounded-full blur-[8px] absolute opacity-30 animate-pulse" />
                  <span className="text-white font-black text-[10px] relative z-10">AL</span>
                </div>
              </div>
              <h1 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center">
                AETHER<span className="text-[#00E5A0]">LOG</span>
                <span className="hidden sm:inline ml-2 text-[9px] text-white/20 font-bold border-l border-white/10 pl-2 uppercase tracking-widest">Command</span>
              </h1>
            </div>
            
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00E5A0] animate-pulse shadow-[0_0_8px_#00E5A0]" />
              <span className="text-[9px] font-black text-white/60 uppercase tracking-widest">
                System Online
              </span>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="hidden md:flex flex-col items-end">
              <p className="text-[9px] text-white/20 font-black uppercase tracking-[0.2em] mb-1">Fleet Deployment</p>
              <p className="text-xs font-bold text-white tracking-tight">
                {shipments.length} <span className="text-white/40 font-medium">Active Units</span>
              </p>
            </div>
            
            <div className="w-px h-8 bg-white/5" />

            <div className="text-right">
              <p className="text-[9px] text-[#00E5A0]/40 font-black uppercase tracking-[0.2em] mb-1">Network Time</p>
              <p className="text-sm font-mono font-bold text-[#00E5A0] leading-tight flex items-center gap-2">
                <span className="w-1 h-1 bg-[#00E5A0]/50 rounded-full animate-ping" />
                {clock.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                <span className="text-[10px] text-white/20 ml-1 font-sans">IST</span>
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 bg-black relative">
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

      <AddTruckModal
        isOpen={isAddTruckModalOpen}
        onClose={() => setIsAddTruckModalOpen(false)}
      />

      {/* Floating Weather Command Intelligence */}
      <WeatherWidget />
    </div>
  );
}

export default App;
