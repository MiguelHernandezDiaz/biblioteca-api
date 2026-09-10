import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { searchOpenLibrary } from '../services/api';
import { OpenLibraryResult } from '../types';
import {
  Camera,
  CameraOff,
  Search,
  BookPlus,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Book,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface ScannerViewProps {
  onBookAdded: (book: {
    titulo: string;
    autor: string;
    isbn: string;
    copias_totales: number;
    portada_url?: string;
  }) => Promise<void>;
  onGoToCatalog: () => void;
}

export const ScannerView: React.FC<ScannerViewProps> = ({
  onBookAdded,
  onGoToCatalog,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Manual input state
  const [manualIsbn, setManualIsbn] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Found book state
  const [foundBook, setFoundBook] = useState<OpenLibraryResult | null>(null);
  const [copias, setCopias] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize ZXing code reader
  useEffect(() => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128,
      BarcodeFormat.UPC_A,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new BrowserMultiFormatReader(hints);
    codeReaderRef.current = reader;

    // List available video devices
    reader
      .listVideoInputDevices()
      .then((devices) => {
        setVideoDevices(devices);
        if (devices.length > 0) {
          // Prefer environment / back-facing camera if available
          const backCam = devices.find((d) =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('ambiente') ||
            d.label.toLowerCase().includes('trasera')
          );
          setSelectedDeviceId(backCam ? backCam.deviceId : devices[0].deviceId);
        }
      })
      .catch((err) => {
        console.warn('Could not enumerate video devices', err);
      });

    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async (deviceId?: string) => {
    setErrorMessage(null);
    setSaveSuccess(false);

    if (!codeReaderRef.current || !videoRef.current) return;

    try {
      setIsScanning(true);
      const targetDevice = deviceId || selectedDeviceId || null;

      await codeReaderRef.current.decodeFromVideoDevice(
        targetDevice,
        videoRef.current,
        (result, error) => {
          if (result) {
            const scannedText = result.getText();
            stopScanning();
            handleBarcodeFound(scannedText);
          }
          if (error && !(error.name === 'NotFoundException')) {
            // Ignore standard scanning not found frames
          }
        }
      );
    } catch (err: unknown) {
      console.error('Error starting video decode', err);
      setIsScanning(false);
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo acceder a la cámara. Asegúrate de otorgar permisos o ingresar el ISBN manualmente.';
      setErrorMessage(
        message.includes('Permission') || message.includes('denied')
          ? 'Permiso de cámara denegado. Por favor, habilita el acceso en tu navegador o escribe el ISBN manualmente.'
          : message
      );
    }
  };

  const stopScanning = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    setIsScanning(false);
  };

  const handleBarcodeFound = async (rawIsbn: string) => {
    const cleanIsbn = rawIsbn.replace(/-/g, '').trim();
    setManualIsbn(cleanIsbn);
    await lookupIsbn(cleanIsbn);
  };

  const lookupIsbn = async (isbn: string) => {
    setErrorMessage(null);
    setFoundBook(null);
    setSaveSuccess(false);
    setIsSearching(true);

    try {
      const result = await searchOpenLibrary(isbn);
      setFoundBook(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al buscar libro';
      setErrorMessage(msg);
    } finally {
      setIsSearching(false);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualIsbn.trim()) return;
    stopScanning();
    lookupIsbn(manualIsbn.trim());
  };

  const handleSaveBook = async () => {
    if (!foundBook) return;

    setIsSaving(true);
    try {
      await onBookAdded({
        titulo: foundBook.titulo,
        autor: foundBook.autor,
        isbn: foundBook.isbn,
        copias_totales: Number(copias) || 1,
        portada_url: foundBook.portada_url || undefined,
      });

      setSaveSuccess(true);
      setFoundBook(null);
      setManualIsbn('');
      setCopias(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar el libro';
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* View Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Camera className="w-5 h-5 text-emerald-400" />
          <span>Escáner de Códigos de Barra (ISBN)</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Escanea el código de barras en la contraportada de un libro con tu cámara o ingresa el código ISBN manualmente para consultar Open Library e ingresarlo automáticamente.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Camera Viewport & Controls */}
        <div className="md:col-span-7 space-y-4">
          
          {/* Viewport Frame */}
          <div className="relative bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden aspect-[4/3] flex items-center justify-center shadow-2xl">
            <video
              ref={videoRef}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                isScanning ? 'opacity-100' : 'opacity-0'
              }`}
              playsInline
              muted
            />

            {/* Viewfinder Graphic Overlay */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                <div className="relative w-64 h-40 border-2 border-emerald-400/40 rounded-xl flex items-center justify-center">
                  {/* Laser scan animation */}
                  <div className="absolute inset-x-0 h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399] animate-[bounce_2s_infinite]" />

                  {/* Corner accents */}
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />

                  <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-300/80 bg-slate-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                    Apunta al código ISBN
                  </span>
                </div>
              </div>
            )}

            {/* Camera Inactive Placeholder */}
            {!isScanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-3 bg-slate-900/60">
                <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 shadow-inner">
                  <Camera className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">
                    Cámara en espera
                  </h4>
                  <p className="text-xs text-slate-400 max-w-xs mt-0.5">
                    Presiona el botón para iniciar la transmisión en vivo y enfocar el código de barras.
                  </p>
                </div>
                <button
                  onClick={() => startScanning()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-emerald-700/20 transition-all flex items-center gap-2"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Activar Cámara</span>
                </button>
              </div>
            )}

            {/* Controls overlay when scanning */}
            {isScanning && (
              <div className="absolute bottom-3 inset-x-0 flex justify-center z-10">
                <button
                  onClick={stopScanning}
                  className="px-4 py-1.5 bg-rose-600/90 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-lg transition-colors flex items-center gap-1.5 backdrop-blur"
                >
                  <CameraOff className="w-3.5 h-3.5" />
                  <span>Detener Escáner</span>
                </button>
              </div>
            )}
          </div>

          {/* Camera device selector */}
          {videoDevices.length > 1 && (
            <div className="flex items-center justify-between text-xs bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">Dispositivo de cámara:</span>
              <select
                value={selectedDeviceId}
                onChange={(e) => {
                  setSelectedDeviceId(e.target.value);
                  if (isScanning) {
                    stopScanning();
                    setTimeout(() => startScanning(e.target.value), 200);
                  }
                }}
                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none"
              >
                {videoDevices.map((d, i) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Cámara #${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Manual ISBN lookup backup */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2.5">
            <label className="block text-xs font-semibold text-slate-300">
              ¿No tienes cámara o prefieres escribir el ISBN?
            </label>
            <form onSubmit={handleManualSearch} className="flex gap-2">
              <input
                type="text"
                value={manualIsbn}
                onChange={(e) => setManualIsbn(e.target.value)}
                placeholder="Ej. 9780307474728 ó 978-84-241-1513-5"
                className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={isSearching || !manualIsbn.trim()}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSearching ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                ) : (
                  <Search className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>Consultar</span>
              </button>
            </form>

            {/* Quick try examples */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] text-slate-500">Probar ejemplo:</span>
              <button
                type="button"
                onClick={() => {
                  setManualIsbn('9780307474728');
                  lookupIsbn('9780307474728');
                }}
                className="text-[10px] text-blue-400 hover:underline font-mono"
              >
                Cien Años de Soledad
              </button>
              <span className="text-slate-700">•</span>
              <button
                type="button"
                onClick={() => {
                  setManualIsbn('9780156013987');
                  lookupIsbn('9780156013987');
                }}
                className="text-[10px] text-blue-400 hover:underline font-mono"
              >
                El Principito
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Result Card & Add to Library */}
        <div className="md:col-span-5 space-y-4">
          
          {/* Error Message */}
          {errorMessage && (
            <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-4 flex items-start gap-3 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
              <div>
                <span className="font-semibold block text-rose-200">Aviso</span>
                {errorMessage}
              </div>
            </div>
          )}

          {/* Success Notification */}
          {saveSuccess && (
            <div className="bg-emerald-950/50 border border-emerald-800/60 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>¡Libro guardado exitosamente en el catálogo!</span>
              </div>
              <p className="text-xs text-slate-400">
                El ejemplar ya está disponible para préstamo y consulta inmediata.
              </p>
              <button
                onClick={onGoToCatalog}
                className="mt-2 inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
              >
                <span>Ver en la biblioteca de libros</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Result Card from Open Library */}
          {foundBook ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/50">
                  <Sparkles className="w-3 h-3" />
                  <span>Encontrado en Open Library</span>
                </span>
                <span className="text-xs font-mono text-slate-400">
                  ISBN: {foundBook.isbn}
                </span>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-24 h-36 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-md">
                  {foundBook.portada_url ? (
                    <img
                      src={foundBook.portada_url}
                      alt={foundBook.titulo}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Book className="w-8 h-8 text-slate-700" />
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <h3 className="text-base font-bold text-white leading-snug">
                    {foundBook.titulo}
                  </h3>
                  <p className="text-xs text-slate-300">
                    <strong className="text-slate-400">Autor:</strong> {foundBook.autor}
                  </p>
                  <p className="text-xs text-slate-400">
                    <strong className="text-slate-500">ISBN:</strong> {foundBook.isbn}
                  </p>
                </div>
              </div>

              {/* Form to add copies */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Número de copias físicas a ingresar al inventario:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={copias}
                    onChange={(e) => setCopias(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  onClick={handleSaveBook}
                  disabled={isSaving}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20 disabled:opacity-50"
                >
                  <BookPlus className="w-4 h-4" />
                  <span>{isSaving ? 'Guardando...' : 'Agregar al Inventario'}</span>
                </button>
              </div>
            </div>
          ) : (
            !saveSuccess && (
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-slate-800/60 flex items-center justify-center text-slate-500 mx-auto">
                  <Search className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-300">
                    Esperando lectura de libro
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Cuando escanees o busques un código ISBN, la ficha técnica del libro aparecerá aquí automáticamente.
                  </p>
                </div>
              </div>
            )
          )}

        </div>

      </div>
    </div>
  );
};
