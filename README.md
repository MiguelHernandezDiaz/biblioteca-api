# Sistema de Gestión de Biblioteca — API

Proyecto de Tecnologías Computacionales.
Stack: **Python + FastAPI + PostgreSQL + Docker**

## Estructura del proyecto

```
biblioteca/
├── app/
│   ├── __init__.py
│   ├── main.py        # Endpoints de la API
│   ├── models.py       # Modelos de SQLAlchemy (tablas)
│   ├── schemas.py      # Esquemas de Pydantic (validación)
│   └── database.py     # Conexión a PostgreSQL
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── README.md
```

## Cómo correrlo en Lubuntu

1. Copia esta carpeta completa a tu máquina Lubuntu (por USB, git, scp, etc.)
2. Abre una terminal dentro de la carpeta `biblioteca/`
3. Levanta todo con un solo comando:

   ```bash
   docker compose up --build
   ```

4. Espera a que veas en la terminal que la API arrancó (mensaje de `Uvicorn running on http://0.0.0.0:8000`)
5. Abre tu navegador en:

   - **http://localhost:8000** → mensaje de bienvenida
   - **http://localhost:8000/docs** → documentación interactiva (Swagger UI), aquí puedes probar todos los endpoints sin escribir código

## Para detener el servidor

En la terminal donde está corriendo, presiona `Ctrl + C`, y luego:

```bash
docker compose down
```

Si quieres borrar también los datos guardados en la base de datos:

```bash
docker compose down -v
```

## Endpoints disponibles

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/libros/` | Crear un libro |
| GET | `/libros/` | Listar todos los libros |
| GET | `/libros/{id}` | Obtener un libro por ID |
| DELETE | `/libros/{id}` | Eliminar un libro |
| POST | `/usuarios/` | Crear un usuario |
| GET | `/usuarios/` | Listar usuarios |
| POST | `/prestamos/` | Registrar un préstamo (descuenta copia disponible) |
| PUT | `/prestamos/{id}/devolver` | Marcar un préstamo como devuelto |
| GET | `/prestamos/` | Listar todos los préstamos |

## Notas

- La base de datos vive dentro de un volumen de Docker (`postgres_data`), así que los datos persisten aunque apagues los contenedores (a menos que uses `-v` al bajarlos).
- El código de `app/` está montado como volumen en `docker-compose.yml`, así que si editas los archivos `.py`, el servidor se recarga solo (gracias a `--reload`).
- Las credenciales de la base de datos en este proyecto son de práctica/desarrollo. Si algún día lo llevas a producción, cámbialas y no las subas a un repositorio público.
