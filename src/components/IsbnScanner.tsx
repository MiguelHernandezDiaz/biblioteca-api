import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader, BrowserCodeReader, BarcodeFormat } from '@zxing/browser';
import {
  Camera,
  CameraOff,
  Flashlight,
  FlashlightOff,
  RefreshCw,
  Search,
  Upload,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Plus,
  Layers,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { fetchFromOpenLibrary } from '../services/openLibrary';
import { BibliotecaStorage } from '../services/storage';
import { OpenLibraryResult, Libro } from '../types';
import { playScanSuccessSound, triggerHaptic } from '../utils/audio';

interface IsbnScannerProps {
  onBookAdded?: (libro: Libro) => void;
  onNavigateToCatalog?: () => void;
}

const SAMPLE_ISBNS = [
  { label: 'Cien años de soledad', isbn: '9780307474728' },
  { label: 'Don Quijote', isbn: '9788424116286' },
  { label: '1984', isbn: '9780451524935' },
  { label: 'El Principito', isbn: '9780156013987' },
  { label: 'Clean Code', isbn: '9780132350884' },
  { label: 'Dune', isbn: '9780441172719' },
];

export const IsbnScanner: React.FC<IsbnScannerProps> = ({
  onBookAdded,
  onNavigateToCatalog,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamControlsRef = useRef<{ stop: () => void } | null>(null);
  const currentStreamRef = useRef<MediaStream | null>(null);

  // States
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isTorchSupported, setIsTorchSupported] = useState(false);

  // Manual & Scan states
  const [manualIsbn, setManualIsbn] = useState('');
  const [scannedIsbn, setScannedIsbn] = useState<string | null>(null);
  const [isLoadingBook, setIsLoadingBook] = useState(false);
  const [bookLookupError, setBookLookupError] = useState<string | null>(null);
  const [fetchedBook, setFetchedBook] = useState<OpenLibraryResult | null>(null);
  const [copiesToAdd, setCopiesToAdd] = useState(1);
  const [isBookAddedSuccess, setIsBookAddedSuccess] = useState(false);
  const [existingBookInDb, setExistingBookInDb] = useState<Libro | null>(null);

  // Initialize ZXing Reader
  useEffect(() => {
    const hints = new Map();
    // Prioritize 1D formats for book ISBNs
    hints.set(2, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
    ]);
    const reader = new BrowserMultiFormatReader(hints);
    readerRef.current = reader;

    // Discover video devices
    BrowserCodeReader.listVideoInputDevices()
      .then((devices) => {
        setVideoDevices(devices);
        if (devices.length > 0) {
          // Prefer environment / rear camera on mobile
          const backCam = devices.find(
            (d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('trasera') ||
              d.label.toLowerCase().includes('environment')
          );
          setSelectedDeviceId(backCam ? backCam.deviceId : devices[0].deviceId);
        }
      })
      .catch((err) => {
        console.warn('Could not enumerate video devices initially:', err);
      });

    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (streamControlsRef.current) {
      try {
        streamControlsRef.current.stop();
      } catch (e) {
        console.warn('Error stopping stream controls:', e);
      }
      streamControlsRef.current = null;
    }

    if (currentStreamRef.current) {
      currentStreamRef.current.getTracks().forEach((track) => track.stop());
      currentStreamRef.current = null;
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
    setIsTorchOn(false);
    setIsTorchSupported(false);
  }, []);

  const handleIsbnDetected = useCallback(
    async (code: string) => {
      // Clean string: remove non-alphanumeric except X for ISBN-10
      const clean = code.replace(/[^0-9Xx]/g, '').trim();
      if (!clean || clean.length < 9) return;

      // Don't re-trigger if already loading the exact same ISBN
      if (isLoadingBook && scannedIsbn === clean) return;

      playScanSuccessSound();
      triggerHaptic();

      setScannedIsbn(clean);
      setIsLoadingBook(true);
      setBookLookupError(null);
      setFetchedBook(null);
      setIsBookAddedSuccess(false);

      // Check if this book already exists in our library
      const existing = BibliotecaStorage.getLibros().find(
        (b) => b.isbn.replace(/[^0-9Xx]/g, '') === clean
      );
      setExistingBookInDb(existing || null);

      try {
        const bookData = await fetchFromOpenLibrary(clean);
        setFetchedBook(bookData);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al consultar Open Library';
        setBookLookupError(message);
        // Fallback manual placeholder so user can still add it if they want
        setFetchedBook({
          isbn: clean,
          titulo: 'Libro escaneado (' + clean + ')',
          autor: 'Autor no identificado en Open Library',
          portada_url: `https://covers.openlibrary.org/b/isbn/${clean}-M.jpg`,
        });
      } finally {
        setIsLoadingBook(false);
      }
    },
    [isLoadingBook, scannedIsbn]
  );

  const startCamera = useCallback(async () => {
    if (!videoRef.current || !readerRef.current) return;

    stopCamera();
    setCameraError(null);

    try {
      const constraints: MediaStreamConstraints = {
        video: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId } }
          : {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      currentStreamRef.current = stream;
      setHasCameraPermission(true);

      // Check torch compatibility
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities?.() as { torch?: boolean } | undefined;
        setIsTorchSupported(Boolean(capabilities?.torch));
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsScanning(true);

      // Start continuous scanning using ZXing
      const controls = await readerRef.current.decodeFromVideoElement(
        videoRef.current,
        (result, error) => {
          if (result) {
            const text = result.getText();
            handleIsbnDetected(text);
          }
          // Scan errors on individual frames are normal while searching
        }
      );
      streamControlsRef.current = controls;
    } catch (err: unknown) {
      console.error('Camera error:', err);
      setHasCameraPermission(false);
      setIsScanning(false);
      const errName = err instanceof Error ? err.name : '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setCameraError(
          'Permiso de cámara denegado. Habilita el acceso a la cámara en los permisos de tu navegador.'
        );
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setCameraError('No se encontró ninguna cámara conectada en este dispositivo.');
      } else {
        setCameraError(
          'No se pudo inicializar la cámara. Puedes usar la subida de imagen o búsqueda manual.'
        );
      }
    }
  }, [selectedDeviceId, stopCamera, handleIsbnDetected]);

  // Restart camera when device changes or tab changes to camera
  useEffect(() => {
    if (activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab, selectedDeviceId, startCamera, stopCamera]);

  const toggleTorch = async () => {
    if (!currentStreamRef.current) return;
    const track = currentStreamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const newStatus = !isTorchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: newStatus }],
      });
      setIsTorchOn(newStatus);
    } catch (e) {
      console.warn('Torch toggle not supported or failed:', e);
    }
  };

  // Handle image upload decode
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !readerRef.current) return;

    const imageUrl = URL.createObjectURL(file);
    const img = new Image();
    img.src = imageUrl;
    img.onload = async () => {
      try {
        const result = await readerRef.current?.decodeFromImageElement(img);
        if (result) {
          handleIsbnDetected(result.getText());
        } else {
          setBookLookupError('No se detectó ningún código de barras en la imagen.');
        }
      } catch {
        setBookLookupError(
          'No se pudo leer el código de barras en la imagen. Intenta con una foto más clara e iluminada.'
        );
      } finally {
        URL.revokeObjectURL(imageUrl);
      }
    };
  };

  // Handle adding the fetched book to the library
  const handleConfirmAddBook = () => {
    if (!fetchedBook) return;

    const result = BibliotecaStorage.createLibro({
      titulo: fetchedBook.titulo,
      autor: fetchedBook.autor,
      isbn: fetchedBook.isbn,
      copias_totales: copiesToAdd,
      portada_url: fetchedBook.portada_url,
    });

    if (result.ok && result.libro) {
      setIsBookAddedSuccess(true);
      setExistingBookInDb(result.libro);
      if (onBookAdded) {
        onBookAdded(result.libro);
      }
    } else {
      setBookLookupError(result.error || 'Error al guardar el libro.');
    }
  };

  const handleManualSearch = (isbnToSearch?: string) => {
    const target = isbnToSearch || manualIsbn;
    if (!target.trim()) return;
    handleIsbnDetected(target);
  };

  return (
    <div id="isbn-scanner-section" className="space-y-6">
      {/* Scanner Mode Selector */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-1.5 flex gap-1 shadow-xs max-w-md mx-auto">
        <button
          id="tab-camera-btn"
          type="button"
          onClick={() => setActiveTab('camera')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${
            activeTab === 'camera'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Cámara en vivo</span>
        </button>
        <button
          id="tab-upload-btn"
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${
            activeTab === 'upload'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Subir foto</span>
        </button>
        <button
          id="tab-manual-btn"
          type="button"
          onClick={() => setActiveTab('manual')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${
            activeTab === 'manual'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Manual</span>
        </button>
      </div>

      {/* Camera View Mode */}
      {activeTab === 'camera' && (
        <div className="bg-slate-950 rounded-2xl overflow-hidden shadow-lg border border-slate-800 max-w-2xl mx-auto relative">
          {/* Top Camera Controls Overlay */}
          <div className="p-3 bg-slate-900/80 backdrop-blur-md flex items-center justify-between z-20 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isScanning ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    isScanning ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
              </span>
              <span className="text-xs font-semibold text-slate-200 tracking-wide uppercase">
                {isScanning ? 'Escáner activo' : 'Iniciando cámara'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Camera Switcher if multiple devices */}
              {videoDevices.length > 1 && (
                <select
                  id="camera-device-select"
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="bg-slate-800 text-slate-200 text-xs py-1.5 px-2.5 rounded-lg border border-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {videoDevices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Cámara ${i + 1}`}
                    </option>
                  ))}
                </select>
              )}

              {/* Torch Button */}
              {isTorchSupported && (
                <button
                  id="toggle-torch-btn"
                  type="button"
                  onClick={toggleTorch}
                  title="Activar linterna"
                  className={`p-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    isTorchOn
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {isTorchOn ? <Flashlight className="w-4 h-4" /> : <FlashlightOff className="w-4 h-4" />}
                </button>
              )}

              {/* Reconnect Camera Button */}
              <button
                id="restart-camera-btn"
                type="button"
                onClick={startCamera}
                title="Reiniciar cámara"
                className="p-1.5 rounded-lg text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Video Viewport & Scanning Target */}
          <div className="relative aspect-4/3 w-full bg-slate-950 flex items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              id="barcode-scanner-video"
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Error or Permission Denied Notice */}
            {cameraError && (
              <div className="absolute inset-0 bg-slate-950/90 z-20 flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                  <CameraOff className="w-6 h-6" />
                </div>
                <div className="max-w-md">
                  <h4 className="text-white font-semibold text-base mb-1">Cámara no disponible</h4>
                  <p className="text-slate-300 text-sm">{cameraError}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    id="retry-camera-access-btn"
                    type="button"
                    onClick={startCamera}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors"
                  >
                    Reintentar permiso
                  </button>
                  <button
                    id="switch-to-manual-from-camera-btn"
                    type="button"
                    onClick={() => setActiveTab('manual')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-colors"
                  >
                    Usar modo manual
                  </button>
                </div>
              </div>
            )}

            {/* Optical Target Box */}
            {!cameraError && (
              <div className="relative z-10 w-72 h-44 sm:w-88 sm:h-52 rounded-xl border-2 border-dashed border-white/60 shadow-2xl flex flex-col items-center justify-between p-2">
                {/* 4 Corner Markers */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                {/* Laser Animation */}
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-scan-laser pointer-events-none" />

                <div className="w-full text-center">
                  <span className="bg-black/60 text-white/90 text-xs px-2.5 py-1 rounded-full backdrop-blur-xs font-medium">
                    Apunta al código de barras del libro
                  </span>
                </div>

                <div className="w-full text-center">
                  <span className="text-[11px] text-emerald-300/90 font-mono tracking-wider">
                    ISBN-13 / EAN-13
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Help Footer */}
          <div className="p-3 bg-slate-900 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800">
            <span>Sujeta el libro a unos 15–20 cm con buena luz</span>
            <button
              id="camera-sample-quick-btn"
              type="button"
              onClick={() => handleManualSearch('9780307474728')}
              className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Probar con ISBN demo
            </button>
          </div>
        </div>
      )}

      {/* Upload Mode */}
      {activeTab === 'upload' && (
        <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
            <Upload className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-800">
              Sube una foto del código de barras
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Toma una fotografía de la contraportada del libro donde se aprecie claramente el código de barras ISBN.
            </p>
          </div>

          <input
            ref={fileInputRef}
            id="barcode-image-upload-input"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageUpload}
            className="hidden"
          />

          <button
            id="trigger-file-upload-btn"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full max-w-xs mx-auto py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Seleccionar o tomar foto</span>
          </button>
        </div>
      )}

      {/* Manual Search & Quick Examples Mode */}
      {activeTab === 'manual' && (
        <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
          <div>
            <label htmlFor="manual-isbn-input" className="block text-sm font-semibold text-slate-800 mb-1">
              Código ISBN (10 o 13 dígitos)
            </label>
            <p className="text-xs text-slate-500 mb-3">
              Ingresa el número que aparece debajo del código de barras del libro (con o sin guiones).
            </p>
            <div className="flex gap-2">
              <input
                id="manual-isbn-input"
                type="text"
                placeholder="Ejemplo: 9780307474728"
                value={manualIsbn}
                onChange={(e) => setManualIsbn(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <button
                id="manual-search-submit-btn"
                type="button"
                onClick={() => handleManualSearch()}
                disabled={isLoadingBook || !manualIsbn.trim()}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>Buscar</span>
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2.5">
              Libros de prueba listos para escanear:
            </span>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_ISBNS.map((item) => (
                <button
                  key={item.isbn}
                  id={`sample-isbn-btn-${item.isbn}`}
                  type="button"
                  onClick={() => {
                    setManualIsbn(item.isbn);
                    handleManualSearch(item.isbn);
                  }}
                  className="text-xs px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200/80 rounded-lg text-slate-700 font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 opacity-70" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Loading state indicator */}
      {isLoadingBook && (
        <div id="isbn-loading-card" className="max-w-xl mx-auto bg-white rounded-2xl border border-blue-100 p-6 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 animate-spin">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900">
              Consultando Open Library...
            </h4>
            <p className="text-xs text-slate-500">
              Recuperando título, autor y portada oficial para el ISBN {scannedIsbn}
            </p>
          </div>
        </div>
      )}

      {/* Lookup Error Message */}
      {bookLookupError && !isLoadingBook && (
        <div id="isbn-error-card" className="max-w-xl mx-auto bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-amber-800">
            <span className="font-semibold block mb-0.5">Aviso de búsqueda:</span>
            {bookLookupError}
          </div>
        </div>
      )}

      {/* Fetched Book Result Card */}
      {fetchedBook && !isLoadingBook && (
        <div
          id="scanned-book-result-card"
          className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200/90 shadow-md overflow-hidden transition-all"
        >
          <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ISBN Detectado: {fetchedBook.isbn}
              </span>
            </div>

            {existingBookInDb ? (
              <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                Ya en catálogo ({existingBookInDb.copias_disponibles}/{existingBookInDb.copias_totales} disp.)
              </span>
            ) : (
              <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
                Listo para registrar
              </span>
            )}
          </div>

          <div className="p-6 flex flex-col sm:flex-row gap-6 items-start">
            {/* Book Cover */}
            <div className="w-28 h-40 bg-slate-100 rounded-xl overflow-hidden shadow-xs border border-slate-200 shrink-0 flex items-center justify-center relative">
              {fetchedBook.portada_url ? (
                <img
                  src={fetchedBook.portada_url}
                  alt={fetchedBook.titulo}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to book icon on broken image
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <BookOpen className="w-10 h-10 text-slate-400" />
              )}
            </div>

            {/* Book Metadata */}
            <div className="flex-1 space-y-2">
              <h3 className="text-lg font-bold text-slate-900 font-serif-book leading-snug">
                {fetchedBook.titulo}
              </h3>
              <p className="text-sm font-medium text-slate-600">
                Por: <span className="text-slate-900">{fetchedBook.autor}</span>
              </p>

              <div className="flex flex-wrap gap-2 text-xs text-slate-500 pt-1">
                <span className="px-2 py-0.5 bg-slate-100 rounded-md font-mono">
                  ISBN: {fetchedBook.isbn}
                </span>
                {fetchedBook.publish_date && (
                  <span className="px-2 py-0.5 bg-slate-100 rounded-md">
                    Año: {fetchedBook.publish_date}
                  </span>
                )}
                {fetchedBook.publisher && (
                  <span className="px-2 py-0.5 bg-slate-100 rounded-md">
                    Editorial: {fetchedBook.publisher}
                  </span>
                )}
              </div>

              {/* Number of Copies Input */}
              {!isBookAddedSuccess && (
                <div className="pt-3 flex items-center gap-3">
                  <label htmlFor="copies-to-add-input" className="text-xs font-semibold text-slate-700">
                    Copias a incorporar:
                  </label>
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                    <button
                      type="button"
                      onClick={() => setCopiesToAdd(Math.max(1, copiesToAdd - 1))}
                      className="px-2.5 py-1 text-slate-600 hover:bg-slate-200 text-sm font-bold"
                    >
                      -
                    </button>
                    <input
                      id="copies-to-add-input"
                      type="number"
                      min={1}
                      max={99}
                      value={copiesToAdd}
                      onChange={(e) => setCopiesToAdd(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-12 text-center text-sm font-semibold bg-white py-1 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setCopiesToAdd(copiesToAdd + 1)}
                      className="px-2.5 py-1 text-slate-600 hover:bg-slate-200 text-sm font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Success Notification after adding */}
              {isBookAddedSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>¡Libro incorporado con éxito al catálogo con {copiesToAdd} copias disponibles!</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <button
              id="scan-another-book-btn"
              type="button"
              onClick={() => {
                setFetchedBook(null);
                setScannedIsbn(null);
                setIsBookAddedSuccess(false);
                setManualIsbn('');
                if (activeTab === 'camera') {
                  startCamera();
                }
              }}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded-xl transition-colors cursor-pointer"
            >
              Escanear otro libro
            </button>

            <div className="flex gap-2">
              {onNavigateToCatalog && (
                <button
                  id="view-catalog-after-scan-btn"
                  type="button"
                  onClick={onNavigateToCatalog}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Ver en catálogo</span>
                </button>
              )}

              {!isBookAddedSuccess && (
                <button
                  id="add-scanned-book-btn"
                  type="button"
                  onClick={handleConfirmAddBook}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar a la Biblioteca</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
