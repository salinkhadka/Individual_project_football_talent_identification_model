import React from 'react';
import { useState } from 'react';

function ShotmapChart({ shots = [], width = 800, height = 400 }) {
  const [hoveredShot, setHoveredShot] = useState(null);

  const scaleX = (x) => (x / 100) * width;
  const scaleY = (y) => (y / 50) * height;

  const colorForType = (type) => {
    if (type === 'goal') return '#22c55e'; // Bright Green
    if (type === 'key_pass') return '#3b82f6'; // Digital Blue (Standardized)
    return '#ef4444'; // Error Red
  };

  return (
    <div className="relative overflow-hidden rounded-[2.5rem] shadow-2xl border-4 border-slate-900/10">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full bg-[#2d5a27]"
        style={{ minHeight: '400px' }}
      >
        {/* Pitch Texture Patterns */}
        <defs>
          <pattern id="grass-pattern" x="0" y="0" width="80" height="400" patternUnits="userSpaceOnUse">
            <rect width="40" height="400" fill="#2d5a27" />
            <rect x="40" width="40" height="400" fill="#274e22" />
          </pattern>
        </defs>

        {/* Grass Stripes */}
        <rect width={width} height={height} fill="url(#grass-pattern)" />

        {/* Realistic Shadows/Glow for Pitch Markings */}
        <rect x="10" y="10" width={width - 20} height={height - 20} fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="6" rx="4" />

        {/* Main Outline */}
        <rect
          x="10"
          y="10"
          width={width - 20}
          height={height - 20}
          fill="none"
          stroke="rgba(255,255,255,0.7)"
          strokeWidth="3"
        />

        {/* Center line */}
        <line
          x1={width / 2}
          y1="10"
          x2={width / 2}
          y2={height - 10}
          stroke="rgba(255,255,255,0.7)"
          strokeWidth="3"
        />

        {/* Center circle */}
        <circle
          cx={width / 2}
          cy={height / 2}
          r="60"
          fill="none"
          stroke="rgba(255,255,255,0.7)"
          strokeWidth="3"
        />
        <circle cx={width / 2} cy={height / 2} r="3" fill="rgba(255,255,255,0.9)" />

        {/* Goal boxes (Opponent Half focus for Shotmap) */}
        {/* Large Box */}
        <rect
          x={width - 150}
          y={(height - 240) / 2}
          width="140"
          height="240"
          fill="none"
          stroke="rgba(255,255,255,0.7)"
          strokeWidth="3"
        />
        {/* Small Box */}
        <rect
          x={width - 60}
          y={(height - 100) / 2}
          width="50"
          height="100"
          fill="none"
          stroke="rgba(255,255,255,0.7)"
          strokeWidth="3"
        />

        {/* Left Goal Box (Faded) */}
        <rect x="10" y={(height - 240) / 2} width="140" height="240" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />

        {/* Penalty Spot */}
        <circle cx={width - 110} cy={height / 2} r="3" fill="rgba(255,255,255,0.9)" />

        {/* Corner Arcs */}
        <path d="M 10 30 A 20 20 0 0 0 30 10" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
        <path d={`M ${width - 10} 30 A 20 20 0 0 1 ${width - 30} 10`} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
        <path d={`M 10 ${height - 30} A 20 20 0 0 1 30 ${height - 10}`} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
        <path d={`M ${width - 10} ${height - 30} A 20 20 0 0 0 ${width - 30} ${height - 10}`} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />

        {/* Shots with realistic dropshadows */}
        <defs>
          <filter id="shot-shadow" x="-20%" y="-20%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
            <feOffset dx="0" dy="2" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.5" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {shots
          .filter(s => s.x && s.x > 50)
          .map((s, idx) => {
            const shotId = s.id || `shot-${idx}`;
            const isHovered = hoveredShot === shotId;
            return (
              <g key={shotId} filter="url(#shot-shadow)">
                <circle
                  cx={scaleX(s.x)}
                  cy={scaleY(s.y)}
                  r={isHovered ? 12 : 8}
                  fill={colorForType(s.type)}
                  fillOpacity={isHovered ? 1 : 0.9}
                  stroke="#ffffff"
                  strokeWidth={isHovered ? 3 : 2}
                  className="cursor-pointer transition-all duration-300 transform-gpu"
                  onMouseEnter={() => setHoveredShot(shotId)}
                  onMouseLeave={() => setHoveredShot(null)}
                />
                {isHovered && (
                  <g className="pointer-events-none">
                    <rect
                      x={scaleX(s.x) - 40}
                      y={scaleY(s.y) - 45}
                      width="80"
                      height="20"
                      rx="4"
                      fill="rgba(0,0,0,0.8)"
                    />
                    <text
                      x={scaleX(s.x)}
                      y={scaleY(s.y) - 31}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="900"
                      className="uppercase tracking-tighter"
                    >
                      {s.type === 'goal' ? '⚽ Goal' : s.type === 'key_pass' ? '🎯 Key Pass' : '❌ Miss'}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
      </svg>

      {/* Dynamic Detail Overlay */}
      {hoveredShot !== null && (() => {
        const shot = shots.find(s => (s.id || `shot-${shots.indexOf(s)}`) === hoveredShot);
        if (!shot) return null;
        return (
          <div className="absolute top-6 right-6 bg-slate-900/90 backdrop-blur-md border border-white/10 text-white px-5 py-3 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${shot.type === 'goal' ? 'bg-success' : 'bg-danger'}`} />
              <p className="text-[10px] font-black uppercase tracking-widest leading-none">{shot.type || 'Shot'}</p>
            </div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
              Location Matrix: ({shot.x?.toFixed(1)}, {shot.y?.toFixed(1)})
            </p>
          </div>
        );
      })()}
    </div>
  );
}

export default ShotmapChart;
