import { Libro, Usuario, Prestamo } from '../types';

const STORAGE_KEYS = {
  LIBROS: 'biblioteca_libros_v1',
  USUARIOS: 'biblioteca_usuarios_v1',
  PRESTAMOS: 'biblioteca_prestamos_v1',
};

const INITIAL_LIBROS: Libro[] = [
  {
    id: 1,
    titulo: 'Cien años de soledad',
    autor: 'Gabriel García Márquez',
    isbn: '9780307474728',
    copias_totales: 3,
    copias_disponibles: 2,
    portada_url: 'https://covers.openlibrary.org/b/isbn/9780307474728-L.jpg',
    activo: true,
  },
  {
    id: 2,
    titulo: 'Don Quijote de la Mancha',
    autor: 'Miguel de Cervantes Saavedra',
    isbn: '9788424116286',
    copias_totales: 2,
    copias_disponibles: 2,
    portada_url: 'https://covers.openlibrary.org/b/isbn/9788424116286-L.jpg',
    activo: true,
  },
  {
    id: 3,
    titulo: '1984',
    autor: 'George Orwell',
    isbn: '9780451524935',
    copias_totales: 4,
    copias_disponibles: 3,
    portada_url: 'https://covers.openlibrary.org/b/isbn/9780451524935-L.jpg',
    activo: true,
  },
  {
    id: 4,
    titulo: 'El Principito',
    autor: 'Antoine de Saint-Exupéry',
    isbn: '9780156013987',
    copias_totales: 5,
    copias_disponibles: 5,
    portada_url: 'https://covers.openlibrary.org/b/isbn/9780156013987-L.jpg',
    activo: true,
  },
  {
    id: 5,
    titulo: 'Ficciones',
    autor: 'Jorge Luis Borges',
    isbn: '9780307950925',
    copias_totales: 2,
    copias_disponibles: 2,
    portada_url: 'https://covers.openlibrary.org/b/isbn/9780307950925-L.jpg',
    activo: true,
  },
  {
    id: 6,
    titulo: 'Rayuela',
    autor: 'Julio Cortázar',
    isbn: '9788437604572',
    copias_totales: 2,
    copias_disponibles: 2,
    portada_url: 'https://covers.openlibrary.org/b/isbn/9788437604572-L.jpg',
    activo: true,
  },
];

const INITIAL_USUARIOS: Usuario[] = [
  {
    id: 1,
    nombre: 'Carlos Mendoza',
    email: 'carlos.mendoza@universidad.edu',
    activo: true,
  },
  {
    id: 2,
    nombre: 'Elena Ramos',
    email: 'elena.ramos@biblioteca.org',
    activo: true,
  },
  {
    id: 3,
    nombre: 'Sofía Morales',
    email: 'sofia.morales@gmail.com',
    activo: true,
  },
];

const getTodayDateString = (offsetDays = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

const INITIAL_PRESTAMOS: Prestamo[] = [
  {
    id: 1,
    libro_id: 1, // Cien años de soledad (3 copias totales, 2 disponibles)
    usuario_id: 1,
    fecha_prestamo: getTodayDateString(-4),
    fecha_limite: getTodayDateString(3),
    fecha_devolucion: null,
    activo: true,
  },
  {
    id: 2,
    libro_id: 3, // 1984 (4 copias totales, 3 disponibles)
    usuario_id: 2,
    fecha_prestamo: getTodayDateString(-12),
    fecha_limite: getTodayDateString(-5), // Overdue loan example
    fecha_devolucion: null,
    activo: true,
  },
  {
    id: 3,
    libro_id: 2, // Don Quijote (returned)
    usuario_id: 3,
    fecha_prestamo: getTodayDateString(-20),
    fecha_limite: getTodayDateString(-13),
    fecha_devolucion: getTodayDateString(-14),
    activo: false,
  },
];

export class BibliotecaStorage {
  private static getItem<T>(key: string, defaultValue: T): T {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
        return defaultValue;
      }
      return JSON.parse(stored) as T;
    } catch {
      return defaultValue;
    }
  }

  private static setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Error saving to localStorage', e);
    }
  }

  // ===== LIBROS =====
  static getLibros(): Libro[] {
    const list = this.getItem<Libro[]>(STORAGE_KEYS.LIBROS, INITIAL_LIBROS);
    return list.filter((b) => b.activo);
  }

  static getAllLibrosIncludingInactive(): Libro[] {
    return this.getItem<Libro[]>(STORAGE_KEYS.LIBROS, INITIAL_LIBROS);
  }

  static getLibroById(id: number): Libro | undefined {
    return this.getLibros().find((b) => b.id === id);
  }

  static createLibro(data: {
    titulo: string;
    autor: string;
    isbn: string;
    copias_totales: number;
    portada_url?: string | null;
  }): { ok: boolean; libro?: Libro; error?: string } {
    const cleanIsbn = data.isbn.replace(/[-\s]/g, '').trim();
    const all = this.getAllLibrosIncludingInactive();

    const existing = all.find(
      (b) => b.activo && b.isbn.replace(/[-\s]/g, '') === cleanIsbn
    );
    if (existing) {
      return { ok: false, error: 'Ya existe un libro con ese ISBN en el catálogo.' };
    }

    const nextId = all.length > 0 ? Math.max(...all.map((b) => b.id)) + 1 : 1;
    const nuevoLibro: Libro = {
      id: nextId,
      titulo: data.titulo.trim(),
      autor: data.autor.trim(),
      isbn: cleanIsbn,
      copias_totales: Math.max(1, data.copias_totales || 1),
      copias_disponibles: Math.max(1, data.copias_totales || 1),
      portada_url: data.portada_url || null,
      activo: true,
    };

    all.push(nuevoLibro);
    this.setItem(STORAGE_KEYS.LIBROS, all);
    return { ok: true, libro: nuevoLibro };
  }

  static deleteLibro(id: number): { ok: boolean; error?: string } {
    const prestamos = this.getPrestamos();
    // REGLA 1: No dejar borrar si hay un préstamo activo (activo == True)
    const tienePrestamoActivo = prestamos.some(
      (p) => p.libro_id === id && p.activo
    );

    if (tienePrestamoActivo) {
      return {
        ok: false,
        error:
          'No se puede eliminar el libro porque actualmente tiene un préstamo activo sin devolver.',
      };
    }

    const all = this.getAllLibrosIncludingInactive();
    const libro = all.find((b) => b.id === id);
    if (!libro || !libro.activo) {
      return { ok: false, error: 'Libro no encontrado o ya eliminado.' };
    }

    // Borrado lógico
    libro.activo = false;
    this.setItem(STORAGE_KEYS.LIBROS, all);
    return { ok: true };
  }

  // ===== USUARIOS =====
  static getUsuarios(): Usuario[] {
    const list = this.getItem<Usuario[]>(STORAGE_KEYS.USUARIOS, INITIAL_USUARIOS);
    return list.filter((u) => u.activo);
  }

  static getUsuarioById(id: number): Usuario | undefined {
    return this.getUsuarios().find((u) => u.id === id);
  }

  static createUsuario(data: {
    nombre: string;
    email: string;
  }): { ok: boolean; usuario?: Usuario; error?: string } {
    const cleanEmail = data.email.trim().toLowerCase();
    const all = this.getItem<Usuario[]>(STORAGE_KEYS.USUARIOS, INITIAL_USUARIOS);

    if (all.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return { ok: false, error: 'Ya existe un usuario con ese email' };
    }

    const nextId = all.length > 0 ? Math.max(...all.map((u) => u.id)) + 1 : 1;
    const nuevoUsuario: Usuario = {
      id: nextId,
      nombre: data.nombre.trim(),
      email: cleanEmail,
      activo: true,
    };

    all.push(nuevoUsuario);
    this.setItem(STORAGE_KEYS.USUARIOS, all);
    return { ok: true, usuario: nuevoUsuario };
  }

  // ===== PRÉSTAMOS =====
  static getPrestamos(): Prestamo[] {
    return this.getItem<Prestamo[]>(STORAGE_KEYS.PRESTAMOS, INITIAL_PRESTAMOS);
  }

  static createPrestamo(data: {
    libro_id: number;
    usuario_id: number;
    dias_prestamo?: number;
  }): { ok: boolean; prestamo?: Prestamo; error?: string } {
    const libros = this.getAllLibrosIncludingInactive();
    const libro = libros.find((b) => b.id === data.libro_id && b.activo);

    if (!libro) {
      return { ok: false, error: 'Libro no encontrado' };
    }

    if (libro.copias_disponibles <= 0) {
      return {
        ok: false,
        error: 'No hay copias disponibles de este libro para préstamo.',
      };
    }

    const usuario = this.getUsuarioById(data.usuario_id);
    if (!usuario) {
      return { ok: false, error: 'Usuario no encontrado' };
    }

    const days = data.dias_prestamo && data.dias_prestamo > 0 ? data.dias_prestamo : 7;
    const hoy = getTodayDateString(0);
    const limite = getTodayDateString(days);

    const allPrestamos = this.getPrestamos();
    const nextId =
      allPrestamos.length > 0 ? Math.max(...allPrestamos.map((p) => p.id)) + 1 : 1;

    const nuevoPrestamo: Prestamo = {
      id: nextId,
      libro_id: libro.id,
      usuario_id: usuario.id,
      fecha_prestamo: hoy,
      fecha_limite: limite,
      fecha_devolucion: null,
      activo: true,
    };

    libro.copias_disponibles -= 1;
    this.setItem(STORAGE_KEYS.LIBROS, libros);

    allPrestamos.push(nuevoPrestamo);
    this.setItem(STORAGE_KEYS.PRESTAMOS, allPrestamos);

    return { ok: true, prestamo: nuevoPrestamo };
  }

  static devolverLibro(prestamo_id: number): {
    ok: boolean;
    prestamo?: Prestamo;
    error?: string;
  } {
    const allPrestamos = this.getPrestamos();
    const prestamo = allPrestamos.find((p) => p.id === prestamo_id);

    if (!prestamo) {
      return { ok: false, error: 'Préstamo no encontrado' };
    }

    if (!prestamo.activo) {
      return {
        ok: false,
        error: 'Este préstamo ya fue devuelto e inactivado',
      };
    }

    // Registrar fecha de devolución
    prestamo.fecha_devolucion = getTodayDateString(0);
    // REGLA 2: El préstamo pasa a estar inactivo (ahora es historial)
    prestamo.activo = false;

    // Devolver copia al inventario del libro
    const libros = this.getAllLibrosIncludingInactive();
    const libro = libros.find((b) => b.id === prestamo.libro_id);
    if (libro) {
      libro.copias_disponibles = Math.min(
        libro.copias_totales,
        libro.copias_disponibles + 1
      );
      this.setItem(STORAGE_KEYS.LIBROS, libros);
    }

    this.setItem(STORAGE_KEYS.PRESTAMOS, allPrestamos);
    return { ok: true, prestamo };
  }

  static resetToDefault(): void {
    localStorage.setItem(STORAGE_KEYS.LIBROS, JSON.stringify(INITIAL_LIBROS));
    localStorage.setItem(STORAGE_KEYS.USUARIOS, JSON.stringify(INITIAL_USUARIOS));
    localStorage.setItem(STORAGE_KEYS.PRESTAMOS, JSON.stringify(INITIAL_PRESTAMOS));
  }
}
