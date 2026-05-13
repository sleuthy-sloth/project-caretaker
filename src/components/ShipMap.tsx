import React from 'react';
import { X } from 'lucide-react';

interface ShipMapProps {
  open: boolean;
  onClose: () => void;
}

type SectionStatus = "intact" | "damaged" | "destroyed" | "unknown" | "current" | "sealed";

interface MapSection {
  id: string;
  label: string;
  deck: string;
  status: SectionStatus;
  note?: string;
}

const STATUS_STYLES: Record<SectionStatus, { fill: string; stroke: string; text: string; tag: string }> = {
  intact:    { fill: "fill-emerald-900/30",  stroke: "stroke-emerald-500/60", text: "text-emerald-300",   tag: "NOMINAL" },
  damaged:   { fill: "fill-amber-900/30",    stroke: "stroke-amber-500/70",   text: "text-amber-300",     tag: "DAMAGED" },
  destroyed: { fill: "fill-rose-900/40",     stroke: "stroke-rose-500/70",    text: "text-rose-300",      tag: "VENTED" },
  unknown:   { fill: "fill-slate-800/40",    stroke: "stroke-slate-500/50",   text: "text-slate-400",     tag: "SENSOR VOID" },
  current:   { fill: "fill-cyan-700/40",     stroke: "stroke-cyan-300",       text: "text-cyan-200",      tag: "YOU ARE HERE" },
  sealed:    { fill: "fill-violet-900/30",   stroke: "stroke-violet-500/60",  text: "text-violet-300",    tag: "SEALED" },
};

// Top-down cutaway, fore (nose) on the right, aft (engines) on the left.
// Decks stack vertically. Each section is a rectangle on the grid.
const SECTIONS: MapSection[] = [
  // Deck 1 — Command (top)
  { id: "bridge",     label: "BRIDGE",            deck: "DECK 01", status: "sealed",    note: "Emergency bulkheads engaged. Internal sensors offline." },
  { id: "comms",      label: "COMMS ARRAY",       deck: "DECK 01", status: "damaged",   note: "Long-range offline. Local salvageable." },

  // Deck 2-4 — Habitation & cryo (intact)
  { id: "cryo-03",    label: "CRYO BAY 03",       deck: "DECK 02", status: "current",   note: "Pod 04. You woke here." },
  { id: "cryo-01-02", label: "CRYO BAYS 01-02",   deck: "DECK 02", status: "intact",    note: "Pods in hibernation. Nominal." },
  { id: "cryo-04-06", label: "CRYO BAYS 04-06",   deck: "DECK 03", status: "intact",    note: "3,800 souls aboard. Nominal." },
  { id: "medical",    label: "MEDICAL BAY",       deck: "DECK 03", status: "damaged",   note: "12 crew in recovery pods. Supplies 60%." },
  { id: "junction-3b",label: "JUNCTION 3-B",      deck: "DECK 03", status: "damaged",   note: "Coolant line ruptured. Cold corridor." },

  // Deck 7-9 — Cryo bays destroyed
  { id: "cryo-07-09", label: "CRYO BAYS 07-09",   deck: "DECK 07", status: "destroyed", note: "Atmosphere vented. 4,200 lost. EVA required." },
  { id: "cryo-10-12", label: "CRYO BAYS 10-12",   deck: "DECK 08", status: "destroyed", note: "Atmosphere vented. Movement reading in Pod 11-37." },

  // Deck 10-12 — Engineering
  { id: "engineering",label: "ENGINEERING BAY",   deck: "DECK 11", status: "sealed",    note: "Bulkheads down. Vasquez's terminal inside." },
  { id: "crawlway",   label: "SERVICE CRAWLWAY",  deck: "DECK 11", status: "intact",    note: "Manual bypass to Engineering." },

  // Deck 13-14 — Reactor & the sensor void
  { id: "reactor-1",  label: "REACTOR CORE 1",    deck: "DECK 13", status: "intact",    note: "Primary online at 71%." },
  { id: "reactor-2",  label: "REACTOR CORE 2",    deck: "DECK 13", status: "damaged",   note: "Secondary containment failing. Radiation in Sector 8." },
  { id: "deck-14-9",  label: "SECTION 14-9",      deck: "DECK 14", status: "unknown",   note: "No sensor data. No explanation." },
  { id: "deck-14",    label: "DECK 14 (REST)",    deck: "DECK 14", status: "intact",    note: "Lights, atmosphere, gravity. Curiously well-maintained." },
];

// Layout: group sections by deck so we can render rows.
function groupByDeck(sections: MapSection[]): { deck: string; items: MapSection[] }[] {
  const order: string[] = [];
  const map: Record<string, MapSection[]> = {};
  for (const s of sections) {
    if (!map[s.deck]) { map[s.deck] = []; order.push(s.deck); }
    map[s.deck].push(s);
  }
  return order.map(deck => ({ deck, items: map[deck] }));
}

export function ShipMap({ open, onClose }: ShipMapProps) {
  if (!open) return null;

  const decks = groupByDeck(SECTIONS);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="GSS Theseus deck schematic"
    >
      <div
        className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-[#050507] border border-cyan-500/30 rounded-lg shadow-[0_0_60px_rgba(6,182,212,0.15)] font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scanline overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.05] rounded-lg"
             style={{ backgroundImage: "repeating-linear-gradient(0deg, #fff, #fff 1px, transparent 1px, transparent 2px)" }}></div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-cyan-900/40 bg-black/60 sticky top-0 z-10">
          <div className="flex flex-col">
            <span className="text-cyan-400 font-bold tracking-widest text-sm uppercase">
              GSS Theseus // Deck Schematic
            </span>
            <span className="text-[9px] text-cyan-700 uppercase tracking-widest">
              Aegis-pushed partial map · sensor-confidence variable · aft ◀ fore
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-cyan-400/70 hover:text-cyan-300 cursor-pointer p-1"
            aria-label="Close ship map"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 px-4 md:px-6 py-3 border-b border-cyan-900/30 text-[9px] uppercase tracking-widest">
          {(Object.keys(STATUS_STYLES) as SectionStatus[]).map(status => {
            const s = STATUS_STYLES[status];
            return (
              <div key={status} className="flex items-center gap-1.5">
                <span className={`inline-block w-3 h-3 border ${s.fill.replace('fill-', 'bg-')} ${s.stroke.replace('stroke-', 'border-')}`}></span>
                <span className={s.text}>{s.tag}</span>
              </div>
            );
          })}
        </div>

        {/* Deck rows */}
        <div className="p-4 md:p-6 space-y-2">
          {decks.map(({ deck, items }) => (
            <div key={deck} className="flex items-stretch gap-3 group">
              <div className="w-20 shrink-0 flex items-center justify-end pr-2 border-r border-cyan-900/40">
                <span className="text-[10px] text-cyan-600 uppercase tracking-widest">{deck}</span>
              </div>
              <div className="flex flex-wrap gap-2 flex-1">
                {items.map(section => {
                  const style = STATUS_STYLES[section.status];
                  return (
                    <div
                      key={section.id}
                      className={`relative flex-1 min-w-[140px] border ${style.stroke.replace('stroke-', 'border-')} ${style.fill.replace('fill-', 'bg-')} px-3 py-2 transition-all hover:brightness-125`}
                      title={section.note}
                    >
                      <div className={`text-[10px] font-bold uppercase tracking-widest ${style.text}`}>
                        {section.label}
                      </div>
                      <div className={`text-[8px] uppercase tracking-widest opacity-60 ${style.text}`}>
                        {style.tag}
                      </div>
                      {section.note && (
                        <div className="text-[9px] text-cyan-700/80 mt-1 leading-snug">
                          {section.note}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 md:px-6 py-3 border-t border-cyan-900/30 text-[9px] text-cyan-700 uppercase tracking-widest leading-relaxed">
          Schematic compiled from last verified sensor sweep. Sections marked
          SENSOR VOID return only static — Aegis cannot confirm their state.
          Use this map for orientation only; the ship has changed since the
          incident, and not all changes have been reported.
        </div>
      </div>
    </div>
  );
}
