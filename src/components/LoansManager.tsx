import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  ArrowRight,
  BookOpen,
  User,
  RotateCcw,
  Search,
  Filter
} from 'lucide-react';
import { Prestamo, Libro, Usuario, PrestamoWithDetails } from '../types';
import { BibliotecaStorage } from '../services/storage';

interface LoansManagerProps {
  prestamos: Prestamo[];
  libros: Libro[];
  usuarios: Usuario[];
  onRefresh: () => void;
  selectedBookForLoan?: Libro | null;
  onClearSelectedBookForLoan?: () => void;
}

export const LoansManager: React.FC<LoansManagerProps> = ({
  prestamos,
  libros,
  usuarios,
  onRefresh,
  selectedBookForLoan,
  onClearSelectedBookForLoan,
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'overdue' | 'returned'>('active');
  const [searchTerm, setSearchTerm] = useState('');

  // Loan Creation Modal
  const [isModalOpen, setIsModalOpen] = useState(Boolean(selectedBookForLoan));
  const [loanBookId, setLoanBookId] = useState<number>(selectedBookForLoan?.id || 0);
  const [loanUserId, setLoanUserId] = useState<number>(usuarios[0]?.id || 0);
  const [loanDays, setLoanDays] = useState<number>(7);
  const [modalError, setModalError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Sync selectedBookForLoan if passed from parent
  React.useEffect(() => {
    if (selectedBookForLoan) {
      setLoanBookId(selectedBookForLoan.id);
      setIsModalOpen(true);
    }
  }, [selectedBookForLoan]);

  const todayStr = new Date().toISOString().split('T')[0];

  // Enrich loans with book and user details
  const enrichedLoans: PrestamoWithDetails[] = prestamos.map((p) => {
    const libro = libros.find((b) => b.id === p.libro_id) ||
      BibliotecaStorage.getAllLibrosIncludingInactive().find((b) => b.id === p.libro_id);
    const usuario = usuarios.find((u) => u.id === p.usuario_id);

    const isOverdue = p.activo && p.fecha_limite < todayStr;
    const diffTime = Math.abs(new Date(p.fecha_limite).getTime() - new Date(todayStr).getTime());
    const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      ...p,
      libro,
      usuario,
      isOverdue,
      daysRemainingOrOverdue: daysDiff,
    };
  });

  const filteredLoans = enrichedLoans.filter((p) => {
    const bookTitle = p.libro?.titulo || '';
    const userName = p.usuario?.nombre || '';
    const userEmail = p.usuario?.email || '';

    const matchesSearch =
      bookTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toString().includes(searchTerm);

    if (!matchesSearch) return false;

    if (filter === 'active') return p.activo;
    if (filter === 'overdue') return p.isOverdue;
    if (filter === 'returned') return !p.activo;
    return true;
  });

  const handleReturnBook = (prestamoId: number) => {
    setActionSuccess(null);
    const res = BibliotecaStorage.devolverLibro(prestamoId);
    if (res.ok) {
      setActionSuccess('Libro devuelto con éxito. El inventario fue actualizado.');
      onRefresh();
    } else {
      alert(res.error || 'Error al devolver el libro');
    }
  };

  const handleCreateLoanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setActionSuccess(null);

    if (!loanBookId) {
      setModalError('Por favor selecciona un libro.');
      return;
    }
    if (!loanUserId) {
      setModalError('Por favor selecciona un usuario.');
      return;
    }

    const res = BibliotecaStorage.createPrestamo({
      libro_id: loanBookId,
      usuario_id: loanUserId,
      dias_prestamo: loanDays,
    });

    if (res.ok) {
      setIsModalOpen(false);
      setActionSuccess('Préstamo registrado exitosamente.');
      onClearSelectedBookForLoan?.();
      onRefresh();
    } else {
      setModalError(res.error || 'Error al generar el préstamo.');
    }
  };

  // Only books with available copies for new loan dropdown
  const availableBooksForLoan = libros.filter((b) => b.copias_disponibles > 0);

  return (
    <div id="loans-manager-section" className="space-y-6">
      {/* Top Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="loans-search-input"
              type="text"
              placeholder="Buscar por libro, lector o correo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <button
            id="open-new-loan-modal-btn"
            type="button"
            onClick={() => {
              setModalError(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar préstamo</span>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              id="filter-active-loans-btn"
              type="button"
              onClick={() => setFilter('active')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                filter === 'active'
                  ? 'bg-blue-100 text-blue-800'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Activos ({enrichedLoans.filter((l) => l.activo).length})
            </button>
            <button
              id="filter-overdue-loans-btn"
              type="button"
              onClick={() => setFilter('overdue')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                filter === 'overdue'
                  ? 'bg-red-100 text-red-800'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Vencidos ({enrichedLoans.filter((l) => l.isOverdue).length})
            </button>
            <button
              id="filter-returned-loans-btn"
              type="button"
              onClick={() => setFilter('returned')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                filter === 'returned'
                  ? 'bg-slate-200 text-slate-800'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Devueltos ({enrichedLoans.filter((l) => !l.activo).length})
            </button>
            <button
              id="filter-all-loans-btn"
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Todos ({enrichedLoans.length})
            </button>
          </div>

          <span className="text-slate-500 font-medium">
            {filteredLoans.length} registros
          </span>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Loans Table / Cards */}
      {filteredLoans.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-semibold text-slate-800">
            No se encontraron préstamos
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {filter === 'active'
              ? 'No hay libros actualmente prestados. ¡Todos los libros están en estantería!'
              : 'No hay registros en esta categoría.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filteredLoans.map((p) => {
              return (
                <div
                  key={p.id}
                  id={`loan-row-${p.id}`}
                  className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    {/* Book Thumbnail */}
                    <div className="w-12 h-16 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center">
                      {p.libro?.portada_url ? (
                        <img
                          src={p.libro.portada_url}
                          alt={p.libro.titulo}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <BookOpen className="w-5 h-5 text-slate-400" />
                      )}
                    </div>

                    {/* Book & User Info */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 font-serif-book">
                          {p.libro?.titulo || `Libro #${p.libro_id}`}
                        </h4>
                        <span className="text-[11px] font-mono text-slate-400">
                          Préstamo #{p.id}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 flex items-center gap-2">
                        <span className="flex items-center gap-1 font-medium text-slate-800">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {p.usuario?.nombre || `Usuario #${p.usuario_id}`}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500">{p.usuario?.email}</span>
                      </div>

                      <div className="pt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Prestado: {p.fecha_prestamo}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Límite: {p.fecha_limite}
                        </span>
                        {p.fecha_devolucion && (
                          <span className="text-emerald-700 font-medium">
                            Devuelto: {p.fecha_devolucion}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    {/* Status Pill */}
                    {p.activo ? (
                      p.isOverdue ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                          Vencido ({p.daysRemainingOrOverdue} días)
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          Activo ({p.daysRemainingOrOverdue} días rest.)
                        </span>
                      )
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Devuelto
                      </span>
                    )}

                    {/* Return Action Button (REGLA 2) */}
                    {p.activo && (
                      <button
                        id={`return-loan-btn-${p.id}`}
                        type="button"
                        onClick={() => handleReturnBook(p.id)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Devolver libro</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New Loan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 font-serif-book">
                Registrar nuevo préstamo
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  onClearSelectedBookForLoan?.();
                }}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateLoanSubmit} className="space-y-4">
              {/* Select Book */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Libro a prestar *
                </label>
                <select
                  id="select-loan-book"
                  value={loanBookId}
                  onChange={(e) => setLoanBookId(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value={0}>Selecciona un libro disponible...</option>
                  {availableBooksForLoan.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.titulo} — {b.copias_disponibles} copias disponibles
                    </option>
                  ))}
                </select>
                {availableBooksForLoan.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    No hay libros con copias disponibles en este momento.
                  </p>
                )}
              </div>

              {/* Select User */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Usuario solicitante *
                </label>
                <select
                  id="select-loan-user"
                  value={loanUserId}
                  onChange={(e) => setLoanUserId(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Duration in Days */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Duración del préstamo (días)
                </label>
                <div className="flex items-center gap-2">
                  {[7, 14, 21, 30].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setLoanDays(d)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        loanDays === d
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {d} días
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900">
                La fecha de devolución límite será calculada automáticamente para{' '}
                <strong>{loanDays} días</strong> a partir de hoy.
              </div>

              <div className="pt-2 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    onClearSelectedBookForLoan?.();
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="confirm-create-loan-btn"
                  type="submit"
                  disabled={availableBooksForLoan.length === 0}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  Confirmar préstamo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
