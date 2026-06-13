"use client";

import React, { useState, useEffect } from "react";
import { SeatMap, SeatData } from "./SeatMap";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, MapPin, Clock, Coffee, LogIn, CheckCircle2, AlertTriangle, ShieldCheck, QrCode } from "lucide-react";
import confetti from "canvas-confetti";
import { QrScannerModal } from "./QrScannerModal";
import { useConfirm } from "./ConfirmDialog";

interface StudentDashboardProps {
  user: { id: string; email: string; name: string | null; role: "STUDENT" | "LIBRARIAN" };
  seats: SeatData[];
  onLogout: () => void;
  onRefreshData: () => Promise<void>;
  timeTravelMinutes?: number;
}

function groupLogsByDate<T extends { timestamp: string | Date }>(logs: T[]) {
  const groups: Record<string, T[]> = {};
  logs.forEach((log) => {
    const dateStr = new Date(log.timestamp).toLocaleDateString([], {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    if (!groups[dateStr]) {
      groups[dateStr] = [];
    }
    groups[dateStr].push(log);
  });
  return Object.entries(groups);
}

export function StudentDashboard({ user, seats, onLogout, onRefreshData, timeTravelMinutes = 0 }: StudentDashboardProps) {
  const [selectedSeat, setSelectedSeat] = useState<SeatData | null>(null);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [personalLogs, setPersonalLogs] = useState<any[]>([]);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [filterDate, setFilterDate] = useState<string>("");
  const { confirm, DialogNode } = useConfirm();

  // Timers
  const [breakCountdown, setBreakCountdown] = useState<string>("");
  const [breakGraceCountdown, setBreakGraceCountdown] = useState<string>("");
  const [presenceCountdown, setPresenceCountdown] = useState<string>("");
  const [showPresenceCheck, setShowPresenceCheck] = useState(false);
  const [showBreakExpiredPrompt, setShowBreakExpiredPrompt] = useState(false);

  // Identify active session for this user
  useEffect(() => {
    const seatWithActiveSession = seats.find(s => s.activeSession?.userId === user.id);
    if (seatWithActiveSession && seatWithActiveSession.activeSession) {
      setActiveSession({
        ...seatWithActiveSession.activeSession,
        seatId: seatWithActiveSession.id,
        status: seatWithActiveSession.status
      });
    } else {
      setActiveSession(null);
    }

    fetchPersonalLogs();
  }, [seats, user.id]);

  const fetchPersonalLogs = async () => {
    try {
      const res = await fetch("/api/users/activity");
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setPersonalLogs(data.logs);
      }
    } catch (e) {
      console.error("Failed to load logs:", e);
    }
  };

  // Run countdown tickers for Break or Presence Checks
  useEffect(() => {
    if (!activeSession) return;

    const interval = setInterval(() => {
      const now = Date.now();

      // 1. Break timer
      if (activeSession.status === "AWAY" && activeSession.awayUntil) {
        const awayUntilTime = new Date(activeSession.awayUntil).getTime();
        const diffSecs = Math.max(0, Math.floor((awayUntilTime - now) / 1000));
        
        if (diffSecs === 0) {
          setBreakCountdown("Expired");
          // Check if grace period is set
          if (activeSession.breakGracePeriodEnd) {
            const graceEnd = new Date(activeSession.breakGracePeriodEnd).getTime();
            const graceDiffSecs = Math.max(0, Math.floor((graceEnd - now) / 1000));
            
            if (graceDiffSecs > 0) {
              setShowBreakExpiredPrompt(true);
              const mins = Math.floor(graceDiffSecs / 60);
              const secs = graceDiffSecs % 60;
              setBreakGraceCountdown(`${mins}:${secs < 10 ? "0" + secs : secs}`);
            } else {
              setBreakGraceCountdown("Expired");
              onRefreshData();
            }
          }
        } else {
          const mins = Math.floor(diffSecs / 60);
          const secs = diffSecs % 60;
          setBreakCountdown(`${mins}:${secs < 10 ? "0" + secs : secs}`);
        }
      } else {
        setBreakCountdown("");
        setShowBreakExpiredPrompt(false);
        setBreakGraceCountdown("");
      }

      // 2. Presence Check timer
      if (activeSession.nextPresenceCheckAt) {
        const checkTime = new Date(activeSession.nextPresenceCheckAt).getTime();
        
        // Presence check is due when current time has reached or passed nextPresenceCheckAt
        const isDue = now >= checkTime;
        setShowPresenceCheck(isDue);

        if (isDue) {
          // Grace period: 5 minutes from the scheduled presence check
          const gracePeriodEnd = checkTime + 5 * 60 * 1000;
          const diffSecs = Math.max(0, Math.floor((gracePeriodEnd - now) / 1000));
          
          if (diffSecs === 0) {
            setPresenceCountdown("Expired");
            onRefreshData();
          } else {
            const mins = Math.floor(diffSecs / 60);
            const secs = diffSecs % 60;
            setPresenceCountdown(`${mins}:${secs < 10 ? "0" + secs : secs}`);
          }
        } else {
          setPresenceCountdown("");
        }
      } else {
        setShowPresenceCheck(false);
        setPresenceCountdown("");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession, onRefreshData]);

  const handleTakeBreak = async () => {
    setIsActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/sessions/break/start", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start break");
      
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.8 } });
      await onRefreshData();
      await fetchPersonalLogs();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReturnFromBreak = async () => {
    setIsActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/sessions/break/end", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to return from break");

      confetti({ particleCount: 50, spread: 80, origin: { y: 0.8 } });
      await onRefreshData();
      await fetchPersonalLogs();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleExtendBreak = async () => {
    setIsActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/sessions/break/extend", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to extend break");

      confetti({ particleCount: 30, spread: 60, origin: { y: 0.8 } });
      await onRefreshData();
      await fetchPersonalLogs();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleConfirmPresence = async () => {
    setIsActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/sessions/presence/confirm", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to confirm presence");

      confetti({ particleCount: 80, spread: 100, colors: ["#10b981", "#ffffff"] });
      await onRefreshData();
      await fetchPersonalLogs();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleLeaveSeat = async () => {
    const ok = await confirm({
      title: "Leave Seat?",
      message: "Are you sure you want to leave your seat? This will end your active session immediately.",
      confirmLabel: "Yes, Leave Seat",
      cancelLabel: "Stay",
      variant: "danger",
    });
    if (!ok) return;
    
    setIsActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/sessions/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to release seat");

      await onRefreshData();
      await fetchPersonalLogs();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const getActionNameText = (action: string) => {
    switch (action) {
      case "CHECK_IN": return "Checked into seat";
      case "TAKE_BREAK": return "Started 20m break";
      case "RETURN_FROM_BREAK": return "Returned from break";
      case "PRESENCE_CONFIRMED": return "Presence verified";
      case "PRESENCE_CHECK_MISSED": return "Presence check missed — Released";
      case "SESSION_ENDED_BY_STUDENT": return "Voluntarily ended session";
      case "RELEASED_BY_LIBRARIAN": return "Released by Librarian";
      case "AUTO_RELEASED": return "Break expired — Released automatically";
      default: return action;
    }
  };

  return (
    <div className="space-y-8 w-full max-w-6xl mx-auto py-12 px-4">
      {DialogNode}
      {/* Student Top Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Student Dashboard</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Logged in as {user.name} ({user.email})</p>
        </div>
        
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 px-3.5 py-1.5 border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] rounded-xl text-xs text-zinc-400 btn-haptic font-semibold"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Map or Active Session Status */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Active Session Management Card */}
          {activeSession ? (
            <div className="double-bezel-outer bg-zinc-950/80 backdrop-blur-md">
              <div className="double-bezel-inner space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-emerald-500" />
                    <div>
                      <h2 className="text-sm font-bold text-white">Your Seat: {activeSession.seatId}</h2>
                      <span className="text-[10px] font-mono text-zinc-500">{seats.find(s => s.id === activeSession.seatId)?.section}</span>
                    </div>
                  </div>
                  <span className={`text-xs font-mono px-3 py-1 rounded-full border ${
                    activeSession.status === "OCCUPIED" 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse"
                  }`}>
                    {activeSession.status === "OCCUPIED" ? "Session Active" : "Away on Break"}
                  </span>
                </div>

                {/* Session Timers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">Session Started</span>
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="w-4 h-4 text-zinc-400" />
                      <span className="text-sm font-semibold text-zinc-200">
                        {new Date(activeSession.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Break Timer or regular timer */}
                  <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
                    {activeSession.status === "AWAY" ? (
                      <>
                        <span className="text-[10px] font-mono text-amber-500 uppercase block mb-1">Break Time Remaining</span>
                        <span className="text-xl font-bold text-amber-400 mt-2 font-mono">{breakCountdown || "Calculating..."}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">Next Presence Check</span>
                        <div className="flex items-center gap-2 mt-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-500/80" />
                          <span className="text-sm font-semibold text-zinc-200">
                            {new Date(activeSession.nextPresenceCheckAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Break Expired Alert Banner */}
                <AnimatePresence>
                  {showBreakExpiredPrompt && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-bold text-rose-300">Your break has expired!</h4>
                          <p className="text-[10px] text-zinc-400 mt-0.5">Would you like to extend your break or release your seat? Time left to respond: <span className="font-mono font-semibold text-white">{breakGraceCountdown}</span></p>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={handleExtendBreak}
                          disabled={isActionLoading}
                          className="py-1.5 px-4 bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold rounded-xl btn-haptic disabled:opacity-50"
                        >
                          Extend Break
                        </button>
                        <button
                          onClick={handleLeaveSeat}
                          disabled={isActionLoading}
                          className="py-1.5 px-4 bg-white hover:bg-zinc-200 text-black text-xs font-bold rounded-xl btn-haptic disabled:opacity-50"
                        >
                          Release Seat
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Presence check Alert Banner */}
                <AnimatePresence>
                  {showPresenceCheck && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-bold text-amber-300">Are you still studying at Seat {activeSession.seatId}?</h4>
                          <p className="text-[10px] text-zinc-400 mt-0.5">Confirm your presence to avoid automatically releasing your desk. Time left: <span className="font-mono font-semibold text-white">{presenceCountdown}</span></p>
                        </div>
                      </div>
                      <button
                        onClick={handleConfirmPresence}
                        disabled={isActionLoading}
                        className="py-1.5 px-4 bg-amber-500 text-black text-xs font-bold rounded-xl btn-haptic shrink-0 disabled:opacity-50"
                      >
                        Yes, I'm Here
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Dashboard Action Controls */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-white/5">
                  {activeSession.status === "OCCUPIED" ? (
                    <button
                      onClick={handleTakeBreak}
                      disabled={isActionLoading || showPresenceCheck}
                      className="flex-1 py-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] text-white font-semibold text-xs flex items-center justify-center gap-2 btn-haptic disabled:opacity-50"
                    >
                      <Coffee className="w-4 h-4 text-zinc-400" /> Take Break (20m)
                    </button>
                  ) : (
                    <button
                      onClick={handleReturnFromBreak}
                      disabled={isActionLoading}
                      className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs flex items-center justify-center gap-2 btn-haptic"
                    >
                      <LogIn className="w-4 h-4" /> Return to Seat
                    </button>
                  )}

                  <button
                    onClick={handleLeaveSeat}
                    disabled={isActionLoading}
                    className="flex-1 py-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs flex items-center justify-center gap-2 btn-haptic"
                  >
                    Leave Seat (Voluntary release)
                  </button>
                </div>

                {errorMsg && (
                  <p className="text-center text-xs text-rose-500 font-mono mt-2">{errorMsg}</p>
                )}
              </div>
            </div>
          ) : (
            // Live seat layout map for booking
            <div className="space-y-4">
              <div className="bg-zinc-950/20 border border-white/5 rounded-2xl p-6 text-center space-y-4">
                <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto">
                  You do not occupy any seat right now. Scan a library desk QR code or click on any available seat on the map to confirm occupation.
                </p>
                <button
                  onClick={() => setIsScannerOpen(true)}
                  className="mx-auto flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold rounded-xl btn-haptic shadow-[0_4px_16px_rgba(217,119,6,0.2)]"
                >
                  <QrCode className="w-4 h-4" /> Scan Desk QR Code
                </button>
              </div>
              <SeatMap
                seats={seats}
                onSelectSeat={(seat) => setSelectedSeat(seat)}
                selectedSeatId={selectedSeat?.id}
                showOccupantName={false}
              />
            </div>
          )}

        </div>

        {/* Right Column: Personal Activity Timeline Logs */}
        <div className="double-bezel-outer bg-zinc-950/80 backdrop-blur-md">
          <div className="double-bezel-inner min-h-[400px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4 gap-4">
                <div className="flex items-center gap-1.5 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-bold text-white truncate">Your Activity Timeline</h3>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="bg-zinc-900 border border-white/10 rounded-lg text-[10px] font-mono px-2 py-1 text-zinc-300 focus:border-amber-500 focus:outline-none select-none cursor-pointer"
                  />
                  {filterDate && (
                    <button
                      onClick={() => setFilterDate("")}
                      className="text-[9px] font-mono text-zinc-500 hover:text-white transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Logs Timeline grouped by date */}
              {(() => {
                const filteredLogs = filterDate
                  ? personalLogs.filter(log => new Date(log.timestamp).toISOString().split('T')[0] === filterDate)
                  : personalLogs;

                return filteredLogs.length > 0 ? (
                  <div className="max-h-[420px] overflow-y-auto pr-1 space-y-6">
                    {groupLogsByDate(filteredLogs).map(([dateStr, logsForDate]) => (
                      <div key={dateStr} className="space-y-3">
                        {/* Date Header */}
                        <div className="text-[9px] font-mono text-amber-500/85 uppercase tracking-wider bg-amber-500/5 border border-amber-500/10 px-2.5 py-1 rounded-md inline-block">
                          {dateStr}
                        </div>

                        {/* Timeline items for this date */}
                        <div className="space-y-4 pl-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-white/5">
                          {logsForDate.map((log) => (
                            <div key={log.id} className="flex gap-4 relative group">
                              {/* Timeline dot */}
                              <span className={`w-2 h-2 rounded-full mt-1.5 border border-zinc-950 z-10 shrink-0 ${
                                log.action === "CHECK_IN" ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" :
                                log.action === "TAKE_BREAK" ? "bg-amber-500" :
                                log.action === "RETURN_FROM_BREAK" ? "bg-emerald-400" :
                                log.action === "PRESENCE_CONFIRMED" ? "bg-sky-500" :
                                "bg-rose-500"
                              }`} />
                              
                              <div className="space-y-0.5">
                                <span className="text-[9px] font-mono text-zinc-500 block">
                                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                                <p className="text-xs text-zinc-300 font-medium leading-normal">
                                  {getActionNameText(log.action)} <span className="font-mono text-[10px] text-zinc-400 bg-white/5 px-1 py-0.2 rounded border border-white/5">{log.seatId}</span>
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center text-xs text-zinc-700 bg-white/[0.01] border border-dashed border-white/5 rounded-2xl">
                    {filterDate ? "No activity logged for this date." : "No activity logged yet. Your check-in and breaks will appear here in chronological order."}
                  </div>
                );
              })()}
            </div>

            <div className="text-[10px] font-mono text-zinc-700 mt-6 pt-3 border-t border-white/5 text-center">
              Logs are system-authoritative
            </div>
          </div>
        </div>

      </div>
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        seats={seats.map(s => ({ id: s.id, section: s.section }))}
      />
    </div>
  );
}
