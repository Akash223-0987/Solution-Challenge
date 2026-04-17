import React from 'react';
import { Truck, AlertTriangle, Clock, Zap } from 'lucide-react';

const Sidebar = () => {
  const alerts = [
    { id: 1, message: "Heavy Rain near Vijayawada - Potential 2-hour delay.", type: "warning" },
    { id: 2, message: "NH48 Traffic Bottleneck near Pune - Slow current speed.", type: "info" },
    { id: 3, message: "Driver Break Overdue: SHIP-002", type: "critical" },
  ];

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

      {/* Disruption Feed */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2 sticky top-0 bg-slate-900 py-2">
          Disruption Feed
        </h3>
        {alerts.map((alert) => (
          <div key={alert.id} className="p-3 bg-slate-800/50 rounded-lg border-l-4 border-l-amber-500 text-sm hover:bg-slate-800 transition-all cursor-pointer">
            {alert.message}
          </div>
        ))}
      </div>

      {/* Action Button */}
      <div className="p-4 bg-slate-800/80 backdrop-blur-md">
        <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40 transform active:scale-95 group">
          <Zap className="w-4 h-4 group-hover:animate-pulse" />
          Run AI Re-routing
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
