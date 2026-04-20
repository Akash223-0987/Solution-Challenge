import React from 'react';
import { Truck, AlertTriangle, Clock, Zap, CloudLightning, Car, Anchor, ShieldCheck } from 'lucide-react';

interface SidebarProps {
  setFocusedLocation: (loc: [number, number] | null) => void;
  isScanning: boolean;
  setIsScanning: (scanning: boolean) => void;
  onOpenAddTruckModal: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ setFocusedLocation, isScanning, setIsScanning, onOpenAddTruckModal }) => {
  const [aiExplanation, setAiExplanation] = React.useState<string | null>(null);
  const [shipments, setShipments] = React.useState<any[]>([]);
  const [disruptions, setDisruptions] = React.useState<any[]>([]);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [shipRes, disRes] = await Promise.all([
          fetch('http://localhost:8082/api/shipments'),
          fetch('http://localhost:8082/api/disruptions')
        ]);
        const shipData = await shipRes.json();
        const disData = await disRes.json();
        setShipments(shipData);
        setDisruptions(disData);
      } catch (err) {
        console.error('Failed to sync fleet data:', err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRunOptimization = async () => {
    if (isScanning) return;
    setIsScanning(true);
    
    try {
      const response = await fetch('http://localhost:8082/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentId: 'ALL' })
      });
      const data = await response.json();
      console.log('AI Optimization Result:', data.message);
      
      if (data.success) {
        setAiExplanation(data.aiExplanation);
      }
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setTimeout(() => {
        setIsScanning(false);
      }, 2000);
    }
  };

  const [filterModal, setFilterModal] = React.useState<{ title: string, list: any[] } | null>(null);

  const activeCount = shipments.length;
  const atRiskCount = shipments.filter(s => s.status === 'Critical' || s.status === 'At Risk' || (s.delay || 0) > 30).length;
  const railCount = shipments.filter(s => s.transport_mode === 'Rail').length;
  const totalDelay = shipments.reduce((acc, s) => acc + (s.delay || 0), 0);
  const avgDelay = activeCount > 0 ? Math.round(totalDelay / activeCount) : 0;

  const handleStatClick = (title: string, list: any[]) => {
    setFilterModal({ title, list });
  };

  return (
    <aside className="w-80 h-screen bg-slate-900 text-slate-100 flex flex-col border-r border-slate-700 shadow-2xl overflow-hidden relative">
      {/* Drill-down Filter Modal Overlay */}
      {filterModal && (
        <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col animate-in slide-in-from-left duration-300">
          <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
            <div>
              <h3 className="font-bold text-blue-400">{filterModal.title}</h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">{filterModal.list.length} units listed</p>
            </div>
            <button 
              onClick={() => setFilterModal(null)}
              className="p-1 px-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-bold transition-colors"
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
                }}
                className="p-3 bg-slate-800/80 rounded-lg border border-slate-700 hover:border-blue-500/50 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-200 group-hover:text-blue-400 transition-colors uppercase">{ship.truck_id || ship.id}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    (ship.status === 'Critical' || ship.delay > 60) ? 'bg-red-500/20 text-red-500' : 
                    (ship.status === 'At Risk' || ship.delay > 0) ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'
                  }`}>
                    {ship.delay > 0 ? `+${ship.delay}m` : 'ON TIME'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>{ship.origin || 'Base'} → {ship.destination || 'Terminus'}</span>
                  <span className="italic">{ship.terrain || 'Highway'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          AETHERLOG
        </h2>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">India Fleet Monitoring</p>
      </div>

      {/* Stats Cards */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <div 
          onClick={() => handleStatClick("Active Fleet", shipments)}
          className="bg-slate-800 p-3 rounded-xl border border-slate-700 hover:border-blue-500 transition-colors group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Active</span>
            <Truck className="w-4 h-4 text-blue-400 group-hover:animate-bounce" />
          </div>
          <p className="text-xl font-bold">{activeCount}</p>
        </div>

        <div 
          onClick={() => handleStatClick("At Risk Units", shipments.filter(s => s.status === 'Critical' || s.status === 'At Risk' || (s.delay || 0) > 30))}
          className="bg-slate-800 p-3 rounded-xl border border-slate-700 hover:border-red-500 transition-colors group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">At Risk</span>
            <AlertTriangle className="w-4 h-4 text-red-500 group-hover:animate-pulse" />
          </div>
          <p className="text-xl font-bold text-red-500">{atRiskCount}</p>
        </div>

        <div 
          onClick={() => handleStatClick("Rail Transshipments", shipments.filter(s => s.transport_mode === 'Rail'))}
          className="bg-slate-800 p-3 rounded-xl border border-slate-700 hover:border-indigo-500 transition-colors group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Rail Hubs</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-xl font-bold text-indigo-400">{railCount}</p>
        </div>

        <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 hover:border-emerald-500 transition-colors group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Avg Delay</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-bold">{avgDelay} <span className="text-[10px] font-normal text-slate-500">m</span></p>
        </div>
      </div>

      {/* AI Reasoning Panel */}
      {aiExplanation && (
        <div className="mx-4 mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">AI Route Optimization</span>
          </div>
          <p className="text-xs text-blue-100 leading-relaxed italic">
            "{aiExplanation}"
          </p>
        </div>
      )}

      {/* Disruption Feed */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2 sticky top-0 bg-slate-900 py-2">
          Disruption & Risk Feed
        </h3>
        
        {/* Real-time Global Disruptions (Storms, Traffic, etc) */}
        {disruptions.map((dis) => (
          <div 
            key={`dis-${dis.id}`}
            onClick={() => setFocusedLocation(dis.location)}
            className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3 hover:bg-red-500/15 transition-all cursor-pointer group"
          >
            <div className="mt-1">
              {dis.type.includes('Thunder') || dis.type.includes('Storm') ? <CloudLightning className="w-4 h-4 text-blue-400" /> : 
               dis.type.includes('Traffic') ? <Car className="w-4 h-4 text-amber-500" /> : <AlertTriangle className="w-4 h-4 text-red-500" />}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200 uppercase tracking-tight">{dis.type}</p>
              <p className="text-[10px] text-slate-400 leading-tight mt-0.5 line-clamp-2">{dis.description || 'Impact detected on local corridor.'}</p>
            </div>
          </div>
        ))}

        {/* Risk Badges for Trucks */}
        {shipments.filter(s => (s.status !== 'On-Track' || (s.delay || 0) > 20)).map((ship) => (
          <div 
            key={`risk-${ship.id}`}
            onClick={() => setFocusedLocation(ship.location)}
            className={`p-3 bg-slate-800/80 rounded-lg border-l-4 ${ship.status === 'Critical' ? 'border-l-red-500' : 'border-l-amber-500'} text-sm hover:bg-slate-800 transition-all cursor-pointer group`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-200 uppercase text-xs">TRK-{ship.truck_id || ship.id}</span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                ship.status === 'Critical' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'
              }`}>
                {ship.status}
              </span>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-500">{ship.origin} → {ship.destination}</span>
              <span className="font-bold text-slate-300">+{ship.delay}m</span>
            </div>
          </div>
        ))}

        {disruptions.length === 0 && shipments.filter(s => s.status !== 'On-Track').length === 0 && (
          <div className="text-center py-10">
            <ShieldCheck className="w-8 h-8 text-slate-800 mx-auto mb-2 opacity-20" />
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">No Critical Risks Detected</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-4 bg-slate-800/80 backdrop-blur-md space-y-3">
        <button 
          onClick={onOpenAddTruckModal}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 text-sm border border-emerald-500/50"
        >
          <Truck className="w-4 h-4" />
          Add Simulation Truck
        </button>

        <button 
          onClick={handleRunOptimization}
          disabled={isScanning}
          className={`w-full ${isScanning ? 'bg-indigo-600 animate-pulse' : 'bg-blue-600 hover:bg-blue-500'} text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40 transform active:scale-95 group relative overflow-hidden`}
        >
          {isScanning ? (
            <>
              <div className="absolute inset-0 bg-white/20 animate-[shimmer_1s_infinite] translate-x-[-100%]" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)' }} />
              <Clock className="w-4 h-4 animate-spin" />
              Scanning Network...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 group-hover:animate-pulse" />
              Run AI Re-routing
            </>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
