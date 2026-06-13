"use client";

import React, { useEffect, useState, useTransition } from "react";
import { SeatMap, SeatData } from "./SeatMap";
import { LogOut, Trash2, RotateCcw, RefreshCw, Users, ChevronRight, UserCheck, User, Printer, QrCode, Calendar, MapPin } from "lucide-react";
import confetti from "canvas-confetti";
import { useConfirm } from "./ConfirmDialog";

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

function getLocalYYYYMMDD(dateInput: Date | string | number) {
  const d = new Date(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface LibrarianDashboardProps {
  user: { id: string; email: string; name: string | null; role: "STUDENT" | "LIBRARIAN" };
  seats: SeatData[];
  stats: {
    total: number;
    occupied: number;
    away: number;
    available: number;
    occupancyRate: number;
  };
  recentLogs?: Array<{
    id: string;
    seatId: string;
    action: string;
    timestamp: string;
  }>;
  onLogout: () => void;
  onRefreshData: () => Promise<void>;
}

interface SeatUserItem {
  id: string;
  name: string | null;
  email: string;
  activityCount: number;
  lastSeenAt: string;
  lastAction: string;
}

interface SeatActivityLog {
  id: string;
  seatId: string;
  action: string;
  timestamp: string;
}

export function LibrarianDashboard({
  user,
  seats,
  stats,
  onLogout,
  onRefreshData,
}: LibrarianDashboardProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  // Seat-detail panel state
  const [selectedSeat, setSelectedSeat] = useState<SeatData | null>(null);
  const [seatUsers, setSeatUsers] = useState<SeatUserItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<SeatUserItem | null>(null);
  const [selectedUserLogs, setSelectedUserLogs] = useState<SeatActivityLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string>("");
  const [filterDate, setFilterDate] = useState<string>(() => getLocalYYYYMMDD(new Date()));
  const [isPrintingAll, setIsPrintingAll] = useState(false);

  // Geofence configuration states
  const [geoConfig, setGeoConfig] = useState<{ lat: number; lng: number; radius: number } | null>(null);
  const [isPinning, setIsPinning] = useState(false);

  const { confirm, DialogNode } = useConfirm();

  // Fetch geofence settings on mount
  const fetchGeofence = async () => {
    try {
      const res = await fetch("/api/admin/geofence");
      const data = await res.json();
      if (data.success) {
        setGeoConfig(data.config);
      }
    } catch (e) {
      console.error("Failed to fetch geofence config", e);
    }
  };

  useEffect(() => {
    fetchGeofence();
  }, []);

  const handlePinLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser.");
      setTimeout(() => setErrorMsg(null), 3500);
      return;
    }
    setIsPinning(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch("/api/admin/geofence", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            }),
          });
          const data = await res.json();
          if (data.success) {
            setGeoConfig(data.config);
            setSuccessMsg("Library location pinned successfully to your current coordinates!");
            setTimeout(() => setSuccessMsg(null), 3500);
          } else {
            throw new Error(data.error);
          }
        } catch (err: any) {
          setErrorMsg(err.message || "Failed to update geofence coordinates");
          setTimeout(() => setErrorMsg(null), 3500);
        } finally {
          setIsPinning(false);
        }
      },
      (err) => {
        setErrorMsg(`Failed to get current location: ${err.message}`);
        setTimeout(() => setErrorMsg(null), 3500);
        setIsPinning(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleResetGeofence = async () => {
    setIsPinning(true);
    try {
      const res = await fetch("/api/admin/geofence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: 37.7749,
          lng: -122.4194,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGeoConfig(data.config);
        setSuccessMsg("Library location reset to default (San Francisco).");
        setTimeout(() => setSuccessMsg(null), 3500);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reset geofence coordinates");
      setTimeout(() => setErrorMsg(null), 3500);
    } finally {
      setIsPinning(false);
    }
  };

  useEffect(() => {
    if (selectedSeat) {
      const url = `${window.location.origin}/checkin/${selectedSeat.id}`;
      setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=160x160&color=d97706&bgcolor=08080a&data=${encodeURIComponent(url)}`);
    } else {
      setQrUrl("");
    }
  }, [selectedSeat]);

  // ── Fetch users for selected seat ──────────────────────────────────────────
  useEffect(() => {
    if (!selectedSeat) {
      setSeatUsers([]);
      setSelectedUser(null);
      setSelectedUserLogs([]);
      return;
    }
    setDetailLoading(true);
    setDetailError(null);
    setSelectedUser(null);
    setSelectedUserLogs([]);

    const tzOffset = new Date().getTimezoneOffset();
    const url = `/api/seats/${selectedSeat.id}/logs?date=${filterDate}&tzOffset=${tzOffset}`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.users) setSeatUsers(data.users);
        else setDetailError(data.error || "Failed to load seat history");
      })
      .catch(() => setDetailError("Network error loading seat history"))
      .finally(() => setDetailLoading(false));
  }, [selectedSeat, filterDate]);

  // ── Fetch logs for selected user on this seat ──────────────────────────────
  const handleSelectUser = async (item: SeatUserItem) => {
    setSelectedUser(item);
    if (!selectedSeat) return;
    try {
      const r = await fetch(`/api/seats/${selectedSeat.id}/logs?userId=${item.id}`);
      const data = await r.json();
      setSelectedUserLogs(data.logs || []);
    } catch {
      setSelectedUserLogs([]);
    }
  };

  const handleSelectSeat = (seat: SeatData) => {
    setSelectedSeat((prev) => (prev?.id === seat.id ? null : seat));
    setSelectedUser(null);
    setSelectedUserLogs([]);
  };

  const handleReleaseSeat = async (seatId: string) => {
    const ok = await confirm({
      title: `Force-release Seat ${seatId}?`,
      message: `This will immediately end the active session for Seat ${seatId} and mark it as available.`,
      confirmLabel: "Force Release",
      cancelLabel: "Cancel",
      variant: "warning",
    });
    if (!ok) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/sessions/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to release seat");
      setSuccessMsg(`Seat ${seatId} released.`);
      await onRefreshData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleResetDatabase = async () => {
    const ok = await confirm({
      title: "Clear All Data?",
      message: "This will wipe ALL active sessions and replace the database with fresh demo data. This action cannot be undone.",
      confirmLabel: "Yes, Clear All Data",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (!ok) return;
    setIsSeeding(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/demo/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to seed");
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      setSuccessMsg("Database cleared and re-seeded.");
      await onRefreshData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "CHECK_IN": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/25";
      case "TAKE_BREAK": return "text-amber-400 bg-amber-500/10 border-amber-500/25";
      case "RETURN_FROM_BREAK": return "text-emerald-300 bg-emerald-500/10 border-emerald-500/25";
      case "PRESENCE_CONFIRMED": return "text-sky-400 bg-sky-500/10 border-sky-500/25";
      case "PRESENCE_CHECK_MISSED": return "text-rose-400 bg-rose-500/10 border-rose-500/25";
      case "SESSION_ENDED_BY_STUDENT": return "text-zinc-400 bg-zinc-500/10 border-zinc-500/25";
      case "RELEASED_BY_LIBRARIAN": return "text-rose-400 bg-rose-500/10 border-rose-500/25";
      case "AUTO_RELEASED": return "text-rose-400 bg-rose-500/10 border-rose-500/25";
      default: return "text-zinc-400 bg-zinc-800 border-zinc-700";
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case "CHECK_IN": return "Checked In";
      case "TAKE_BREAK": return "Break Started";
      case "RETURN_FROM_BREAK": return "Break Returned";
      case "PRESENCE_CONFIRMED": return "Presence Verified";
      case "PRESENCE_CHECK_MISSED": return "Presence Missed";
      case "SESSION_ENDED_BY_STUDENT": return "Ended (Student)";
      case "RELEASED_BY_LIBRARIAN": return "Released (Admin)";
      case "AUTO_RELEASED": return "Break Expired";
      default: return action;
    }
  };

  return (
    <div className="w-full">
      {DialogNode}
      {/* Screen Layout */}
      <div className="space-y-8 w-full max-w-6xl mx-auto py-12 px-4 no-print">

      {/* ── Top bar ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-amber-500" /> Librarian Control Panel
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">{user.name} · {user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPrintingAll(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 rounded-xl text-xs text-amber-400 btn-haptic font-semibold cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5" /> Print All QRs
          </button>
          <button
            onClick={handleResetDatabase}
            disabled={isSeeding}
            className="flex items-center gap-1.5 px-3.5 py-1.5 border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 rounded-xl text-xs text-rose-400 btn-haptic font-semibold disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isSeeding ? "animate-spin" : ""}`} /> Clear All Data
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3.5 py-1.5 border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 rounded-xl text-xs text-rose-400 btn-haptic font-semibold"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Desks", value: stats.total, cls: "text-white" },
          { label: "Occupied", value: stats.occupied, cls: "text-rose-400" },
          { label: "Away", value: stats.away, cls: "text-amber-400" },
          { label: "Available", value: stats.available, cls: "text-emerald-400" },
          { label: "Occupancy", value: `${stats.occupancyRate}%`, cls: "text-white" },
        ].map(({ label, value, cls }) => (
          <div key={label} className="double-bezel-outer bg-zinc-950/80 backdrop-blur-sm">
            <div className="double-bezel-inner py-4 px-5">
              <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">{label}</span>
              <span className={`text-2xl font-bold font-mono ${cls}`}>{value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Geofence Control Center ── */}
      <div className="double-bezel-outer bg-zinc-950/80 backdrop-blur-sm">
        <div className="double-bezel-inner">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Library Geofence Center</h3>
                {geoConfig ? (
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                    Pinned: {geoConfig.lat.toFixed(6)}, {geoConfig.lng.toFixed(6)} &middot; Radius: {geoConfig.radius}m
                  </p>
                ) : (
                  <p className="text-[10px] text-zinc-600 mt-0.5">Loading pinned coordinates…</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleResetGeofence}
                disabled={isPinning}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] rounded-xl text-[10px] font-mono text-zinc-400 btn-haptic disabled:opacity-40"
              >
                <RotateCcw className={`w-3 h-3 ${isPinning ? "animate-spin" : ""}`} /> Reset Default
              </button>
              <button
                onClick={handlePinLocation}
                disabled={isPinning}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-emerald-500/25 bg-emerald-500/8 hover:bg-emerald-500/15 rounded-xl text-[10px] font-mono text-emerald-400 font-bold btn-haptic disabled:opacity-40"
              >
                <MapPin className={`w-3 h-3 ${isPinning ? "animate-pulse" : ""}`} />
                {isPinning ? "Locating…" : "Pin My Location as Library"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Visual Heatmap + Seat Table Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Visual Seating Heatmap */}
        <div className="lg:col-span-7 space-y-4">
          <div className="double-bezel-outer bg-zinc-950/80 backdrop-blur-sm">
            <div className="double-bezel-inner space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Visual Seating Heatmap</h3>
              </div>
              
              <SeatMap
                seats={seats}
                onSelectSeat={handleSelectSeat}
                selectedSeatId={selectedSeat?.id}
                showOccupantName={true}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Seat Occupancy Matrix (Table) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="double-bezel-outer bg-zinc-950/80 backdrop-blur-sm">
            <div className="double-bezel-inner space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-sm font-bold text-white">Seat Occupancy Matrix</h3>
                <button
                  onClick={() => startTransition(onRefreshData)}
                  disabled={isPending}
                  className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isPending ? "animate-spin" : ""}`} /> {isPending ? "Loading..." : "Refresh"}
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">{errorMsg}</div>
              )}
              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">{successMsg}</div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[460px] overflow-y-auto pr-1">
                {seats.map((seat) => {
                  const session = seat.activeSession;
                  const dotCls =
                    seat.status === "AVAILABLE" ? "bg-emerald-500" :
                    seat.status === "OCCUPIED" ? "bg-rose-500" : "bg-amber-500";
                  const isActive = selectedSeat?.id === seat.id;
                  return (
                    <div
                      key={seat.id}
                      onClick={() => handleSelectSeat(seat)}
                      className={`flex items-center justify-between gap-2 rounded-xl border p-2 transition-colors cursor-pointer text-xs ${
                        isActive
                          ? "border-amber-500/30 bg-amber-500/8"
                          : "border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotCls}`} />
                        <div className="min-w-0">
                          <span className="font-mono font-bold text-white block">{seat.id}</span>
                          <span className="text-[9px] text-zinc-500 block truncate leading-none mt-0.5">{seat.section}</span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {session ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleReleaseSeat(seat.id); }}
                            className="inline-flex items-center gap-1 py-1 px-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 rounded text-[9px] font-mono btn-haptic"
                          >
                            <Trash2 className="w-2.5 h-2.5" /> Release
                          </button>
                        ) : (
                          <span className="text-[9px] text-zinc-700 font-mono">Free</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-[10px] font-mono text-zinc-600 text-center pt-2 border-t border-white/5">
                Click any seat on map or table row to inspect per-seat activity log
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* ── Seat-scoped activity panel (slide-in from bottom) ── */}
      {selectedSeat && (
        <div className="fixed bottom-4 left-4 right-4 z-40 xl:left-auto xl:right-6 xl:bottom-6 xl:w-[440px]">
          <div className="double-bezel-outer bg-zinc-950/95 backdrop-blur-xl shadow-2xl">
            <div className="double-bezel-inner p-4 flex flex-col gap-4 max-h-[72dvh] overflow-y-auto">

              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-bold text-white">Seat {selectedSeat.id} History</h3>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{selectedSeat.section}</p>
                </div>
                <button
                  onClick={() => { setSelectedSeat(null); setSelectedUser(null); setSelectedUserLogs([]); setSeatUsers([]); }}
                  className="text-[10px] font-mono text-zinc-500 hover:text-white transition-colors shrink-0 mt-0.5"
                >
                  ✕ Close
                </button>
              </div>

              {/* Current occupant details */}
              {selectedSeat.activeSession ? (
                <div className="p-3.5 rounded-xl border border-amber-500/25 bg-amber-500/5 space-y-2">
                  <div className="text-[9px] font-mono text-amber-500/80 uppercase tracking-widest">Current Occupant</div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/35 flex items-center justify-center text-amber-400 text-xs font-bold font-mono shrink-0">
                      {(selectedSeat.activeSession.user.name || selectedSeat.activeSession.user.email)[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-white block truncate">
                        {selectedSeat.activeSession.user.name || "No Name"}
                      </span>
                      <span className="text-[10px] text-zinc-400 block truncate">
                        {selectedSeat.activeSession.user.email}
                      </span>
                    </div>
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono mt-1 pt-1.5 border-t border-white/5 space-y-0.5">
                    <div>Session started: {new Date(selectedSeat.activeSession.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                    {selectedSeat.activeSession.awayUntil && (
                      <div className="text-amber-400">
                        Away until: {new Date(selectedSeat.activeSession.awayUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-white/[0.01] border border-dashed border-white/5 rounded-xl text-center">
                  <p className="text-xs text-zinc-600">This seat is currently available.</p>
                </div>
              )}

              {/* Printable Desk QR Code */}
              {qrUrl && (
                <div className="p-3.5 bg-[#08080a] border border-white/5 rounded-xl flex items-center gap-4">
                  <div className="bg-black border border-amber-500/20 p-2 rounded-xl shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={qrUrl} 
                      alt={`QR Code for Seat ${selectedSeat.id}`} 
                      className="w-24 h-24 select-none" 
                    />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <span className="text-[9px] font-mono text-amber-500 uppercase tracking-widest block">Desk QR Token</span>
                    <span className="text-[11px] font-bold text-white block">Print Check-In Decal</span>
                    <p className="text-[10px] text-zinc-500 leading-normal">
                      Students scan this decal to occupy this desk. Geofenced to library.
                    </p>
                    <a
                      href={qrUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block text-[10px] font-mono font-bold text-amber-400 hover:text-white hover:underline mt-1.5"
                    >
                      Open QR Code image ↗
                    </a>
                  </div>
                </div>
              )}

              {detailError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">{detailError}</div>
              )}

              {/* Users list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Past users of this seat</span>
                    <span className="text-[10px] font-mono text-zinc-600">({seatUsers.length})</span>
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
                {detailLoading && seatUsers.length === 0 ? (
                  <div className="py-6 text-center text-xs text-zinc-600 border border-dashed border-white/5 rounded-2xl">Loading…</div>
                ) : seatUsers.length > 0 ? (
                  <div className="space-y-1.5">
                    {seatUsers.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelectUser(item)}
                        className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${
                          selectedUser?.id === item.id
                            ? "border-amber-500/30 bg-amber-500/8"
                            : "border-white/5 bg-white/[0.01] hover:bg-white/[0.03]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-white truncate block">{item.name || item.email}</span>
                            <span className="text-[10px] text-zinc-500 truncate block">{item.email}</span>
                          </div>
                          <div className="text-right shrink-0 flex items-center gap-2">
                            <span className="text-[10px] font-mono text-zinc-500">{item.activityCount} events</span>
                            <ChevronRight className="w-3 h-3 text-zinc-700" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-zinc-600 border border-dashed border-white/5 rounded-2xl">
                    No usage history yet for this seat.
                  </div>
                )}
              </div>

              {/* Per-user activity log for this seat */}
              {selectedUser && (
                <div className="space-y-3 border-t border-white/5 pt-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 truncate">
                      Activity — {selectedUser.name || selectedUser.email}
                    </span>
                    <button
                      onClick={() => { setSelectedUser(null); setSelectedUserLogs([]); }}
                      className="text-[9px] font-mono text-zinc-500 hover:text-white transition-colors ml-1 shrink-0"
                    >
                      ✕
                    </button>
                  </div>

                  {(() => {
                    const filteredLogs = filterDate
                      ? selectedUserLogs.filter(log => getLocalYYYYMMDD(log.timestamp) === filterDate)
                      : selectedUserLogs;

                    return filteredLogs.length > 0 ? (
                      <div className="max-h-[300px] overflow-y-auto pr-1 space-y-4">
                        {groupLogsByDate(filteredLogs).map(([dateStr, logsForDate]) => (
                          <div key={dateStr} className="space-y-2.5">
                            {/* Date Header */}
                            <div className="text-[9px] font-mono text-amber-500/80 uppercase tracking-wider bg-amber-500/5 border border-amber-500/10 px-2 py-0.5 rounded-md inline-block">
                              {dateStr}
                            </div>

                            {/* Group logs list */}
                            <div className="space-y-3 pl-2.5 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-white/5">
                              {logsForDate.map((log) => (
                                <div key={log.id} className="flex gap-3 relative">
                                  <span className={`w-2 h-2 rounded-full mt-1 border border-zinc-950 z-10 shrink-0 ${
                                    log.action === "CHECK_IN" ? "bg-emerald-500" :
                                    log.action === "TAKE_BREAK" ? "bg-amber-500" :
                                    log.action === "RETURN_FROM_BREAK" ? "bg-emerald-400" :
                                    log.action === "PRESENCE_CONFIRMED" ? "bg-sky-500" :
                                    "bg-rose-500"
                                  }`} />
                                  <div className="space-y-0.5">
                                    <div className="text-[9px] font-mono text-zinc-500">
                                      {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                    </div>
                                    <span className={`inline-flex px-1.5 py-0.5 rounded border text-[9px] font-mono ${getActionColor(log.action)}`}>
                                      {getActionText(log.action)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-xs text-zinc-600 border border-dashed border-white/5 rounded-2xl">
                        {filterDate ? "No activity logged for this date." : `No logs for this user on Seat ${selectedSeat.id}.`}
                      </div>
                    );
                  })()}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Printable All Decals Sheet */}
      {isPrintingAll && (
        <div className="fixed inset-0 z-50 bg-[#060608] overflow-y-auto p-8 no-print-overlay">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Print Library Seat Decals</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Generates check-in QR sheets for all registered seats.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold rounded-xl btn-haptic flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print Decals
                </button>
                <button
                  onClick={() => setIsPrintingAll(false)}
                  className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Grid of printable QR decals */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              {seats.map((seat) => {
                const checkinUrl = `${window.location.origin}/checkin/${seat.id}`;
                const qrCodeImg = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=000000&bgcolor=ffffff&data=${encodeURIComponent(checkinUrl)}`;
                return (
                  <div key={seat.id} className="border border-white/10 bg-zinc-950/40 p-5 rounded-2xl flex flex-col items-center justify-between gap-4 text-center break-inside-avoid">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-amber-500 uppercase tracking-widest block font-bold">DESKGUARD SYSTEM</span>
                      <h4 className="text-xl font-extrabold text-white">SEAT {seat.id}</h4>
                      <p className="text-[9px] text-zinc-500">{seat.section}</p>
                    </div>
                    
                    <div className="bg-white p-3 rounded-xl border border-white/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={qrCodeImg} 
                        alt={`QR Seat ${seat.id}`} 
                        className="w-32 h-32 select-none" 
                      />
                    </div>
                    
                    <div className="text-[8px] text-zinc-500 leading-normal max-w-[20ch]">
                      Scan to reserve. Subject to library geo-fence.
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Local Print Styles overrides */}
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              body {
                background: white !important;
                color: black !important;
              }
              .no-print {
                display: none !important;
              }
              /* Hide all background panels and overlays */
              .no-print-overlay, div[class*="fixed"], div[class*="fixed"] *, div[class*="fixed"] ~ *, .simulator-panel, .noise-overlay {
                display: none !important;
                visibility: hidden !important;
              }
              /* Show print sheet container only */
              .print-sheet-container {
                display: block !important;
                visibility: visible !important;
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                background: white !important;
                color: black !important;
              }
              .print-sheet-container * {
                visibility: visible !important;
              }
            }
          `}} />
        </div>
      )}
      </div>

      {/* Printable print-sheet helper container that is hidden on screen but visible during printing */}
      <div className="hidden print-sheet-container bg-white text-black p-8">
        <div className="text-center pb-6 border-b border-zinc-200 mb-8">
          <h2 className="text-xl font-extrabold">Library Seat Decals Listing</h2>
          <p className="text-xs text-zinc-600">Total Decals: {seats.length}</p>
        </div>
        <div className="grid grid-cols-3 gap-8">
          {seats.map((seat) => {
            const checkinUrl = `${window.location.origin}/checkin/${seat.id}`;
            const qrCodeImg = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=000000&bgcolor=ffffff&data=${encodeURIComponent(checkinUrl)}`;
            return (
              <div key={seat.id} className="border border-zinc-300 bg-white p-6 rounded-xl flex flex-col items-center justify-between gap-4 text-center break-inside-avoid page-break-inside-avoid">
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest block font-bold">DESKGUARD SYSTEM</span>
                  <h4 className="text-xl font-extrabold text-black">SEAT {seat.id}</h4>
                  <p className="text-[9px] text-zinc-650">{seat.section}</p>
                </div>
                
                <div className="bg-white p-2 rounded-lg border border-zinc-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={qrCodeImg} 
                    alt={`QR Seat ${seat.id}`} 
                    className="w-28 h-28 select-none" 
                  />
                </div>
                
                <div className="text-[8px] text-zinc-500 leading-normal max-w-[20ch]">
                  Scan to reserve. Subject to library geo-fence.
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
