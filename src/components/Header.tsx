import React from 'react';
import { BookOpen, Users, ClipboardList, Camera, Database, LogIn, LogOut, Shield } from 'lucide-react';
import { AuthUser } from '../types';

interface HeaderProps {
  activeTab: 'books' | 'my-loans' | 'loans' | 'users' | 'scanner' | 'database';
  setActiveTab: (tab: 'books' | 'my-loans' | 'loans' | 'users' | 'scanner' | 'database') => void;
  stats: {
    totalBooks: number;
    availableCopies: number;
    totalUsers: number;
    activeLoans: number;
    myActiveLoans: number;
  };
  currentUser: AuthUser | null;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  stats,
  currentUser,
  onOpenLogin,
  onOpenRegister,
  onLogout,
}) => {
  const isAdmin = currentUser?.rol === 'admin';

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          {/* Logo & Brand */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-sm">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-white tracking-tight leading-none">
                    Biblioteca
                  </h1>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                    PostgreSQL 16
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Portal de Lectores &amp; Préstamos
                </p>
              </div>
            </div>

            {/* Mobile Auth Button */}
            <div className="flex md:hidden items-center gap-1.5">
              {currentUser ? (
                <button
                  onClick={onLogout}
                  className="text-xs px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg"
                >
                  Salir
                </button>
              ) : (
                <button
                  onClick={onOpenLogin}
                  className="text-xs px-2.5 py-1 bg-blue-600 text-white rounded-lg font-semibold"
                >
                  Entrar
                </button>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {/* Catálogo de Libros (Always visible) */}
            <button
              onClick={() => setActiveTab('books')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'books'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Catálogo</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === 'books' ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {stats.availableCopies}/{stats.totalBooks}
              </span>
            </button>

            {/* Mis Préstamos (For reader) */}
            <button
              onClick={() => setActiveTab('my-loans')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'my-loans'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Mis Préstamos</span>
              {stats.myActiveLoans > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {stats.myActiveLoans}
                </span>
              )}
            </button>

            {/* Admin-only Tabs */}
            {isAdmin && (
              <>
                <button
                  onClick={() => setActiveTab('loans')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    activeTab === 'loans'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Todos los Préstamos</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
                    {stats.activeLoans}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('users')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    activeTab === 'users'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Usuarios</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
                    {stats.totalUsers}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('scanner')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    activeTab === 'scanner'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 border border-emerald-800/40'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Escanear ISBN</span>
                </button>

                <button
                  onClick={() => setActiveTab('database')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    activeTab === 'database'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-amber-400 hover:text-amber-300 hover:bg-amber-950/30 border border-amber-800/40'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>PostgreSQL &amp; Deps</span>
                </button>

                <a
                  href="/admin/"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg text-xs font-medium border border-slate-800 ml-1"
                >
                  <span>Django Admin ↗</span>
                </a>
              </>
            )}
          </nav>

          {/* Desktop User Status Area */}
          <div className="hidden md:flex items-center gap-2">
            {currentUser ? (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
                <div className="text-right">
                  <span className="text-xs font-bold text-white block leading-none truncate max-w-[140px]">
                    {currentUser.nombre}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded border inline-block mt-0.5 ${
                      isAdmin
                        ? 'bg-amber-950 text-amber-300 border-amber-800'
                        : 'bg-blue-950 text-blue-300 border-blue-800'
                    }`}
                  >
                    {isAdmin ? '🛡️ Admin' : '👤 Lector'}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  title="Cerrar Sesión"
                  className="p-1 text-slate-400 hover:text-rose-400 rounded-lg text-xs transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenLogin}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Iniciar Sesión</span>
                </button>
                <button
                  onClick={onOpenRegister}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
                >
                  Crear Cuenta
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
