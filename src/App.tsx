import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal, LogEntry } from './components/Terminal';
import { useCaretakerAI, AIResponse, ChatHistoryMessage } from './hooks/useCaretakerAI';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { Skull, AlertTriangle, RotateCcw, Ship, LogOut, PanelLeft, X, Map as MapIcon } from 'lucide-react';

import { SystemLockScreen } from './components/SystemLockScreen';
import { ShipStatusSidebar } from './components/ShipStatusSidebar';
import { ResetConfirmModal } from './components/ResetConfirmModal';
import { ShipMap } from './components/ShipMap';
import { ShipState, ActiveAlarm, normalizeStress } from './lib/types';

const MAX_HISTORY_MESSAGES = 8;

function buildChatHistory(logs: LogEntry[]): ChatHistoryMessage[] {
  const conversational = logs.filter(l => l.sender === 'USER' || l.sender === 'AI');
  const recent = conversational.slice(-MAX_HISTORY_MESSAGES);
  return recent.map(l => ({
    role: l.sender === 'USER' ? 'user' : 'assistant',
    content: l.text
  }));
}

function parseSender(s: string): "USER" | "AI" | "SYSTEM" | "SCENE" {
  if (s === "USER" || s === "AI" || s === "SYSTEM" || s === "SCENE") return s;
  console.warn(`Unknown sender "${s}" — defaulting to SYSTEM`);
  return "SYSTEM";
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
  const [showMap, setShowMap] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const initializationTriggered = useRef(false);
  const lastCommandRef = useRef<string>("");

  const { isInitializing, downloadProgress, progressText, isGenerating, isReady, isCloudMode, error, initAI, sendMessage, retry, generationElapsed } = useCaretakerAI();

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

  const pushTerminalLog = (text: string, sender: "USER" | "AI" | "SYSTEM" | "SCENE") => {
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
      lastCommandRef.current = command; // Track for retry
    }

    // 2. Generate AI response (this legitimately blocks — AI is the bottleneck)
    try {
      const history = buildChatHistory(logs);
      const aiResponse: AIResponse = await sendMessage(command, history);

      // 3. Write AI response + ship update in parallel (fire & forget)
      //    Scene description (if any) is pushed first so it renders above
      //    Aegis's dialogue — establishing the camera before the voice.
      if (aiResponse.scene_description && aiResponse.scene_description.trim()) {
        pushTerminalLog(aiResponse.scene_description, "SCENE");
      }
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

  const handleRetry = useCallback(() => {
    const cmd = lastCommandRef.current;
    if (!cmd) return;
    // Use the retry function which increments and sends X-Retry-Attempt header
    const history = buildChatHistory(logs);
    retry(cmd, history).then(aiResponse => {
      if (aiResponse.scene_description?.trim()) {
        pushTerminalLog(aiResponse.scene_description, "SCENE");
      }
      pushTerminalLog(aiResponse.terminal_output, "AI");
      setActiveAlarms(
        (aiResponse.active_alarms || []).map((text, i) => ({
          id: `alarm-${Date.now()}-${i}`,
          text,
        }))
      );
      setSuggestedActions(aiResponse.suggested_actions || []);
      if (aiResponse.ship_status) {
        updateDoc(doc(db, 'ships', user.uid), {
          hull: aiResponse.ship_status.hull_integrity,
          power: aiResponse.ship_status.power_level,
          stress: aiResponse.ship_status.stress_level,
          updatedAt: serverTimestamp()
        }).catch(err => console.error('Failed to update ship state:', err));
      }
    }).catch(err => {
      console.error(err);
      pushTerminalLog("ERROR: AEGIS CORE UNRESPONSIVE.", "SYSTEM");
    });
  }, [logs, retry, user]);

  // Auto-send system init once ready
  useEffect(() => {
    if (isReady && logsLoaded && logs.length === 0 && !initializationTriggered.current) {
      initializationTriggered.current = true;
      handleCommand("[SYSTEM INITIALIZATION] Waking Caretaker from Pod 04. Boot sequence complete. Provide immediate sitrep to Caretaker terminal.", true);
    }
  }, [isReady, logsLoaded, logs.length]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setShipState(null);
      setLogs([]);
      setLogsLoaded(false);
      setActiveAlarms([]);
      setSuggestedActions([]);
      setShowSidebar(false);
      setShowMap(false);
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
    return <SystemLockScreen authError={authError} authLoading={authLoading} handleLogin={handleLogin} />;
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
            <span className="opacity-40 text-xs">Engine</span>
            <span className="text-violet-400">Cloud AI</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="opacity-40 text-xs">Sync</span>
            <span className="text-amber-400">Online</span>
          </div>
          <button
            onClick={() => setShowMap(true)}
            className="flex items-center gap-1 border border-cyan-500/30 text-cyan-400/80 hover:text-cyan-300 hover:border-cyan-400/60 px-2 py-1 transition-colors cursor-pointer"
            title="Open ship schematic"
          >
            <MapIcon className="w-3 h-3" />
            <span className="hidden sm:inline">Map</span>
          </button>
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

      <ResetConfirmModal
        showResetConfirm={showResetConfirm}
        setShowResetConfirm={setShowResetConfirm}
        handleReset={handleReset}
      />

      <ShipMap open={showMap} onClose={() => setShowMap(false)} />

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

        <ShipStatusSidebar
          showSidebar={showSidebar}
          setShowSidebar={setShowSidebar}
          shipState={shipState}
          activeAlarms={activeAlarms}
          isCloudMode={isCloudMode}
          user={user}
          handleSignOut={handleSignOut}
        />

        {/* Terminal area */}
        <main className="flex-1 flex flex-col p-4 md:p-6 bg-[radial-gradient(circle_at_center,_rgba(6,182,212,0.05)_0%,_transparent_70%)] relative">
          <Terminal
            logs={logs}
            logsLoaded={logsLoaded}
            onCommand={handleCommand}
            isGenerating={isGenerating || isInitializing}
            suggestedActions={suggestedActions}
            generationElapsed={generationElapsed}
          />
          {error && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-rose-500/20 border border-rose-500 text-rose-200 px-4 py-2 rounded text-xs z-50 shadow-lg flex flex-col gap-2 max-w-md">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>{error}</span>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleRetry}
                  disabled={isGenerating}
                  className="border border-rose-400/50 hover:bg-rose-500/20 px-2 py-0.5 rounded transition-colors text-rose-300 disabled:opacity-30 cursor-pointer"
                >
                  Retry
                </button>
              </div>
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
