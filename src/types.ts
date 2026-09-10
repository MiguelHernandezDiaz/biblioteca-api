export interface Libro {
  id: number;
  titulo: string;
  autor: string;
  isbn: string;
  copias_totales: number;
  copias_disponibles: number;
  portada_url?: string | null;
  activo: boolean;
}

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  activo: boolean;
}

export interface Prestamo {
  id: number;
  libro_id: number;
  usuario_id: number;
  fecha_prestamo: string;
  fecha_limite: string;
  fecha_devolucion?: string | null;
  activo: boolean;
  libro?: Libro;
  usuario?: Usuario;
}

export interface OpenLibraryResult {
  isbn: string;
  titulo: string;
  autor: string;
  portada_url: string | null;
}
