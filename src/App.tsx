import React, { useState, useEffect, useRef } from 'react';
import { Terminal, LogEntry } from './components/Terminal';
import { useCaretakerAI, AIResponse } from './hooks/useCaretakerAI';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';

interface ShipState {
  hull: number;
  power: number;
  stress: string;
}

const AVAILABLE_MODELS = [
  {
    id: "gemma-2b-it-q4f32_1-MLC",
    name: "Gemma 2B",
    description: "Smaller, faster model. Lower VRAM requirements, less precise.",
    recommended: true
  },
  {
    id: "Llama-3-8B-Instruct-q4f32_1-MLC",
    name: "Llama-3 8B",
    description: "Larger, more powerful model. Better narrative, requires more VRAM.",
    recommended: false
  }
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [shipState, setShipState] = useState<ShipState | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsLoaded, setLogsLoaded] = useState(false);
  
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const initializationTriggered = useRef(false);

  const { isInitializing, downloadProgress, progressText, isGenerating, isReady, error, initAI, sendMessage } = useCaretakerAI();

  // Auth Effect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthInitialized(true);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error(e);
    }
  };

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    initAI(modelId);
  };

  // Firestore ship state listener
  useEffect(() => {
    if (!user) return;
    
    const shipRef = doc(db, 'ships', user.uid);
    const unsubscribe = onSnapshot(shipRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setShipState({ hull: data.hull, power: data.power, stress: data.stress });
      } else {
        // Initialize Ship
        (async () => {
          try {
            await setDoc(shipRef, {
              hull: 100,
              power: 100,
              stress: "Nominal",
              userId: user.uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, 'ships/' + user.uid);
          }
        })();
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'ships/' + user.uid);
    });

    return () => unsubscribe();
  }, [user]);

  // Firestore terminal logs listener
  useEffect(() => {
    if (!user) return;

    const logsRef = collection(db, 'ships', user.uid, 'terminalHistory');
    const q = query(logsRef, orderBy('createdAt', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newLogs: LogEntry[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        newLogs.push({
          id: doc.id,
          sender: data.sender as any,
          text: data.text,
          timestamp: data.createdAt?.toMillis() || Date.now()
        });
      });
      setLogs(newLogs);
      setLogsLoaded(true);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'ships/' + user.uid + '/terminalHistory');
    });

    return () => unsubscribe();
  }, [user]);

  const pushTerminalLog = async (text: string, sender: "USER" | "AI" | "SYSTEM") => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'ships', user.uid, 'terminalHistory'), {
        text,
        sender,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'ships/' + user.uid + '/terminalHistory');
    }
  }

  const handleCommand = async (command: string, isHidden: boolean = false) => {
    if (!user || !shipState) return;

    // 1. Echo user command
    if (!isHidden) {
      await pushTerminalLog(command, "USER");
    }

    // 2. Pass to AI
    try {
      const aiResponse: AIResponse = await sendMessage(command);
      
      // 3. Record AI response
      await pushTerminalLog(aiResponse.terminal_output, "AI");

      // 4. Update ship state
      if (aiResponse.ship_status) {
        await updateDoc(doc(db, 'ships', user.uid), {
          hull: aiResponse.ship_status.hull_integrity,
          power: aiResponse.ship_status.power_level,
          stress: aiResponse.ship_status.stress_level,
          updatedAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error(err);
      await pushTerminalLog("ERROR: AEGIS CORE UNRESPONSIVE.", "SYSTEM");
    }
  };

  useEffect(() => {
    if (isReady && logsLoaded && logs.length === 0 && selectedModel && !initializationTriggered.current) {
      initializationTriggered.current = true;
      handleCommand("[SYSTEM INITIALIZATION] Waking Caretaker from Pod 04. Boot sequence complete. Provide immediate sitrep to Caretaker terminal.", true);
    }
  }, [isReady, logsLoaded, logs.length, selectedModel]);

  if (!authInitialized) {
    return <div className="h-screen w-full bg-[#050507] text-cyan-400 flex items-center justify-center font-mono">INITIALIZING...</div>;
  }

  if (!user) {
    return (
      <div className="h-screen w-full bg-[#050507] text-[#a0aec0] flex flex-col items-center justify-center font-mono relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.03]" style={{ backgroundImage: "repeating-linear-gradient(0deg, #fff, #fff 1px, transparent 1px, transparent 2px)" }}></div>
         <div className="z-10 text-center animate-pulse mb-8 text-cyan-500/40 text-xs tracking-widest uppercase">
            [ SYSTEM LOCKED ]
         </div>
         <h1 className="text-3xl text-cyan-400 mb-8 tracking-widest uppercase z-10 font-bold drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">AEGIS CORE</h1>
         <button 
           onClick={handleLogin}
           className="z-10 border border-cyan-500/50 text-cyan-400 px-6 py-2 uppercase tracking-widest hover:bg-cyan-900/30 transition-colors cursor-pointer"
         >
           Initialize Session
         </button>
      </div>
    );
  }

  if (!selectedModel) {
    return (
      <div className="h-screen w-full bg-[#050507] text-[#a0aec0] flex flex-col items-center justify-center font-mono relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.03]" style={{ backgroundImage: "repeating-linear-gradient(0deg, #fff, #fff 1px, transparent 1px, transparent 2px)" }}></div>
        <div className="z-10 text-center mb-8 text-cyan-500/40 text-xs tracking-widest uppercase">
           [ SELECT ORACLE ENGINE MODEL ]
        </div>
        <div className="z-10 flex flex-col md:flex-row gap-6 max-w-4xl w-full px-6">
          {AVAILABLE_MODELS.map(model => (
            <button
              key={model.id}
              onClick={() => handleModelSelect(model.id)}
              className="flex-1 flex flex-col border border-cyan-500/50 p-6 text-left hover:bg-cyan-900/30 transition-colors group relative"
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

  if (!isReady) {
    return (
      <div className="h-screen w-full bg-[#050507] text-[#a0aec0] flex flex-col items-center justify-center font-mono relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.03]" style={{ backgroundImage: "repeating-linear-gradient(0deg, #fff, #fff 1px, transparent 1px, transparent 2px)" }}></div>
        <div className="z-10 text-center mb-4 text-cyan-500/40 text-xs tracking-widest uppercase animate-pulse">
           [ INITIALIZING ORACLE ENGINE ]
        </div>
        <div className="z-10 w-64 h-2 bg-cyan-900/30 overflow-hidden mb-2">
          <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${downloadProgress * 100}%` }}></div>
        </div>
        <div className="z-10 text-[10px] text-cyan-600 uppercase tracking-widest">{progressText || 'Loading...'}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden font-mono text-[#a0aec0] bg-[#050507]">
      <div className="flex items-center justify-between px-6 py-3 border-b border-cyan-900/30 bg-black/40">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
          <span className="text-cyan-400 font-bold tracking-widest text-sm uppercase">Aegis Core // Project Caretaker</span>
        </div>
        <div className="flex gap-8 text-[10px] uppercase tracking-tighter">
          <div className="hidden sm:flex flex-col">
            <span className="opacity-40 text-xs">WebGPU Status</span>
            <span className="text-emerald-400">Active / Direct3D12</span>
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="opacity-40 text-xs">Local Model</span>
            <span className="text-cyan-400">{AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name || selectedModel}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="opacity-40 text-xs">Sync Status</span>
            <span className="text-amber-400">Firebase / Persistent</span>
          </div>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden relative">
        <aside className="hidden md:flex w-64 border-r border-cyan-900/20 bg-black/20 p-6 flex-col gap-8">
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
                      <div className={`h-full transition-all duration-500 ${shipState.stress === 'Critical' ? 'bg-rose-500 w-[95%]' : shipState.stress === 'Elevated' ? 'bg-rose-400 w-[60%]' : 'bg-emerald-500 w-[10%]'}`}></div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-[10px] opacity-50">SYNCING DATA...</div>
              )}
            </div>
          </section>
          <section className="mt-auto">
            <div className="p-4 border border-cyan-900/40 rounded bg-cyan-950/10">
              <h4 className="text-[10px] uppercase text-cyan-400 mb-2">Worker Thread Info</h4>
              <div className="text-[9px] leading-relaxed opacity-60">
                Engine: @mlc-ai/web-llm<br/>
                VRAM: Auto / WebGPU<br/>
                Status: Ready
              </div>
            </div>
          </section>
        </aside>

        <main className="flex-1 flex flex-col p-4 md:p-6 bg-[radial-gradient(circle_at_center,_rgba(6,182,212,0.05)_0%,_transparent_70%)] relative">
          <Terminal logs={logs} onCommand={handleCommand} isGenerating={isGenerating || isInitializing} />
          {error && <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-rose-500/20 border border-rose-500 text-rose-200 px-4 py-2 rounded text-xs z-50 shadow-lg">SYS ERR: {error}</div>}
        </main>
      </div>

      <div className="h-8 border-t border-cyan-900/30 flex items-center px-6 text-[9px] uppercase tracking-widest bg-black shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
          <span>Local Model Ready</span>
        </div>
        <div className="mx-4 h-3 w-px bg-cyan-900/40 hidden sm:block"></div>
        <div className="flex-1 hidden sm:flex gap-4">
          <div className="flex gap-1 text-cyan-600"><span>Lat:</span><span className="text-cyan-400">34.2N</span></div>
          <div className="flex gap-1 text-cyan-600"><span>Lon:</span><span className="text-cyan-400">118.4W</span></div>
        </div>
        <div className="text-cyan-900 font-bold ml-auto sm:ml-0">SECURE_SESSION_v2.0.4</div>
      </div>
    </div>
  );
}
