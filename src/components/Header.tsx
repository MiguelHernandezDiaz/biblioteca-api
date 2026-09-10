import React from 'react';
import { BookOpen, Users, ClipboardList, Camera, RefreshCw, BookMarked } from 'lucide-react';

interface HeaderProps {
  activeTab: 'books' | 'users' | 'loans' | 'scanner';
  setActiveTab: (tab: 'books' | 'users' | 'loans' | 'scanner') => void;
  stats: {
    totalBooks: number;
    availableCopies: number;
    totalUsers: number;
    activeLoans: number;
  };
  onResetData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  stats,
  onResetData,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-sm shadow-blue-500/10">
                <BookMarked className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight leading-none">
                  Biblioteca
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Sistema de Gestión &amp; Préstamos
                </p>
              </div>
            </div>

            {/* Quick Reset for demo */}
            <button
              onClick={onResetData}
              title="Restablecer datos de prueba"
              className="md:hidden p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              id="tab-btn-books"
              onClick={() => setActiveTab('books')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'books'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Libros Disponibles</span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === 'books'
                    ? 'bg-blue-700/80 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {stats.availableCopies}/{stats.totalBooks}
              </span>
            </button>

            <button
              id="tab-btn-users"
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'users'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Usuarios</span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === 'users'
                    ? 'bg-blue-700/80 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {stats.totalUsers}
              </span>
            </button>

            <button
              id="tab-btn-loans"
              onClick={() => setActiveTab('loans')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'loans'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Préstamos Activos</span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  stats.activeLoans > 0
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {stats.activeLoans}
              </span>
            </button>

            <button
              id="tab-btn-scanner"
              onClick={() => setActiveTab('scanner')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'scanner'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 border border-emerald-800/40'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Escanear ISBN</span>
            </button>

            <button
              onClick={onResetData}
              title="Reiniciar datos de ejemplo"
              className="hidden md:flex items-center gap-1.5 ml-2 px-2.5 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg text-xs transition-colors border border-slate-800"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restablecer</span>
            </button>
          </nav>

        </div>
      </div>
    </header>
  );
};
