from django.contrib import admin
from django.contrib import messages
from django.utils.html import format_html
from app.models import Libro, Usuario, Prestamo

@admin.register(Libro)
class LibroAdmin(admin.ModelAdmin):
    list_display = ('id', 'titulo', 'autor', 'isbn', 'disponibilidad_display', 'activo')
    list_filter = ('activo',)
    search_fields = ('titulo', 'autor', 'isbn')
    ordering = ('titulo',)
    readonly_fields = ('copias_disponibles',)

    def disponibilidad_display(self, obj):
        if obj.copias_disponibles > 0:
            color = 'green'
        else:
            color = 'red'
        return format_html(
            '<span style="font-weight:bold; color: {};">{}/{} disponibles</span>',
            color,
            obj.copias_disponibles,
            obj.copias_totales
        )
    disponibilidad_display.short_description = 'Disponibilidad'

    def delete_model(self, request, obj):
        # REGLA: No se puede borrar si tiene préstamos activos
        prestamos_activos = obj.prestamos.filter(activo=True)
        if prestamos_activos.exists():
            messages.error(
                request,
                f"ERROR: No se puede eliminar el libro '{obj.titulo}' porque tiene {prestamos_activos.count()} préstamo(s) activo(s) sin devolver."
            )
            return
        super().delete_model(request, obj)

    def delete_queryset(self, request, queryset):
        # Proteger borrado masivo
        bloqueados = []
        permitidos = []
        for libro in queryset:
            if libro.prestamos.filter(activo=True).exists():
                bloqueados.append(libro.titulo)
            else:
                permitidos.append(libro)

        if bloqueados:
            messages.error(
                request,
                f"No se pudieron eliminar {len(bloqueados)} libros porque tienen préstamos activos: {', '.join(bloqueados[:5])}"
            )
        if permitidos:
            for libro in permitidos:
                libro.delete()
            messages.success(request, f"Se eliminaron {len(permitidos)} libros sin préstamos activos.")


@admin.register(Usuario)
class UsuarioAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre', 'email', 'rol', 'activo')
    list_filter = ('rol', 'activo')
    search_fields = ('nombre', 'email')
    ordering = ('nombre',)

    def delete_model(self, request, obj):
        if obj.prestamos.filter(activo=True).exists():
            messages.error(
                request,
                f"ERROR: No se puede eliminar el usuario '{obj.nombre}' porque tiene préstamos activos pendientes de devolución."
            )
            return
        super().delete_model(request, obj)


@admin.register(Prestamo)
class PrestamoAdmin(admin.ModelAdmin):
    list_display = ('id', 'libro', 'usuario', 'fecha_prestamo', 'fecha_limite', 'plazo_display', 'activo')
    list_filter = ('activo', 'fecha_prestamo', 'fecha_limite')
    search_fields = ('libro__titulo', 'usuario__nombre', 'usuario__email')
    ordering = ('-fecha_prestamo',)
    actions = ['marcar_como_devueltos']

    def plazo_display(self, obj):
        if not obj.activo:
            return format_html('<span style="color: gray;">Devuelto el {}</span>', obj.fecha_devolucion or 's/f')
        dias = obj.dias_restantes
        if dias < 0:
            return format_html('<span style="color: red; font-weight: bold;">Atrasado por {} días</span>', abs(dias))
        elif dias == 0:
            return format_html('<span style="color: orange; font-weight: bold;">Vence hoy</span>')
        return format_html('<span style="color: green;">{} días restantes</span>', dias)
    plazo_display.short_description = 'Plazo / Días'

    def marcar_como_devueltos(self, request, queryset):
        from datetime import date
        count = 0
        for p in queryset.filter(activo=True):
            p.activo = False
            p.fecha_devolucion = date.today()
            p.save()
            libro = p.libro
            libro.copias_disponibles = min(libro.copias_totales, libro.copias_disponibles + 1)
            libro.save()
            count += 1
        messages.success(request, f"{count} préstamos marcados como devueltos e inventario repuesto.")
    marcar_como_devueltos.short_description = 'Marcar préstamos seleccionados como devueltos'
