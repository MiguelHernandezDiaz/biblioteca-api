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
