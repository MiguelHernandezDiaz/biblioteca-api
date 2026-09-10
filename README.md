# Sistema de Gestión de Biblioteca — API en Django

Proyecto de Tecnologías Computacionales.
Stack: **Python + Django 5 + Django REST Framework + PostgreSQL + Docker + Nginx (SSL)**

## Estructura del proyecto
```text
biblioteca/
├── biblioteca/             # Configuración central de Django
│   ├── settings.py         # Conexión a PostgreSQL/SQLite, CORS, Apps
│   ├── urls.py             # Enrutador principal
│   ├── wsgi.py
│   └── asgi.py
├── app/                    # Aplicación de gestión de biblioteca
│   ├── models.py           # Modelos de Django ORM (Libro, Usuario, Prestamo)
│   ├── serializers.py      # Serializadores de Django REST Framework
│   ├── views.py            # Vistas y endpoints REST
│   ├── urls.py             # Rutas (/libros/, /usuarios/, /prestamos/, etc.)
│   ├── admin.py            # Panel de administración de Django
│   ├── scanner.html        # Interfaz web del escáner ISBN por cámara
│   └── migrations/         # Migraciones de base de datos
├── manage.py               # CLI de Django
├── Dockerfile              # Contenedor de la API (Python 3.12)
├── Dockerfile.nginx        # Servidor Nginx con soporte SSL automático
├── docker-compose.yml      # Orquestación (Postgres + Django + Nginx)
├── nginx.conf              # Configuración de Nginx
├── requirements.txt        # Dependencias de Python (Django, DRF, psycopg2, etc.)
└── README.md
```

## Cómo correrlo con Docker (Lubuntu o cualquier SO)
1. Abre una terminal dentro de la carpeta del proyecto.
2. Levanta todo con un solo comando:
   ```bash
   docker compose up --build
   ```
3. Espera a que se apliquen las migraciones automáticas y veas en la terminal que Django arrancó:
   `Starting development server at http://0.0.0.0:8000/`
4. Abre tu navegador:
   - **http://localhost** o **https://localhost** → Mensaje de bienvenida de la API
   - **http://localhost/admin/** → Panel de Administración de Django
   - **http://localhost/scanner** o **https://<IP_DE_TU_PC>/scanner** → Escáner de libros por cámara (HTTPS para móviles)

## Crear un Superusuario para el Administrador de Django
En otra terminal dentro de la carpeta del proyecto:
```bash
docker compose exec api python manage.py createsuperuser
```
Ingresa tu nombre de usuario, correo y contraseña. Luego ingresa a `/admin/` para gestionar libros, usuarios y préstamos con la interfaz administrativa de Django.

## Endpoints REST Disponibles
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/libros/` | Listar todos los libros activos |
| POST | `/libros/` | Crear un nuevo libro |
| GET | `/libros/<id>/` | Ver detalle de un libro |
| DELETE | `/libros/<id>/` | Borrado lógico (valida préstamos activos) |
| GET | `/usuarios/` | Listar todos los usuarios |
| POST | `/usuarios/` | Crear un usuario |
| GET | `/prestamos/` | Listar todos los préstamos |
| POST | `/prestamos/` | Registrar un préstamo (descuenta copias) |
| PUT | `/prestamos/<id>/devolver/` | Marcar como devuelto e incrementar stock |
| GET | `/open-library/<isbn>/` | Consulta de metadatos en Open Library |
| GET | `/scanner` | Interfaz interactiva de escaneo por cámara |
