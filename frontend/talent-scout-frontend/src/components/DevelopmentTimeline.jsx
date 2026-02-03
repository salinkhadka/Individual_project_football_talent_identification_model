// src/components/DevelopmentTimeline.jsx
import { useState } from 'react';
import { Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';

function DevelopmentTimeline({ progression = [] }) {
  const [expandedSeason, setExpandedSeason] = useState(null);

  const sortedProgression = [...progression].sort((a, b) => {
    const seasonA = parseInt(a.Season?.split('-')[0]) || 0;
    const seasonB = parseInt(b.Season?.split('-')[0]) || 0;
    return seasonA - seasonB;
  });

  const getSeasonColor = (potential) => {
    if (potential >= 80) return 'bg-green-500';
    if (potential >= 70) return 'bg-blue-500';
    if (potential >= 60) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const getGrowthIcon = (change) => {
    if (change > 2) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (change < -2) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  if (progression.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No progression data available
      </div>
    );
  }

  return (
    <div className="relative pl-8">
      {/* Timeline line */}
      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-300"></div>

      {sortedProgression.map((season, index) => {
        const previousPotential = sortedProgression[index - 1]?.peak_potential;
        const growth = previousPotential ? (season.peak_potential - previousPotential).toFixed(1) : null;
        
        return (
          <div key={season.season} className="relative pl-8 pb-6 last:pb-0">
            {/* Timeline dot */}
            <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-white ${getSeasonColor(season.peak_potential)}`}></div>

            {/* Season card */}
            <div 
              className={`border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer ${
                expandedSeason === season.season ? 'shadow-md bg-gray-50' : 'bg-white'
              }`} 
              onClick={() => setExpandedSeason(expandedSeason === season.season ? null : season.season)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-gray-900">{season.season}</h3>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                      {season.club || season.Squad_std}
                    </span>
                    <span className="text-sm text-gray-500">
                      Age {season.Age_std || season.Age || 'N/A'}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mb-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{season.peak_potential?.toFixed(1)}</div>
                      <div className="text-xs text-gray-500">Potential</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-700">{season.current_rating?.toFixed(1)}</div>
                      <div className="text-xs text-gray-500">Current</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-700">{season.matches || 0}</div>
                      <div className="text-xs text-gray-500">Matches</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-700">
                        {season.goals || 0}/{season.assists || 0}
                      </div>
                      <div className="text-xs text-gray-500">G/A</div>
                    </div>
                  </div>

                  {/* Growth indicator */}
                  {growth && (
                    <div className="flex items-center gap-2 text-sm">
                      {getGrowthIcon(parseFloat(growth))}
                      <span className={`font-medium ${
                        parseFloat(growth) > 0 ? 'text-green-600' : 
                        parseFloat(growth) < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {parseFloat(growth) > 0 ? '+' : ''}{growth} points
                      </span>
                      <span className="text-gray-500">from previous season</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded details */}
              {expandedSeason === season.season && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <DetailItem label="ML Dev Score" value={season.ml_development_score?.toFixed(1)} />
                    <DetailItem label="Base Performance" value={season.base_performance_score?.toFixed(1)} />
                    <DetailItem label="Playing Time" value={season.playing_time_score?.toFixed(1)} />
                    <DetailItem label="Confidence" value={season.confidence} />
                    <DetailItem label="Age Bonus" value={season.age_bonus?.toFixed(1)} />
                    <DetailItem label="Elite Bonus" value={season.elite_bonus?.toFixed(1)} />
                    <DetailItem label="Sample Penalty" value={season.sample_penalty?.toFixed(1)} />
                    <DetailItem label="Minutes" value={season.minutes?.toLocaleString()} />
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium text-gray-900">{value || 'N/A'}</div>
    </div>
  );
}

export default DevelopmentTimeline;