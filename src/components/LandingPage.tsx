"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SeatMap, SeatData } from "./SeatMap";
import { AuthPortal } from "./AuthPortal";
import { Shield, Sparkles, Map, Smartphone, Clock, X, ChevronRight, ArrowUpRight, Lock, Activity, QrCode } from "lucide-react";
import { BackgroundShell } from "./BackgroundShell";



interface LandingPageProps {
  seats: SeatData[];
  onAuthSuccess: (userData: any) => void;
  onRefreshData: () => Promise<void>;
}

export function LandingPage({ seats, onAuthSuccess, onRefreshData }: LandingPageProps) {
  const [selectedSeat, setSelectedSeat] = useState<SeatData | null>(null);

  // Group seats statistics
  const total = seats.length;
  const occupied = seats.filter(s => s.status === "OCCUPIED").length;
  const away = seats.filter(s => s.status === "AWAY").length;
  const available = seats.filter(s => s.status === "AVAILABLE").length;
  const occupancyRate = total > 0 ? Math.round(((occupied + away) / total) * 100) : 0;

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Easing curves
  const springTransition = { type: "spring" as const, stiffness: 100, damping: 20 };

  return (
    <div className="relative min-h-[100dvh] flex flex-col justify-between overflow-x-hidden font-sans bg-black text-white">
      
      {/* Background Gridlines & Glowing Orbs */}
      <BackgroundShell />

      {/* 1. FLOATING NAV (Fluid Island) */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 22 }}
        className="fixed top-6 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-5xl pointer-events-auto"
      >
        <nav className="glass-panel px-6 py-2.5 rounded-full flex items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.6)] border border-white/5">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div className="w-5 h-5 rounded-md bg-amber-500 flex items-center justify-center shadow-[0_0_12px_rgba(217,119,6,0.4)]">
              <Shield className="w-3 h-3 text-black stroke-[2.5]" />
            </div>
            <span className="text-xs font-bold tracking-wider text-white uppercase font-sans">DeskGuard</span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-[10px] font-mono tracking-widest uppercase text-zinc-400 font-semibold">
            <button onClick={() => scrollToSection("features")} className="hover:text-white transition-colors cursor-pointer">Features</button>
            <button onClick={() => scrollToSection("live-map")} className="hover:text-white transition-colors cursor-pointer">Live Map</button>
            <button onClick={() => scrollToSection("governance")} className="hover:text-white transition-colors cursor-pointer">Governance</button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.href = "/login"}
              className="px-4 py-1.5 rounded-full bg-white hover:bg-zinc-200 text-black font-bold text-xs transition-colors btn-haptic cursor-pointer"
            >
              Access Portal
            </button>
          </div>
        </nav>
      </motion.header>

      {/* 2. SPLIT HERO SECTION (Aurelia-style Grid Layout) */}
      <section className="relative flex items-center justify-center pt-32 pb-24 px-[8%] min-h-[100dvh] z-10">
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Headings & Subtexts (5 cols) */}
          <div className="lg:col-span-5 space-y-6 flex flex-col items-center lg:items-start text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/15 bg-amber-500/5 text-[9px] font-mono tracking-widest uppercase text-amber-500 font-semibold"
            >
              <Sparkles className="w-3 h-3" /> Anti-Hoarding System
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
              className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight text-white leading-[1.08] font-sans"
            >
              The missing library <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-500 to-amber-600 font-normal">
                seat vocabulary.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="text-xs md:text-sm text-zinc-400 max-w-[42ch] leading-relaxed"
            >
              Real-time library seat mapping, geofenced QR check-ins, and server-authoritative sweepers. Keep library study desks open for everyone.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto"
            >
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => window.location.href = "/login"}
                className="group pl-5 pr-2 py-2 rounded-full bg-amber-500 text-black font-bold text-xs flex items-center justify-between gap-5 btn-haptic w-full sm:w-auto shadow-[0_4px_20px_rgba(217,119,6,0.25)]"
              >
                <span>Launch Portal</span>
                <div className="w-7 h-7 rounded-full bg-zinc-950 text-amber-500 flex items-center justify-center">
                  <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              </motion.button>
              
              <button
                onClick={() => scrollToSection("features")}
                className="px-5 py-3 rounded-full border border-white/10 bg-white/[0.01] hover:bg-white/[0.05] text-zinc-300 font-semibold text-xs btn-haptic w-full sm:w-auto cursor-pointer"
              >
                Learn Rules
              </button>
            </motion.div>
          </div>

          {/* Right Column: Dynamic Live Seat Map framed inside Browser window (7 cols) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 80, damping: 18, delay: 0.2 }}
            className="lg:col-span-7 w-full bg-zinc-950 border border-white/5 rounded-2xl overflow-hidden shadow-2xl z-10"
          >
            {/* Browser Header Bar */}
            <div className="bg-zinc-900/80 px-4 py-2 border-b border-white/5 flex items-center justify-between gap-3">
              <div className="flex gap-1.5 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
              </div>
              <div className="flex-1 bg-black/40 border border-white/5 rounded px-4 py-0.5 text-[9px] font-mono text-zinc-500 text-center select-none max-w-xs truncate mx-auto">
                deskguard.college.edu/seats/live-map
              </div>
              <div className="w-10 shrink-0" />
            </div>
            {/* Live Map Content */}
            <div className="p-4 bg-zinc-950/40">
              <SeatMap
                seats={seats}
                onSelectSeat={(seat) => setSelectedSeat(seat)}
                selectedSeatId={selectedSeat?.id}
                showOccupantName={false}
              />
            </div>
          </motion.div>

        </div>
      </section>

      {/* 3. PREMIUM ASYMMETRIC BENTO GRID */}
      <section id="features" className="relative py-28 px-[8%] w-full border-t border-white/5 bg-zinc-950/20">
        
        <div className="mb-20 text-center max-w-xl mx-auto space-y-3">
          <span className="text-[10px] font-mono tracking-widest text-amber-500 uppercase">Governance Rules</span>
          <h2 className="text-2xl font-bold tracking-tight text-white uppercase font-sans">The Anti-Hoarding System</h2>
          <p className="text-xs text-zinc-500 leading-relaxed max-w-xs mx-auto">
            Rules designed to eliminate desk hoarding and ensure library table availability.
          </p>
        </div>

        {/* Bento Grid with scroll-triggered spring reveals */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Server Timer */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={springTransition}
            className="double-bezel-outer bg-zinc-950/80 md:col-span-2 border-white/5"
          >
            <div className="double-bezel-inner min-h-[200px] flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <Clock className="w-4 h-4" />
                </div>
                {/* Visual mock: Countdown progress bar */}
                <div className="bg-black/60 border border-white/5 px-3 py-1 rounded-md font-mono text-[9px] text-amber-500">
                  Break Session B05: [ 11:42 remaining ]
                </div>
              </div>
              
              <div className="space-y-1.5 mt-6">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Server-Authoritative Break Timer</h3>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Start a break to leave your desk. Your seat enters AWAY mode for exactly 20 minutes. Timers operate entirely in the database backend. If the time expires without return, the sweeper cron releases the desk automatically.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Geofence Verification */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ ...springTransition, delay: 0.05 }}
            className="double-bezel-outer bg-zinc-950/80 border-white/5"
          >
            <div className="double-bezel-inner min-h-[200px] flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 w-7 h-7 rounded-full flex items-center justify-center text-amber-400">
                  <Lock className="w-3 h-3" />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Geofenced QR Checkins</h3>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Students must scan the desk-mounted QR code when physically present to start their session, blocking attempts to save seats from host rooms.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Card 3: One Seat Limit */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={springTransition}
            className="double-bezel-outer bg-zinc-950/80 border-white/5"
          >
            <div className="double-bezel-inner min-h-[200px] flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <Shield className="w-4 h-4" />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">One Seat Constraint</h3>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Students are limited to a single desk. Attempting to check into another seat swaps your reservation, releasing the old seat instantly.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Card 4: Live Telemetry */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ ...springTransition, delay: 0.05 }}
            className="double-bezel-outer bg-zinc-950/80 md:col-span-2 border-white/5"
          >
            <div className="double-bezel-inner min-h-[200px] flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <Activity className="w-4 h-4" />
                </div>
                
                <div className="flex items-center gap-3 font-mono text-[9px]">
                  <span className="px-2 py-0.5 rounded border border-amber-500/20 bg-amber-500/5 text-amber-500">{available} AVAILABLE SEATS</span>
                </div>
              </div>
              
              <div className="space-y-1.5 mt-6">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Realtime Seating Telemetry</h3>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Check library occupancy in real-time. Our interactive seat map displays which tables are available before you walk over.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 4. GOVERNANCE RULES DETAILS */}
      <section id="governance" className="py-28 border-t border-white/5 px-6 max-w-3xl mx-auto w-full relative">
        <div className="mb-12 text-center space-y-2">
          <span className="text-[10px] font-mono tracking-widest text-amber-500 uppercase">Governance Protocol</span>
          <h2 className="text-2xl font-bold tracking-tight text-white uppercase">System Audits & Verification</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-[10px] text-zinc-400">
          <div className="double-bezel-outer bg-zinc-950/60 border-white/5">
            <div className="double-bezel-inner space-y-2 min-h-[140px]">
              <span className="text-white font-bold block">PRESENCE CONFIRMATION</span>
              <p className="leading-relaxed">Every 2 hours, students must confirm their presence at the desk. If they fail to confirm within a 5-minute grace period, their desk is automatically released.</p>
            </div>
          </div>

          <div className="double-bezel-outer bg-zinc-950/60 border-white/5">
            <div className="double-bezel-inner space-y-2 min-h-[140px]">
              <span className="text-white font-bold block">TRANSPARENT SYSTEM LEDGER</span>
              <p className="leading-relaxed">Check-ins, break limits, and administrative overrides are stored in a public activity ledger. Students and librarians can verify timestamps to prevent hoarding disputes.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CALL TO ACTION FOOTER */}
      <footer className="border-t border-white/5 py-20 px-6 bg-[#010101] text-center">
        <div className="max-w-xl mx-auto space-y-6">
          <h3 className="text-2xl font-bold tracking-tight text-white uppercase">Access Seating Terminal</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
            Verify seat status, log in using your college email address, or review admin logs.
          </p>
          
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => window.location.href = "/login"}
            className="group pl-6 pr-2.5 py-2.5 rounded-full bg-amber-500 text-black font-bold text-xs flex items-center justify-between gap-6 btn-haptic mx-auto cursor-pointer border border-amber-500 shadow-[0_4px_20px_rgba(217,119,6,0.25)]"
          >
            <span>Launch DeskGuard Portal</span>
            <div className="w-8 h-8 rounded-full bg-zinc-950 text-amber-500 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            </div>
          </motion.button>
          
          <div className="text-[9px] text-zinc-700 font-mono pt-12 uppercase tracking-widest">
            DeskGuard © {new Date().getFullYear()} College Library Administration.
          </div>
        </div>
      </footer>
    </div>
  );
}
