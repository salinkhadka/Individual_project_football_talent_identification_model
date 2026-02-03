// src/pages/Predict.jsx
import { useState } from 'react';
import { Sparkles, TrendingUp, AlertCircle } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:5000';

// All 25 features required by the model
const FEATURE_FIELDS = [
  { name: 'Playing Time_MP_std', label: 'Matches Played', placeholder: '15', hint: 'Total matches played' },
  { name: 'Playing Time_Starts', label: 'Starts', placeholder: '12', hint: 'Number of matches started' },
  { name: 'Playing Time_Min_std', label: 'Minutes Played', placeholder: '1080', hint: 'Total minutes played' },
  { name: 'Playing Time_90s_std', label: '90s Played', placeholder: '12', hint: 'Equivalent full matches' },
  { name: 'Performance_Gls', label: 'Goals', placeholder: '5', hint: 'Total goals scored' },
  { name: 'Performance_G-PK', label: 'Non-Penalty Goals', placeholder: '4', hint: 'Goals excluding penalties' },
  { name: 'Performance_PK', label: 'Penalty Goals', placeholder: '1', hint: 'Goals from penalties' },
  { name: 'Performance_PKatt', label: 'Penalty Attempts', placeholder: '1', hint: 'Total penalty attempts' },
  { name: 'Per 90 Minutes_Gls', label: 'Goals per 90', placeholder: '0.42', hint: 'Goals per 90 minutes' },
  { name: 'Per 90 Minutes_G-PK', label: 'Non-PK Goals per 90', placeholder: '0.33', hint: 'Non-penalty goals per 90' },
  { name: 'Playing Time_Mn/MP', label: 'Minutes per Match', placeholder: '72', hint: 'Average minutes per match' },
  { name: 'Playing Time_Min%', label: 'Minutes %', placeholder: '80', hint: 'Percentage of available minutes' },
  { name: 'Playing Time_90s_match', label: '90s per Match', placeholder: '0.8', hint: 'Full matches per appearance' },
  { name: 'Starts_Starts', label: 'Total Starts', placeholder: '12', hint: 'Number of starting appearances' },
  { name: 'Starts_Mn/Start', label: 'Minutes per Start', placeholder: '75', hint: 'Average minutes when starting' },
  { name: 'Starts_Compl', label: 'Complete Matches', placeholder: '8', hint: 'Full 90-minute matches' },
  { name: 'Subs_Subs', label: 'Substitutions', placeholder: '3', hint: 'Times substituted on' },
  { name: 'Subs_Mn/Sub', label: 'Minutes per Sub', placeholder: '30', hint: 'Average minutes as substitute' },
  { name: 'Subs_unSub', label: 'Unused Sub', placeholder: '1', hint: 'Times on bench unused' },
  { name: 'Team Success_PPM', label: 'Points per Match', placeholder: '1.8', hint: 'Team points per match when playing' },
  { name: 'Team Success_onG', label: 'Goals While On', placeholder: '18', hint: 'Team goals when player on pitch' },
  { name: 'Team Success_onGA', label: 'Goals Against While On', placeholder: '12', hint: 'Team goals conceded when playing' },
  { name: 'Team Success_+/-', label: 'Plus/Minus', placeholder: '6', hint: 'Goal difference when playing' },
  { name: 'Team Success_+/-90', label: 'Plus/Minus per 90', placeholder: '0.5', hint: 'Goal difference per 90 minutes' },
  { name: 'Team Success_On-Off', label: 'On-Off', placeholder: '0.3', hint: 'Team performance difference' },
];

function Predict() {
  const [formData, setFormData] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [predictionType, setPredictionType] = useState('potential'); // 'potential' or 'current'

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      // Convert form data to numbers
      const features = {};
      FEATURE_FIELDS.forEach(field => {
        features[field.name] = parseFloat(formData[field.name]) || 0;
      });

      const endpoint = predictionType === 'potential' 
        ? `${API_URL}/predict_potential` 
        : `${API_URL}/predict_current`;

      const response = await axios.post(endpoint, features);
      setResult(response.data);
    } catch (error) {
      console.error('Error predicting:', error);
      alert('Error: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fillExample = () => {
    setFormData({
      'Playing Time_MP_std': '15',
      'Playing Time_Starts': '12',
      'Playing Time_Min_std': '1080',
      'Playing Time_90s_std': '12',
      'Performance_Gls': '5',
      'Performance_G-PK': '4',
      'Performance_PK': '1',
      'Performance_PKatt': '1',
      'Per 90 Minutes_Gls': '0.42',
      'Per 90 Minutes_G-PK': '0.33',
      'Playing Time_Mn/MP': '72',
      'Playing Time_Min%': '80',
      'Playing Time_90s_match': '0.8',
      'Starts_Starts': '12',
      'Starts_Mn/Start': '75',
      'Starts_Compl': '8',
      'Subs_Subs': '3',
      'Subs_Mn/Sub': '30',
      'Subs_unSub': '1',
      'Team Success_PPM': '1.8',
      'Team Success_onG': '18',
      'Team Success_onGA': '12',
      'Team Success_+/-': '6',
      'Team Success_+/-90': '0.5',
      'Team Success_On-Off': '0.3',
    });
  };

  const clearForm = () => {
    setFormData({});
    setResult(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-3">
          <Sparkles className="w-8 h-8" />
          <h1 className="text-4xl font-bold">Predict Player Rating</h1>
        </div>
        <p className="text-purple-100 text-lg">
          Enter detailed player statistics to get AI-powered predictions
        </p>
      </div>

      {/* Info Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-medium mb-1">All 25 features are required for accurate predictions</p>
          <p>Click "Fill Example" to see sample values, then modify as needed for your player.</p>
        </div>
      </div>

      {/* Prediction Type Toggle */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Prediction Type
        </label>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setPredictionType('potential')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              predictionType === 'potential'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <TrendingUp className="w-5 h-5 inline mr-2" />
            Potential Score
          </button>
          <button
            type="button"
            onClick={() => setPredictionType('current')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              predictionType === 'current'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Award className="w-5 h-5 inline mr-2" />
            Current Rating
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Player Statistics</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={fillExample}
              className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium transition-colors"
            >
              Fill Example
            </button>
            <button
              type="button"
              onClick={clearForm}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Playing Time Section */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b">
              ⏱️ Playing Time
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {FEATURE_FIELDS.slice(0, 4).map((field) => (
                <FormField key={field.name} field={field} value={formData[field.name] || ''} onChange={handleChange} />
              ))}
            </div>
          </div>

          {/* Performance Section */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b">
              ⚽ Performance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {FEATURE_FIELDS.slice(4, 10).map((field) => (
                <FormField key={field.name} field={field} value={formData[field.name] || ''} onChange={handleChange} />
              ))}
            </div>
          </div>

          {/* Minutes Details */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b">
              📊 Minutes Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {FEATURE_FIELDS.slice(10, 13).map((field) => (
                <FormField key={field.name} field={field} value={formData[field.name] || ''} onChange={handleChange} />
              ))}
            </div>
          </div>

          {/* Starts & Substitutions */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b">
              🔄 Starts & Substitutions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {FEATURE_FIELDS.slice(13, 19).map((field) => (
                <FormField key={field.name} field={field} value={formData[field.name] || ''} onChange={handleChange} />
              ))}
            </div>
          </div>

          {/* Team Success */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b">
              🏆 Team Success Metrics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {FEATURE_FIELDS.slice(19).map((field) => (
                <FormField key={field.name} field={field} value={formData[field.name] || ''} onChange={handleChange} />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-lg font-bold text-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Predicting...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Predict {predictionType === 'potential' ? 'Potential' : 'Current Rating'}
              </>
            )}
          </button>
        </form>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-purple-600">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-8 h-8 text-purple-600" />
            <h2 className="text-2xl font-bold text-gray-900">Prediction Result</h2>
          </div>

          <div className="space-y-6">
            {/* Score */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 font-medium">
                  {predictionType === 'potential' ? 'Potential Score' : 'Current Rating'}
                </span>
                <span className="text-4xl font-bold text-purple-600">
                  {predictionType === 'potential' ? result.potential_score : result.current_rating}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-purple-600 to-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      predictionType === 'potential' ? result.potential_score : result.current_rating,
                      100
                    )}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Interpretation */}
            <div className="bg-purple-50 rounded-lg p-6">
              <p className="text-lg text-gray-900 font-medium">{result.interpretation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({ field, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{field.label}</label>
      <input
        type="number"
        step="0.01"
        name={field.name}
        value={value}
        onChange={onChange}
        placeholder={field.placeholder}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
      />
      {field.hint && <p className="text-xs text-gray-500 mt-1">{field.hint}</p>}
    </div>
  );
}

function Award({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0"
      />
    </svg>
  );
}

export default Predict;