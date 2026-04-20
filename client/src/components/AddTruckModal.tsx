import React, { useState } from 'react';

interface AddTruckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddTruckModal({ isOpen, onClose }: AddTruckModalProps) {
  const [formData, setFormData] = useState({
    truckNumber: '',
    startLocation: '',
    destination: '',
    scheduledTime: ''
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('New Simulation Truck Data:', formData);
    // Reset form and close modal
    setFormData({ truckNumber: '', startLocation: '', destination: '', scheduledTime: '' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm transition-opacity">
      <div 
        className="w-full max-w-md p-6 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-white/10 bg-slate-900/70 backdrop-blur-xl animate-modal-fade-in"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white tracking-tight">Add Simulation Truck</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Truck Number</label>
            <input 
              required
              type="text" 
              name="truckNumber"
              value={formData.truckNumber}
              onChange={handleChange}
              placeholder="e.g. MH-12-AB-1234"
              className="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all shadow-inner"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Load Start Location</label>
            <input 
              required
              type="text" 
              name="startLocation"
              value={formData.startLocation}
              onChange={handleChange}
              placeholder="e.g. Mumbai Port"
              className="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all shadow-inner"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Destination</label>
            <input 
              required
              type="text" 
              name="destination"
              value={formData.destination}
              onChange={handleChange}
              placeholder="e.g. Delhi Hub"
              className="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all shadow-inner"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Scheduled Time</label>
            <input 
              required
              type="datetime-local" 
              name="scheduledTime"
              value={formData.scheduledTime}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all shadow-inner [color-scheme:dark]"
            />
          </div>
          
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-700/50">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-900 bg-emerald-500 hover:bg-emerald-400 focus:ring-2 focus:ring-emerald-500/50 focus:outline-none transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Add Simulation Truck
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
