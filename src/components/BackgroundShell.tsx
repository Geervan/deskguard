"use client";

import React from "react";
import { motion } from "framer-motion";

function WireframeMesh() {
  const nodes = [
    { x: 50, y: 100, z: 15 },
    { x: 150, y: 60, z: 30 },
    { x: 250, y: 120, z: 10 },
    { x: 350, y: 80, z: 40 },
    { x: 450, y: 160, z: 20 },
    { x: 100, y: 280, z: 50 },
    { x: 220, y: 220, z: 15 },
    { x: 320, y: 320, z: 65 },
    { x: 420, y: 240, z: 30 },
    { x: 520, y: 200, z: 50 },
  ];

  const project = (x: number, y: number, z: number) => {
    const angle = Math.PI / 6; // 30 degrees
    const isoX = 350 + (x - y) * Math.cos(angle);
    const isoY = 100 + (x + y) * Math.sin(angle) - z;
    return { x: isoX, y: isoY };
  };

  const projectedNodes = nodes.map((n) => project(n.x, n.y, n.z));

  return (
    <svg className="absolute -top-10 -right-20 w-[600px] h-[500px] opacity-[0.25] text-amber-500/20 select-none pointer-events-none" viewBox="0 0 800 600">
      <defs>
        <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(217, 119, 6, 0.4)" />
          <stop offset="100%" stopColor="rgba(217, 119, 6, 0)" />
        </radialGradient>
      </defs>

      {/* Draw connection lines */}
      {projectedNodes.map((n1, i) => {
        return projectedNodes.slice(i + 1).map((n2, j) => {
          const dist = Math.hypot(n1.x - n2.x, n1.y - n2.y);
          if (dist < 200) {
            return (
              <motion.line
                key={`${i}-${j}`}
                x1={n1.x}
                y1={n1.y}
                x2={n2.x}
                y2={n2.y}
                stroke="currentColor"
                strokeWidth={0.75}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.6 }}
                transition={{ duration: 3, delay: i * 0.15, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
              />
            );
          }
          return null;
        });
      })}

      {/* Draw nodes */}
      {projectedNodes.map((node, i) => (
        <g key={i}>
          <circle cx={node.x} cy={node.y} r={2.5} fill="#d97706" className="animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
          <circle cx={node.x} cy={node.y} r={7} fill="url(#glowGrad)" />
        </g>
      ))}
    </svg>
  );
}

function IsometricDeskGrid() {
  const gridRows = 4;
  const gridCols = 3;
  const spacingX = 55;
  const spacingY = 55;
  const startX = 100;
  const startY = 80;

  const renderIsometricCube = (cx: number, cy: number, w: number, h: number, d: number, index: number) => {
    const angle = Math.PI / 6;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    const p0 = { x: cx, y: cy };
    const p1 = { x: cx + w * cosA, y: cy - w * sinA };
    const p2 = { x: cx + (w - d) * cosA, y: cy - (w + d) * sinA };
    const p3 = { x: cx - d * cosA, y: cy - d * sinA };

    const t0 = { x: p0.x, y: p0.y - h };
    const t1 = { x: p1.x, y: p1.y - h };
    const t2 = { x: p2.x, y: p2.y - h };
    const t3 = { x: p3.x, y: p3.y - h };

    return (
      <g key={index} className="text-amber-500/10 hover:text-amber-500/25 transition-colors duration-500">
        <line x1={p0.x} y1={p0.y} x2={t0.x} y2={t0.y} stroke="currentColor" strokeWidth={0.5} />
        <line x1={p1.x} y1={p1.y} x2={t1.x} y2={t1.y} stroke="currentColor" strokeWidth={0.5} />
        <line x1={p2.x} y1={p2.y} x2={t2.x} y2={t2.y} stroke="currentColor" strokeWidth={0.5} />
        <line x1={p3.x} y1={p3.y} x2={t3.x} y2={t3.y} stroke="currentColor" strokeWidth={0.5} />

        <path d={`M ${p0.x} ${p0.y} L ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} Z`} fill="none" stroke="currentColor" strokeWidth={0.5} />
        <path d={`M ${t0.x} ${t0.y} L ${t1.x} ${t1.y} L ${t2.x} ${t2.y} L ${t3.x} ${t3.y} Z`} fill="none" stroke="currentColor" strokeWidth={0.75} />
      </g>
    );
  };

  const cubes = [];
  let index = 0;
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      const px = startX + r * spacingX;
      const py = startY + c * spacingY;
      const angle = Math.PI / 6;
      const isoX = 180 + (px - py) * Math.cos(angle);
      const isoY = 120 + (px + py) * Math.sin(angle);
      const h = 18 + Math.sin(r + c) * 4;
      cubes.push(renderIsometricCube(isoX, isoY, 16, h, 16, index++));
    }
  }

  return (
    <svg className="absolute -bottom-10 -left-10 w-[400px] h-[350px] opacity-[0.2] select-none pointer-events-none" viewBox="0 0 500 400">
      {cubes}
    </svg>
  );
}

function ConstellationSparkles() {
  const points = [
    { id: 1, x: "12%", y: "20%" },
    { id: 2, x: "28%", y: "15%" },
    { id: 3, x: "78%", y: "30%" },
    { id: 4, x: "85%", y: "65%" },
    { id: 5, x: "20%", y: "75%" },
    { id: 6, x: "65%", y: "80%" },
  ];

  const connections = [
    { from: 1, to: 2 },
    { from: 3, to: 4 },
    { from: 5, to: 6 },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <svg className="w-full h-full opacity-[0.35]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="sparkleGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(217, 119, 6, 0.6)" />
            <stop offset="100%" stopColor="rgba(217, 119, 6, 0)" />
          </radialGradient>
        </defs>

        {/* Connections */}
        {connections.map((conn, idx) => {
          const pStart = points.find(p => p.id === conn.from)!;
          const pEnd = points.find(p => p.id === conn.to)!;

          return (
            <g key={idx}>
              <motion.line
                x1={pStart.x}
                y1={pStart.y}
                x2={pEnd.x}
                y2={pEnd.y}
                stroke="#d97706"
                strokeWidth={0.5}
                strokeDasharray="4 4"
                initial={{ pathOffset: 0, opacity: 0.1 }}
                animate={{ 
                  pathOffset: [0, 1],
                  opacity: [0.1, 0.4, 0.1]
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "linear",
                  delay: idx * 2
                }}
              />
            </g>
          );
        })}

        {/* Nodes */}
        {points.map((pt, idx) => {
          return (
            <g key={pt.id}>
              <motion.circle
                cx={pt.x}
                cy={pt.y}
                r={2}
                fill="#d97706"
                animate={{
                  scale: [1, 2, 1],
                  opacity: [0.3, 0.9, 0.3],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: idx * 1.5,
                }}
              />
              <motion.circle
                cx={pt.x}
                cy={pt.y}
                r={8}
                fill="url(#sparkleGlow)"
                animate={{
                  scale: [0.8, 1.5, 0.8],
                  opacity: [0.2, 0.6, 0.2],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: idx * 1.5,
                }}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function BackgroundShell() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
      {/* Dot Grid background pattern */}
      <div className="absolute inset-0 dot-grid opacity-[0.22]" />

      {/* ── Vertical beam strikes (no visible track) ── */}
      {/* Left-zone: fast thin strike */}
      <div className="neon-pulse-v hidden lg:block" style={{ left: "8%", ["--beam-dur" as any]: "9s", ["--beam-delay" as any]: "0s" }} />
      {/* Left-inner: slow wide glow */}
      <div className="neon-pulse-v-slow hidden lg:block" style={{ left: "22%", ["--beam-dur" as any]: "19s", ["--beam-delay" as any]: "4s" }} />
      {/* Center-left: standard */}
      <div className="neon-pulse-v hidden lg:block" style={{ left: "38%", ["--beam-dur" as any]: "13s", ["--beam-delay" as any]: "7s" }} />
      {/* Center-right: fast */}
      <div className="neon-pulse-v hidden lg:block" style={{ right: "35%", ["--beam-dur" as any]: "8s", ["--beam-delay" as any]: "2s" }} />
      {/* Right-inner: slow wide */}
      <div className="neon-pulse-v-slow hidden lg:block" style={{ right: "18%", ["--beam-dur" as any]: "22s", ["--beam-delay" as any]: "11s" }} />
      {/* Right-edge: standard */}
      <div className="neon-pulse-v hidden lg:block" style={{ right: "7%", ["--beam-dur" as any]: "11s", ["--beam-delay" as any]: "5.5s" }} />

      {/* ── Horizontal beam strikes (no visible track) ── */}
      {/* Top band: thin fast */}
      <div className="neon-pulse-h-fast hidden lg:block" style={{ top: "12%", ["--beam-dur" as any]: "6s", ["--beam-delay" as any]: "1s" }} />
      {/* Upper-mid: standard */}
      <div className="neon-pulse-h hidden lg:block" style={{ top: "28%", ["--beam-dur" as any]: "11s", ["--beam-delay" as any]: "3.5s" }} />
      {/* Center: slow wide */}
      <div className="neon-pulse-h hidden lg:block" style={{ top: "50%", ["--beam-dur" as any]: "15s", ["--beam-delay" as any]: "0.5s" }} />
      {/* Lower-mid: fast thin */}
      <div className="neon-pulse-h-fast hidden lg:block" style={{ top: "68%", ["--beam-dur" as any]: "7s", ["--beam-delay" as any]: "8s" }} />
      {/* Bottom: standard */}
      <div className="neon-pulse-h hidden lg:block" style={{ top: "84%", ["--beam-dur" as any]: "12s", ["--beam-delay" as any]: "6s" }} />

      {/* SVG Isometric Wireframes */}
      <WireframeMesh />
      <IsometricDeskGrid />

      {/* Constellation Sparkles */}
      <ConstellationSparkles />
    </div>
  );
}
