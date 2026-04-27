import React, { useState } from 'react';
import {
  Train, Truck, AlertTriangle, Zap, Leaf, Clock,
  Star, X, CheckCircle, MapPin, IndianRupee,
  Shield, ChevronRight, Activity
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface TrainInfo {
  train_number: string;
  train_name: string;
  train_operator: string;
  commodity_type: string;
  avg_speed_kmh: number;
  wagon_type: string;
}

export interface HubOption {
  rank: number;
  isRecommended: boolean;
  originHub: string;
  destHub: string;
  distToHubKm: number;
  distRailLegKm: number;
  distLastMileKm: number;
  train: TrainInfo;
  totalEtaHours: number;
  timeSavedHours: number;
  roadCostINR: number;
  multimodalCostINR: number;
  costSavingINR: number;
  roadCO2Kg: number;
  multimodalCO2Kg: number;
  co2SavingKg: number;
}

export interface Suggestion {
  shipmentId: string | number;
  truckId: string;
  origin: string;
  destination: string;
  currentStatus: string;
  currentDelay: number;
  riskReason: string;
  disruptionType: string | null;
  disruptionSeverity: string | null;
  hubOptions: HubOption[];
}

interface GatiShaktiModalProps {
  isOpen: boolean;
  suggestions: Suggestion[];
  onConfirm: () => void;
  onClose: () => void;
  isApplying: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('en-IN');
const severityColor = (s: string | null) =>
  s === 'Critical' ? 'text-red-400 border-red-500/30 bg-red-500/10' :
  s === 'High'     ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' :
                     'text-[#00E5A0] border-[#00E5A0]/30 bg-[#00E5A0]/10';

// ── Sub-component: Hub Option Card ───────────────────────────────────────────

const HubCard: React.FC<{
  option: HubOption;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ option, isSelected, onSelect }) => {
  const savingsPositive = option.costSavingINR > 0;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-2xl border transition-all duration-300 relative overflow-hidden group ${
        isSelected
          ? 'border-[#00E5A0] bg-[#00E5A0]/10 shadow-[0_0_30px_rgba(0,229,160,0.1)]'
          : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
      }`}
    >
      {/* Selection Glow */}
      {isSelected && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#00E5A0]/20 blur-3xl rounded-full -mr-12 -mt-12 animate-pulse" />
      )}

      <div className="p-4 relative z-10">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
              isSelected ? 'bg-[#00E5A0] text-black border-[#00E5A0]' : 'bg-white/5 text-white/40 border-white/10'
            }`}>
              Option {option.rank}
            </div>
            {option.isRecommended && (
              <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-400">
                <Star className="w-3 h-3 fill-amber-400" />
                AI Pick
              </div>
            )}
          </div>
          {isSelected && <CheckCircle className="w-5 h-5 text-[#00E5A0]" />}
        </div>

        {/* Train Identifier */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Train className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <span className="text-[10px] font-black text-white uppercase tracking-widest">{option.train.train_number}</span>
          </div>
          <p className="text-xs font-bold text-white leading-tight truncate">{option.train.train_name}</p>
          <div className="text-[10px] text-white/30 mt-1 flex gap-2 font-medium">
            <span>{option.train.avg_speed_kmh} km/h</span>
            <span className="text-white/10">•</span>
            <span>{option.train.wagon_type}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 py-3 border-t border-white/5">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[9px] font-bold text-white/30 uppercase tracking-tighter">
              <Clock className="w-2.5 h-2.5" />
              Time
            </div>
            <p className="text-sm font-black text-blue-400">-{option.timeSavedHours}h</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[9px] font-bold text-white/30 uppercase tracking-tighter">
              <IndianRupee className="w-2.5 h-2.5" />
              Saving
            </div>
            <p className={`text-sm font-black ${savingsPositive ? 'text-[#00E5A0]' : 'text-white/60'}`}>
              {savingsPositive ? `₹${fmt(Math.round(option.costSavingINR))}` : '0'}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[9px] font-bold text-white/30 uppercase tracking-tighter">
              <Leaf className="w-2.5 h-2.5" />
              Carbon
            </div>
            <p className="text-sm font-black text-green-400">-{option.co2SavingKg}kg</p>
          </div>
        </div>

        {/* Visual Route */}
        <div className="mt-3 pt-3 border-t border-white/5">
          <div className="flex items-center justify-between px-1">
             <div className="flex flex-col items-center">
                <Truck className="w-3 h-3 text-white/20 mb-1" />
                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
             </div>
             <div className="flex-1 h-px bg-gradient-to-r from-white/10 via-blue-500/40 to-white/10 mx-2" />
             <div className="flex flex-col items-center">
                <Train className="w-3 h-3 text-blue-400 mb-1" />
                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
             </div>
             <div className="flex-1 h-px bg-gradient-to-r from-white/10 via-white/10 to-white/10 mx-2" />
             <div className="flex flex-col items-center">
                <Truck className="w-3 h-3 text-white/20 mb-1" />
                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
             </div>
          </div>
          <div className="flex justify-between text-[8px] font-bold text-white/20 uppercase tracking-widest mt-2">
            <span>{option.distToHubKm}km</span>
            <span className="text-blue-400/60">{option.distRailLegKm}km rail</span>
            <span>{option.distLastMileKm}km</span>
          </div>
        </div>
      </div>
    </button>
  );
};

// ── Sub-component: Shipment Suggestion Row ───────────────────────────────────

const SuggestionRow: React.FC<{
  suggestion: Suggestion;
  selectedHub: number;
  onSelectHub: (idx: number) => void;
}> = ({ suggestion, selectedHub, onSelectHub }) => {

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden mb-6 backdrop-blur-xl">
      {/* Top Banner (Status) */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-white/[0.01]">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              suggestion.currentStatus === 'Critical' ? 'bg-red-500/10 border border-red-500/20' : 'bg-amber-500/10 border border-amber-500/20'
            }`}>
              <Truck className={`w-5 h-5 ${suggestion.currentStatus === 'Critical' ? 'text-red-400' : 'text-amber-400'}`} />
            </div>
            <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-black ${
              suggestion.currentStatus === 'Critical' ? 'bg-red-500 animate-pulse' : 'bg-amber-500'
            }`} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-base font-black text-white">{suggestion.truckId}</h3>
              <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${severityColor(suggestion.currentStatus)}`}>
                {suggestion.currentStatus}
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-white/30 font-bold uppercase tracking-wider mt-0.5">
              <MapPin className="w-3 h-3" />
              {suggestion.origin} <ChevronRight className="w-2.5 h-2.5" /> {suggestion.destination}
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="flex items-center gap-2 text-amber-400 mb-0.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="text-xs font-black uppercase tracking-tighter">{suggestion.riskReason}</span>
          </div>
          <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest leading-none">
            Delayed by {suggestion.currentDelay} min
          </p>
        </div>
      </div>

      {/* Grid of Options */}
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-4 h-4 text-[#00E5A0]" />
          <span className="text-[10px] font-black text-[#00E5A0] uppercase tracking-[0.2em]">Intermodal Route Options</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {suggestion.hubOptions.map((opt, idx) => (
            <HubCard
              key={opt.originHub}
              option={opt}
              isSelected={selectedHub === idx}
              onSelect={() => onSelectHub(idx)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Main Modal ───────────────────────────────────────────────────────────────

const GatiShaktiModal: React.FC<GatiShaktiModalProps> = ({
  isOpen, suggestions, onConfirm, onClose, isApplying
}) => {
  const [selections, setSelections] = useState<Record<number, number>>({});

  const getSelection = (idx: number) => selections[idx] ?? 0;

  const handleSelectHub = (suggIdx: number, hubIdx: number) => {
    setSelections(prev => ({ ...prev, [suggIdx]: hubIdx }));
  };

  const totalTimeSaved = suggestions.reduce((sum, s, idx) => {
    const opt = s.hubOptions[getSelection(idx)];
    return sum + (opt?.timeSavedHours || 0);
  }, 0);
  const totalCostSaved = suggestions.reduce((sum, s, idx) => {
    const opt = s.hubOptions[getSelection(idx)];
    return sum + (opt?.costSavingINR || 0);
  }, 0);
  const totalCO2Saved = suggestions.reduce((sum, s, idx) => {
    const opt = s.hubOptions[getSelection(idx)];
    return sum + (opt?.co2SavingKg || 0);
  }, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 md:p-8">
      {/* Cinematic Backdrop */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-2xl"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-5xl h-full max-h-[850px] flex flex-col bg-[#050505] border border-white/10 rounded-[40px] shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden animate-modal-fade-in">
        
        {/* Header Section */}
        <div className="p-8 border-b border-white/5 relative shrink-0">
          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00E5A0] to-blue-600 p-[1px] shadow-[0_0_30px_rgba(0,229,160,0.2)]">
                <div className="w-full h-full bg-black rounded-2xl flex items-center justify-center">
                  <Train className="w-7 h-7 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-3xl font-black text-white tracking-tight leading-none mb-2 uppercase">
                  Gati Shakti <span className="text-[#00E5A0]">Intelligence</span>
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-white/30 font-bold uppercase tracking-[0.3em]">Operational Directive</span>
                  <div className="w-1 h-1 rounded-full bg-white/20" />
                  <span className="text-[10px] text-[#00E5A0] font-black uppercase tracking-[0.2em] animate-pulse">AI Optimization Ready</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 rounded-full hover:bg-white/5 transition-colors text-white/20 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Intelligence Briefing Bar */}
          <div className="mt-8 grid grid-cols-3 gap-6">
            <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4 flex items-center gap-4 group hover:border-blue-500/30 transition-all">
               <div className="p-3 bg-blue-500/10 rounded-xl">
                 <Clock className="w-5 h-5 text-blue-400" />
               </div>
               <div>
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Time Recovery</p>
                  <p className="text-xl font-black text-blue-400">{Math.round(totalTimeSaved * 10) / 10} <span className="text-xs font-bold text-blue-400/40">HRS</span></p>
               </div>
            </div>
            <div className="bg-[#00E5A0]/5 border border-[#00E5A0]/10 rounded-2xl p-4 flex items-center gap-4 group hover:border-[#00E5A0]/30 transition-all">
               <div className="p-3 bg-[#00E5A0]/10 rounded-xl">
                 <IndianRupee className="w-5 h-5 text-[#00E5A0]" />
               </div>
               <div>
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Cost Savings</p>
                  <p className={`text-xl font-black ${totalCostSaved >= 0 ? 'text-[#00E5A0]' : 'text-red-400'}`}>
                    {totalCostSaved >= 0 ? '+' : ''}₹{fmt(Math.abs(Math.round(totalCostSaved)))}
                  </p>
               </div>
            </div>
            <div className="bg-green-500/5 border border-green-500/10 rounded-2xl p-4 flex items-center gap-4 group hover:border-green-500/30 transition-all">
               <div className="p-3 bg-green-500/10 rounded-xl">
                 <Leaf className="w-5 h-5 text-green-400" />
               </div>
               <div>
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Carbon Credit</p>
                  <p className="text-xl font-black text-green-400">{Math.round(totalCO2Saved)} <span className="text-xs font-bold text-green-400/40">KG</span></p>
               </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[radial-gradient(circle_at_top_right,rgba(0,229,160,0.02),transparent)]">
          {suggestions.map((sug, idx) => (
            <SuggestionRow
              key={sug.shipmentId}
              suggestion={sug}
              selectedHub={getSelection(idx)}
              onSelectHub={(hubIdx) => handleSelectHub(idx, hubIdx)}
            />
          ))}
        </div>

        {/* Action Footer */}
        <div className="p-8 border-t border-white/5 bg-black/50 backdrop-blur-xl flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
             <Shield className="w-5 h-5 text-[#00E5A0]" />
             <div>
                <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none mb-1">Secure Protocol</p>
                <p className="text-[9px] text-white/20 font-bold uppercase tracking-wider">PM Gati Shakti Master Plan Integration</p>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              disabled={isApplying}
              className="px-8 py-4 rounded-2xl text-xs font-black text-white/40 uppercase tracking-widest hover:text-white transition-all disabled:opacity-30"
            >
              Maintain Road Ops
            </button>
            <button
              onClick={onConfirm}
              disabled={isApplying}
              className="group relative px-10 py-4 rounded-2xl bg-[#00E5A0] text-black text-xs font-black uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_20px_50px_rgba(0,229,160,0.3)]"
            >
              {isApplying ? (
                <div className="flex items-center gap-3">
                   <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                   Executing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                   Apply Multimodal Shift
                   <Zap className="w-4 h-4" />
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GatiShaktiModal;
