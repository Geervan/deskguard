"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, AlertTriangle, Play, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  seats: Array<{ id: string; section: string }>;
}

export function QrScannerModal({ isOpen, onClose, seats }: QrScannerModalProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannedRef = useRef<boolean>(false);
  
  const [cameraState, setCameraState] = useState<"IDLE" | "STREAMING" | "BLOCKED" | "LOADING">("IDLE");
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [selectedSimSeat, setSelectedSimSeat] = useState<string>("");
  const [scannedSeatId, setScannedSeatId] = useState<string | null>(null);

  const addLog = (msg: string) => {
    setScanLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 5));
  };

  const startWebcam = async () => {
    setCameraState("LOADING");
    addLog("Initializing camera interface...");
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
      } catch (err) {
        addLog("Defaulting to primary camera device...");
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraState("STREAMING");
      addLog("Camera link established successfully.");
      addLog("Locating QR boundary target...");
    } catch (err: any) {
      console.error("Webcam Error:", err);
      setCameraState("BLOCKED");
      addLog("ERROR: Camera access blocked or unavailable.");
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraState("IDLE");
  };

  useEffect(() => {
    if (isOpen) {
      scannedRef.current = false;
      setScannedSeatId(null);
      setSelectedSimSeat("");
      setScanLogs(["System ready. Scanner online."]);
      startWebcam();
    } else {
      stopWebcam();
    }

    return () => {
      stopWebcam();
    };
  }, [isOpen]);

  // Connect stream to video element when it mounts in the DOM
  useEffect(() => {
    if (cameraState === "STREAMING" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((err) => {
        console.error("Video playback start failed:", err);
      });
    }
  }, [cameraState]);

  // Frame processing loop using jsQR
  useEffect(() => {
    let active = true;
    let animationFrameId: number;

    let frameCount = 0;
    const scanFrame = () => {
      if (!active || scannedRef.current) return;

      const video = videoRef.current;
      if (video && video.videoWidth > 0 && cameraState === "STREAMING") {
        frameCount++;
        if (frameCount % 45 === 0) {
          addLog("Scanning active sensor frames...");
        }

        // Create an offscreen canvas to capture current video frame
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext("2d");
        
        if (context) {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          
          try {
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "attemptBoth",
            });

            if (code && code.data && !scannedRef.current) {
              // Extract seatId from QR code URL structure: /checkin/[seatId]
              const checkinMatch = code.data.match(/\/checkin\/([A-Za-z0-9-]+)/i);
              let detectedSeatId = "";
              
              if (checkinMatch) {
                detectedSeatId = checkinMatch[1];
              } else {
                // Fallback: Check if it's a raw seat ID directly from seats list
                const matchedSeat = seats.find(
                  (s) => s.id.toLowerCase() === code.data.trim().toLowerCase()
                );
                if (matchedSeat) {
                  detectedSeatId = matchedSeat.id;
                }
              }

              if (detectedSeatId) {
                scannedRef.current = true;
                setScannedSeatId(detectedSeatId);
                addLog(`Decoded seat identifier: ${detectedSeatId}`);
                addLog("Mapping assignment details...");
                
                // Keep the visual success on screen for a moment then redirect
                setTimeout(() => {
                  stopWebcam();
                  onClose();
                  router.push(`/checkin/${detectedSeatId}`);
                }, 1200);
                return;
              }
            }
          } catch (err) {
            console.error("Frame decoding failure:", err);
          }
        }
      }

      if (active && !scannedRef.current) {
        animationFrameId = requestAnimationFrame(scanFrame);
      }
    };

    if (cameraState === "STREAMING") {
      animationFrameId = requestAnimationFrame(scanFrame);
    }

    return () => {
      active = false;
      cancelAnimationFrame(animationFrameId);
    };
  }, [cameraState, seats, router]);

  const handleSimulateScan = (seatId: string) => {
    if (!seatId) return;
    scannedRef.current = true;
    setScannedSeatId(seatId);
    addLog(`Target detected: Seat ${seatId}`);
    addLog("Redirecting to check-in terminal...");
    setTimeout(() => {
      stopWebcam();
      onClose();
      router.push(`/checkin/${seatId}`);
    }, 1200);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="w-full max-w-md double-bezel-outer bg-zinc-950 shadow-2xl overflow-hidden"
          >
            <div className="double-bezel-inner p-6 space-y-5">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">Camera QR Scanner</span>
                </div>
                <button
                  onClick={onClose}
                  className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scanner Viewport */}
              <div className="relative aspect-video w-full rounded-2xl bg-black border border-white/5 overflow-hidden flex flex-col items-center justify-center">
                {cameraState === "STREAMING" ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                  />
                ) : cameraState === "LOADING" ? (
                  <div className="text-center space-y-2 z-10">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">Connecting sensor feed...</span>
                  </div>
                ) : (
                  <div className="text-center p-6 space-y-2 z-10">
                    <AlertTriangle className="w-8 h-8 text-amber-500/80 mx-auto" />
                    <span className="text-[10px] font-mono text-zinc-500 uppercase block">Camera Permission Required</span>
                    <p className="text-[10px] text-zinc-600 max-w-xs leading-normal">
                      Could not access camera. Please allow camera permissions in your browser or use the simulation dropdown below.
                    </p>
                  </div>
                )}

                {/* Cyber HUD Overlays */}
                <div className="absolute inset-0 p-4 flex flex-col justify-between pointer-events-none z-10">
                  {/* Corner Targets */}
                  <div className="flex justify-between">
                    <div className={`w-4 h-4 border-t-2 border-l-2 transition-colors duration-300 ${scannedSeatId ? "border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" : "border-amber-500"}`} />
                    <div className={`w-4 h-4 border-t-2 border-r-2 transition-colors duration-300 ${scannedSeatId ? "border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" : "border-amber-500"}`} />
                  </div>

                  {/* Dynamic laser scan line */}
                  {cameraState === "STREAMING" && !scannedSeatId && (
                    <div className="w-full h-0.5 bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)] opacity-70 animate-scanline" />
                  )}
                  {cameraState === "STREAMING" && scannedSeatId && (
                    <div className="w-full h-0.5 bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)] opacity-70" />
                  )}

                  <div className="flex justify-between">
                    <div className={`w-4 h-4 border-b-2 border-l-2 transition-colors duration-300 ${scannedSeatId ? "border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" : "border-amber-500"}`} />
                    <div className={`w-4 h-4 border-b-2 border-r-2 transition-colors duration-300 ${scannedSeatId ? "border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" : "border-amber-500"}`} />
                  </div>
                </div>

                {/* Scanned Success Overlay */}
                <AnimatePresence>
                  {scannedSeatId && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-emerald-950/80 backdrop-blur-xs flex flex-col items-center justify-center space-y-2 z-20 text-center p-4"
                    >
                      <CheckCircle2 className="w-10 h-10 text-emerald-400 animate-bounce" />
                      <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">SEAT DETECTED</span>
                      <p className="text-sm font-mono font-extrabold text-emerald-300">Desk {scannedSeatId}</p>
                      <span className="text-[10px] text-zinc-400 font-mono">Mapping check-in terminal...</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Scrolling Telemetry Terminal */}
              <div className="bg-black/40 border border-white/5 p-3 rounded-xl space-y-1">
                <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Scanner Output</div>
                <div className="h-16 overflow-y-auto font-mono text-[9px] text-zinc-400 space-y-0.5 leading-normal">
                  {scanLogs.map((log, i) => (
                    <div key={i} className="truncate">{log}</div>
                  ))}
                </div>
              </div>



            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
