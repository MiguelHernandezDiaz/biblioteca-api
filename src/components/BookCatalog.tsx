import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowUpDown,
  Filter,
  ExternalLink
} from 'lucide-react';
import { Libro, Usuario } from '../types';
import { BibliotecaStorage } from '../services/storage';

interface BookCatalogProps {
  libros: Libro[];
  onRefresh: () => void;
  onOpenScanner: () => void;
  onInitiateLoan: (libro: Libro) => void;
}

export const BookCatalog: React.FC<BookCatalogProps> = ({
  libros,
  onRefresh,
  onOpenScanner,
  onInitiateLoan,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'outOfStock'>('all');
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState<string | null>(null);

  // Manual Add Modal state
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [newTitulo, setNewTitulo] = useState('');
  const [newAutor, setNewAutor] = useState('');
  const [newIsbn, setNewIsbn] = useState('');
  const [newCopias, setNewCopias] = useState(1);
  const [newPortadaUrl, setNewPortadaUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const filteredLibros = libros.filter((libro) => {
    const matchesSearch =
      libro.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      libro.autor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      libro.isbn.includes(searchTerm);

    if (!matchesSearch) return false;

    if (availabilityFilter === 'available') {
      return libro.copias_disponibles > 0;
    }
    if (availabilityFilter === 'outOfStock') {
      return libro.copias_disponibles === 0;
    }
    return true;
  });

  const handleDeleteBook = (libro: Libro) => {
    setDeleteErrorMessage(null);
    setDeleteSuccessMessage(null);

    const confirmed = window.confirm(
      `¿Deseas eliminar "${libro.titulo}" del catálogo?`
    );
    if (!confirmed) return;

    const res = BibliotecaStorage.deleteLibro(libro.id);
    if (res.ok) {
      setDeleteSuccessMessage(`"${libro.titulo}" fue eliminado del catálogo.`);
      onRefresh();
    } else {
      setDeleteErrorMessage(res.error || 'No se pudo eliminar el libro.');
    }
  };

  const handleManualAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newTitulo.trim() || !newAutor.trim() || !newIsbn.trim()) {
      setFormError('Por favor completa los campos de título, autor e ISBN.');
      return;
    }

    const res = BibliotecaStorage.createLibro({
      titulo: newTitulo.trim(),
      autor: newAutor.trim(),
      isbn: newIsbn.trim(),
      copias_totales: newCopias,
      portada_url: newPortadaUrl.trim() || `https://covers.openlibrary.org/b/isbn/${newIsbn.trim()}-M.jpg`,
    });

    if (res.ok) {
      setIsManualModalOpen(false);
      setNewTitulo('');
      setNewAutor('');
      setNewIsbn('');
      setNewCopias(1);
      setNewPortadaUrl('');
      onRefresh();
    } else {
      setFormError(res.error || 'Error al crear el libro.');
    }
  };

  return (
    <div id="book-catalog-section" className="space-y-6">
      {/* Top Bar with Search, Filter & Actions */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="catalog-search-input"
              type="text"
              placeholder="Buscar por título, autor o código ISBN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              id="open-scanner-from-catalog-btn"
              type="button"
              onClick={onOpenScanner}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer shrink-0"
            >
              <BookOpen className="w-4 h-4" />
              <span>Escanear con cámara</span>
            </button>
            <button
              id="open-manual-add-modal-btn"
              type="button"
              onClick={() => setIsManualModalOpen(true)}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Alta manual</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-slate-500 font-medium mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Filtro:
            </span>
            <button
              id="filter-all-btn"
              type="button"
              onClick={() => setAvailabilityFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                availabilityFilter === 'all'
                  ? 'bg-blue-100 text-blue-800'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Todos ({libros.length})
            </button>
            <button
              id="filter-available-btn"
              type="button"
              onClick={() => setAvailabilityFilter('available')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                availabilityFilter === 'available'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Disponibles ({libros.filter((b) => b.copias_disponibles > 0).length})
            </button>
            <button
              id="filter-out-of-stock-btn"
              type="button"
              onClick={() => setAvailabilityFilter('outOfStock')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                availabilityFilter === 'outOfStock'
                  ? 'bg-amber-100 text-amber-800'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Sin copias ({libros.filter((b) => b.copias_disponibles === 0).length})
            </button>
          </div>

          <span className="text-slate-500 font-medium">
            Mostrando {filteredLibros.length} libros
          </span>
        </div>
      </div>

      {/* Messages */}
      {deleteErrorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-xs text-red-800">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block mb-0.5">Regla de integridad (REGLA 1):</span>
            {deleteErrorMessage}
          </div>
        </div>
      )}

      {deleteSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs text-emerald-800">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{deleteSuccessMessage}</span>
        </div>
      )}

      {/* Empty State */}
      {filteredLibros.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-semibold text-slate-800">
            No se encontraron libros
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm
              ? `No hay coincidencias para "${searchTerm}". Intenta con otro término o limpia la búsqueda.`
              : 'El catálogo está vacío. Utiliza el escáner de ISBN con tu cámara para agregar libros al instante.'}
          </p>
        </div>
      )}

      {/* Books Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredLibros.map((libro) => {
          const isAvailable = libro.copias_disponibles > 0;
          return (
            <div
              key={libro.id}
              id={`book-card-${libro.id}`}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
            >
              <div className="p-5 flex gap-4">
                {/* Book Cover */}
                <div className="w-20 h-28 bg-slate-100 rounded-xl overflow-hidden shadow-2xs border border-slate-200 shrink-0 flex items-center justify-center relative">
                  {libro.portada_url ? (
                    <img
                      src={libro.portada_url}
                      alt={libro.titulo}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <BookOpen className="w-8 h-8 text-slate-400" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        isAvailable
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {isAvailable ? `${libro.copias_disponibles} disp.` : 'Agotado'}
                    </span>

                    <span className="text-[11px] text-slate-400 font-mono">
                      #{libro.id}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 font-serif-book leading-tight line-clamp-2 pt-0.5" title={libro.titulo}>
                    {libro.titulo}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium truncate" title={libro.autor}>
                    {libro.autor}
                  </p>

                  <div className="pt-1.5 flex items-center gap-1.5">
                    <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      ISBN: {libro.isbn}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Card Actions */}
              <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">
                  Total: {libro.copias_totales} copias
                </span>

                <div className="flex items-center gap-2">
                  <button
                    id={`delete-book-btn-${libro.id}`}
                    type="button"
                    title="Eliminar del catálogo"
                    onClick={() => handleDeleteBook(libro)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    id={`borrow-book-btn-${libro.id}`}
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => onInitiateLoan(libro)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg font-semibold transition-colors shadow-2xs cursor-pointer"
                  >
                    Prestar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual Add Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 font-serif-book">
                Registrar nuevo libro manualmente
              </h3>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                &times;
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                {formError}
              </div>
            )}

            <form onSubmit={handleManualAddSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Título del libro *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Cien años de soledad"
                  value={newTitulo}
                  onChange={(e) => setNewTitulo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Autor *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Gabriel García Márquez"
                  value={newAutor}
                  onChange={(e) => setNewAutor(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Código ISBN *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="9780307474728"
                    value={newIsbn}
                    onChange={(e) => setNewIsbn(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Copias iniciales
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newCopias}
                    onChange={(e) => setNewCopias(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  URL de portada (opcional)
                </label>
                <input
                  type="url"
                  placeholder="https://covers.openlibrary.org/b/isbn/..."
                  value={newPortadaUrl}
                  onChange={(e) => setNewPortadaUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
                >
                  Guardar libro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
