import { Libro, Usuario, Prestamo, OpenLibraryResult } from '../types';

const STORAGE_KEYS = {
  LIBROS: 'biblioteca_libros_v1',
  USUARIOS: 'biblioteca_usuarios_v1',
  PRESTAMOS: 'biblioteca_prestamos_v1',
};

const SEED_LIBROS: Libro[] = [
  {
    id: 1,
    titulo: 'Cien Años de Soledad',
    autor: 'Gabriel García Márquez',
    isbn: '9780307474728',
    copias_totales: 3,
    copias_disponibles: 2,
    portada_url: 'https://covers.openlibrary.org/b/id/8231856-M.jpg',
    activo: true,
  },
  {
    id: 2,
    titulo: 'Don Quijote de la Mancha',
    autor: 'Miguel de Cervantes',
    isbn: '9788424115135',
    copias_totales: 2,
    copias_disponibles: 1,
    portada_url: 'https://covers.openlibrary.org/b/id/12818862-M.jpg',
    activo: true,
  },
  {
    id: 3,
    titulo: 'El Principito',
    autor: 'Antoine de Saint-Exupéry',
    isbn: '9780156013987',
    copias_totales: 4,
    copias_disponibles: 4,
    portada_url: 'https://covers.openlibrary.org/b/id/10834273-M.jpg',
    activo: true,
  },
  {
    id: 4,
    titulo: '1984',
    autor: 'George Orwell',
    isbn: '9780451524935',
    copias_totales: 2,
    copias_disponibles: 0,
    portada_url: 'https://covers.openlibrary.org/b/id/12646272-M.jpg',
    activo: true,
  },
  {
    id: 5,
    titulo: 'Ficciones',
    autor: 'Jorge Luis Borges',
    isbn: '9780307950925',
    copias_totales: 3,
    copias_disponibles: 3,
    portada_url: 'https://covers.openlibrary.org/b/id/8447844-M.jpg',
    activo: true,
  },
];

const SEED_USUARIOS: Usuario[] = [
  { id: 1, nombre: 'Ana Gómez', email: 'ana.gomez@universidad.edu', activo: true },
  { id: 2, nombre: 'Carlos Mendoza', email: 'carlos.m@biblioteca.org', activo: true },
  { id: 3, nombre: 'Lucía Fernández', email: 'lucia.f@gmail.com', activo: true },
  { id: 4, nombre: 'Miguel Hernández', email: 'miguel.h@estudiante.edu', activo: true },
];

const today = new Date();
const formatDate = (d: Date) => d.toISOString().split('T')[0];

const addDays = (d: Date, days: number) => {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
};

const SEED_PRESTAMOS: Prestamo[] = [
  {
    id: 1,
    libro_id: 1,
    usuario_id: 1,
    fecha_prestamo: formatDate(addDays(today, -3)),
    fecha_limite: formatDate(addDays(today, 4)),
    fecha_devolucion: null,
    activo: true,
  },
  {
    id: 2,
    libro_id: 2,
    usuario_id: 2,
    fecha_prestamo: formatDate(addDays(today, -10)),
    fecha_limite: formatDate(addDays(today, -3)),
    fecha_devolucion: null,
    activo: true,
  },
  {
    id: 3,
    libro_id: 4,
    usuario_id: 3,
    fecha_prestamo: formatDate(addDays(today, -2)),
    fecha_limite: formatDate(addDays(today, 5)),
    fecha_devolucion: null,
    activo: true,
  },
  {
    id: 4,
    libro_id: 4,
    usuario_id: 4,
    fecha_prestamo: formatDate(addDays(today, -5)),
    fecha_limite: formatDate(addDays(today, 2)),
    fecha_devolucion: null,
    activo: true,
  },
  {
    id: 5,
    libro_id: 3,
    usuario_id: 1,
    fecha_prestamo: formatDate(addDays(today, -20)),
    fecha_limite: formatDate(addDays(today, -13)),
    fecha_devolucion: formatDate(addDays(today, -14)),
    activo: false,
  },
];

function load<T>(key: string, defaultData: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultData));
      return defaultData;
    }
    return JSON.parse(raw);
  } catch {
    return defaultData;
  }
}

function save<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error('Error saving to localStorage', err);
  }
}

// ----------------- API Methods -----------------

export async function fetchLibros(): Promise<Libro[]> {
  const libros = load<Libro[]>(STORAGE_KEYS.LIBROS, SEED_LIBROS);
  return libros.filter((l) => l.activo);
}

export async function createLibro(data: {
  titulo: string;
  autor: string;
  isbn: string;
  copias_totales: number;
  portada_url?: string | null;
}): Promise<Libro> {
  const libros = load<Libro[]>(STORAGE_KEYS.LIBROS, SEED_LIBROS);
  const cleanIsbn = data.isbn.replace(/-/g, '').trim();

  const existe = libros.find((l) => l.isbn.replace(/-/g, '').trim() === cleanIsbn && l.activo);
  if (existe) {
    throw new Error(`Ya existe un libro registrado con el ISBN ${data.isbn}`);
  }

  const nextId = libros.length > 0 ? Math.max(...libros.map((l) => l.id)) + 1 : 1;
  const nuevo: Libro = {
    id: nextId,
    titulo: data.titulo.trim(),
    autor: data.autor.trim(),
    isbn: cleanIsbn,
    copias_totales: Number(data.copias_totales) || 1,
    copias_disponibles: Number(data.copias_totales) || 1,
    portada_url: data.portada_url || null,
    activo: true,
  };

  libros.push(nuevo);
  save(STORAGE_KEYS.LIBROS, libros);
  return nuevo;
}

export async function deleteLibro(id: number): Promise<void> {
  const prestamos = load<Prestamo[]>(STORAGE_KEYS.PRESTAMOS, SEED_PRESTAMOS);
  const prestamoActivo = prestamos.find((p) => p.libro_id === id && p.activo);
  if (prestamoActivo) {
    throw new Error(
      'No se puede eliminar el libro porque actualmente tiene un préstamo activo sin devolver.'
    );
  }

  const libros = load<Libro[]>(STORAGE_KEYS.LIBROS, SEED_LIBROS);
  const index = libros.findIndex((l) => l.id === id);
  if (index === -1) {
    throw new Error('Libro no encontrado');
  }

  libros[index].activo = false;
  save(STORAGE_KEYS.LIBROS, libros);
}

export async function fetchUsuarios(): Promise<Usuario[]> {
  return load<Usuario[]>(STORAGE_KEYS.USUARIOS, SEED_USUARIOS);
}

export async function createUsuario(data: { nombre: string; email: string }): Promise<Usuario> {
  const usuarios = load<Usuario[]>(STORAGE_KEYS.USUARIOS, SEED_USUARIOS);
  const emailLimpio = data.email.toLowerCase().trim();

  const existe = usuarios.find((u) => u.email.toLowerCase().trim() === emailLimpio);
  if (existe) {
    throw new Error(`Ya existe un usuario con el email ${data.email}`);
  }

  const nextId = usuarios.length > 0 ? Math.max(...usuarios.map((u) => u.id)) + 1 : 1;
  const nuevo: Usuario = {
    id: nextId,
    nombre: data.nombre.trim(),
    email: emailLimpio,
    activo: true,
  };

  usuarios.push(nuevo);
  save(STORAGE_KEYS.USUARIOS, usuarios);
  return nuevo;
}

export async function fetchPrestamos(): Promise<Prestamo[]> {
  const prestamos = load<Prestamo[]>(STORAGE_KEYS.PRESTAMOS, SEED_PRESTAMOS);
  const libros = load<Libro[]>(STORAGE_KEYS.LIBROS, SEED_LIBROS);
  const usuarios = load<Usuario[]>(STORAGE_KEYS.USUARIOS, SEED_USUARIOS);

  return prestamos.map((p) => ({
    ...p,
    libro: libros.find((l) => l.id === p.libro_id),
    usuario: usuarios.find((u) => u.id === p.usuario_id),
  }));
}

export async function createPrestamo(data: {
  libro_id: number;
  usuario_id: number;
  dias_prestamo?: number;
}): Promise<Prestamo> {
  const libros = load<Libro[]>(STORAGE_KEYS.LIBROS, SEED_LIBROS);
  const usuarios = load<Usuario[]>(STORAGE_KEYS.USUARIOS, SEED_USUARIOS);
  const prestamos = load<Prestamo[]>(STORAGE_KEYS.PRESTAMOS, SEED_PRESTAMOS);

  const libroIndex = libros.findIndex((l) => l.id === data.libro_id && l.activo);
  if (libroIndex === -1) {
    throw new Error('Libro no encontrado');
  }

  const libro = libros[libroIndex];
  if (libro.copias_disponibles <= 0) {
    throw new Error('No hay copias disponibles de este libro en inventario.');
  }

  const usuario = usuarios.find((u) => u.id === data.usuario_id && u.activo);
  if (!usuario) {
    throw new Error('Usuario no encontrado o inactivo');
  }

  const hoy = new Date();
  const dias = data.dias_prestamo && data.dias_prestamo > 0 ? data.dias_prestamo : 7;
  const fechaLimite = addDays(hoy, dias);

  const nextId = prestamos.length > 0 ? Math.max(...prestamos.map((p) => p.id)) + 1 : 1;
  const nuevoPrestamo: Prestamo = {
    id: nextId,
    libro_id: libro.id,
    usuario_id: usuario.id,
    fecha_prestamo: formatDate(hoy),
    fecha_limite: formatDate(fechaLimite),
    fecha_devolucion: null,
    activo: true,
  };

  libro.copias_disponibles -= 1;
  prestamos.push(nuevoPrestamo);

  save(STORAGE_KEYS.LIBROS, libros);
  save(STORAGE_KEYS.PRESTAMOS, prestamos);

  return {
    ...nuevoPrestamo,
    libro,
    usuario,
  };
}

export async function devolverPrestamo(prestamoId: number): Promise<Prestamo> {
  const prestamos = load<Prestamo[]>(STORAGE_KEYS.PRESTAMOS, SEED_PRESTAMOS);
  const libros = load<Libro[]>(STORAGE_KEYS.LIBROS, SEED_LIBROS);

  const pIndex = prestamos.findIndex((p) => p.id === prestamoId);
  if (pIndex === -1) {
    throw new Error('Préstamo no encontrado');
  }

  const prestamo = prestamos[pIndex];
  if (!prestamo.activo) {
    throw new Error('Este préstamo ya fue devuelto e inactivado anteriormente.');
  }

  prestamo.activo = false;
  prestamo.fecha_devolucion = formatDate(new Date());

  const libroIndex = libros.findIndex((l) => l.id === prestamo.libro_id);
  if (libroIndex !== -1) {
    libros[libroIndex].copias_disponibles = Math.min(
      libros[libroIndex].copias_totales,
      libros[libroIndex].copias_disponibles + 1
    );
    save(STORAGE_KEYS.LIBROS, libros);
  }

  save(STORAGE_KEYS.PRESTAMOS, prestamos);
  return prestamo;
}

export async function searchOpenLibrary(isbn: string): Promise<OpenLibraryResult> {
  const cleanIsbn = isbn.replace(/-/g, '').trim();
  if (!cleanIsbn) {
    throw new Error('El código ISBN no puede estar vacío.');
  }

  const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&format=json&jscmd=data`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Error al consultar Open Library (Código: ${res.status})`);
  }

  const data = await res.json();
  const key = `ISBN:${cleanIsbn}`;

  if (!data[key]) {
    throw new Error(`No se encontró ningún libro con el ISBN ${cleanIsbn} en Open Library.`);
  }

  const book = data[key];
  const titulo = book.title || 'Título desconocido';
  const autoresList = book.authors || [];
  const autor = autoresList.map((a: { name: string }) => a.name).join(', ') || 'Autor desconocido';

  let portadaUrl: string | null = null;
  if (book.cover) {
    portadaUrl = book.cover.large || book.cover.medium || book.cover.small || null;
  }
  if (portadaUrl && portadaUrl.startsWith('http://')) {
    portadaUrl = portadaUrl.replace('http://', 'https://');
  }

  return {
    isbn: cleanIsbn,
    titulo,
    autor,
    portada_url: portadaUrl,
  };
}

export function resetToSeedData(): void {
  localStorage.setItem(STORAGE_KEYS.LIBROS, JSON.stringify(SEED_LIBROS));
  localStorage.setItem(STORAGE_KEYS.USUARIOS, JSON.stringify(SEED_USUARIOS));
  localStorage.setItem(STORAGE_KEYS.PRESTAMOS, JSON.stringify(SEED_PRESTAMOS));
}
