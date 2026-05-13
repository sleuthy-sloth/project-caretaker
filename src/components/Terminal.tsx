import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface LogEntry {
  id: string;
  sender: "SYSTEM" | "AI" | "USER";
  text: string;
  timestamp: number;
}

interface TerminalProps {
  logs: LogEntry[];
  logsLoaded: boolean;
  onCommand: (command: string) => void;
  isGenerating: boolean;
  suggestedActions?: string[];
}

const LOADING_MESSAGES = [
  "Decrypting terminal buffer...",
  "Syncing with Aegis Core...",
  "Restoring from backup node...",
  "Calibrating display matrix..."
];

export function Terminal({ logs, logsLoaded, onCommand, isGenerating, suggestedActions = [] }: TerminalProps) {
  const [inputValue, setInputValue] = useState("");
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Rotate loading messages
  useEffect(() => {
    if (logsLoaded) return;
    const interval = setInterval(() => {
      setLoadingMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [logsLoaded]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
  }, [logs]);

  // Typewriter effect state
  const [displayedText, setDisplayedText] = useState<{ [id: string]: string }>({});
  const pendingAnimations = useRef(new Set<string>());

  const startAnimation = useCallback((logId: string, fullText: string) => {
    if (pendingAnimations.current.has(logId)) return;
    pendingAnimations.current.add(logId);

    let index = 0;
    const speed = fullText.length > 500 ? 5 : 15; // faster for long text
    const step = () => {
      if (index < fullText.length) {
        const chunk = fullText[index];
        index++;
        setDisplayedText(prev => ({
          ...prev,
          [logId]: (prev[logId] || '') + chunk,
        }));
        const delay = chunk === '\n' ? speed * 4 : speed;
        setTimeout(step, delay);
      } else {
        pendingAnimations.current.delete(logId);
      }
    };
    step();
  }, []);

  // Detect new logs and start typewriter if needed
  useEffect(() => {
    logs.forEach(log => {
      if (log.sender === 'USER') {
        // Show user text instantly
        setDisplayedText(prev => {
          if (prev[log.id] === undefined) {
            return { ...prev, [log.id]: log.text };
          }
          return prev;
        });
      } else if (log.sender === 'AI' || log.sender === 'SYSTEM') {
        setDisplayedText(prev => {
          if (prev[log.id] === undefined) {
            return { ...prev, [log.id]: '' };
          }
          return prev;
        });
        // Start animation on next tick to ensure state is initialized
        if (!pendingAnimations.current.has(log.id)) {
          setTimeout(() => startAnimation(log.id, log.text), 50);
        }
      }
    });
  }, [logs, startAnimation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isGenerating) return;

    onCommand(inputValue.trim());
    setInputValue("");
  };

  const handleQuickAction = (action: string) => {
    if (isGenerating) return;
    onCommand(action);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `[${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}]`;
  };

  return (
    <div className="flex-1 bg-black/60 border border-cyan-500/20 rounded-lg p-4 md:p-6 flex flex-col shadow-[inset_0_0_40px_rgba(0,0,0,0.8)] overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.03]"
           style={{ backgroundImage: "repeating-linear-gradient(0deg, #fff, #fff 1px, transparent 1px, transparent 2px)" }}></div>

      <div className="flex-1 font-mono text-sm leading-relaxed overflow-y-auto z-10 flex flex-col gap-4" ref={scrollRef}>
        {/* Loading state */}
        {!logsLoaded && (
          <div className="flex flex-col items-center justify-center h-full text-[10px] text-cyan-600 uppercase tracking-widest">
            <div className="animate-pulse mb-2">{LOADING_MESSAGES[loadingMessageIndex]}</div>
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        )}

        {/* Boot header */}
        {logs.length === 0 && logsLoaded && (
          <div className="text-cyan-500/40 text-[10px] mb-2 font-bold tracking-widest uppercase">
            [SYSTEM BOOT SUCCESSFUL // AUTHENTICATED AS CARETAKER]
          </div>
        )}

        {/* Log entries */}
        {logs.map((log) => (
          <div key={log.id}>
            {log.sender === "USER" ? (
              <div className="mb-2">
                <span className="text-cyan-400 mr-2">&gt;</span>
                <span className="text-white">{log.text}</span>
              </div>
            ) : log.sender === "SYSTEM" ? (
              <div className="text-rose-400/90 ml-4 mb-2 whitespace-pre-wrap">
                [SYSTEM]: {displayedText[log.id] ?? ""}
              </div>
            ) : (
              <div className="text-emerald-400/90 ml-4 mb-2 whitespace-pre-wrap">
                [AEGIS_CORE]: {displayedText[log.id] ?? ""}
              </div>
            )}
          </div>
        ))}

        {/* Generating indicator */}
        {isGenerating && (
          <div className="mb-2">
            <span className="text-cyan-400 mr-2">&gt;</span>
            <span className="text-cyan-500/60 italic">Processing command...</span>
            <span className="animate-pulse inline-block w-2 h-4 bg-cyan-500 align-middle ml-1"></span>
          </div>
        )}
      </div>

      {/* Suggested actions */}
      {suggestedActions.length > 0 && !isGenerating && (
        <div className="mt-3 z-10 flex flex-wrap gap-2">
          {suggestedActions.map((action, i) => (
            <button
              key={i}
              onClick={() => handleQuickAction(action)}
              className="text-[9px] border border-cyan-500/30 text-cyan-500/80 hover:text-cyan-300 hover:border-cyan-400/50 px-2 py-1 uppercase tracking-wider transition-colors cursor-pointer"
            >
              {action}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="mt-4 pt-4 border-t border-cyan-900/30 flex gap-4 items-center z-10">
        <span className="text-cyan-400 font-bold">$</span>
        <form onSubmit={handleSubmit} className="flex-1 flex">
          <input
            autoFocus
            type="text"
            className="bg-transparent border-none outline-none text-white flex-1 placeholder-cyan-900 font-mono text-sm uppercase"
            placeholder={isGenerating ? "Aegis Core processing..." : logsLoaded ? "Enter command..." : "Loading..."}
            spellCheck={false}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isGenerating || !logsLoaded}
          />
        </form>
      </div>
    </div>
  );
}
