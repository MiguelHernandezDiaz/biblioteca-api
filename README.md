# Sistema de Gestión de Biblioteca — Frontend & Escáner ISBN

Frontend moderno y responsivo para el sistema de biblioteca con escáner de códigos de barras ISBN en tiempo real mediante webcam y cámara de smartphone, integrado con la API pública de **Open Library**.

## Características Principales

1. **Escáner ISBN con Cámara Web / Móvil**:
   - Detección en vivo de códigos de barras ISBN-13 y EAN-13 utilizando `@zxing/browser`.
   - Soporte para alternar cámaras (cámara frontal / trasera con macro).
   - Control de linterna / flash en dispositivos móviles compatibles.
   - Efectos sonoros y hápticos al detectar el código.
   - Subida de fotografías o búsqueda manual con libros de ejemplo listos para probar.

2. **Integración con Open Library**:
   - Al escanear un ISBN, autocompleta instantáneamente título, autor(es), año de publicación, editorial y portada oficial en alta resolución.
   - Registro en el catálogo con un solo clic especificando el número de copias.

3. **Catálogo de Libros (`/libros/`)**:
   - Visualización de libros con portadas, disponibilidad en tiempo real e ISBN.
   - Búsqueda y filtrado por título, autor, ISBN y stock.
   - **Regla 1 de Integridad**: Protección que impide eliminar libros que tengan préstamos activos sin devolver.

4. **Préstamos y Devoluciones (`/prestamos/`)**:
   - Préstamo de libros con selección de lector y plazo (7, 14, 21, 30 días).
   - Descuento y reposición automática de copias disponibles.
   - **Regla 2**: Devolución con registro de fecha de retorno y reactivación de inventario.
   - Identificación visual de préstamos vencidos con cálculo de días de atraso.

5. **Gestión de Lectores (`/usuarios/`)**:
   - Registro de usuarios con validación de correo electrónico único.
   - Historial y préstamos activos por usuario.

6. **Consola y Documentación de Endpoints**:
   - Probador interactivo de los endpoints REST originales (`/libros/`, `/usuarios/`, `/prestamos/`, `/open-library/{isbn}`).

