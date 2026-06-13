"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, Camera, MapPin, CheckCircle2, ShieldAlert, ArrowRight, 
  Clock, Coffee, LogIn, Sparkles, Smartphone, ShieldCheck, RefreshCw,
  Info, QrCode, Loader2
} from "lucide-react";
import confetti from "canvas-confetti";

interface Step {
  id: number;
  title: string;
  description: string;
  badge: string;
  highlight: string;
}

const STEPS: Step[] = [
  {
    id: 1,
    title: "1. Landing & Heatmap",
    description: "Students view live seating availability on the interactive hall map before visiting the library, preventing unnecessary queues.",
    badge: "Public View",
    highlight: "Real-time occupancy is anonymized for student privacy."
  },
  {
    id: 2,
    title: "2. OTP Email Verification",
    description: "Students log in securely using their college email address. The system delivers a passwordless 6-digit OTP code to verify student identity.",
    badge: "Authentication",
    highlight: "Roles are split: Students can reserve seats; Librarians can release and sweep."
  },
  {
    id: 3,
    title: "3. Student Console (Idle)",
    description: "An empty dashboard prompts the student to physically scan a desk-mounted QR decal code to check into a study table.",
    badge: "Scanner Prompt",
    highlight: "Students are restricted to occupying exactly one desk at a time."
  },
  {
    id: 4,
    title: "4. Webcam QR Identifier",
    description: "The in-app scanner decodes the desk check-in URL in real-time, displaying a visual green lock HUD before redirecting.",
    badge: "Real-time jsQR Scan",
    highlight: "No manual seat numbers required. The QR code automatically maps the check-in."
  },
  {
    id: 5,
    title: "5. Geofence Boundary Check",
    description: "The app fetches user coordinates. If the student is outside the library boundary (>100m), check-in is blocked. Inside, validation passes.",
    badge: "GPS Haversine Verification",
    highlight: "Prevents students from hoarding seats remotely from their dorm rooms."
  },
  {
    id: 6,
    title: "6. Active Seating Drawer",
    description: "The occupied desk console displays ticking timers. Students can take a 20-minute break, returning or voluntarily releasing their desk.",
    badge: "Active Session",
    highlight: "Every 2 hours, presence checks trigger to verify the student hasn't hoarded the seat."
  },
  {
    id: 7,
    title: "7. Automated Sweeper Cron",
    description: "If a break timer expires or a presence check is missed, the server-side cron sweep releases the desk, making it available.",
    badge: "Anti-Hoarding Sweeper",
    highlight: "Sweeping runs at database level, making it system-authoritative."
  }
];

export default function PrototypeWalkthrough() {
  const [currentStep, setCurrentStep] = useState(1);
  const [emailInput, setEmailInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [geoMode, setGeoMode] = useState<"INSIDE" | "OUTSIDE">("INSIDE");
  const [sessionState, setSessionState] = useState<"ACTIVE" | "AWAY" | "RELEASED">("ACTIVE");
  const [breakTimer, setBreakTimer] = useState(1200); // 20m in seconds
  const [sweptLog, setSweptLog] = useState<string[]>([]);
  const [hasFinishedFlow, setHasFinishedFlow] = useState(false);

  // Active step navigation helpers
  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1);
    } else {
      setHasFinishedFlow(true);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      setHasFinishedFlow(false);
    }
  };

  // QR Scan simulation
  useEffect(() => {
    let interval: any;
    if (currentStep === 4) {
      setIsScanning(true);
      setScanProgress(0);
      interval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsScanning(false);
            setTimeout(() => {
              nextStep();
            }, 1200);
            return 100;
          }
          return prev + 10;
        });
      }, 150);
    }
    return () => clearInterval(interval);
  }, [currentStep]);

  // Away timer ticker
  useEffect(() => {
    let interval: any;
    if (currentStep === 6 && sessionState === "AWAY") {
      interval = setInterval(() => {
        setBreakTimer(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentStep, sessionState]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" + s : s}`;
  };

  const handleSimulateSweep = () => {
    setSessionState("RELEASED");
    setSweptLog([
      `[${new Date().toLocaleTimeString()}] SWEEPER: Checking Seat A102...`,
      `[${new Date().toLocaleTimeString()}] SWEEPER: Break expired (Duration: 20m).`,
      `[${new Date().toLocaleTimeString()}] SWEEPER: Releasing Seat A102 successfully.`,
      `[${new Date().toLocaleTimeString()}] SWEEPER: Seat state set to AVAILABLE.`
    ]);
  };

  const handleRestart = () => {
    setCurrentStep(1);
    setEmailInput("");
    setOtpInput("");
    setGeoMode("INSIDE");
    setSessionState("ACTIVE");
    setBreakTimer(1200);
    setSweptLog([]);
    setHasFinishedFlow(false);
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white flex flex-col font-sans relative overflow-x-hidden">
      {/* Blueprint Grid Lines & Laser Glow */}
      <div className="absolute inset-0 dot-grid opacity-[0.25] pointer-events-none select-none" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Top Banner */}
      <header className="border-b border-white/5 py-4 px-6 md:px-12 flex items-center justify-between bg-black/40 backdrop-blur-md z-20">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-amber-500 flex items-center justify-center shadow-[0_0_12px_rgba(217,119,6,0.3)]">
            <Shield className="w-3.5 h-3.5 text-black stroke-[2.5]" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-wider uppercase">DeskGuard</span>
            <span className="text-[10px] text-amber-500 font-mono block leading-none">Walkthrough Prototype</span>
          </div>
        </div>
        <button
          onClick={handleRestart}
          className="text-xs font-mono text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 bg-white/[0.02] px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Restart Demo
        </button>
      </header>

      {/* Main Showcase Panel Split */}
      <main className="flex-1 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 md:p-12 items-start z-10">
        
        {/* Left Side: Step Guide Drawer (5 Columns) */}
        <section className="lg:col-span-5 space-y-6">
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-amber-500 uppercase tracking-widest block font-bold">Round 1 Presentation Portal</span>
            <h1 className="text-2xl font-light tracking-tight text-white leading-normal">
              Interactive <span className="text-amber-500 font-semibold">User Experience</span> Flows
            </h1>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Use this interactive sandbox to showcase the full check-in, geofencing, and sweep security logic directly on screen during your presentation.
            </p>
          </div>

          {/* Stepper indicators */}
          <div className="space-y-2.5">
            {STEPS.map((s) => {
              const isActive = s.id === currentStep;
              const isCompleted = s.id < currentStep;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setCurrentStep(s.id);
                    setHasFinishedFlow(false);
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all duration-300 flex items-start gap-3.5 cursor-pointer ${
                    isActive 
                      ? "border-amber-500/35 bg-amber-500/8 text-white shadow-[0_4px_20px_rgba(217,119,6,0.08)]"
                      : isCompleted
                      ? "border-white/5 bg-white/[0.01] text-zinc-400 hover:border-white/15"
                      : "border-transparent text-zinc-600 hover:text-zinc-400"
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono border mt-0.5 shrink-0 ${
                    isActive 
                      ? "border-amber-500 bg-amber-500 text-black shadow-[0_0_8px_rgba(217,119,6,0.4)]"
                      : isCompleted
                      ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/5"
                      : "border-zinc-800 text-zinc-500"
                  }`}>
                    {isCompleted ? "✓" : s.id}
                  </span>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold truncate">{s.title}</span>
                      <span className={`text-[8px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 rounded shrink-0 ${
                        isActive ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "bg-white/5 text-zinc-500 border border-white/5"
                      }`}>
                        {s.badge}
                      </span>
                    </div>
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="space-y-2 pt-1"
                      >
                        <p className="text-[11px] text-zinc-300 leading-normal">{s.description}</p>
                        <div className="flex items-start gap-1.5 p-2 bg-black/40 border border-white/5 rounded-lg text-[10px] text-amber-400/80">
                          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
                          <span className="font-mono leading-normal">{s.highlight}</span>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Nav Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-white/5">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-4 py-2 border border-white/10 text-zinc-400 hover:text-white rounded-lg text-xs font-mono font-bold hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            >
              ← Previous Step
            </button>
            
            {hasFinishedFlow ? (
              <button
                onClick={handleRestart}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black rounded-lg text-xs font-mono font-bold btn-haptic transition-all"
              >
                Restart Showcase
              </button>
            ) : (
              <button
                onClick={nextStep}
                className="px-5 py-2.5 bg-white hover:bg-zinc-200 text-black rounded-lg text-xs font-mono font-bold btn-haptic flex items-center gap-1 transition-all"
              >
                Next Step <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </section>

        {/* Right Side: Simulated Device Display (7 Columns) */}
        <section className="lg:col-span-7 flex justify-center w-full">
          <div className="w-full max-w-[370px] aspect-[9/18] rounded-[48px] border-[6px] border-zinc-800 bg-[#08080a] shadow-2xl relative flex flex-col justify-between overflow-hidden ring-[12px] ring-zinc-950">
            
            {/* Phone Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-6 bg-zinc-800 rounded-b-2xl z-40 flex items-center justify-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-700" />
              <div className="w-14 h-1 bg-zinc-900 rounded-full" />
            </div>

            {/* Inner Content Area */}
            <div className="flex-1 flex flex-col pt-8 pb-4 px-4 overflow-y-auto relative bg-black">
              
              <AnimatePresence mode="wait">
                {/* STATE 1: Landing Page */}
                {currentStep === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col justify-between space-y-6 text-center py-4"
                  >
                    <div className="flex items-center justify-center gap-1.5 mt-2">
                      <div className="w-4 h-4 rounded bg-amber-500 flex items-center justify-center">
                        <Shield className="w-2.5 h-2.5 text-black" />
                      </div>
                      <span className="text-[10px] font-bold tracking-wider font-mono">DESKGUARD</span>
                    </div>

                    <div className="space-y-3">
                      <h2 className="text-xl font-light leading-snug">
                        The missing library <br />
                        <span className="text-amber-500 font-normal">seat vocabulary.</span>
                      </h2>
                      <p className="text-[10px] text-zinc-500 leading-normal max-w-xs mx-auto">
                        Geofenced QR code check-ins, live heatmaps, and automatic vacancy sweepers.
                      </p>
                    </div>

                    {/* Mini live map mock */}
                    <div className="border border-white/5 bg-zinc-950/80 rounded-xl p-3 space-y-2">
                      <div className="flex justify-between items-center text-[8px] font-mono text-zinc-500">
                        <span>LIVE SEATING MAP</span>
                        <span className="text-emerald-400">12 SEATS FREE</span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5 py-1">
                        {Array.from({ length: 10 }).map((_, idx) => {
                          const state = idx === 2 || idx === 7 ? "OCCUPIED" : idx === 4 ? "AWAY" : "AVAILABLE";
                          const color = state === "AVAILABLE" ? "bg-emerald-500/40 border-emerald-500/60" : state === "OCCUPIED" ? "bg-rose-500/40 border-rose-500/60" : "bg-amber-500/40 border-amber-500/60";
                          return (
                            <div key={idx} className={`aspect-square rounded border ${color} flex items-center justify-center text-[7px] font-mono font-bold text-white/80`}>
                              {String.fromCharCode(65 + Math.floor(idx/5)) + (idx % 5 + 101)}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={nextStep}
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold rounded-xl font-mono btn-haptic flex items-center justify-center gap-1 cursor-pointer"
                      >
                        Launch Portal <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STATE 2: Auth Portal / OTP Dialog */}
                {currentStep === 2 && (
                  <motion.div
                    key="step-2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex-1 flex flex-col justify-center space-y-6 py-4"
                  >
                    <div className="text-center space-y-1.5">
                      <div className="w-9 h-9 rounded-full bg-white/[0.02] border border-white/10 flex items-center justify-center mx-auto text-amber-500">
                        <Shield className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-bold">Sign In Required</h3>
                      <p className="text-[10px] text-zinc-500">Access college library study desk allocations.</p>
                    </div>

                    <div className="space-y-4">
                      {/* Email step simulated input */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-mono uppercase text-zinc-500 tracking-wider">College Email</label>
                        <input
                          type="email"
                          placeholder="student@college.edu"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          className="w-full bg-black border border-white/10 rounded-xl text-xs px-3 py-2.5 text-zinc-300 focus:border-amber-500 focus:outline-none font-mono"
                        />
                      </div>

                      {emailInput.includes("@") && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-4"
                        >
                          <div className="p-2.5 rounded bg-amber-500/5 border border-amber-500/10 text-[9px] font-mono text-amber-400 leading-normal text-center">
                            SIMULATED OTP DISPATCHED: <strong>491022</strong>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-mono uppercase text-zinc-500 tracking-wider">6-Digit Code</label>
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="491022"
                              value={otpInput}
                              onChange={(e) => setOtpInput(e.target.value)}
                              className="w-full bg-black border border-white/10 rounded-xl text-xs px-3 py-2.5 text-zinc-300 focus:border-amber-500 focus:outline-none font-mono tracking-widest text-center"
                            />
                          </div>
                        </motion.div>
                      )}

                      <button
                        onClick={nextStep}
                        disabled={!emailInput.includes("@") || otpInput !== "491022"}
                        className="w-full py-2.5 bg-white text-black hover:bg-zinc-200 text-xs font-bold rounded-xl font-mono btn-haptic disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Verify Allocation Portal
                      </button>

                      <p className="text-[8px] text-zinc-650 text-center font-mono uppercase">
                        Type 'student@college.edu' and '491022' to authorize.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* STATE 3: Student Dashboard (Idle) */}
                {currentStep === 3 && (
                  <motion.div
                    key="step-3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex-1 flex flex-col justify-between py-4"
                  >
                    <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-4">
                      <div>
                        <span className="text-[10px] font-bold text-white block">Student Portal</span>
                        <span className="text-[8px] font-mono text-zinc-500 block leading-none">student@college.edu</span>
                      </div>
                      <span className="text-[9px] font-mono text-amber-500 uppercase font-bold bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10">IDLE</span>
                    </div>

                    <div className="space-y-6 my-auto text-center">
                      <div className="w-12 h-12 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mx-auto text-zinc-500">
                        <QrCode className="w-6 h-6 animate-pulse" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">No Occupied Seat</h4>
                        <p className="text-[10px] text-zinc-500 max-w-[24ch] mx-auto leading-normal">
                          You do not occupy any seat right now. Scan a library desk QR code to occupy.
                        </p>
                      </div>
                      
                      <button
                        onClick={nextStep}
                        className="mx-auto flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold rounded-xl btn-haptic shadow-[0_4px_16px_rgba(217,119,6,0.2)] cursor-pointer"
                      >
                        <Camera className="w-4 h-4" /> Scan Desk QR Code
                      </button>
                    </div>

                    {/* Floorplan Preview block */}
                    <div className="border border-white/5 bg-zinc-950/40 rounded-xl p-3 text-[8px] text-zinc-500 font-mono text-center">
                      Click "Scan Desk QR Code" to launch the simulated camera module.
                    </div>
                  </motion.div>
                )}

                {/* STATE 4: Camera Scanner HUD */}
                {currentStep === 4 && (
                  <motion.div
                    key="step-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col justify-between py-4"
                  >
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase">Camera scan feed</span>
                      <span className="text-[9px] font-mono text-amber-500 animate-pulse">● FEED ACTIVE</span>
                    </div>

                    {/* HUD Scanner Box */}
                    <div className="relative aspect-video w-full rounded-2xl bg-[#030303] border border-white/10 overflow-hidden flex flex-col items-center justify-center my-4">
                      
                      {/* Simulating static camera overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/80 opacity-60 z-10" />

                      <div className="text-center z-20 space-y-1.5">
                        <Loader2 className="w-6 h-6 animate-spin text-amber-500 mx-auto" />
                        <span className="text-[8px] font-mono text-zinc-400 uppercase tracking-widest block">Decoding frame...</span>
                        <div className="text-[8px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                          DECODED DATA: A102
                        </div>
                      </div>

                      {/* Cyber HUD Overlays */}
                      <div className="absolute inset-0 p-3 flex flex-col justify-between pointer-events-none z-20">
                        <div className="flex justify-between">
                          <div className={`w-3.5 h-3.5 border-t-2 border-l-2 transition-colors duration-300 ${scanProgress === 100 ? "border-emerald-500" : "border-amber-500"}`} />
                          <div className={`w-3.5 h-3.5 border-t-2 border-r-2 transition-colors duration-300 ${scanProgress === 100 ? "border-emerald-500" : "border-amber-500"}`} />
                        </div>
                        
                        {/* Horizontal scanline */}
                        {scanProgress < 100 && (
                          <div className="w-full h-0.5 bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)] opacity-60 animate-scanline" />
                        )}

                        <div className="flex justify-between">
                          <div className={`w-3.5 h-3.5 border-b-2 border-l-2 transition-colors duration-300 ${scanProgress === 100 ? "border-emerald-500" : "border-amber-500"}`} />
                          <div className={`w-3.5 h-3.5 border-b-2 border-r-2 transition-colors duration-300 ${scanProgress === 100 ? "border-emerald-500" : "border-amber-500"}`} />
                        </div>
                      </div>

                      {/* Decoded Success Overlay */}
                      {scanProgress === 100 && (
                        <div className="absolute inset-0 bg-emerald-950/85 backdrop-blur-xs flex flex-col items-center justify-center space-y-1 z-30 text-center">
                          <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-bounce" />
                          <span className="text-[9px] font-mono font-bold text-white">QR DECODED</span>
                          <span className="text-xs font-mono font-extrabold text-emerald-300">SEAT A102</span>
                        </div>
                      )}
                    </div>

                    {/* Terminals logs */}
                    <div className="bg-black/80 border border-white/5 p-2 rounded-xl space-y-1 font-mono text-[8px] text-zinc-500">
                      <div className="uppercase tracking-widest text-zinc-600 font-bold border-b border-white/5 pb-1 mb-1">Telemetry</div>
                      <div>[18:04:12] Scanner online.</div>
                      <div>[18:04:13] Video stream connected.</div>
                      {scanProgress >= 50 && <div className="text-amber-500">[18:04:14] Decoded check-in URL.</div>}
                      {scanProgress === 100 && <div className="text-emerald-500 font-bold">[18:04:14] SUCCESS: Seat A102 matched.</div>}
                    </div>
                  </motion.div>
                )}

                {/* STATE 5: Geofence Verification */}
                {currentStep === 5 && (
                  <motion.div
                    key="step-5"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex-1 flex flex-col justify-between py-4"
                  >
                    <div className="text-center space-y-1">
                      <MapPin className="w-8 h-8 text-amber-500 mx-auto" />
                      <h3 className="text-xs font-bold">Seat Verification</h3>
                      <p className="text-[9px] font-mono text-zinc-500">Desk ID: A102</p>
                    </div>

                    {/* Geofence Simulator switch in phone */}
                    <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3 space-y-2.5">
                      <div className="flex justify-between items-center text-[9px] font-mono border-b border-white/5 pb-2">
                        <span className="text-zinc-500 uppercase">Geofence Status</span>
                        <span className={`px-1.5 py-0.2 rounded font-bold ${geoMode === "INSIDE" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>
                          {geoMode}
                        </span>
                      </div>

                      {geoMode === "INSIDE" ? (
                        <div className="space-y-1">
                          <div className="text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Inside Library (Passed)
                          </div>
                          <p className="text-[8px] text-zinc-500 font-mono">
                            Distance: 4 meters. (Limit: 100m)<br />
                            User coords: 37.7749, -122.4194
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="text-rose-400 text-[10px] font-bold flex items-center gap-1">
                            <ShieldAlert className="w-3.5 h-3.5" /> Geofence Verification Failed
                          </div>
                          <p className="text-[8px] text-zinc-500 font-mono">
                            Distance: 12.8km. Max allowed: 100m. Check-in blocked.
                          </p>
                        </div>
                      )}

                      {/* Sim switches */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <button
                          onClick={() => setGeoMode("INSIDE")}
                          className={`py-1 rounded text-[8px] font-mono font-bold border transition-colors cursor-pointer ${
                            geoMode === "INSIDE" 
                              ? "bg-amber-500/10 border-amber-500/25 text-amber-500" 
                              : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10"
                          }`}
                        >
                          Simulate Inside
                        </button>
                        <button
                          onClick={() => setGeoMode("OUTSIDE")}
                          className={`py-1 rounded text-[8px] font-mono font-bold border transition-colors cursor-pointer ${
                            geoMode === "OUTSIDE" 
                              ? "bg-rose-500/10 border-rose-500/25 text-rose-500" 
                              : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10"
                          }`}
                        >
                          Simulate Outside
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={nextStep}
                        disabled={geoMode === "OUTSIDE"}
                        className="w-full py-2.5 bg-white text-black hover:bg-zinc-200 text-xs font-bold rounded-xl btn-haptic disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1 cursor-pointer"
                      >
                        Confirm Desk Occupation ↗
                      </button>
                      
                      {geoMode === "OUTSIDE" && (
                        <p className="text-[8px] text-zinc-600 text-center font-mono">
                          Must simulate 'Inside' to allow check-in confirmation.
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* STATE 6: Student Dashboard (Active) */}
                {currentStep === 6 && (
                  <motion.div
                    key="step-6"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex-1 flex flex-col justify-between py-4"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                      <div>
                        <span className="text-[10px] font-bold text-white block">Seat A102</span>
                        <span className="text-[8px] font-mono text-zinc-500 block leading-none">Reading Hall A</span>
                      </div>
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${
                        sessionState === "ACTIVE" 
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          : "bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse"
                      }`}>
                        {sessionState === "ACTIVE" ? "OCCUPIED" : "AWAY (BREAK)"}
                      </span>
                    </div>

                    {/* Timer blocks */}
                    <div className="space-y-3 my-4">
                      <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3 flex justify-between items-center">
                        <span className="text-[9px] font-mono text-zinc-500">PRESENCE CHECK IN</span>
                        <span className="text-xs font-mono font-bold text-emerald-400">1h 59m</span>
                      </div>

                      {sessionState === "AWAY" && (
                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex justify-between items-center">
                          <span className="text-[9px] font-mono text-amber-500">BREAK COUNTDOWN</span>
                          <span className="text-xs font-mono font-bold text-amber-400">{formatTime(breakTimer)}</span>
                        </div>
                      )}
                    </div>

                    {/* Buttons */}
                    <div className="space-y-2">
                      {sessionState === "ACTIVE" ? (
                        <button
                          onClick={() => {
                            setSessionState("AWAY");
                            setBreakTimer(1200);
                          }}
                          className="w-full py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold rounded-xl font-mono flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Coffee className="w-3.5 h-3.5" /> Take Break (20m)
                        </button>
                      ) : (
                        <button
                          onClick={() => setSessionState("ACTIVE")}
                          className="w-full py-2 bg-emerald-500 text-black text-xs font-bold rounded-xl font-mono flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <LogIn className="w-3.5 h-3.5" /> Return to Seat
                        </button>
                      )}

                      <button
                        onClick={nextStep}
                        className="w-full py-2 border border-zinc-800 bg-[#060608] hover:bg-zinc-950 text-zinc-300 text-xs font-bold rounded-xl font-mono flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        Release Seat (Check out)
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STATE 7: Automated Sweeper Cron */}
                {currentStep === 7 && (
                  <motion.div
                    key="step-7"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col justify-between py-4"
                  >
                    <div className="text-center space-y-1">
                      <RefreshCw className="w-8 h-8 text-rose-500 mx-auto animate-pulse" />
                      <h3 className="text-xs font-bold">Anti-Hoarding Sweeper</h3>
                      <p className="text-[9px] font-mono text-zinc-500">Cron Trigger: `/api/cron/sweep`</p>
                    </div>

                    {sessionState === "RELEASED" ? (
                      <div className="border border-emerald-500/20 bg-emerald-500/5 p-3 rounded-xl space-y-2">
                        <div className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Seat Released Successfully
                        </div>
                        <p className="text-[9px] text-zinc-400 leading-normal">
                          The sweeper cron detected that the student's 20-minute break expired without return. The seat has been freed.
                        </p>
                      </div>
                    ) : (
                      <div className="border border-amber-500/20 bg-amber-500/5 p-3 rounded-xl space-y-2">
                        <div className="text-[10px] font-bold text-amber-400 flex items-center gap-1.5">
                          <Clock className="w-4 h-4 animate-spin" /> Seat Status: AWAY (Break)
                        </div>
                        <p className="text-[9px] text-zinc-400 leading-normal">
                          The student is currently away. Click the sweep trigger below to simulate the cron job execution when the break timer reaches zero.
                        </p>
                        <button
                          onClick={handleSimulateSweep}
                          className="w-full py-2 bg-rose-500 text-white text-[10px] font-bold rounded-lg font-mono btn-haptic cursor-pointer"
                        >
                          Trigger Simulated Sweep
                        </button>
                      </div>
                    )}

                    {/* Console logs */}
                    <div className="bg-black border border-white/5 p-2 rounded-xl space-y-0.5 font-mono text-[7.5px] text-zinc-500">
                      <div className="uppercase tracking-widest text-zinc-600 font-bold border-b border-white/5 pb-1 mb-1.5">Sweeper Logs</div>
                      {sweptLog.length > 0 ? (
                        sweptLog.map((log, i) => <div key={i} className={i === 2 ? "text-emerald-400" : ""}>{log}</div>)
                      ) : (
                        <div>[18:08:00] Sweeper initialized. Listening for cron...</div>
                      )}
                    </div>

                    <button
                      onClick={() => setHasFinishedFlow(true)}
                      className="w-full py-2 bg-white text-black text-xs font-bold rounded-xl font-mono cursor-pointer"
                    >
                      Finish Presentation
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>

            {/* Home indicator bar */}
            <div className="w-28 h-1 bg-zinc-700 rounded-full mx-auto mb-2" />
          </div>
        </section>

      </main>

      {/* Slide Transition Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scanline {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        .animate-scanline {
          position: absolute;
          animation: scanline 3s linear infinite;
        }
      `}} />
    </div>
  );
}
