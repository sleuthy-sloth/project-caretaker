import React, { useState, useEffect, useRef } from 'react';

export interface LogEntry {
  id: string;
  sender: "SYSTEM" | "AI" | "USER";
  text: string;
  timestamp: number;
}

interface TerminalProps {
  logs: LogEntry[];
  onCommand: (command: string) => void;
  isGenerating: boolean;
}

export function Terminal({ logs, onCommand, isGenerating }: TerminalProps) {
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Typewriter effect states
  const [displayedText, setDisplayedText] = useState<{ [id: string]: string }>({});

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, displayedText]);

  // Handle typewriter effect for AI/SYSTEM logs
  useEffect(() => {
    const newDisplayed = { ...displayedText };
    let needsUpdate = false;

    logs.forEach(log => {
      if (!newDisplayed[log.id] && newDisplayed[log.id] !== "") {
        if (log.sender === 'USER') {
          // Users don't get typewriter
          newDisplayed[log.id] = log.text;
          needsUpdate = true;
        } else {
          // Initialize empty string for typewriter
          newDisplayed[log.id] = "";
          needsUpdate = true;
        }
      }
    });

    if (needsUpdate) {
      setDisplayedText(newDisplayed);
    }
  }, [logs]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const activeLog = logs.find(log => 
      (log.sender === 'AI' || log.sender === 'SYSTEM') && 
      displayedText[log.id] !== undefined && 
      displayedText[log.id].length < log.text.length
    );

    if (activeLog) {
      const currentText = displayedText[activeLog.id];
      const nextChar = activeLog.text[currentText.length];
      
      timeoutId = setTimeout(() => {
        setDisplayedText(prev => ({
          ...prev,
          [activeLog.id]: prev[activeLog.id] + nextChar
        }));
      }, 15); // Typewriter speed (15ms per character)
    }

    return () => clearTimeout(timeoutId);
  }, [displayedText, logs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isGenerating) return;
    
    onCommand(inputValue.trim());
    setInputValue("");
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `[${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}]`;
  };

  return (
    <div className="flex-1 bg-black/60 border border-cyan-500/20 rounded-lg p-6 flex flex-col shadow-[inset_0_0_40px_rgba(0,0,0,0.8)] overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.03]" style={{ backgroundImage: "repeating-linear-gradient(0deg, #fff, #fff 1px, transparent 1px, transparent 2px)" }}></div>
      
      <div className="flex-1 font-mono text-sm leading-relaxed overflow-y-auto z-10 flex flex-col gap-4" ref={scrollRef}>
        <div className="text-cyan-500/40 text-[10px] mb-2 font-bold tracking-widest uppercase">
          [SYSTEM BOOT SUCCESSFUL // AUTHENTICATED AS CARETAKER]
        </div>
        
        {logs.map((log) => (
          <div key={log.id}>
            {log.sender === "USER" ? (
              <div className="mb-2">
                <span className="text-cyan-400 mr-2">&gt;</span>
                <span className="text-white">{log.text}</span>
              </div>
            ) : log.sender === "SYSTEM" ? (
              <div className="text-rose-400/90 ml-4 mb-2 whitespace-pre-wrap">
                [SYSTEM]: {displayedText[log.id] || ""}
              </div>
            ) : (
              <div className="text-emerald-400/90 ml-4 mb-2 whitespace-pre-wrap">
                [AEGIS_CORE]: {displayedText[log.id] || ""}
              </div>
            )}
          </div>
        ))}

        {isGenerating && (
          <div className="mb-2">
            <span className="text-cyan-400 mr-2">&gt;</span>
            <span className="text-cyan-500/60 italic">Analyzing current stress vectors...</span>
            <div className="animate-pulse inline-block w-2 h-4 bg-cyan-500 align-middle ml-1"></div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-cyan-900/30 flex gap-4 items-center z-10">
        <span className="text-cyan-400 font-bold">$</span>
        <form onSubmit={handleSubmit} className="flex-1 flex">
          <input
            autoFocus
            type="text"
            className="bg-transparent border-none outline-none text-white flex-1 placeholder-cyan-900 font-mono text-sm uppercase"
            placeholder={isGenerating ? "PROCESSING..." : "Enter command for Aegis Core..."}
            spellCheck={false}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isGenerating}
          />
        </form>
      </div>
    </div>
  );
}
