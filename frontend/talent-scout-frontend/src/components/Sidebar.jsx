// src/components/Sidebar.jsx
import { NavLink } from 'react-router-dom';
import {
    Home, Trophy, Users, BarChart3, Shield, Heart,
    Settings, ChevronRight, LogOut, Radar, Activity
} from 'lucide-react';

function Sidebar() {
    const navItems = [
        { path: '/', icon: Home, label: 'Dashboard' },
        { path: '/players', icon: Users, label: 'Prospects' },
        { path: '/teams', icon: Shield, label: 'Clubs' },
        { path: '/compare', icon: Radar, label: 'Comparison' },
        { path: '/analytics', icon: BarChart3, label: 'Analytics' },
        { path: '/rankings', icon: Trophy, label: 'Leaderboard' },
        { path: '/watchlist', icon: Heart, label: 'Shortlist' },
    ];

    return (
        <aside className="w-64 min-h-screen bg-slate-950 border-r border-slate-800 flex flex-col fixed left-0 top-0 z-50">
            {/* Brand Logo */}
            <div className="p-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/20">
                        <span className="text-white text-xl font-black">S</span>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white tracking-tight">SCOUT<span className="text-accent">PRO</span></h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">U19 Analytics</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-1">
                <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-4 px-2">Main Menu</div>
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            isActive ? 'sidebar-link-active' : 'sidebar-link'
                        }
                    >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        <ChevronRight className={`w-4 h-4 transition-transform duration-200 opacity-0 group-hover:opacity-100`} />
                    </NavLink>
                ))}
            </nav>

            {/* Analytics Badge */}
            <div className="p-4 mx-4 mb-6 bg-slate-900 border border-slate-800 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                    <Activity className="w-4 h-4 text-accent" />
                    <span className="text-xs font-bold text-white">Live Engine</span>
                </div>
                <p className="text-[10px] text-slate-500 mb-3">XGBoost model version 2.4.1 active and predicting potential.</p>
                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div className="w-4/5 h-full bg-accent animate-pulse" />
                </div>
            </div>

            {/* Footer Profile */}
            <div className="p-4 border-t border-slate-800 flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center overflow-hidden">
                    <span className="text-sm font-bold text-white">AD</span>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">Admin Account</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-tight">System Analyst</p>
                </div>
                <button className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-red-400 transition-colors">
                    <LogOut className="w-4 h-4" />
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;
