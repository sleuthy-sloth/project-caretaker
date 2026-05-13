import React from 'react';
import { AVAILABLE_MODELS, isMobileDevice } from '../lib/models';

interface ModelSelectorProps {
  handleModelSelect: (modelId: string) => void;
}

export function ModelSelector({ handleModelSelect }: ModelSelectorProps) {
  const isMobile = isMobileDevice();
  const visibleModels = isMobile
    ? AVAILABLE_MODELS.filter(m => m.mobileSafe)
    : AVAILABLE_MODELS;

  return (
    <div className="min-h-dvh w-full bg-[#050507] text-[#a0aec0] flex flex-col items-center justify-center font-mono relative p-4 py-8 overflow-y-auto">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.03]" style={{ backgroundImage: "repeating-linear-gradient(0deg, #fff, #fff 1px, transparent 1px, transparent 2px)" }}></div>
      <div className="z-10 text-center mb-6 text-cyan-500/40 text-xs tracking-widest uppercase">
         [ SELECT ORACLE ENGINE MODEL ]
      </div>
      {isMobile && (
        <div className="z-10 mb-6 max-w-2xl border border-amber-500/40 bg-amber-950/20 px-4 py-3 text-[11px] text-amber-300/90 leading-relaxed">
          <span className="text-amber-400 font-bold">MOBILE WARNING:</span> iOS and Android browsers cap per-tab memory and have limited WebGPU support. Only the smallest models are offered here. Narrative quality is reduced. For the full experience, open this page on a desktop browser.
        </div>
      )}
      <div className="z-10 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl w-full">
        {visibleModels.map(model => (
          <button
            key={model.id}
            onClick={() => handleModelSelect(model.id)}
            className="flex flex-col border border-cyan-500/50 p-6 text-left hover:bg-cyan-900/30 transition-colors group relative"
          >
            {model.recommended && (
              <div className="absolute -top-3 right-4 bg-cyan-600 text-black text-[10px] font-bold px-2 py-0.5 uppercase">
                Recommended
              </div>
            )}
            <h3 className="text-xl text-cyan-400 mb-2 tracking-widest uppercase group-hover:text-cyan-300">{model.name}</h3>
            <p className="text-sm opacity-60 flex-1">{model.description}</p>
            <div className="mt-4 text-xs font-bold text-cyan-600 uppercase">Load Engine &gt;</div>
          </button>
        ))}
      </div>
    </div>
  );
}
