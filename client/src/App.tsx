import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Map from './components/Map';
import AddTruckModal from './components/AddTruckModal';
import HeroSection from './components/HeroSection';
import AuthPage from './components/AuthPage';

function App() {
  const [showHero, setShowHero] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [focusedLocation, setFocusedLocation] = useState<[number, number] | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isAddTruckModalOpen, setIsAddTruckModalOpen] = useState(false);

  if (showAuth) {
    return <AuthPage onBack={() => setShowAuth(false)} onLoginSuccess={() => { setShowAuth(false); setShowHero(false); }} />;
  }

  if (showHero) {
    return <HeroSection onEnterDashboard={() => setShowHero(false)} onOpenAuth={() => setShowAuth(true)} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 font-sans antialiased text-slate-900">
      <Sidebar
        setFocusedLocation={setFocusedLocation}
        isScanning={isScanning}
        setIsScanning={setIsScanning}
        onOpenAddTruckModal={() => setIsAddTruckModalOpen(true)}
      />

      <main className="flex-1 relative overflow-hidden flex flex-col">
        <header className="h-14 bg-slate-900 border-b border-slate-700/60 flex items-center justify-between px-6 z-20 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowHero(true)}
              className="text-slate-400 hover:text-white text-xs font-mono transition-colors"
            >← Hero</button>
            <h1 className="text-lg font-bold text-white tracking-tight">AetherLog Intelligence</h1>
            <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border border-emerald-500/30">Live Fleet</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right mr-2">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1">Last Updated</p>
              <p className="text-xs font-mono font-bold text-blue-400 leading-tight">
                {new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' })} IST
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 bg-slate-200 relative">
          <Map focusedLocation={focusedLocation} isScanning={isScanning} />
        </div>
      </main>

      <AddTruckModal
        isOpen={isAddTruckModalOpen}
        onClose={() => setIsAddTruckModalOpen(false)}
      />
    </div>
  );
}

export default App;
