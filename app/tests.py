from django.test import TestCase
from django.core.exceptions import ValidationError
from datetime import date, timedelta
from app.models import Libro, Usuario, Prestamo

class BibliotecaReglasTestCase(TestCase):
    def setUp(self):
        self.libro = Libro.objects.create(
            titulo="El Quijote",
            autor="Miguel de Cervantes",
            isbn="978-8424115456",
            copias_totales=2,
            copias_disponibles=2,
            activo=True
        )
        self.u1 = Usuario.objects.create(nombre="Lector Uno", email="u1@test.com", rol="usuario")
        self.u2 = Usuario.objects.create(nombre="Lector Dos", email="u2@test.com", rol="usuario")
        self.u3 = Usuario.objects.create(nombre="Lector Tres", email="u3@test.com", rol="usuario")

    def test_multiples_prestamos_segun_disponibilidad(self):
        # 1. Copias disponibles iniciales
        self.assertEqual(self.libro.copias_disponibles, 2)

        # 2. Prestar a u1
        p1 = Prestamo.objects.create(
            libro=self.libro,
            usuario=self.u1,
            fecha_prestamo=date.today(),
            fecha_limite=date.today() + timedelta(days=7),
            activo=True
        )
        self.libro.copias_disponibles -= 1
        self.libro.save()
        self.assertEqual(self.libro.copias_disponibles, 1)

        # 3. Prestar a u2
        p2 = Prestamo.objects.create(
            libro=self.libro,
            usuario=self.u2,
            fecha_prestamo=date.today(),
            fecha_limite=date.today() + timedelta(days=14),
            activo=True
        )
        self.libro.copias_disponibles -= 1
        self.libro.save()
        self.assertEqual(self.libro.copias_disponibles, 0)

        # 4. Verificar que ya no hay copias disponibles para un tercer usuario
        self.assertTrue(self.libro.copias_disponibles <= 0)

    def test_bloqueo_borrado_con_prestamo_activo(self):
        # Crear préstamo activo
        Prestamo.objects.create(
            libro=self.libro,
            usuario=self.u1,
            fecha_prestamo=date.today(),
            fecha_limite=date.today() + timedelta(days=7),
            activo=True
        )

        # Intentar borrar el libro debe disparar ValidationError
        with self.assertRaises(ValidationError):
            self.libro.delete()

    def test_borrado_permitido_tras_devolucion(self):
        p = Prestamo.objects.create(
            libro=self.libro,
            usuario=self.u1,
            fecha_prestamo=date.today(),
            fecha_limite=date.today() + timedelta(days=7),
            activo=True
        )
        # Devolver el libro
        p.activo = False
        p.fecha_devolucion = date.today()
        p.save()

        # Ahora no tiene préstamos activos, el borrado no debe lanzar error
        self.libro.delete()
        self.assertFalse(Libro.objects.filter(pk=self.libro.pk).exists())
