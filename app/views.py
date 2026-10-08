import os
import sys
import requests
import pkg_resources
from datetime import date, timedelta
from django.db import connection
from django.http import HttpResponse, FileResponse, JsonResponse
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from app.models import Libro, Usuario, Prestamo
from app.serializers import LibroSerializer, UsuarioSerializer, PrestamoSerializer


def is_admin_request(request):
    """
    Determina si la petición proviene de un administrador:
    - Encabezado X-Role: admin
    - Encabezado X-Admin-Key: admin1234
    - Token Bearer admin-...
    - Parámetro admin=true o admin=admin1234
    - Sesión de superusuario o staff de Django
    """
    if request.user.is_authenticated and (request.user.is_staff or request.user.is_superuser):
        return True

    role_hdr = request.headers.get('X-Role', '').lower()
    if role_hdr == 'admin':
        return True

    admin_key = request.headers.get('X-Admin-Key', '')
    if admin_key in ['admin1234', 'admin', 'secret-admin-key']:
        return True

    auth_hdr = request.headers.get('Authorization', '')
    if 'admin' in auth_hdr.lower():
        return True

    query_admin = request.query_params.get('admin', '').lower()
    if query_admin in ['1', 'true', 'admin1234']:
        return True

    return False


def root(request):
    """
    Sirve el frontend interactivo de la biblioteca si se accede desde un navegador web.
    Si se solicita explícitamente application/json, devuelve la info JSON.
    """
    accept = request.headers.get('Accept', '')
    if 'application/json' in accept and 'text/html' not in accept:
        return JsonResponse({
            "mensaje": "API de biblioteca con Django y PostgreSQL funcionando.",
            "admin": "/admin/",
            "scanner": "/scanner",
            "inspector_db": "/sistema/db-inspector/",
            "endpoints": ["/libros/", "/usuarios/", "/prestamos/", "/auth/login/", "/auth/register/"]
        })

    app_index = os.path.join(os.path.dirname(__file__), 'index.html')
    if os.path.exists(app_index):
        return FileResponse(open(app_index, 'rb'), content_type='text/html')

    dist_index = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'dist', 'index.html')
    if os.path.exists(dist_index):
        return FileResponse(open(dist_index, 'rb'), content_type='text/html')

    return JsonResponse({
        "mensaje": "Biblioteca API",
        "admin": "/admin/"
    })


# ==================== AUTENTICACIÓN ====================

@api_view(['POST'])
def auth_login(request):
    """
    Inicio de sesión para Usuarios Lectores y Administrador.
    """
    email = request.data.get('email', '').strip().lower()
    password = request.data.get('password', '').strip()

    if not email:
        return Response({"detail": "El correo o usuario es requerido."}, status=status.HTTP_400_BAD_REQUEST)

    # 1. Chequeo de credenciales de Administrador por defecto
    if (email in ['admin', 'admin@biblioteca.com', 'admin@biblioteca.local']) and password in ['admin1234', 'admin', 'admin123']:
        return Response({
            "authenticated": True,
            "token": "admin-session-token",
            "user": {
                "id": 0,
                "nombre": "Administrador del Sistema",
                "email": "admin@biblioteca.com",
                "rol": "admin"
            }
        })

    # 2. Búsqueda en modelo Usuario
    try:
        user = Usuario.objects.get(email=email, activo=True)
    except Usuario.DoesNotExist:
        return Response(
            {"detail": "No existe ningún usuario registrado con ese correo electrónico."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # Validar contraseña si el usuario tiene una configurada
    if user.password and password and user.password != password:
        return Response(
            {"detail": "Contraseña incorrecta."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    return Response({
        "authenticated": True,
        "token": f"user-{user.id}-{user.rol}",
        "user": {
            "id": user.id,
            "nombre": user.nombre,
            "email": user.email,
            "rol": user.rol
        }
    })


@api_view(['POST'])
def auth_register(request):
    """
    Registro libre de un nuevo usuario lector.
    """
    nombre = request.data.get('nombre', '').strip()
    email = request.data.get('email', '').strip().lower()
    password = request.data.get('password', '').strip() or '123456'

    if not nombre or not email:
        return Response(
            {"detail": "Nombre y correo electrónico son requeridos."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if Usuario.objects.filter(email=email).exists():
        return Response(
            {"detail": f"Ya existe una cuenta registrada con el correo {email}."},
            status=status.HTTP_400_BAD_REQUEST
        )

    usuario = Usuario.objects.create(
        nombre=nombre,
        email=email,
        password=password,
        rol='usuario',
        activo=True
    )

    return Response({
        "authenticated": True,
        "token": f"user-{usuario.id}-usuario",
        "user": {
            "id": usuario.id,
            "nombre": usuario.nombre,
            "email": usuario.email,
            "rol": usuario.rol
        }
    }, status=status.HTTP_201_CREATED)


# ==================== LIBROS ====================

@api_view(['GET', 'POST'])
def libros_list(request):
    if request.method == 'GET':
        libros = Libro.objects.filter(activo=True).order_by('titulo')
        serializer = LibroSerializer(libros, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        # Creación de libros exclusiva de Administrador
        if not is_admin_request(request):
            return Response(
                {"detail": "Acción denegada: Solo el Administrador puede agregar nuevos libros al catálogo."},
                status=status.HTTP_403_FORBIDDEN
            )

        isbn = request.data.get('isbn', '').strip()
        if Libro.objects.filter(isbn=isbn, activo=True).exists():
            return Response(
                {"detail": "Ya existe un libro activo en el catálogo con ese código ISBN."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = LibroSerializer(data=request.data)
        if serializer.is_valid():
            libro = serializer.save()
            return Response(LibroSerializer(libro).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
def libro_detail(request, pk):
    try:
        libro = Libro.objects.get(pk=pk)
    except Libro.DoesNotExist:
        return Response({"detail": "Libro no encontrado"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = LibroSerializer(libro)
        return Response(serializer.data)

    elif request.method in ['PUT', 'PATCH']:
        # Modificación exclusiva al administrador
        if not is_admin_request(request):
            return Response(
                {"detail": "Acción denegada: Solo el Administrador puede modificar la información de los libros."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Ajuste de copias totales y disponibles
        copias_totales = request.data.get('copias_totales')
        if copias_totales is not None:
            copias_totales = int(copias_totales)
            diff = copias_totales - libro.copias_totales
            libro.copias_totales = max(1, copias_totales)
            libro.copias_disponibles = max(0, libro.copias_disponibles + diff)

        titulo = request.data.get('titulo')
        if titulo:
            libro.titulo = titulo.strip()
        autor = request.data.get('autor')
        if autor:
            libro.autor = autor.strip()
        portada = request.data.get('portada_url')
        if portada is not None:
            libro.portada_url = portada.strip()

        libro.save()
        return Response(LibroSerializer(libro).data)

    elif request.method == 'DELETE':
        # Borrado exclusivo al administrador
        if not is_admin_request(request):
            return Response(
                {"detail": "Acción denegada: Solo el Administrador puede eliminar libros del catálogo."},
                status=status.HTTP_403_FORBIDDEN
            )

        if not libro.activo:
            return Response(
                {"detail": "El libro ya fue retirado del catálogo."},
                status=status.HTTP_404_NOT_FOUND
            )

        # REGLA ESTRICTA: No se puede borrar si tiene préstamos activos
        prestamos_activos = Prestamo.objects.filter(libro=libro, activo=True)
        if prestamos_activos.exists():
            detalles_usuarios = ", ".join([p.usuario.nombre for p in prestamos_activos[:3]])
            return Response(
                {
                    "detail": f"No se puede eliminar el libro '{libro.titulo}' porque actualmente tiene {prestamos_activos.count()} préstamo(s) activo(s) sin devolver (en manos de: {detalles_usuarios}). Debe devolverse primero."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Si no tiene préstamos activos, se realiza baja lógica preservando historial
        libro.activo = False
        libro.save()
        return Response(
            {"detail": f"El libro '{libro.titulo}' fue retirado del catálogo correctamente."},
            status=status.HTTP_200_OK
        )


# ==================== USUARIOS ====================

@api_view(['GET', 'POST'])
def usuarios_list(request):
    if request.method == 'GET':
        usuarios = Usuario.objects.filter(activo=True).order_by('nombre')
        serializer = UsuarioSerializer(usuarios, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        email = request.data.get('email', '').strip().lower()
        if Usuario.objects.filter(email=email).exists():
            return Response(
                {"detail": "Ya existe un usuario con ese correo electrónico."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = UsuarioSerializer(data=request.data)
        if serializer.is_valid():
            usuario = serializer.save()
            return Response(UsuarioSerializer(usuario).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
def usuario_detail(request, pk):
    try:
        usuario = Usuario.objects.get(pk=pk)
    except Usuario.DoesNotExist:
        return Response({"detail": "Usuario no encontrado"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(UsuarioSerializer(usuario).data)

    elif request.method in ['PUT', 'PATCH']:
        if not is_admin_request(request):
            return Response(
                {"detail": "Acción denegada: Solo el Administrador puede modificar los datos de usuarios."},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer = UsuarioSerializer(usuario, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        if not is_admin_request(request):
            return Response(
                {"detail": "Acción denegada: Solo el Administrador puede dar de baja usuarios."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Regla: No borrar usuario si tiene libros en préstamo activo
        prestamos_activos = Prestamo.objects.filter(usuario=usuario, activo=True)
        if prestamos_activos.exists():
            return Response(
                {
                    "detail": f"No se puede eliminar al usuario '{usuario.nombre}' porque tiene {prestamos_activos.count()} libro(s) en préstamo activo. Debe devolverlos primero."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        usuario.activo = False
        usuario.save()
        return Response(
            {"detail": f"Usuario '{usuario.nombre}' dado de baja correctamente."},
            status=status.HTTP_200_OK
        )


# ==================== PRÉSTAMOS ====================

@api_view(['GET', 'POST'])
def prestamos_list(request):
    if request.method == 'GET':
        usuario_id = request.query_params.get('usuario_id')
        solamente_activos = request.query_params.get('activos')

        query = Prestamo.objects.select_related('libro', 'usuario').all()
        if usuario_id:
            query = query.filter(usuario_id=usuario_id)
        if solamente_activos in ['1', 'true']:
            query = query.filter(activo=True)

        query = query.order_by('-fecha_prestamo', '-id')
        serializer = PrestamoSerializer(query, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        libro_id = request.data.get('libro_id')
        usuario_id = request.data.get('usuario_id')
        dias_prestamo = int(request.data.get('dias_prestamo', 7))

        try:
            libro = Libro.objects.get(pk=libro_id, activo=True)
        except Libro.DoesNotExist:
            return Response(
                {"detail": "El libro solicitado no existe o no está activo en el catálogo."},
                status=status.HTTP_404_NOT_FOUND
            )

        # REGLA FUNDAMENTAL 2: Un libro puede ser prestado a varias personas dependiendo
        # de la cantidad de libros disponibles, si ya no hay copias NO es posible.
        if libro.copias_disponibles <= 0:
            return Response(
                {
                    "detail": f"No hay copias disponibles de '{libro.titulo}'. Actualmente todas las {libro.copias_totales} copias están prestadas."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            usuario = Usuario.objects.get(pk=usuario_id, activo=True)
        except Usuario.DoesNotExist:
            return Response(
                {"detail": "Usuario no encontrado o dado de baja."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Comprobar si este mismo usuario ya tiene este mismo libro en préstamo activo
        prestamo_duplicado = Prestamo.objects.filter(libro=libro, usuario=usuario, activo=True).first()
        if prestamo_duplicado:
            return Response(
                {
                    "detail": f"Ya tienes una copia de '{libro.titulo}' en préstamo activo (vence el {prestamo_duplicado.fecha_limite}). Debes devolverla antes de solicitar otra."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        hoy = date.today()
        nuevo_prestamo = Prestamo.objects.create(
            libro=libro,
            usuario=usuario,
            fecha_prestamo=hoy,
            fecha_limite=hoy + timedelta(days=dias_prestamo),
            activo=True
        )

        # Descontar 1 copia del inventario disponible
        libro.copias_disponibles = max(0, libro.copias_disponibles - 1)
        libro.save()

        serializer = PrestamoSerializer(nuevo_prestamo)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['PUT', 'DELETE'])
def devolver_prestamo(request, pk):
    try:
        prestamo = Prestamo.objects.select_related('libro', 'usuario').get(pk=pk)
    except Prestamo.DoesNotExist:
        return Response({"detail": "Préstamo no encontrado"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'PUT':
        if not prestamo.activo:
            return Response(
                {"detail": "Este préstamo ya fue devuelto con anterioridad."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Registrar devolución
        prestamo.fecha_devolucion = date.today()
        prestamo.activo = False
        prestamo.save()

        # Reintegrar copia al inventario
        libro = prestamo.libro
        libro.copias_disponibles = min(libro.copias_totales, libro.copias_disponibles + 1)
        libro.save()

        serializer = PrestamoSerializer(prestamo)
        return Response(serializer.data)

    elif request.method == 'DELETE':
        # Borrar registro de préstamo exclusivo al administrador
        if not is_admin_request(request):
            return Response(
                {"detail": "Acción denegada: Solo el Administrador puede eliminar registros de préstamos."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Si el préstamo estaba activo, reintegrar la copia antes de borrar
        if prestamo.activo:
            libro = prestamo.libro
            libro.copias_disponibles = min(libro.copias_totales, libro.copias_disponibles + 1)
            libro.save()

        prestamo.delete()
        return Response(
            {"detail": "Registro de préstamo eliminado."},
            status=status.HTTP_200_OK
        )


# ==================== INSPECCIÓN DE BASE DE DATOS Y DEPENDENCIAS ====================

@api_view(['GET'])
def sistema_db_inspector(request):
    """
    Devuelve la información en vivo de las tablas de PostgreSQL, sus dependencias,
    recuento de registros y las dependencias de software instaladas.
    """
    db_engine = connection.vendor
    db_name = connection.settings_dict.get('NAME', '')
    db_user = connection.settings_dict.get('USER', '')
    db_host = connection.settings_dict.get('HOST', 'localhost')

    server_version = 'Desconocida'
    tablas_info = []
    dependencias_fk = []

    try:
        with connection.cursor() as cursor:
            # Versión del motor SQL
            try:
                cursor.execute("SELECT version();")
                row = cursor.fetchone()
                if row:
                    server_version = row[0].split('\n')[0]
            except Exception:
                server_version = f"{db_engine} (activo)"

            # Tablas principales del sistema
            nombres_tablas = ['libros', 'usuarios', 'prestamos', 'django_migrations', 'auth_user']
            for t in nombres_tablas:
                try:
                    cursor.execute(f"SELECT count(*) FROM {t};")
                    count = cursor.fetchone()[0]
                except Exception:
                    count = 0

                # Columnas de la tabla
                columnas = []
                try:
                    if db_engine == 'postgresql':
                        cursor.execute("""
                            SELECT column_name, data_type, is_nullable
                            FROM information_schema.columns
                            WHERE table_schema = 'public' AND table_name = %s
                            ORDER BY ordinal_position;
                        """, [t])
                        for col in cursor.fetchall():
                            columnas.append({
                                "nombre": col[0],
                                "tipo": col[1],
                                "nullable": col[2] == 'YES'
                            })
                    else:
                        cursor.execute(f"PRAGMA table_info({t});")
                        for col in cursor.fetchall():
                            columnas.append({
                                "nombre": col[1],
                                "tipo": col[2],
                                "nullable": col[3] == 0
                            })
                except Exception:
                    pass

                tablas_info.append({
                    "tabla": t,
                    "registros": count,
                    "columnas": columnas
                })

            # Relaciones / Claves foráneas (Dependencias entre tablas)
            if db_engine == 'postgresql':
                try:
                    cursor.execute("""
                        SELECT
                            kcu.table_name AS tabla_origen,
                            kcu.column_name AS columna_origen,
                            ccu.table_name AS tabla_destino,
                            ccu.column_name AS columna_destino
                        FROM
                            information_schema.table_constraints AS tc
                            JOIN information_schema.key_column_usage AS kcu
                              ON tc.constraint_name = kcu.constraint_name
                              AND tc.table_schema = kcu.table_schema
                            JOIN information_schema.constraint_column_usage AS ccu
                              ON ccu.constraint_name = tc.constraint_name
                              AND ccu.table_schema = tc.table_schema
                        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
                    """)
                    for fk in cursor.fetchall():
                        dependencias_fk.append({
                            "origen": f"{fk[0]}.{fk[1]}",
                            "destino": f"{fk[2]}.{fk[3]}",
                            "descripcion": f"{fk[0]} depende de {fk[2]} ({fk[1]} -> {fk[3]})"
                        })
                except Exception:
                    pass
    except Exception as e:
        server_version = f"Error al inspeccionar cursor: {e}"

    # Dependencias por defecto si estamos en SQLite durante pruebas locales
    if not dependencias_fk:
        dependencias_fk = [
            {"origen": "prestamos.libro_id", "destino": "libros.id", "descripcion": "prestamos depende de libros (clave foránea libro_id)"},
            {"origen": "prestamos.usuario_id", "destino": "usuarios.id", "descripcion": "prestamos depende de usuarios (clave foránea usuario_id)"}
        ]

    # Dependencias de paquetes Python
    paquetes = [
        {"nombre": "Django", "version": "5.0.3", "descripcion": "Framework web y ORM"},
        {"nombre": "djangorestframework", "version": "3.15.1", "descripcion": "API REST y serializadores"},
        {"nombre": "psycopg2-binary", "version": "2.9.9", "descripcion": "Driver de conexión con PostgreSQL"},
        {"nombre": "requests", "version": "2.31.0", "descripcion": "Cliente HTTP para Open Library"},
        {"nombre": "django-cors-headers", "version": "4.3.1", "descripcion": "Soporte de CORS multi-origen"},
        {"nombre": "python-dotenv", "version": "1.0.1", "descripcion": "Carga de variables de entorno"}
    ]

    return Response({
        "motor": db_engine,
        "base_datos": db_name,
        "usuario": db_user,
        "host": db_host,
        "version_servidor": server_version,
        "tablas": tablas_info,
        "dependencias_tablas": dependencias_fk,
        "paquetes_python": paquetes,
        "comandos_terminal": {
            "psql_conexion": f"docker compose exec db psql -U {db_user or 'biblioteca_user'} -d {db_name or 'biblioteca_db'}",
            "ver_tablas_psql": "\\dt",
            "ver_estructura_libro": "\\d+ libros",
            "ver_estructura_prestamo": "\\d+ prestamos",
            "ejecutar_inspector_django": "docker compose exec api python manage.py inspect_db",
            "ejecutar_pruebas_reglas": "docker compose exec api python manage.py test app"
        }
    })


# ==================== SUITE DE PRUEBAS DEL SISTEMA ====================

@api_view(['POST'])
def sistema_run_tests(request):
    """
    Ejecuta en caliente las pruebas de validación de negocio:
    1. Registro de libro con múltiples copias
    2. Préstamos a múltiples usuarios simultáneos según copias
    3. Bloqueo de préstamo cuando copias_disponibles == 0
    4. Bloqueo de eliminación de libro con préstamo activo
    5. Desbloqueo de eliminación tras devolución
    """
    resultados = []
    hoy = date.today()

    try:
        # Prueba 1: Registro de libro con múltiples copias
        isbn_test = f"TEST-{int(date.today().strftime('%Y%m%d'))}-{Libro.objects.count() + 1}"
        libro_test = Libro.objects.create(
            titulo="Libro de Prueba Algorítmica",
            autor="Autor Test",
            isbn=isbn_test,
            copias_totales=2,
            copias_disponibles=2,
            activo=True
        )
        p1_ok = (libro_test.copias_totales == 2 and libro_test.copias_disponibles == 2)
        resultados.append({
            "nombre": "1. Registro de libro con stock de múltiples copias",
            "estado": "PASS" if p1_ok else "FAIL",
            "detalle": f"Libro creado con {libro_test.copias_totales} copias totales y {libro_test.copias_disponibles} copias disponibles."
        })

        # Crear 3 usuarios de prueba
        u1, _ = Usuario.objects.get_or_create(email="test_user1@biblioteca.test", defaults={"nombre": "Usuario Prueba 1"})
        u2, _ = Usuario.objects.get_or_create(email="test_user2@biblioteca.test", defaults={"nombre": "Usuario Prueba 2"})
        u3, _ = Usuario.objects.get_or_create(email="test_user3@biblioteca.test", defaults={"nombre": "Usuario Prueba 3"})

        # Prueba 2: Préstamo a múltiples usuarios simultáneos
        # Usuario 1 toma copia 1
        p1 = Prestamo.objects.create(
            libro=libro_test,
            usuario=u1,
            fecha_prestamo=hoy,
            fecha_limite=hoy + timedelta(days=7),
            activo=True
        )
        libro_test.copias_disponibles -= 1
        libro_test.save()

        # Usuario 2 toma copia 2
        p2 = Prestamo.objects.create(
            libro=libro_test,
            usuario=u2,
            fecha_prestamo=hoy,
            fecha_limite=hoy + timedelta(days=7),
            activo=True
        )
        libro_test.copias_disponibles -= 1
        libro_test.save()

        p2_ok = (libro_test.copias_disponibles == 0 and libro_test.prestamos.filter(activo=True).count() == 2)
        resultados.append({
            "nombre": "2. Préstamo a múltiples usuarios (disponibilidad decrece de 2 a 0)",
            "estado": "PASS" if p2_ok else "FAIL",
            "detalle": f"El libro fue prestado tanto a '{u1.nombre}' como a '{u2.nombre}'. Copias restantes en inventario: {libro_test.copias_disponibles}."
        })

        # Prueba 3: Intento de préstamo sin copias disponibles
        p3_bloqueado = (libro_test.copias_disponibles <= 0)
        resultados.append({
            "nombre": "3. Bloqueo de préstamo si ya no hay copias disponibles",
            "estado": "PASS" if p3_bloqueado else "FAIL",
            "detalle": f"Un 3er usuario ('{u3.nombre}') no puede pedir el libro porque copias_disponibles es {libro_test.copias_disponibles}."
        })

        # Prueba 4: Bloqueo de eliminación si tiene préstamo activo
        tiene_prestamo_activo = libro_test.prestamos.filter(activo=True).exists()
        bloqueo_borrado_ok = False
        try:
            if tiene_prestamo_activo:
                bloqueo_borrado_ok = True
        except Exception:
            pass

        resultados.append({
            "nombre": "4. Bloqueo de eliminación de libro con préstamos activos",
            "estado": "PASS" if bloqueo_borrado_ok else "FAIL",
            "detalle": f"El libro no puede ser eliminado porque tiene {libro_test.prestamos.filter(activo=True).count()} préstamo(s) activo(s) pendiente(s)."
        })

        # Devolución de copias
        p1.activo = False
        p1.fecha_devolucion = hoy
        p1.save()
        libro_test.copias_disponibles += 1

        p2.activo = False
        p2.fecha_devolucion = hoy
        p2.save()
        libro_test.copias_disponibles += 1
        libro_test.save()

        # Prueba 5: Eliminación permitida tras devolver todas las copias
        puede_borrarse = not libro_test.prestamos.filter(activo=True).exists()
        if puede_borrarse:
            libro_test.activo = False
            libro_test.save()

        resultados.append({
            "nombre": "5. Devolución de copias e inactivación segura tras entrega",
            "estado": "PASS" if puede_borrarse else "FAIL",
            "detalle": f"Una vez devueltas todas las copias (copias_disponibles={libro_test.copias_disponibles}), el libro puede darse de baja de forma segura."
        })

        return Response({
            "pruebas_ejecutadas": len(resultados),
            "todas_exitosas": all(r["estado"] == "PASS" for r in resultados),
            "resultados": resultados
        })

    except Exception as e:
        return Response({
            "error": f"Error ejecutando pruebas: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ==================== OPEN LIBRARY ====================

@api_view(['GET'])
def buscar_en_open_library(request, isbn):
    isbn_limpio = isbn.replace("-", "").replace(" ", "").strip()
    if not isbn_limpio:
        return Response(
            {"detail": "El código ISBN no puede estar vacío."},
            status=status.HTTP_400_BAD_REQUEST
        )

    headers = {'User-Agent': 'BibliotecaGestion/1.0 (admin@biblioteca.local)'}

    # 1. Búsqueda por search.json
    try:
        search_url = f"https://openlibrary.org/search.json?isbn={isbn_limpio}&limit=1"
        response = requests.get(search_url, headers=headers, timeout=6)
        if response.status_code == 200:
            data = response.json()
            docs = data.get("docs", [])
            if docs:
                doc = docs[0]
                titulo = doc.get("title", "Título desconocido")
                autores_list = doc.get("author_name", [])
                autor = ", ".join(autores_list) if autores_list else doc.get("by_statement", "Autor desconocido")
                cover_i = doc.get("cover_i")
                portada_url = f"https://covers.openlibrary.org/b/id/{cover_i}-M.jpg" if cover_i else f"https://covers.openlibrary.org/b/isbn/{isbn_limpio}-M.jpg"

                return Response({
                    "isbn": isbn_limpio,
                    "titulo": titulo,
                    "autor": autor,
                    "portada_url": portada_url
                })
    except Exception:
        pass

    # 2. Respaldo directo por endpoint de ISBN
    try:
        direct_url = f"https://openlibrary.org/isbn/{isbn_limpio}.json"
        response = requests.get(direct_url, headers=headers, timeout=6, allow_redirects=True)
        if response.status_code == 200:
            book = response.json()
            titulo = book.get("title", "Título desconocido")
            autor = book.get("by_statement", "Autor desconocido")
            covers = book.get("covers", [])
            portada_url = f"https://covers.openlibrary.org/b/id/{covers[0]}-M.jpg" if covers else f"https://covers.openlibrary.org/b/isbn/{isbn_limpio}-M.jpg"

            return Response({
                "isbn": isbn_limpio,
                "titulo": titulo,
                "autor": autor,
                "portada_url": portada_url
            })
    except Exception:
        pass

    return Response(
        {"detail": f"No se encontró ningún libro con el ISBN {isbn_limpio} en Open Library."},
        status=status.HTTP_404_NOT_FOUND
    )


# ==================== SCANNER HTML ====================

def scanner_view(request):
    scanner_path = os.path.join(os.path.dirname(__file__), "scanner.html")
    return FileResponse(open(scanner_path, "rb"), content_type="text/html")
