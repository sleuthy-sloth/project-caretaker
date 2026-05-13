import React from 'react';

interface SystemLockScreenProps {
  authError: string | null;
  authLoading: boolean;
  handleLogin: () => void;
}

export function SystemLockScreen({ authError, authLoading, handleLogin }: SystemLockScreenProps) {
  return (
    <div className="h-dvh w-full bg-[#050507] text-[#a0aec0] flex flex-col items-center justify-center font-mono relative overflow-hidden">
       <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.03]" style={{ backgroundImage: "repeating-linear-gradient(0deg, #fff, #fff 1px, transparent 1px, transparent 2px)" }}></div>
       <div className="z-10 text-center animate-pulse mb-8 text-cyan-500/40 text-xs tracking-widest uppercase">
          [ SYSTEM LOCKED ]
       </div>
       <h1 className="text-3xl text-cyan-400 mb-8 tracking-widest uppercase z-10 font-bold drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">AEGIS CORE</h1>
       {authError && (
         <div className="z-10 mb-6 max-w-md text-center">
           <div className="border border-rose-500/40 bg-rose-950/20 px-4 py-3 text-[11px] text-rose-300/90 leading-relaxed">
             <span className="text-rose-400 font-bold">AUTH ERROR:</span> {authError}
           </div>
         </div>
       )}
       <p className="text-xs opacity-40 mb-6 z-10 tracking-wider uppercase">GSS Theseus • Mission Year 147</p>
       <button
         onClick={handleLogin}
         disabled={authLoading}
         className="z-10 border border-cyan-500/50 text-cyan-400 px-6 py-2 uppercase tracking-widest hover:bg-cyan-900/30 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
       >
         {authLoading ? 'Initializing...' : 'Initialize Session'}
       </button>
    </div>
  );
}
