from datetime import date
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict


# ---------- Libro ----------
class LibroBase(BaseModel):
    titulo: str
    autor: str
    isbn: str
    copias_totales: int = 1


class LibroCreate(LibroBase):
    pass


class LibroOut(LibroBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    copias_disponibles: int


# ---------- Usuario ----------
class UsuarioBase(BaseModel):
    nombre: str
    email: EmailStr


class UsuarioCreate(UsuarioBase):
    pass


class UsuarioOut(UsuarioBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    activo: bool


# ---------- Prestamo ----------
class PrestamoCreate(BaseModel):
    libro_id: int
    usuario_id: int
    dias_prestamo: int = 7  # por defecto una semana


class PrestamoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    libro_id: int
    usuario_id: int
    fecha_prestamo: date
    fecha_limite: date
    fecha_devolucion: Optional[date] = None
