import React from 'react';

import { useState } from 'react';

function ShotmapChart({ shots = [], width = 800, height = 400 }) {
  const [hoveredShot, setHoveredShot] = useState(null);
  
  const scaleX = (x) => (x / 100) * width;
  const scaleY = (y) => (y / 50) * height;

  const colorForType = (type) => {
    if (type === 'goal') return '#22c55e';
    if (type === 'key_pass') return '#eab308';
    return '#ef4444';
  };

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full bg-gradient-to-b from-green-700 to-green-900 rounded-2xl shadow-2xl"
        style={{ minHeight: '400px' }}
      >
        {/* Pitch outline */}
        <rect
          x="10"
          y="10"
          width={width - 20}
          height={height - 20}
          rx="20"
          ry="20"
          fill="#14532d"
          stroke="#bbf7d0"
          strokeWidth="3"
        />

        {/* Center line */}
        <line
          x1={width / 2}
          y1="10"
          x2={width / 2}
          y2={height - 10}
          stroke="#bbf7d0"
          strokeWidth="2"
          strokeDasharray="5,5"
        />

        {/* Center circle */}
        <circle
          cx={width / 2}
          cy={height / 2}
          r="60"
          fill="none"
          stroke="#bbf7d0"
          strokeWidth="2"
        />

        {/* Goal boxes */}
        <rect
          x="10"
          y={(height - 80) / 2}
          width="40"
          height="80"
          fill="none"
          stroke="#bbf7d0"
          strokeWidth="2"
        />
        <rect
          x={width - 50}
          y={(height - 80) / 2}
          width="40"
          height="80"
          fill="none"
          stroke="#bbf7d0"
          strokeWidth="2"
        />

        {/* Penalty box outline (opponent's half) */}
        <rect
          x={scaleX(70)}
          y={scaleY(10)}
          width={scaleX(30)}
          height={scaleY(30)}
          fill="none"
          stroke="#fbbf24"
          strokeWidth="2"
          strokeDasharray="4,4"
          opacity="0.5"
        />
        
        {/* Shots with hover effect - only show if in opponent's half (x > 50) */}
        {shots
          .filter(s => s.x && s.x > 50) // Only opponent's half, ensure x exists
          .map((s, idx) => {
            const shotId = s.id || `shot-${idx}`;
            return (
              <g key={shotId}>
                <circle
                  cx={scaleX(s.x)}
                  cy={scaleY(s.y)}
                  r={hoveredShot === shotId ? 10 : 7}
                  fill={colorForType(s.type)}
                  fillOpacity={hoveredShot === shotId ? 1 : 0.85}
                  stroke="#ffffff"
                  strokeWidth={hoveredShot === shotId ? 2 : 1.5}
                  className="cursor-pointer transition-all duration-200"
                  onMouseEnter={() => setHoveredShot(shotId)}
                  onMouseLeave={() => setHoveredShot(null)}
                />
                {hoveredShot === shotId && (
                  <text
                    x={scaleX(s.x)}
                    y={scaleY(s.y) - 15}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="12"
                    fontWeight="bold"
                    className="pointer-events-none"
                  >
                    {s.type === 'goal' ? '⚽ Goal' : s.type === 'key_pass' ? '🎯 Key Pass' : '❌ Miss'}
                  </text>
                )}
              </g>
            );
          })}
      </svg>
      
      {hoveredShot !== null && (() => {
        const shot = shots.find(s => (s.id || `shot-${shots.indexOf(s)}`) === hoveredShot);
        if (!shot) return null;
        return (
          <div className="absolute top-4 right-4 bg-black/80 text-white px-4 py-2 rounded-lg text-sm">
            <p className="font-semibold">{shot.type?.toUpperCase() || 'SHOT'}</p>
            <p className="text-xs text-gray-300">
              Position: ({shot.x?.toFixed(1)}, {shot.y?.toFixed(1)})
            </p>
          </div>
        );
      })()}
    </div>
  );
}

export default ShotmapChart;


