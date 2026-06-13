"use client";

import React, { useEffect, useState } from "react";
import { AuthPortal } from "@/components/AuthPortal";
import { BackgroundShell } from "@/components/BackgroundShell";
import { Shield, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // If user is already logged in, redirect them to dashboard home
    const checkUser = async () => {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        if (data.authenticated) {
          window.location.href = "/";
        } else {
          setChecking(false);
        }
      } catch (err) {
        setChecking(false);
      }
    };
    checkUser();
  }, []);

  if (checking) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center min-h-[100dvh] bg-[#030303] text-white p-6 relative">
        <BackgroundShell />
        <div className="noise-overlay" />
        <div className="flex flex-col items-center gap-3 z-10">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
            Securing Seating Gate...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center min-h-[100dvh] bg-[#030303] text-white p-6 relative">
      <BackgroundShell />
      <div className="noise-overlay" />
      
      {/* Brand Navigation Back Link */}
      <div 
        className="absolute top-8 left-8 flex items-center gap-2 cursor-pointer z-10 hover:opacity-80 transition-opacity" 
        onClick={() => window.location.href = "/"}
      >
        <div className="w-5 h-5 rounded-md bg-amber-500 flex items-center justify-center shadow-[0_0_12px_rgba(217,119,6,0.4)]">
          <Shield className="w-3 h-3 text-black stroke-[2.5]" />
        </div>
        <span className="text-xs font-bold tracking-wider text-white uppercase font-sans">DeskGuard</span>
      </div>

      <div className="w-full max-w-lg z-10 flex justify-center">
        <AuthPortal
          onSuccess={() => {
            window.location.href = "/";
          }}
        />
      </div>
    </main>
  );
}
