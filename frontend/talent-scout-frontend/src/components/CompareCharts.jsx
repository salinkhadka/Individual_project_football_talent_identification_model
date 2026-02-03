import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

const CompareCharts = ({ players }) => {
  if (!players || players.length === 0) return null;

  // Distinct colors for up to 4 players
  const colors = [
    { border: 'rgb(59, 130, 246)', bg: 'rgba(59, 130, 246, 0.2)' }, // Blue
    { border: 'rgb(239, 68, 68)', bg: 'rgba(239, 68, 68, 0.2)' }, // Red
    { border: 'rgb(34, 197, 94)', bg: 'rgba(34, 197, 94, 0.2)' }, // Green
    { border: 'rgb(168, 85, 247)', bg: 'rgba(168, 85, 247, 0.2)' }, // Purple
  ];

  const data = {
    labels: [
      'Potential', 
      'Current', 
      'Dev Score', 
      'Base Perf', 
      'Play Time',
      'Age Factor'
    ],
    datasets: players.map((player, index) => {
      // Normalize Age: 16yo = 100, 30yo = 30 (Simple inverted scale for radar)
      const age = player.Age_std || player.Age || 20;
      const ageScore = Math.max(20, 100 - (age - 16) * 5);

      const color = colors[index % colors.length];

      return {
        label: player.Player,
        data: [
          player.peak_potential || 0,
          player.current_rating || 0,
          player.ml_development_score || 0,
          player.base_performance_score || 0,
          player.playing_time_score || 0,
          ageScore
        ],
        backgroundColor: color.bg,
        borderColor: color.border,
        borderWidth: 2,
        pointBackgroundColor: color.border,
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: color.border,
      };
    }),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { size: 12 },
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        padding: 12,
        titleFont: { size: 13, weight: 'bold' },
        bodyFont: { size: 13 },
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.raw.toFixed(1)}`;
          }
        }
      }
    },
    scales: {
      r: {
        angleLines: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        suggestedMin: 0,
        suggestedMax: 100,
        ticks: {
          stepSize: 20,
          backdropColor: 'transparent',
          font: { size: 10 },
          color: '#6b7280'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        pointLabels: {
          font: {
            size: 11,
            weight: '600'
          },
          color: '#374151'
        }
      }
    }
  };

  return (
    <div className="w-full h-[450px] flex items-center justify-center p-2 relative">
      <Radar data={data} options={options} />
    </div>
  );
};

export default CompareCharts;