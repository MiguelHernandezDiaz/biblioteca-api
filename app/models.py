from django.db import models
from datetime import date

class Libro(models.Model):
    titulo = models.CharField(max_length=255)
    autor = models.CharField(max_length=255)
    isbn = models.CharField(max_length=50, unique=True, db_index=True)
    copias_totales = models.PositiveIntegerField(default=1)
    copias_disponibles = models.PositiveIntegerField(default=1)
    portada_url = models.TextField(blank=True, null=True)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'libros'
        verbose_name = 'Libro'
        verbose_name = 'Libros'

    def __str__(self):
        return f"{self.titulo} ({self.isbn})"


class Usuario(models.Model):
    nombre = models.CharField(max_length=255)
    email = models.EmailField(unique=True, db_index=True)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'usuarios'
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'

    def __str__(self):
        return f"{self.nombre} <{self.email}>"


class Prestamo(models.Model):
    libro = models.ForeignKey(Libro, on_delete=models.CASCADE, related_name='prestamos')
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='prestamos')
    fecha_prestamo = models.DateField(default=date.today)
    fecha_limite = models.DateField()
    fecha_devolucion = models.DateField(blank=True, null=True)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'prestamos'
        verbose_name = 'Préstamo'
        verbose_name_plural = 'Préstamos'

    def __str__(self):
        return f"Préstamo #{self.id}: {self.libro.titulo} -> {self.usuario.nombre}"
