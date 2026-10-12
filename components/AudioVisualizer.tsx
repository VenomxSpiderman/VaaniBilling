'use client';

import React, { useEffect, useRef, useCallback } from 'react';

/**
 * AudioVisualizer — Live animated soundbars for voice activity feedback.
 *
 * Props:
 * - energyLevel: current mic energy (0-1 float, updated ~60fps)
 * - isActive: whether speech is currently detected
 * - isListening: whether the VAD/mic is actively monitoring
 */

interface AudioVisualizerProps {
  energyLevel: number;
  isActive: boolean;
  isListening: boolean;
}

/** Number of bars to render */
const BAR_COUNT = 16;

/** Pre-computed per-bar offsets for natural-looking wave patterns */
const BAR_OFFSETS = Array.from({ length: BAR_COUNT }, (_, i) => ({
  // Each bar gets a unique phase offset so they don't all move in sync
  phase: (i / BAR_COUNT) * Math.PI * 2,
  // Bars near the center are taller (bell curve shape)
  centerWeight: Math.exp(-0.5 * Math.pow((i - BAR_COUNT / 2) / (BAR_COUNT / 4), 2)),
}));

export default function AudioVisualizer({
  energyLevel,
  isActive,
  isListening,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const smoothedEnergyRef = useRef(0);
  const timeRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Scale for high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      ctx.scale(dpr, dpr);
    }

    // Smooth the energy value for fluid animations
    const targetEnergy = isListening ? energyLevel : 0;
    smoothedEnergyRef.current += (targetEnergy - smoothedEnergyRef.current) * 0.15;
    const smoothed = smoothedEnergyRef.current;

    timeRef.current += 0.05;
    const t = timeRef.current;

    // Clear canvas
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    const barWidth = (displayWidth / BAR_COUNT) * 0.6;
    const gap = (displayWidth / BAR_COUNT) * 0.4;
    const totalBarWidth = barWidth + gap;
    const startX = (displayWidth - totalBarWidth * BAR_COUNT + gap) / 2;
    const centerY = displayHeight / 2;

    for (let i = 0; i < BAR_COUNT; i++) {
      const { phase, centerWeight } = BAR_OFFSETS[i];

      let barHeight: number;

      if (!isListening) {
        // Flat line when not listening — just tiny dots
        barHeight = 2;
      } else if (isActive) {
        // Active speech: vibrant animated bars scaled by energy
        const wave = Math.sin(t * 3 + phase) * 0.3 + 0.7;
        const boost = Math.sin(t * 5 + phase * 1.5) * 0.15 + 0.85;
        barHeight = Math.max(3, smoothed * centerWeight * wave * boost * (displayHeight * 0.8));
      } else {
        // Listening but idle: subtle breathing animation
        const idleWave = Math.sin(t * 1.5 + phase) * 0.5 + 0.5;
        barHeight = Math.max(2, idleWave * centerWeight * 8 + 2);
      }

      const x = startX + i * totalBarWidth;
      const halfHeight = barHeight / 2;

      // Choose color based on state
      if (!isListening) {
        ctx.fillStyle = '#d6d3d1'; // stone-300
      } else if (isActive) {
        // Create gradient from amber-500 to orange-500
        const gradient = ctx.createLinearGradient(x, centerY - halfHeight, x, centerY + halfHeight);
        gradient.addColorStop(0, '#f59e0b'); // amber-500
        gradient.addColorStop(0.5, '#f97316'); // orange-500
        gradient.addColorStop(1, '#f59e0b'); // amber-500
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = '#a8a29e'; // stone-400
      }

      // Draw rounded bar (mirrored from center)
      const radius = Math.min(barWidth / 2, halfHeight);
      drawRoundedRect(ctx, x, centerY - halfHeight, barWidth, barHeight, radius);
    }

    animFrameRef.current = requestAnimationFrame(draw);
  }, [energyLevel, isActive, isListening]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-12 rounded-xl"
      style={{ display: 'block' }}
    />
  );
}

/**
 * Helper to draw a rounded rectangle on a canvas context.
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  if (height < 1) height = 1;
  radius = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}
