import React, { useState } from 'react';
import { Terminal, Play, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';
import { BibliotecaStorage } from '../services/storage';
import { fetchFromOpenLibrary } from '../services/openLibrary';

export const ApiExplorer: React.FC = () => {
  const [activeEndpoint, setActiveEndpoint] = useState<string>('GET /libros/');
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [statusCode, setStatusCode] = useState<number>(200);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [testIsbn, setTestIsbn] = useState('9780307474728');
  const [copied, setCopied] = useState(false);

  const endpoints = [
    {
      method: 'GET',
      path: '/libros/',
      description: 'Lista todos los libros activos del catálogo.',
      run: () => {
        const data = BibliotecaStorage.getLibros();
        return { status: 200, data };
      },
    },
    {
      method: 'GET',
      path: '/usuarios/',
      description: 'Lista todos los usuarios y lectores registrados.',
      run: () => {
        const data = BibliotecaStorage.getUsuarios();
        return { status: 200, data };
      },
    },
    {
      method: 'GET',
      path: '/prestamos/',
      description: 'Lista el historial y préstamos activos de la biblioteca.',
      run: () => {
        const data = BibliotecaStorage.getPrestamos();
        return { status: 200, data };
      },
    },
    {
      method: 'GET',
      path: '/open-library/{isbn}',
      description: 'Consulta datos en tiempo real de Open Library por ISBN.',
      hasParam: true,
      run: async (isbn: string) => {
        try {
          const data = await fetchFromOpenLibrary(isbn);
          return { status: 200, data };
        } catch (e: any) {
          return { status: 404, data: { detail: e.message } };
        }
      },
    },
    {
      method: 'DELETE',
      path: '/libros/1 (REGLA 1)',
      description: 'Intenta eliminar el libro #1 (bloqueado si tiene préstamos activos).',
      run: () => {
        const res = BibliotecaStorage.deleteLibro(1);
        if (!res.ok) {
          return { status: 400, data: { detail: res.error } };
        }
        return { status: 204, data: null };
      },
    },
  ];

  const handleExecute = async (endpoint: (typeof endpoints)[0]) => {
    const start = performance.now();
    try {
      let result;
      if (endpoint.hasParam) {
        result = await (endpoint.run as (arg: string) => any)(testIsbn);
      } else {
        result = await (endpoint.run as () => any)();
      }
      const end = performance.now();
      setStatusCode(result.status);
      setApiResponse(result.data);
      setResponseTime(Math.round(end - start));
    } catch (err: any) {
      setStatusCode(500);
      setApiResponse({ error: err.message });
      setResponseTime(0);
    }
  };

  const handleCopyJson = () => {
    if (!apiResponse) return;
    navigator.clipboard.writeText(JSON.stringify(apiResponse, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="api-explorer-section" className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-slate-900 text-white">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Consola de Endpoints REST (FastAPI)
            </h3>
            <p className="text-xs text-slate-500">
              Prueba directamente los contratos de la API original de biblioteca y comprueba las reglas de negocio.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Endpoints List */}
          <div className="lg:col-span-5 space-y-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Endpoints disponibles:
            </span>
            {endpoints.map((ep) => {
              const isSelected = activeEndpoint === `${ep.method} ${ep.path}`;
              return (
                <div
                  key={ep.path}
                  onClick={() => {
                    setActiveEndpoint(`${ep.method} ${ep.path}`);
                    handleExecute(ep);
                  }}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/50 shadow-2xs'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                          ep.method === 'GET'
                            ? 'bg-blue-100 text-blue-700'
                            : ep.method === 'POST'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {ep.method}
                      </span>
                      <span className="font-mono font-semibold text-slate-800">
                        {ep.path}
                      </span>
                    </div>
                    <Play className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    {ep.description}
                  </p>
                </div>
              );
            })}

            {/* Parameter for Open Library */}
            {activeEndpoint.includes('/open-library/') && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <label className="font-semibold text-slate-700 block">
                  Parámetro ISBN para prueba:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testIsbn}
                    onChange={(e) => setTestIsbn(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const ep = endpoints.find((e) => e.hasParam);
                      if (ep) handleExecute(ep);
                    }}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    Consultar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Response Inspector */}
          <div className="lg:col-span-7 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="font-mono text-slate-300 font-semibold">
                  {activeEndpoint}
                </span>
                {statusCode && (
                  <span
                    className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                      statusCode >= 200 && statusCode < 300
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}
                  >
                    HTTP {statusCode}
                  </span>
                )}
                {responseTime !== null && (
                  <span className="text-slate-500 font-mono text-[11px]">
                    {responseTime}ms
                  </span>
                )}
              </div>

              {apiResponse && (
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-[11px] cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado' : 'Copiar JSON'}</span>
                </button>
              )}
            </div>

            <div className="p-4 flex-1 overflow-auto max-h-96 font-mono text-xs text-slate-200">
              {apiResponse ? (
                <pre className="whitespace-pre-wrap leading-relaxed">
                  {JSON.stringify(apiResponse, null, 2)}
                </pre>
              ) : (
                <div className="text-slate-500 flex items-center justify-center h-48">
                  Haz clic en cualquiera de los endpoints para ejecutar la petición...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
