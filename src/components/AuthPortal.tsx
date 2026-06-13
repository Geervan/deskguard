"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ShieldCheck, KeyRound, User, ArrowRight, Loader2, Lock } from "lucide-react";

interface AuthPortalProps {
  onSuccess: (user: { id: string; email: string; name: string | null; role: "STUDENT" | "LIBRARIAN" }) => void;
}

export function AuthPortal({ onSuccess }: AuthPortalProps) {
  const [authMethod, setAuthMethod] = useState<"otp" | "password">("password");
  
  // Input fields states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  
  // Feedback states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Dev Helper Info
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    setDevOtp(null);

    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to send verification code");

      setOtpSent(true);
      setSuccessMsg(`Verification code sent to your email.`);
      
      if (data.provider === "console_fallback" && data.code) {
        setDevOtp(data.code);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otpCode, name }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Verification failed");

      setSuccessMsg("Verifying session...");
      setTimeout(() => {
        onSuccess(data.user);
      }, 600);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Authentication failed");

      setSuccessMsg("Sign in successful!");
      setTimeout(() => {
        onSuccess(data.user);
      }, 600);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg double-bezel-outer bg-zinc-950/65 backdrop-blur-2xl border-white/5">
      <div className="double-bezel-inner min-h-[500px] p-10 md:p-12 flex flex-col justify-between relative overflow-hidden">
        
        {/* Ambient Top Glow Line & Light Leak */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[85%] h-[1px] bg-gradient-to-r from-transparent via-amber-500/35 to-transparent blur-[0.5px]" />
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/10 bg-amber-500/5 text-[10px] tracking-widest uppercase text-amber-500 font-semibold mb-4">
            <ShieldCheck className="w-3.5 h-3.5" /> Secure Seating Gate
          </div>
          <h1 className="text-3xl font-light tracking-tight text-white font-sans">
            Sign In / <span className="font-normal text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500">Register</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-2 max-w-xs mx-auto">
            Log in to claim library desks, manage breaks, or verify seat telemetry.
          </p>
        </div>

        {/* Auth Method Toggle Segment Tabs */}
        {!otpSent && (
          <div className="flex p-1 bg-black/60 border border-white/10 rounded-xl mb-8">
            <button
              type="button"
              onClick={() => {
                setAuthMethod("otp");
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
                authMethod === "otp"
                  ? "bg-amber-500 text-black shadow-md"
                  : "text-zinc-550 hover:text-white"
              }`}
            >
              OTP
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMethod("password");
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
                authMethod === "password"
                  ? "bg-amber-500 text-black shadow-md"
                  : "text-zinc-550 hover:text-white"
              }`}
            >
              Email & Password
            </button>
          </div>
        )}

        {/* Card Forms */}
        <div className="flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {authMethod === "otp" ? (
              // OTP FLOW
              !otpSent ? (
                <motion.form
                  key="email-form"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  onSubmit={handleSendOtp}
                  className="space-y-6"
                >
                  <div>
                    <label htmlFor="email" className="block text-xs uppercase text-zinc-500 tracking-wider font-semibold mb-2.5">
                      College Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500" />
                      <input
                        id="email"
                        type="email"
                        required
                        placeholder="student@college.edu"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-12 pr-5 py-3.5 bg-black/45 border border-white/15 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/30 transition-all font-sans"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="name" className="block text-xs uppercase text-zinc-500 tracking-wider font-semibold mb-2.5">
                      Full Name (for initial signup)
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500" />
                      <input
                        id="name"
                        type="text"
                        placeholder="Alex Mercer"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-12 pr-5 py-3.5 bg-black/45 border border-white/15 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/30 transition-all font-sans"
                      />
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isLoading || !email}
                    className="w-full mt-4 py-4 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-black font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(217,119,6,0.18)] disabled:shadow-none transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Get Verification Code <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </motion.button>
                </motion.form>
              ) : (
                <motion.form
                  key="otp-form"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  onSubmit={handleVerifyOtp}
                  className="space-y-6"
                >
                  <div>
                    <label htmlFor="otp" className="block text-xs uppercase text-zinc-500 tracking-wider font-semibold mb-2.5">
                      6-Digit Verification Code
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500" />
                      <input
                        id="otp"
                        type="text"
                        maxLength={6}
                        required
                        placeholder="000000"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                        className="w-full pl-12 pr-5 py-3.5 bg-black/45 border border-white/15 rounded-xl text-sm text-white placeholder-zinc-550 tracking-[0.6em] text-center font-mono focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/30 transition-all"
                      />
                    </div>
                  </div>

                  {devOtp && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl text-xs text-amber-400/90 font-mono leading-relaxed"
                    >
                      <div className="font-semibold mb-1 text-amber-400">
                        💡 Local Dev Verification Mode
                      </div>
                      We've logged your verification code to the console:
                      <div className="text-center font-bold text-xl mt-3 text-white bg-black/40 py-2.5 rounded-lg border border-white/5 font-mono tracking-widest">
                        {devOtp}
                      </div>
                    </motion.div>
                  )}

                  <div className="flex gap-4">
                    <motion.button
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setDevOtp(null);
                        setError(null);
                      }}
                      className="flex-1 py-3.5 rounded-xl border border-white/15 bg-white/[0.02] hover:bg-white/[0.05] text-zinc-300 font-semibold text-xs tracking-wider uppercase transition-colors cursor-pointer"
                    >
                      Back
                    </motion.button>
                    <motion.button
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={isLoading || otpCode.length !== 6}
                      className="flex-[2] py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-black font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 shadow-[0_4px_16px_rgba(217,119,6,0.18)] disabled:shadow-none transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Confirm & Sign In"
                      )}
                    </motion.button>
                  </div>
                </motion.form>
              )
            ) : (
              // PASSWORD FLOW
              <motion.form
                key="password-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                onSubmit={handlePasswordAuth}
                className="space-y-6"
              >
                <div>
                  <label htmlFor="email" className="block text-xs uppercase text-zinc-500 tracking-wider font-semibold mb-2.5">
                    College Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500" />
                    <input
                      id="email"
                      type="email"
                      required
                      placeholder="student@college.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-5 py-3.5 bg-black/45 border border-white/15 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/30 transition-all font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs uppercase text-zinc-500 tracking-wider font-semibold mb-2.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500" />
                    <input
                      id="password"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-5 py-3.5 bg-black/45 border border-white/15 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/30 transition-all font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="name" className="block text-xs uppercase text-zinc-500 tracking-wider font-semibold mb-2.5">
                    Full Name (only needed for registration)
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500" />
                    <input
                      id="name"
                      type="text"
                      placeholder="Alex Mercer"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-12 pr-5 py-3.5 bg-black/45 border border-white/15 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/30 transition-all font-sans"
                    />
                  </div>
                </div>

                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading || !email || !password}
                  className="w-full mt-4 py-4 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-black font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(217,119,6,0.18)] disabled:shadow-none transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Sign In / Register <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Feedback Messages */}
        <div className="mt-6 min-h-[24px] flex items-center justify-center">
          {error && (
            <p className="text-xs text-rose-500 text-center font-medium">{error}</p>
          )}
          {successMsg && !error && (
            <p className="text-xs text-emerald-500 text-center font-medium">{successMsg}</p>
          )}
        </div>
      </div>
    </div>
  );
}
