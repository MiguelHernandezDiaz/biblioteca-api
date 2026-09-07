import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Camera,
  Layers,
  Calendar,
  Users,
  Code2,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { IsbnScanner } from './components/IsbnScanner';
import { BookCatalog } from './components/BookCatalog';
import { LoansManager } from './components/LoansManager';
import { UsersManager } from './components/UsersManager';
import { ApiExplorer } from './components/ApiExplorer';
import { BibliotecaStorage } from './services/storage';
import { Libro, Usuario, Prestamo } from './types';

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<'scanner' | 'catalog' | 'loans' | 'users' | 'api'>('scanner');
  const [libros, setLibros] = useState<Libro[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [selectedBookForLoan, setSelectedBookForLoan] = useState<Libro | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const refreshData = useCallback(() => {
    setLibros(BibliotecaStorage.getLibros());
    setUsuarios(BibliotecaStorage.getUsuarios());
    setPrestamos(BibliotecaStorage.getPrestamos());
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleBookAdded = (newLibro: Libro) => {
    refreshData();
    showToast(`"${newLibro.titulo}" agregado al catálogo con éxito.`);
  };

  const handleInitiateLoanFromCatalog = (libro: Libro) => {
    setSelectedBookForLoan(libro);
    setActiveView('loans');
  };

  const handleResetDemoData = () => {
    const confirmed = window.confirm(
      '¿Deseas restaurar los datos de prueba iniciales (libros, usuarios y préstamos de ejemplo)?'
    );
    if (!confirmed) return;
    BibliotecaStorage.resetToDefault();
    refreshData();
    showToast('Base de datos restaurada con los datos de prueba.');
  };

  // Stats
  const totalBooksCount = libros.length;
  const availableCopiesCount = libros.reduce((acc, b) => acc + b.copias_disponibles, 0);
  const activeLoansCount = prestamos.filter((p) => p.activo).length;
  const todayStr = new Date().toISOString().split('T')[0];
  const overdueLoansCount = prestamos.filter(
    (p) => p.activo && p.fecha_limite < todayStr
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo / Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 font-serif-book leading-tight">
                  Biblioteca API
                </h1>
                <p className="text-[11px] text-slate-500 font-medium">
                  Escáner ISBN & Gestión de Biblioteca
                </p>
              </div>
            </div>

            {/* Quick Metrics (Desktop) */}
            <div className="hidden md:flex items-center gap-4 text-xs font-medium">
              <div className="px-3 py-1.5 bg-slate-100 rounded-lg text-slate-700">
                <span className="text-slate-400 mr-1">Títulos:</span>
                <strong>{totalBooksCount}</strong>
              </div>
              <div className="px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200/60">
                <span className="text-emerald-600 mr-1">Disponibles:</span>
                <strong>{availableCopiesCount}</strong>
              </div>
              <div className="px-3 py-1.5 bg-blue-50 text-blue-800 rounded-lg border border-blue-200/60">
                <span className="text-blue-600 mr-1">En préstamo:</span>
                <strong>{activeLoansCount}</strong>
              </div>
              {overdueLoansCount > 0 && (
                <div className="px-3 py-1.5 bg-red-50 text-red-800 rounded-lg border border-red-200 animate-pulse">
                  <span className="text-red-600 mr-1">Vencidos:</span>
                  <strong>{overdueLoansCount}</strong>
                </div>
              )}
            </div>

            {/* Reset data */}
            <button
              id="reset-db-btn"
              type="button"
              onClick={handleResetDemoData}
              title="Restaurar datos iniciales"
              className="text-xs text-slate-500 hover:text-slate-800 p-2 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Restablecer datos</span>
            </button>
          </div>

          {/* Navigation Bar */}
          <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 border-t border-slate-100 text-xs sm:text-sm font-semibold">
            <button
              id="nav-scanner-btn"
              type="button"
              onClick={() => setActiveView('scanner')}
              className={`py-2 px-3.5 rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeView === 'scanner'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Escáner ISBN</span>
            </button>

            <button
              id="nav-catalog-btn"
              type="button"
              onClick={() => setActiveView('catalog')}
              className={`py-2 px-3.5 rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeView === 'catalog'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Catálogo ({totalBooksCount})</span>
            </button>

            <button
              id="nav-loans-btn"
              type="button"
              onClick={() => setActiveView('loans')}
              className={`py-2 px-3.5 rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeView === 'loans'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Préstamos ({activeLoansCount})</span>
              {overdueLoansCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>

            <button
              id="nav-users-btn"
              type="button"
              onClick={() => setActiveView('users')}
              className={`py-2 px-3.5 rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeView === 'users'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Lectores ({usuarios.length})</span>
            </button>

            <button
              id="nav-api-btn"
              type="button"
              onClick={() => setActiveView('api')}
              className={`py-2 px-3.5 rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeView === 'api'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>Consola API</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {toastMessage && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-800 shadow-xs animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {activeView === 'scanner' && (
          <div className="space-y-6">
            <div className="text-center max-w-xl mx-auto space-y-1">
              <h2 className="text-xl font-bold text-slate-900 font-serif-book">
                Escanear Código de Barras ISBN
              </h2>
              <p className="text-xs text-slate-500">
                Apunta la cámara de tu teléfono o webcam al código de barras del libro para autocompletar título, autor y portada mediante Open Library.
              </p>
            </div>

            <IsbnScanner
              onBookAdded={handleBookAdded}
              onNavigateToCatalog={() => setActiveView('catalog')}
            />
          </div>
        )}

        {activeView === 'catalog' && (
          <BookCatalog
            libros={libros}
            onRefresh={refreshData}
            onOpenScanner={() => setActiveView('scanner')}
            onInitiateLoan={handleInitiateLoanFromCatalog}
          />
        )}

        {activeView === 'loans' && (
          <LoansManager
            prestamos={prestamos}
            libros={libros}
            usuarios={usuarios}
            onRefresh={refreshData}
            selectedBookForLoan={selectedBookForLoan}
            onClearSelectedBookForLoan={() => setSelectedBookForLoan(null)}
          />
        )}

        {activeView === 'users' && (
          <UsersManager
            usuarios={usuarios}
            prestamos={prestamos}
            onRefresh={refreshData}
          />
        )}

        {activeView === 'api' && <ApiExplorer />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Biblioteca API &middot; Sistema de Gestión con Escáner ISBN en vivo
          </span>
          <span className="text-slate-400">
            Integrado con Open Library API &bull; Soporte para cámaras web y móviles
          </span>
        </div>
      </footer>
    </div>
  );
};
