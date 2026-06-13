"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, FastForward, Play, ChevronRight, ChevronLeft, Loader2, Sparkles, Server } from "lucide-react";

interface SimulatorPanelProps {
  activeSeatId?: string | null;
  onRefreshData: () => Promise<void>;
}

export function SimulatorPanel({ activeSeatId, onRefreshData }: SimulatorPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>(["Simulator ready. Start a session to test."]);
  const [mockLocation, setMockLocation] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("deskguard_mock_location") || "REAL";
    }
    return "REAL";
  });

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 8));
  };

  const handleLocationChange = (val: string) => {
    setMockLocation(val);
    localStorage.setItem("deskguard_mock_location", val);
    addLog(`📍 Mock Location: ${val}`);
    window.dispatchEvent(new Event("deskguard_mock_location_changed"));
  };

  const handleTimeTravel = async (minutes: number) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/demo/time-travel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes, seatId: activeSeatId }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Time travel failed");

      addLog(`Success: Advanced time by ${minutes} minutes. DB timestamps shifted.`);
      await onRefreshData();
    } catch (err: any) {
      addLog(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerSweep = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/cron/sweep", { method: "POST" });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Sweeper execution failed");

      addLog("Sweeper Cron Triggered.");
      if (data.actions && data.actions.length > 0) {
        data.actions.forEach((act: string) => addLog(`🧹 ${act}`));
      } else {
        addLog("🧹 Sweeper completed: No expired sessions found.");
      }
      
      await onRefreshData();
    } catch (err: any) {
      addLog(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-end gap-3 pointer-events-none">
      
      {/* Expanded simulator control panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
            className="w-80 double-bezel-outer bg-zinc-950/90 backdrop-blur-md shadow-2xl pointer-events-auto"
          >
            <div className="double-bezel-inner p-4 space-y-4">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white">Time Travel Simulator</span>
                </div>
                <span className="text-[9px] font-mono text-zinc-500 bg-white/5 border border-white/10 px-1.5 py-0.2 rounded">
                  Admin Panel
                </span>
              </div>

              {/* Time Travel Controllers */}
              <div className="space-y-2.5">
                <span className="text-[9px] font-mono text-zinc-500 uppercase block">Database Time Travel</span>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleTimeTravel(20)}
                    disabled={isLoading}
                    className="py-2 px-3 bg-white/[0.02] border border-white/5 hover:bg-white/[0.06] rounded-xl text-[10px] font-mono text-zinc-300 font-semibold btn-haptic flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <FastForward className="w-3.5 h-3.5" /> +20 Mins (Break)
                  </button>
                  <button
                    onClick={() => handleTimeTravel(120)}
                    disabled={isLoading}
                    className="py-2 px-3 bg-white/[0.02] border border-white/5 hover:bg-white/[0.06] rounded-xl text-[10px] font-mono text-zinc-300 font-semibold btn-haptic flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <FastForward className="w-3.5 h-3.5" /> +2 Hours (Verify)
                  </button>
                </div>

                <button
                  onClick={() => handleTimeTravel(125)}
                  disabled={isLoading}
                  className="w-full py-2 px-3 bg-white/[0.02] border border-white/5 hover:bg-white/[0.06] rounded-xl text-[10px] font-mono text-zinc-300 font-semibold btn-haptic flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <FastForward className="w-3.5 h-3.5" /> +2 Hours 5 Mins (Abandon)
                </button>
              </div>

              {/* Geofence Simulator */}
              <div className="space-y-2 border-t border-white/5 pt-3">
                <span className="text-[9px] font-mono text-zinc-500 uppercase block">Geofence Location Mock</span>
                <div className="grid grid-cols-3 gap-1 bg-black/40 border border-white/5 p-1 rounded-xl">
                  {[
                    { id: "INSIDE", label: "Inside" },
                    { id: "OUTSIDE", label: "Outside" },
                    { id: "REAL", label: "Real GPS" }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleLocationChange(opt.id)}
                      className={`py-1.5 px-2 rounded-lg text-[9px] font-mono font-bold transition-all ${
                        mockLocation === opt.id
                          ? "bg-amber-500 text-black shadow-sm font-extrabold"
                          : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sweeper trigger */}
              <div className="space-y-2 border-t border-white/5 pt-3">
                <span className="text-[9px] font-mono text-zinc-500 uppercase block">Sweeper Engine</span>
                <button
                  onClick={handleTriggerSweep}
                  disabled={isLoading}
                  className="w-full py-2 px-3 bg-amber-500 text-black rounded-xl text-[10px] font-mono font-bold btn-haptic flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current" /> Trigger Sweeper Cron
                    </>
                  )}
                </button>
              </div>

              {/* Console logs */}
              <div className="space-y-1.5 border-t border-white/5 pt-3">
                <div className="flex items-center gap-1 text-[9px] font-mono text-zinc-500 uppercase">
                  <Server className="w-3 h-3" /> Console Output
                </div>
                <div className="bg-black/50 border border-white/5 p-2 rounded-lg font-mono text-[9px] text-zinc-400 h-28 overflow-y-auto space-y-1 select-text">
                  {logs.map((log, idx) => (
                    <div key={idx} className="leading-tight break-words">{log}</div>
                  ))}
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-12 w-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl pointer-events-auto hover:bg-zinc-200 transition-colors btn-haptic"
      >
        {isOpen ? <ChevronRight className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
      </button>

    </div>
  );
}
