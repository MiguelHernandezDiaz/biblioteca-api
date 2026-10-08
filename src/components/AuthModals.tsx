import React, { useState } from 'react';
import { AuthUser } from '../types';
import { X, Lock, Mail, User, ShieldCheck } from 'lucide-react';

interface AuthModalsProps {
  loginOpen: boolean;
  registerOpen: boolean;
  onCloseLogin: () => void;
  onCloseRegister: () => void;
  onLoginSuccess: (user: AuthUser) => void;
  onRegisterSuccess: (user: AuthUser) => void;
}

export const AuthModals: React.FC<AuthModalsProps> = ({
  loginOpen,
  registerOpen,
  onCloseLogin,
  onCloseRegister,
  onLoginSuccess,
  onRegisterSuccess,
}) => {
  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    const emailTrim = loginEmail.trim().toLowerCase();
    const passTrim = loginPass.trim();

    // Check admin credentials
    if (
      (emailTrim === 'admin' || emailTrim === 'admin@biblioteca.com') &&
      (passTrim === 'admin1234' || passTrim === 'admin')
    ) {
      const adminUser: AuthUser = {
        id: 0,
        nombre: 'Administrador del Sistema',
        email: 'admin@biblioteca.com',
        rol: 'admin',
        token: 'admin-token-session',
      };
      setLoginLoading(false);
      onLoginSuccess(adminUser);
      onCloseLogin();
      return;
    }

    // Default reader logins or custom users
    const sampleReaders: Record<string, string> = {
      'ana.gomez@universidad.edu': 'Ana Gómez',
      'carlos.m@biblioteca.org': 'Carlos Mendoza',
      'lucia.f@gmail.com': 'Lucía Fernández',
      'miguel.h@estudiante.edu': 'Miguel Hernández',
    };

    if (sampleReaders[emailTrim] || emailTrim.includes('@')) {
      const normalUser: AuthUser = {
        id: 1,
        nombre: sampleReaders[emailTrim] || emailTrim.split('@')[0],
        email: emailTrim,
        rol: 'usuario',
        token: `user-token-${emailTrim}`,
      };
      setLoginLoading(false);
      onLoginSuccess(normalUser);
      onCloseLogin();
      return;
    }

    setLoginLoading(false);
    setLoginError('Credenciales incorrectas. Ingresa tu correo o usa los accesos de prueba.');
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim()) return;

    setRegLoading(true);
    setRegError(null);

    const newUser: AuthUser = {
      id: Math.floor(Math.random() * 900) + 10,
      nombre: regName.trim(),
      email: regEmail.trim().toLowerCase(),
      rol: 'usuario',
      token: `user-token-${Date.now()}`,
    };

    setRegLoading(false);
    onRegisterSuccess(newUser);
    onCloseRegister();
  };

  const quickLogin = (email: string, pass: string) => {
    setLoginEmail(email);
    setLoginPass(pass);
    if (email === 'admin') {
      const adminUser: AuthUser = {
        id: 0,
        nombre: 'Administrador del Sistema',
        email: 'admin@biblioteca.com',
        rol: 'admin',
        token: 'admin-token-session',
      };
      onLoginSuccess(adminUser);
      onCloseLogin();
    } else {
      const normalUser: AuthUser = {
        id: 1,
        nombre: 'Ana Gómez',
        email: 'ana.gomez@universidad.edu',
        rol: 'usuario',
        token: 'user-token-ana',
      };
      onLoginSuccess(normalUser);
      onCloseLogin();
    }
  };

  return (
    <>
      {/* Login Modal */}
      {loginOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-400" />
                <h3 className="text-base font-bold text-white">Iniciar Sesión</h3>
              </div>
              <button onClick={onCloseLogin} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loginError && (
              <div className="bg-rose-950/40 border border-rose-800/60 p-2.5 rounded-lg text-xs text-rose-300">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Correo Electrónico o Usuario:</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="tu-correo@ejemplo.com o admin"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Contraseña:</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    placeholder="Contraseña (ej: 123456 o admin1234)"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors shadow"
              >
                {loginLoading ? 'Verificando...' : 'Ingresar'}
              </button>
            </form>

            <div className="pt-3 border-t border-slate-800 space-y-2 text-xs">
              <span className="text-slate-400 block text-[11px]">Acceso rápido para demostración:</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => quickLogin('ana.gomez@universidad.edu', '123456')}
                  className="p-2 bg-slate-950 hover:bg-slate-800 rounded-lg border border-slate-800 text-slate-300 text-left text-[11px]"
                >
                  👤 <span className="font-bold">Lector</span>
                  <br />
                  Ana Gómez
                </button>
                <button
                  type="button"
                  onClick={() => quickLogin('admin', 'admin1234')}
                  className="p-2 bg-slate-950 hover:bg-slate-800 rounded-lg border border-slate-800 text-amber-300 text-left text-[11px]"
                >
                  🛡️ <span className="font-bold">Admin</span>
                  <br />
                  admin / admin1234
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {registerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Crear Cuenta de Lector</h3>
              </div>
              <button onClick={onCloseRegister} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {regError && (
              <div className="bg-rose-950/40 border border-rose-800/60 p-2.5 rounded-lg text-xs text-rose-300">
                {regError}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Nombre Completo:</label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Ej: Roberto Salas"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Correo Electrónico:</label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="roberto@ejemplo.com"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Contraseña:</label>
                <input
                  type="password"
                  required
                  value={regPass}
                  onChange={(e) => setRegPass(e.target.value)}
                  placeholder="Crea una contraseña"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={regLoading}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors shadow"
              >
                {regLoading ? 'Registrando...' : 'Crear Cuenta e Ingresar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
