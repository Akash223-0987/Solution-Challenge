import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Map from './components/Map';

function App() {
  const [focusedLocation, setFocusedLocation] = useState<[number, number] | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 font-sans antialiased text-slate-900">
      {/* Sidebar - Phase 1 & 3 */}
      <Sidebar setFocusedLocation={setFocusedLocation} isScanning={isScanning} setIsScanning={setIsScanning} />

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
              <p className="text-xs font-mono font-bold text-blue-400 leading-tight">14:52:03 IST</p>
            </div>
          </div>
        </header>

        {/* Map Container - The Heart (Phase 2) */}
        <div className="flex-1 bg-slate-200 relative">
          <Map focusedLocation={focusedLocation} isScanning={isScanning} />
        </div>
      </main>
    </div>
  );
}

export default App;
