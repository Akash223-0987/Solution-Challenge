import React, { useState } from 'react';
import { Truck, Weight, MapPin, Calendar, Mountain, Anchor, Navigation, Loader2 } from 'lucide-react';
import { CITIES } from '../data/cities';
import { supabase } from '../lib/supabase';

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

  const deployPreset = async (preset: any) => {
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user_id = session?.user?.id;

      const response = await fetch(`${BASE}/api/shipments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          truck_id: preset.id,
          origin: preset.from,
          destination: preset.to,
          weight: 20.0,
          terrain_type: 'Highway',
          user_id: user_id,
          forcedStatus: preset.status,
          forcedType: preset.type,
          forcedDelay: preset.status === 'Critical' ? 120 : (preset.status === 'At Risk' ? 45 : 0)
        }),
      });

      if (!response.ok) throw new Error('Failed to deploy preset');
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to deploy demo preset');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user_id = session?.user?.id;

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
          user_id: user_id,
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to add truck';
      console.error('Error adding truck:', error);
      alert(`Failed to add truck: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/90 backdrop-blur-md transition-all duration-300">
      <div 
        className="w-full max-w-xl p-8 rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.8)] border border-white/10 bg-[#0A0A0A] backdrop-blur-2xl animate-modal-fade-in relative overflow-hidden"
      >
        {/* Background Decorative Gradient */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00E5A0]/10 blur-3xl rounded-full -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full -ml-16 -mb-16"></div>

        <div className="flex justify-between items-center mb-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#00E5A0]/10 rounded-2xl border border-[#00E5A0]/20">
              <Truck className="w-6 h-6 text-[#00E5A0]" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Deploy Asset</h2>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]">India Fleet OS</p>
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

        {/* HACKATHON DEMO PRESETS */}
        <div className="mb-8 relative z-10">
          <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-3 ml-1">Hackathon Demo Presets</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'GQ-MUM-DEL', label: 'Golden Quad', from: 'Mumbai', to: 'Delhi', status: 'On-Track', type: 'Nominal', color: 'bg-[#00E5A0]' },
              { id: 'GS-CH-VIZ', label: 'Coastal Link', from: 'Chennai', to: 'Visakhapatnam', status: 'On-Track', type: 'Nominal', color: 'bg-[#00E5A0]' },
              { id: 'SC-KOL-GUW', label: 'Siliguri Corridor', from: 'Kolkata', to: 'Guwahati', status: 'Critical', type: 'Landslide', color: 'bg-red-500' },
              { id: 'IS-DEL-BEN', label: 'Industrial Spine', from: 'Delhi', to: 'Bengaluru', status: 'At Risk', type: 'Traffic Gridlock', color: 'bg-amber-500' },
              { id: 'EL-NAG-MUM', label: 'Energy Hub', from: 'Nagpur', to: 'Mumbai', status: 'Critical', type: 'Highway Blockade', color: 'bg-red-500' },
            ].map(preset => (
              <button
                key={preset.id}
                type="button"
                disabled={isSubmitting}
                onClick={() => deployPreset(preset)}
                className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 hover:border-white/20 rounded-xl transition-all group"
              >
                <div className={`w-1.5 h-1.5 rounded-full ${preset.color} shadow-[0_0_8px_rgba(0,0,0,0.5)]`} />
                <span className="text-[10px] font-bold text-white/60 group-hover:text-white transition-colors">{preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-white/5 w-full mb-8 relative z-10" />
        
        <form onSubmit={handleSubmit} className="relative z-10 grid grid-cols-2 gap-6">
          <div className="col-span-2">
            <label className="flex items-center gap-2 text-xs font-bold text-white/50 uppercase tracking-widest mb-2 ml-1">
              <Anchor className="w-4 h-4 text-[#00E5A0]" />
              Truck ID / Number
            </label>
            <input 
              required
              type="text" 
              name="truckNumber"
              value={formData.truckNumber}
              onChange={handleChange}
              placeholder="e.g. MH-12-AB-1234"
              className="w-full px-5 py-3.5 bg-black/50 border border-white/10 rounded-2xl text-white placeholder-white/10 focus:outline-none focus:ring-2 focus:ring-[#00E5A0]/30 focus:border-[#00E5A0]/30 transition-all font-mono tracking-wider"
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
              className="w-full px-5 py-3.5 bg-black/50 border border-white/10 rounded-2xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 transition-all shadow-inner"
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
              className="w-full px-5 py-3.5 bg-black/50 border border-white/10 rounded-2xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/30 transition-all shadow-inner"
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
              className="w-full px-5 py-3.5 bg-black/50 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all shadow-inner"
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
              onChange={handleChange}
              className="w-full px-5 py-3.5 bg-black/50 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500/30 transition-all shadow-inner appearance-none relative cursor-pointer"
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
              className="w-full px-5 py-3.5 bg-black/50 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all shadow-inner [color-scheme:dark]"
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
