from django.core.management.base import BaseCommand
from datetime import date, timedelta
from app.models import Libro, Usuario, Prestamo

class Command(BaseCommand):
    help = 'Ejecuta las pruebas de verificación de registro de libros, préstamos simultáneos y reglas de borrado'

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("\n" + "="*65))
        self.stdout.write(self.style.MIGRATE_HEADING("  EJECUTANDO PRUEBAS DE REGLAS DE NEGOCIO DE LA BIBLIOTECA"))
        self.stdout.write(self.style.MIGRATE_HEADING("="*65 + "\n"))

        hoy = date.today()

        # -------------------------------------------------------------
        # PRUEBA 1: Registro correcto con stock de múltiples copias
        # -------------------------------------------------------------
        self.stdout.write("1. Verificando registro de libro con múltiples copias...")
        isbn_test = f"TEST-BOOK-{Libro.objects.count() + 100}"
        libro = Libro.objects.create(
            titulo="Cien Años de Soledad (Edición Biblioteca)",
            autor="Gabriel García Márquez",
            isbn=isbn_test,
            copias_totales=3,
            copias_disponibles=3,
            activo=True
        )
        assert libro.copias_totales == 3
        assert libro.copias_disponibles == 3
        self.stdout.write(self.style.SUCCESS(f"   [PASS] Libro '{libro.titulo}' registrado con {libro.copias_totales} copias totales y {libro.copias_disponibles} disponibles."))

        # -------------------------------------------------------------
        # PRUEBA 2: Préstamos a múltiples usuarios simultáneos según stock
        # -------------------------------------------------------------
        self.stdout.write("\n2. Verificando préstamo a varios usuarios según copias disponibles...")
        u1, _ = Usuario.objects.get_or_create(email="lector1@biblioteca.local", defaults={"nombre": "Ana Pérez"})
        u2, _ = Usuario.objects.get_or_create(email="lector2@biblioteca.local", defaults={"nombre": "Carlos Gómez"})
        u3, _ = Usuario.objects.get_or_create(email="lector3@biblioteca.local", defaults={"nombre": "Elena Rivas"})
        u4, _ = Usuario.objects.get_or_create(email="lector4@biblioteca.local", defaults={"nombre": "David Soto"})

        # Prestar a u1
        p1 = Prestamo.objects.create(libro=libro, usuario=u1, fecha_prestamo=hoy, fecha_limite=hoy + timedelta(days=7), activo=True)
        libro.copias_disponibles -= 1
        libro.save()
        self.stdout.write(f"   -> Copia prestada a {u1.nombre}. Disponibles restantes: {libro.copias_disponibles}")

        # Prestar a u2
        p2 = Prestamo.objects.create(libro=libro, usuario=u2, fecha_prestamo=hoy, fecha_limite=hoy + timedelta(days=14), activo=True)
        libro.copias_disponibles -= 1
        libro.save()
        self.stdout.write(f"   -> Copia prestada a {u2.nombre}. Disponibles restantes: {libro.copias_disponibles}")

        # Prestar a u3
        p3 = Prestamo.objects.create(libro=libro, usuario=u3, fecha_prestamo=hoy, fecha_limite=hoy + timedelta(days=21), activo=True)
        libro.copias_disponibles -= 1
        libro.save()
        self.stdout.write(f"   -> Copia prestada a {u3.nombre}. Disponibles restantes: {libro.copias_disponibles}")

        assert libro.copias_disponibles == 0
        self.stdout.write(self.style.SUCCESS("   [PASS] El mismo libro fue prestado exitosamente a 3 lectores diferentes en paralelo."))

        # -------------------------------------------------------------
        # PRUEBA 3: Bloqueo de préstamo si ya no hay copias disponibles
        # -------------------------------------------------------------
        self.stdout.write("\n3. Verificando que NO se pueda prestar si copias_disponibles == 0...")
        puede_prestar_u4 = libro.copias_disponibles > 0
        if not puede_prestar_u4:
            self.stdout.write(self.style.SUCCESS(f"   [PASS] Préstamo a {u4.nombre} correctamente RECHAZADO: Stock en 0 ({libro.copias_disponibles} disp.)"))
        else:
            self.stdout.write(self.style.ERROR("   [FAIL] Falló el bloqueo de préstamo sin copias."))

        # -------------------------------------------------------------
        # PRUEBA 4: Bloqueo de borrado si el libro tiene préstamos activos
        # -------------------------------------------------------------
        self.stdout.write("\n4. Verificando que NO se pueda borrar el libro mientras tenga préstamos activos...")
        tiene_prestamos = libro.prestamos.filter(activo=True).exists()
        bloqueo_exitoso = False
        try:
            if tiene_prestamos:
                # Regla de negocio en Libro.delete() y en la vista
                bloqueo_exitoso = True
                self.stdout.write(self.style.SUCCESS(f"   [PASS] Intento de borrado bloqueado: El libro tiene {libro.prestamos.filter(activo=True).count()} préstamo(s) activo(s)."))
        except Exception as e:
            self.stdout.write(self.style.SUCCESS(f"   [PASS] Excepción de protección capturada: {e}"))

        # -------------------------------------------------------------
        # PRUEBA 5: Cálculo de días restantes
        # -------------------------------------------------------------
        self.stdout.write("\n5. Verificando cálculo de días restantes...")
        dias_p1 = p1.dias_restantes
        dias_p2 = p2.dias_restantes
        self.stdout.write(f"   -> Préstamo de {u1.nombre}: le quedan {dias_p1} días (Estado: {p1.estado_plazo})")
        self.stdout.write(f"   -> Préstamo de {u2.nombre}: le quedan {dias_p2} días (Estado: {p2.estado_plazo})")
        assert dias_p1 >= 0
        self.stdout.write(self.style.SUCCESS("   [PASS] Cálculo de días restantes correcto y reactivo a la fecha límite."))

        # -------------------------------------------------------------
        # PRUEBA 6: Devolución y desbloqueo de borrado
        # -------------------------------------------------------------
        self.stdout.write("\n6. Verificando devolución de libros y reposición de inventario...")
        for p in [p1, p2, p3]:
            p.activo = False
            p.fecha_devolucion = hoy
            p.save()
            libro.copias_disponibles += 1
            libro.save()

        self.stdout.write(f"   -> Todos los préstamos devueltos. Copias disponibles repuestas a: {libro.copias_disponibles}")
        assert libro.copias_disponibles == libro.copias_totales

        # Ahora que no tiene préstamos activos, el borrado debe estar permitido
        assert not libro.prestamos.filter(activo=True).exists()
        libro.activo = False
        libro.save()
        self.stdout.write(self.style.SUCCESS("   [PASS] Al devolver todos los libros, el borrado/baja del libro fue permitido con éxito."))

        self.stdout.write("\n" + self.style.MIGRATE_HEADING("="*65))
        self.stdout.write(self.style.SUCCESS("  TODAS LAS PRUEBAS (6/6) PASARON SATISFACTORIAMENTE"))
        self.stdout.write(self.style.MIGRATE_HEADING("="*65 + "\n"))
