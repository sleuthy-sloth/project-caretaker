import React, { useState, useEffect, useRef } from 'react';
import { Terminal, LogEntry } from './components/Terminal';
import { useCaretakerAI, AIResponse, ChatHistoryMessage, CLOUD_MODEL_ID } from './hooks/useCaretakerAI';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { Skull, AlertTriangle, RotateCcw, Ship, LogOut, PanelLeft, X } from 'lucide-react';

interface ShipState {
  hull: number;
  power: number;
  stress: string;
}

interface ActiveAlarm {
  id: string;
  text: string;
}

interface ModelOption {
  id: string;
  name: string;
  description: string;
  recommended: boolean;
  mobileSafe: boolean;
}

const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: CLOUD_MODEL_ID,
    name: "Groq Cloud",
    description: "Runs on Groq's servers via Llama 3.3 70B. Best narrative. Instant start, no download. Requires internet.",
    recommended: true,
    mobileSafe: true
  },
  {
    id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    name: "Qwen 2.5 0.5B",
    description: "Tiny local model (~360MB). Runs offline in browser via WebGPU. Basic narrative.",
    recommended: false,
    mobileSafe: true
  },
  {
    id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    name: "Llama 3.2 1B",
    description: "Small local model (~880MB). Runs offline via WebGPU. Better than 0.5B on recent phones.",
    recommended: false,
    mobileSafe: true
  },
  {
    id: "gemma-2b-it-q4f32_1-MLC",
    name: "Gemma 2B",
    description: "Mid-size local model (~1.4GB). Solid offline narrative on desktop. Will crash most phones.",
    recommended: false,
    mobileSafe: false
  },
  {
    id: "Llama-3-8B-Instruct-q4f32_1-MLC",
    name: "Llama-3 8B",
    description: "Large (~5GB). Best narrative, requires desktop with strong GPU.",
    recommended: false,
    mobileSafe: false
  }
];

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod|Android|Mobile/i.test(ua)) return true;
  // iPad on iOS 13+ reports as desktop Mac; detect via touch points
  if (ua.includes('Mac') && navigator.maxTouchPoints > 1) return true;
  return false;
}

const MAX_HISTORY_MESSAGES = 8;

function buildChatHistory(logs: LogEntry[]): ChatHistoryMessage[] {
  const conversational = logs.filter(l => l.sender === 'USER' || l.sender === 'AI');
  const recent = conversational.slice(-MAX_HISTORY_MESSAGES);
  return recent.map(l => ({
    role: l.sender === 'USER' ? 'user' : 'assistant',
    content: l.text
  }));
}

function parseSender(s: string): "USER" | "AI" | "SYSTEM" {
  if (s === "USER" || s === "AI" || s === "SYSTEM") return s;
  console.warn(`Unknown sender "${s}" — defaulting to SYSTEM`);
  return "SYSTEM";
}

function normalizeStress(stress: string): string {
  const lower = stress.toLowerCase();
  if (lower === "critical" || lower === "elevated" || lower === "nominal") {
    // Return capitalized form
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }
  return "Elevated"; // safe default
}

function getStressBarWidth(stress: string): { width: string; color: string } {
  const lower = stress.toLowerCase();
  if (lower === "critical") return { width: "95%", color: "bg-rose-500" };
  if (lower === "elevated") return { width: "60%", color: "bg-rose-400" };
  return { width: "10%", color: "bg-emerald-500" };
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [shipState, setShipState] = useState<ShipState | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsLoaded, setLogsLoaded] = useState(false);
  const [activeAlarms, setActiveAlarms] = useState<ActiveAlarm[]>([]);
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const initializationTriggered = useRef(false);

  const { isInitializing, downloadProgress, progressText, isGenerating, isReady, isCloudMode, error, initAI, sendMessage } = useCaretakerAI();

  // Auth Effect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthInitialized(true);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setAuthError(null);
    setAuthLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      const code = e?.code || '';
      if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user') {
        // Popup failed — fall back to redirect which works with all popup blockers
        setAuthError('Popup was blocked. Redirecting to Google sign-in...');
        try {
          await signInWithRedirect(auth, provider);
        } catch (redirectErr) {
          console.error('Redirect auth also failed:', redirectErr);
          setAuthError('Sign-in failed. Check console for details and try again.');
        }
      } else if (code === 'auth/unauthorized-domain') {
        setAuthError(
          'This domain is not authorized for Firebase sign-in. ' +
          'Go to Firebase Console → Authentication → Settings → ' +
          'Authorized domains and add this domain.'
        );
      } else if (code === 'auth/cancelled-popup-request') {
        setAuthError('Only one sign-in popup at a time.');
      } else {
        console.error('Login error:', e);
        setAuthError(e?.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle redirect-based sign-in (popup blocker fallback)
  useEffect(() => {
    getRedirectResult(auth).then((result) => {
      if (result) {
        // Successfully signed in via redirect
        setAuthError(null);
      }
    }).catch((err) => {
      console.error('Redirect sign-in error:', err);
    });
  }, []);

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
        setShipState({
          hull: data.hull,
          power: data.power,
          stress: normalizeStress(data.stress),
        });
      } else {
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
          sender: parseSender(data.sender),
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

  const pushTerminalLog = (text: string, sender: "USER" | "AI" | "SYSTEM") => {
    if (!user) return;
    addDoc(collection(db, 'ships', user.uid, 'terminalHistory'), {
      text,
      sender,
      createdAt: serverTimestamp()
    }).catch(err => {
      console.error('Failed to write terminal log:', err);
    });
  };

  const handleCommand = async (command: string, isHidden: boolean = false) => {
    if (!user || !shipState) return;

    // 1. Echo user command (fire & forget — don't block UI)
    if (!isHidden) {
      pushTerminalLog(command, "USER");
    }

    // 2. Generate AI response (this legitimately blocks — AI is the bottleneck)
    try {
      const history = buildChatHistory(logs);
      const aiResponse: AIResponse = await sendMessage(command, history);

      // 3. Write AI response + ship update in parallel (fire & forget)
      pushTerminalLog(aiResponse.terminal_output, "AI");

      // 4. Update alarms & suggested actions for the UI
      setActiveAlarms(
        (aiResponse.active_alarms || []).map((text: string, i: number) => ({
          id: `alarm-${Date.now()}-${i}`,
          text,
        }))
      );
      setSuggestedActions(aiResponse.suggested_actions || []);

      // 5. Update ship state in Firestore (fire & forget)
      if (aiResponse.ship_status) {
        updateDoc(doc(db, 'ships', user.uid), {
          hull: aiResponse.ship_status.hull_integrity,
          power: aiResponse.ship_status.power_level,
          stress: aiResponse.ship_status.stress_level,
          updatedAt: serverTimestamp()
        }).catch(err => {
          console.error('Failed to update ship state:', err);
        });
      }
    } catch (err) {
      console.error(err);
      pushTerminalLog("ERROR: AEGIS CORE UNRESPONSIVE.", "SYSTEM");
    }
  };

  // Auto-send system init once ready
  useEffect(() => {
    if (isReady && logsLoaded && logs.length === 0 && selectedModel && !initializationTriggered.current) {
      initializationTriggered.current = true;
      handleCommand("[SYSTEM INITIALIZATION] Waking Caretaker from Pod 04. Boot sequence complete. Provide immediate sitrep to Caretaker terminal.", true);
    }
  }, [isReady, logsLoaded, logs.length, selectedModel]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setSelectedModel(null);
      setShipState(null);
      setLogs([]);
      setLogsLoaded(false);
      setActiveAlarms([]);
      setSuggestedActions([]);
      setShowSidebar(false);
      initializationTriggered.current = false;
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  // Game reset — wipes terminal history, resets ship vitals, lets the
  // auto-init effect fire the AI's opening sequence once logs hit zero.
  const handleReset = async () => {
    if (!user) return;
    setShowResetConfirm(false);
    try {
      // Arm re-initialization before state clears
      initializationTriggered.current = false;
      setActiveAlarms([]);
      setSuggestedActions([]);

      // Delete every terminal history doc from Firestore
      const logsRef = collection(db, 'ships', user.uid, 'terminalHistory');
      const snap = await getDocs(logsRef);
      await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));

      // Reset ship vitals to starting values
      await setDoc(doc(db, 'ships', user.uid), {
        hull: 100,
        power: 100,
        stress: "Nominal",
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Reset failed:', err);
    }
  };

  if (!authInitialized) {
    return <div className="h-dvh w-full bg-[#050507] text-cyan-400 flex items-center justify-center font-mono">INITIALIZING...</div>;
  }

  if (!user) {
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

  if (!selectedModel) {
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

  if (!isReady) {
    return (
      <div className="h-dvh w-full bg-[#050507] text-[#a0aec0] flex flex-col items-center justify-center font-mono relative overflow-hidden">
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
    <div className="flex flex-col h-dvh w-full overflow-hidden font-mono text-[#a0aec0] bg-[#050507]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-cyan-900/30 bg-black/40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSidebar(true)}
            className="md:hidden -ml-2 p-2 text-cyan-400/80 hover:text-cyan-300 transition-colors cursor-pointer"
            title="Open ship status"
            aria-label="Open ship status panel"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
          <Ship className="w-4 h-4 text-cyan-500" />
          <span className="text-cyan-400 font-bold tracking-widest text-sm uppercase hidden sm:inline">Aegis Core // GSS Theseus</span>
          <span className="text-cyan-400 font-bold tracking-widest text-xs uppercase sm:hidden">Aegis Core</span>
        </div>
        <div className="flex items-center gap-4 md:gap-8 text-[10px] uppercase tracking-tighter">
          <div className="hidden sm:flex flex-col">
            <span className="opacity-40 text-xs">{isCloudMode ? "Engine" : "WebGPU"}</span>
            <span className={isCloudMode ? "text-violet-400" : "text-emerald-400"}>
              {isCloudMode ? "Groq Cloud" : "Active"}
            </span>
          </div>
          <div className="hidden md:flex flex-col">
            <span className="opacity-40 text-xs">Model</span>
            <span className="text-cyan-400">{AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name || selectedModel}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="opacity-40 text-xs">Sync</span>
            <span className="text-amber-400">Online</span>
          </div>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-1 border border-rose-500/30 text-rose-400/70 hover:text-rose-300 hover:border-rose-500/60 px-2 py-1 transition-colors cursor-pointer"
            title="Reset game"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Reset confirmation overlay */}
      {showResetConfirm && (
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
      )}

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile backdrop */}
        {showSidebar && (
          <div
            onClick={() => setShowSidebar(false)}
            className="md:hidden fixed inset-0 bg-black/70 z-30"
            aria-hidden="true"
          />
        )}

        {/* Sidebar (static on desktop, slide-out drawer on mobile) */}
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
                Engine: {isCloudMode ? 'Groq Cloud' : '@mlc-ai/web-llm'}<br/>
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

        {/* Terminal area */}
        <main className="flex-1 flex flex-col p-4 md:p-6 bg-[radial-gradient(circle_at_center,_rgba(6,182,212,0.05)_0%,_transparent_70%)] relative">
          <Terminal
            logs={logs}
            logsLoaded={logsLoaded}
            onCommand={handleCommand}
            isGenerating={isGenerating || isInitializing}
            suggestedActions={suggestedActions}
          />
          {error && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-rose-500/20 border border-rose-500 text-rose-200 px-4 py-2 rounded text-xs z-50 shadow-lg flex items-center gap-2">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span>SYS ERR: {error}</span>
            </div>
          )}
        </main>
      </div>

      {/* Status bar */}
      <div className="h-8 border-t border-cyan-900/30 flex items-center px-4 md:px-6 text-[9px] uppercase tracking-widest bg-black shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
          <span>Online</span>
        </div>
        <div className="mx-3 h-3 w-px bg-cyan-900/40 hidden sm:block"></div>
        <div className="flex-1 hidden sm:flex gap-4">
          <div className="flex gap-1 text-cyan-600"><span>Ship:</span><span className="text-cyan-400">GSS Theseus</span></div>
          <div className="flex gap-1 text-cyan-600"><span>Year:</span><span className="text-cyan-400">2173</span></div>
          <div className="flex gap-1 text-cyan-600"><span>Status:</span><span className="text-emerald-400">Emergency Ops</span></div>
        </div>
        <div className="text-cyan-900 font-bold ml-auto">SECURE_SESSION_v2.1.0</div>
      </div>
    </div>
  );
}
