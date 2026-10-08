import React from 'react';
import { Prestamo, AuthUser } from '../types';
import { BookOpen, CheckCircle, AlertTriangle, Clock, RotateCcw } from 'lucide-react';

interface MyLoansViewProps {
  prestamos: Prestamo[];
  currentUser: AuthUser | null;
  onReturnLoan: (prestamoId: number) => Promise<void>;
  onExploreCatalog: () => void;
  onOpenLogin: () => void;
}

export const MyLoansView: React.FC<MyLoansViewProps> = ({
  prestamos,
  currentUser,
  onReturnLoan,
  onExploreCatalog,
  onOpenLogin,
}) => {
  if (!currentUser) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-4 max-w-lg mx-auto my-12">
        <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mx-auto">
          <BookOpen className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-white">Inicia sesión para ver tus préstamos</h3>
        <p className="text-xs text-slate-400">
          Debes iniciar sesión con tu cuenta de usuario lector para ver los libros que tienes prestados, cuántos días te quedan para devolverlos y gestionar tus entregas.
        </p>
        <button
          onClick={onOpenLogin}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
        >
          Iniciar Sesión Ahora
        </button>
      </div>
    );
  }

  // Filter loans for current user
  const userLoans = prestamos.filter((p) => p.usuario_id === currentUser.id);
  const activeLoans = userLoans.filter((p) => p.activo);
  const returnedLoans = userLoans.filter((p) => !p.activo);

  if (userLoans.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-4 max-w-lg mx-auto my-12">
        <div className="w-14 h-14 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
          <CheckCircle className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-white">No tienes préstamos registrados</h3>
        <p className="text-xs text-slate-400">
          Actualmente no tienes ningún libro en préstamo activo. Visita el catálogo y solicita el título que desees leer.
        </p>
        <button
          onClick={onExploreCatalog}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
        >
          Explorar Catálogo de Libros
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Mis Préstamos Activos</h2>
        <p className="text-xs text-slate-400">
          Libros en tu posesión, días restantes para la devolución y opciones de entrega.
        </p>
      </div>

      {/* Active Loans */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
          <span>● Libros Actualmente en Préstamo ({activeLoans.length})</span>
        </h3>

        {activeLoans.length === 0 ? (
          <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-4 text-xs text-emerald-300 flex items-center gap-3">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>No tienes libros pendientes de devolución. ¡Estás completamente al día!</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeLoans.map((loan) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const limit = new Date(loan.fecha_limite + 'T00:00:00');
              const diffTime = limit.getTime() - today.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              let statusBadge = (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Te quedan {diffDays} días</span>
                </span>
              );

              if (diffDays < 0) {
                statusBadge = (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Atrasado por {Math.abs(diffDays)} días</span>
                  </span>
                );
              } else if (diffDays === 0) {
                statusBadge = (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>¡Vence hoy!</span>
                  </span>
                );
              } else if (diffDays === 1) {
                statusBadge = (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Te queda 1 día</span>
                  </span>
                );
              }

              return (
                <div
                  key={loan.id}
                  className={`bg-slate-900 border ${
                    diffDays < 0 ? 'border-rose-700/80 shadow-rose-950/20' : 'border-slate-800'
                  } rounded-xl p-4 flex flex-col justify-between space-y-3`}
                >
                  <div className="flex gap-3 items-start">
                    <div className="w-14 h-20 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {loan.libro?.portada_url ? (
                        <img
                          src={loan.libro.portada_url}
                          alt={loan.libro.titulo}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xl">📖</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="mb-1">{statusBadge}</div>
                      <h4 className="text-xs font-bold text-white truncate" title={loan.libro?.titulo}>
                        {loan.libro?.titulo || 'Libro de biblioteca'}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">{loan.libro?.autor}</p>

                      <div className="mt-2 text-[10px] text-slate-400 font-mono space-y-0.5">
                        <div>Prestado: {loan.fecha_prestamo}</div>
                        <div>
                          Vencimiento: <span className="text-slate-200 font-bold">{loan.fecha_limite}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400">¿Finalizaste la lectura?</span>
                    <button
                      onClick={() => onReturnLoan(loan.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Devolver Libro</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* History of Returned Loans */}
      {returnedLoans.length > 0 && (
        <div className="space-y-3 pt-6 border-t border-slate-800">
          <h3 className="text-sm font-bold text-slate-400">
            Historial de Devoluciones ({returnedLoans.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-75">
            {returnedLoans.map((loan) => (
              <div
                key={loan.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex gap-3 items-center"
              >
                <div className="w-10 h-14 bg-slate-950 rounded border border-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {loan.libro?.portada_url ? (
                    <img
                      src={loan.libro.portada_url}
                      alt={loan.libro.titulo}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm">📖</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-400 inline-block mb-1">
                    Devuelto el {loan.fecha_devolucion || 's/f'}
                  </span>
                  <h4 className="text-xs font-bold text-white truncate">{loan.libro?.titulo}</h4>
                  <p className="text-[10px] text-slate-400 truncate">{loan.libro?.autor}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
