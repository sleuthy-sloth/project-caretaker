import React from 'react';
import { ShipState } from '../lib/types';
import { StoryState } from '../lib/types';

interface ContinueScreenProps {
  storyState: StoryState;
  shipState: ShipState | null;
  onResume: () => void;
  onNewGame: () => void;
}

function stressColor(stress: string): string {
  const s = stress.toLowerCase();
  if (s === 'critical') return 'text-rose-400';
  if (s === 'elevated') return 'text-amber-400';
  return 'text-emerald-400';
}

function hullColor(hull: number): string {
  if (hull < 30) return 'text-rose-400';
  if (hull < 60) return 'text-amber-400';
  return 'text-emerald-400';
}

export function ContinueScreen({ storyState, shipState, onResume, onNewGame }: ContinueScreenProps) {
  const cpNum = parseInt(storyState.activeCheckpoint.replace('CP-', ''), 10) || 1;
  const totalCPs = 20;

  return (
    <div className="h-dvh w-full bg-[#050507] text-[#a0aec0] flex flex-col items-center justify-center font-mono relative overflow-hidden">
      {/* CRT scanlines */}
      <div
        className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, #fff, #fff 1px, transparent 1px, transparent 2px)" }}
      />

      <div className="z-10 text-center animate-pulse mb-8 text-cyan-500/40 text-xs tracking-widest uppercase">
        [ SESSION ARCHIVE DETECTED ]
      </div>

      <h1 className="text-2xl text-cyan-400 mb-2 tracking-widest uppercase z-10 font-bold drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">
        AEGIS CORE
      </h1>
      <p className="text-xs opacity-40 mb-10 z-10 tracking-wider uppercase">GSS Theseus • Mission Year 147</p>

      {/* Save info card */}
      <div className="z-10 border border-cyan-500/20 bg-black/40 px-8 py-6 mb-10 w-full max-w-sm">
        <div className="text-[10px] uppercase tracking-widest text-cyan-600 mb-4">Mission Progress</div>

        <div className="grid grid-cols-2 gap-y-3 text-xs">
          <span className="opacity-50 uppercase tracking-wider">Checkpoint</span>
          <span className="text-cyan-400 font-bold">
            {storyState.activeCheckpoint} <span className="opacity-40 font-normal">/ {totalCPs}</span>
          </span>

          <span className="opacity-50 uppercase tracking-wider">Turns</span>
          <span className="text-cyan-300">{storyState.turnCount}</span>

          {shipState && (
            <>
              <span className="opacity-50 uppercase tracking-wider">Hull</span>
              <span className={hullColor(shipState.hull)}>{shipState.hull}%</span>

              <span className="opacity-50 uppercase tracking-wider">Power</span>
              <span className={hullColor(shipState.power)}>{shipState.power}%</span>

              <span className="opacity-50 uppercase tracking-wider">Stress</span>
              <span className={stressColor(shipState.stress)}>{shipState.stress}</span>
            </>
          )}
        </div>

        {storyState.completedCheckpoints.length > 0 && (
          <div className="mt-4 pt-4 border-t border-cyan-900/30">
            <div className="text-[10px] uppercase tracking-widest text-cyan-600 mb-1">Completed</div>
            <div className="text-[10px] text-cyan-500/60">{storyState.completedCheckpoints.join(' · ')}</div>
          </div>
        )}
      </div>

      {/* Actions */}
      <button
        onClick={onResume}
        className="z-10 border border-cyan-500/50 text-cyan-400 px-8 py-2 uppercase tracking-widest hover:bg-cyan-900/30 transition-colors cursor-pointer mb-4 w-full max-w-sm"
      >
        Resume Mission
      </button>

      <button
        onClick={onNewGame}
        className="z-10 border border-rose-500/20 text-rose-400/50 px-6 py-1.5 text-[11px] uppercase tracking-widest hover:bg-rose-900/20 hover:text-rose-400/80 hover:border-rose-500/40 transition-colors cursor-pointer w-full max-w-sm"
      >
        New Game
      </button>

      <p className="z-10 mt-8 text-[10px] text-cyan-900 uppercase tracking-widest">
        Progress auto-saves after every command
      </p>
    </div>
  );
}
