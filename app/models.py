from django.db import models
from django.core.exceptions import ValidationError
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
        verbose_name_plural = 'Libros'

    def __str__(self):
        return f"{self.titulo} ({self.isbn}) [{self.copias_disponibles}/{self.copias_totales} disp.]"

    def delete(self, *args, **kwargs):
        # Regla de integridad: No se puede borrar si tiene préstamos activos
        if self.prestamos.filter(activo=True).exists():
            raise ValidationError(
                f"No se puede eliminar el libro '{self.titulo}' porque tiene préstamos activos sin devolver."
            )
        super().delete(*args, **kwargs)


class Usuario(models.Model):
    ROLES = (
        ('usuario', 'Lector / Socio'),
        ('admin', 'Administrador'),
    )
    nombre = models.CharField(max_length=255)
    email = models.EmailField(unique=True, db_index=True)
    password = models.CharField(max_length=128, default='123456', blank=True)
    rol = models.CharField(max_length=20, choices=ROLES, default='usuario')
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'usuarios'
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'

    def __str__(self):
        return f"{self.nombre} <{self.email}> ({self.get_rol_display()})"


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

    @property
    def dias_restantes(self):
        if not self.activo:
            return 0
        hoy = date.today()
        return (self.fecha_limite - hoy).days

    @property
    def estado_plazo(self):
        if not self.activo:
            return 'devuelto'
        dias = self.dias_restantes
        if dias < 0:
            return 'atrasado'
        elif dias == 0:
            return 'vence_hoy'
        return 'al_dia'
