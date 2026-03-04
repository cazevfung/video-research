"use client";

import * as React from "react";
import { WhimsicalLoader } from "@/components/dashboard/WhimsicalLoader";
import type { JobStatus } from "@/types";
import { orbConfig, particleConfig, getParticleBehavior, type ParticleBehavior } from "@/config/visual-effects";

/**
 * Test page for WhimsicalLoader component
 * Allows quick testing and adjustment of animation states and blur effects
 * Accessible at /test/whimsical
 */
export default function WhimsicalTestPage() {
  const [status, setStatus] = React.useState<JobStatus | "idle" | "connected">("idle");
  const [progress, setProgress] = React.useState(0);
  const [isCompleted, setIsCompleted] = React.useState(false);
  const [blurEnabled, setBlurEnabled] = React.useState<boolean>(orbConfig.blur.enabled);
  const [blurRadius, setBlurRadius] = React.useState<number>(orbConfig.blur.radius);
  const [blurOpacity, setBlurOpacity] = React.useState<number>(orbConfig.blur.opacity);

  // Particle system controls
  const [particleCount, setParticleCount] = React.useState<number>(8);
  const [particleBehavior, setParticleBehavior] = React.useState<ParticleBehavior>("fly-in");
  const [particleSizeMin, setParticleSizeMin] = React.useState<number>(Number(particleConfig.size.min));
  const [particleSizeMax, setParticleSizeMax] = React.useState<number>(Number(particleConfig.size.max));
  const [particleDistanceBase, setParticleDistanceBase] = React.useState<number>(Number(particleConfig.distance.base));
  const [particleDistanceRandom, setParticleDistanceRandom] = React.useState<number>(Number(particleConfig.distance.random));
  const [particleSpeedMin, setParticleSpeedMin] = React.useState<number>(Number(particleConfig.speed.min));
  const [particleSpeedMax, setParticleSpeedMax] = React.useState<number>(Number(particleConfig.speed.max));
  const [particleOpacity, setParticleOpacity] = React.useState<number>(Number(particleConfig.opacity.default));

  // Color controls
  const [orbGradient, setOrbGradient] = React.useState<string>("");
  const [particleColor, setParticleColor] = React.useState<string>("rgba(156, 163, 175, 0.6)");
  const [waveColor, setWaveColor] = React.useState<string>("rgba(156, 163, 175, 0.3)");

  // Blur config for real-time testing
  const blurConfig = React.useMemo(() => ({
    enabled: blurEnabled,
    radius: blurRadius,
    opacity: blurOpacity,
  }), [blurEnabled, blurRadius, blurOpacity]);

  // Particle config for real-time testing
  const testParticleConfig = React.useMemo(() => ({
    size: { min: particleSizeMin, max: particleSizeMax },
    distance: { base: particleDistanceBase, random: particleDistanceRandom },
    speed: { min: particleSpeedMin, max: particleSpeedMax },
    opacity: particleOpacity,
  }), [particleSizeMin, particleSizeMax, particleDistanceBase, particleDistanceRandom, particleSpeedMin, particleSpeedMax, particleOpacity]);

  // Update particle behavior when status changes
  React.useEffect(() => {
    const behavior = getParticleBehavior(status);
    setParticleBehavior(behavior);
  }, [status]);

  // Auto-progress simulation for certain states
  React.useEffect(() => {
    if (status === "processing" || status === "generating" || status === "fetching") {
      const interval = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev + 1;
          return newProgress >= 100 ? 0 : newProgress;
        });
      }, 100);
      return () => clearInterval(interval);
    } else {
      setProgress(0);
    }
  }, [status]);

  const statuses: Array<JobStatus | "idle" | "connected"> = [
    "idle",
    "connected",
    "fetching",
    "processing",
    "condensing",
    "aggregating",
    "generating",
    "completed",
    "error",
  ];

  return (
    <div className="min-h-screen bg-theme-bg p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-theme-text-primary mb-2">
          WhimsicalLoader Test Page
        </h1>
        <p className="text-theme-text-secondary mb-8">
          Test and adjust animation states and blur effects in real-time
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Animation Display - Fixed/Sticky */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            <div className="bg-theme-bg-card border border-theme-border-primary rounded-lg p-8">
              <h2 className="text-xl font-semibold text-theme-text-primary mb-4">
                Animation Preview
              </h2>
              <div className="bg-theme-bg-secondary rounded-lg p-12 flex items-center justify-center min-h-[400px]">
                <div className="w-full max-w-md">
                  <WhimsicalLoader
                    status={status}
                    progress={progress}
                    isCompleted={isCompleted}
                    blurConfig={blurConfig}
                    orbGradient={orbGradient || undefined}
                    particleCount={particleCount}
                    particleConfig={testParticleConfig}
                    particleColor={particleColor}
                    waveColor={waveColor}
                  />
                </div>
              </div>
              <div className="mt-4 text-sm text-theme-text-tertiary">
                Status: <span className="font-mono">{status}</span> | 
                Progress: <span className="font-mono">{progress}%</span> | 
                Completed: <span className="font-mono">{isCompleted ? "Yes" : "No"}</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-6">
            {/* Status Selection */}
            <div className="bg-theme-bg-card border border-theme-border-primary rounded-lg p-6">
              <h2 className="text-lg font-semibold text-theme-text-primary mb-4">
                Animation State
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {statuses.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setStatus(s);
                      setIsCompleted(s === "completed");
                    }}
                    className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                      status === s
                        ? "bg-theme-fg text-theme-text-inverted"
                        : "bg-theme-bg-secondary text-theme-text-secondary hover:bg-theme-bg-tertiary"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Progress Control */}
            <div className="bg-theme-bg-card border border-theme-border-primary rounded-lg p-6">
              <h2 className="text-lg font-semibold text-theme-text-primary mb-4">
                Progress
              </h2>
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full"
              />
              <div className="mt-2 text-sm text-theme-text-tertiary">
                {progress}%
              </div>
            </div>

            {/* Completion Toggle */}
            <div className="bg-theme-bg-card border border-theme-border-primary rounded-lg p-6">
              <h2 className="text-lg font-semibold text-theme-text-primary mb-4">
                Completion State
              </h2>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isCompleted}
                  onChange={(e) => setIsCompleted(e.target.checked)}
                  className="w-5 h-5 rounded border-theme-border-primary text-theme-fg focus:ring-2 focus:ring-theme-fg"
                />
                <span className="text-theme-text-secondary">
                  Show completion animation
                </span>
              </label>
            </div>

            {/* Blur Controls */}
            <div className="bg-theme-bg-card border border-theme-border-primary rounded-lg p-6">
              <h2 className="text-lg font-semibold text-theme-text-primary mb-4">
                Blur Effects (Phase 2)
              </h2>
              <div className="space-y-4">
                {/* Blur Enable Toggle */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={blurEnabled}
                    onChange={(e) => setBlurEnabled(e.target.checked)}
                    className="w-5 h-5 rounded border-theme-border-primary text-theme-fg focus:ring-2 focus:ring-theme-fg"
                  />
                  <span className="text-theme-text-secondary">
                    Enable blur overlay
                  </span>
                </label>

                {/* Blur Radius */}
                <div>
                  <label className="block text-sm text-theme-text-secondary mb-2">
                    Blur Radius: {blurRadius}px
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    value={blurRadius}
                    onChange={(e) => setBlurRadius(Number(e.target.value))}
                    className="w-full"
                    disabled={!blurEnabled}
                  />
                </div>

                {/* Blur Opacity */}
                <div>
                  <label className="block text-sm text-theme-text-secondary mb-2">
                    Blur Opacity: {blurOpacity.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={blurOpacity}
                    onChange={(e) => setBlurOpacity(Number(e.target.value))}
                    className="w-full"
                    disabled={!blurEnabled}
                  />
                </div>

                <div className="mt-4 p-3 bg-theme-bg-secondary rounded text-xs text-theme-text-tertiary">
                  <p className="font-semibold mb-1">Real-time Controls:</p>
                  <p>
                    Adjust blur settings above to see changes instantly. Default config values:
                    radius={orbConfig.blur.radius}px, opacity={orbConfig.blur.opacity}
                  </p>
                  <p className="mt-2 text-theme-status-info">
                    💡 Tip: Once you find the perfect values, update them in{" "}
                    <code className="font-mono bg-theme-bg-tertiary px-1 rounded">visual-effects.ts</code>
                  </p>
                </div>
              </div>
            </div>

            {/* Particle System Controls */}
            <div className="bg-theme-bg-card border border-theme-border-primary rounded-lg p-6">
              <h2 className="text-lg font-semibold text-theme-text-primary mb-4">
                Particle System
              </h2>
              <div className="space-y-4">
                {/* Particle Count */}
                <div>
                  <label className="block text-sm text-theme-text-secondary mb-2">
                    Particle Count: {particleCount}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={particleCount}
                    onChange={(e) => setParticleCount(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Particle Behavior */}
                <div>
                  <label className="block text-sm text-theme-text-secondary mb-2">
                    Behavior
                  </label>
                  <select
                    value={particleBehavior}
                    onChange={(e) => setParticleBehavior(e.target.value as ParticleBehavior)}
                    className="w-full px-3 py-2 bg-theme-bg-secondary border border-theme-border-primary rounded text-theme-text-primary"
                  >
                    <option value="fly-in">Fly In</option>
                    <option value="spiral">Spiral</option>
                    <option value="orbit">Orbit</option>
                    <option value="flow-down">Flow Down</option>
                  </select>
                </div>

                {/* Particle Size */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-theme-text-secondary mb-2">
                      Size Min: {particleSizeMin}px
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={particleSizeMin}
                      onChange={(e) => setParticleSizeMin(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-theme-text-secondary mb-2">
                      Size Max: {particleSizeMax}px
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={particleSizeMax}
                      onChange={(e) => setParticleSizeMax(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Particle Distance */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-theme-text-secondary mb-2">
                      Distance Base: {particleDistanceBase}px
                    </label>
                    <input
                      type="range"
                      min="50"
                      max="400"
                      step="10"
                      value={particleDistanceBase}
                      onChange={(e) => setParticleDistanceBase(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-theme-text-secondary mb-2">
                      Distance Random: {particleDistanceRandom}px
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      step="10"
                      value={particleDistanceRandom}
                      onChange={(e) => setParticleDistanceRandom(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Particle Speed */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-theme-text-secondary mb-2">
                      Speed Min: {particleSpeedMin.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="2"
                      step="0.1"
                      value={particleSpeedMin}
                      onChange={(e) => setParticleSpeedMin(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-theme-text-secondary mb-2">
                      Speed Max: {particleSpeedMax.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="2"
                      step="0.1"
                      value={particleSpeedMax}
                      onChange={(e) => setParticleSpeedMax(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Particle Opacity */}
                <div>
                  <label className="block text-sm text-theme-text-secondary mb-2">
                    Opacity: {particleOpacity.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={particleOpacity}
                    onChange={(e) => setParticleOpacity(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Color Controls */}
            <div className="bg-theme-bg-card border border-theme-border-primary rounded-lg p-6">
              <h2 className="text-lg font-semibold text-theme-text-primary mb-4">
                Color Adjustments
              </h2>
              <div className="space-y-4">
                {/* Orb Gradient */}
                <div>
                  <label className="block text-sm text-theme-text-secondary mb-2">
                    Orb Gradient (Tailwind classes)
                  </label>
                  <input
                    type="text"
                    value={orbGradient}
                    onChange={(e) => setOrbGradient(e.target.value)}
                    placeholder="e.g., from-blue-500 to-purple-500"
                    className="w-full px-3 py-2 bg-theme-bg-secondary border border-theme-border-primary rounded text-theme-text-primary placeholder:text-theme-text-tertiary"
                  />
                  <p className="mt-1 text-xs text-theme-text-tertiary">
                    Leave empty to use default for current status
                  </p>
                </div>

                {/* Particle Color */}
                <div>
                  <label className="block text-sm text-theme-text-secondary mb-2">
                    Particle Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={particleColor.startsWith("rgba") ? "#9ca3af" : particleColor}
                      onChange={(e) => {
                        const hex = e.target.value;
                        const r = parseInt(hex.slice(1, 3), 16);
                        const g = parseInt(hex.slice(3, 5), 16);
                        const b = parseInt(hex.slice(5, 7), 16);
                        setParticleColor(`rgba(${r}, ${g}, ${b}, ${particleOpacity})`);
                      }}
                      className="w-12 h-10 rounded border border-theme-border-primary cursor-pointer"
                    />
                    <input
                      type="text"
                      value={particleColor}
                      onChange={(e) => setParticleColor(e.target.value)}
                      placeholder="rgba(156, 163, 175, 0.6)"
                      className="flex-1 px-3 py-2 bg-theme-bg-secondary border border-theme-border-primary rounded text-theme-text-primary placeholder:text-theme-text-tertiary"
                    />
                  </div>
                </div>

                {/* Wave Color */}
                <div>
                  <label className="block text-sm text-theme-text-secondary mb-2">
                    Wave Effect Color (visible in "generating" state)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={waveColor.startsWith("rgba") ? "#9ca3af" : waveColor}
                      onChange={(e) => {
                        const hex = e.target.value;
                        const r = parseInt(hex.slice(1, 3), 16);
                        const g = parseInt(hex.slice(3, 5), 16);
                        const b = parseInt(hex.slice(5, 7), 16);
                        // Extract opacity from current waveColor or use 0.3
                        const opacityMatch = waveColor.match(/[\d.]+\)$/);
                        const opacity = opacityMatch ? parseFloat(opacityMatch[0].slice(0, -1)) : 0.3;
                        setWaveColor(`rgba(${r}, ${g}, ${b}, ${opacity})`);
                      }}
                      className="w-12 h-10 rounded border border-theme-border-primary cursor-pointer"
                    />
                    <input
                      type="text"
                      value={waveColor}
                      onChange={(e) => setWaveColor(e.target.value)}
                      placeholder="rgba(156, 163, 175, 0.3)"
                      className="flex-1 px-3 py-2 bg-theme-bg-secondary border border-theme-border-primary rounded text-theme-text-primary placeholder:text-theme-text-tertiary"
                    />
                  </div>
                </div>

                {/* Quick Color Presets */}
                <div>
                  <label className="block text-sm text-theme-text-secondary mb-2">
                    Quick Presets
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setOrbGradient("from-blue-500 to-purple-500");
                        setParticleColor("rgba(147, 197, 253, 0.6)");
                        setWaveColor("rgba(147, 197, 253, 0.3)");
                      }}
                      className="px-3 py-2 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors text-sm"
                    >
                      Blue Theme
                    </button>
                    <button
                      onClick={() => {
                        setOrbGradient("from-purple-500 to-pink-500");
                        setParticleColor("rgba(196, 181, 253, 0.6)");
                        setWaveColor("rgba(196, 181, 253, 0.3)");
                      }}
                      className="px-3 py-2 bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30 transition-colors text-sm"
                    >
                      Purple Theme
                    </button>
                    <button
                      onClick={() => {
                        setOrbGradient("from-green-500 to-emerald-500");
                        setParticleColor("rgba(134, 239, 172, 0.6)");
                        setWaveColor("rgba(134, 239, 172, 0.3)");
                      }}
                      className="px-3 py-2 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors text-sm"
                    >
                      Green Theme
                    </button>
                    <button
                      onClick={() => {
                        setOrbGradient("");
                        setParticleColor("rgba(156, 163, 175, 0.6)");
                        setWaveColor("rgba(156, 163, 175, 0.3)");
                      }}
                      className="px-3 py-2 bg-gray-500/20 text-gray-400 rounded hover:bg-gray-500/30 transition-colors text-sm"
                    >
                      Reset Defaults
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-theme-bg-card border border-theme-border-primary rounded-lg p-6">
              <h2 className="text-lg font-semibold text-theme-text-primary mb-4">
                Quick Actions
              </h2>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setStatus("idle");
                    setProgress(0);
                    setIsCompleted(false);
                  }}
                  className="w-full px-4 py-2 bg-theme-bg-secondary text-theme-text-secondary rounded hover:bg-theme-bg-tertiary transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={() => {
                    setStatus("processing");
                    setProgress(50);
                  }}
                  className="w-full px-4 py-2 bg-theme-bg-secondary text-theme-text-secondary rounded hover:bg-theme-bg-tertiary transition-colors"
                >
                  Simulate Processing
                </button>
                <button
                  onClick={() => {
                    setStatus("generating");
                    setProgress(75);
                  }}
                  className="w-full px-4 py-2 bg-theme-bg-secondary text-theme-text-secondary rounded hover:bg-theme-bg-tertiary transition-colors"
                >
                  Simulate Generating
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
