import React, { useState } from 'react';
import { Libro } from '../types';
import {
  Search,
  Plus,
  Camera,
  Trash2,
  BookCheck,
  AlertTriangle,
  X,
  Book,
} from 'lucide-react';

interface BooksViewProps {
  libros: Libro[];
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
}

export const BooksView: React.FC<BooksViewProps> = ({
  libros,
  onDeleteBook,
  onCreateBook,
  onStartLoan,
  onGoToScanner,
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
            Explora los títulos disponibles, consulta inventario o registra nuevos ejemplares.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onGoToScanner}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm shadow-emerald-700/20"
          >
            <Camera className="w-4 h-4" />
            <span>Escanear ISBN</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors shadow-sm shadow-blue-700/20"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Libro</span>
          </button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título, autor o ISBN..."
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

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-300 select-none">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-950"
            />
            <span>Solo con copias disponibles</span>
          </label>

          <span className="text-xs text-slate-500">
            {filteredLibros.length} {filteredLibros.length === 1 ? 'libro' : 'libros'}
          </span>
        </div>
      </div>

      {/* Book Grid */}
      {filteredLibros.length === 0 ? (
        <div className="text-center py-16 px-4 bg-slate-900/40 rounded-2xl border border-slate-800/80">
          <Book className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-200">
            No se encontraron libros
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchTerm || onlyAvailable
              ? 'Prueba ajustando los filtros o el término de búsqueda.'
              : 'El inventario está vacío. Escanea o agrega un nuevo libro para comenzar.'}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <button
              onClick={() => {
                setSearchTerm('');
                setOnlyAvailable(false);
              }}
              className="text-xs text-blue-400 hover:underline"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredLibros.map((libro) => {
            const hasCopies = libro.copias_disponibles > 0;
            const percentage = Math.round(
              (libro.copias_disponibles / libro.copias_totales) * 100
            );

            return (
              <div
                key={libro.id}
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col hover:border-slate-700 transition-all group"
              >
                {/* Book Header & Cover */}
                <div className="p-4 flex gap-3.5 items-start">
                  <div className="w-20 h-28 flex-shrink-0 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center relative shadow-inner">
                    {libro.portada_url ? (
                      <img
                        src={libro.portada_url}
                        alt={libro.titulo}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Book className="w-8 h-8 text-slate-700" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 mb-1.5">
                      ISBN {libro.isbn}
                    </span>
                    <h3
                      className="text-sm font-semibold text-white leading-tight line-clamp-2"
                      title={libro.titulo}
                    >
                      {libro.titulo}
                    </h3>
                    <p
                      className="text-xs text-slate-400 mt-0.5 line-clamp-1"
                      title={libro.autor}
                    >
                      {libro.autor}
                    </p>
                  </div>
                </div>

                {/* Copies stock indicator */}
                <div className="px-4 py-2.5 bg-slate-950/60 border-t border-b border-slate-800/80">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-400">Disponibilidad:</span>
                    <span
                      className={`font-semibold ${
                        hasCopies ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {libro.copias_disponibles} de {libro.copias_totales} copias
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
                  <button
                    onClick={() => onStartLoan(libro)}
                    disabled={!hasCopies}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors ${
                      hasCopies
                        ? 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30'
                        : 'bg-slate-800/50 text-slate-500 cursor-not-allowed border border-slate-800'
                    }`}
                  >
                    <BookCheck className="w-3.5 h-3.5" />
                    <span>{hasCopies ? 'Prestar' : 'Sin copias'}</span>
                  </button>

                  <button
                    onClick={() => setDeleteConfirmId(libro.id)}
                    title="Eliminar del catálogo"
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors border border-transparent hover:border-rose-900/40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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
                  Se realizará un borrado lógico del inventario.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              Nota: Si el libro tiene algún préstamo activo sin devolver, el sistema impedirá su eliminación conforme a las reglas del negocio.
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

      {/* New Book Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Registrar Nuevo Libro</h3>
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
                  Título del libro *
                </label>
                <input
                  type="text"
                  required
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej. Cien Años de Soledad"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Autor *
                </label>
                <input
                  type="text"
                  required
                  value={autor}
                  onChange={(e) => setAutor(e.target.value)}
                  placeholder="Ej. Gabriel García Márquez"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Código ISBN *
                  </label>
                  <input
                    type="text"
                    required
                    value={isbn}
                    onChange={(e) => setIsbn(e.target.value)}
                    placeholder="Ej. 9780307474728"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Copias totales *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={copias}
                    onChange={(e) => setCopias(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
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
                  placeholder="https://covers.openlibrary.org/..."
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
                  {isSubmitting ? 'Guardando...' : 'Guardar Libro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
