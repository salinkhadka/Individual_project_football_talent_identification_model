import React from 'react';

function FieldVisualization({ positions = [], width = 600, height = 300 }) {
  const scaleX = (x) => (x / 100) * width;
  const scaleY = (y) => (y / 50) * height;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full max-w-3xl bg-green-700 rounded-2xl shadow-inner"
    >
      {/* Pitch outline */}
      <rect
        x="5"
        y="5"
        width={width - 10}
        height={height - 10}
        rx="16"
        ry="16"
        fill="#15803d"
        stroke="#bbf7d0"
        strokeWidth="4"
      />
      {/* Halfway line */}
      <line
        x1={width / 2}
        y1="5"
        x2={width / 2}
        y2={height - 5}
        stroke="#bbf7d0"
        strokeWidth="2"
        strokeDasharray="6 6"
      />
      {/* Center circle */}
      <circle
        cx={width / 2}
        cy={height / 2}
        r={height * 0.18}
        stroke="#bbf7d0"
        strokeWidth="2"
        fill="none"
      />

      {/* Players */}
      {positions.map((p) => (
        <g key={p.id}>
          <circle
            cx={scaleX(p.x)}
            cy={scaleY(p.y)}
            r={12}
            fill={
              p.position === 'GK'
                ? '#facc15'
                : p.position === 'DF'
                ? '#60a5fa'
                : p.position === 'MF'
                ? '#a855f7'
                : '#f97316'
            }
            stroke="#fefce8"
            strokeWidth="2"
          />
          <text
            x={scaleX(p.x)}
            y={scaleY(p.y) + 4}
            textAnchor="middle"
            className="fill-white text-[10px] font-bold"
          >
            {p.position}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default FieldVisualization;


