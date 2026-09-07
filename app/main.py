import requests
from datetime import date, timedelta
from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import engine, get_db

# Crea las tablas en la base de datos si no existen (basado en app/models.py)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="API - Sistema de Gestión de Biblioteca",
    description="Proyecto de Tecnologías Computacionales",
    version="1.0.0",
)


@app.get("/")
def root():
    return {"mensaje": "API de biblioteca funcionando. Visita /docs para probarla."}

@app.get("/scanner", response_class=FileResponse)
def get_scanner():
    import os
    return FileResponse(os.path.join(os.path.dirname(__file__), "scanner.html"))


# ==================== LIBROS ====================

@app.post("/libros/", response_model=schemas.LibroOut, status_code=201)
def crear_libro(libro: schemas.LibroCreate, db: Session = Depends(get_db)):
    existente = db.query(models.Libro).filter(models.Libro.isbn == libro.isbn).first()
    if existente:
        raise HTTPException(status_code=400, detail="Ya existe un libro con ese ISBN")

    nuevo_libro = models.Libro(
        titulo=libro.titulo,
        autor=libro.autor,
        isbn=libro.isbn,
        copias_totales=libro.copias_totales,
        copias_disponibles=libro.copias_totales,
        portada_url=libro.portada_url
    )
    db.add(nuevo_libro)
    db.commit()
    db.refresh(nuevo_libro)
    return nuevo_libro


@app.get("/libros/", response_model=list[schemas.LibroOut])
def listar_libros(db: Session = Depends(get_db)):
    return db.query(models.Libro).filter(models.Libro.activo == True).all()


@app.get("/libros/{libro_id}", response_model=schemas.LibroOut)
def obtener_libro(libro_id: int, db: Session = Depends(get_db)):
    libro = db.query(models.Libro).filter(models.Libro.id == libro_id).first()
    if not libro:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    return libro


@app.delete("/libros/{libro_id}", status_code=204)
def eliminar_libro(libro_id: int, db: Session = Depends(get_db)):
    libro = db.query(models.Libro).filter(models.Libro.id == libro_id, models.Libro.activo == True).first()
    if not libro:
        raise HTTPException(status_code=404, detail="Libro no encontrado o ya eliminado")

    # REGLA 1: No dejar borrar si hay un préstamo activo (activo == True)
    prestamo_activo = db.query(models.Prestamo).filter(
        models.Prestamo.libro_id == libro_id,
        models.Prestamo.activo == True
    ).first()

    if prestamo_activo:
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar el libro porque actualmente tiene un préstamo activo sin devolver."
        )

    # Si no tiene préstamos activos, hacemos borrado lógico
    libro.activo = False
    db.commit()
    return None


# ==================== USUARIOS ====================

@app.post("/usuarios/", response_model=schemas.UsuarioOut, status_code=201)
def crear_usuario(usuario: schemas.UsuarioCreate, db: Session = Depends(get_db)):
    existente = db.query(models.Usuario).filter(models.Usuario.email == usuario.email).first()
    if existente:
        raise HTTPException(status_code=400, detail="Ya existe un usuario con ese email")

    nuevo_usuario = models.Usuario(nombre=usuario.nombre, email=usuario.email)
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    return nuevo_usuario


@app.get("/usuarios/", response_model=list[schemas.UsuarioOut])
def listar_usuarios(db: Session = Depends(get_db)):
    return db.query(models.Usuario).all()


# ==================== PRÉSTAMOS ====================

@app.post("/prestamos/", response_model=schemas.PrestamoOut, status_code=201)
def crear_prestamo(prestamo: schemas.PrestamoCreate, db: Session = Depends(get_db)):
    libro = db.query(models.Libro).filter(models.Libro.id == prestamo.libro_id).first()
    if not libro:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    if libro.copias_disponibles <= 0:
        raise HTTPException(status_code=400, detail="No hay copias disponibles de este libro")

    usuario = db.query(models.Usuario).filter(models.Usuario.id == prestamo.usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    hoy = date.today()
    nuevo_prestamo = models.Prestamo(
        libro_id=libro.id,
        usuario_id=usuario.id,
        fecha_prestamo=hoy,
        fecha_limite=hoy + timedelta(days=prestamo.dias_prestamo),
    )

    libro.copias_disponibles -= 1

    db.add(nuevo_prestamo)
    db.commit()
    db.refresh(nuevo_prestamo)
    return nuevo_prestamo


@app.put("/prestamos/{prestamo_id}/devolver", response_model=schemas.PrestamoOut)
@app.put("/prestamos/{prestamo_id}/devolver", response_model=schemas.PrestamoOut)
def devolver_libro(prestamo_id: int, db: Session = Depends(get_db)):
    prestamo = db.query(models.Prestamo).filter(models.Prestamo.id == prestamo_id).first()
    if not prestamo:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado")

    if not prestamo.activo:  # O prestamo.fecha_devolucion is not None
        raise HTTPException(status_code=400, detail="Este préstamo ya fue devuelto e inactivado")

    # Registrar fecha de devolución
    prestamo.fecha_devolucion = date.today()

    # REGLA 2: El préstamo pasa a estar inactivo (ahora es historial)
    prestamo.activo = False

    # Devolver copia al inventario del libro
    libro = db.query(models.Libro).filter(models.Libro.id == prestamo.libro_id).first()
    if libro:
        libro.copias_disponibles += 1

    db.commit()
    db.refresh(prestamo)
    return prestamo


@app.get("/prestamos/", response_model=list[schemas.PrestamoOut])
def listar_prestamos(db: Session = Depends(get_db)):
    return db.query(models.Prestamo).all()


@app.get("/open-library/{isbn}")
def buscar_en_open_library(isbn: str):
    """
    Consulta directamente la API pública de Open Library usando el ISBN.
    No requiere API Key y evita bloqueos por límite de peticiones (429).
    """
    # Limpiamos el ISBN de guiones o espacios para asegurar la búsqueda
    isbn_limpio = isbn.replace("-", "").strip()

    # URL de la API de Open Library (solicitando formato JSON y datos enriquecidos)
    url = f"https://openlibrary.org/api/books?bibkeys=ISBN:{isbn_limpio}&format=json&jscmd=data"

    try:
        response = requests.get(url, timeout=5)

        if response.status_code != 200:
            raise HTTPException(
                status_code=500,
                detail=f"Error al conectar con Open Library (Código: {response.status_code})"
            )

        data = response.json()
        key = f"ISBN:{isbn_limpio}"

        # Open Library devuelve un objeto vacío si no encuentra el ISBN
        if key not in data:
            raise HTTPException(
                status_code=404,
                detail="No se encontró ningún libro con este ISBN en Open Library."
            )

        libro_info = data[key]
        titulo = libro_info.get("title", "Título desconocido")

        # Open Library devuelve los autores como una lista de diccionarios: [{"name": "Haruki Murakami"}]
        autores_list = libro_info.get("authors", [])
        autor = ", ".join([a.get("name") for a in autores_list]) if autores_list else "Autor desconocido"

        # Recuperar la portada (Open Library ofrece tamaños: 'small', 'medium', 'large')
        portada_dict = libro_info.get("cover", {})
        portada_url = portada_dict.get("large", portada_dict.get("medium", portada_dict.get("small", None)))

        # Forzar HTTPS en la imagen para evitar bloqueos de seguridad en el navegador
        if portada_url and portada_url.startswith("http://"):
            portada_url = portada_url.replace("http://", "https://")

        return {
            "isbn": isbn_limpio,
            "titulo": titulo,
            "autor": autor,
            "portada_url": portada_url
        }

    except requests.exceptions.Timeout:
        raise HTTPException(
            status_code=504,
            detail="Tiempo de espera agotado al conectar con Open Library."
        )
    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error de red o de comunicación: {str(e)}"
        )