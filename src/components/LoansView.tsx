import React, { useState } from 'react';
import { Prestamo, Libro, Usuario } from '../types';
import {
  ClipboardList,
  Plus,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Book,
  User,
} from 'lucide-react';

interface LoansViewProps {
  prestamos: Prestamo[];
  libros: Libro[];
  usuarios: Usuario[];
  preSelectedBookId?: number | null;
  preSelectedUserId?: number | null;
  onReturnLoan: (prestamoId: number) => Promise<void>;
  onCreateLoan: (data: {
    libro_id: number;
    usuario_id: number;
    dias_prestamo: number;
  }) => Promise<void>;
}

export const LoansView: React.FC<LoansViewProps> = ({
  prestamos,
  libros,
  usuarios,
  preSelectedBookId,
  preSelectedUserId,
  onReturnLoan,
  onCreateLoan,
}) => {
  const [tab, setTab] = useState<'activos' | 'historial'>('activos');
  const [isModalOpen, setIsModalOpen] = useState(
    Boolean(preSelectedBookId || preSelectedUserId)
  );
  const [selectedLibroId, setSelectedLibroId] = useState<number | ''>(
    preSelectedBookId || ''
  );
  const [selectedUsuarioId, setSelectedUsuarioId] = useState<number | ''>(
    preSelectedUserId || ''
  );
  const [diasPrestamo, setDiasPrestamo] = useState<number>(7);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [returningId, setReturningId] = useState<number | null>(null);

  const activeLoans = prestamos.filter((p) => p.activo);
  const returnedLoans = prestamos.filter((p) => !p.activo);

  // Books with available copies
  const availableBooks = libros.filter((l) => l.copias_disponibles > 0);

  // Calculation of deadline & status
  const getLoanStatus = (fechaLimiteStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [year, month, day] = fechaLimiteStr.split('-').map(Number);
    const deadline = new Date(year, month - 1, day);
    deadline.setHours(0, 0, 0, 0);

    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: `Vencido (${Math.abs(diffDays)} días de atraso)`,
        type: 'danger',
        badge: 'bg-rose-950/60 text-rose-300 border-rose-800/60',
        icon: AlertCircle,
      };
    } else if (diffDays === 0) {
      return {
        label: 'Vence hoy',
        type: 'warning',
        badge: 'bg-amber-950/60 text-amber-300 border-amber-800/60',
        icon: Clock,
      };
    } else if (diffDays <= 2) {
      return {
        label: `Vence en ${diffDays} días`,
        type: 'warning',
        badge: 'bg-amber-950/60 text-amber-300 border-amber-800/60',
        icon: Clock,
      };
    } else {
      return {
        label: `Al día (${diffDays} días restantes)`,
        type: 'success',
        badge: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60',
        icon: CheckCircle2,
      };
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLibroId || !selectedUsuarioId) return;

    setIsSubmitting(true);
    try {
      await onCreateLoan({
        libro_id: Number(selectedLibroId),
        usuario_id: Number(selectedUsuarioId),
        dias_prestamo: Number(diasPrestamo) || 7,
      });
      setIsModalOpen(false);
      setSelectedLibroId('');
      setSelectedUsuarioId('');
      setDiasPrestamo(7);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturn = async (id: number) => {
    setReturningId(id);
    try {
      await onReturnLoan(id);
    } catch (err) {
      console.error(err);
    } finally {
      setReturningId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Control de Préstamos
          </h2>
          <p className="text-xs text-slate-400">
            Supervisa los libros entregados a usuarios, plazos de devolución e historial.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors shadow-sm shadow-blue-700/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Préstamo</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('activos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              tab === 'activos'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Préstamos Activos</span>
            <span className="px-1.5 py-0.2 rounded-full bg-blue-600/30 text-blue-300 text-[10px]">
              {activeLoans.length}
            </span>
          </button>

          <button
            onClick={() => setTab('historial')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              tab === 'historial'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Historial de Devueltos</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-700/50 text-slate-400 text-[10px]">
              {returnedLoans.length}
            </span>
          </button>
        </div>

        <span className="text-xs text-slate-500">
          Total de registros: {prestamos.length}
        </span>
      </div>

      {/* Table / List */}
      {tab === 'activos' ? (
        activeLoans.length === 0 ? (
          <div className="text-center py-16 px-4 bg-slate-900/40 rounded-2xl border border-slate-800/80">
            <ClipboardList className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-200">
              No hay préstamos activos
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Todos los libros prestados han sido devueltos a la biblioteca.
            </p>
            <div className="mt-4">
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Registrar nuevo préstamo
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeLoans.map((p) => {
              const status = getLoanStatus(p.fecha_limite);
              const StatusIcon = status.icon;

              return (
                <div
                  key={p.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-sm"
                >
                  <div className="space-y-3.5">
                    {/* Status Badge */}
                    <div className="flex items-center justify-between">
                      <div
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${status.badge}`}
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        <span>{status.label}</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">
                        Préstamo #{p.id}
                      </span>
                    </div>

                    {/* Book & User Info */}
                    <div className="flex gap-3 items-start">
                      <div className="w-14 h-20 flex-shrink-0 bg-slate-950 rounded border border-slate-800 overflow-hidden flex items-center justify-center">
                        {p.libro?.portada_url ? (
                          <img
                            src={p.libro.portada_url}
                            alt={p.libro.titulo}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Book className="w-6 h-6 text-slate-700" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <h4 className="text-sm font-bold text-white leading-tight truncate">
                          {p.libro?.titulo || `Libro ID: ${p.libro_id}`}
                        </h4>
                        <p className="text-xs text-slate-400 truncate">
                          {p.libro?.autor || 'Autor no disponible'}
                        </p>

                        <div className="flex items-center gap-1.5 text-xs text-slate-300 pt-1">
                          <User className="w-3 h-3 text-blue-400" />
                          <span className="font-medium truncate">
                            {p.usuario?.nombre || `Usuario ID: ${p.usuario_id}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Dates summary */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block">
                          Fecha de Préstamo:
                        </span>
                        <span className="text-slate-300 font-medium">
                          {p.fecha_prestamo}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">
                          Fecha Límite:
                        </span>
                        <span className="text-slate-200 font-bold">
                          {p.fecha_limite}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Return action button */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    <button
                      onClick={() => handleReturn(p.id)}
                      disabled={returningId === p.id}
                      className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>
                        {returningId === p.id ? 'Registrando devolución...' : 'Devolver Libro'}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : returnedLoans.length === 0 ? (
        <div className="text-center py-12 px-4 bg-slate-900/40 rounded-xl border border-slate-800">
          <p className="text-xs text-slate-500 italic">
            Aún no hay historial de libros devueltos.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Libro</th>
                <th className="py-3 px-4">Usuario</th>
                <th className="py-3 px-4">Préstamo</th>
                <th className="py-3 px-4">Fecha Límite</th>
                <th className="py-3 px-4">Devuelto el</th>
                <th className="py-3 px-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {returnedLoans.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/30">
                  <td className="py-3 px-4 font-semibold text-white">
                    {p.libro?.titulo || `Libro #${p.libro_id}`}
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {p.usuario?.nombre || `Usuario #${p.usuario_id}`}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">
                    {p.fecha_prestamo}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">
                    {p.fecha_limite}
                  </td>
                  <td className="py-3 px-4 font-mono text-emerald-400 font-semibold">
                    {p.fecha_devolucion || 'Devuelto'}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Devuelto
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Loan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Registrar Préstamo</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Select User */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Selecciona el Usuario lector *
                </label>
                <select
                  required
                  value={selectedUsuarioId}
                  onChange={(e) => setSelectedUsuarioId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Seleccionar usuario --</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Book */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Selecciona el Libro a prestar *
                </label>
                <select
                  required
                  value={selectedLibroId}
                  onChange={(e) => setSelectedLibroId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Seleccionar libro disponible --</option>
                  {availableBooks.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.titulo} — {l.copias_disponibles} copias disponibles
                    </option>
                  ))}
                </select>
                {availableBooks.length === 0 && (
                  <p className="text-xs text-rose-400 mt-1">
                    No hay ningún libro con copias disponibles en este momento.
                  </p>
                )}
              </div>

              {/* Days input */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Duración del préstamo (días) *
                </label>
                <div className="flex items-center gap-2">
                  {[7, 14, 21].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDiasPrestamo(d)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        diasPrestamo === d
                          ? 'bg-blue-600/30 text-blue-300 border-blue-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {d} días
                    </button>
                  ))}
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={diasPrestamo}
                    onChange={(e) =>
                      setDiasPrestamo(Math.max(1, parseInt(e.target.value) || 7))
                    }
                    className="w-20 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-center text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedLibroId || !selectedUsuarioId}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Registrando...' : 'Confirmar Préstamo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
