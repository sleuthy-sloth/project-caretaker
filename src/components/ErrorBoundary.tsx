import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[AEGIS CORE] Fatal error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full bg-[#050507] text-[#a0aec0] flex flex-col items-center justify-center font-mono relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.03]"
               style={{ backgroundImage: "repeating-linear-gradient(0deg, #fff, #fff 1px, transparent 1px, transparent 2px)" }} />
          <div className="z-10 text-center mb-4 text-rose-500/40 text-xs tracking-widest uppercase animate-pulse">
            [ AEGIS CORE CRITICAL FAILURE ]
          </div>
          <h1 className="text-2xl text-rose-400 mb-4 tracking-widest uppercase z-10 font-bold">
            SYSTEM COLLAPSE
          </h1>
          <div className="z-10 text-xs opacity-60 mb-8 max-w-md text-center font-mono leading-relaxed">
            <p className="mb-2">A fatal error has occurred in the Aegis Core matrix.</p>
            <p className="text-[10px] text-rose-600/80 break-all">
              {this.state.error?.message || "UNKNOWN ERROR"}
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="z-10 border border-cyan-500/50 text-cyan-400 px-6 py-2 uppercase tracking-widest hover:bg-cyan-900/30 transition-colors cursor-pointer text-sm"
          >
            Reboot Aegis Core
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
