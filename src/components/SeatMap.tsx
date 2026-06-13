"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, User } from "lucide-react";

export interface SeatData {
  id: string;
  section: string;
  status: "AVAILABLE" | "OCCUPIED" | "AWAY";
  activeSession: {
    id: string;
    userId: string;
    startedAt: string;
    awayUntil: string | null;
    nextPresenceCheckAt: string | null;
    user: {
      name: string | null;
      email: string;
    };
  } | null;
}

interface SeatMapProps {
  seats: SeatData[];
  onSelectSeat?: (seat: SeatData) => void;
  selectedSeatId?: string | null;
  showOccupantName?: boolean;
}

// ── Heat colour per status ──────────────────────────────────────────────────
function heatColor(status: SeatData["status"], selected: boolean) {
  if (selected) return { bg: "rgba(255,255,255,0.95)", ring: "#ffffff", glow: "0 0 14px rgba(255,255,255,0.7)" };
  return {
    AVAILABLE: { bg: "rgba(16,185,129,0.55)",  ring: "rgba(16,185,129,1)",   glow: "0 0 12px rgba(16,185,129,0.6)" },
    OCCUPIED:  { bg: "rgba(244,63,94,0.65)",   ring: "rgba(244,63,94,1)",    glow: "0 0 14px rgba(244,63,94,0.7)" },
    AWAY:      { bg: "rgba(245,158,11,0.55)",  ring: "rgba(245,158,11,1)",   glow: "0 0 12px rgba(245,158,11,0.6)" },
  }[status];
}

// ── Seat dot ───────────────────────────────────────────────────────────────
function SeatDot({
  seat,
  x,
  y,
  size = 14,
  selected,
  onHover,
  onClick,
  showLabel,
}: {
  seat: SeatData;
  x: number;
  y: number;
  size?: number;
  selected: boolean;
  onHover: (seat: SeatData | null, ex: number, ey: number) => void;
  onClick: (seat: SeatData) => void;
  showLabel: boolean;
}) {
  const c = heatColor(seat.status, selected);
  const r = size / 2;

  return (
    <g
      className="cursor-pointer"
      onClick={() => onClick(seat)}
      onMouseEnter={(e) => {
        const rect = (e.target as SVGElement).closest("svg")!.getBoundingClientRect();
        onHover(seat, e.clientX - rect.left, e.clientY - rect.top);
      }}
      onMouseLeave={() => onHover(null, 0, 0)}
    >
      {/* Outer glow halo */}
      <circle cx={x} cy={y} r={r + 5} fill="none" stroke={c.ring} strokeWidth="0.5" opacity="0.25" />
      {/* Fill */}
      <circle
        cx={x}
        cy={y}
        r={r}
        fill={c.bg}
        stroke={c.ring}
        strokeWidth={selected ? 2 : 1.5}
        style={{ filter: `drop-shadow(${c.glow})` }}
      />
      {/* Pulse ring for occupied/away */}
      {seat.status !== "AVAILABLE" && !selected && (
        <circle
          cx={x}
          cy={y}
          r={r + 2}
          fill="none"
          stroke={c.ring}
          strokeWidth="0.8"
          opacity="0.4"
        >
          <animate attributeName="r" values={`${r + 2};${r + 6};${r + 2}`} dur="2.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0;0.4" dur="2.5s" repeatCount="indefinite" />
        </circle>
      )}

      {showLabel && (
        <text
          x={x}
          y={y + r + 9}
          textAnchor="middle"
          fill={selected ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.64)"}
          fontSize="6.5"
          fontFamily="monospace"
          fontWeight="700"
          letterSpacing="0.06em"
          pointerEvents="none"
        >
          {seat.id}
        </text>
      )}
    </g>
  );
}

// ── Tooltip ─────────────────────────────────────────────────────────────────
function Tooltip({ seat, x, y, showOccupantName }: { seat: SeatData; x: number; y: number; showOccupantName: boolean }) {
  const statusLabel = { AVAILABLE: "Available", OCCUPIED: "Occupied", AWAY: "On Break" }[seat.status];
  const statusColor = { AVAILABLE: "#10b981", OCCUPIED: "#f43f5e", AWAY: "#f59e0b" }[seat.status];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.12 }}
      style={{ left: x + 12, top: y - 20, position: "absolute", zIndex: 50, pointerEvents: "none" }}
      className="w-48 bg-[#0a0a0c] border border-white/10 rounded-xl p-3 shadow-2xl"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold text-white">Seat {seat.id}</span>
        <span className="text-[9px] font-mono font-semibold" style={{ color: statusColor }}>{statusLabel}</span>
      </div>
      <div className="text-[9px] text-zinc-500 mb-2 truncate">{seat.section}</div>

      {seat.activeSession ? (
        <div className="space-y-1 border-t border-white/5 pt-2">
          {showOccupantName ? (
            <div className="flex items-center gap-1.5 text-zinc-300">
              <User className="w-3 h-3 text-zinc-500 shrink-0" />
              <span className="text-[10px] truncate">{seat.activeSession.user.name || seat.activeSession.user.email.split("@")[0]}</span>
            </div>
          ) : (
            <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Occupied</div>
          )}
          <div className="flex items-center gap-1.5 text-zinc-500">
            <Clock className="w-3 h-3 shrink-0" />
            <span className="text-[10px]">
              Since {new Date(seat.activeSession.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          {seat.activeSession.awayUntil && (
            <div className="text-[10px] text-amber-400">
              Break ends {new Date(seat.activeSession.awayUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
        </div>
      ) : (
        <div className="text-[10px] text-zinc-500 border-t border-white/5 pt-2 font-mono">Free — Scan QR code to occupy</div>
      )}
    </motion.div>
  );
}

// ── Floor Plan SVG ──────────────────────────────────────────────────────────
function FloorPlan({
  hallA,
  hallB,
  silentZone,
  selectedSeatId,
  onHover,
  onSelect,
}: {
  hallA: SeatData[];
  hallB: SeatData[];
  silentZone: SeatData[];
  selectedSeatId?: string | null;
  onHover: (seat: SeatData | null, x: number, y: number) => void;
  onSelect: (seat: SeatData) => void;
}) {
  const DOT = 14;
  const GAP = 26;

  // Hall A: 2 tables × 6 seats arranged around long tables
  // Table = 2 rows of 3 seats each side
  const hallASeatPositions = (startX: number, startY: number, seats: SeatData[]) => {
    // 6 seats: 3 top, 3 bottom of table
    const positions = [
      // top row
      { x: startX, y: startY - 18 },
      { x: startX + GAP, y: startY - 18 },
      { x: startX + GAP * 2, y: startY - 18 },
      // bottom row
      { x: startX, y: startY + 18 },
      { x: startX + GAP, y: startY + 18 },
      { x: startX + GAP * 2, y: startY + 18 },
    ];
    return seats.slice(0, 6).map((seat, i) => ({ seat, ...positions[i] }));
  };

  // Silent Zone: individual cubicles in 2 columns of 4
  const silentPositions = (startX: number, startY: number, seats: SeatData[]) =>
    seats.slice(0, 8).map((seat, i) => ({
      seat,
      x: startX + (i % 2) * 36,
      y: startY + Math.floor(i / 2) * 36,
    }));

  return (
    <svg viewBox="0 0 520 320" className="w-full h-full" style={{ overflow: "visible" }}>
      <defs>
        {/* Subtle grid */}
        <pattern id="fp-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
        </pattern>
        {/* Room fill */}
        <linearGradient id="roomGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
        </linearGradient>
      </defs>

      <rect width="520" height="320" fill="url(#fp-grid)" />

      {/* ── READING HALL A ── */}
      <g>
        {/* Room outline */}
        <rect x="18" y="18" width="210" height="230" rx="10"
          fill="url(#roomGrad)" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeDasharray="6 4" />
        {/* Label */}
        <text x="26" y="36" fill="rgba(255,255,255,0.2)" fontSize="8" fontFamily="monospace" fontWeight="bold" letterSpacing="2">
          READING HALL A
        </text>

        {/* Table 1 */}
        <rect x="44" y="85" width="64" height="18" rx="4" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
        {hallASeatPositions(50, 94, hallA.slice(0, 6)).map(({ seat, x, y }) => (
          <SeatDot key={seat.id} seat={seat} x={x} y={y} size={DOT}
            selected={selectedSeatId === seat.id} onHover={onHover} onClick={onSelect} showLabel />
        ))}

        {/* Table 2 */}
        <rect x="44" y="165" width="64" height="18" rx="4" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
        {hallASeatPositions(50, 174, hallA.slice(6, 12)).map(({ seat, x, y }) => (
          <SeatDot key={seat.id} seat={seat} x={x} y={y} size={DOT}
            selected={selectedSeatId === seat.id} onHover={onHover} onClick={onSelect} showLabel />
        ))}

        {/* Entrance hint */}
        <line x1="18" y1="230" x2="18" y2="200" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
        <text x="6" y="218" fill="rgba(255,255,255,0.12)" fontSize="6" fontFamily="monospace" transform="rotate(-90,6,218)">ENTRY</text>
      </g>

      {/* ── READING HALL B ── */}
      <g>
        <rect x="248" y="18" width="210" height="230" rx="10"
          fill="url(#roomGrad)" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" strokeDasharray="6 4" />
        <text x="256" y="36" fill="rgba(255,255,255,0.2)" fontSize="8" fontFamily="monospace" fontWeight="bold" letterSpacing="2">
          READING HALL B
        </text>

        {/* Table 1 */}
        <rect x="274" y="85" width="64" height="18" rx="4" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
        {hallASeatPositions(280, 94, hallB.slice(0, 6)).map(({ seat, x, y }) => (
          <SeatDot key={seat.id} seat={seat} x={x} y={y} size={DOT}
            selected={selectedSeatId === seat.id} onHover={onHover} onClick={onSelect} showLabel />
        ))}

        {/* Table 2 */}
        <rect x="274" y="165" width="64" height="18" rx="4" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
        {hallASeatPositions(280, 174, hallB.slice(6, 12)).map(({ seat, x, y }) => (
          <SeatDot key={seat.id} seat={seat} x={x} y={y} size={DOT}
            selected={selectedSeatId === seat.id} onHover={onHover} onClick={onSelect} showLabel />
        ))}
      </g>

      {/* ── SILENT ZONE ── */}
      <g>
        <rect x="18" y="262" width="440" height="52" rx="10"
          fill="url(#roomGrad)" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" strokeDasharray="6 4" />
        <text x="26" y="276" fill="rgba(255,255,255,0.2)" fontSize="8" fontFamily="monospace" fontWeight="bold" letterSpacing="2">
          SILENT ZONE — INDIVIDUAL CUBICLES
        </text>
        {/* 8 cubicle dividers + seats in a row */}
        {silentZone.slice(0, 8).map((seat, i) => {
          const x = 48 + i * 54;
          const y = 291;
          return (
            <g key={seat.id}>
              {/* Cubicle partition lines */}
              {i > 0 && <line x1={x - 20} y1="268" x2={x - 20} y2="308" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />}
              <SeatDot seat={seat} x={x} y={y} size={DOT}
                selected={selectedSeatId === seat.id} onHover={onHover} onClick={onSelect} showLabel />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

// ── Main SeatMap ────────────────────────────────────────────────────────────
export function SeatMap({ seats, onSelectSeat, selectedSeatId, showOccupantName = false }: SeatMapProps) {
  const [tooltip, setTooltip] = useState<{ seat: SeatData; x: number; y: number } | null>(null);

  const hallA = seats.filter((s) => s.section === "Reading Hall A");
  const hallB = seats.filter((s) => s.section === "Reading Hall B");
  const silentZone = seats.filter((s) => s.section === "Silent Zone");

  const total = seats.length;
  const available = seats.filter((s) => s.status === "AVAILABLE").length;
  const occupied = seats.filter((s) => s.status === "OCCUPIED").length;
  const away = seats.filter((s) => s.status === "AWAY").length;
  const occupancyPct = total > 0 ? Math.round(((occupied + away) / total) * 100) : 0;

  const handleHover = (seat: SeatData | null, x: number, y: number) => {
    setTooltip(seat ? { seat, x, y } : null);
  };

  const handleSelect = (seat: SeatData) => {
    onSelectSeat?.(seat);
  };

  return (
    <div className="flex flex-col gap-3 w-full select-none">

      {/* ── Compact stat strip ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        {/* Occupancy bar */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Library Occupancy</span>
            <span className="text-[9px] font-mono text-white font-bold">{occupancyPct}%</span>
          </div>
          <div className="h-[3px] rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500"
              initial={{ width: 0 }}
              animate={{ width: `${occupancyPct}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>
        {/* Pill counts */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex items-center gap-1 text-[9px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="text-emerald-400">{available}</span>
          </span>
          <span className="flex items-center gap-1 text-[9px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /><span className="text-rose-400">{occupied}</span>
          </span>
          {away > 0 && (
            <span className="flex items-center gap-1 text-[9px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /><span className="text-amber-400">{away}</span>
            </span>
          )}
        </div>
      </div>

      {/* ── Floor Plan ── */}
      <div className="relative w-full rounded-xl overflow-hidden bg-[#060608] border border-white/[0.04]">
        <FloorPlan
          hallA={hallA}
          hallB={hallB}
          silentZone={silentZone}
          selectedSeatId={selectedSeatId}
          onHover={handleHover}
          onSelect={handleSelect}
        />
        {/* Tooltip */}
        <AnimatePresence>
          {tooltip && (
            <Tooltip key={tooltip.seat.id} seat={tooltip.seat} x={tooltip.x} y={tooltip.y} showOccupantName={showOccupantName} />
          )}
        </AnimatePresence>
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-4 text-[9px] font-mono text-zinc-600">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500/50 ring-1 ring-emerald-500/60" />Available</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500/50 ring-1 ring-rose-500/60" />Occupied</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500/50 ring-1 ring-amber-500/60" />On Break</span>
        <span className="ml-auto text-zinc-700">Hover seat to inspect · Click to select</span>
      </div>

      {/* ── Selected seat strip ── */}
      <AnimatePresence>
        {selectedSeatId && (() => {
          const seat = seats.find((s) => s.id === selectedSeatId);
          if (!seat) return null;
          const statusColor = { AVAILABLE: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5", OCCUPIED: "text-rose-400 border-rose-500/20 bg-rose-500/5", AWAY: "text-amber-400 border-amber-500/20 bg-amber-500/5" }[seat.status];
          const dotColor = { AVAILABLE: "bg-emerald-500", OCCUPIED: "bg-rose-500", AWAY: "bg-amber-500" }[seat.status];
          return (
            <motion.div
              key={selectedSeatId}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
              className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${statusColor}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Seat {seat.id}</span>
                    <span className="text-[9px] font-mono">{seat.section}</span>
                  </div>
                  {seat.activeSession && showOccupantName && (
                    <span className="text-[10px] text-zinc-500 truncate block">
                      {seat.activeSession.user.name || seat.activeSession.user.email}
                    </span>
                  )}
                </div>
              </div>
              {seat.status === "AVAILABLE" && (
                <span className="text-[10px] text-emerald-400/80 font-mono font-bold uppercase tracking-wider">
                  [ Scan QR Code to Occupy ]
                </span>
              )}
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
