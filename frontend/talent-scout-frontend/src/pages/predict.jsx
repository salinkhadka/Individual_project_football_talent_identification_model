// src/pages/predict.jsx
import { useState } from 'react';
import { Sparkles, TrendingUp, AlertCircle, Zap, Shield, Target, RefreshCw, Award, ArrowRight, MousePointer2, LayoutGrid } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:5000';

const FEATURE_FIELDS = [
  { name: 'Playing Time_MP_std', label: 'Matches Played', placeholder: '15', hint: 'Total competitive apps' },
  { name: 'Playing Time_Starts', label: 'Starts', placeholder: '12', hint: 'Starting XI appearances' },
  { name: 'Playing Time_Min_std', label: 'Minutes Played', placeholder: '1080', hint: 'Total career minutes' },
  { name: 'Playing Time_90s_std', label: '90s Played', placeholder: '12', hint: 'Full game equivalents' },
  { name: 'Performance_Gls', label: 'Goals', placeholder: '5', hint: 'Total scoring output' },
  { name: 'Performance_G-PK', label: 'Non-Penalty Goals', placeholder: '4', hint: 'Open play scoring' },
  { name: 'Performance_PK', label: 'Penalty Goals', placeholder: '1', hint: 'Conversion from spot' },
  { name: 'Performance_PKatt', label: 'Penalty Attempts', placeholder: '1', hint: 'Total spot kick opportunities' },
  { name: 'Per 90 Minutes_Gls', label: 'Goals per 90', placeholder: '0.42', hint: 'Efficiency scalar' },
  { name: 'Per 90 Minutes_G-PK', label: 'Non-PK Goals per 90', placeholder: '0.33', hint: 'Adjusted efficiency' },
  { name: 'Playing Time_Mn/MP', label: 'Minutes per Match', placeholder: '72', hint: 'Average workload' },
  { name: 'Playing Time_Min%', label: 'Minutes %', placeholder: '80', hint: 'Pitch time percentage' },
  { name: 'Playing Time_90s_match', label: '90s per Match', placeholder: '0.8', hint: 'Stamina indicator' },
  { name: 'Starts_Starts', label: 'Total Starts', placeholder: '12', hint: 'Formation consistency' },
  { name: 'Starts_Mn/Start', label: 'Minutes per Start', placeholder: '75', hint: 'Reliability metric' },
  { name: 'Starts_Compl', label: 'Complete Matches', placeholder: '8', hint: 'Execution durability' },
  { name: 'Subs_Subs', label: 'Substitutions', placeholder: '3', hint: 'Tactical entry count' },
  { name: 'Subs_Mn/Sub', label: 'Minutes per Sub', placeholder: '30', hint: 'Impact window' },
  { name: 'Subs_unSub', label: 'Unused Sub', placeholder: '1', hint: 'Bench presence' },
  { name: 'Team Success_PPM', label: 'Points per Match', placeholder: '1.8', hint: 'Influence on victory' },
  { name: 'Team Success_onG', label: 'Goals While On', placeholder: '18', hint: 'Team attacking impact' },
  { name: 'Team Success_onGA', label: 'Goals Against While On', placeholder: '12', hint: 'Team defensive impact' },
  { name: 'Team Success_+/-', label: 'Plus/Minus', placeholder: '6', hint: 'Net goal contribution' },
  { name: 'Team Success_+/-90', label: 'Plus/Minus per 90', placeholder: '0.5', hint: 'Relative net impact' },
  { name: 'Team Success_On-Off', label: 'On-Off', placeholder: '0.3', hint: 'Positional leverage' },
];

function Predict() {
  const [formData, setFormData] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [predictionType, setPredictionType] = useState('potential');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const features = {};
      FEATURE_FIELDS.forEach(field => {
        features[field.name] = parseFloat(formData[field.name]) || 0;
      });
      const endpoint = predictionType === 'potential' ? `${API_URL}/predict_potential` : `${API_URL}/predict_current`;
      const response = await axios.post(endpoint, features);
      setResult(response.data);
    } catch (error) {
      alert('Prediction engine rejected inputs. Verify all metrics.');
    } finally {
      setLoading(false);
    }
  };

  const fillExample = () => {
    const example = {};
    FEATURE_FIELDS.forEach(f => { example[f.name] = f.placeholder; });
    setFormData(example);
  };

  return (
    <div className="space-y-6">
      {/* Simulation Header */}
      <div className="bg-slate-950 rounded-[2rem] p-8 lg:p-12 text-white relative overflow-hidden shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-accent/10 to-transparent pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-accent/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent/20 border border-accent/30">
                <Sparkles className="w-5 h-5 text-accent" />
              </div>
              <h1 className="text-3xl lg:text-4xl font-black italic uppercase tracking-tight">Vanguard Simulation</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium max-w-md uppercase tracking-[0.15em] text-[10px]">AI-driven predictive engine for hypothetical performance and potential mapping.</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md flex items-center gap-6">
            <div className="flex flex-col items-center">
              <div className="text-4xl font-black text-white italic">25</div>
              <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-1">Core Inputs</div>
            </div>
            <div className="h-10 w-[1px] bg-slate-800" />
            <div className="text-right">
              <div className="flex items-center gap-2 mb-1 justify-end">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-[10px] font-black text-success uppercase">Engine Online</span>
              </div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter italic italic">Neural Matrix v.4</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Control Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-6">Target Metric</h2>
            <div className="space-y-3">
              <button onClick={() => setPredictionType('potential')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all border ${predictionType === 'potential' ? 'bg-slate-950 border-slate-800 text-white shadow-lg translate-x-1' : 'bg-slate-50 border-transparent text-slate-500 hover:bg-white hover:border-slate-200'}`}>
                <TrendingUp className={`w-5 h-5 ${predictionType === 'potential' ? 'text-accent' : 'text-slate-400'}`} />
                <span className="text-[11px] font-black uppercase tracking-widest">Future Potential</span>
              </button>
              <button onClick={() => setPredictionType('current')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all border ${predictionType === 'current' ? 'bg-slate-950 border-slate-800 text-white shadow-lg translate-x-1' : 'bg-slate-50 border-transparent text-slate-500 hover:bg-white hover:border-slate-200'}`}>
                <Award className={`w-5 h-5 ${predictionType === 'current' ? 'text-accent' : 'text-slate-400'}`} />
                <span className="text-[11px] font-black uppercase tracking-widest">Current Rating</span>
              </button>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100 space-y-4">
              <button onClick={fillExample} className="w-full flex items-center justify-between px-6 py-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all group">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Inject Example</span>
                <LayoutGrid className="w-4 h-4 text-slate-300 group-hover:text-slate-900 transition-colors" />
              </button>
              <button onClick={() => { setFormData({}); setResult(null); }} className="w-full flex items-center justify-between px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-danger">
                Clear Registry Matrix
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="p-6 bg-accent/5 border border-accent/10 rounded-2xl">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-accent" />
              <span className="text-[10px] font-black text-accent uppercase tracking-widest">System Note</span>
            </div>
            <p className="text-[11px] text-slate-500 font-bold uppercase italic leading-relaxed">Exact data synchronization is required. Missing fields default to baseline (0.0).</p>
          </div>
        </div>

        {/* Input Matrix */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-12">
              <Section title="Operational Workload" icon={Activity}>
                <div className="grid md:grid-cols-2 gap-6">
                  {FEATURE_FIELDS.slice(0, 4).map(f => (<Field key={f.name} f={f} v={formData[f.name]} o={handleChange} />))}
                </div>
              </Section>

              <Section title="Technical Output" icon={Target}>
                <div className="grid md:grid-cols-2 gap-6">
                  {FEATURE_FIELDS.slice(4, 10).map(f => (<Field key={f.name} f={f} v={formData[f.name]} o={handleChange} />))}
                </div>
              </Section>

              <Section title="Durability & Transition" icon={RefreshCw}>
                <div className="grid md:grid-cols-2 gap-6">
                  {FEATURE_FIELDS.slice(10, 19).map(f => (<Field key={f.name} f={f} v={formData[f.name]} o={handleChange} />))}
                </div>
              </Section>

              <Section title="Tactical Influence" icon={Shield}>
                <div className="grid md:grid-cols-2 gap-6">
                  {FEATURE_FIELDS.slice(19).map(f => (<Field key={f.name} f={f} v={formData[f.name]} o={handleChange} />))}
                </div>
              </Section>

              <button type="submit" disabled={loading} className="w-full py-6 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase text-[12px] tracking-[0.3em] shadow-2xl hover:bg-slate-800 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-4">
                {loading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white" /> : <Zap className="w-5 h-5 text-accent" />}
                {loading ? 'Processing Neural Grid...' : `Execute ${predictionType} Prediction`}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Cinematic Result Modal / Block */}
      {result && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-500">
          <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-12 max-w-2xl w-full shadow-[0_0_100px_rgba(59,130,246,0.3)] relative overflow-hidden text-center text-white">
            <button onClick={() => setResult(null)} className="absolute top-8 right-8 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 transition-colors"><X className="w-5 h-5" /></button>
            <div className="relative z-10 space-y-8">
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-[2rem] bg-accent/20 border border-accent/40 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-accent" />
                </div>
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">Simulation Result Confirmed</h2>
              </div>

              <div className="space-y-2">
                <div className="text-8xl lg:text-9xl font-black italic tracking-tighter text-white drop-shadow-2xl">
                  {predictionType === 'potential' ? result.potential_score : result.current_rating}
                </div>
                <div className="text-[12px] font-black text-accent uppercase tracking-widest">{predictionType === 'potential' ? 'Future Potential Quotient' : 'Current Capability Level'}</div>
              </div>

              <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] backdrop-blur-sm">
                <p className="text-lg font-black italic text-slate-200 leading-tight">"{result.interpretation}"</p>
              </div>

              <button onClick={() => setResult(null)} className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">
                Close Result Registry <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-components
function Section({ title, icon: Icon, children }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-50 text-left">
        <Icon className="w-4 h-4 text-slate-300" />
        <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({ f, v, o }) {
  return (
    <div className="space-y-2 text-left">
      <div className="flex justify-between items-center">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{f.label}</label>
        <div className="group relative">
          <MousePointer2 className="w-3 h-3 text-slate-200 hover:text-slate-400 cursor-help" />
          <div className="absolute hidden group-hover:block bottom-full right-0 mb-2 w-48 p-3 bg-slate-900 text-white text-[8px] font-black rounded-xl uppercase tracking-widest shadow-2xl z-50">{f.hint}</div>
        </div>
      </div>
      <input type="number" step="0.01" name={f.name} value={v || ''} onChange={o} placeholder={`e.g. ${f.placeholder}`} className="w-full bg-slate-50 border-none px-5 py-4 rounded-2xl text-xs font-black text-slate-900 placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all" />
    </div>
  );
}

function X({ className }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>;
}

export default Predict;