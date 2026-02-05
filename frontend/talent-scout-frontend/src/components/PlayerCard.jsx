// src/components/PlayerCard.jsx
import { X } from 'lucide-react';

function PlayerCard({ player, onClose }) {
  const getBadges = () => {
    const badges = [];
    const rank = player.id || player.rank;
    const score = player.peak_potential || player.PredictedPotential || 0;

    if (rank === 1) badges.push({ text: '🥇 #1 Prospect', color: 'from-yellow-400 to-orange-500' });
    else if (rank === 2) badges.push({ text: '🥈 Top 2', color: 'from-gray-300 to-gray-400' });
    else if (rank === 3) badges.push({ text: '🥉 Top 3', color: 'from-orange-300 to-orange-400' });
    else if (rank <= 10) badges.push({ text: '⭐ Top 10', color: 'from-purple-400 to-pink-500' });

    if (score >= 90) badges.push({ text: '🌟 Elite', color: 'from-blue-400 to-purple-500' });
    else if (score >= 80) badges.push({ text: '💎 High Potential', color: 'from-green-400 to-teal-500' });
    else if (score >= 70) badges.push({ text: '⚡ Rising Star', color: 'from-yellow-400 to-red-500' });

    return badges;
  };

  // Safe numeric extraction with fallbacks
  const safeNumber = (value, defaultVal = 0) => {
    const num = Number(value);
    return isNaN(num) ? defaultVal : num;
  };

  // Get minutes - prefer raw columns, avoid scaled
  const getMinutes = () => {
    const minutes = safeNumber(
      player['Playing Time_Min'] ??
      player['Playing Time_Min_raw'] ??
      player.minutes ??
      0
    );
    return Math.round(minutes);
  };

  // Get matches - prefer display column, then raw, then derive from minutes
  const getMatches = () => {
    const matches = safeNumber(
      player['matches_played_display'] ??
      player['Playing Time_MP_raw'] ??
      player['Playing Time_MP'] ??
      Math.round(getMinutes() / 90)
    );
    return Math.round(matches);
  };

  const potential = safeNumber(player.peak_potential ?? player.PredictedPotential, 0);
  const current = safeNumber(player.current_rating ?? player.CurrentRating, 0);
  const nextSeason = safeNumber(player.next_season_rating, 0);
  const age = safeNumber(player.Age_std ?? player.Age, null);
  const goalsPer90 = safeNumber(player['Per 90 Minutes_Gls'], 0);
  const starts = safeNumber(player['Playing Time_Starts'] ?? player['Starts_Starts'], 0);

  const minutes = getMinutes();
  const matches = getMatches();

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-br from-purple-600 via-blue-600 to-purple-700 rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'slideUp 0.3s ease-out' }}
      >
        {/* Overlay Effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/30 hover:bg-white/50 rounded-full flex items-center justify-center transition-all"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Card Header */}
        <div className="relative p-6 flex justify-between items-start">
          <div className="text-center">
            <div className="text-6xl font-bold text-yellow-300 drop-shadow-lg">
              {Math.round(potential)}
            </div>
            <div className="text-white/90 text-[10px] uppercase tracking-wider font-semibold mt-1">
              Potential Score
            </div>
          </div>
          <div className="bg-white/25 backdrop-blur-md px-5 py-3 rounded-xl border-2 border-white/40">
            <div className="text-white font-bold text-xl tracking-wider">
              {player.Pos_std || 'N/A'}
            </div>
          </div>
        </div>

        {/* Player Info */}
        <div className="relative text-center px-6 pb-4">
          <h2 className="text-3xl font-bold text-white uppercase tracking-wide drop-shadow-lg mb-2">
            {player.Player}
          </h2>
          <p className="text-white/90 text-lg font-medium">{player.Squad_std || 'N/A'}</p>
          <p className="text-white/80 text-sm mt-1">
            {player.Nation_std ? `${player.Nation_std} • ` : ''}
            Age: {age !== null ? Math.round(age) : 'N/A'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="relative mx-6 mb-6 bg-white/20 backdrop-blur-md rounded-2xl p-6 border-2 border-white/40">
          <div className="grid grid-cols-3 gap-4">
            <StatItem
              label="Goals/90"
              value={goalsPer90.toFixed(2)}
            />
            <StatItem
              label="Rating"
              value={current.toFixed(1)}
            />
            <StatItem
              label=" Next Season Projection"
              value={nextSeason.toFixed(1)}
            />
            <StatItem
              label="Minutes"
              value={minutes}
            />
            <StatItem
              label="Matches"
              value={matches}
            />
            <StatItem
              label="Starts"
              value={Math.round(starts)}
            />
          </div>
        </div>

        {/* Badges */}
        {getBadges().length > 0 && (
          <div className="relative px-6 pb-6 flex flex-wrap gap-2 justify-center">
            {getBadges().map((badge, i) => (
              <div
                key={i}
                className={`bg-gradient-to-r ${badge.color} px-4 py-2 rounded-full text-white text-xs font-bold uppercase tracking-wide shadow-lg`}
              >
                {badge.text}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="relative bg-white/20 backdrop-blur-md py-4 text-center border-t-2 border-white/40">
          <p className="text-white/90 text-sm font-medium">Professional Scouting Analysis</p>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(50px) scale(0.9);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

function StatItem({ label, value }) {
  return (
    <div className="text-center bg-white/25 rounded-xl p-3 border border-white/30 hover:bg-white/35 transition-all">
      <div className="text-2xl font-bold text-white drop-shadow-md">{value}</div>
      <div className="text-white/90 text-xs uppercase tracking-wide font-medium mt-1">
        {label}
      </div>
    </div>
  );
}

export default PlayerCard;