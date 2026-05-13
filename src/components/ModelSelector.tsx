import React, { useState, useEffect, useMemo } from 'react';
import { AVAILABLE_MODELS, isMobileDevice } from '../lib/models';
function isCloudModel(modelId: string): boolean {
  return modelId.startsWith('cloud-');
}

interface ModelSelectorProps {
  handleModelSelect: (modelId: string) => void;
}

export function ModelSelector({ handleModelSelect }: ModelSelectorProps) {
  const isMobile = isMobileDevice();
  const [webGPU, setWebGPU] = useState<'checking' | 'available' | 'unavailable'>('checking');

  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  const isChromeiOS = /CriOS\//.test(ua);
  const isChromeDesktop = /Chrome\//.test(ua) && !/Edg\//.test(ua) && !/OPR\//.test(ua);

  useEffect(() => {
    async function check() {
      if (!('gpu' in navigator)) { setWebGPU('unavailable'); return; }
      try {
        const adapter = await (navigator as any).gpu.requestAdapter();
        setWebGPU(adapter ? 'available' : 'unavailable');
      } catch {
        setWebGPU('unavailable');
      }
    }
    check();
  }, []);

  const visibleModels = isMobile
    ? AVAILABLE_MODELS.filter(m => m.mobileSafe)
    : AVAILABLE_MODELS;

  const isLocalDisabled = (modelId: string) =>
    !isCloudModel(modelId) && webGPU === 'unavailable';

  const webGpuHelpText = useMemo(() => {
    if (isChromeiOS) {
      return 'Chrome on iPhone/iPad uses Apple\'s WebKit engine and currently cannot run WebGPU local models reliably. Use Cloud AI, or switch to Safari 17+.';
    }
    if (isChromeDesktop) {
      return 'This Chrome build reports no WebGPU adapter. Update Chrome, enable hardware acceleration, and restart. If your GPU/driver is unsupported, use Cloud AI.';
    }
    return 'Your browser does not support WebGPU. Local models are disabled. Use Cloud AI, or try Safari 17+ / desktop Chrome.';
  }, [isChromeDesktop, isChromeiOS]);

  return (
    // fixed inset-0 + overflow-y-auto works around body { overflow: hidden }
    <div className="fixed inset-0 overflow-y-auto bg-[#050507] text-[#a0aec0] font-mono z-50">
      <div className="min-h-full flex flex-col items-center justify-center relative p-4 py-8">
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: "repeating-linear-gradient(0deg, #fff, #fff 1px, transparent 1px, transparent 2px)" }}></div>

        <div className="z-10 text-center mb-6 text-cyan-500/40 text-xs tracking-widest uppercase">
          [ SELECT ORACLE ENGINE MODEL ]
        </div>

        {isMobile && (
          <div className="z-10 mb-4 max-w-2xl border border-amber-500/40 bg-amber-950/20 px-4 py-3 text-[11px] text-amber-300/90 leading-relaxed">
            <span className="text-amber-400 font-bold">MOBILE WARNING:</span> iOS and Android cap per-tab memory and have limited WebGPU support. Only the smallest local models are shown. For best results use <span className="text-amber-300">Cloud AI</span>, or open on a desktop browser.
          </div>
        )}

        {webGPU === 'unavailable' && (
          <div className="z-10 mb-4 max-w-2xl border border-red-500/40 bg-red-950/20 px-4 py-3 text-[11px] text-red-300/90 leading-relaxed">
            <span className="text-red-400 font-bold">WEBGPU UNAVAILABLE:</span> {webGpuHelpText} Use <span className="text-red-300">Cloud AI</span> for immediate play.
          </div>
        )}

        <div className="z-10 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl w-full">
          {visibleModels.map(model => {
            const disabled = isLocalDisabled(model.id);
            const isCloud = isCloudModel(model.id);
            return (
              <button
                key={model.id}
                onClick={() => { if (!disabled) handleModelSelect(model.id); }}
                disabled={disabled}
                className={`flex flex-col border p-6 text-left transition-colors group relative
                  ${disabled
                    ? 'border-cyan-900/20 opacity-40 cursor-not-allowed'
                    : 'border-cyan-500/50 hover:bg-cyan-900/30 cursor-pointer'}`}
              >
                {model.recommended && (
                  <div className="absolute -top-3 right-4 bg-cyan-600 text-black text-[10px] font-bold px-2 py-0.5 uppercase">
                    Recommended
                  </div>
                )}
                {!isCloud && webGPU === 'checking' && (
                  <div className="absolute -top-3 left-4 border border-cyan-700/40 text-cyan-600 text-[9px] px-2 py-0.5 uppercase tracking-widest">
                    Checking GPU…
                  </div>
                )}
                <h3 className={`text-xl mb-2 tracking-widest uppercase ${disabled ? 'text-cyan-800' : 'text-cyan-400 group-hover:text-cyan-300'}`}>
                  {model.name}
                </h3>
                <p className="text-sm opacity-60 flex-1">{model.description}</p>
                <div className={`mt-4 text-xs font-bold uppercase ${disabled ? 'text-cyan-900' : 'text-cyan-600'}`}>
                  {disabled ? 'WebGPU Required >' : 'Load Engine >'}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
