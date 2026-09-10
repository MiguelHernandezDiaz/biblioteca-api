from django.contrib import admin
from app.models import Libro, Usuario, Prestamo

@admin.register(Libro)
class LibroAdmin(admin.ModelAdmin):
    list_display = ('id', 'titulo', 'autor', 'isbn', 'copias_disponibles', 'copias_totales', 'activo')
    list_filter = ('activo',)
    search_fields = ('titulo', 'autor', 'isbn')
    ordering = ('titulo',)


@admin.register(Usuario)
class UsuarioAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre', 'email', 'activo')
    list_filter = ('activo',)
    search_fields = ('nombre', 'email')
    ordering = ('nombre',)


@admin.register(Prestamo)
class PrestamoAdmin(admin.ModelAdmin):
    list_display = ('id', 'libro', 'usuario', 'fecha_prestamo', 'fecha_limite', 'fecha_devolucion', 'activo')
    list_filter = ('activo', 'fecha_prestamo', 'fecha_limite')
    search_fields = ('libro__titulo', 'usuario__nombre', 'usuario__email')
    ordering = ('-fecha_prestamo',)
