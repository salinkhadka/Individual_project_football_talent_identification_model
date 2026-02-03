// src/components/PlayerProgressionChart.jsx - UPDATED WITH CHART.JS
import { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function PlayerProgressionChart({ progression = [], compact = false }) {
  const [chartData, setChartData] = useState(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!progression || progression.length === 0) {
      setChartData(null);
      return;
    }

    const sorted = [...progression].sort((a, b) => {
      const seasonA = parseInt(a.Season?.split('-')[0]) || 0;
      const seasonB = parseInt(b.Season?.split('-')[0]) || 0;
      return seasonA - seasonB;
    });

    const seasons = sorted.map(p => p.Season || 'Unknown');
    const peakData = sorted.map(p => parseFloat(p.peak_potential) || 0);
    const currentData = sorted.map(p => parseFloat(p.current_rating) || 0);
    const mlDevData = sorted.map(p => parseFloat(p.ml_development_score) || 0);

    const data = {
      labels: seasons,
      datasets: [
        {
          label: 'Peak Potential',
          data: peakData,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: 'rgb(59, 130, 246)',
        },
        {
          label: 'Current Rating',
          data: currentData,
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: 'rgb(16, 185, 129)',
        },
        {
          label: 'ML Development',
          data: mlDevData,
          borderColor: 'rgb(139, 92, 246)',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 5],
          tension: 0.4,
          fill: false,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: 'rgb(139, 92, 246)',
        }
      ]
    };

    setChartData(data);
  }, [progression]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#374151',
          font: {
            size: 12,
            weight: '600'
          },
          padding: 20,
          usePointStyle: true,
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#111827',
        bodyColor: '#374151',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toFixed(1);
            }
            return label;
          },
          title: function(tooltipItems) {
            const season = tooltipItems[0].label;
            const player = progression.find(p => p.Season === season);
            const age = player?.Age_std || player?.Age;
            return [
              `Season: ${season}`,
              age ? `Age: ${age}` : null
            ].filter(Boolean);
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(229, 231, 235, 0.5)',
          drawBorder: false,
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 11
          },
          maxRotation: 0
        }
      },
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: 'rgba(229, 231, 235, 0.5)',
          drawBorder: false,
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 11
          },
          callback: function(value) {
            return value.toFixed(0);
          }
        }
      }
    }
  };

  if (!progression || progression.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-gray-600 font-medium">No progression data available</p>
          <p className="text-gray-400 text-sm mt-1">This player has only one season of data</p>
        </div>
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
          <p className="text-gray-500">Loading chart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height: compact ? '300px' : '400px' }}>
      <Line ref={chartRef} data={chartData} options={options} />
    </div>
  );
}

export default PlayerProgressionChart;