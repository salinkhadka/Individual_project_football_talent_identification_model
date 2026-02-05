// src/components/Layout.jsx
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

function Layout() {
  return (
    <div className="flex min-h-screen bg-surface-light">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Top Header / Context Bar */}
        <header className="h-16 border-b border-slate-200 bg-white sticky top-0 z-40 flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <h2 className="text-slate-500 font-medium text-sm">Youth Football Scouting System</h2>
            <div className="h-4 w-[1px] bg-slate-200" />
            <span className="badge-pro bg-slate-100 text-slate-600"> </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Backend Connected
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <main className="p-8 flex-1">
          <div className="max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>

        {/* Footer */}
        <footer className="px-8 py-6 border-t border-slate-100 bg-white">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">
              © 2024 Talent Scout Pro • Academic Thesis Demonstration
            </p>
            <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <span className="hover:text-accent cursor-pointer">Documentation</span>
              <span className="hover:text-accent cursor-pointer">Data Ethics</span>
              <span className="hover:text-accent cursor-pointer">Contact Admin</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default Layout;
