import React from 'react';
import { User } from 'firebase/auth';
import { ShipState, ActiveAlarm, getStressBarWidth } from '../lib/types';
import { X, AlertTriangle, LogOut } from 'lucide-react';
import { ShipRadar } from './ShipRadar';

interface ShipStatusSidebarProps {
  showSidebar: boolean;
  setShowSidebar: (show: boolean) => void;
  shipState: ShipState | null;
  activeAlarms: ActiveAlarm[];
  isCloudMode: boolean;
  activeModel: string;
  user: User | null;
  handleSignOut: () => void;
}

export function ShipStatusSidebar({
  showSidebar,
  setShowSidebar,
  shipState,
  activeAlarms,
  isCloudMode,
  activeModel,
  user,
  handleSignOut
}: ShipStatusSidebarProps) {
  return (
    <aside
      className={`fixed md:static inset-y-0 left-0 w-72 md:w-64 z-40 border-r border-cyan-900/20 bg-[#050507] md:bg-black/20 p-6 flex flex-col gap-6 overflow-y-auto transition-transform duration-200 ${
        showSidebar ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0`}
    >
      {/* Mobile close button */}
      <div className="md:hidden flex justify-between items-center -mt-2">
        <span className="text-[10px] text-cyan-500/60 uppercase tracking-widest font-bold">Ship Status</span>
        <button
          onClick={() => setShowSidebar(false)}
          className="text-cyan-400/70 hover:text-cyan-300 cursor-pointer"
          aria-label="Close ship status panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Radar Overlay */}
      <ShipRadar shipState={shipState} />

      {/* Ship Vitality */}
      <section>
        <h3 className="text-[10px] text-cyan-500/60 uppercase font-bold mb-4 tracking-widest">Ship Vitality</h3>
        <div className="space-y-4">
          {shipState ? (
            <>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span>Hull Integrity</span>
                  <span className="text-cyan-400">{shipState.hull}%</span>
                </div>
                <div className="h-1.5 w-full bg-cyan-900/20 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.4)] transition-all duration-500" style={{ width: `${shipState.hull}%` }}></div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span>Reactor Core</span>
                  <span className="text-amber-400">{shipState.power}%</span>
                </div>
                <div className="h-1.5 w-full bg-cyan-900/20 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${shipState.power}%` }}></div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span>Crew Stress</span>
                  <span className="text-rose-400">{shipState.stress}</span>
                </div>
                <div className="h-1.5 w-full bg-cyan-900/20 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-500 ${getStressBarWidth(shipState.stress).color}`}
                       style={{ width: getStressBarWidth(shipState.stress).width }}></div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-[10px] opacity-50 animate-pulse">SYNCING DATA...</div>
          )}
        </div>
      </section>

      {/* Active Alarms */}
      {activeAlarms.length > 0 && (
        <section>
          <h3 className="text-[10px] text-rose-500/60 uppercase font-bold mb-3 tracking-widest flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3" />
            Active Alarms
          </h3>
          <div className="space-y-2">
            {activeAlarms.map(alarm => (
              <div key={alarm.id} className="flex items-start gap-2 text-[10px] text-rose-300/80">
                <span className="text-rose-500 mt-0.5 shrink-0">◆</span>
                <span className="leading-relaxed">{alarm.text}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Engine Info */}
      <section className="mt-auto space-y-3">
        <div className="p-4 border border-cyan-900/40 rounded bg-cyan-950/10">
          <h4 className="text-[10px] uppercase text-cyan-400 mb-2">Engine Status</h4>
          <div className="text-[9px] leading-relaxed opacity-60">
            Ship: GSS Theseus<br/>
            Year: 2173<br/>
            Engine: {isCloudMode ? activeModel : '@mlc-ai/web-llm'}<br/>
            Mode: {isCloudMode ? 'Remote inference' : 'Local / WebGPU'}<br/>
            Status: <span className="text-emerald-400">Ready</span>
          </div>
        </div>

        {/* Account / session controls */}
        <div className="space-y-2">
          {user?.email && (
            <div className="text-[9px] opacity-50 truncate" title={user.email}>
              Signed in as {user.email}
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 border border-cyan-500/30 text-cyan-400/80 hover:text-cyan-300 hover:border-cyan-400/60 px-3 py-2 text-[10px] uppercase tracking-widest transition-colors cursor-pointer"
          >
            <LogOut className="w-3 h-3" />
            Sign Out
          </button>
        </div>
      </section>
    </aside>
  );
}
