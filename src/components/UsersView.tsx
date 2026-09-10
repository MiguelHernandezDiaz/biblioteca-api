import React, { useState } from 'react';
import { Usuario, Prestamo } from '../types';
import { Users, Plus, Mail, BookOpen, X, Search } from 'lucide-react';

interface UsersViewProps {
  usuarios: Usuario[];
  prestamos: Prestamo[];
  onCreateUser: (user: { nombre: string; email: string }) => Promise<void>;
  onNewLoanForUser: (usuario: Usuario) => void;
}

export const UsersView: React.FC<UsersViewProps> = ({
  usuarios,
  prestamos,
  onCreateUser,
  onNewLoanForUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredUsuarios = usuarios.filter((u) => {
    const term = searchTerm.toLowerCase().trim();
    return (
      u.nombre.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term)
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !email.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreateUser({ nombre, email });
      setNombre('');
      setEmail('');
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Comunidad de Usuarios
          </h2>
          <p className="text-xs text-slate-400">
            Gestiona los lectores registrados y consulta sus préstamos vigentes.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors shadow-sm shadow-blue-700/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Usuario</span>
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o correo..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <span className="text-xs text-slate-500 hidden sm:inline">
          {filteredUsuarios.length} usuarios registrados
        </span>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsuarios.map((usuario) => {
          const userActiveLoans = prestamos.filter(
            (p) => p.usuario_id === usuario.id && p.activo
          );

          // Get initials for avatar
          const initials = usuario.nombre
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();

          return (
            <div
              key={usuario.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600/30 to-indigo-600/30 border border-blue-500/30 flex items-center justify-center text-sm font-bold text-blue-300">
                      {initials || 'U'}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white leading-tight">
                        {usuario.nombre}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-500" />
                        <span className="truncate max-w-[190px]" title={usuario.email}>
                          {usuario.email}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      userActiveLoans.length > 0
                        ? 'bg-amber-950/40 text-amber-300 border-amber-800/50'
                        : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'
                    }`}
                  >
                    {userActiveLoans.length > 0
                      ? `${userActiveLoans.length} activo${userActiveLoans.length > 1 ? 's' : ''}`
                      : 'Al día'}
                  </span>
                </div>

                {/* Active books borrowed list */}
                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-3 h-3" />
                    <span>Libros en préstamo</span>
                  </div>

                  {userActiveLoans.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">
                      Ningún libro prestado actualmente.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {userActiveLoans.map((p) => (
                        <div
                          key={p.id}
                          className="bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs flex items-center justify-between"
                        >
                          <span
                            className="font-medium text-slate-200 truncate pr-2 max-w-[170px]"
                            title={p.libro?.titulo || `Libro #${p.libro_id}`}
                          >
                            {p.libro?.titulo || `Libro #${p.libro_id}`}
                          </span>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            Hasta {p.fecha_limite}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-3 border-t border-slate-800/80">
                <button
                  onClick={() => onNewLoanForUser(usuario)}
                  className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-400" />
                  <span>Nuevo préstamo para este usuario</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* New User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Registrar Nuevo Usuario</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. María Rodríguez"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Correo electrónico *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="maria.rodriguez@email.com"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                />
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
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
