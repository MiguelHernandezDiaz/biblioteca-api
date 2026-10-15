# Plan de Arquitectura Didáctica y Simplificación de Base de Datos (Revisión)

Plan integral actualizado para clarificar la arquitectura del sistema (Linux, Docker, Nginx, Django, React, PostgreSQL), responder a todas las dudas de funcionamiento y simplificar la pestaña de PostgreSQL en el frontend administrativo según tus especificaciones exactas.

## User Review & Critical Decisions

> [!IMPORTANT]
> Decisiones y ajustes solicitados en esta revisión:
> 1. **Pestaña PostgreSQL y Dependencias del Sistema:**
>    - **Eliminado:** Se descartan el mapa visual de relaciones y la guía de consultas SQL para la terminal.
>    - **Conservado:** Se mantiene únicamente el **selector de las 3 tablas principales** (`usuarios`, `libros`, `prestamos`) y el **visualizador limpio de registros y filas** con búsqueda, conteo real e inspección de datos.
> 2. **Deprecación de `/admin` de Django:** Se confirma que la interfaz administrativa clásica de Django queda deprecada para este proyecto; toda la gestión administrativa (libros, usuarios, préstamos y PostgreSQL) vive 100% en el frontend de React.
> 3. **Preservación de Docker y Linux:** Se mantiene intacta la infraestructura de contenedores Docker (`docker-compose.yml`) sobre Ubuntu/Lubuntu tal como lo exige la materia.

- **Decisión 1**: Enfoque minimalista en la pestaña de PostgreSQL: solo selector de tablas y tabla de filas/registros.
- **Decisión 2**: Una sola interfaz de usuario (React SPA), eliminando cualquier necesidad de usar la interfaz `/admin` de Django.
- **Decisión 3**: Entorno inalterable basado en contenedores Docker y sistema operativo Linux (Ubuntu/Lubuntu).

---

## 1. Respuestas Didácticas a tus Preguntas sobre la Arquitectura

### ¿Qué es `https://localhost/` y dónde vive la interfaz?
- **¿Qué es `localhost`?** `localhost` es el alias que tu sistema operativo Linux le da a tu propia computadora (dirección IP `127.0.0.1`). Al poner `https://localhost/`, tu navegador se conecta a los puertos locales de tu máquina (puerto 443 para HTTPS).
- **¿Quién atiende esa dirección?** La atiende el contenedor de **Nginx**. Nginx recibe la petición en tu Linux y entrega los archivos compilados del frontend.
- **¿Dónde "vive" la interfaz?** La interfaz **vive y se ejecuta en tu navegador web** (Chrome, Firefox, etc.). El servidor no dibuja las pantallas; el navegador descarga los archivos de JavaScript/CSS de React y los ejecuta localmente en el cliente.
- **¿Qué pasa con `https://localhost/admin`?** La ruta `/admin` pertenece a la interfaz por defecto que genera Django. Como ya construimos una interfaz de administración completa en React (con gestión de libros, préstamos, usuarios y visualizador de BD), **esa interfaz `/admin` de Django queda deprecada y deshabilitada**. Ya no necesitas dos interfaces separadas.

---

### ¿Cuál es el Frontend y de qué se compone?
El frontend es la aplicación que corre en el navegador web del usuario.
- **Tecnologías:** React 19, TypeScript, Vite y Tailwind CSS (ubicado en el directorio `src/`).
- **Componentes clave:**
  - `src/App.tsx`: Es el componente raíz. Gestiona el enrutamiento de vistas y el estado de la sesión (si el usuario es lector o administrador autenticado con contraseña).
  - `src/components/BookCatalogView.tsx`: Catálogo para lectores y administradores. Muestra solo los libros disponibles para préstamo.
  - `src/components/AdminLoansView.tsx`: Panel para registrar préstamos y devoluciones de ejemplares.
  - `src/components/AdminBooksView.tsx`: Panel para crear, editar y dar de baja libros.
  - `src/components/DatabaseInspectorView.tsx`: Visor directo de las 3 tablas de PostgreSQL para administradores.
  - `src/services/api.ts`: Capa de red que contiene las funciones `fetch()` para llamar al backend.

---

### ¿Cuál es el Backend y de qué se compone?
El backend es el servidor lógico que procesa las reglas del negocio y se conecta a la base de datos.
- **Tecnologías:** Python 3, Django y Django REST Framework (ubicado en el directorio `app/`).
- **Componentes clave:**
  - `app/models.py`: Define la estructura de las tablas en Python mediante el **ORM** (`Usuario`, `Libro`, `Prestamo`).
  - `app/views.py`: Son las funciones que reciben las solicitudes HTTP, aplican la lógica (por ejemplo: "¿quedan copias antes de prestar?", "¿la contraseña coincide?") y generan la respuesta.
  - `app/serializers.py`: Convierten los objetos de base de datos de Python a texto **JSON** para que React los entienda, y viceversa.
  - `app/urls.py`: El listado de rutas de la API (`/api/libros/`, `/api/prestamos/`, `/api/auth/login/`, etc.).
  - `biblioteca/settings.py`: Parámetros de configuración, credenciales de conexión a PostgreSQL y seguridad.

---

### ¿Qué API se está usando y cómo se comunican las herramientas?
- **Tipo de API:** Es una **REST API (Application Programming Interface)** propia del proyecto creada con Django REST Framework. No es un servicio de terceros; es tu propia API interna que se comunica usando el protocolo HTTP y mensajes en formato JSON.
- **Flujo paso a paso de una acción (ejemplo: un lector pide un libro):**

```
 [1] Usuario hace clic en "Solicitar Préstamo" en su Navegador
                               │
                               ▼
 [2] React (src/services/api.ts) envía:
     POST https://localhost/api/prestamos/
     Body: { "libro_id": 4, "usuario_id": 2 }
                               │
                               ▼
 [3] NGINX (puerto 443 HTTPS en Linux)
     Detecta el prefijo "/api/" y reenvía internamente la petición a:
     http://web:8000/api/prestamos/ (Proxy Inverso)
                               │
                               ▼
 [4] DJANGO (app/views.py)
     - Valida que el libro exista y tenga copias disponibles.
     - Ejecuta la sentencia SQL en PostgreSQL a través del ORM:
       UPDATE libros SET copias_disponibles = copias_disponibles - 1 WHERE id = 4;
       INSERT INTO prestamos (libro_id, usuario_id, ...) VALUES (4, 2, ...);
                               │
                               ▼
 [5] POSTGRESQL (puerto 5432 en Linux)
     Guarda los cambios de forma persistente y confirma la transacción.
                               │
                               ▼
 [6] DJANGO responde a Nginx con código HTTP 201 Created y JSON:
     { "id": 12, "libro": "Cien Años de Soledad", "estado": "activo" }
                               │
                               ▼
 [7] NGINX se lo reenvía al Navegador.
                               │
                               ▼
 [8] React recibe el JSON y actualiza la pantalla al instante sin recargar la página.
```

---

## 2. Especificación de Cambios en la UI: `DatabaseInspectorView.tsx`

De acuerdo con tus requerimientos exactos:

1. **Elementos que se Retiran:**
   - Se elimina el bloque del mapa visual de relaciones (diagramas o tarjetas de Foreign Keys).
   - Se elimina el bloque de la terminal con la guía de comandos SQL prácticos.

2. **Elementos que se Conservan y Perfeccionan:**
   - **Selector de Tablas de Negocio:**
     - Botones/Pestañas para alternar entre las 3 tablas:
       1. 👥 **`usuarios`**
       2. 📚 **`libros`**
       3. 📋 **`prestamos`**
     - Indicador del total de registros encontrados por tabla.
     - Barra de búsqueda rápida para filtrar registros en pantalla por nombre, título, correo o ID.
   - **Visualizador de Registros y Filas:**
     - Tabla estilizada con encabezados claros que muestran el nombre de la columna y su tipo de dato SQL (`VARCHAR`, `INT`, `BOOLEAN`, `TIMESTAMP`).
     - Filas con tipografía monoespaciada para identificadores y fechas, con badges legibles para estados booleanos (`activo = true/false`, roles `admin/lector`).
     - Modal o vista de detalle al hacer clic en cualquier fila para inspeccionar todos los campos de ese registro en particular.

---

## 3. Plan de Ejecución (Paso a Paso)

1. **Modificación de `src/components/DatabaseInspectorView.tsx`:**
   - Remover las secciones del mapa visual y de la guía de comandos de terminal.
   - Refactorizar la vista para centrar la experiencia en el selector superior de las 3 tablas y la tabla de datos de registros.
   - Incluir buscador reactivo y modal de detalle de fila.

2. **Verificación del Backend y Rutas API:**
   - Asegurar que `/sistema/db-inspector/` entregue limpia la estructura y los datos de las 3 tablas (`usuarios`, `libros`, `prestamos`).
   - Confirmar que `/admin` de Django no interfiera y que toda acción administrativa opere desde el frontend.

3. **Compilación y Pruebas de Calidad:**
   - Ejecutar `compile_applet` para validar que el bundle de React y TypeScript compile sin errores ni advertencias.
   - Probar la navegación entre las 3 tablas y verificar que los datos carguen de manera fluida.
