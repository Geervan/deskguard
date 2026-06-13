"use client";

import React, { useState, useEffect, useCallback } from "react";
import { LandingPage } from "@/components/LandingPage";
import { StudentDashboard } from "@/components/StudentDashboard";
import { LibrarianDashboard } from "@/components/LibrarianDashboard";
import { SimulatorPanel } from "@/components/SimulatorPanel";
import { SeatData } from "@/components/SeatMap";
import { Loader2, ShieldAlert } from "lucide-react";
import { BackgroundShell } from "@/components/BackgroundShell";

export default function Home() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [seatsLoaded, setSeatsLoaded] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // App data states
  const [seats, setSeats] = useState<SeatData[]>([]);
  const [stats, setStats] = useState<any>({
    total: 0,
    occupied: 0,
    away: 0,
    available: 0,
    occupancyRate: 0
  });
  
  // Connection states
  const [dbError, setDbError] = useState<string | null>(null);

  const fetchSeatsData = useCallback(async () => {
    try {
      const res = await fetch("/api/seats");
      const data = await res.json();
      
      if (data.success) {
        setSeats(data.seats || []);
        setStats(data.stats || {
          total: 0,
          occupied: 0,
          away: 0,
          available: 0,
          occupancyRate: 0
        });
        setDbError(null);
      } else {
        throw new Error(data.error || "Failed to load library seats configuration");
      }
    } catch (err: any) {
      console.error("Database connection or fetch error:", err);
      setDbError(err.message || "Failed to load seats database. Make sure DATABASE_URL is correctly set and migrations have been run.");
    } finally {
      setSeatsLoaded(true);
    }
  }, []);

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session");
      const data = await res.json();
      
      if (data.authenticated) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Session check failed:", err);
    } finally {
      setSessionChecked(true);
    }
  }, []);

  useEffect(() => {
    // Check auth session and fetch initial seats telemetry on load
    checkSession();
    fetchSeatsData();

    // Auto-poll seats status every 10 seconds for real-time telemetry updates
    const pollInterval = setInterval(() => {
      fetchSeatsData();
    }, 10000);

    return () => clearInterval(pollInterval);
  }, [checkSession, fetchSeatsData]);

  const handleAuthSuccess = (userData: any) => {
    setUser(userData);
    fetchSeatsData();
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
      setUser(null);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // 1. Database Connection Error alert screen (Checked first to prevent loop/hang)
  if (dbError && dbError.includes("DATABASE_URL")) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center min-h-[100dvh] bg-[#030303] text-white p-6">
        <div className="max-w-md w-full double-bezel-outer bg-zinc-950/80 border-rose-500/25">
          <div className="double-bezel-inner p-6 text-center space-y-4">
            <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
            <h2 className="text-lg font-bold text-white">Database Missing Connection</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Prisma is configured to use PostgreSQL. Please configure a valid <code>DATABASE_URL</code> connection string inside your <code>.env</code> file.
            </p>
            <div className="bg-black/40 border border-white/5 p-3 rounded-lg text-left text-[10px] font-mono text-rose-400 select-all overflow-x-auto">
              DATABASE_URL="postgresql://postgres:postgres@localhost:5432/deskguard"
            </div>
            <p className="text-[10px] text-zinc-600 font-mono leading-relaxed">
              After setting the environment variables, run your Prisma migrations:<br />
              <code className="text-zinc-400">npx prisma db push</code>
            </p>
            <button
              onClick={() => {
                setSessionChecked(false);
                setSeatsLoaded(false);
                checkSession();
                fetchSeatsData();
              }}
              className="w-full py-2 bg-white text-black text-xs font-bold rounded-xl btn-haptic"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </main>
    );
  }

  // 2. Initial boot screen: session checking and seats loading
  if (!sessionChecked || !seatsLoaded) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center min-h-[100dvh] bg-[#030303] text-white p-6 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.04)_0,transparent_60%)] pointer-events-none" />
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
        <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Securing Connection...</span>
      </main>
    );
  }

  // 3. User logged out: show beautiful landing page
  if (!user) {
    return (
      <LandingPage
        seats={seats}
        onAuthSuccess={handleAuthSuccess}
        onRefreshData={fetchSeatsData}
      />
    );
  }

  // Find user's active seat session if any
  const userActiveSeat = seats.find(s => s.activeSession?.userId === user.id);

  // 4. User logged in: Student or Librarian dashboard routes
  return (
    <main className="flex-1 min-h-[100dvh] bg-black text-white relative">
      <BackgroundShell />
      <div className="noise-overlay" />
      
      {user.role === "LIBRARIAN" ? (
        <LibrarianDashboard
          user={user}
          seats={seats}
          stats={stats}
          onLogout={handleLogout}
          onRefreshData={fetchSeatsData}
        />
      ) : (
        <StudentDashboard
          user={user}
          seats={seats}
          onLogout={handleLogout}
          onRefreshData={fetchSeatsData}
        />
      )}

      {/* Dev Time-Travel Simulator Control Panel */}
      <SimulatorPanel
        activeSeatId={userActiveSeat?.id}
        onRefreshData={fetchSeatsData}
      />
    </main>
  );
}
