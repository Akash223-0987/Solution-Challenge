import React from 'react';
import { Truck, AlertTriangle, Clock, Zap, CloudLightning, Car, Anchor, Info, ShieldCheck } from 'lucide-react';

interface SidebarProps {
  setFocusedLocation: (loc: [number, number] | null) => void;
  isScanning: boolean;
  setIsScanning: (scanning: boolean) => void;
  onOpenAddTruckModal: () => void;
}

// Real Indian logistics routes between major cities
const INDIA_ROUTES = [
  { origin: 'Mumbai', destination: 'Delhi',        start: [19.0760, 72.8777], end: [28.6139, 77.2090], via: [21.1458, 75.7935], terrain: 'Highway',      weight: () => 12 + Math.random() * 10 },
  { origin: 'Mumbai', destination: 'Pune',         start: [19.0760, 72.8777], end: [18.5204, 73.8567], via: [18.7645, 73.4047], terrain: 'Mountainous', weight: () => 16 + Math.random() * 12 },
  { origin: 'Delhi',  destination: 'Jaipur',       start: [28.6139, 77.2090], end: [26.9124, 75.7873], via: [27.8000, 76.5600], terrain: 'Highway',      weight: () => 8  + Math.random() * 8  },
  { origin: 'Delhi',  destination: 'Lucknow',      start: [28.6139, 77.2090], end: [26.8467, 80.9462], via: [27.5706, 79.4800], terrain: 'Highway',      weight: () => 14 + Math.random() * 10 },
  { origin: 'Bengaluru', destination: 'Chennai',   start: [12.9716, 77.5946], end: [13.0827, 80.2707], via: [12.8340, 78.9600], terrain: 'Flat',         weight: () => 10 + Math.random() * 8  },
  { origin: 'Bengaluru', destination: 'Hyderabad', start: [12.9716, 77.5946], end: [17.3850, 78.4867], via: [14.8700, 78.2200], terrain: 'Mountainous', weight: () => 18 + Math.random() * 14 },
  { origin: 'Nagpur',    destination: 'Hyderabad', start: [21.1458, 79.0882], end: [17.3850, 78.4867], via: [19.4400, 78.8000], terrain: 'Flat',         weight: () => 10 + Math.random() * 8  },
  { origin: 'Kolkata',   destination: 'Patna',     start: [22.5726, 88.3639], end: [25.5941, 85.1376], via: [24.1000, 86.9000], terrain: 'Flat',         weight: () => 9  + Math.random() * 7  },
  { origin: 'Mumbai',    destination: 'Nagpur',    start: [19.0760, 72.8777], end: [21.1458, 79.0882], via: [20.3000, 76.5600], terrain: 'Highway',      weight: () => 22 + Math.random() * 8  },
  { origin: 'Chennai',   destination: 'Kolkata',   start: [13.0827, 80.2707], end: [22.5726, 88.3639], via: [17.6868, 83.2185], terrain: 'Coastal',      weight: () => 15 + Math.random() * 10 },
];

const Sidebar: React.FC<SidebarProps> = ({ setFocusedLocation, isScanning, setIsScanning, onOpenAddTruckModal }) => {
  const [aiExplanation, setAiExplanation] = React.useState<string | null>(null);
  const [shipments, setShipments] = React.useState<any[]>([]);

  React.useEffect(() => {
    const fetchShipments = async () => {
      try {
        const res = await fetch('http://localhost:8081/api/shipments');
        const data = await res.json();
        setShipments(data);
      } catch (err) {
        console.error('Failed to fetch shipments:', err);
      }
    };
    fetchShipments();
    const interval = setInterval(fetchShipments, 5000);
    return () => clearInterval(interval);
  }, []);

  const alerts = [
    { id: 1, message: "Heavy Rain near Vijayawada - Potential 2-hour delay.", type: "warning", location: [16.5062, 80.6480] as [number, number], icon: <CloudLightning className="w-4 h-4 text-blue-400" /> },
    { id: 2, message: "NH48 Traffic Bottleneck near Pune - Slow current speed.", type: "info", location: [18.5204, 73.8567] as [number, number], icon: <Car className="w-4 h-4 text-amber-400" /> },
    { id: 3, message: "Port Bottleneck at Kolkata: SHIP-003 delayed", type: "critical", location: [22.5726, 88.3639] as [number, number], icon: <Anchor className="w-4 h-4 text-red-500" /> },
  ];

  const handleAlertClick = (location: [number, number]) => {
    setFocusedLocation(location);
  };

  const handleRunOptimization = async () => {
    if (isScanning) return;
    setIsScanning(true);
    
    try {
      const response = await fetch('http://localhost:8081/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentId: 'ALL' })
      });
      const data = await response.json();
      console.log('AI Optimization Result:', data.message);
      
      if (data.success) {
        setAiExplanation(data.aiExplanation);
        // Map.tsx is now auto-polling, so it will update on its own without needing a hard reload!
      }
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      // Keep scanning effect for a moment for UX
      setTimeout(() => {
        setIsScanning(false);
      }, 2000);
    }
  };

  return (
    <aside className="w-80 h-screen bg-slate-900 text-slate-100 flex flex-col border-r border-slate-700 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          AETHERLOG
        </h2>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">India Fleet Monitoring</p>
      </div>

      {/* Stats Cards */}
      <div className="p-4 grid grid-cols-1 gap-3">
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 hover:border-blue-500 transition-colors group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm font-medium">Active Shipments</span>
            <Truck className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold">12</p>
        </div>

        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 hover:border-red-500 transition-colors group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm font-medium">At Risk</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-500">2</p>
        </div>

        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 hover:border-emerald-500 transition-colors group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm font-medium">Avg. Delay</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold">14 <span className="text-sm font-normal text-slate-400 ml-1">mins</span></p>
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
        
        {/* Risk Badges for Trucks */}
        {shipments.filter(s => s.status !== 'On-Track').map((ship) => (
          <div 
            key={ship.id}
            onClick={() => setFocusedLocation(ship.location)}
            className="p-3 bg-slate-800/80 rounded-lg border-l-4 border-l-red-500 text-sm hover:bg-slate-800 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-200">{ship.truck_id}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                ship.status === 'Critical' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'
              }`}>
                {ship.status === 'Critical' ? '🔴 Critical' : '🟡 Medium'} Risk
              </span>
            </div>
            <div className="text-xs text-slate-400">
              Diverting ${ship.origin} → ${ship.destination}
            </div>
          </div>
        ))}

        {alerts.map((alert) => (
          <div 
            key={alert.id} 
            onClick={() => handleAlertClick(alert.location)}
            className="p-3 bg-slate-800/30 rounded-lg border-l-4 border-l-slate-700 text-sm hover:bg-slate-800 transition-all cursor-pointer flex items-start gap-3 opacity-70"
          >
            <div className="mt-0.5 shrink-0">
              {alert.icon}
            </div>
            <div className="text-slate-400 leading-snug">
              {alert.message}
            </div>
          </div>
        ))}
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
