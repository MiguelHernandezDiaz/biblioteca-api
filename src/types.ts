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
  rol?: 'usuario' | 'admin';
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
  dias_restantes?: number;
  estado_plazo?: string;
}

export interface OpenLibraryResult {
  isbn: string;
  titulo: string;
  autor: string;
  portada_url: string | null;
}

export interface AuthUser {
  id: number;
  nombre: string;
  email: string;
  rol: 'usuario' | 'admin';
  token?: string;
}
