import React from 'react';
import { Skull } from 'lucide-react';

interface ResetConfirmModalProps {
  showResetConfirm: boolean;
  setShowResetConfirm: (show: boolean) => void;
  handleReset: () => void;
}

export function ResetConfirmModal({ showResetConfirm, setShowResetConfirm, handleReset }: ResetConfirmModalProps) {
  if (!showResetConfirm) return null;

  return (
    <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center">
      <div className="border border-rose-500/40 bg-rose-950/20 p-6 max-w-sm mx-4 text-center">
        <Skull className="w-8 h-8 text-rose-400 mx-auto mb-4" />
        <h3 className="text-rose-300 text-sm uppercase tracking-widest mb-2">Confirm System Reset</h3>
        <p className="text-[10px] opacity-60 mb-6 leading-relaxed">
          This will erase all terminal logs, reset ship systems to nominal, and re-wake the Caretaker from cryosleep. The story will start over.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setShowResetConfirm(false)}
            className="border border-cyan-500/30 text-cyan-400 px-4 py-2 text-xs uppercase tracking-widest hover:bg-cyan-900/20 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleReset}
            className="border border-rose-500/50 text-rose-300 px-4 py-2 text-xs uppercase tracking-widest hover:bg-rose-900/20 transition-colors cursor-pointer"
          >
            Execute Reset
          </button>
        </div>
      </div>
    </div>
  );
}
