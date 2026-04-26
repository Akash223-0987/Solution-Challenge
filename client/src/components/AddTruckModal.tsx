import React, { useState } from 'react';
import { Truck, Weight, MapPin, Calendar, Mountain, Anchor, Navigation, Loader2 } from 'lucide-react';
import { CITIES } from '../data/cities';

interface AddTruckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TERRAIN_TYPES = ['Highway', 'Mountainous', 'Urban', 'Flat', 'Hilly'];
const BASE = import.meta.env.VITE_API_URL;

const INITIAL_FORM = {
  truckNumber: '',
  startLocation: '',
  destination: '',
  scheduledTime: new Date().toISOString().slice(0, 16),
  weight: 15.0,
  terrainType: 'Highway'
};

export default function AddTruckModal({ isOpen, onClose }: AddTruckModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);

  // Reset form AND close — used for both Discard and X buttons
  const handleClose = () => {
    setFormData({ ...INITIAL_FORM, scheduledTime: new Date().toISOString().slice(0, 16) });
    onClose();
  };

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'weight' ? parseFloat(value) : value 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // We send the data to our backend which handles:
      // 1. Geocoding city names to coordinates
      // 2. Fetching real road route from OSRM
      // 3. AI Risk Scoring via OpenRouter
      // 4. Final insertion into Supabase
      const response = await fetch(`${BASE}/api/shipments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          truck_id: formData.truckNumber,
          origin: formData.startLocation,
          destination: formData.destination,
          weight: formData.weight,
          terrain_type: formData.terrainType,
          // We let the backend calculate location and route if not provided
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to create simulation truck');
      }

      const result = await response.json();
      console.log('Successfully added truck:', result);
      
      // Reset form and close modal
      setFormData({ ...INITIAL_FORM, scheduledTime: new Date().toISOString().slice(0, 16) });
      onClose();
    } catch (error: any) {
      console.error('Error adding truck:', error);
      alert(`Failed to add truck: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md transition-all duration-300">
      <div 
        className="w-full max-w-xl p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 bg-slate-900/90 backdrop-blur-2xl animate-modal-fade-in relative overflow-hidden"
      >
        {/* Background Decorative Gradient */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full -ml-16 -mb-16"></div>

        <div className="flex justify-between items-center mb-8 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 rounded-2xl border border-emerald-500/30">
              <Truck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Deploy Simulation</h2>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">New Fleet Asset</p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="relative z-10 grid grid-cols-2 gap-6">
          <div className="col-span-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2 ml-1">
              <Anchor className="w-4 h-4 text-emerald-500" />
              Truck ID / Number
            </label>
            <input 
              required
              type="text" 
              name="truckNumber"
              value={formData.truckNumber}
              onChange={handleChange}
              placeholder="e.g. MH-12-AB-1234"
              className="w-full px-5 py-3.5 bg-slate-950/50 border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all shadow-inner font-mono tracking-wider"
            />
          </div>

          <div className="col-span-1">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2 ml-1">
              <MapPin className="w-4 h-4 text-blue-500" />
              Origin City
            </label>
            <input 
              required
              list="cities"
              type="text" 
              name="startLocation"
              value={formData.startLocation}
              onChange={handleChange}
              placeholder="Mumbai"
              className="w-full px-5 py-3.5 bg-slate-950/50 border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner"
            />
          </div>

          <div className="col-span-1">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2 ml-1">
              <Navigation className="w-4 h-4 text-indigo-500" />
              Destination
            </label>
            <input 
              required
              list="cities"
              type="text" 
              name="destination"
              value={formData.destination}
              onChange={handleChange}
              placeholder="Delhi"
              className="w-full px-5 py-3.5 bg-slate-950/50 border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-inner"
            />
          </div>

          <p className="col-span-2 text-[10px] text-slate-500 italic -mt-4 ml-1">
            * 100+ Indian cities supported including Metros, Tier-2 hubs, and Special Economic Zones.
          </p>

          <datalist id="cities">
            {CITIES.map(city => (
              <option key={city} value={city} />
            ))}
          </datalist>

          <div className="col-span-1">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2 ml-1">
              <Weight className="w-4 h-4 text-amber-500" />
              Payload (Tons)
            </label>
            <input 
              required
              type="number" 
              step="0.1"
              name="weight"
              value={formData.weight}
              onChange={handleChange}
              className="w-full px-5 py-3.5 bg-slate-950/50 border border-slate-700/50 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all shadow-inner"
            />
          </div>

          <div className="col-span-1">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2 ml-1">
              <Mountain className="w-4 h-4 text-rose-500" />
              Terrain Type
            </label>
            <select 
              name="terrainType"
              value={formData.terrainType}
              onChange={handleChange as any}
              className="w-full px-5 py-3.5 bg-slate-950/50 border border-slate-700/50 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all shadow-inner appearance-none relative cursor-pointer"
            >
              {TERRAIN_TYPES.map(type => (
                <option key={type} value={type} className="bg-slate-900">{type}</option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2 ml-1">
              <Calendar className="w-4 h-4 text-purple-500" />
              Scheduled Deployment
            </label>
            <input 
              required
              type="datetime-local" 
              name="scheduledTime"
              value={formData.scheduledTime}
              onChange={handleChange}
              className="w-full px-5 py-3.5 bg-slate-950/50 border border-slate-700/50 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all shadow-inner [color-scheme:dark]"
            />
          </div>
          
          <div className="col-span-2 mt-4 flex items-center gap-4">
            <button 
              type="button" 
              onClick={handleClose}
              className="flex-1 px-6 py-4 rounded-2xl text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-slate-700 transition-all"
            >
              Discard
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-[2] px-6 py-4 rounded-2xl text-sm font-bold text-slate-900 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_10px_30px_rgba(16,185,129,0.3)] hover:shadow-[0_15px_35px_rgba(16,185,129,0.5)] transform hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Route...
                </>
              ) : (
                <>
                  <Navigation className="w-5 h-5" />
                  Deploy to Real-Time Map
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
