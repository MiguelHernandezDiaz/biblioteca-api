import React, { useEffect, useState, useCallback } from 'react';
import { Header } from './components/Header';
import { BooksView } from './components/BooksView';
import { UsersView } from './components/UsersView';
import { LoansView } from './components/LoansView';
import { MyLoansView } from './components/MyLoansView';
import { ScannerView } from './components/ScannerView';
import { DatabaseInspectorView } from './components/DatabaseInspectorView';
import { AuthModals } from './components/AuthModals';
import { Libro, Usuario, Prestamo, AuthUser } from './types';
import {
  fetchLibros,
  fetchUsuarios,
  fetchPrestamos,
  createLibro,
  deleteLibro,
  createUsuario,
  createPrestamo,
  devolverPrestamo,
  resetToSeedData,
} from './services/api';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'books' | 'my-loans' | 'loans' | 'users' | 'scanner' | 'database'>('books');
  const [libros, setLibros] = useState<Libro[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [loading, setLoading] = useState(true);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('biblioteca_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);

  // Preselection for loans modal
  const [preSelectedBookId, setPreSelectedBookId] = useState<number | null>(null);
  const [preSelectedUserId, setPreSelectedUserId] = useState<number | null>(null);

  // Toast notification system
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    localStorage.setItem('biblioteca_auth_user', JSON.stringify(user));
    addToast('success', `¡Bienvenido/a, ${user.nombre}!`);
    if (user.rol === 'admin') {
      setActiveTab('books');
    } else {
      setActiveTab('my-loans');
    }
  };

  const handleRegisterSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    localStorage.setItem('biblioteca_auth_user', JSON.stringify(user));
    addToast('success', `¡Cuenta creada con éxito! Bienvenido/a, ${user.nombre}.`);
    setActiveTab('books');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('biblioteca_auth_user');
    addToast('info', 'Sesión cerrada correctamente.');
    setActiveTab('books');
  };

  const loadAllData = useCallback(async () => {
    try {
      const [l, u, p] = await Promise.all([
        fetchLibros(),
        fetchUsuarios(),
        fetchPrestamos(),
      ]);
      setLibros(l);
      setUsuarios(u);
      setPrestamos(p);
    } catch (err) {
      console.error('Error loading library data:', err);
      addToast('error', 'Error al cargar los datos del sistema.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Book Handlers
  const handleCreateBook = async (bookData: {
    titulo: string;
    autor: string;
    isbn: string;
    copias_totales: number;
    portada_url?: string;
  }) => {
    if (currentUser?.rol !== 'admin') {
      addToast('error', 'Acción denegada: Solo el Administrador puede registrar libros.');
      return;
    }
    try {
      await createLibro(bookData);
      await loadAllData();
      addToast('success', `"${bookData.titulo}" agregado al catálogo.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar libro';
      addToast('error', msg);
      throw err;
    }
  };

  const handleDeleteBook = async (id: number) => {
    if (currentUser?.rol !== 'admin') {
      addToast('error', 'Acción denegada: Solo el Administrador puede eliminar libros.');
      return;
    }
    try {
      await deleteLibro(id);
      await loadAllData();
      addToast('success', 'El libro fue dado de baja correctamente.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo eliminar el libro';
      addToast('error', msg);
    }
  };

  const handleStartLoanForBook = (libro: Libro) => {
    if (!currentUser) {
      setLoginModalOpen(true);
      return;
    }
    setPreSelectedBookId(libro.id);
    setPreSelectedUserId(currentUser.id);
    setActiveTab('loans');
  };

  // User Handlers
  const handleCreateUser = async (userData: { nombre: string; email: string }) => {
    if (currentUser?.rol !== 'admin') {
      addToast('error', 'Solo el Administrador puede dar de alta usuarios directamente.');
      return;
    }
    try {
      await createUsuario(userData);
      await loadAllData();
      addToast('success', `Usuario ${userData.nombre} registrado con éxito.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar usuario';
      addToast('error', msg);
      throw err;
    }
  };

  const handleNewLoanForUser = (usuario: Usuario) => {
    setPreSelectedUserId(usuario.id);
    setPreSelectedBookId(null);
    setActiveTab('loans');
  };

  // Loan Handlers
  const handleCreateLoan = async (data: {
    libro_id: number;
    usuario_id: number;
    dias_prestamo: number;
  }) => {
    try {
      await createPrestamo(data);
      await loadAllData();
      setPreSelectedBookId(null);
      setPreSelectedUserId(null);
      addToast('success', 'Préstamo registrado exitosamente.');
      if (currentUser?.rol !== 'admin') {
        setActiveTab('my-loans');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear préstamo';
      addToast('error', msg);
      throw err;
    }
  };

  const handleReturnLoan = async (prestamoId: number) => {
    try {
      await devolverPrestamo(prestamoId);
      await loadAllData();
      addToast('success', 'Libro devuelto al inventario con éxito.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar devolución';
      addToast('error', msg);
    }
  };

  // Stats calculation
  const totalBooks = libros.length;
  const availableCopies = libros.reduce((acc, curr) => acc + curr.copias_disponibles, 0);
  const totalUsers = usuarios.length;
  const activeLoans = prestamos.filter((p) => p.activo).length;
  const myActiveLoans = currentUser
    ? prestamos.filter((p) => p.usuario_id === currentUser.id && p.activo).length
    : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top App Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setPreSelectedBookId(null);
          setPreSelectedUserId(null);
          setActiveTab(tab);
        }}
        stats={{
          totalBooks,
          availableCopies,
          totalUsers,
          activeLoans,
          myActiveLoans,
        }}
        currentUser={currentUser}
        onOpenLogin={() => setLoginModalOpen(true)}
        onOpenRegister={() => setRegisterModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400">Cargando datos de la biblioteca...</p>
          </div>
        ) : (
          <>
            {activeTab === 'books' && (
              <BooksView
                libros={libros}
                currentUser={currentUser}
                onDeleteBook={handleDeleteBook}
                onCreateBook={handleCreateBook}
                onStartLoan={handleStartLoanForBook}
                onGoToScanner={() => setActiveTab('scanner')}
                onOpenLogin={() => setLoginModalOpen(true)}
              />
            )}

            {activeTab === 'my-loans' && (
              <MyLoansView
                prestamos={prestamos}
                currentUser={currentUser}
                onReturnLoan={handleReturnLoan}
                onExploreCatalog={() => setActiveTab('books')}
                onOpenLogin={() => setLoginModalOpen(true)}
              />
            )}

            {activeTab === 'loans' && (
              <LoansView
                prestamos={prestamos}
                libros={libros}
                usuarios={usuarios}
                preSelectedBookId={preSelectedBookId}
                preSelectedUserId={preSelectedUserId}
                onReturnLoan={handleReturnLoan}
                onCreateLoan={handleCreateLoan}
              />
            )}

            {activeTab === 'users' && (
              <UsersView
                usuarios={usuarios}
                prestamos={prestamos}
                onCreateUser={handleCreateUser}
                onNewLoanForUser={handleNewLoanForUser}
              />
            )}

            {activeTab === 'scanner' && (
              <ScannerView
                onBookAdded={handleCreateBook}
                onGoToCatalog={() => setActiveTab('books')}
              />
            )}

            {activeTab === 'database' && (
              <DatabaseInspectorView />
            )}
          </>
        )}
      </main>

      {/* Auth Modals */}
      <AuthModals
        loginOpen={loginModalOpen}
        registerOpen={registerModalOpen}
        onCloseLogin={() => setLoginModalOpen(false)}
        onCloseRegister={() => setRegisterModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onRegisterSuccess={handleRegisterSuccess}
      />

      {/* Floating Toast Notification Stack */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border text-xs shadow-xl transition-all duration-300 ${
              toast.type === 'success'
                ? 'bg-slate-900/95 border-emerald-500/50 text-emerald-200'
                : toast.type === 'error'
                ? 'bg-slate-900/95 border-rose-500/50 text-rose-200'
                : 'bg-slate-900/95 border-blue-500/50 text-blue-200'
            }`}
          >
            {toast.type === 'success' && (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            )}
            {toast.type === 'error' && (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            )}
            {toast.type === 'info' && (
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            )}

            <div className="flex-1 font-medium leading-relaxed">{toast.message}</div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-200 p-0.5 -mr-1 -mt-1 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
