"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AuthPortal } from "@/components/AuthPortal";
import { QrCode, MapPin, CheckCircle2, ShieldAlert, ArrowLeft, Loader2, Compass } from "lucide-react";
import confetti from "canvas-confetti";

const LIBRARY_LAT = 37.7749;
const LIBRARY_LNG = -122.4194;

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
}

export default function CheckinPage() {
  const params = useParams();
  const router = useRouter();
  const seatId = params.seatId as string;

  const [sessionChecked, setSessionChecked] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [seatStatus, setSeatStatus] = useState<any>(null);
  
  // Checking states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeSessionSeat, setActiveSessionSeat] = useState<string | null>(null);

  // Geofence states
  const [geoMode, setGeoMode] = useState<string>("REAL");
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});
  const [distance, setDistance] = useState<number | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isGeoVerifying, setIsGeoVerifying] = useState(false);
  const [libraryCoords, setLibraryCoords] = useState({ lat: 37.7749, lng: -122.4194, radius: 100 });

  const runLocationCheck = () => {
    const currentMode = (typeof window !== "undefined" && localStorage.getItem("deskguard_mock_location")) || "REAL";
    setGeoMode(currentMode);
    setGeoError(null);
    setDistance(null);
    setCoords({});

    if (currentMode === "INSIDE") {
      setCoords({ lat: libraryCoords.lat, lng: libraryCoords.lng });
      setDistance(0);
      return;
    }

    if (currentMode === "OUTSIDE") {
      const mockLat = libraryCoords.lat + 0.1;
      const mockLng = libraryCoords.lng + 0.1;
      setCoords({ lat: mockLat, lng: mockLng });
      const dist = getDistanceMeters(mockLat, mockLng, libraryCoords.lat, libraryCoords.lng);
      setDistance(dist);
      setGeoError(`Outside geofence. Distance: ${Math.round(dist)}m from Library. Max allowed: ${libraryCoords.radius}m.`);
      return;
    }

    // Real Browser GPS
    setIsGeoVerifying(true);
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      setIsGeoVerifying(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        const dist = getDistanceMeters(latitude, longitude, libraryCoords.lat, libraryCoords.lng);
        setDistance(dist);
        if (dist > libraryCoords.radius) {
          setGeoError(`Too far from library. Distance: ${Math.round(dist)}m. Max allowed: ${libraryCoords.radius}m.`);
        }
        setIsGeoVerifying(false);
      },
      (err) => {
        console.error("GPS Error:", err);
        setGeoError(`GPS Location Error: ${err.message}. Please enable location permissions.`);
        setIsGeoVerifying(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const checkAuthAndSeat = async () => {
    try {
      // 1. Check Auth Session
      const authRes = await fetch("/api/auth/session");
      const authData = await authRes.json();
      
      if (authData.authenticated) {
        setUser(authData.user);
      } else {
        setUser(null);
      }

      // 2. Fetch seats data to check this specific seat status and if user has active session
      const seatsRes = await fetch("/api/seats");
      const seatsData = await seatsRes.json();

      if (seatsData.success) {
        const matchingSeat = seatsData.seats.find((s: any) => s.id === seatId);
        setSeatStatus(matchingSeat);

        if (authData.authenticated) {
          // See if user already occupies a seat
          const activeUserSeat = seatsData.seats.find(
            (s: any) => s.activeSession && s.activeSession.userId === authData.user.id
          );
          if (activeUserSeat) {
            setActiveSessionSeat(activeUserSeat.id);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to reach DeskGuard server. Please try again.");
    } finally {
      setSessionChecked(true);
    }
  };

  useEffect(() => {
    fetch("/api/admin/geofence")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.config) {
          setLibraryCoords(data.config);
        }
      })
      .catch((err) => console.error("Failed to load pinned library location", err));
  }, []);

  useEffect(() => {
    if (seatId) {
      checkAuthAndSeat();
      runLocationCheck();
    }
  }, [seatId, libraryCoords]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleMockChange = () => runLocationCheck();
      window.addEventListener("deskguard_mock_location_changed", handleMockChange);
      return () => {
        window.removeEventListener("deskguard_mock_location_changed", handleMockChange);
      };
    }
  }, [libraryCoords]);

  const handleConfirmCheckin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/sessions/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          seatId,
          userLat: coords.lat,
          userLng: coords.lng,
          mockMode: geoMode
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to check in");

      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      setSuccessMsg(`Checked in successfully at Seat ${seatId}! Redirecting to your dashboard...`);
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwapSeat = async () => {
    if (!activeSessionSeat) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      // 1. Release active seat
      const releaseRes = await fetch("/api/sessions/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!releaseRes.ok) {
        const data = await releaseRes.json();
        throw new Error(data.error || "Failed to release your current seat");
      }

      // 2. Occupy new seat
      const checkinRes = await fetch("/api/sessions/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          seatId,
          userLat: coords.lat,
          userLng: coords.lng,
          mockMode: geoMode
        }),
      });
      const data = await checkinRes.json();
      if (!checkinRes.ok) throw new Error(data.error || "Failed to check into new seat");

      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      setSuccessMsg(`Released Seat ${activeSessionSeat} and checked in at Seat ${seatId}! Redirecting...`);
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateLocalMockLocation = (val: string) => {
    localStorage.setItem("deskguard_mock_location", val);
    window.dispatchEvent(new Event("deskguard_mock_location_changed"));
  };

  if (!sessionChecked) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center min-h-[100dvh] bg-[#030303] text-white p-6">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
        <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Scanning Desk telemetry...</span>
      </main>
    );
  }

  // If student is not logged in, show AuthPortal with a header info
  if (!user) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center min-h-[100dvh] bg-[#030303] text-white p-6 relative">
        <div className="noise-overlay" />
        <div className="mb-6 flex flex-col items-center max-w-sm text-center">
          <QrCode className="w-10 h-10 text-emerald-500 mb-2 animate-pulse" />
          <h2 className="text-sm font-bold">Sign In Required to Occupy Seat {seatId}</h2>
          <p className="text-xs text-zinc-500 mt-1">Please authenticate using your college email address to begin your library session.</p>
        </div>
        <AuthPortal onSuccess={checkAuthAndSeat} />
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center min-h-[100dvh] bg-[#030303] text-white p-6 relative">
      <div className="noise-overlay" />
      
      <div className="w-full max-w-md double-bezel-outer bg-zinc-950/80 backdrop-blur-md">
        <div className="double-bezel-inner p-8 space-y-6">
          
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1 text-[10px] font-mono text-zinc-500 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <span className="text-[10px] font-mono text-zinc-500 uppercase">QR Telemetry</span>
          </div>

          <div className="text-center space-y-2">
            <div className="relative inline-block">
              <MapPin className="w-10 h-10 text-emerald-500 mx-auto" />
              <Compass className="w-4 h-4 text-amber-500 absolute -bottom-1 -right-1 animate-spin" style={{ animationDuration: '4s' }} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Seat Verification</h1>
            <p className="text-xs text-zinc-400 font-mono">Desk ID: {seatId}</p>
          </div>

          {/* Geofence Status Panel */}
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-[9px] font-mono text-zinc-500 uppercase">Geofence Validation</span>
              <span className="text-[9px] font-mono text-zinc-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
                {geoMode === "REAL" ? "REAL GPS" : `MOCK ${geoMode}`}
              </span>
            </div>

            {isGeoVerifying ? (
              <div className="flex items-center gap-2 text-xs text-zinc-400 py-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                <span>Resolving GPS coordinates...</span>
              </div>
            ) : geoError ? (
              <div className="space-y-1.5 text-xs">
                <div className="text-rose-400 font-semibold flex items-center gap-1.5">
                  <ShieldAlert className="w-4.5 h-4.5" /> Geofence Verification Failed
                </div>
                <p className="text-[10px] text-zinc-500 leading-normal font-mono">{geoError}</p>
                <div className="mt-2.5 pt-2 border-t border-white/5 space-y-1.5">
                  <p className="text-[9px] text-amber-500">Test Override Location Toggle:</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => updateLocalMockLocation("INSIDE")}
                      className="py-1 rounded bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[9px] font-mono font-bold hover:bg-amber-500/20"
                    >
                      Mock Inside Library
                    </button>
                    <button
                      onClick={() => runLocationCheck()}
                      className="py-1 rounded bg-white/5 border border-white/10 text-zinc-300 text-[9px] font-mono hover:bg-white/10"
                    >
                      Retry GPS check
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4.5 h-4.5" /> Geofence Verification Passed
                </div>
                {coords.lat !== undefined && (
                  <p className="text-[9px] text-zinc-500 font-mono leading-normal">
                    User Lat/Lng: {coords.lat.toFixed(6)}, {coords.lng?.toFixed(6)} <br />
                    Distance: {distance !== null ? Math.round(distance) : 0} meters (Limit: {libraryCoords.radius}m)
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Seat Status details */}
          {seatStatus ? (
            <div className="space-y-4">
              <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500 font-mono uppercase">Location Section:</span>
                  <span className="font-semibold text-white">{seatStatus.section}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500 font-mono uppercase">Desk State:</span>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border ${
                    seatStatus.status === "AVAILABLE" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                    seatStatus.status === "OCCUPIED" ? "bg-rose-500/10 border-rose-500/20 text-rose-400" :
                    "bg-amber-500/10 border-amber-500/20 text-amber-400"
                  }`}>
                    {seatStatus.status}
                  </span>
                </div>
              </div>

              {/* Status checks */}
              {successMsg ? (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center text-xs text-emerald-400 font-medium">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2 animate-bounce" />
                  {successMsg}
                </div>
              ) : errorMsg ? (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center text-xs text-rose-400 font-mono">
                  {errorMsg}
                </div>
              ) : activeSessionSeat ? (
                // One user, one seat rule triggered
                <div className="space-y-4">
                  <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-3">
                    <div className="flex gap-2.5">
                      <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-amber-400">One Seat Limit Enforced</h4>
                        <p className="text-[10px] text-zinc-400 mt-1 leading-normal">
                          You already occupy **Seat {activeSessionSeat}**. Would you like to release Seat {activeSessionSeat} and switch to Seat {seatId}?
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push("/")}
                      className="flex-1 py-2.5 bg-white/[0.02] border border-white/5 text-zinc-400 text-xs font-bold rounded-xl btn-haptic"
                    >
                      Keep Seat {activeSessionSeat}
                    </button>
                    <button
                      onClick={handleSwapSeat}
                      disabled={isLoading || isGeoVerifying || !!geoError}
                      className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold rounded-xl btn-haptic flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Swap to Seat " + seatId}
                    </button>
                  </div>
                </div>
              ) : seatStatus.status !== "AVAILABLE" ? (
                <div className="space-y-4 text-center">
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    This desk is currently occupied. If this is an error or the occupant is hoarded, contact the library administrator.
                  </p>
                  <button
                    onClick={() => router.push("/")}
                    className="w-full py-2.5 bg-white/[0.02] border border-white/5 text-zinc-300 text-xs font-bold rounded-xl btn-haptic"
                  >
                    View Available Seats Map
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleConfirmCheckin}
                  disabled={isLoading || isGeoVerifying || !!geoError}
                  className="w-full py-3 bg-white hover:bg-zinc-200 text-black font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 btn-haptic disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirm Desk Occupation ↗"}
                </button>
              )}
            </div>
          ) : (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center text-xs text-rose-400">
              The desk identifier "{seatId}" is invalid or is not registered in the library system.
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
