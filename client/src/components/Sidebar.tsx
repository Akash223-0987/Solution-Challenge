import React from 'react';
import { Truck, AlertTriangle, Clock, Zap, CloudLightning, Car, ShieldCheck, Focus, X, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ReactMarkdown from 'react-markdown';
import type { Shipment, Disruption, ActiveFilter } from '../types';
import { AetherLogLogo } from './AetherLogLogo';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  setFocusedLocation: (loc: [number, number] | null) => void;
  isScanning: boolean;
  onRunOptimization: () => void;
  aiExplanation: string | null;
  onClearAiExplanation: () => void;
  onOpenAddTruckModal: () => void;
  shipments: Shipment[];
  disruptions: Disruption[];
  fetchError: boolean;
  activeFilter: ActiveFilter;
  setActiveFilter: (f: ActiveFilter) => void;
  viewMode: 'Road' | 'Rail';
  setViewMode: (mode: 'Road' | 'Rail') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, setFocusedLocation, isScanning, onRunOptimization, aiExplanation, onClearAiExplanation, onOpenAddTruckModal, shipments, disruptions, fetchError, activeFilter, setActiveFilter, viewMode, setViewMode }) => {

  const [filterModal, setFilterModal] = React.useState<{ title: string, list: any[] } | null>(null);

  const activeCount = shipments.length;
  const atRiskCount = shipments.filter(s => s.status === 'Critical' || s.status === 'At Risk' || s.status === 'Delayed' || (s.delay || 0) > 30).length;
  const railCount = shipments.filter(s => s.transport_mode === 'Rail').length;
  const totalDelay = shipments.reduce((acc, s) => acc + (s.delay || 0), 0);
  const avgDelay = activeCount > 0 ? Math.round(totalDelay / activeCount) : 0;

  const handleStatClick = (title: string, list: any[]) => {
    setFilterModal({ title, list });
  };

  return (
    <>
    {/* Mobile Backdrop Overlay */}
    {isOpen && (
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[2000] md:hidden transition-opacity duration-300" 
        onClick={onClose}
      />
    )}

    <aside className={`fixed inset-y-0 left-0 w-80 bg-black text-white flex flex-col border-r border-white/5 shadow-2xl overflow-hidden transition-transform duration-500 ease-out z-[2001] md:relative md:translate-x-0 font-sans ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    }`}>
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,229,160,0.01)_50%)] bg-[length:100%_4px] pointer-events-none opacity-50 z-10" />

      {/* Drill-down Filter Modal Overlay */}
      {filterModal && (
        <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col animate-in slide-in-from-left duration-300">
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
            <div>
              <h3 className="font-bold text-[#00E5A0]">{filterModal.title}</h3>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">{filterModal.list.length} units listed</p>
            </div>
            <button 
              onClick={() => setFilterModal(null)}
              className="p-1 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors"
            >
              CLOSE
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {filterModal.list.map(ship => (
              <div 
                key={ship.id}
                onClick={() => {
                  setFocusedLocation(ship.location);
                  setFilterModal(null);
                  // Auto-switch view mode based on the shipment clicked
                  if (ship.transport_mode === 'Rail') {
                    setViewMode('Rail');
                  } else {
                    setViewMode('Road');
                  }
                }}
                className="p-3 bg-white/5 rounded-xl border border-white/10 hover:border-[#00E5A0]/30 transition-all cursor-pointer group backdrop-blur-md"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-white group-hover:text-[#00E5A0] transition-colors uppercase tracking-tight">{ship.truck_id || ship.id}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    (ship.status === 'Critical' || ship.delay > 60) ? 'bg-red-500/20 text-red-400' : 
                    (ship.status === 'At Risk' || ship.status === 'Delayed' || ship.delay > 0) ? 'bg-amber-500/20 text-amber-400' : 'bg-[#00E5A0]/20 text-[#00E5A0]'
                  }`}>
                    {ship.delay > 0 ? `+${ship.delay}m` : 'ON TIME'}
                  </span>
                </div>
                <div className="text-[10px] text-white/40 flex justify-between">
                  <span>{ship.origin || 'Base'} → {ship.destination || 'Terminus'}</span>
                  <span className="italic">{ship.terrain || 'Highway'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Backend Offline Error Banner */}
      {fetchError && (
        <div className="mx-3 mt-3 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2 animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <p className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">
            Backend offline — showing cached data
          </p>
        </div>
      )}

      {/* Header */}
      <div className="p-6 border-b border-white/5 flex justify-between items-start relative z-20">
        <div className="flex items-center gap-3">
          <AetherLogLogo size={40} glow />
          <div>
            <h2 className="text-xl font-black tracking-tight text-white leading-none">
              AETHER<span className="bg-gradient-to-r from-[#67E8F9] to-[#00E5A0] bg-clip-text text-transparent">LOG</span>
            </h2>
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.2em] mt-1">Fleet OS</p>
          </div>
        </div>
        <button 
          onClick={() => supabase.auth.signOut()}
          className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-red-400 transition-colors"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
      
      <div className="px-6 pb-4 relative z-20">
        <div className="flex bg-white/5 rounded-xl p-1 border border-white/10 backdrop-blur-md">
          <button
            onClick={() => setViewMode('Road')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'Road' ? 'bg-white/10 text-white shadow-sm border border-white/10' : 'text-white/40 hover:text-white/60'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            Road Fleet
          </button>
          <button
            onClick={() => setViewMode('Rail')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'Rail' ? 'bg-[#00E5A0]/20 text-[#00E5A0] border border-[#00E5A0]/30 shadow-[0_0_15px_rgba(0,229,160,0.1)]' : 'text-white/40 hover:text-[#00E5A0]/60'
            }`}
          >
            <span className="text-[14px] leading-none">🚂</span>
            Rail Network
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-4 grid grid-cols-2 gap-3 relative z-20">
        <div 
          onClick={() => handleStatClick("Active Fleet", shipments)}
          className="bg-white/5 p-3 rounded-2xl border border-white/5 hover:border-white/10 transition-colors group cursor-pointer backdrop-blur-md"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-white/30 text-[10px] font-bold uppercase tracking-wider">Active</span>
            <Truck className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
          </div>
          <p className="text-xl font-bold">{activeCount}</p>
        </div>

        <div 
          onClick={() => handleStatClick("At Risk Units", shipments.filter(s => s.status === 'Critical' || s.status === 'At Risk' || (s.delay || 0) > 30))}
          className="bg-white/5 p-3 rounded-2xl border border-white/5 hover:border-red-500/30 transition-colors group cursor-pointer backdrop-blur-md"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-white/30 text-[10px] font-bold uppercase tracking-wider">At Risk</span>
            <AlertTriangle className="w-4 h-4 text-red-500/60 group-hover:text-red-500 transition-colors" />
          </div>
          <p className="text-xl font-bold text-red-400">{atRiskCount}</p>
        </div>

        <div 
          onClick={() => {
            setViewMode('Rail');
            handleStatClick("Rail Transshipments", shipments.filter(s => s.transport_mode === 'Rail'));
          }}
          className="bg-white/5 p-3 rounded-2xl border border-white/5 hover:border-[#00E5A0]/30 transition-colors group cursor-pointer backdrop-blur-md"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-white/30 text-[10px] font-bold uppercase tracking-wider">Rail Hubs</span>
            <Clock className="w-4 h-4 text-[#00E5A0]/60 group-hover:text-[#00E5A0] transition-colors" />
          </div>
          <p className="text-xl font-bold text-[#00E5A0]/80">{railCount}</p>
        </div>

        <div className="bg-white/5 p-3 rounded-2xl border border-white/5 hover:border-[#00E5A0]/30 transition-colors group backdrop-blur-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white/30 text-[10px] font-bold uppercase tracking-wider">Avg Delay</span>
            <Zap className="w-4 h-4 text-[#00E5A0]/60 group-hover:text-[#00E5A0] transition-colors" />
          </div>
          <p className="text-xl font-bold">{avgDelay} <span className="text-[10px] font-normal text-white/20">m</span></p>
        </div>
      </div>

      {/* AI Reasoning Panel */}
      {aiExplanation && (
        <div className="mx-4 mb-4 p-4 bg-[#00E5A0]/5 border border-[#00E5A0]/20 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-500 relative flex flex-col max-h-[400px] backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#00E5A0]" />
              <span className="text-[10px] font-bold text-[#00E5A0] uppercase tracking-widest">AI Route Intelligence</span>
            </div>
            <button 
              onClick={onClearAiExplanation}
              className="p-1 hover:bg-white/5 rounded-md transition-colors text-white/40"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="overflow-y-auto pr-2 custom-scrollbar">
            <div className="text-[11px] text-white/70 leading-relaxed prose-ai">
              <ReactMarkdown>{aiExplanation}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      {/* Disruption Feed */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 relative z-20 custom-scrollbar">
        <div className="flex items-center justify-between sticky top-0 bg-black/80 backdrop-blur-sm py-2 z-10">
          <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">
            Disruption & Risk Feed
          </h3>
          {activeFilter && (
            <button
              onClick={() => setActiveFilter(null)}
              className="flex items-center gap-1 text-[9px] bg-[#00E5A0]/10 hover:bg-[#00E5A0]/20 border border-[#00E5A0]/20 text-[#00E5A0] font-bold px-2 py-0.5 rounded-full transition-colors"
            >
              <Focus className="w-2.5 h-2.5" />
              {activeFilter.label}
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
        
        {viewMode === 'Road' && disruptions.map((dis) => (
          <div 
            key={`dis-${dis.id}`}
            onClick={() => setFocusedLocation(dis.location)}
            className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl flex items-start gap-3 hover:bg-red-500/10 transition-all cursor-pointer group backdrop-blur-sm"
          >
            <div className="mt-1">
              {dis.type.includes('Thunder') || dis.type.includes('Storm') ? <CloudLightning className="w-4 h-4 text-blue-400/80" /> : 
               dis.type.includes('Traffic') ? <Car className="w-4 h-4 text-amber-500/80" /> : <AlertTriangle className="w-4 h-4 text-red-500/80" />}
            </div>
            <div>
              <p className="text-xs font-bold text-white/80 uppercase tracking-tight">{dis.type}</p>
              <p className="text-[10px] text-white/40 leading-tight mt-0.5 line-clamp-2">{dis.description || 'Impact detected on local corridor.'}</p>
            </div>
          </div>
        ))}

        {shipments.filter(s => 
          (s.status !== 'On-Track' || (s.delay || 0) > 20) &&
          (viewMode === 'Rail' ? s.transport_mode === 'Rail' : s.transport_mode !== 'Rail')
        ).map((ship) => (
            <div
              key={ship.id}
              onClick={() => {
                const shipId = String(ship.truck_id || ship.id);
                const isActive = activeFilter?.type === 'shipment' && String(activeFilter.id) === shipId;
                if (isActive) {
                  setActiveFilter(null);
                } else {
                  setActiveFilter({ type: 'shipment', id: ship.id, label: ship.truck_id || String(ship.id) });
                  setFocusedLocation(ship.location);
                }
              }}
              className={`p-3 rounded-xl border-l-4 text-sm transition-all cursor-pointer group backdrop-blur-md ${
                activeFilter?.type === 'shipment' && String(activeFilter.id) === String(ship.id)
                  ? 'bg-[#00E5A0]/10 border-l-[#00E5A0] ring-1 ring-[#00E5A0]/20'
                  : ship.status === 'Critical'
                  ? 'bg-white/5 border-l-red-500/50 hover:bg-white/10'
                  : 'bg-white/5 border-l-amber-500/50 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-white uppercase text-xs flex items-center gap-1.5 tracking-tight">
                  {activeFilter?.type === 'shipment' && String(activeFilter.id) === String(ship.id) && (
                    <Focus className="w-3 h-3 text-[#00E5A0]" />
                  )}
                  TRK-{ship.truck_id || ship.id}
                </span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                  ship.status === 'Critical' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {ship.status}
                </span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-white/30">{ship.origin} → {ship.destination}</span>
                <span className="font-bold text-white/60">+{ship.delay}m</span>
              </div>
            </div>
        ))}

        {shipments.filter(s => s.status !== 'On-Track' && (viewMode === 'Rail' ? s.transport_mode === 'Rail' : s.transport_mode !== 'Rail')).length === 0 && (
          <div className="text-center py-10 opacity-30">
            <ShieldCheck className="w-8 h-8 text-white mx-auto mb-2" />
            <p className="text-[10px] text-white uppercase tracking-[0.2em]">All Systems Nominal</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-4 bg-black/80 backdrop-blur-xl space-y-3 relative z-30 border-t border-white/5">
        <button 
          onClick={onOpenAddTruckModal}
          className="w-full bg-[#00E5A0] hover:bg-[#00E5A0]/90 text-black font-black py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_8px_32px_rgba(0,229,160,0.2)] text-sm"
        >
          <Truck className="w-4 h-4" />
          ADD SIMULATION TRUCK
        </button>

        <button 
          onClick={onRunOptimization}
          disabled={isScanning}
          className={`w-full ${isScanning ? 'bg-[#3B82F6] animate-pulse' : 'bg-white/10 hover:bg-white/20'} text-white font-black py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm border border-white/10`}
        >
          {isScanning ? (
            <>
              <Clock className="w-4 h-4 animate-spin" />
              SCANNING NETWORK...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 text-[#00E5A0]" />
              RUN AI RE-ROUTING
            </>
          )}
        </button>
      </div>
    </aside>
    </>

  );
};

export default Sidebar;
