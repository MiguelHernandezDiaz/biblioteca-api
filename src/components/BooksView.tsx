import React, { useState } from 'react';
import { Libro, AuthUser } from '../types';
import {
  Search,
  Plus,
  Camera,
  Trash2,
  BookCheck,
  AlertTriangle,
  X,
  Book,
  LogIn,
} from 'lucide-react';

interface BooksViewProps {
  libros: Libro[];
  currentUser: AuthUser | null;
  onDeleteBook: (id: number) => Promise<void>;
  onCreateBook: (book: {
    titulo: string;
    autor: string;
    isbn: string;
    copias_totales: number;
    portada_url?: string;
  }) => Promise<void>;
  onStartLoan: (libro: Libro) => void;
  onGoToScanner: () => void;
  onOpenLogin: () => void;
}

export const BooksView: React.FC<BooksViewProps> = ({
  libros,
  currentUser,
  onDeleteBook,
  onCreateBook,
  onStartLoan,
  onGoToScanner,
  onOpenLogin,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [titulo, setTitulo] = useState('');
  const [autor, setAutor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [copias, setCopias] = useState(1);
  const [portadaUrl, setPortadaUrl] = useState('');

  const isAdmin = currentUser?.rol === 'admin';

  const filteredLibros = libros.filter((l) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      l.titulo.toLowerCase().includes(term) ||
      l.autor.toLowerCase().includes(term) ||
      l.isbn.toLowerCase().includes(term);

    const matchesAvailability = onlyAvailable ? l.copias_disponibles > 0 : true;

    return matchesSearch && matchesAvailability;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !autor.trim() || !isbn.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreateBook({
        titulo,
        autor,
        isbn,
        copias_totales: Number(copias) || 1,
        portada_url: portadaUrl.trim() || undefined,
      });
      // reset form
      setTitulo('');
      setAutor('');
      setIsbn('');
      setCopias(1);
      setPortadaUrl('');
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action bar & search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Catálogo de Libros
          </h2>
          <p className="text-xs text-slate-400">
            Explora los títulos disponibles, consulta inventario en tiempo real o solicita préstamos.
          </p>
        </div>

        {/* Admin-only controls */}
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={onGoToScanner}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Escanear con Cámara</span>
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Libro</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter and search bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título, autor o ISBN..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-300">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
              className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span>Solo con copias disponibles</span>
          </label>

          <span className="text-xs text-slate-500">
            {filteredLibros.length} {filteredLibros.length === 1 ? 'libro' : 'libros'}
          </span>
        </div>
      </div>

      {/* Books Grid */}
      {filteredLibros.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800 p-8 space-y-3">
          <Book className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-sm font-medium text-slate-400">
            No se encontraron libros en el catálogo con los filtros actuales.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredLibros.map((libro) => {
            const hasCopies = libro.copias_disponibles > 0;
            const percentage =
              libro.copias_totales > 0
                ? Math.round((libro.copias_disponibles / libro.copias_totales) * 100)
                : 0;

            return (
              <div
                key={libro.id}
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col hover:border-slate-700 transition-all shadow-sm"
              >
                {/* Book Card Top: Cover & Basic details */}
                <div className="p-4 flex gap-3.5 items-start">
                  <div className="w-16 h-24 flex-shrink-0 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center">
                    {libro.portada_url ? (
                      <img
                        src={libro.portada_url}
                        alt={libro.titulo}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=150&auto=format&fit=crop&q=60';
                        }}
                      />
                    ) : (
                      <Book className="w-6 h-6 text-slate-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 mb-1">
                      ISBN {libro.isbn}
                    </span>
                    <h3
                      className="text-sm font-semibold text-white truncate"
                      title={libro.titulo}
                    >
                      {libro.titulo}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{libro.autor}</p>
                  </div>
                </div>

                {/* Stock availability indicator */}
                <div className="px-4 py-2 bg-slate-950/60 border-t border-b border-slate-800/80 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-400 text-[11px]">Disponibilidad:</span>
                    <span
                      className={`text-[11px] font-semibold ${
                        hasCopies ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {libro.copias_disponibles} de {libro.copias_totales} disponibles
                    </span>
                  </div>

                  {/* Stock bar */}
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        hasCopies ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-3 mt-auto flex items-center justify-between gap-2">
                  {!currentUser ? (
                    <button
                      onClick={onOpenLogin}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 transition-colors"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Iniciar Sesión para Pedir</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onStartLoan(libro)}
                      disabled={!hasCopies}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors ${
                        hasCopies
                          ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                          : 'bg-slate-800/50 text-slate-500 cursor-not-allowed border border-slate-800'
                      }`}
                    >
                      <BookCheck className="w-3.5 h-3.5" />
                      <span>{hasCopies ? 'Pedir Prestado' : 'Agotado (Sin copias)'}</span>
                    </button>
                  )}

                  {/* Delete button: EXCLUSIVE TO ADMIN */}
                  {isAdmin && (
                    <button
                      onClick={() => setDeleteConfirmId(libro.id)}
                      title="Eliminar del catálogo (Exclusivo Administrador)"
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors border border-transparent hover:border-rose-900/40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-full bg-rose-950/50 border border-rose-800/50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">¿Dar de baja libro?</h4>
                <p className="text-xs text-slate-400">
                  Acción exclusiva de Administrador.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              Nota de regla de negocio: Si el libro tiene algún préstamo activo sin devolver, el sistema impedirá su eliminación automáticamente.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const id = deleteConfirmId;
                  setDeleteConfirmId(null);
                  await onDeleteBook(id);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors"
              >
                Confirmar baja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Book Modal (Admin Only) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Book className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Registrar Nuevo Libro</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Título del Libro
                </label>
                <input
                  type="text"
                  required
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej: Rayuela"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Autor</label>
                <input
                  type="text"
                  required
                  value={autor}
                  onChange={(e) => setAutor(e.target.value)}
                  placeholder="Ej: Julio Cortázar"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Código ISBN
                  </label>
                  <input
                    type="text"
                    required
                    value={isbn}
                    onChange={(e) => setIsbn(e.target.value)}
                    placeholder="9780142437230"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Copias Totales
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={copias}
                    onChange={(e) => setCopias(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  URL de Portada (Opcional)
                </label>
                <input
                  type="url"
                  value={portadaUrl}
                  onChange={(e) => setPortadaUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Libro en Catálogo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
