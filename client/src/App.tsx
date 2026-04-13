import React from 'react';
import Sidebar from './components/Sidebar';
import Map from './components/Map';

function App() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans antialiased text-slate-900">
      {/* Sidebar - Phase 1 & 3 */}
      <Sidebar />

      {/* Main Content Area - Phase 1 & 2 */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {/* Top Header/Navbar for the map area */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">Fleet Intelligence Dashboard</h1>
            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Live</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right mr-2">
              <p className="text-xs text-slate-400 font-medium leading-none">Last Updated</p>
              <p className="text-xs font-bold text-slate-700 leading-tight">14:52:03 IST</p>
            </div>
          </div>
        </header>

        {/* Map Container - The Heart (Phase 2) */}
        <div className="flex-1 bg-slate-200 relative">
          <Map />
        </div>
      </main>
    </div>
  );
}

export default App;
