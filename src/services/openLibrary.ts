import { OpenLibraryResult } from '../types';

export async function fetchFromOpenLibrary(rawIsbn: string): Promise<OpenLibraryResult> {
  const cleanIsbn = rawIsbn.replace(/[-\s]/g, '').trim();
  if (!cleanIsbn) {
    throw new Error('Por favor ingresa un ISBN válido.');
  }

  const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(
    cleanIsbn
  )}&format=json&jscmd=data`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Error al conectar con Open Library (Código: ${response.status})`
    );
  }

  const data = await response.json();
  const key = `ISBN:${cleanIsbn}`;

  if (!data || !data[key]) {
    throw new Error(
      `No se encontró ningún libro con el ISBN ${cleanIsbn} en Open Library.`
    );
  }

  const bookInfo = data[key];
  const titulo = bookInfo.title || 'Título desconocido';

  // Autores
  let autor = 'Autor desconocido';
  if (Array.isArray(bookInfo.authors) && bookInfo.authors.length > 0) {
    autor = bookInfo.authors.map((a: { name?: string }) => a.name).filter(Boolean).join(', ') || 'Autor desconocido';
  } else if (bookInfo.by_statement) {
    autor = bookInfo.by_statement;
  }

  // Portada (cover)
  let portada_url: string | null = null;
  if (bookInfo.cover) {
    portada_url =
      bookInfo.cover.large ||
      bookInfo.cover.medium ||
      bookInfo.cover.small ||
      null;
  }

  // Fallback to standard Open Library cover URL if not directly in cover object
  if (!portada_url) {
    portada_url = `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-M.jpg?default=false`;
  } else if (portada_url.startsWith('http://')) {
    portada_url = portada_url.replace('http://', 'https://');
  }

  return {
    isbn: cleanIsbn,
    titulo,
    autor,
    portada_url,
    publish_date: bookInfo.publish_date,
    number_of_pages: bookInfo.number_of_pages,
    publisher: Array.isArray(bookInfo.publishers) && bookInfo.publishers.length > 0
      ? bookInfo.publishers[0].name
      : undefined,
  };
}
