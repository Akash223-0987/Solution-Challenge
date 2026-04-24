import React, { useState } from 'react';
import {
  Train, Truck, AlertTriangle, Zap, Leaf, Clock,
  Star, X, CheckCircle, MapPin, ArrowRight, IndianRupee,
  Shield,
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

interface HubOption {
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

interface Suggestion {
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
  s === 'Critical' ? 'text-red-400 bg-red-500/10 border-red-500/30' :
  s === 'High'     ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' :
                     'text-blue-400 bg-blue-500/10 border-blue-500/30';

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
      className={`w-full text-left rounded-xl border p-3 transition-all duration-200 relative group ${
        isSelected
          ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.15)]'
          : 'border-slate-700 bg-slate-800/60 hover:border-slate-600 hover:bg-slate-800'
      }`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {option.isRecommended && (
            <span className="flex items-center gap-1 text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
              <Star className="w-2.5 h-2.5" /> AI Pick
            </span>
          )}
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
            isSelected ? 'text-indigo-300 bg-indigo-500/20 border-indigo-500/30' : 'text-slate-400 bg-slate-700/50 border-slate-600'
          }`}>
            OPT {option.rank}
          </span>
        </div>
        {isSelected && (
          <CheckCircle className="w-4 h-4 text-indigo-400 shrink-0" />
        )}
      </div>

      {/* Route */}
      <div className="flex items-center gap-1.5 mb-2.5">
        <Truck className="w-3 h-3 text-slate-400 shrink-0" />
        <span className="text-[10px] text-slate-300 font-medium truncate">{option.originHub}</span>
        <ArrowRight className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
        <Train className="w-3 h-3 text-indigo-400 shrink-0" />
        <span className="text-[10px] text-slate-300 font-medium truncate">{option.destHub}</span>
      </div>

      {/* Train info */}
      <div className="bg-slate-900/60 rounded-lg p-2 mb-2.5 border border-slate-700/50">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-sm">🚂</span>
          <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider">
            [{option.train.train_number}]
          </span>
        </div>
        <p className="text-[10px] text-slate-200 font-semibold leading-tight mb-1">
          {option.train.train_name}
        </p>
        <div className="flex gap-3 text-[9px] text-slate-400">
          <span>{option.train.train_operator}</span>
          <span className="font-mono text-amber-400">{option.train.wagon_type}</span>
          <span className="text-blue-400 font-bold">{option.train.avg_speed_kmh} km/h</span>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {/* Time */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-1.5 text-center">
          <Clock className="w-3 h-3 text-blue-400 mx-auto mb-0.5" />
          <p className="text-[10px] font-bold text-blue-400">{option.timeSavedHours}h</p>
          <p className="text-[8px] text-slate-500">saved</p>
        </div>
        {/* Cost */}
        <div className={`border rounded-lg p-1.5 text-center ${
          savingsPositive ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-700/30 border-slate-600/30'
        }`}>
          <IndianRupee className={`w-3 h-3 mx-auto mb-0.5 ${savingsPositive ? 'text-emerald-400' : 'text-slate-400'}`} />
          <p className={`text-[10px] font-bold ${savingsPositive ? 'text-emerald-400' : 'text-slate-400'}`}>
            {savingsPositive ? `₹${fmt(option.costSavingINR)}` : `+₹${fmt(Math.abs(option.costSavingINR))}`}
          </p>
          <p className="text-[8px] text-slate-500">{savingsPositive ? 'saved' : 'extra'}</p>
        </div>
        {/* CO₂ */}
        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-1.5 text-center">
          <Leaf className="w-3 h-3 text-green-400 mx-auto mb-0.5" />
          <p className="text-[10px] font-bold text-green-400">{option.co2SavingKg} kg</p>
          <p className="text-[8px] text-slate-500">CO₂ less</p>
        </div>
      </div>

      {/* Distance breakdown */}
      <div className="mt-2 flex items-center justify-center gap-1.5 text-[9px] text-slate-500">
        <span>🚛 {option.distToHubKm} km</span>
        <span className="text-slate-700">→</span>
        <span>🚂 {option.distRailLegKm} km rail</span>
        <span className="text-slate-700">→</span>
        <span>🚛 {option.distLastMileKm} km</span>
      </div>
    </button>
  );
};

// ── Sub-component: Shipment Suggestion Row ───────────────────────────────────

const SuggestionRow: React.FC<{
  suggestion: Suggestion;
  selectedHub: number; // index into hubOptions
  onSelectHub: (idx: number) => void;
}> = ({ suggestion, selectedHub, onSelectHub }) => {
  const [expanded, setExpanded] = useState(true);
  const chosen = suggestion.hubOptions[selectedHub];

  return (
    <div className="border border-slate-700/60 rounded-2xl overflow-hidden bg-slate-800/40">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full p-4 flex items-start gap-3 hover:bg-slate-700/20 transition-colors"
      >
        {/* Truck icon + status pulse */}
        <div className="relative shrink-0 mt-0.5">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            suggestion.currentStatus === 'Critical' ? 'bg-red-500/20' : 'bg-amber-500/20'
          }`}>
            <Truck className={`w-4 h-4 ${
              suggestion.currentStatus === 'Critical' ? 'text-red-400' : 'text-amber-400'
            }`} />
          </div>
          <div className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full animate-ping ${
            suggestion.currentStatus === 'Critical' ? 'bg-red-500' : 'bg-amber-500'
          }`} />
          <div className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${
            suggestion.currentStatus === 'Critical' ? 'bg-red-500' : 'bg-amber-500'
          }`} />
        </div>

        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-bold text-white text-sm">{suggestion.truckId}</span>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${severityColor(suggestion.currentStatus)}`}>
              {suggestion.currentStatus}
            </span>
            {suggestion.currentDelay > 0 && (
              <span className="text-[9px] text-red-400 font-bold">+{suggestion.currentDelay} min delay</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{suggestion.origin}</span>
            <ArrowRight className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">{suggestion.destination}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="text-[10px] text-amber-300">{suggestion.riskReason}</span>
          </div>
        </div>

        {/* Selected summary (collapsed view) */}
        {!expanded && chosen && (
          <div className="shrink-0 text-right">
            <p className="text-[9px] text-indigo-400 font-bold">{chosen.originHub}</p>
            <p className="text-[9px] text-slate-500">{chosen.train.train_number}</p>
          </div>
        )}
        <span className="text-slate-600 text-xs ml-1">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Expanded Hub Options */}
      {expanded && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-slate-700/60" />
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              Select Nearest Rail Hub
            </span>
            <div className="h-px flex-1 bg-slate-700/60" />
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
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
      )}
    </div>
  );
};

// ── Main Modal ───────────────────────────────────────────────────────────────

const GatiShaktiModal: React.FC<GatiShaktiModalProps> = ({
  isOpen, suggestions, onConfirm, onClose, isApplying
}) => {
  // Default: select the recommended (index 0) option per suggestion
  const [selections, setSelections] = useState<Record<number, number>>({});

  const getSelection = (idx: number) => selections[idx] ?? 0;

  const handleSelectHub = (suggIdx: number, hubIdx: number) => {
    setSelections(prev => ({ ...prev, [suggIdx]: hubIdx }));
  };

  // Aggregate savings across all selected options
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
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden animate-modal-fade-in">

        {/* ── Header ── */}
        <div className="shrink-0 bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border-b border-slate-700/60 p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                <Train className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg tracking-tight">
                  Gati Shakti Multimodal Intelligence
                </h2>
                <p className="text-slate-400 text-xs">
                  {suggestions.length} shipment{suggestions.length !== 1 ? 's' : ''} flagged — AI recommends rail transshipment
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Risk alert bar */}
          <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/25 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <p className="text-xs text-amber-300">
              <span className="font-bold">Delay / disruption detected</span> — Select a rail hub per shipment below,
              then click <span className="font-bold text-white">Apply Gati Shakti Routes</span>.
            </p>
          </div>
        </div>

        {/* ── Aggregate Savings Bar ── */}
        <div className="shrink-0 grid grid-cols-3 divide-x divide-slate-700/60 bg-slate-800/40 border-b border-slate-700/60">
          <div className="flex items-center gap-2.5 px-5 py-3">
            <Clock className="w-4 h-4 text-blue-400 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Time Saved</p>
              <p className="text-base font-bold text-blue-400">{Math.round(totalTimeSaved * 10) / 10} hrs</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 px-5 py-3">
            <IndianRupee className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Cost Saving</p>
              <p className={`text-base font-bold ${totalCostSaved >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {totalCostSaved >= 0 ? '+' : ''}₹{fmt(Math.abs(Math.round(totalCostSaved)))}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 px-5 py-3">
            <Leaf className="w-4 h-4 text-green-400 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">CO₂ Reduced</p>
              <p className="text-base font-bold text-green-400">{Math.round(totalCO2Saved)} kg</p>
            </div>
          </div>
        </div>

        {/* ── Suggestion Cards ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {suggestions.map((sug, idx) => (
            <SuggestionRow
              key={sug.shipmentId}
              suggestion={sug}
              selectedHub={getSelection(idx)}
              onSelectHub={(hubIdx) => handleSelectHub(idx, hubIdx)}
            />
          ))}
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 border-t border-slate-700/60 bg-slate-900/80 px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span>Powered by <span className="text-indigo-400 font-semibold">PM Gati Shakti Master Plan</span> · DFCC Logistics Grid</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isApplying}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              Keep Road Routes
            </button>
            <button
              onClick={onConfirm}
              disabled={isApplying}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-bold transition-all duration-200 shadow-lg shadow-indigo-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isApplying ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Applying Routes…
                </>
              ) : (
                <>
                  <Train className="w-4 h-4" />
                  Apply Gati Shakti Routes
                  <Zap className="w-3.5 h-3.5 text-yellow-300" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GatiShaktiModal;
