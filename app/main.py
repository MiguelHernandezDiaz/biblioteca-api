import requests
from datetime import date, timedelta
from fastapi import FastAPI, Depends, HTTPException
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
    return db.query(models.Libro).all()


@app.get("/libros/{libro_id}", response_model=schemas.LibroOut)
def obtener_libro(libro_id: int, db: Session = Depends(get_db)):
    libro = db.query(models.Libro).filter(models.Libro.id == libro_id).first()
    if not libro:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    return libro


@app.delete("/libros/{libro_id}", status_code=204)
def eliminar_libro(libro_id: int, db: Session = Depends(get_db)):
    libro = db.query(models.Libro).filter(models.Libro.id == libro_id).first()
    if not libro:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    db.delete(libro)
    db.commit()


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
def devolver_libro(prestamo_id: int, db: Session = Depends(get_db)):
    prestamo = db.query(models.Prestamo).filter(models.Prestamo.id == prestamo_id).first()
    if not prestamo:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado")
    if prestamo.fecha_devolucion is not None:
        raise HTTPException(status_code=400, detail="Este préstamo ya fue devuelto")

    prestamo.fecha_devolucion = date.today()

    libro = db.query(models.Libro).filter(models.Libro.id == prestamo.libro_id).first()
    libro.copias_disponibles += 1

    db.commit()
    db.refresh(prestamo)
    return prestamo


@app.get("/prestamos/", response_model=list[schemas.PrestamoOut])
def listar_prestamos(db: Session = Depends(get_db)):
    return db.query(models.Prestamo).all()


@app.get("/google-books/{isbn}")
def buscar_en_google_books(isbn: str):
    """
    Consulta directamente la API pública de Google Books usando el ISBN.
    Limpia el formato del ISBN y asegura portadas con protocolo seguro (HTTPS).
    """
    # Limpiamos el ISBN de guiones o espacios para que la búsqueda sea exacta
    isbn_limpio = isbn.replace("-", "").strip()

    # URL oficial de la API de Google Books
    url = f"https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn_limpio}"

    try:
        # Hacemos la consulta real a Google con un tiempo límite de 5 segundos
        response = requests.get(url, timeout=5)

        # Si Google nos bloquea por límite de peticiones de la red (429)
        if response.status_code == 429:
            raise HTTPException(
                status_code=429,
                detail="Google Books ha limitado temporalmente esta dirección IP (Error 429: Too Many Requests). Intenta usar una conexión de datos móviles para bypassear el límite escolar."
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=500,
                detail=f"Error al conectar con Google Books (Código de respuesta: {response.status_code})"
            )

        data = response.json()
        if "items" not in data or len(data["items"]) == 0:
            raise HTTPException(
                status_code=404,
                detail="No se encontró ningún libro con este ISBN en la base de datos de Google Books."
            )

        # Extraer la información real del primer resultado encontrado
        info = data["items"]["volumeInfo"]
        titulo = info.get("title", "Título desconocido")
        autores = ", ".join(info.get("authors", ["Autor desconocido"]))

        # Recuperar la portada de Google Books
        portada = info.get("imageLinks", {}).get("thumbnail", None)

        # SOLUCIÓN DE IMAGEN ROTA: Forzar HTTPS para que el navegador móvil/web cargue la imagen de forma segura
        if portada and portada.startswith("http://"):
            portada = portada.replace("http://", "https://")

        return {
            "isbn": isbn_limpio,
            "titulo": titulo,
            "autor": autores,
            "portada_url": portada
        }

    except requests.exceptions.Timeout:
        raise HTTPException(
            status_code=504,
            detail="Tiempo de espera agotado al intentar conectar con Google Books."
        )
    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error de red o de comunicación: {str(e)}"
        )